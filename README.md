# Belajar-Ku 📚

> **Marketplace Jasa Guru Les Privat Berbasis Time-Slot Inventory & Escrow Bertahap**  
> Memberdayakan guru sekolah aktif & honorer (PAUD s/d SMP, Ngaji BTQ, Difabel/ABK, hingga Modul Kurikulum Merdeka) dengan sistem inventori jadwal anti-bentrok berbasis Redis dan pencairan dana aman per sesi.

---

## ⚡ 3-Step Quick Start (Zero-Config Docker)

Evaluator atau developer dapat menjalankan seluruh platform (Fastify API, Next.js Frontend, PostgreSQL 16, dan Redis 7) secara otomatis tanpa konfigurasi manual:

### 1. Clone Repository
```bash
git clone <repository-url>
cd belajar-ku
```

### 2. Jalankan Docker Compose
```bash
docker compose up -d --build
```
> **Proses Otomatis di Dalam Kontainer:**  
> - Health check PostgreSQL 16 dan Redis 7 hingga siap menerima koneksi.  
> - Auto-sinkronisasi schema database via Prisma (`prisma db push`).  
> - Auto-seeding data master kategori kurikulum dan seluruh akun demo (`prisma/seed.ts`).  
> - Fastify Backend API aktif di `http://localhost:5000` dengan hot-reload.  
> - Next.js 14 Frontend aktif di `http://localhost:3000` dengan hot-reload.

