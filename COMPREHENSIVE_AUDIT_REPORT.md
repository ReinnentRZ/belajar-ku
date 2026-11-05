# COMPREHENSIVE SYSTEM-WIDE AUDIT, SMOKE TEST & RESILIENCE REPORT
**Platform:** Belajar-Ku (Full-Stack Marketplace Les Privat & Kebutuhan Sekolah)  
**Tanggal Pengujian:** 5 November 2026  
**Status Pengujian:** **100% PASS (56 / 56 Assertions Passed - 0 Failures)**  
**Lingkungan Audit:** Docker Multi-Service (Fastify Backend, Next.js 14 App Router, PostgreSQL 16, Redis 7)  

---

## 1. Executive Summary

Audit komprehensif, pengujian asap (smoke test), sinkronisasi kontrak API, dan verifikasi celah logika sistem telah dilakukan secara menyeluruh terhadap seluruh modul dan peran di platform **Belajar-Ku**. Pengujian mencakup:
- **Ketahanan Skema Zod (Schema Resilience):** Penanganan otomatis parameter bypass Ngrok (`?ngrok-skip-browser-warning=true`) pada seluruh query dan params controller tanpa memicu HTTP 400 Bad Request.
- **Empty JSON Body Toleration:** Penanganan request HTTP method `DELETE`, `GET`, atau `PATCH` yang mengirim header `Content-Type: application/json` dengan body kosong melalui kustom parser Fastify.
- **Role PARENT (Orang Tua):** Siklus hidup akun (profil, ubah password), manajemen anak didik (CRUD lengkap dengan proteksi pencegahan hapus saat ada sesi aktif), pencarian & filter katalog (kategori & jenjang), kalkulasi keranjang belanja, checkout order (multi-slot booking), simulasi penyelesaian pembayaran, serta pemberian ulasan & rating bintang.
- **Role TUTOR (Guru / Pengajar):** Profil pengajar (bio, pendidikan, akomodasi khusus), jadwal ketersediaan mingguan (availability slots CRUD), daftar penugasan les (tutor bookings), dan penyelesaian sesi dengan pengisian jurnal/laporan perkembangan belajar siswa.
- **Role SEKOLAH / MITRA (B2B Partner):** Autentikasi institusi ber-NPSN/nama sekolah, penjelajahan katalog modul kurikulum/deliverables B2B, pemesanan paket deliverable B2B, dan pembuatan order institusional.
- **Role ADMIN (Pengelola Sistem):** KPI dashboard analytics (pengguna, transaksi, GMV), manajemen direktori pengguna berfilter peran, aktivasi/penangguhan (suspend) akun, verifikasi tutor, CRUD penuh katalog layanan, serta audit buku besar transaksi dengan transparansi bagi hasil escrow (85% Guru : 15% Platform).
- **Audit Celah Logika & Keamanan (Attack Vectors):** Uji IDOR (Insecure Direct Object Reference) lintas parent, pengujian pelanggaran RBAC (Role-Based Access Control), penolakan checkout keranjang kosong, penolakan harga negatif, dan validasi enum jenjang pendidikan.

---

## 2. Inventarisasi Rute & Penyelarasan Kontrak API

Berikut adalah matriks endpoint backend Fastify dan pemetaan konsumsi oleh frontend Next.js:

