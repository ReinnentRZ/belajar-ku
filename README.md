# Belajar-Ku API 📚

Production-ready Modular Monolith REST API for **Belajar-Ku**, a private tutoring marketplace platform serving PAUD to SMP levels (Calistung/Baca Tulis PAUD, SD/SMP subjects).

Built with **Fastify**, **Prisma ORM (PostgreSQL)**, **Redis (ioredis)**, and **Strict TypeScript**.

---

## 🛠️ Tech Stack & Key Choices

- **Runtime & Language:** Node.js, TypeScript (`"strict": true`, no `any`)
- **Web Framework:** Fastify v5 (clean, fast, minimal boilerplate)
- **Database & ORM:** PostgreSQL + Prisma ORM
- **Cache & Concurrency:** Redis via `ioredis` (atomic distributed slot locks `SET key value NX EX 900`)
- **Validation:** Zod (Fail-fast validation for `body`, `params`, and `query`)
- **Authentication & RBAC:** `@fastify/jwt` (Bearer token) + `bcrypt` password hashing
- **Error Handling:** Centralized global error handler in `src/app.ts` with standardized response format

---

## 📐 Architecture & Modular Monolith Structure

Every business domain is isolated in `src/modules/<domain>` containing 4 standardized files:
1. `*.schema.ts` — Zod request/response validation schemas & inferred TypeScript types.
2. `*.routes.ts` — Fastify route declarations and authentication/RBAC guards.
3. `*.controller.ts` — HTTP request handling, parameter extraction, and status codes.
4. `*.service.ts` — Pure domain business logic & Prisma database operations.

```
src/
├── app.ts                          # Fastify app builder, plugins & global error handler
├── server.ts                       # Server bootstrap & graceful shutdown handler
├── config/
│   ├── env.ts                      # Zod-validated environment variables
│   ├── database.ts                 # PrismaClient singleton
│   └── redis.ts                    # ioredis client singleton
├── middlewares/
│   ├── auth.middleware.ts          # JWT bearer verification
│   └── role.middleware.ts          # Multi-role RBAC guard (PARENT, TUTOR, ADMIN)
├── types/
│   └── index.ts                    # Global TypeScript interfaces & FastifyJWT augmentations
├── utils/
│   └── errors.ts                   # Domain HTTP error classes
└── modules/
    ├── auth/                       # Register, login, current user (/api/v1/auth)
    ├── users/                      # Student profiles & tutor profiles (/api/v1/users)
    ├── services/                   # Tutor services, slots & catalog search (/api/v1)
    ├── cart/                       # Parent shopping cart (/api/v1/cart)
    ├── orders/                     # Checkout & payment webhook (/api/v1/orders)
    └── sessions/                   # Session completion & tutor payout (/api/v1/sessions)
```

---

## 🔒 Concurrency & ACID Integrity Patterns

1. **Distributed Slot Locking (Redis):**
   - Key format: `lock:tutor:<tutorId>:slot:<date>:<time>`
   - Checkout acquires atomic lock with `SET key value NX EX 900` (TTL 15 minutes).
   - If any slot is occupied, previously acquired locks in the batch are rolled back and `409 Conflict` is returned.
   - Locks are released when payment is verified (converted to permanent database records) or if an order is cancelled/expired.

2. **ACID Transactions (`prisma.$transaction`):**
   - **Checkout:** Order creation + snapshotting order items + cart clearing.
   - **Payment Webhook:** Status update to `PAID` + auto-generating series of `BookingSession` records.
   - **Session Completion:** Status update to `COMPLETED` + learning report submission + creating `WalletMutation` + atomically incrementing tutor's `walletBalance`.

---

## 🐳 Docker Quickstart (Recommended)

Run the entire full-stack platform (Fastify API, Next.js Frontend, PostgreSQL 16, and Redis 7) with a single command:

```bash
docker compose up -d --build
```