### 3. Akses Platform di Browser
- **Frontend Web Portal:** [http://localhost:3000](http://localhost:3000)
- **Backend API & Health:** [http://localhost:5000/health](http://localhost:5000/health) atau [http://localhost:5000](http://localhost:5000)

Untuk menghentikan seluruh layanan:
```bash
docker compose down
```

---

## 🎯 Akun Demo Siap Pakai (Presentation & Audit Ready)

Semua akun demo di bawah ini telah disiapkan secara otomatis pada saat inisialisasi basis data dengan kata sandi yang seragam:

> **Kata Sandi Default Semua Akun:** `password123`

| Peran (Role) | Email | Nama Pengguna / Profil | Fitur & Data yang Tersedia |
|---|---|---|---|
| **ADMIN** | `admin.demo@belajarku.com` | Administrator Belajar-Ku | Audit transaksi escrow, verifikasi berkas/ijazah guru baru, penanganan laporan kendala/dispute. |
| **PARENT** | `parent.demo@belajarku.com` | Bpk. Hendra Gunawan | Memiliki 2 anak (**Kenzi** - PAUD & **Aisyah** - SMP), 1 order lunas (`PAID`), riwayat 1 sesi selesai & 3 sesi mendatang. |
| **TUTOR (PAUD)** | `tutor.paud@belajarku.com` | Kak Sarah, S.Pd (PGPAUD UNJ) | Layanan Les Calistung PAUD, jadwal aktif, saldo dompet Rp 87.500 dari 1 sesi yang telah selesai diajar. |
| **TUTOR (SMP)** | `tutor.smp@belajarku.com` | Kak Dimas, S.Si (Matematika UI) | Layanan Les Matematika & Logika SMP Online, jadwal mingguan aktif, siap dipesan. |
| **TUTOR (Unverified)** | `tutor.unverified@belajarku.com` | Bu Ratna, S.Pd (Fisika UNPAD) | Akun guru baru dengan status `isVerified: false`, menunggu verifikasi berkas oleh Admin di portal admin. |
| **TUTOR (BTQ / Ngaji)**| `ustadzah.maryam@belajarku.com` | Ustadzah Maryam, S.Pd.I | Layanan Baca Tulis Al-Qur'an (BTQ) & Metode Iqro Anak Usia Dini. |
| **TUTOR (Tahsin)** | `ustadz.ahmad@belajarku.com` | Ustadz Ahmad Fauzi, Lc | Layanan Kelas Tajwid, Makhraj Huruf & Tahsin Al-Qur'an SD/SMP. |
| **TUTOR (Inklusif)** | `tutor.difabel@belajarku.com` | Kak Nadia, S.Psi | Kelas Khusus Anak Berkebutuhan Khusus (ABK/ADHD) & Kelas Isyarat Inklusif. |
| **TUTOR (B2B Guru)** | `tutor.admin@belajarku.com` | Pak Joko Supriyanto, M.Pd | Layanan Konsultasi & Pembuatan Modul Ajar Kurikulum Merdeka (B2B Guru & Sekolah). |
| **INSTITUTION** | `kepsek.sdn01@belajarku.com` | SDN Menteng 01 Pagi | Akun Institusi Sekolah untuk audit dan pemesanan layanan administrasi guru. |

---

## 🧪 Automated System Audit Runner (71/71 Test Matrix)

Repository ini dilengkapi dengan script audit otomatis komprehensif (`scripts/audit-full-system.ts`) yang memverifikasi 100% alur logika bisnis, *distributed concurrency lock*, pemisahan dana escrow, mutasi dompet guru, dan alur eskalasi sengketa:

```bash
# Jalankan audit langsung di dalam kontainer Docker:
docker compose exec api npm run audit:full
```
*(Atau jika menggunakan environment lokal: `npm run audit:full`)*

### Matriks Pengujian yang Diverifikasi:
1. **Multi-Role Authentication & RBAC Isolation:** Validasi registrasi 4 peran (Parent, Tutor, Admin, Institution), token JWT, dan proteksi rute admin (403 Forbidden untuk Parent).
2. **Multi-Child Profiles & Tutor Onboarding:** Penambahan profil anak PAUD & SMP, pembaruan profil guru, dan penambahan slot ketersediaan mingguan.
3. **Marketplace Catalog & Shopping Cart:** Filter kategori, ketersediaan slot guru, dan penambahan paket belajar ke keranjang.
4. **Concurrency & Redis Distributed Slot Lock:** Uji tabrakan serentak (Race Condition) pada slot waktu yang sama. Parent 1 berhasil mengunci (`lock:tutor:<id>:slot:<date>:<time> NX EX 900`), sedangkan Parent 2 ditolak seketika dengan `409 Conflict`.
5. **Atomic Checkout & Webhook Payment Settlement:** Transaksi ACID Prisma untuk pembuatan Order, snapshot harga, simulasi webhook pembayaran, rilis lock Redis, dan auto-generasi entitas `BookingSession`.
6. **Per-Session Completion, Escrow Split & Wallet Mutation:** Input laporan belajar oleh guru, konfirmasi orang tua, pembagian dana (87.5% hak guru, 12.5% platform fee) tercatat pada `WalletMutation` & `PlatformRevenueLedger`.
7. **Dispute Resolution & Audit Trail:** Pembuatan laporan kendala oleh orang tua, mediasi oleh admin, audit log saldo, dan ringkasan metrik analitik.

---

## 🛠️ Tech Stack & Key Architectural Choices

- **Language & Runtime:** TypeScript (`"strict": true`, no `any`), Node.js 20 LTS
- **Backend API:** Fastify v5 (arsitektur Modular Monolith dengan *fail-fast validation* Zod)
- **Frontend App:** Next.js 14 (App Router, Tailwind CSS, Lucide Icons, TanStack Query)
- **Database & ORM:** PostgreSQL 16 + Prisma ORM (ACID Transactions via `prisma.$transaction`)
- **Distributed Lock & Cache:** Redis 7 via `ioredis` (Atomic Key `SET NX EX 900`)
- **Security & RBAC:** Multi-Role RBAC (`PARENT`, `TUTOR`, `ADMIN`, `INSTITUTION`), `@fastify/jwt`, `bcrypt` password hashing
- **Containerization:** Docker & Docker Compose multi-stage builds dengan anonymous volume isolation

---

## 📐 Arsitektur Modular Monolith Backend

Setiap domain bisnis di backend diisolasi secara mandiri dalam `src/modules/<domain>` yang terdiri atas 4 file standar:
1. `*.schema.ts` — Zod request/response validation schemas & TypeScript types.
2. `*.routes.ts` — Fastify route definitions & RBAC permission guards.
3. `*.controller.ts` — HTTP request handling, parameter extraction, and status codes.
4. `*.service.ts` — Pure business logic & Prisma database transactions.

```
src/
├── app.ts                          # Fastify app builder, plugins & global error handler
├── server.ts                       # Server bootstrap & graceful shutdown handler
├── config/                         # Environment variables, Prisma client, ioredis client
├── middlewares/                    # JWT Bearer auth & Role-Based Access Control (RBAC)
└── modules/
    ├── auth/                       # Registrasi, login, token refresh (/api/v1/auth)
    ├── users/                      # Profil anak & verifikasi profil guru (/api/v1/users)
    ├── services/                   # Katalog les, slot ketersediaan guru (/api/v1/services)
    ├── cart/                       # Keranjang belanja orang tua (/api/v1/cart)
    ├── orders/                     # Checkout, lock slot Redis, webhook bayar (/api/v1/orders)
    ├── sessions/                   # Sesi belajar, jurnal guru & pencairan escrow (/api/v1/sessions)
    ├── reports/                    # Pengaduan sengketa sesi & mediasi admin (/api/v1/reports)
    └── admin/                      # Statistik platform, verifikasi guru & audit (/api/v1/admin)
```

---

## 📖 Dokumentasi Teknis Lengkap

Dokumentasi arsitektur mendalam tersedia di direktori `docs/`:
- [docs/DATABASE_SCHEMA.md](file:///home/rei/reinn/projects/belajar-ku/docs/DATABASE_SCHEMA.md) — Diagram Hubungan Entitas (ERD) lengkap dalam sintaks Mermaid.js beserta spesifikasi kolom & relasi tabel.
- [docs/SYSTEM_FLOWCHART.md](file:///home/rei/reinn/projects/belajar-ku/docs/SYSTEM_FLOWCHART.md) — Diagram alir sistem end-to-end (User Journey, Concurrency Locking TD Flowchart, Escrow Payout Sequence Diagram, dan Dispute Resolution Flow).

---

## 💻 Panduan Instalasi Lokal (Tanpa Docker)

Bila ingin menjalankan aplikasi di lingkungan host lokal secara langsung:

### 1. Prasyarat Sistem
- Node.js >= 20.x & npm
- PostgreSQL 16 aktif di localhost (default port 5432)
- Redis 7 aktif di localhost (default port 6379)

### 2. Konfigurasi Environment
```bash
# Salin konfigurasi backend
cp .env.example .env

# Salin konfigurasi frontend
cp frontend/.env.example frontend/.env.local
```

### 3. Instalasi Dependensi & Database Setup
```bash
# Instalasi dependensi backend
npm install

# Generate Prisma Client & Push Schema
npx prisma generate
npx prisma db push

# Eksekusi Database Seeding
npm run prisma:seed

# Instalasi dependensi frontend
cd frontend && npm install && cd ..
```

### 4. Menjalankan Aplikasi
Buka 2 terminal terpisah:

**Terminal 1 (Backend API):**
```bash
npm run dev
# API aktif di http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Frontend aktif di http://localhost:3000
```

---

## 📡 Ringkasan Endpoint REST API

| Modul | Method | Endpoint | Akses | Keterangan |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | Public | Registrasi akun baru (`PARENT`, `TUTOR`, `INSTITUTION`) |
| | `POST` | `/api/v1/auth/login` | Public | Otentikasi dan penerbitan token JWT Bearer |
| | `GET` | `/api/v1/auth/me` | Authenticated | Informasi profil pengguna yang sedang login |
| **Users** | `POST` | `/api/v1/users/students` | `PARENT` | Menambahkan profil anak (PAUD, TK, SD, SMP) |
| | `GET` | `/api/v1/users/students` | `PARENT` | Mendapatkan daftar profil anak milik orang tua |
| | `PUT` | `/api/v1/users/tutor/me` | `TUTOR` | Mengubah bio, pendidikan, dan pengalaman guru |
| | `PATCH` | `/api/v1/users/tutors/:id/verify` | `ADMIN` | Verifikasi ijazah dan status aktif guru |
| **Katalog** | `GET` | `/api/v1/services` | Public | Pencarian katalog les dengan filter jenjang & mode |
| | `GET` | `/api/v1/services/:id` | Public | Detail layanan guru beserta ulasan dan ketersediaan |
| | `POST` | `/api/v1/services` | `TUTOR` | Membuat paket les privat baru |
| | `POST` | `/api/v1/services/availability` | `TUTOR` | Menambahkan slot waktu mengajar mingguan |
| **Cart** | `POST` | `/api/v1/cart` | `PARENT` | Tambah paket les & pemilihan jadwal ke keranjang |
| | `GET` | `/api/v1/cart` | `PARENT` | Melihat isi keranjang dan kalkulasi harga |
| **Orders** | `POST` | `/api/v1/orders/checkout` | `PARENT` | Checkout atomik + Redis slot lock (TTL 15 menit) |
| | `POST` | `/api/v1/orders/webhook/payment` | Public | Webhook pembayaran (konversi ke `BookingSession`) |
| **Sessions** | `POST` | `/api/v1/sessions/:id/complete`| `TUTOR` | Input jurnal belajar + auto-pencairan saldo escrow |
| | `GET` | `/api/v1/sessions/parent` | `PARENT` | Riwayat sesi belajar anak & laporan guru |
| | `GET` | `/api/v1/sessions/tutor` | `TUTOR` | Jadwal mengajar guru & status per sesi |
| **Reports** | `POST` | `/api/v1/reports` | `PARENT` | Mengajukan komplain / sengketa sesi les |
| | `PATCH` | `/api/v1/reports/:id/resolve` | `ADMIN` | Mediasi sengketa & eksekusi pengembalian dana |
| **Admin** | `GET` | `/api/v1/admin/stats` | `ADMIN` | Ringkasan GMV, platform revenue, dan metrik sistem |

---

## 📄 Lisensi & Kontribusi

Dikembangkan untuk ekosistem pendidikan anak Indonesia oleh tim **Belajar-Ku**.  
Dilindungi di bawah lisensi MIT.