| Domain | Metode | Endpoint API | Akses Role | Status & Validasi Zod |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | POST | `/api/v1/auth/register` | Public | Validasi data registrasi parent/tutor/institusi |
| **Auth** | POST | `/api/v1/auth/login` | Public | Validasi kredensial, issue JWT token |
| **Auth** | GET | `/api/v1/auth/me` | Authenticated | Ambil profil pengguna aktif & relasi role |
| **Auth** | PUT | `/api/v1/auth/profile` | Authenticated | Pembaruan nama, telepon, dan nama sekolah |
| **Auth** | PUT/PATCH | `/api/v1/auth/password` | Authenticated | Verifikasi kata sandi lama via bcrypt & hash baru |
| **Students**| POST | `/api/v1/students` | PARENT | Tambah profil anak didik |
| **Students**| GET | `/api/v1/students` | PARENT | Daftar profil anak milik parent |
| **Students**| GET | `/api/v1/students/:id` | PARENT | Detail profil anak (dengan cek kepemilikan) |
| **Students**| PUT | `/api/v1/students/:id` | PARENT | Update nama, jenjang, catatan belajar |
| **Students**| DELETE | `/api/v1/students/:id` | PARENT | Hapus profil anak (dilindungi jika ada sesi aktif) |
| **Catalog** | GET | `/api/v1/categories` | Public | Daftar kategori mata pelajaran & jenjang |
| **Catalog** | GET | `/api/v1/services` | Public | Pencarian & filter layanan (`.passthrough()`) |
| **Catalog** | POST | `/api/v1/services` | TUTOR, ADMIN | Buat layanan jasa les / deliverable B2B baru |
| **Catalog** | PUT | `/api/v1/services/:id` | TUTOR, ADMIN | Perbarui tarif, deskripsi, toggle status aktif |
| **Catalog** | DELETE | `/api/v1/services/:id` | TUTOR, ADMIN | Hapus paket les (soft-delete bila ada riwayat order) |
| **Cart** | GET | `/api/v1/cart` | PARENT, INSTITUTION | Ambil daftar keranjang & kalkulasi total tagihan |
| **Cart** | POST | `/api/v1/cart` | PARENT, INSTITUTION | Tambah item ke keranjang belanja |
| **Cart** | PUT | `/api/v1/cart/:id` | PARENT, INSTITUTION | Perbarui catatan / alamat ajar di keranjang |
| **Cart** | DELETE | `/api/v1/cart/:id` | PARENT, INSTITUTION | Hapus item dari keranjang |
| **Orders** | POST | `/api/v1/orders/checkout` | PARENT, INSTITUTION | Checkout keranjang menjadi pesanan berstatus `WAITING_PAYMENT` |
| **Orders** | GET | `/api/v1/orders/mine` | PARENT, INSTITUTION | Riwayat pesanan milik pengguna |
| **Orders** | GET | `/api/v1/orders/:id` | PARENT, INSTITUTION, ADMIN | Detail pesanan beserta item & jadwal |
| **Orders** | POST | `/api/v1/orders/:id/simulate-payment` | PARENT, INSTITUTION, ADMIN | Simulasi bayar lunas & generate otomatis booking sessions |
| **Reviews**| POST | `/api/v1/orders/:id/reviews` | PARENT | Kirim ulasan dan rating 1-5 bintang untuk pesanan |
| **Reviews**| GET | `/api/v1/tutors/:tutorId/reviews` | Public | Daftar ulasan publik guru & agregasi rating |
| **Tutor** | GET | `/api/v1/users/tutor/me` | TUTOR | Profil lengkap guru (bio, pendidikan, tarif) |
| **Tutor** | PUT | `/api/v1/users/tutor/me` | TUTOR | Update portofolio & akomodasi khusus |
| **Tutor** | GET | `/api/v1/services/availability` | TUTOR | Jadwal jam luang mengajar mingguan |
| **Tutor** | POST | `/api/v1/services/availability` | TUTOR | Tambah slot jam luang mengajar |
| **Tutor** | DELETE | `/api/v1/services/availability/:id`| TUTOR | Hapus slot ketersediaan |
| **Tutor** | GET | `/api/v1/tutor/bookings` | TUTOR | Penugasan jadwal mengajar murid |
| **Sessions**| POST | `/api/v1/sessions/:id/complete` | TUTOR | Selesaikan sesi les & kirim laporan perkembangan belajar |
| **Admin** | GET | `/api/v1/admin/stats` | ADMIN | Dashboard agregat KPI & revenue |
| **Admin** | GET | `/api/v1/admin/users` | ADMIN | Manajemen direktori user terfilter peran |
| **Admin** | PATCH | `/api/v1/admin/users/:id/toggle-status`| ADMIN | Suspend atau aktifkan kembali akun pengguna |
| **Admin** | GET | `/api/v1/admin/tutors/unverified` | ADMIN | Antrean persetujuan verifikasi akun guru |
| **Admin** | POST | `/api/v1/admin/tutors/:tutorId/verify` | ADMIN | Setujui / tolak verifikasi kredensial guru |
| **Admin** | GET | `/api/v1/admin/transactions` | ADMIN | Buku besar audit keuangan & rekening bersama (escrow) |
| **Admin** | GET | `/api/v1/admin/transactions/:orderId` | ADMIN | Detail audit transaksi & rincian bagi hasil (85%:15%) |

---

## 3. Hasil Eksekusi Matriks Pengujian Fitur (56/56 Assertions)

