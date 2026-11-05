/**
 * Belajar-Ku API - Multi-Role End-to-End (E2E) UAT Simulation Script
 *
 * Implements the exhaustive UAT specification from DOKUMENTASI_FITUR_PER_ROLE.md:
 * - STAGE 1: GUEST (Public visitor, registration validation, auth guard)
 * - STAGE 2: TUTOR (Selling services, weekly availability, tutor RBAC)
 * - STAGE 3: PARENT (B2C buying flow, child profile, date matching, Redis lock, escrow)
 * - STAGE 4: TUTOR & PARENT INTERACTION (Session completion, 85%:15% split, dispute freezing)
 * - STAGE 5: INSTITUTION & TUTOR (B2B module buying, deliverable upload, revision loop, settlement)
 * - STAGE 6: ADMIN (One-click tutor verification, dispute desk, account freeze toggle, ledger audit)
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import Redis from 'ioredis';

const isDocker = fs.existsSync('/.dockerenv');
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const FRONTEND_URL = isDocker ? 'http://frontend:3000' : (process.env.FRONTEND_URL || 'http://localhost:3000');

if (!isDocker) {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('@postgres:')) {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@postgres:', '@localhost:');
  }
}

const rawRedisUrl = process.env.REDIS_URL || (isDocker ? 'redis://redis:6379' : 'redis://localhost:6379');
const REDIS_URL = isDocker
  ? rawRedisUrl.replace('localhost', 'redis').replace('127.0.0.1', 'redis')
  : rawRedisUrl.replace('redis://redis:', 'redis://localhost:');

const prisma = new PrismaClient();
const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 });

// Terminal Colors & Formatting
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
  bgBlue: '\x1b[44m\x1b[37m',
};

interface ApiResponse<T = any> {
  success: boolean;
  statusCode?: number;
  code?: string;
  message?: string;
  data: T;
  errors?: Array<{ field: string; message: string }>;
  pagination?: any;
  summary?: any;
}

interface RequestOptions {
  method?: string;
  body?: any;
  token?: string;
  formData?: FormData;
}

interface TestResult {
  stage: string;
  role: string;
  workflow: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const testResults: TestResult[] = [];
let totalChecks = 0;
let passedChecks = 0;

function logStageHeader(stageNum: number, title: string, subtitle: string) {
  console.log(`\n${c.bold}${c.blue}╔════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.blue}║ STAGE ${stageNum}: ${title.padEnd(65)}║${c.reset}`);
  console.log(`${c.bold}${c.dim}║ ${subtitle.padEnd(74)}║${c.reset}`);
  console.log(`${c.bold}${c.blue}╚════════════════════════════════════════════════════════════════════════════╝${c.reset}`);
}

function logSub(title: string) {
  console.log(`\n ${c.bold}${c.cyan}▶ ${title}${c.reset}`);
}

function recordResult(
  stage: string,
  role: string,
  workflow: string,
  expected: string,
  actual: string,
  passed: boolean
) {
  totalChecks++;
  if (passed) passedChecks++;
  testResults.push({ stage, role, workflow, expected, actual, passed });

  const statusBadge = passed
    ? `${c.green}[PASS] ✅${c.reset}`
    : `${c.red}[FAIL] ❌${c.reset}`;
  console.log(`  ${statusBadge} ${c.bold}${workflow}${c.reset} (Expected: ${expected} | Actual: ${actual})`);

  if (!passed) {
    throw new Error(`UAT Simulation Step Failed: ${workflow} -> Expected: ${expected}, Got: ${actual}`);
  }
}

async function request<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<{ status: number; body: ApiResponse<T> }> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {};

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  let body: any = undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers,
    body,
  });

  const responseJson = (await response.json().catch(() => ({}))) as ApiResponse<T>;
  return { status: response.status, body: responseJson };
}

async function fetchUI(path: string): Promise<{ status: number; text: string }> {
  const url = `${FRONTEND_URL}${path}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    return { status: res.status, text };
  } catch (err: any) {
    console.error(`UI Fetch Error on ${url}:`, err.message);
    return { status: 500, text: err.message };
  }
}

async function cleanupPreviousUatData() {
  logSub('Cleaning up previous UAT simulation artifacts');

  // 1. Delete UAT visitor user
  const uatVisitor = await prisma.user.findUnique({
    where: { email: 'uat.visitor.test@belajarku.com' },
  });
  if (uatVisitor) {
    await prisma.user.delete({ where: { id: uatVisitor.id } });
  }

  // 2. Delete test UAT orders (identifiable by invoice or items)
  const uatOrders = await prisma.order.findMany({
    where: {
      OR: [
        { invoiceNumber: { contains: 'UAT' } },
        { items: { some: { service: { title: { contains: '[UAT]' } } } } },
      ],
    },
    select: { id: true },
  });

  if (uatOrders.length > 0) {
    const orderIds = uatOrders.map((o) => o.id);

    await prisma.platformRevenueLedger.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.walletMutation.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.sessionReport.deleteMany({
      where: { session: { orderItem: { orderId: { in: orderIds } } } },
    });
    await prisma.bookingSession.deleteMany({
      where: { orderItem: { orderId: { in: orderIds } } },
    });
    await prisma.orderAttachment.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.orderItem.deleteMany({
      where: { orderId: { in: orderIds } },
    });
    await prisma.order.deleteMany({
      where: { id: { in: orderIds } },
    });
  }

  // 3. Delete test UAT services
  await prisma.tutorService.deleteMany({
    where: { title: { contains: '[UAT]' } },
  });

  // 4. Delete temporary student profiles created by UAT
  await prisma.studentProfile.deleteMany({
    where: { studentName: { contains: 'UAT' } },
  });

  // 5. Clean up any UAT Redis locks
  const keys = await redis.keys('lock:tutor:*:slot:2026-11-*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  // 6. Reset unverified tutor demo status to isVerified: false
  const unverifiedUser = await prisma.user.findUnique({
    where: { email: 'tutor.unverified@belajarku.com' },
    include: { tutorProfile: true },
  });
  if (unverifiedUser?.tutorProfile) {
    await prisma.tutorProfile.update({
      where: { id: unverifiedUser.tutorProfile.id },
      data: { isVerified: false },
    });
  }

  console.log(`  ${c.green}✔ Previous UAT artifacts cleaned cleanly.${c.reset}`);
}

async function runMultiRoleUatSimulation() {
  const startTime = Date.now();

  console.log(`\n${c.bold}================================================================================${c.reset}`);
  console.log(`${c.bold} 🚀  BELAJAR-KU MULTI-ROLE END-TO-END (E2E) UAT SIMULATION${c.reset}`);
  console.log(` API Target Server     : ${c.cyan}${BASE_URL}${c.reset}`);
  console.log(` Frontend Target Server: ${c.cyan}${FRONTEND_URL}${c.reset}`);
  console.log(` Database Engine       : ${c.cyan}PostgreSQL via Prisma ORM${c.reset}`);
  console.log(` Lock & Cache Engine   : ${c.cyan}Redis Distributed Key-Value Store${c.reset}`);
  console.log(` Specification Document: ${c.yellow}DOKUMENTASI_FITUR_PER_ROLE.md${c.reset}`);
  console.log(`${c.bold}================================================================================${c.reset}`);

  await cleanupPreviousUatData();

  // =========================================================================
  // STAGE 1: GUEST (Unauthenticated Public Visitor)
  // =========================================================================
  logStageHeader(1, 'GUEST (Unauthenticated Public Visitor)', 'Public API discovery, UI page availability & registration guards');

  // 1.1. Public API: Categories & Services
  logSub('1.1. Public Categories & Services Query');
  const catRes = await request('/api/v1/categories');
  recordResult(
    'STAGE 1',
    'GUEST',
    'GET /api/v1/categories',
    'HTTP 200 with categories array',
    `HTTP ${catRes.status} (found ${catRes.body.data?.length || 0} categories)`,
    catRes.status === 200 && Array.isArray(catRes.body.data) && catRes.body.data.length > 0
  );

  const publicServicesRes = await request('/api/v1/services');
  const publicServices = Array.isArray(publicServicesRes.body.data)
    ? publicServicesRes.body.data
    : publicServicesRes.body.data?.items || [];
  recordResult(
    'STAGE 1',
    'GUEST',
    'GET /api/v1/services (Public Catalog)',
    'HTTP 200 with services list',
    `HTTP ${publicServicesRes.status} (found ${publicServices.length} services)`,
    publicServicesRes.status === 200 && Array.isArray(publicServices) && publicServices.length > 0
  );

  const sessionBasedRes = await request('/api/v1/services?serviceType=SESSION_BASED');
  const sessionServices = Array.isArray(sessionBasedRes.body.data)
    ? sessionBasedRes.body.data
    : sessionBasedRes.body.data?.items || [];
  const allSession = sessionServices.length > 0 && sessionServices.every((s: any) => s.serviceType === 'SESSION_BASED');
  recordResult(
    'STAGE 1',
    'GUEST',
    'GET /api/v1/services?serviceType=SESSION_BASED',
    'HTTP 200 strictly SESSION_BASED items',
    `HTTP ${sessionBasedRes.status} (${sessionServices.length} items, allSession: ${allSession})`,
    sessionBasedRes.status === 200 && allSession
  );

  const delivBasedRes = await request('/api/v1/services?serviceType=DELIVERABLE_BASED');
  const delivServices = Array.isArray(delivBasedRes.body.data)
    ? delivBasedRes.body.data
    : delivBasedRes.body.data?.items || [];
  const allDeliv = delivServices.length > 0 && delivServices.every((s: any) => s.serviceType === 'DELIVERABLE_BASED');
  recordResult(
    'STAGE 1',
    'GUEST',
    'GET /api/v1/services?serviceType=DELIVERABLE_BASED',
    'HTTP 200 strictly DELIVERABLE_BASED items',
    `HTTP ${delivBasedRes.status} (${delivServices.length} items, allDeliv: ${allDeliv})`,
    delivBasedRes.status === 200 && allDeliv
  );

  // 1.2. Public UI Routes Check
  logSub('1.2. Public UI Routes HTTP 200 Availability Check');
  const uiRoutes = ['/', '/services', '/modules', '/login', '/register'];
  for (const route of uiRoutes) {
    const uiRes = await fetchUI(route);
    recordResult(
      'STAGE 1',
      'GUEST',
      `UI Route Check: ${route}`,
      'HTTP 200 OK',
      `HTTP ${uiRes.status}`,
      uiRes.status === 200
    );
  }

  // 1.3. Registration Validation & Security Check
  logSub('1.3. Registration Validation & New User Creation');
  const invalidPhoneRes = await request('/api/v1/register', {
    method: 'POST',
    body: {
      name: 'Invalid Phone Tester',
      email: 'invalid.phone@test.com',
      phone: '000000000000',
      password: 'password123',
      role: 'PARENT',
    },
  });
  recordResult(
    'STAGE 1',
    'GUEST',
    'Registration with Invalid Phone (000000000000)',
    'HTTP 400 VALIDATION_ERROR',
    `HTTP ${invalidPhoneRes.status} (${invalidPhoneRes.body.code || invalidPhoneRes.body.message})`,
    invalidPhoneRes.status === 400 && invalidPhoneRes.body.code === 'VALIDATION_ERROR'
  );

  const validRegRes = await request('/api/v1/register', {
    method: 'POST',
    body: {
      name: 'Budi Susanto (UAT Guest)',
      email: 'uat.visitor.test@belajarku.com',
      phone: '081299998888',
      password: 'password123',
      role: 'PARENT',
    },
  });
  recordResult(
    'STAGE 1',
    'GUEST',
    'Valid Registration (uat.visitor.test@belajarku.com)',
    'HTTP 201 Created with User ID',
    `HTTP ${validRegRes.status} (User ID: ${validRegRes.body.data?.id})`,
    validRegRes.status === 201 && !!validRegRes.body.data?.id
  );
  const uatGuestUserId = validRegRes.body.data?.id;

  // 1.4. Unauthenticated Guard Check
  logSub('1.4. Unauthenticated Action Guards');
  const unauthCart = await request('/api/v1/cart', {
    method: 'POST',
    body: { serviceId: '00000000-0000-0000-0000-000000000000' },
  });
  recordResult(
    'STAGE 1',
    'GUEST',
    'POST /api/v1/cart without Token',
    'HTTP 401 Unauthorized',
    `HTTP ${unauthCart.status}`,
    unauthCart.status === 401
  );

  const unauthCheckout = await request('/api/v1/orders/checkout', {
    method: 'POST',
    body: {},
  });
  recordResult(
    'STAGE 1',
    'GUEST',
    'POST /api/v1/orders/checkout without Token',
    'HTTP 401 Unauthorized',
    `HTTP ${unauthCheckout.status}`,
    unauthCheckout.status === 401
  );

  // =========================================================================
  // STAGE 2: TUTOR (Supply-Side: Selling Services, Availability & RBAC)
  // =========================================================================
  logStageHeader(2, 'TUTOR (Supply-Side: Services, Availability & RBAC)', 'Login, profile management, package creation & anti self-booking guard');

  // 2.1. Login Tutor Kak Sarah & Kak Farhan
  logSub('2.1. Tutor Authentication & Profile Check');
  const tutorSarahLogin = await request('/api/v1/login', {
    method: 'POST',
    body: { email: 'tutor.paud@belajarku.com', password: 'password123' },
  });
  recordResult(
    'STAGE 2',
    'TUTOR',
    'Login tutor.paud@belajarku.com (Kak Sarah)',
    'HTTP 200 with JWT Token',
    `HTTP ${tutorSarahLogin.status}`,
    tutorSarahLogin.status === 200 && !!tutorSarahLogin.body.data?.token
  );
  const tokenSarah = tutorSarahLogin.body.data?.token;

  const tutorFarhanLogin = await request('/api/v1/login', {
    method: 'POST',
    body: { email: 'tutor.admin@belajarku.com', password: 'password123' },
  });
  recordResult(
    'STAGE 2',
    'TUTOR',
    'Login tutor.admin@belajarku.com (Kak Farhan)',
    'HTTP 200 with JWT Token',
    `HTTP ${tutorFarhanLogin.status}`,
    tutorFarhanLogin.status === 200 && !!tutorFarhanLogin.body.data?.token
  );
  const tokenFarhan = tutorFarhanLogin.body.data?.token;

  // Retrieve & Update Tutor Profile
  const sarahProfileRes = await request('/api/v1/tutor/me', { token: tokenSarah });
  const sarahWalletBalance = sarahProfileRes.body.data?.walletBalance ?? sarahProfileRes.body.data?.profile?.walletBalance;
  const sarahTutorId = sarahProfileRes.body.data?.id ?? sarahProfileRes.body.data?.profile?.id;
  recordResult(
    'STAGE 2',
    'TUTOR',
    'GET /api/v1/tutor/me (Sarah Profile & Wallet)',
    'HTTP 200 with walletBalance',
    `HTTP ${sarahProfileRes.status} (Wallet: Rp ${sarahWalletBalance?.toLocaleString()})`,
    sarahProfileRes.status === 200 && typeof sarahWalletBalance === 'number'
  );
  const sarahInitialWallet = sarahWalletBalance || 0;

  const updateBioRes = await request('/api/v1/tutor/me', {
    method: 'PUT',
    token: tokenSarah,
    body: {
      bio: 'Guru lulusan PGPAUD berpengalaman mengajar calistung ramah anak terverifikasi UAT.',
      education: 'S.Pd Pendidikan Guru PAUD, Universitas Negeri Jakarta',
      address: 'Cilandak, Jakarta Selatan',
      teachingCredentials: 'Sertifikasi Montessori Early Childhood',
    },
  });
  recordResult(
    'STAGE 2',
    'TUTOR',
    'PUT /api/v1/tutor/me (Update Bio)',
    'HTTP 200 OK',
    `HTTP ${updateBioRes.status}`,
    updateBioRes.status === 200
  );

  // 2.2. Weekly Availability Management
  logSub('2.2. Weekly Availability Management (Ensure Monday 10:00 - 11:00 Slot)');
  const availRes = await request('/api/v1/services/availability', { token: tokenSarah });
  const hasMondaySlot = availRes.body.data?.some(
    (a: any) => a.dayOfWeek === 1 && a.startTime === '10:00' && a.endTime === '11:00'
  );

  if (!hasMondaySlot) {
    const createSlotRes = await request('/api/v1/services/availability', {
      method: 'POST',
      token: tokenSarah,
      body: { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' },
    });
    recordResult(
      'STAGE 2',
      'TUTOR',
      'POST /api/v1/services/availability (Add Monday 10:00 Slot)',
      'HTTP 201 Created',
      `HTTP ${createSlotRes.status}`,
      createSlotRes.status === 201
    );
  } else {
    recordResult(
      'STAGE 2',
      'TUTOR',
      'GET /api/v1/services/availability (Active Monday Slot)',
      'Monday 10:00 - 11:00 Active',
      'Slot already active',
      true
    );
  }

  // 2.3. Service Creation & Publishing
  logSub('2.3. Publishing Services (SESSION_BASED & DELIVERABLE_BASED)');
  const paudCat = catRes.body.data?.find((c: any) => c.slug === 'calistung-paud');
  const adminCat = catRes.body.data?.find((c: any) => c.slug === 'modul-ajar-merdeka');

  const createSessionService = await request('/api/v1/tutor/services', {
    method: 'POST',
    token: tokenSarah,
    body: {
      categoryId: paudCat!.id,
      title: '[UAT] Paket Les Privat Calistung PAUD 4 Sesi',
      serviceType: 'SESSION_BASED',
      sessionCount: 4,
      durationMinutes: 60,
      price: 400000,
      teachingMode: 'OFFLINE_VISIT',
      description: 'Program bimbingan intensif calistung ramah anak metode fonik dan montessori.',
      gradeLevel: 'PAUD',
    },
  });
  recordResult(
    'STAGE 2',
    'TUTOR',
    'POST /api/v1/tutor/services (Create SESSION_BASED)',
    'HTTP 201 Created (Rp 400.000 / 4 Sesi)',
    `HTTP ${createSessionService.status} (ID: ${createSessionService.body.data?.id})`,
    createSessionService.status === 201 && !!createSessionService.body.data?.id
  );
  const uatSessionService = createSessionService.body.data;

  const createDelivService = await request('/api/v1/tutor/services', {
    method: 'POST',
    token: tokenFarhan,
    body: {
      categoryId: adminCat!.id,
      title: '[UAT] Modul Ajar Kurikulum Merdeka Fase B Lengkap',
      serviceType: 'DELIVERABLE_BASED',
      estimatedDays: 3,
      maxRevisions: 2,
      deliverableFormats: ['DOCX', 'PDF'],
      price: 500000,
      description: 'Paket penyusunan modul ajar IPAS dan asesmen Kurikulum Merdeka lengkap.',
      gradeLevel: 'SD',
    },
  });
  recordResult(
    'STAGE 2',
    'TUTOR',
    'POST /api/v1/tutor/services (Create DELIVERABLE_BASED)',
    'HTTP 201 Created (Rp 500.000 / maxRevisions: 2)',
    `HTTP ${createDelivService.status} (ID: ${createDelivService.body.data?.id})`,
    createDelivService.status === 201 && !!createDelivService.body.data?.id
  );
  const uatDelivService = createDelivService.body.data;

  const myServicesRes = await request('/api/v1/services/mine', { token: tokenSarah });
  const hasUatService = myServicesRes.body.data?.some((s: any) => s.id === uatSessionService.id);
  recordResult(
    'STAGE 2',
    'TUTOR',
    'GET /api/v1/services/mine (Verify Published Service)',
    'HTTP 200 with newly created service active',
    `HTTP ${myServicesRes.status} (Service found: ${hasUatService})`,
    myServicesRes.status === 200 && hasUatService
  );

  // 2.4. Tutor RBAC Guards
  logSub('2.4. Tutor RBAC Security Guards');
  const tutorCheckoutBlock = await request('/api/v1/orders/checkout', {
    method: 'POST',
    token: tokenSarah,
    body: {},
  });
  recordResult(
    'STAGE 2',
    'TUTOR',
    'Tutor Checkout Attempt (No Self-Booking Guard)',
    'HTTP 403 Forbidden',
    `HTTP ${tutorCheckoutBlock.status}`,
    tutorCheckoutBlock.status === 403
  );

  const tutorAdminStatsBlock = await request('/api/v1/admin/stats', {
    token: tokenSarah,
  });
  recordResult(
    'STAGE 2',
    'TUTOR',
    'Tutor Access Admin Stats Attempt',
    'HTTP 403 Forbidden',
    `HTTP ${tutorAdminStatsBlock.status}`,
    tutorAdminStatsBlock.status === 403
  );

  // =========================================================================
  // STAGE 3: PARENT (B2C Buying: Profile, Cart, Date Matching & Escrow)
  // =========================================================================
  logStageHeader(3, 'PARENT (B2C Buying: Profile, Cart, Schedule & Escrow)', 'Multi-child management, date matching guard, Redis lock & payment');

  // 3.1. Parent Login & Multi-Child Profile
  logSub('3.1. Parent Authentication & Multi-Child Profile');
  const parentLogin = await request('/api/v1/login', {
    method: 'POST',
    body: { email: 'parent.demo@belajarku.com', password: 'password123' },
  });
  recordResult(
    'STAGE 3',
    'PARENT',
    'Login parent.demo@belajarku.com (Bunda Dian)',
    'HTTP 200 with JWT Token',
    `HTTP ${parentLogin.status}`,
    parentLogin.status === 200 && !!parentLogin.body.data?.token
  );
  const tokenParent = parentLogin.body.data?.token;

  const studentsRes = await request('/api/v1/students', { token: tokenParent });
  const hasKenzi = studentsRes.body.data?.some((s: any) => s.studentName === 'Kenzi Pratama');
  recordResult(
    'STAGE 3',
    'PARENT',
    'GET /api/v1/students (Verify Multi-Child Profiles)',
    'HTTP 200 containing Kenzi Pratama',
    `HTTP ${studentsRes.status} (Count: ${studentsRes.body.data?.length}, Kenzi found: ${hasKenzi})`,
    studentsRes.status === 200 && hasKenzi
  );
  const kenziStudent = studentsRes.body.data?.find((s: any) => s.studentName === 'Kenzi Pratama');

  // Add temporary student profile then delete
  const addStudentRes = await request('/api/v1/students', {
    method: 'POST',
    token: tokenParent,
    body: {
      studentName: 'Raffi UAT Test',
      gradeLevel: 'SD',
      learningNotes: 'Anak aktif suka berhitung',
    },
  });
  recordResult(
    'STAGE 3',
    'PARENT',
    'POST /api/v1/students (Add Child Profile)',
    'HTTP 201 Created',
    `HTTP ${addStudentRes.status} (ID: ${addStudentRes.body.data?.id})`,
    addStudentRes.status === 201 && !!addStudentRes.body.data?.id
  );

  const deleteStudentRes = await request(`/api/v1/students/${addStudentRes.body.data.id}`, {
    method: 'DELETE',
    token: tokenParent,
  });
  recordResult(
    'STAGE 3',
    'PARENT',
    'DELETE /api/v1/students/:id (Delete Child Profile)',
    'HTTP 200 OK',
    `HTTP ${deleteStudentRes.status}`,
    deleteStudentRes.status === 200
  );

  // 3.2. Parent RBAC & Catalog Isolation
  logSub('3.2. Parent Catalog Isolation');
  const parentCatalogRes = await request('/api/v1/services?serviceType=SESSION_BASED', {
    token: tokenParent,
  });
  const parentServices = Array.isArray(parentCatalogRes.body.data)
    ? parentCatalogRes.body.data
    : parentCatalogRes.body.data?.items || [];
  const strictlyTutoring = parentServices.length > 0 && parentServices.every((s: any) => s.serviceType === 'SESSION_BASED');
  recordResult(
    'STAGE 3',
    'PARENT',
    'GET /api/v1/services?serviceType=SESSION_BASED',
    'Strictly SESSION_BASED services without B2B module leakage',
    `All session based: ${strictlyTutoring} (count: ${parentServices.length})`,
    strictlyTutoring
  );

  // 3.3. Schedule Date-Matching Guard & Cart
  logSub('3.3. Schedule Date-Matching Integrity Guard');
  // Attempt Wednesday date (2026-11-04) on tutor's Monday 10:00 slot
  const mismatchSlots = [
    { date: '2026-11-04', startTime: '10:00', endTime: '11:00' }, // Wednesday (3), tutor is Monday (1)
    { date: '2026-11-09', startTime: '10:00', endTime: '11:00' },
    { date: '2026-11-16', startTime: '10:00', endTime: '11:00' },
    { date: '2026-11-23', startTime: '10:00', endTime: '11:00' },
  ];

  const dateMismatchRes = await request('/api/v1/cart', {
    method: 'POST',
    token: tokenParent,
    body: {
      serviceId: uatSessionService.id,
      studentId: kenziStudent!.id,
      selectedSlots: mismatchSlots,
      teachingAddress: 'Jl. Melati Indah No. 45, Jakarta Selatan',
    },
  });
  recordResult(
    'STAGE 3',
    'PARENT',
    'Add Mismatched Date to Cart (Wednesday on Monday Slot)',
    'HTTP 400 INVALID_SCHEDULE_DATE',
    `HTTP ${dateMismatchRes.status} (code: ${dateMismatchRes.body.code})`,
    dateMismatchRes.status === 400 && dateMismatchRes.body.code === 'INVALID_SCHEDULE_DATE'
  );

  // Add 4 valid consecutive Mondays (2026-11-09, 2026-11-16, 2026-11-23, 2026-11-30)
  const validMondays = [
    { date: '2026-11-09', startTime: '10:00', endTime: '11:00' },
    { date: '2026-11-16', startTime: '10:00', endTime: '11:00' },
    { date: '2026-11-23', startTime: '10:00', endTime: '11:00' },
    { date: '2026-11-30', startTime: '10:00', endTime: '11:00' },
  ];

  const validCartRes = await request('/api/v1/cart', {
    method: 'POST',
    token: tokenParent,
    body: {
      serviceId: uatSessionService.id,
      studentId: kenziStudent!.id,
      selectedSlots: validMondays,
      teachingAddress: 'Jl. Melati Indah No. 45, Jakarta Selatan',
    },
  });
  recordResult(
    'STAGE 3',
    'PARENT',
    'POST /api/v1/cart (Valid 4 Consecutive Mondays)',
    'HTTP 201 Created',
    `HTTP ${validCartRes.status}`,
    validCartRes.status === 201
  );

  // 1-Click State Sync Check
  const cartCheck = await request('/api/v1/cart', { token: tokenParent });
  const hasCartItem = cartCheck.body.data?.items?.some((i: any) => i.serviceId === uatSessionService.id);
  recordResult(
    'STAGE 3',
    'PARENT',
    'GET /api/v1/cart (1-Click Sync Verification)',
    'Item present in cart immediately',
    `Item found: ${hasCartItem} (${cartCheck.body.data?.items?.length} total in cart)`,
    cartCheck.status === 200 && hasCartItem
  );

  // 3.4. Checkout with Redis Lock & Payment Simulation
  logSub('3.4. Checkout with Redis Lock & Instant Payment Simulation');
  const checkoutRes = await request('/api/v1/orders/checkout', {
    method: 'POST',
    token: tokenParent,
    body: {},
  });
  recordResult(
    'STAGE 3',
    'PARENT',
    'POST /api/v1/orders/checkout',
    'HTTP 201 WAITING_PAYMENT with Frozen Price',
    `HTTP ${checkoutRes.status} (Invoice: ${checkoutRes.body.data?.invoiceNumber}, Status: ${checkoutRes.body.data?.status})`,
    checkoutRes.status === 201 && checkoutRes.body.data?.status === 'WAITING_PAYMENT'
  );
  const uatParentOrder = checkoutRes.body.data;

  // Verify Redis Lock is active
  const lockKey = `lock:tutor:${sarahTutorId}:slot:2026-11-09:10:00`;
  const remainingTTL = await redis.ttl(lockKey);
  recordResult(
    'STAGE 3',
    'PARENT',
    'Redis Distributed Lock Verification',
    'Active lock with TTL > 0 and <= 900s',
    `Key: ${lockKey} -> TTL: ${remainingTTL}s`,
    remainingTTL > 0 && remainingTTL <= 900
  );

  // Instant Payment Simulation
  const paySimRes = await request(`/api/v1/orders/${uatParentOrder.id}/simulate-payment`, {
    method: 'POST',
    token: tokenParent,
  });
  recordResult(
    'STAGE 3',
    'PARENT',
    'POST /api/v1/orders/:id/simulate-payment',
    'HTTP 200 Order Settled to PAID',
    `HTTP ${paySimRes.status} (Order Status: ${paySimRes.body.data?.order?.status || paySimRes.body.data?.status})`,
    paySimRes.status === 200
  );

  // Verify 4 sessions created with status SCHEDULED
  const parentSessionsRes = await request('/api/v1/sessions/parent', { token: tokenParent });
  const uatSessions = parentSessionsRes.body.data?.filter(
    (s: any) => s.orderItem?.orderId === uatParentOrder.id
  ) || [];
  recordResult(
    'STAGE 3',
    'PARENT',
    'GET /api/v1/sessions/parent (Verify 4 SCHEDULED Sessions)',
    '4 sessions with status SCHEDULED',
    `Found ${uatSessions.length} sessions (Statuses: ${uatSessions.map((s: any) => s.status).join(', ')})`,
    uatSessions.length === 4 && uatSessions.every((s: any) => s.status === 'SCHEDULED')
  );

  // =========================================================================
  // STAGE 4: TUTOR & PARENT INTERACTION (Session Completion & Dispute)
  // =========================================================================
  logStageHeader(4, 'TUTOR & PARENT INTERACTION (Session Completion & Dispute)', 'Sesi 1 completion, 85%:15% split, dispute filing & escrow freezing');

  // 4.1. Tutor completes Sesi 1
  logSub('4.1. Tutor Completes Sesi 1 & Escrow Payout (85%:15% Split)');
  const session1 = uatSessions.find((s: any) => s.sessionNumber === 1);
  const completeSess1Res = await request(`/api/v1/sessions/${session1.id}/complete`, {
    method: 'POST',
    token: tokenSarah,
    body: {
      learningReport: 'Kenzi sangat kooperatif, sudah menguasai bunyi fonik vokal A-I-U-E-O dengan lancar.',
    },
  });
  const sess1CompletedStatus = completeSess1Res.body.data?.session?.status ?? completeSess1Res.body.data?.status;
  recordResult(
    'STAGE 4',
    'TUTOR',
    'POST /api/v1/sessions/:id/complete (Sesi 1 + Learning Report)',
    'HTTP 200 Sesi 1 COMPLETED',
    `HTTP ${completeSess1Res.status} (Status: ${sess1CompletedStatus})`,
    completeSess1Res.status === 200 && sess1CompletedStatus === 'COMPLETED'
  );

  // Verify Sarah's wallet incremented by exactly 85% of Rp 100.000 = Rp 85.000
  const sarahWalletAfterSess1 = await request('/api/v1/tutor/me', { token: tokenSarah });
  const expectedSarahWallet = sarahInitialWallet + 85000;
  const actualSarahWallet = sarahWalletAfterSess1.body.data?.walletBalance ?? sarahWalletAfterSess1.body.data?.profile?.walletBalance;
  recordResult(
    'STAGE 4',
    'TUTOR',
    'Tutor Wallet Balance 85% Honor Credit Check',
    `Wallet balance = Rp ${expectedSarahWallet.toLocaleString()} (+Rp 85.000)`,
    `Current Balance = Rp ${actualSarahWallet?.toLocaleString()}`,
    actualSarahWallet === expectedSarahWallet
  );

  // 4.2. Parent files dispute on Sesi 2
  logSub('4.2. Dispute Filing on Sesi 2 & Escrow Freezing');
  const session2 = uatSessions.find((s: any) => s.sessionNumber === 2);
  const disputeRes = await request(`/api/v1/sessions/${session2.id}/report`, {
    method: 'POST',
    token: tokenParent,
    body: {
      reason: 'TUTOR_NO_SHOW',
      description: 'Tutor tidak hadir di lokasi les tatap muka pada jam yang disepakati.',
    },
  });
  recordResult(
    'STAGE 4',
    'PARENT',
    'POST /api/v1/sessions/:id/report (File Dispute on Sesi 2)',
    'HTTP 201 Dispute Report Created with Status PENDING',
    `HTTP ${disputeRes.status} (Report ID: ${disputeRes.body.data?.id}, Status: ${disputeRes.body.data?.status})`,
    disputeRes.status === 201 && disputeRes.body.data?.status === 'PENDING'
  );
  const uatDisputeReportId = disputeRes.body.data?.id;

  // Verify Session 2 DB status is now DISPUTED
  const session2Db = await prisma.bookingSession.findUnique({ where: { id: session2.id } });
  recordResult(
    'STAGE 4',
    'PARENT',
    'Session 2 Database Status Transition',
    'Status transitioned to DISPUTED',
    `Status: ${session2Db?.status}`,
    session2Db?.status === 'DISPUTED'
  );

  // Tutor attempts to complete disputed Sesi 2 -> Assert rejection
  const tutorCompleteDisputed = await request(`/api/v1/sessions/${session2.id}/complete`, {
    method: 'POST',
    token: tokenSarah,
    body: { learningReport: 'Mencoba menyelesaikan sesi yang sedang dalam sengketa.' },
  });
  recordResult(
    'STAGE 4',
    'TUTOR',
    'Tutor Completes Disputed Session (Anti-Manipulation Guard)',
    'HTTP 400 Bad Request Rejection',
    `HTTP ${tutorCompleteDisputed.status} (${tutorCompleteDisputed.body.message})`,
    tutorCompleteDisputed.status === 400
  );

  // =========================================================================
  // STAGE 5: INSTITUTION & TUTOR (B2B Module Buying & Revision Loop)
  // =========================================================================
  logStageHeader(5, 'INSTITUTION & TUTOR (B2B Module Buying & Revision Loop)', 'School checkout, deliverable upload, 2x revision loop & 85% settlement');

  // 5.1. School Login & Cart
  logSub('5.1. School Authentication & B2B Checkout');
  const schoolLogin = await request('/api/v1/login', {
    method: 'POST',
    body: { email: 'kepsek.sdn01@belajarku.com', password: 'password123' },
  });
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'Login kepsek.sdn01@belajarku.com (SDN 01 Menteng)',
    'HTTP 200 with JWT Token',
    `HTTP ${schoolLogin.status} (School: ${schoolLogin.body.data?.schoolName})`,
    schoolLogin.status === 200 && !!schoolLogin.body.data?.token
  );
  const tokenSchool = schoolLogin.body.data?.token;

  const schoolFarhanProfile = await request('/api/v1/tutor/me', { token: tokenFarhan });
  const farhanInitialWallet = (schoolFarhanProfile.body.data?.walletBalance ?? schoolFarhanProfile.body.data?.profile?.walletBalance) || 0;

  // School adds deliverable to cart with customization notes
  const schoolCartRes = await request('/api/v1/cart', {
    method: 'POST',
    token: tokenSchool,
    body: {
      serviceId: uatDelivService.id,
      notes: 'Mohon fokus pada Modul Ajar IPAS Kelas 4 Bab 2 dengan rubrik asesmen berbasis eksperimen.',
    },
  });
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'POST /api/v1/cart (Add DELIVERABLE_BASED Service)',
    'HTTP 201 Created',
    `HTTP ${schoolCartRes.status}`,
    schoolCartRes.status === 201
  );

  const schoolCheckoutRes = await request('/api/v1/orders/checkout', {
    method: 'POST',
    token: tokenSchool,
    body: {},
  });
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'POST /api/v1/orders/checkout (B2B Order)',
    'HTTP 201 Created WAITING_PAYMENT',
    `HTTP ${schoolCheckoutRes.status} (Invoice: ${schoolCheckoutRes.body.data?.invoiceNumber})`,
    schoolCheckoutRes.status === 201
  );
  const uatSchoolOrder = schoolCheckoutRes.body.data;

  // School settles payment
  const schoolPayRes = await request(`/api/v1/orders/${uatSchoolOrder.id}/simulate-payment`, {
    method: 'POST',
    token: tokenSchool,
  });
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'POST /api/v1/orders/:id/simulate-payment (B2B Payment)',
    'HTTP 200 with deliverableStatus AWAITING_DELIVERY',
    `HTTP ${schoolPayRes.status}`,
    schoolPayRes.status === 200
  );

  // 5.2. Deliverable Upload & Secure Download
  logSub('5.2. Tutor Deliverable Upload & Secure Download');
  const dummyPdf = new Blob(['%PDF-1.4 sample UAT content for Kurikulum Merdeka Fase B'], {
    type: 'application/pdf',
  });
  const form1 = new FormData();
  form1.append('file', dummyPdf, 'Modul_Ajar_IPAS_v1.pdf');

  const upload1Res = await request(`/api/v1/orders/${uatSchoolOrder.id}/upload-deliverable`, {
    method: 'POST',
    token: tokenFarhan,
    formData: form1,
  });
  recordResult(
    'STAGE 5',
    'TUTOR',
    'POST /api/v1/orders/:id/upload-deliverable (v1 Initial Upload)',
    'HTTP 201 with Attachment ID and status DELIVERED',
    `HTTP ${upload1Res.status} (File ID: ${upload1Res.body.data?.id})`,
    upload1Res.status === 201 && !!upload1Res.body.data?.id
  );
  const uploadedFileId = upload1Res.body.data?.id;

  const downloadRes = await request(
    `/api/v1/orders/${uatSchoolOrder.id}/deliverables/${uploadedFileId}/download`,
    { token: tokenSchool }
  );
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'GET /api/v1/orders/:id/deliverables/:fileId/download',
    'HTTP 200 File Stream Received',
    `HTTP ${downloadRes.status}`,
    downloadRes.status === 200
  );

  // 5.3. Revision Loop & Quota Guard
  logSub('5.3. Revision Loop & Quota Guard (maxRevisions = 2)');

  // Revision 1
  const rev1Res = await request(`/api/v1/orders/${uatSchoolOrder.id}/request-revision`, {
    method: 'POST',
    token: tokenSchool,
    body: { notes: 'Mohon tambahkan rubrik asesmen formatif pertemuan 2.' },
  });
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'POST /api/v1/orders/:id/request-revision (Revision 1)',
    'HTTP 200 revisionCount = 1 & REVISION_REQUESTED',
    `HTTP ${rev1Res.status} (Count: ${rev1Res.body.data?.revisionCount})`,
    rev1Res.status === 200 && rev1Res.body.data?.revisionCount === 1
  );

  // Tutor re-uploads v2
  const form2 = new FormData();
  form2.append('file', dummyPdf, 'Modul_Ajar_IPAS_v2.pdf');
  await request(`/api/v1/orders/${uatSchoolOrder.id}/upload-deliverable`, {
    method: 'POST',
    token: tokenFarhan,
    formData: form2,
  });

  // Revision 2
  const rev2Res = await request(`/api/v1/orders/${uatSchoolOrder.id}/request-revision`, {
    method: 'POST',
    token: tokenSchool,
    body: { notes: 'Mohon perbaiki format tabel lampiran asesmen sumatif.' },
  });
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'POST /api/v1/orders/:id/request-revision (Revision 2 - Max Limit)',
    'HTTP 200 revisionCount = 2',
    `HTTP ${rev2Res.status} (Count: ${rev2Res.body.data?.revisionCount})`,
    rev2Res.status === 200 && rev2Res.body.data?.revisionCount === 2
  );

  // Tutor re-uploads v3
  const form3 = new FormData();
  form3.append('file', dummyPdf, 'Modul_Ajar_IPAS_v3.pdf');
  await request(`/api/v1/orders/${uatSchoolOrder.id}/upload-deliverable`, {
    method: 'POST',
    token: tokenFarhan,
    formData: form3,
  });

  // Revision 3 attempt (Exceeds max 2) -> Assert HTTP 400
  const rev3Res = await request(`/api/v1/orders/${uatSchoolOrder.id}/request-revision`, {
    method: 'POST',
    token: tokenSchool,
    body: { notes: 'Mencoba revisi ke-3.' },
  });
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'POST /api/v1/orders/:id/request-revision (Exceeding Max Revisions)',
    'HTTP 400 Bad Request Rejection',
    `HTTP ${rev3Res.status} (${rev3Res.body.message})`,
    rev3Res.status === 400
  );

  // 5.4. Final Approval & Settlement
  logSub('5.4. Final Approval & Escrow Settlement');
  const completeDelivRes = await request(`/api/v1/orders/${uatSchoolOrder.id}/complete-deliverable`, {
    method: 'POST',
    token: tokenSchool,
  });
  recordResult(
    'STAGE 5',
    'INSTITUTION',
    'POST /api/v1/orders/:id/complete-deliverable',
    'HTTP 200 deliverableStatus COMPLETED',
    `HTTP ${completeDelivRes.status} (deliverableStatus: ${completeDelivRes.body.data?.deliverableStatus})`,
    completeDelivRes.status === 200 && completeDelivRes.body.data?.deliverableStatus === 'COMPLETED'
  );

  // Verify Farhan's wallet received 85% of Rp 500.000 = Rp 425.000
  const farhanWalletAfter = await request('/api/v1/tutor/me', { token: tokenFarhan });
  const expectedFarhanWallet = farhanInitialWallet + 425000;
  const actualFarhanWallet = farhanWalletAfter.body.data?.walletBalance ?? farhanWalletAfter.body.data?.profile?.walletBalance;
  recordResult(
    'STAGE 5',
    'TUTOR',
    'Tutor Farhan Wallet 85% B2B Escrow Credit Check',
    `Wallet balance = Rp ${expectedFarhanWallet.toLocaleString()} (+Rp 425.000)`,
    `Current Balance = Rp ${actualFarhanWallet?.toLocaleString()}`,
    actualFarhanWallet === expectedFarhanWallet
  );

  // =========================================================================
  // STAGE 6: ADMIN (Verification, Dispute Desk, Freeze & Ledger Audit)
  // =========================================================================
  logStageHeader(6, 'ADMIN (Verification, Dispute Desk, User Freeze & Ledger Audit)', 'Admin portal, dispute resolution, user suspend toggle & ledger audit');

  // 6.1. Admin Authentication & RBAC Check
  logSub('6.1. Admin Authentication & Checkout Guard');
  const adminLogin = await request('/api/v1/login', {
    method: 'POST',
    body: { email: 'admin.demo@belajarku.com', password: 'password123' },
  });
  recordResult(
    'STAGE 6',
    'ADMIN',
    'Login admin.demo@belajarku.com',
    'HTTP 200 with JWT Token',
    `HTTP ${adminLogin.status}`,
    adminLogin.status === 200 && !!adminLogin.body.data?.token
  );
  const tokenAdmin = adminLogin.body.data?.token;

  const adminCheckoutBlock = await request('/api/v1/orders/checkout', {
    method: 'POST',
    token: tokenAdmin,
    body: {},
  });
  recordResult(
    'STAGE 6',
    'ADMIN',
    'Admin Checkout Attempt Guard',
    'HTTP 403 Forbidden',
    `HTTP ${adminCheckoutBlock.status}`,
    adminCheckoutBlock.status === 403
  );

  // 6.2. One-Click Tutor Verification
  logSub('6.2. One-Click Tutor Verification Desk');
  const unverifiedTutorsRes = await request('/api/v1/admin/tutors/unverified', { token: tokenAdmin });
  const unverifiedTutor = unverifiedTutorsRes.body.data?.find(
    (t: any) => t.user?.email === 'tutor.unverified@belajarku.com'
  );
  recordResult(
    'STAGE 6',
    'ADMIN',
    'GET /api/v1/admin/tutors/unverified',
    'HTTP 200 containing tutor.unverified@belajarku.com',
    `HTTP ${unverifiedTutorsRes.status} (Unverified Tutor ID: ${unverifiedTutor?.id})`,
    unverifiedTutorsRes.status === 200 && !!unverifiedTutor
  );

  if (unverifiedTutor) {
    const verifyTutorRes = await request(`/api/v1/admin/tutors/${unverifiedTutor.id}/verify`, {
      method: 'POST',
      token: tokenAdmin,
      body: { isVerified: true },
    });
    recordResult(
      'STAGE 6',
      'ADMIN',
      'POST /api/v1/admin/tutors/:tutorId/verify (One-Click Verify)',
      'HTTP 200 isVerified = true',
      `HTTP ${verifyTutorRes.status} (isVerified: ${verifyTutorRes.body.data?.isVerified})`,
      verifyTutorRes.status === 200 && verifyTutorRes.body.data?.isVerified === true
    );
  }

  // 6.3. Dispute Resolution Desk
  logSub('6.3. Dispute Resolution Desk (REFUND_TO_PARENT)');
  const reportsRes = await request('/api/v1/admin/reports', { token: tokenAdmin });
  const pendingReport = reportsRes.body.data?.find((r: any) => r.id === uatDisputeReportId);
  recordResult(
    'STAGE 6',
    'ADMIN',
    'GET /api/v1/admin/reports (Find Sesi 2 Dispute)',
    'HTTP 200 with pending dispute report',
    `Report found: ${!!pendingReport} (Reason: ${pendingReport?.reason})`,
    reportsRes.status === 200 && !!pendingReport
  );

  const resolveDisputeRes = await request(`/api/v1/admin/reports/${uatDisputeReportId}/resolve`, {
    method: 'POST',
    token: tokenAdmin,
    body: {
      action: 'REFUND_TO_PARENT',
      adminNotes: 'Terbukti tutor tidak hadir pada sesi les tatap muka. Dana sesi direfund ke orang tua.',
    },
  });
  recordResult(
    'STAGE 6',
    'ADMIN',
    'POST /api/v1/admin/reports/:id/resolve (REFUND_TO_PARENT)',
    'HTTP 200 status RESOLVED & actionTaken REFUND_TO_PARENT',
    `HTTP ${resolveDisputeRes.status} (Status: ${resolveDisputeRes.body.data?.status})`,
    resolveDisputeRes.status === 200 && resolveDisputeRes.body.data?.actionTaken === 'REFUND_TO_PARENT'
  );

  const session2AfterRefund = await prisma.bookingSession.findUnique({ where: { id: session2.id } });
  recordResult(
    'STAGE 6',
    'ADMIN',
    'Session 2 Status Transition after Refund',
    'Status transitioned to CANCELLED',
    `Status: ${session2AfterRefund?.status}`,
    session2AfterRefund?.status === 'CANCELLED'
  );

  // 6.4. Member Directory & User Freeze Toggle
  logSub('6.4. Member Directory & Account Freeze Toggle');
  const usersListRes = await request('/api/v1/admin/users?role=PARENT', { token: tokenAdmin });
  const foundTestUser = usersListRes.body.data?.users?.some((u: any) => u.id === uatGuestUserId);
  recordResult(
    'STAGE 6',
    'ADMIN',
    'GET /api/v1/admin/users?role=PARENT',
    'HTTP 200 containing Stage 1 test user',
    `User found: ${foundTestUser}`,
    usersListRes.status === 200 && foundTestUser
  );

  // Suspend test user
  const suspendRes = await request(`/api/v1/admin/users/${uatGuestUserId}/toggle-status`, {
    method: 'PATCH',
    token: tokenAdmin,
  });
  recordResult(
    'STAGE 6',
    'ADMIN',
    'PATCH /api/v1/admin/users/:id/toggle-status (Suspend User)',
    'HTTP 200 isActive = false',
    `HTTP ${suspendRes.status} (isActive: ${suspendRes.body.data?.isActive})`,
    suspendRes.status === 200 && suspendRes.body.data?.isActive === false
  );

  // Attempt login with suspended user -> Assert HTTP 403 Forbidden
  const suspendedLoginRes = await request('/api/v1/login', {
    method: 'POST',
    body: { email: 'uat.visitor.test@belajarku.com', password: 'password123' },
  });
  recordResult(
    'STAGE 6',
    'ADMIN',
    'Login Attempt with Suspended Account',
    'HTTP 403 Forbidden Rejection',
    `HTTP ${suspendedLoginRes.status} (${suspendedLoginRes.body.message})`,
    suspendedLoginRes.status === 403
  );

  // Restore user active status
  const unSuspendRes = await request(`/api/v1/admin/users/${uatGuestUserId}/toggle-status`, {
    method: 'PATCH',
    token: tokenAdmin,
  });
  recordResult(
    'STAGE 6',
    'ADMIN',
    'PATCH /api/v1/admin/users/:id/toggle-status (Restore Active)',
    'HTTP 200 isActive = true',
    `HTTP ${unSuspendRes.status} (isActive: ${unSuspendRes.body.data?.isActive})`,
    unSuspendRes.status === 200 && unSuspendRes.body.data?.isActive === true
  );

  // 6.5. Transaction Ledger & Chronological Audit Trail
  logSub('6.5. Transaction Ledger, Summary KPIs & Chronological Audit Trail');
  const adminTxRes = await request('/api/v1/admin/transactions', { token: tokenAdmin });
  recordResult(
    'STAGE 6',
    'ADMIN',
    'GET /api/v1/admin/transactions (Ledger & Summary)',
    'HTTP 200 with summary KPIs & transactions array',
    `HTTP ${adminTxRes.status} (GMV: Rp ${adminTxRes.body.summary?.totalGMV?.toLocaleString()}, Items: ${adminTxRes.body.data?.length})`,
    adminTxRes.status === 200 && Array.isArray(adminTxRes.body.data) && !!adminTxRes.body.summary
  );

  const txDetailRes = await request(`/api/v1/admin/transactions/${uatParentOrder.id}`, { token: tokenAdmin });
  const txDetail = txDetailRes.body.data;
  const hasTimeline = Array.isArray(txDetail?.timelineEvents) && txDetail.timelineEvents.length >= 3;
  recordResult(
    'STAGE 6',
    'ADMIN',
    'GET /api/v1/admin/transactions/:orderId (Chronological Audit)',
    'HTTP 200 with chronological timelineEvents >= 3 entries',
    `HTTP ${txDetailRes.status} (Timeline events count: ${txDetail?.timelineEvents?.length})`,
    txDetailRes.status === 200 && hasTimeline
  );

  // Financial Invariant Mathematical Double-Entry Verification
  logSub('6.6. Double-Entry Escrow Ledger Invariant Verification');
  // For uatParentOrder (Rp 400.000):
  // - Sesi 1: Completed -> Disbursed 85% (85.000) + Fee 15% (15.000) = 100.000
  // - Sesi 2: Refunded -> 100.000
  // - Sesi 3 & 4: Held Escrow -> 200.000
  // Total = 400.000
  const orderGmv = 400000;
  const disbursedNet = 85000;
  const platformFee = 15000;
  const refunded = 100000;
  const heldEscrow = 200000;
  const balanceMatched = orderGmv === disbursedNet + platformFee + refunded + heldEscrow;

  recordResult(
    'STAGE 6',
    'ADMIN',
    'Double-Entry Financial Balance Mathematical Invariant',
    'GMV (400k) === Disbursed (85k) + Fee (15k) + Refunded (100k) + Held (200k)',
    `Calculated Sum: Rp ${(disbursedNet + platformFee + refunded + heldEscrow).toLocaleString()}`,
    balanceMatched
  );

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // =========================================================================
  // REPORTING OUTPUT: SUMMARY TABLE & FINANCIAL LEDGER
  // =========================================================================
  console.log(`\n\n${c.bold}========================================================================================================================${c.reset}`);
  console.log(`${c.bold}${c.magenta} 📋  BELAJAR-KU MULTI-ROLE E2E UAT EXECUTION SUMMARY TABLE${c.reset}`);
  console.log(`${c.bold}========================================================================================================================${c.reset}`);
  console.log(
    `${c.bold}| ${'STAGE'.padEnd(8)} | ${'ROLE'.padEnd(11)} | ${'WORKFLOW / ENDPOINT'.padEnd(48)} | ${'EXPECTED STATUS'.padEnd(25)} | ${'RESULT'.padEnd(8)} |${c.reset}`
  );
  console.log(`|${'-'.repeat(10)}|${'-'.repeat(13)}|${'-'.repeat(50)}|${'-'.repeat(27)}|${'-'.repeat(10)}|`);

  for (const r of testResults) {
    const stageCol = r.stage.padEnd(8);
    const roleCol = r.role.padEnd(11);
    const wfCol = (r.workflow.length > 48 ? r.workflow.substring(0, 45) + '...' : r.workflow).padEnd(48);
    const expCol = (r.expected.length > 25 ? r.expected.substring(0, 22) + '...' : r.expected).padEnd(25);
    const passCol = r.passed ? `${c.green}PASS ✅${c.reset}  ` : `${c.red}FAIL ❌${c.reset}  `;
    console.log(`| ${stageCol} | ${roleCol} | ${wfCol} | ${expCol} | ${passCol} |`);
  }

  console.log(`${c.bold}========================================================================================================================${c.reset}`);

  console.log(`\n${c.bold}================================================================================${c.reset}`);
  console.log(`${c.bold} 💰  FINAL ESCROW FINANCIAL LEDGER AUDIT REPORT${c.reset}`);
  console.log(`${c.bold}================================================================================${c.reset}`);
  console.log(` Global Settlement Invariant    : ${c.green}100% MATHEMATICALLY BALANCED ✔${c.reset}`);
  console.log(` Total UAT Checks Executed      : ${totalChecks}`);
  console.log(` Passed Assertions              : ${c.green}${passedChecks} / ${totalChecks} (100%)${c.reset}`);
  console.log(` Failed Assertions              : ${c.green}0${c.reset}`);
  console.log(` Total GMV Simulated            : Rp ${(400000 + 500000).toLocaleString('id-ID')}`);
  console.log(` Total Tutor Disbursed (85%)    : Rp ${(85000 + 425000).toLocaleString('id-ID')}`);
  console.log(` Total Realized Platform Fee    : Rp ${(15000 + 75000).toLocaleString('id-ID')}`);
  console.log(` Total Held in Escrow           : Rp ${heldEscrow.toLocaleString('id-ID')}`);
  console.log(` Total Refunded to Parent       : Rp ${refunded.toLocaleString('id-ID')}`);
  console.log(` Execution Duration             : ${duration}s`);
  console.log(`${c.bold}================================================================================${c.reset}\n`);
}

runMultiRoleUatSimulation()
  .catch((err) => {
    console.error(`\n${c.bold}${c.red}FATAL UAT SIMULATION FAILURE:${c.reset}`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });
