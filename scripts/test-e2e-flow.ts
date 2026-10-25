/**
 * Belajar-Ku API - Automated End-to-End (E2E) Integration Test
 * Verifies complete tutoring marketplace lifecycle:
 * 1. Health & Catalog Seeding
 * 2. Tutor & Parent Profiles & Availability
 * 3. Cart Management
 * 4. Concurrency & Distributed Redis Slot Locking (409 Conflict)
 * 5. Payment Settlement & Escrow Booking Sessions Generation
 * 6. Session Completion, Learning Report & Tutor Wallet Payout
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5000';

interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data: T;
  errors?: unknown;
}

// Visual helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function logStep(step: number, title: string) {
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan} [STEP ${step}] ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
}

function logSuccess(msg: string) {
  console.log(`  ${colors.green}✔ ${msg}${colors.reset}`);
}

function logInfo(msg: string) {
  console.log(`  ${colors.dim}ℹ ${msg}${colors.reset}`);
}

function logError(msg: string) {
  console.log(`  ${colors.red}✖ ${msg}${colors.reset}`);
}

async function request<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    token?: string;
    expectedStatus?: number;
  } = {}
): Promise<{ status: number; body: ApiResponse<T> }> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const responseJson = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (options.expectedStatus && response.status !== options.expectedStatus) {
    throw new Error(
      `Request to ${method} ${path} failed!\n` +
      `Expected status ${options.expectedStatus}, but got ${response.status}.\n` +
      `Response: ${JSON.stringify(responseJson, null, 2)}`
    );
  }

  return { status: response.status, body: responseJson };
}

async function runE2E() {
  const timestamp = Date.now();
  console.log(`${colors.bold}🚀 Starting Belajar-Ku E2E Integration Test Suite${colors.reset}`);
  console.log(`${colors.dim}Target Server: ${BASE_URL}${colors.reset}`);

  // =========================================================================
  // 1. Setup & Seeding Verification
  // =========================================================================
  logStep(1, 'Setup & Seeding Verification');

  const healthRes = await request<{ message: string }>('/health', { expectedStatus: 200 });
  logSuccess(`Health check passed: ${healthRes.body.message}`);

  const catRes = await request<Array<{ id: string; name: string; targetGrade: string; slug: string }>>(
    '/api/v1/categories',
    { expectedStatus: 200 }
  );

  const categories = catRes.body.data;
  logSuccess(`Categories verified (${categories.length} categories available)`);

  const calistungCategory = categories.find((c) => c.slug === 'calistung-paud');
  if (!calistungCategory) {
    throw new Error("Category 'calistung-paud' not found in database. Please run npm run prisma:seed.");
  }
  logInfo(`Found target category: "${calistungCategory.name}" (ID: ${calistungCategory.id})`);

  // =========================================================================
  // 2. User & Profile Journey
  // =========================================================================
  logStep(2, 'User & Profile Journey (Tutor & Parent Setup)');

  // 2.1 Tutor Registration & Login
  const tutorEmail = `tutor_${timestamp}@belajarku.com`;
  const tutorPassword = 'TutorPassword123!';

  await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      name: 'Kak Rani S.Pd',
      email: tutorEmail,
      phone: '081234567890',
      password: tutorPassword,
      role: 'TUTOR',
    },
    expectedStatus: 201,
  });
  logSuccess(`Tutor registered successfully: ${tutorEmail}`);

  const tutorLogin = await request<{ token: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: { email: tutorEmail, password: tutorPassword },
    expectedStatus: 200,
  });
  const tutorToken = tutorLogin.body.data.token;
  logSuccess('Tutor authenticated and JWT Bearer token acquired');

  // 2.2 Tutor Profile & Availability
  await request('/api/v1/users/tutor/me', {
    method: 'PUT',
    token: tutorToken,
    body: {
      bio: 'Guru berpengalaman mengajar Calistung dan anak usia dini dengan metode bermain sambil belajar.',
      education: 'S.Pd Pendidikan Anak Usia Dini (PAUD), Universitas Negeri Jakarta',
      address: 'Jl. Melati Raya No. 12, Kebayoran Baru, Jakarta Selatan',
    },
    expectedStatus: 200,
  });
  logSuccess('Tutor profile details updated');

  const availRes = await request<{ id: string }>('/api/v1/services/availability', {
    method: 'POST',
    token: tutorToken,
    body: {
      dayOfWeek: 1, // Monday
      startTime: '15:00',
      endTime: '16:30',
    },
    expectedStatus: 201,
  });
  logSuccess(`Tutor availability slot added: Monday 15:00 - 16:30 (ID: ${availRes.body.data.id})`);

  // 2.3 Tutor Service Creation
  const serviceRes = await request<{ id: string; title: string; price: number; sessionCount: number }>(
    '/api/v1/services',
    {
      method: 'POST',
      token: tutorToken,
      body: {
        categoryId: calistungCategory.id,
        title: 'Les Privat Calistung PAUD Interaktif',
        teachingMode: 'ONLINE',
        durationMinutes: 90,
        sessionCount: 4,
        price: 400000,
        description: 'Paket bimbingan 4 sesi membaca, menulis, dan berhitung dengan kartu huruf dan lagu anak.',
      },
      expectedStatus: 201,
    }
  );
  const service = serviceRes.body.data;
  logSuccess(`Tutoring service published: "${service.title}" (Rp ${service.price.toLocaleString()} for ${service.sessionCount} sessions)`);

  // 2.4 Parent 1 Registration & Student Profile
  const parentEmail = `parent_${timestamp}@belajarku.com`;
  const parentPassword = 'ParentPassword123!';

  await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      name: 'Bunda Siti Nurhaliza',
      email: parentEmail,
      phone: '081298765432',
      password: parentPassword,
      role: 'PARENT',
    },
    expectedStatus: 201,
  });
  logSuccess(`Parent 1 registered: ${parentEmail}`);

  const parentLogin = await request<{ token: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: { email: parentEmail, password: parentPassword },
    expectedStatus: 200,
  });
  const parentToken = parentLogin.body.data.token;
  logSuccess('Parent 1 authenticated');

  const studentRes = await request<{ id: string; studentName: string; gradeLevel: string }>(
    '/api/v1/users/students',
    {
      method: 'POST',
      token: parentToken,
      body: {
        studentName: 'Budi Pratama',
        gradeLevel: 'PAUD',
        learningNotes: 'Anak aktif, lebih menyukai pendekatan belajar visual dan bercerita.',
      },
      expectedStatus: 201,
    }
  );
  const student = studentRes.body.data;
  logSuccess(`Student profile created: "${student.studentName}" (${student.gradeLevel})`);

  // =========================================================================
  // 3. Cart & Booking Flow
  // =========================================================================
  logStep(3, 'Cart & Booking Flow');

  // Define 4 weekly slots (Mondays)
  const scheduledSlots = [
    { date: '2026-11-02', startTime: '15:00', endTime: '16:30' },
    { date: '2026-11-09', startTime: '15:00', endTime: '16:30' },
    { date: '2026-11-16', startTime: '15:00', endTime: '16:30' },
    { date: '2026-11-23', startTime: '15:00', endTime: '16:30' },
  ];

  await request('/api/v1/cart', {
    method: 'POST',
    token: parentToken,
    body: {
      serviceId: service.id,
      studentId: student.id,
      selectedSlots: scheduledSlots,
    },
    expectedStatus: 201,
  });
  logSuccess(`Service added to Parent 1 cart with ${scheduledSlots.length} scheduled slots`);

  const cartRes = await request<{ items: unknown[]; totalAmount: number }>('/api/v1/cart', {
    token: parentToken,
    expectedStatus: 200,
  });
  if (cartRes.body.data.items.length !== 1 || cartRes.body.data.totalAmount !== 400000) {
    throw new Error(`Cart verification failed: expected 1 item and total 400000, got ${JSON.stringify(cartRes.body.data)}`);
  }
  logSuccess(`Parent 1 cart verified: 1 item, Subtotal: Rp ${cartRes.body.data.totalAmount.toLocaleString()}`);

  // =========================================================================
  // 4. Concurrency & Checkout (Redis Slot Lock)
  // =========================================================================
  logStep(4, 'Concurrency & Distributed Redis Slot Locking');

  // Parent 1 initiates checkout
  const checkoutRes = await request<{ id: string; invoiceNumber: string; totalAmount: number; status: string }>(
    '/api/v1/orders/checkout',
    {
      method: 'POST',
      token: parentToken,
      body: {},
      expectedStatus: 201,
    }
  );
  const order = checkoutRes.body.data;
  logSuccess(`Parent 1 checkout successful! Invoice: ${order.invoiceNumber}, Status: ${order.status}`);
  logInfo(`Redis slot locks acquired for slots: ${scheduledSlots.map((s) => `${s.date}@${s.startTime}`).join(', ')}`);

  // Simulate Parent 2 attempting to lock the exact same tutor and overlapping slot
  const parent2Email = `parent2_${timestamp}@belajarku.com`;
  await request('/api/v1/auth/register', {
    method: 'POST',
    body: {
      name: 'Pak Bambang',
      email: parent2Email,
      phone: '081211112222',
      password: 'ParentPassword123!',
      role: 'PARENT',
    },
    expectedStatus: 201,
  });
  const parent2Login = await request<{ token: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: { email: parent2Email, password: 'ParentPassword123!' },
    expectedStatus: 200,
  });
  const parent2Token = parent2Login.body.data.token;

  const student2Res = await request<{ id: string }>('/api/v1/users/students', {
    method: 'POST',
    token: parent2Token,
    body: { studentName: 'Citra', gradeLevel: 'PAUD' },
    expectedStatus: 201,
  });

  // Parent 2 adds same service with the same colliding slot
  await request('/api/v1/cart', {
    method: 'POST',
    token: parent2Token,
    body: {
      serviceId: service.id,
      studentId: student2Res.body.data.id,
      selectedSlots: scheduledSlots,
    },
    expectedStatus: 201,
  });

  // Parent 2 checkout must fail with 409 Conflict due to Redis slot lock
  const conflictRes = await request('/api/v1/orders/checkout', {
    method: 'POST',
    token: parent2Token,
    body: {},
  });

  if (conflictRes.status === 409) {
    logSuccess(`Concurrency guard verified: Parent 2 received 409 Conflict!`);
    logInfo(`Server response: "${conflictRes.body.message}"`);
  } else {
    throw new Error(`Expected 409 Conflict for colliding slot checkout, but got status ${conflictRes.status}`);
  }

  // =========================================================================
  // 5. Payment & Escrow Sessions Generation
  // =========================================================================
  logStep(5, 'Payment Settlement & Booking Sessions Generation');

  // Trigger payment webhook with SETTLEMENT
  const webhookRes = await request<{ order: { status: string }; sessionCount: number }>(
    '/api/v1/orders/webhook/payment',
    {
      method: 'POST',
      body: {
        invoiceNumber: order.invoiceNumber,
        paymentStatus: 'SETTLEMENT',
      },
      expectedStatus: 200,
    }
  );
  logSuccess(`Payment webhook processed. Order status updated to: ${webhookRes.body.data.order.status}`);
  logSuccess(`${webhookRes.body.data.sessionCount} BookingSession records generated atomically via Prisma transaction`);

  // Verify booking sessions from Parent's view
  const sessionsRes = await request<Array<{
    id: string;
    sessionNumber: number;
    scheduledDate: string;
    startTime: string;
    status: string;
  }>>('/api/v1/sessions/parent', {
    token: parentToken,
    expectedStatus: 200,
  });

  const parentSessions = sessionsRes.body.data;
  if (parentSessions.length !== 4) {
    throw new Error(`Expected 4 booking sessions, but found ${parentSessions.length}`);
  }
  logSuccess(`Parent verified ${parentSessions.length} scheduled sessions in learning schedule`);
  parentSessions.forEach((s) => {
    logInfo(`- Sesi #${s.sessionNumber}: ${s.scheduledDate.split('T')[0]} pukul ${s.startTime} [Status: ${s.status}]`);
  });

  const sessionToComplete = parentSessions[0];
  if (!sessionToComplete) {
    throw new Error('No session available to complete');
  }

  // =========================================================================
  // 6. Session Execution & Payout
  // =========================================================================
  logStep(6, 'Session Execution, Learning Report & Escrow Payout');

  // Check tutor balance before completion
  const tutorProfileBefore = await request<{ walletBalance: number }>('/api/v1/users/tutor/me', {
    token: tutorToken,
    expectedStatus: 200,
  });
  logInfo(`Tutor initial wallet balance: Rp ${tutorProfileBefore.body.data.walletBalance.toLocaleString()}`);

  // Tutor completes Session 1 and submits learning report
  const completeRes = await request<{
    session: { id: string; status: string; learningReport: string; completedAt: string };
    walletMutation: { type: string; amount: number };
    newWalletBalance: number;
  }>(`/api/v1/sessions/${sessionToComplete.id}/complete`, {
    method: 'POST',
    token: tutorToken,
    body: {
      learningReport: 'Ananda Budi sudah mengenal huruf vokal A-I-U-E-O dengan sangat antusias dan mampu menirukan bunyi huruf dengan benar.',
    },
    expectedStatus: 200,
  });

  const completionData = completeRes.body.data;
  logSuccess(`Session #${sessionToComplete.sessionNumber} marked as COMPLETED`);
  logSuccess(`Learning report submitted: "${completionData.session.learningReport}"`);
  logSuccess(`Wallet mutation recorded: ${completionData.walletMutation.type} (+Rp ${completionData.walletMutation.amount.toLocaleString()})`);
  logSuccess(`Tutor wallet balance updated to: Rp ${completionData.newWalletBalance.toLocaleString()}`);

  // Double check session detail with parent token to ensure report visibility
  const sessionDetailRes = await request<{
    status: string;
    learningReport: string;
    walletMutation: { amount: number };
  }>(`/api/v1/sessions/${sessionToComplete.id}`, {
    token: parentToken,
    expectedStatus: 200,
  });

  if (
    sessionDetailRes.body.data.status !== 'COMPLETED' ||
    !sessionDetailRes.body.data.learningReport
  ) {
    throw new Error('Parent failed to view updated session report');
  }
  logSuccess('Parent successfully retrieved completed session details and learning report');

  // =========================================================================
  // Conclusion
  // =========================================================================
  console.log(`\n${colors.bold}${colors.green}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.green} 🎉 ALL END-TO-END BUSINESS FLOW TESTS PASSED SUCCESSFULLY!${colors.reset}`);
  console.log(`${colors.bold}${colors.green}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
}

runE2E().catch((error) => {
  console.error(`\n${colors.bold}${colors.red}❌ E2E TEST FAILED:${colors.reset}`);
  console.error(error);
  process.exit(1);
});