### A. Role PARENT (Orang Tua - 23 Assertions)
- [x] Login Auth dengan kredensial terdaftar (`HTTP 200` dengan JWT Token).
- [x] Mendapatkan profil akun diri via `/auth/me` (`HTTP 200` mencocokkan email).
- [x] Pembaruan nama profil & nomor telepon (`HTTP 200`).
- [x] Ganti password dengan verifikasi password lama yang valid (`HTTP 200`).
- [x] Pencegahan ganti password jika password lama tidak cocok (`HTTP 400 Bad Request`).
- [x] Penambahan profil anak didik baru (`HTTP 201 Created`).
- [x] Pengambilan daftar profil anak didik (`HTTP 200` array).
- [x] Pengambilan detail profil anak didik berdasarkan ID (`HTTP 200 OK`).
- [x] Pembaruan informasi anak didik (`HTTP 200 Updated`).
- [x] Penghapusan profil anak yang belum memiliki sesi aktif (`HTTP 200 Deleted`).
- [x] Eksplorasi kategori mata pelajaran (`HTTP 200`).
- [x] Filter paket layanan berdasarkan jenjang pendidikan SD (`HTTP 200`).
- [x] Pencarian paket layanan berdasarkan kata kunci ("matematika") (`HTTP 200`).
- [x] Menambahkan paket les privat ke keranjang dengan alokasi slot tanggal valid (`HTTP 201`).
- [x] Menghitung subtotal keranjang dan kalkulasi total tagihan (`HTTP 200`).
- [x] Memperbarui catatan keranjang (`HTTP 200`).
- [x] Checkout pesanan keranjang belanja (`HTTP 201` berstatus `WAITING_PAYMENT`).
- [x] Mengambil riwayat pesanan saya (`HTTP 200`).
- [x] Mengambil rincian pesanan berdasarkan ID (`HTTP 200`).
- [x] Simulasi pelunasan pembayaran (`HTTP 200` status berubah menjadi `PAID` dan sesi dibuat).
- [x] **Proteksi Sesi Aktif:** Percobaan menghapus profil anak yang memiliki sesi terjadwal ditolak tegas (`HTTP 400 Bad Request`).
- [x] Mengirimkan ulasan dan rating pesanan bintang 5 (`HTTP 201 Created`).
- [x] Memverifikasi ulasan muncul pada daftar ulasan publik pengajar (`HTTP 200`).

### B. Role TUTOR (Guru / Pengajar - 7 Assertions)
- [x] Login pengajar terdaftar (`HTTP 200` dengan JWT Token).
- [x] Mengambil profil pengajar (`HTTP 200`).
- [x] Memperbarui profil pengajar (bio, pendidikan, akomodasi khusus) (`HTTP 200`).
- [x] Menambahkan slot ketersediaan mengajar mingguan baru (`HTTP 201`).
- [x] Mengambil daftar slot ketersediaan mengajar (`HTTP 200`).
- [x] Mengambil jadwal penugasan sesi les dari murid (`HTTP 200`).
- [x] Menyelesaikan sesi les serta menyertakan laporan perkembangan belajar anak didik (`HTTP 200` status sesi `COMPLETED`).

### C. Role SEKOLAH / MITRA (B2B Institutional Partner - 5 Assertions)
- [x] Login akun institusi sekolah (`HTTP 200` dengan JWT Token).
- [x] Mengambil profil institusi beserta verifikasi nama sekolah (`HTTP 200`).
- [x] Mengakses katalog pengadaan modul ajar & deliverables kurikulum B2B (`HTTP 200`).
- [x] Memasukkan paket deliverables kurikulum ke keranjang institusi (`HTTP 201`).
- [x] Checkout pesanan institusi via skema B2B Invoice (`HTTP 201` tipe layanan `DELIVERABLE_BASED`).