The containerized setup automatically:
1. Starts PostgreSQL and Redis with health checks.
2. Waits until both databases are ready and healthy.
3. Synchronizes Prisma schema (`prisma db push` / `prisma migrate deploy`).
4. Seeds default PAUD to SMP categories (`npm run prisma:seed`).
5. Boots Fastify API with hot-reload at `http://localhost:5000` (`http://localhost:5000/health`).
6. Boots Next.js Web App with hot-reload at `http://localhost:3000`.

To run in detached background mode:
```bash
docker compose up -d
```

To stop all containers and tear down resources:
```bash
docker compose down
```

### 🎯 Akun Demo Siap Pakai (Presentation-Ready)

| Role | Email | Password | Deskripsi Data Demo |
|---|---|---|---|
| **Orang Tua (`PARENT`)** | `parent.demo@belajarku.com` | `password123` | Memiliki 2 anak (**Kenzi** - PAUD, **Aisyah** - SMP) & 1 order lunas (`PAID`) dengan riwayat 1 sesi selesai & 3 sesi mendatang. |
| **Guru PAUD (`TUTOR`)** | `tutor.paud@belajarku.com` | `password123` | **Kak Sarah, S.Pd** (PGPAUD UNJ, Terverifikasi, Saldo Rp 87.500 dari 1 sesi selesai, Layanan Les Calistung PAUD). |
| **Guru SMP (`TUTOR`)** | `tutor.smp@belajarku.com` | `password123` | **Kak Dimas, S.Si** (Matematika UI, Terverifikasi, Layanan Les Matematika & Logika SMP Online). |

---

## 💻 Local Manual Setup
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and adjust credentials if needed:
```bash
cp .env.example .env
```

### 3. Database Migration & Seeding
```bash
# Generate Prisma Client
npm run prisma:generate

# Run Database Migrations
npm run prisma:migrate

# Seed Categories (PAUD Calistung to SMP Subjects)
npm run prisma:seed
```

### 4. Start the Application
```bash
# Development mode with hot-reloading
npm run dev

# Production build and start
npm run build
npm start
```

---

## 📡 API Endpoints Reference

### 1. Authentication (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register as `PARENT` or `TUTOR` |
| `POST` | `/api/v1/auth/login` | Public | Login and receive JWT Bearer token |
| `GET` | `/api/v1/auth/me` | Authenticated | Retrieve authenticated user profile |

### 2. Users & Profiles (`/api/v1/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/users/students` | `PARENT` | Add student profile (PAUD / TK / SD / SMP) |
| `GET` | `/api/v1/users/students` | `PARENT` | List children/students |
| `PUT` | `/api/v1/users/students/:id` | `PARENT` | Update student profile |
| `DELETE`| `/api/v1/users/students/:id` | `PARENT` | Remove student profile |
| `GET` | `/api/v1/users/tutor/me` | `TUTOR` | Get tutor profile & credentials |
| `PUT` | `/api/v1/users/tutor/me` | `TUTOR` | Update tutor bio, education, address |
| `PATCH` | `/api/v1/users/tutors/:tutorId/verify` | `ADMIN` | Verify tutor credentials |

### 3. Services & Availabilities (`/api/v1`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/services` | Public | Catalog search with pagination & filters |
| `GET` | `/api/v1/services/:id` | Public | Service details with tutor & schedule |
| `GET` | `/api/v1/categories` | Public | List subject categories |
| `POST` | `/api/v1/categories` | `ADMIN` | Create subject category |
| `POST` | `/api/v1/services` | `TUTOR` | Create tutoring service |
| `GET` | `/api/v1/services/mine` | `TUTOR` | List my tutoring services |
| `PUT` | `/api/v1/services/:id` | `TUTOR` | Update or soft-delete service |
| `POST` | `/api/v1/services/availability` | `TUTOR` | Add available day & time slot |
| `GET` | `/api/v1/services/availability` | `TUTOR` | List my availability slots |
| `DELETE`| `/api/v1/services/availability/:id`| `TUTOR` | Soft-delete availability slot |

