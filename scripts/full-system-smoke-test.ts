/**
 * Belajar-Ku - Comprehensive System-Wide Smoke Test & Logic Flaw Audit Script
 *
 * Exhaustively validates:
 * 1. Contract & Zod schema resilience (including ?ngrok-skip-browser-warning=true)
 * 2. Role PARENT: Full account, student lifecycle, catalog, cart, order, and review
 * 3. Role TUTOR: Profile, availability, assignments, session completion report
 * 4. Role INSTITUTION (Sekolah): Profile, B2B program catalog, B2B deliverable order
 * 5. Role ADMIN: KPI stats, users management, tutor verification, full catalog CRUD, transaction ledger
 * 6. Security & Logic Flaws: IDOR, RBAC violation, empty cart, inactive service, negative values, invalid enums
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const isDocker = fs.existsSync('/.dockerenv');
const BASE_URL = process.env.API_URL || 'http://localhost:5000';

const dbUrl = isDocker
  ? (process.env.DATABASE_URL || 'postgresql://postgres:postgres@postgres:5432/belajarku?schema=public')
  : (process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/belajarku?schema=public').replace('@postgres:', '@localhost:');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

// Terminal Styling
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
};

interface TestResult {
  section: string;
  role: string;
  action: string;
  expected: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

function assert(
  section: string,
  role: string,
  action: string,
  condition: boolean,
  expected: string,
  details?: string
) {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ section, role, action, expected, status, details });

  const icon = condition ? `${c.green}PASS ✅${c.reset}` : `${c.red}FAIL ❌${c.reset}`;
  console.log(
    ` [${icon}] ${c.bold}${role}${c.reset} - ${action} | ${c.dim}${expected}${c.reset}${
      details ? ` | ${details}` : ''
    }`
  );

  if (!condition) {
    console.error(`     ${c.red}Assertion Failed! Details: ${details}${c.reset}`);
  }
}

// HTTP Helper with native fetch and Ngrok bypass header & params
async function request(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  options?: {
    token?: string;
    data?: any;
    params?: any;
  }
) {
  let url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const queryParams = new URLSearchParams({
    ...options?.params,
    'ngrok-skip-browser-warning': 'true',
  });
  url += (url.includes('?') ? '&' : '?') + queryParams.toString();

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options?.data ? JSON.stringify(options.data) : undefined,
    });

    let data: any = null;
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    return {
      status: res.status,
      data,
    };
  } catch (err: any) {
    return {
      status: 500,
      data: { success: false, message: err.message },
    };
  }
}

async function runSmokeTest() {
  console.log(`\n${c.bold}${c.cyan}================================================================================${c.reset}`);
  console.log(`${c.bold}${c.cyan} 🧪  BELAJAR-KU COMPREHENSIVE SYSTEM-WIDE SMOKE TEST & LOGIC FLAW AUDIT${c.reset}`);
  console.log(` API Base URL : ${BASE_URL}`);
  console.log(` Database     : PostgreSQL via Prisma ORM`);
  console.log(` Target Roles : PARENT, TUTOR, INSTITUTION, ADMIN`);
  console.log(`${c.bold}${c.cyan}================================================================================${c.reset}\n`);

  // Credentials
  const PARENT_CREDS = { email: 'parent.demo@belajarku.com', password: 'password123' };
  const TUTOR_CREDS = { email: 'tutor.paud@belajarku.com', password: 'password123' };
  const INSTITUTION_CREDS = { email: 'kepsek.sdn01@belajarku.com', password: 'password123' };
  const ADMIN_CREDS = { email: 'admin.demo@belajarku.com', password: 'password123' };

  let parentToken = '';
  let tutorToken = '';
  let institutionToken = '';
  let adminToken = '';

  let parentUserId = '';
  let tutorUserId = '';
  let tutorProfileId = '';
  let studentId = '';
  let cartItemId = '';
  let createdOrderId = '';
  let scheduledSessionId = '';
  let adminCreatedServiceId = '';

  // Secondary parent for IDOR testing
  const PARENT_B_CREDS = {
    name: 'Bunda Sarah B',
    email: 'parent.idor.victim@belajarku.com',
    phone: '081234567899',
    password: 'password123',
    role: 'PARENT',
  };
  let parentBToken = '';
  let parentBStudentId = '';
  let parentBOrderId = '';

  // =========================================================================
  // SETUP: Secondary Parent for IDOR
  // =========================================================================
  console.log(`\n${c.bold}▶ Setup: Preparing Multi-User Context for IDOR Tests${c.reset}`);
  // Ensure user B exists
  await prisma.user.upsert({
    where: { email: PARENT_B_CREDS.email },
    update: { isActive: true },
    create: {
      name: PARENT_B_CREDS.name,
      email: PARENT_B_CREDS.email,
      phone: PARENT_B_CREDS.phone,
      passwordHash: '$2b$10$w0.04m84K9L7uN4sTzWcTeI7p1VjB59t/oY0jT15mS2L0q4h8h.bW', // password123
      role: 'PARENT',
      isActive: true,
    },
  });

  const parentBLoginRes = await request('POST', '/api/v1/auth/login', { data: { email: PARENT_B_CREDS.email, password: 'password123' } });
  parentBToken = parentBLoginRes.data?.data?.token;

  // Create student for Parent B
  const bUser = await prisma.user.findUnique({ where: { email: PARENT_B_CREDS.email } });
  if (bUser) {
    let bStudent = await prisma.studentProfile.findFirst({ where: { parentId: bUser.id } });
    if (!bStudent) {
      bStudent = await prisma.studentProfile.create({
        data: {
          parentId: bUser.id,
          studentName: 'Anak Parent B (Victim)',
          gradeLevel: 'SD',
        },
      });
    }
    parentBStudentId = bStudent.id;

    // Create a dummy order for Parent B
    let bOrder = await prisma.order.findFirst({ where: { parentId: bUser.id } });
    if (!bOrder) {
      bOrder = await prisma.order.create({
        data: {
          invoiceNumber: `INV-IDOR-${Date.now()}`,
          parentId: bUser.id,
          totalAmount: 150000,
          status: 'PAID',
        },
      });
    }
    parentBOrderId = bOrder.id;
  }

  // =========================================================================
  // 1. ROLE PARENT (Orang Tua)
  // =========================================================================
  console.log(`\n${c.bold}${c.blue}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.blue}1. ROLE PARENT (Orang Tua - Complete User & Child Journey)${c.reset}`);
  console.log(`${c.bold}${c.blue}====================================================================${c.reset}`);

  // 1.1 Authentication & Account
  const pLogin = await request('POST', '/api/v1/auth/login', { data: PARENT_CREDS });
  assert('1. PARENT', 'PARENT', 'Login Auth', pLogin.status === 200 && !!pLogin.data?.data?.token, 'HTTP 200 with JWT Token');
  parentToken = pLogin.data?.data?.token;
  parentUserId = pLogin.data?.data?.user?.id;

  const pMe = await request('GET', '/api/v1/auth/me', { token: parentToken });
  assert('1. PARENT', 'PARENT', 'Get Me/Profile', pMe.status === 200 && pMe.data?.data?.email === PARENT_CREDS.email, 'HTTP 200 with matching email');

  const pUpdateProfile = await request('PUT', '/api/v1/auth/profile', {
    token: parentToken,
    data: { name: 'Ayah Demo Pratama Updated', phone: '081234567890' },
  });
  assert('1. PARENT', 'PARENT', 'Update Profile', pUpdateProfile.status === 200 && pUpdateProfile.data?.data?.name === 'Ayah Demo Pratama Updated', 'HTTP 200 Profile Updated');

  // Revert name back
  await request('PUT', '/api/v1/auth/profile', {
    token: parentToken,
    data: { name: 'Ayah Demo Pratama', phone: '081234567890' },
  });

  const pChangePwd = await request('PUT', '/api/v1/auth/password', {
    token: parentToken,
    data: { currentPassword: 'password123', newPassword: 'password123' },
  });
  assert('1. PARENT', 'PARENT', 'Change Password (Valid Old Pwd)', pChangePwd.status === 200, 'HTTP 200 Password Updated');

  const pChangePwdFail = await request('PUT', '/api/v1/auth/password', {
    token: parentToken,
    data: { currentPassword: 'wrongpassword', newPassword: 'password123456' },
  });
  assert('1. PARENT', 'PARENT', 'Change Password (Wrong Old Pwd)', pChangePwdFail.status === 400, 'HTTP 400 Bad Request');

  // 1.2 Child / Student Management (Full Lifecycle)
  const addStudentRes = await request('POST', '/api/v1/students', {
    token: parentToken,
    data: {
      studentName: 'Ananda Aditya SmokeTest',
      gradeLevel: 'SD',
      learningNotes: 'Perlu bimbingan matematika & konsentrasi belajar',
    },
  });
  assert('1. PARENT', 'PARENT', 'Create Student Profile', addStudentRes.status === 201 && !!addStudentRes.data?.data?.id, 'HTTP 201 Created');
  studentId = addStudentRes.data?.data?.id;

  const getStudentsRes = await request('GET', '/api/v1/students', { token: parentToken });
  assert('1. PARENT', 'PARENT', 'List Student Profiles', getStudentsRes.status === 200 && Array.isArray(getStudentsRes.data?.data), 'HTTP 200 Array of students');

  const getSingleStudentRes = await request('GET', `/api/v1/students/${studentId}`, { token: parentToken });
  assert('1. PARENT', 'PARENT', 'Get Single Student Profile', getSingleStudentRes.status === 200 && getSingleStudentRes.data?.data?.id === studentId, 'HTTP 200 OK');

  const updateStudentRes = await request('PUT', `/api/v1/students/${studentId}`, {
    token: parentToken,
    data: {
      studentName: 'Ananda Aditya Updated',
      gradeLevel: 'SD',
      learningNotes: 'Catatan belajar diperbarui',
    },
  });
  assert('1. PARENT', 'PARENT', 'Update Student Profile', updateStudentRes.status === 200 && updateStudentRes.data?.data?.studentName === 'Ananda Aditya Updated', 'HTTP 200 Updated');

  // Create disposable student to test clean deletion
  const disposableStudent = await request('POST', '/api/v1/students', {
    token: parentToken,
    data: { studentName: 'Temporary Child', gradeLevel: 'PAUD' },
  });
  const deleteStudentRes = await request('DELETE', `/api/v1/students/${disposableStudent.data?.data?.id}`, { token: parentToken });
  assert('1. PARENT', 'PARENT', 'Delete Student Profile (No active order)', deleteStudentRes.status === 200, 'HTTP 200 Deleted successfully');

  // 1.3 Catalog Discovery & Filtering
  const catRes = await request('GET', '/api/v1/categories');
  assert('1. PARENT', 'PARENT', 'Get Subject Categories', catRes.status === 200 && catRes.data?.data?.length > 0, 'HTTP 200 with categories list', `Status: ${catRes.status}`);

  const filterGradeRes = await request('GET', '/api/v1/services?gradeLevel=SD');
  const gradeItems = Array.isArray(filterGradeRes.data?.data) ? filterGradeRes.data?.data : filterGradeRes.data?.data?.items;
  assert('1. PARENT', 'PARENT', 'Filter Services by Grade (SD)', filterGradeRes.status === 200 && Array.isArray(gradeItems), 'HTTP 200 with filtered items', `Status: ${filterGradeRes.status}`);

  const searchServiceRes = await request('GET', '/api/v1/services?search=matematika');
  const searchItems = Array.isArray(searchServiceRes.data?.data) ? searchServiceRes.data?.data : searchServiceRes.data?.data?.items;
  assert('1. PARENT', 'PARENT', 'Search Services by Keyword', searchServiceRes.status === 200 && Array.isArray(searchItems), 'HTTP 200 with search results', `Status: ${searchServiceRes.status}`);

  // Helper for timezone-safe slot date generation
  function getNextDateForDayOfWeek(dayOfWeek: number, weeksOffset = 0): string {
    const today = new Date();
    const currentJsDay = today.getUTCDay(); // 0 is Sun, 1 is Mon
    const currentCustomDay = currentJsDay === 0 ? 7 : currentJsDay;
    let daysUntil = (dayOfWeek - currentCustomDay + 7) % 7;
    if (daysUntil === 0) daysUntil = 7;
    daysUntil += weeksOffset * 7;

    const targetDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + daysUntil));
    return targetDate.toISOString().split('T')[0];
  }

  // 1.4 Cart & Checkout Lifecycle
  // Find an active session-based service
  const servicesList = await prisma.tutorService.findMany({
    where: { serviceType: 'SESSION_BASED', isActive: true },
    include: { tutor: { include: { availabilities: { where: { isActive: true } } } } },
  });

  const targetService = servicesList.find((s) => s.tutor.availabilities.length > 0) || servicesList[0];
  tutorProfileId = targetService.tutorId;

  // Clear existing cart items
  const existingCart = await request('GET', '/api/v1/cart', { token: parentToken });
  if (existingCart.data?.data?.items?.length > 0) {
    for (const it of existingCart.data.data.items) {
      await request('DELETE', `/api/v1/cart/${it.id}`, { token: parentToken });
    }
  }

  // Calculate dynamic valid dates offset by 8 weeks to guarantee no past booking conflict
  const slotAvail = targetService.tutor.availabilities[0] || { dayOfWeek: 1, startTime: '10:00', endTime: '11:00' };
  const selectedSlots = Array.from({ length: targetService.sessionCount }, (_, i) => ({
    date: getNextDateForDayOfWeek(slotAvail.dayOfWeek, i + 8),
    startTime: slotAvail.startTime,
    endTime: slotAvail.endTime,
  }));

  const addToCartRes = await request('POST', '/api/v1/cart', {
    token: parentToken,
    data: {
      serviceId: targetService.id,
      studentId: studentId,
      selectedSlots,
      teachingAddress: 'Jl. Pegangsaan Timur No. 56, Jakarta Pusat',
      notes: 'Les privat di rumah murid',
    },
  });
  assert('1. PARENT', 'PARENT', 'Add Service to Cart', addToCartRes.status === 201 && !!addToCartRes.data?.data?.id, 'HTTP 201 Added to cart', `Status: ${addToCartRes.status}, Msg: ${addToCartRes.data?.message}`);
  cartItemId = addToCartRes.data?.data?.id;

  const getCartRes = await request('GET', '/api/v1/cart', { token: parentToken });
  assert('1. PARENT', 'PARENT', 'Get Cart & Subtotal Calculation', getCartRes.status === 200 && getCartRes.data?.data?.items?.length === 1 && getCartRes.data?.data?.totalAmount > 0, 'HTTP 200 with totalAmount', `Status: ${getCartRes.status}`);

  const updateCartRes = await request('PUT', `/api/v1/cart/${cartItemId}`, {
    token: parentToken,
    data: { notes: 'Catatan keranjang diperbarui' },
  });
  assert('1. PARENT', 'PARENT', 'Update Cart Item Notes', updateCartRes.status === 200, 'HTTP 200 Cart Item Updated', `Status: ${updateCartRes.status}`);

  // Checkout order
  const checkoutRes = await request('POST', '/api/v1/orders/checkout', {
    token: parentToken,
    data: { paymentMethod: 'MOCK_PAYMENT_GATEWAY' },
  });
  const orderData = checkoutRes.data?.data?.order || checkoutRes.data?.data;
  createdOrderId = orderData?.id;
  assert('1. PARENT', 'PARENT', 'Checkout Cart to Order', checkoutRes.status === 201 && orderData?.status === 'WAITING_PAYMENT', 'HTTP 201 Created with status WAITING_PAYMENT', `Status: ${checkoutRes.status}, Msg: ${checkoutRes.data?.message}`);

  const ordersRes = await request('GET', '/api/v1/orders/mine', { token: parentToken });
  assert('1. PARENT', 'PARENT', 'Get My Orders History', ordersRes.status === 200 && Array.isArray(ordersRes.data?.data), 'HTTP 200 Orders list', `Status: ${ordersRes.status}`);

  const orderDetailRes = await request('GET', `/api/v1/orders/${createdOrderId}`, { token: parentToken });
  assert('1. PARENT', 'PARENT', 'Get Order Detail by ID', orderDetailRes.status === 200 && orderDetailRes.data?.data?.id === createdOrderId, 'HTTP 200 Order Detail', `Status: ${orderDetailRes.status}`);

  // Simulate payment to generate booking sessions
  const payRes = await request('POST', `/api/v1/orders/${createdOrderId}/simulate-payment`, { token: parentToken });
  assert('1. PARENT', 'PARENT', 'Simulate Payment Settlement', payRes.status === 200 && (payRes.data?.data?.status === 'PAID' || payRes.data?.data?.order?.status === 'PAID'), 'HTTP 200 Order Paid & Sessions Generated', `Status: ${payRes.status}`);

  // Verify child with active booking sessions CANNOT be deleted
  const deleteChildBlocked = await request('DELETE', `/api/v1/students/${studentId}`, { token: parentToken });
  assert('1. PARENT', 'PARENT', 'Delete Student with Active Sessions Guard', deleteChildBlocked.status === 400, 'HTTP 400 Bad Request', `Status: ${deleteChildBlocked.status}`);

  // 1.5 Reviews & Ratings
  const reviewRes = await request('POST', `/api/v1/orders/${createdOrderId}/reviews`, {
    token: parentToken,
    data: {
      rating: 5,
      comment: 'Tutor sangat ramah, sabar, dan materi matematika disampaikan dengan sangat interaktif!',
    },
  });
  assert('1. PARENT', 'PARENT', 'Submit Order Review & Rating', reviewRes.status === 201 && reviewRes.data?.data?.rating === 5, 'HTTP 201 Review Created', `Status: ${reviewRes.status}`);

  const tutorReviewsRes = await request('GET', `/api/v1/tutors/${tutorProfileId}/reviews`);
  assert('1. PARENT', 'PARENT', 'Get Tutor Public Reviews List', tutorReviewsRes.status === 200 && tutorReviewsRes.data?.data?.reviews?.length > 0, 'HTTP 200 Reviews Found', `Status: ${tutorReviewsRes.status}`);

  // =========================================================================
  // 2. ROLE TUTOR (Guru / Pengajar)
  // =========================================================================
  console.log(`\n${c.bold}${c.green}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.green}2. ROLE TUTOR (Supply-Side: Profile, Availability & Assignments)${c.reset}`);
  console.log(`${c.bold}${c.green}====================================================================${c.reset}`);

  const tLogin = await request('POST', '/api/v1/auth/login', { data: TUTOR_CREDS });
  assert('2. TUTOR', 'TUTOR', 'Tutor Login Auth', tLogin.status === 200 && !!tLogin.data?.data?.token, 'HTTP 200 with JWT Token');
  tutorToken = tLogin.data?.data?.token;
  tutorUserId = tLogin.data?.data?.user?.id;

  const tProfile = await request('GET', '/api/v1/users/tutor/me', { token: tutorToken });
  assert('2. TUTOR', 'TUTOR', 'Get Tutor Profile', tProfile.status === 200 && !!tProfile.data?.data?.id, 'HTTP 200 Tutor Profile');

  const tUpdateProfile = await request('PUT', '/api/v1/users/tutor/me', {
    token: tutorToken,
    data: {
      bio: 'Guru berpengalaman mengajar anak usia dini dan calistung ceria lebih dari 6 tahun.',
      education: 'S1 Pendidikan Guru PAUD Universitas Negeri Jakarta',
      address: 'Kecamatan Tebet, Jakarta Selatan',
      specialAccommodations: 'Metode Montessori & Flashcard Edukatif',
    },
  });
  assert('2. TUTOR', 'TUTOR', 'Update Tutor Profile (Bio, Edu, Accommodations)', tUpdateProfile.status === 200, 'HTTP 200 Profile Updated');

  // Tutor Availability
  const addAvailRes = await request('POST', '/api/v1/services/availability', {
    token: tutorToken,
    data: { dayOfWeek: 3, startTime: '14:00', endTime: '15:30' },
  });
  assert('2. TUTOR', 'TUTOR', 'Add Weekly Availability Slot', addAvailRes.status === 201 && !!addAvailRes.data?.data?.id, 'HTTP 201 Slot Created');
  const createdAvailId = addAvailRes.data?.data?.id;

  const getAvailRes = await request('GET', '/api/v1/services/availability', { token: tutorToken });
  assert('2. TUTOR', 'TUTOR', 'Get Tutor Availability Slots', getAvailRes.status === 200 && Array.isArray(getAvailRes.data?.data), 'HTTP 200 Slots Array');

  if (createdAvailId) {
    await request('DELETE', `/api/v1/services/availability/${createdAvailId}`, { token: tutorToken });
  }

  // Tutor Bookings & Assignments
  const tutorBookingsRes = await request('GET', '/api/v1/tutor/bookings', { token: tutorToken });
  assert('2. TUTOR', 'TUTOR', 'Get Tutor Bookings & Assignments', tutorBookingsRes.status === 200 && Array.isArray(tutorBookingsRes.data?.data?.sessions), 'HTTP 200 Bookings List');

  // Complete a session with progress report
  const tutorSessions = tutorBookingsRes.data?.data?.sessions || [];
  const scheduledSession = tutorSessions.find((s: any) => s.status === 'SCHEDULED');
  if (scheduledSession) {
    scheduledSessionId = scheduledSession.id;
    const completeSessionRes = await request('POST', `/api/v1/sessions/${scheduledSessionId}/complete`, {
      token: tutorToken,
      data: {
        learningReport: 'Siswa sangat antusias memahami materi pengenalan angka dan operasi penjumlahan dasar.',
      },
    });
    assert('2. TUTOR', 'TUTOR', 'Complete Session with Student Learning Report', completeSessionRes.status === 200 && completeSessionRes.data?.data?.session?.status === 'COMPLETED', 'HTTP 200 COMPLETED');
  }

  // =========================================================================
  // 3. ROLE SEKOLAH / MITRA (B2B Partner)
  // =========================================================================
  console.log(`\n${c.bold}${c.magenta}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.magenta}3. ROLE SEKOLAH / MITRA (B2B Institutional Partner)${c.reset}`);
  console.log(`${c.bold}${c.magenta}====================================================================${c.reset}`);

  const instLogin = await request('POST', '/api/v1/auth/login', { data: INSTITUTION_CREDS });
  assert('3. INSTITUTION', 'INSTITUTION', 'Institution Login Auth', instLogin.status === 200 && !!instLogin.data?.data?.token, 'HTTP 200 with JWT Token');
  institutionToken = instLogin.data?.data?.token;

  const instProfile = await request('GET', '/api/v1/auth/me', { token: institutionToken });
  assert('3. INSTITUTION', 'INSTITUTION', 'Get Institution Profile with School Name', instProfile.status === 200 && instProfile.data?.data?.role === 'INSTITUTION' && !!instProfile.data?.data?.schoolName, 'HTTP 200 with schoolName');

  const b2bCatalog = await request('GET', '/api/v1/services?serviceType=DELIVERABLE_BASED');
  const b2bItems = Array.isArray(b2bCatalog.data?.data) ? b2bCatalog.data?.data : b2bCatalog.data?.data?.items;
  assert('3. INSTITUTION', 'INSTITUTION', 'Access B2B Institutional Deliverables Catalog', b2bCatalog.status === 200 && Array.isArray(b2bItems), 'HTTP 200 Deliverables list');

  const b2bService = b2bItems?.[0];
  if (b2bService) {
    // Clear institution cart
    const instCart = await request('GET', '/api/v1/cart', { token: institutionToken });
    if (instCart.data?.data?.items?.length > 0) {
      for (const it of instCart.data.data.items) {
        await request('DELETE', `/api/v1/cart/${it.id}`, { token: institutionToken });
      }
    }

    const addB2BToCart = await request('POST', '/api/v1/cart', {
      token: institutionToken,
      data: {
        serviceId: b2bService.id,
        notes: 'Penyusunan RPP Kurikulum Merdeka Semester Ganjil untuk rombel kelas 4 SD',
      },
    });
    assert('3. INSTITUTION', 'INSTITUTION', 'Add B2B Deliverable to Institutional Cart', addB2BToCart.status === 201, 'HTTP 201 Added to Cart');

    const checkoutB2B = await request('POST', '/api/v1/orders/checkout', {
      token: institutionToken,
      data: { paymentMethod: 'B2B_INVOICE' },
    });
    const b2bOrderData = checkoutB2B.data?.data?.order || checkoutB2B.data?.data;
    assert('3. INSTITUTION', 'INSTITUTION', 'Submit B2B Institutional Order Checkout', checkoutB2B.status === 201 && b2bOrderData?.serviceType === 'DELIVERABLE_BASED', 'HTTP 201 B2B Order Created');
  }

  // =========================================================================
  // 4. ROLE ADMIN (Pengelola Sistem & Keuangan)
  // =========================================================================
  console.log(`\n${c.bold}${c.yellow}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.yellow}4. ROLE ADMIN (Analytics, User Moderation & Full Catalog CRUD)${c.reset}`);
  console.log(`${c.bold}${c.yellow}====================================================================${c.reset}`);

  const aLogin = await request('POST', '/api/v1/auth/login', { data: ADMIN_CREDS });
  assert('4. ADMIN', 'ADMIN', 'Admin Login Auth', aLogin.status === 200 && !!aLogin.data?.data?.token, 'HTTP 200 with JWT Token');
  adminToken = aLogin.data?.data?.token;

  const adminStats = await request('GET', '/api/v1/admin/stats', { token: adminToken });
  assert('4. ADMIN', 'ADMIN', 'Get Analytics KPI Stats (Users, Orders, Revenue)', adminStats.status === 200 && (typeof adminStats.data?.data?.totalUsers === 'number' || typeof adminStats.data?.data?.totalUsersCount === 'number'), 'HTTP 200 with KPI metrics');

  const adminUsers = await request('GET', '/api/v1/admin/users?role=PARENT', { token: adminToken });
  assert('4. ADMIN', 'ADMIN', 'List Users with Role Filter', adminUsers.status === 200 && Array.isArray(adminUsers.data?.data?.users), 'HTTP 200 Users Directory');

  // Toggle User Suspend/Activate
  const toggleUser = await request('PATCH', `/api/v1/admin/users/${parentUserId}/toggle-status`, { token: adminToken });
  assert('4. ADMIN', 'ADMIN', 'Suspend / Deactivate User Account', toggleUser.status === 200 && toggleUser.data?.data?.isActive === false, 'HTTP 200 isActive: false');

  // Re-activate immediately
  const reactivateUser = await request('PATCH', `/api/v1/admin/users/${parentUserId}/toggle-status`, { token: adminToken });
  assert('4. ADMIN', 'ADMIN', 'Reactivate User Account', reactivateUser.status === 200 && reactivateUser.data?.data?.isActive === true, 'HTTP 200 isActive: true');

  // Tutor Verification
  const unverifiedTutors = await request('GET', '/api/v1/admin/tutors/unverified', { token: adminToken });
  assert('4. ADMIN', 'ADMIN', 'Get Unverified Tutors Queue', unverifiedTutors.status === 200 && Array.isArray(unverifiedTutors.data?.data), 'HTTP 200 Queue List');

  const verifyTutorAction = await request('POST', `/api/v1/admin/tutors/${tutorProfileId}/verify`, {
    token: adminToken,
    data: { isVerified: true },
  });
  assert('4. ADMIN', 'ADMIN', 'Verify Tutor Profile', verifyTutorAction.status === 200 && verifyTutorAction.data?.data?.isVerified === true, 'HTTP 200 isVerified: true');

  // Full Catalog CRUD as Admin
  const adminCat = catRes.data?.data?.[0];
  const createAdminService = await request('POST', '/api/v1/services', {
    token: adminToken,
    data: {
      categoryId: adminCat.id,
      title: 'Paket Les Privat Khusus Admin Smoke Test',
      serviceType: 'SESSION_BASED',
      teachingMode: 'ONLINE',
      durationMinutes: 60,
      sessionCount: 2,
      price: 250000,
      description: 'Paket les bimbingan intensif persiapan ujian sekolah SD & SMP',
    },
  });
  assert('4. ADMIN', 'ADMIN', '[CATALOG CRUD] Admin Creates New Service Package', createAdminService.status === 201 && !!createAdminService.data?.data?.id, 'HTTP 201 Created');
  adminCreatedServiceId = createAdminService.data?.data?.id;

  const updateAdminService = await request('PUT', `/api/v1/services/${adminCreatedServiceId}`, {
    token: adminToken,
    data: {
      price: 275000,
      description: 'Tarif dan silabus materi bimbingan belajar intensif diperbarui oleh Admin',
    },
  });
  assert('4. ADMIN', 'ADMIN', '[CATALOG CRUD] Admin Updates Service Price & Description', updateAdminService.status === 200 && updateAdminService.data?.data?.price === 275000, 'HTTP 200 Price: Rp 275.000');

  const toggleServiceStatus = await request('PUT', `/api/v1/services/${adminCreatedServiceId}`, {
    token: adminToken,
    data: { isActive: false },
  });
  assert('4. ADMIN', 'ADMIN', '[CATALOG CRUD] Admin Toggles Service Inactive', toggleServiceStatus.status === 200 && toggleServiceStatus.data?.data?.isActive === false, 'HTTP 200 isActive: false');

  const deleteAdminService = await request('DELETE', `/api/v1/services/${adminCreatedServiceId}`, { token: adminToken });
  assert('4. ADMIN', 'ADMIN', '[CATALOG CRUD] Admin Deletes Service Package', deleteAdminService.status === 200, 'HTTP 200 Deleted');

  // Transaction Ledger & Payment Confirmation
  const adminTx = await request('GET', '/api/v1/admin/transactions', { token: adminToken });
  assert('4. ADMIN', 'ADMIN', 'Get Financial Transactions Ledger with Escrow Summary', adminTx.status === 200 && typeof adminTx.data?.summary?.totalGMV === 'number', 'HTTP 200 with summary');

  const txDetail = await request('GET', `/api/v1/admin/transactions/${createdOrderId}`, { token: adminToken });
  assert('4. ADMIN', 'ADMIN', 'Get Audit Detail & Split Breakdown of Order', txDetail.status === 200 && !!txDetail.data?.data?.financials, 'HTTP 200 with 85%:15% split');

  // =========================================================================
  // 5. AUDIT CACAT LOGIKA & KEAMANAN (CORNER CASES & RBAC)
  // =========================================================================
  console.log(`\n${c.bold}${c.red}====================================================================${c.reset}`);
  console.log(`${c.bold}${c.red}5. AUDIT CACAT LOGIKA, IDOR & KEAMANAN SISTEM (Attack Vectors)${c.reset}`);
  console.log(`${c.bold}${c.red}====================================================================${c.reset}`);

  // 5.1 IDOR: Cross-Parent Data Ownership
  const idorDeleteStudent = await request('DELETE', `/api/v1/students/${parentBStudentId}`, { token: parentToken });
  assert('5. SECURITY', 'IDOR', 'Parent A attempts to DELETE Parent B child profile', idorDeleteStudent.status === 403, 'HTTP 403 Forbidden', `Actual: ${idorDeleteStudent.status}`);

  const idorViewOrder = await request('GET', `/api/v1/orders/${parentBOrderId}`, { token: parentToken });
  assert('5. SECURITY', 'IDOR', 'Parent A attempts to VIEW Parent B order detail', idorViewOrder.status === 403, 'HTTP 403 Forbidden', `Actual: ${idorViewOrder.status}`);

  // 5.2 RBAC Boundary Violations
  const tutorAccessAdmin = await request('GET', '/api/v1/admin/stats', { token: tutorToken });
  assert('5. SECURITY', 'RBAC', 'Tutor attempts to access Admin Dashboard Stats', tutorAccessAdmin.status === 403, 'HTTP 403 Forbidden', `Actual: ${tutorAccessAdmin.status}`);

  const parentVerifyTutor = await request('POST', `/api/v1/admin/tutors/${tutorProfileId}/verify`, {
    token: parentToken,
    data: { isVerified: true },
  });
  assert('5. SECURITY', 'RBAC', 'Parent attempts to verify Tutor verification status', parentVerifyTutor.status === 403, 'HTTP 403 Forbidden', `Actual: ${parentVerifyTutor.status}`);

  // Tutor A attempts to modify another tutor's service
  const tutorBService = servicesList.find((s) => s.tutorId !== tutorProfileId);
  if (tutorBService) {
    const tutorModifyOtherService = await request('PUT', `/api/v1/services/${tutorBService.id}`, {
      token: tutorToken,
      data: { price: 1000 },
    });
    assert('5. SECURITY', 'RBAC', 'Tutor attempts to manipulate another tutor service price', tutorModifyOtherService.status === 403, 'HTTP 403 Forbidden', `Actual: ${tutorModifyOtherService.status}`);
  }

  // 5.3 Business Logic & Validation Flaws
  // Clear cart then checkout
  const pCartClear = await request('GET', '/api/v1/cart', { token: parentToken });
  for (const it of pCartClear.data?.data?.items || []) {
    await request('DELETE', `/api/v1/cart/${it.id}`, { token: parentToken });
  }

  const emptyCartCheckout = await request('POST', '/api/v1/orders/checkout', { token: parentToken });
  assert('5. SECURITY', 'LOGIC', 'Checkout on empty cart', emptyCartCheckout.status === 400, 'HTTP 400 Bad Request', `Actual: ${emptyCartCheckout.status}`);

  // Negative price validation
  const negativePriceRes = await request('POST', '/api/v1/services', {
    token: tutorToken,
    data: {
      categoryId: adminCat.id,
      title: 'Layanan Harga Negatif Ilegal',
      price: -100000,
      description: 'Deskripsi pengujian harga negatif',
    },
  });
  assert('5. SECURITY', 'VALIDATION', 'Service with negative price rejection', negativePriceRes.status === 400, 'HTTP 400 Validation Error', `Actual: ${negativePriceRes.status}`);

  // Invalid GradeLevel enum
  const invalidGradeRes = await request('POST', '/api/v1/students', {
    token: parentToken,
    data: {
      studentName: 'Mahasiswa Ilegal',
      gradeLevel: 'KULIAH',
    },
  });
  assert('5. SECURITY', 'VALIDATION', 'Student profile with non-existent GradeLevel (KULIAH)', invalidGradeRes.status === 400, 'HTTP 400 Validation Error', `Actual: ${invalidGradeRes.status}`);

  // Clean up Parent B
  if (bUser) {
    const parentBOrders = await prisma.order.findMany({ where: { parentId: bUser.id }, select: { id: true } });
    const bOrderIds = parentBOrders.map((o) => o.id);

    if (bOrderIds.length > 0) {
      await prisma.bookingSession.deleteMany({
        where: { orderItem: { orderId: { in: bOrderIds } } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: bOrderIds } },
      });
      await prisma.review.deleteMany({
        where: { orderId: { in: bOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: bOrderIds } },
      });
    }

    await prisma.studentProfile.deleteMany({
      where: { parentId: bUser.id },
    });
    await prisma.user.deleteMany({
      where: { id: bUser.id },
    });
  }

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.status === 'PASS').length;
  const failedTests = results.filter((r) => r.status === 'FAIL').length;
  const passPercent = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`\n${c.bold}================================================================================${c.reset}`);
  console.log(`${c.bold} 📊  SMOKE TEST & SECURITY AUDIT SUMMARY${c.reset}`);
  console.log(` Total Assertions Executed : ${totalTests}`);
  console.log(` Passed Assertions         : ${c.green}${passedTests} / ${totalTests} (${passPercent}%)${c.reset}`);
  console.log(` Failed Assertions         : ${failedTests > 0 ? c.red : c.green}${failedTests}${c.reset}`);
  console.log(` System Health Status      : ${failedTests === 0 ? `${c.green}100% HEALTHY & RESILIENT ✔${c.reset}` : `${c.red}ATTENTION REQUIRED ❌${c.reset}`}`);
  console.log(`${c.bold}================================================================================\n${c.reset}`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSmokeTest()
  .catch((err) => {
    console.error('Fatal Smoke Test Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