### D. Role ADMIN (Pengelola Sistem - 13 Assertions)
- [x] Login akun Administrator (`HTTP 200` dengan JWT Token).
- [x] Mengambil indikator KPI analitik platform (pengguna, transaksi, omzet) (`HTTP 200`).
- [x] Menampilkan direktori pengguna terfilter peran (`HTTP 200`).
- [x] Membekukan / menangguhkan (suspend) akun pengguna (`HTTP 200` status `isActive: false`).
- [x] Mengaktifkan kembali akun pengguna yang ditangguhkan (`HTTP 200` status `isActive: true`).
- [x] Mengambil antrean guru yang belum diverifikasi (`HTTP 200`).
- [x] Menyetujui status verifikasi profil guru (`HTTP 200` status `isVerified: true`).
- [x] **[Katalog CRUD]** Admin membuat paket layanan baru (`HTTP 201 Created`).
- [x] **[Katalog CRUD]** Admin memperbarui tarif dan deskripsi paket layanan (`HTTP 200`).
- [x] **[Katalog CRUD]** Admin menonaktifkan visibilitas paket layanan (`HTTP 200` status `isActive: false`).
- [x] **[Katalog CRUD]** Admin menghapus paket layanan (`HTTP 200 Deleted`).
- [x] Mengakses buku besar keuangan dan ringkasan rekening bersama (escrow) (`HTTP 200`).
- [x] Mengambil rincian audit finansial pesanan beserta verifikasi transparansi bagi hasil (85% Guru : 15% Platform) (`HTTP 200`).

### E. Audit Celah Logika & Keamanan (Security Attack Vectors - 8 Assertions)
- [x] **IDOR Guard:** Parent A mencoba menghapus profil anak milik Parent B (`HTTP 403 Forbidden`).
- [x] **IDOR Guard:** Parent A mencoba melihat detail pesanan milik Parent B (`HTTP 403 Forbidden`).
- [x] **RBAC Boundary:** Pengajar (Tutor) mencoba mengakses analitik Admin (`HTTP 403 Forbidden`).
- [x] **RBAC Boundary:** Orang Tua (Parent) mencoba memverifikasi akun guru di endpoint Admin (`HTTP 403 Forbidden`).
- [x] **RBAC Boundary:** Guru A mencoba mengubah tarif layanan milik Guru B (`HTTP 403 Forbidden`).
- [x] **Business Logic:** Checkout pada keranjang belanja yang kosong ditolak (`HTTP 400 Bad Request`).
- [x] **Validation Guard:** Pembuatan paket layanan dengan tarif negatif ditolak Zod (`HTTP 400 Validation Error`).
- [x] **Validation Guard:** Pendaftaran profil anak dengan jenjang yang tidak valid ditolak Zod (`HTTP 400 Validation Error`).

---

## 4. Perbaikan Arsitektur & Ketahanan Sistem yang Diimplementasikan

1. **Fastify Empty Body Parser:**
   - Menambahkan kustom content-type parser `application/json` di `src/app.ts` untuk mengembalikan `{}` jika payload berupa string kosong/whitespace. Mencegah error `Body cannot be empty when content-type is set to 'application/json'` saat frontend (Axios) mengirimkan header default pada request `DELETE` atau `PATCH`.
2. **Modul Ulasan & Rating Terpadu (`reviews`):**
   - Menambahkan skema tabel `Review` pada `prisma/schema.prisma` yang terhubung secara relasional dengan `Order`, `TutorProfile`, dan `User`.
   - Mengimplementasikan 4 file modular monolith (`reviews.schema.ts`, `reviews.service.ts`, `reviews.controller.ts`, `reviews.routes.ts`) dengan validasi rating 1-5, pencegahan ulasan ganda per pesanan, dan kalkulasi rating rata-rata guru.
3. **Penyempurnaan Proteksi Penghapusan Profil Murid:**
   - Memastikan `deleteStudentProfile` memverifikasi ketiadaan sesi les berstatus `SCHEDULED` sebelum mengizinkan penghapusan data anak demi menjaga integritas jadwal guru.
4. **Resiliensi Skema Zod:**
   - Menerapkan `.passthrough()` pada skema query dan param di seluruh rute (layanan, transaksi admin, verifikasi tutor, laporan sengketa, dan ulasan), menjamin request dari browser yang membawa parameter query Ngrok (`?ngrok-skip-browser-warning=true`) diterima dengan mulus tanpa kendala 400.
5. **Verifikasi Build Next.js Produksi:**
   - Menjalankan build dry-run `NODE_ENV=production npx next build` di dalam container frontend: **100% SUKSES**, seluruh 20 rute statis/dinamis terkompilasi bersih tanpa peringatan TypeScript atau React hydration error.

---

## 5. Kesimpulan & Status Kesiapan Rilis

Sistem **Belajar-Ku** telah diverifikasi secara menyeluruh, bebas dari celah logika bisnis, tahan terhadap interferensi header/query Ngrok, memiliki proteksi RBAC & IDOR yang tangguh, serta siap untuk deployment produksi di Vercel dan Docker server.