### 4. Cart (`/api/v1/cart`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/cart` | `PARENT` | Add service + student + selected slots |
| `GET` | `/api/v1/cart` | `PARENT` | View cart items and subtotal |
| `DELETE`| `/api/v1/cart/:id` | `PARENT` | Remove item from cart |

### 5. Orders (`/api/v1/orders`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/orders/checkout` | `PARENT` | Atomic checkout with Redis slot lock (TTL 15m) |
| `GET` | `/api/v1/orders/mine` | `PARENT` | List my orders |
| `GET` | `/api/v1/orders/:id` | Authenticated | Order details |
| `POST` | `/api/v1/orders/:id/cancel` | `PARENT` | Cancel order & release Redis locks |
| `POST` | `/api/v1/orders/webhook/payment` | Public | Mock payment settlement (auto-generates sessions) |

### 6. Booking Sessions & Escrow Payouts (`/api/v1/sessions`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/sessions/:id/complete` | `TUTOR` | Submit learning report & trigger wallet credit |
| `GET` | `/api/v1/sessions/tutor` | `TUTOR` | View my scheduled/completed teaching sessions |
| `GET` | `/api/v1/sessions/parent` | `PARENT` | View children's learning sessions & reports |
| `GET` | `/api/v1/sessions/:id` | Authenticated | Session details with report & wallet mutation |

---

## 🧪 Automated End-to-End (E2E) Test Suite

Run the automated integration test script against the running server (`http://localhost:5000` or custom `API_URL`):

```bash
npm run test:e2e
```

The script runs sequentially through the 6 end-to-end scenarios:
1. **Health & Seed Verification:** Verifies server health and checks default subject categories (`calistung-paud`, etc.).
2. **User & Profile Lifecycle:** Registers and authenticates Tutor & Parent, configures availability slots, creates tutoring service, and creates student profile.
3. **Shopping Cart:** Adds 4-session package to parent cart with specific date/time slots and verifies subtotal.
4. **Concurrency & Redis Distributed Slot Lock:** Checks out Parent 1 order, acquires atomic Redis locks (`lock:tutor:<tutorId>:slot:<date>:<time>`), and verifies that a second parent attempting to checkout the exact same slot receives an immediate `409 Conflict`.
5. **Payment Settlement Webhook:** Triggers webhook with `SETTLEMENT`, transitions order to `PAID`, verifies atomic generation of 4 `BookingSession` records in PostgreSQL, and verifies Redis lock release.
6. **Session Completion & Escrow Payout:** Tutor completes Session 1, submits detailed learning report, and verifies atomic escrow release to the tutor's wallet balance alongside a `WalletMutation` record.

---

## 🌐 Next.js Modern Web Application (`/frontend`)

The Next.js 14 App Router web client connects to the Fastify API and offers:
- **Centralized API Client:** Axios instance with JWT Bearer token injection from localStorage and 401 handling.
- **Dynamic Navbar & Auth:** User badge (`PARENT` / `TUTOR`), real-time cart counter badge, and responsive navigation.
- **Marketplace & Filters:** Filter by Grade Level (`PAUD` Calistung, `TK`, `SD`, `SMP`), teaching mode (Online / Offline), and search query.
- **Interactive Service Detail:** Select tutor availability slots (exact session count validation), choose child profile, and add to cart.
- **Cart & Checkout:** Real-time summary, Redis slot locking checkout, and instant "Simulasi Bayar" mock payment trigger.
- **Parent Portal (`/parent/dashboard`):** Manage children/students, view upcoming sessions, and read tutor learning reports.
- **Tutor Portal (`/tutor/dashboard`):** Weekly availability manager, teaching schedule, "Selesaikan Sesi" modal with learning report input, and escrow wallet balance.

### Running the Web Application
```bash
# 1. Install frontend dependencies
npm run frontend:install

# 2. Run frontend development server on port 3000
npm run frontend:dev
```
Access the application at `http://localhost:3000`.

