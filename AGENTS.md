# CODING RULES & ARCHITECTURAL GUIDELINES (BELAJAR-KU API)

## 1. General Principles
- **Strict TypeScript:** No `any`. Gunakan proper type definitions, interface, atau inference Zod. Aktifkan `"strict": true` di `tsconfig.json`.
- **Modular Monolith by Domain:** Setiap modul di `src/modules/<domain>` wajib terisolasi rapi menjadi 4 file standar:
  - `*.schema.ts` (Zod schemas untuk request/response & DTO types)
  - `*.routes.ts` (Fastify route definitions & route schemas)
  - `*.controller.ts` (HTTP request handling, parsing, and status responses)
  - `*.service.ts` (Pure business logic & database queries via Prisma)
- **KISS & Pragmatic:** Hindari over-engineering atau layer abstraksi berlebihan (tidak perlu repository pattern berlapis-lapis; manfaatkan langsung Prisma Client di dalam Service layer).

## 2. Database & Data Integrity (PostgreSQL + Prisma)
- **ACID Transactions:** Operasi multi-tabel wajib dibungkus dalam `prisma.$transaction`. Khususnya:
  - Checkout order -> pembuatan order items -> update lock.
  - Payment settlement webhook -> update status order -> auto-generate deretan baris `booking_sessions`.
  - Konfirmasi selesai sesi -> update status sesi -> mutasi saldo dompet guru (`wallet_mutations`).
- **Soft Deletion & Flags:** Jangan gunakan raw delete pada data transaksi dan profil. Gunakan flag `isActive` atau status enum.
- **Timezone Safety:** Simpan semua timestamp dalam format UTC di database. Jam belajar (`startTime`, `endTime`) disimpan dalam format string ISO atau format 24 jam `HH:mm` untuk konsistensi zona waktu lokal (WIB).

## 3. Concurrency & Caching (Redis)
- **Time-Slot Locking Pattern:**
  - Key format: `lock:tutor:<tutorId>:slot:<date>:<time>`
  - Set menggunakan atomic `SET key value NX EX 900` (TTL 15 menit).
  - Jika key sudah ada saat checkout, lemparkan error 409 Conflict ("Jadwal guru sudah dipesan oleh pengguna lain").
- **Release Lock:** Hapus lock hanya setelah pembayaran selesai diverifikasi (berubah jadi sesi permanen di PostgreSQL) atau batalkan jika order kedaluwarsa.

## 4. Input Validation & Error Handling
- **Fail Fast via Zod:** Semua `body`, `querystring`, dan `params` wajib divalidasi menggunakan Zod schema sebelum masuk ke Controller/Service.
- **Consistent API Response Format:**
  - Success: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "message": "...", "errors"?: ... }`
- **Global Error Handler:** Tangani ZodValidationError, PrismaClientKnownRequestError, dan unhandled exception terpusat di `app.ts` tanpa mengekspos internal stack trace ke client.

## 5. Security & Authentication
- **Multi-Role RBAC:** Lindungi rute privat dengan middleware JWT dan cek peran:
  - `PARENT`: Akses profil anak, keranjang, checkout, konfirmasi les.
  - `TUTOR`: Akses pengaturan jasa, ketersediaan jadwal, input jurnal belajar, saldo.
  - `ADMIN`: Verifikasi akun guru, audit transaksi.
- **Password Hashing:** Wajib gunakan `bcrypt` / `argon2` dengan cost factor yang memadai. Jangan pernah menyertakan `passwordHash` pada return object pengguna.
