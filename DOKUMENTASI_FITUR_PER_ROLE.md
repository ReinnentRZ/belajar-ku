# DOKUMENTASI LENGKAP FITUR, WORKFLOW & RBAC PER ROLE
## Platform Belajar-Ku (B2C Les Privat & B2B Administrasi Guru)

Dokumen ini disusun sebagai inventaris teknis menyeluruh (*system feature inventory*) untuk keperluan presentasi, demonstrasi produk, panduan arsitektur, dan checklist *User Acceptance Testing* (UAT) platform **Belajar-Ku**.

---

## 1. GUEST (Pengunjung Publik / Belum Login)

Pengunjung umum yang mengakses platform tanpa sesi autentikasi (*unauthenticated session*).

### A. Akun Demo & Akses Login
- **Akses:** Bebas tanpa kredensial.
- **Halaman Masuk:** `/` (Beranda), `/login`, `/register`.
- **Redirect Setelah Login:**
  - `PARENT` $\rightarrow$ `/parent/dashboard`
  - `TUTOR` $\rightarrow$ `/tutor/dashboard`
  - `INSTITUTION` $\rightarrow$ `/institution/dashboard`
  - `ADMIN` $\rightarrow$ `/admin/dashboard`

### B. Menu Navigasi & Daftar Halaman UI
| URL Path | Nama Halaman | Fungsi & Kemampuan Halaman |
| :--- | :--- | :--- |
| `/` | Beranda Publik | Menampilkan hero banner, pengenalan platform, ringkasan keunggulan escrow, cuplikan paket les privat terpopuler, dan panduan alur kerja platform. |
| `/services` | Katalog Les Privat | Menampilkan daftar seluruh jasa bimbingan belajar privat siswa (`SESSION_BASED`). Dilengkapi filter jenjang (PAUD, TK, SD, SMP), mode belajar (Tatap Muka / Daring), dan pencarian kata kunci. |
| `/services/[id]` | Detail Layanan Les | Menampilkan rincian silabus materi, profil guru pengajar, lencana verifikasi keahlian, tarif per paket, dan pratinjau ketersediaan slot hari mengajar guru. |
| `/modules` | Katalog Modul & Dokumen Sekolah | Katalog B2B publik untuk instansi pendidikan. Menampilkan paket dokumen Kurikulum Merdeka, modul ajar, dan pendampingan LPJ Dana BOS. |
| `/modules/[id]` | Detail Modul & Dokumen | Rute pembuka detail dokumen kurikulum yang secara otomatis meneruskan tamu publik ke tampilan spesifikasi pemesanan `/services/[id]`. |
| `/login` | Masuk Akun | Form autentikasi email & password dengan validasi ketat Zod. Dilengkapi tombol jalan pintas *One-Click Demo Login* untuk 4 peran (Parent, Tutor, Sekolah, Admin). |
| `/register` | Registrasi Akun Baru | Pendaftaran mandiri dengan pemilihan 3 peran: Orang Tua Murid (`PARENT`), Guru Pengajar (`TUTOR`), atau Instansi Sekolah (`INSTITUTION`). |

### C. Daftar Fitur Utama & Alur Kerja (End-to-End Capabilities)
1. **Eksplorasi Katalog Ganda (B2C & B2B):**
   - Tamu publik dapat melihat katalog bimbingan belajar anak maupun katalog berkas administrasi sekolah secara terbuka.
   - Dapat memanfaatkan filter pencarian teks, kategori mata pelajaran, jenjang kelas, dan moda pembelajaran (Online vs Kunjungan Rumah / Offline).
2. **Pengecekan Kredensial & Kualifikasi Guru:**
   - Tamu dapat membaca profil edukasi, pengalaman mengajar, fasilitas akomodasi khusus (seperti alat peraga sensori ABK atau modul fonik), serta status verifikasi administrasi guru.
3. **Penyortiran Jadwal Sesi Mengajar:**
   - Melihat slot ketersediaan mingguan guru untuk memperkirakan kecocokan waktu luang anak sebelum mendaftar.
4. **Alur Registrasi Multi-Peran Terintegrasi:**
   - Registrasi tervalidasi: format nomor telepon Indonesia (diawali `08` / `+62`, 10–13 digit), email unik, dan password minimal 8 karakter.
   - Pendaftar sekolah otomatis mengisi nama instansi (`schoolName`), yang langsung membuka akses fitur B2B.

### D. Integrasi Endpoint API Terkait
- `GET /api/v1/services` – Mengambil daftar paket jasa les privat dan modul.
- `GET /api/v1/services/:id` – Mengambil detail spesifikasi jasa dan profil guru.
- `GET /api/v1/categories` – Mengambil daftar kategori mata pelajaran & administrasi.
- `POST /api/v1/register` – Mendaftarkan akun baru (`PARENT`, `TUTOR`, `INSTITUTION`).
- `POST /api/v1/login` – Melakukan login dan menerbitkan JWT token.

### E. Proteksi RBAC & Pembatasan Akses (Security Guards)
- ❌ **Terkunci dari Transaksi:** Tombol checkout atau aksi penambahan ke keranjang (`/cart`) akan menolak tamu dan mengarahkan mereka ke `/login`.
- ❌ **Terkunci dari Seluruh Dashboard Privat:** Mengakses `/parent/*`, `/tutor/*`, `/institution/*`, atau `/admin/*` tanpa token akan langsung di-*redirect* ke `/login`.

---

## 2. PARENT (Orang Tua / Pembeli Layanan B2C)

Orang tua yang mendaftarkan anak untuk les privat terpadu dengan perlindungan rekening bersama (*escrow*).

### A. Akun Demo & Akses Login
- **Email:** `parent.demo@belajarku.com`
- **Password:** `password123`
- **Nama Profil Demo:** Bunda Dian Pratama
- **Data Profil Anak:** Kenzi Pratama (PAUD) & Aisyah Putri (SMP)
- **Redirect Path:** `/parent/dashboard`

### B. Menu Navigasi & Daftar Halaman UI
| URL Path | Nama Halaman | Fungsi & Kemampuan Halaman |
| :--- | :--- | :--- |
| `/` | Beranda | Halaman utama dengan navbar yang telah dipersonalisasi khusus orang tua murid. |
| `/services` | Katalog Les Privat | Katalog khusus bimbingan belajar anak (otomatis mengisolasi dan menyembunyikan produk B2B modul sekolah). |
| `/services/[id]` | Detail & Jadwal Sesi | Pemilihan profil anak, kalender pemilihan tanggal sesi belajar yang terkunci pada hari mengajar guru, dan tombol 1-klik Tambah ke Keranjang. |
| `/cart` | Keranjang Pesanan | Daftar paket les yang dipilih, rincian biaya, tombol pemesanan bergaransi *Redis Distributed Lock*, dan simulasi pembayaran lunas. |
| `/parent/dashboard` | Dashboard Orang Tua | Pengelolaan profil multi-anak, pemantauan jadwal sesi les mendatang, akses membaca jurnal belajar guru, dan pengajuan sengketa/kendala les. |
| `/parent/orders/[id]` | Invoice & Detail Sesi | Rincian lengkap invoice pemesanan, alamat mengajar, status escrow pembayaran, dan baris detail tiap sesi pertemuan. |

### C. Daftar Fitur Utama & Alur Kerja (End-to-End Capabilities)
1. **Manajemen Profil Multi-Anak (*Multi-Child Profile*):**
   - Orang tua dapat mendaftarkan lebih dari satu profil anak dengan nama, jenjang (PAUD, TK, SD, SMP), dan catatan kebutuhan belajar khusus (contoh: anak aktif, butuh visual, atau persiapan ujian).
   - Profil anak dapat ditambahkan, diperbarui, atau dihapus secara mandiri di dashboard.
2. **Pemilihan Jadwal Presisi Berdasarkan Hari Ketersediaan Guru (*Schedule Date-Matching Guard*):**
   - Saat memilih paket les (contoh: 4 sesi), sistem memeriksa slot ketersediaan mingguan guru (contoh: hanya hari Senin).
   - Pemilihan tanggal di kalender dibatasi hanya pada hari yang dibuka guru. Jika orang tua mencoba memasukkan hari yang tidak cocok, UI dan backend langsung memblokir aksi dengan pesan informatif: *"Jadwal sesi pada tanggal [Tanggal] tidak sesuai dengan hari mengajar guru"*.
3. **Keranjang Belanja 1-Klik (*One-Click Cart Synchronization*):**
   - Sistem sinkronisasi state instan memastikan item langsung tersimpan di keranjang tanpa perlu menekan tombol dua kali.
   - Menampilkan slot jadwal terpilih, nama anak, dan ringkasan harga paket.
4. **Checkout Terproteksi Concurrency Lock (Redis):**
   - Pada saat checkout, sistem mengunci slot guru menggunakan Redis atomic lock dengan TTL 15 menit (`lock:tutor:<id>:slot:<date>:<time>`).
   - Mencegah orang tua lain memesan jam dan tanggal yang sama secara bersamaan (menolak tabrakan jadwal dengan HTTP 409 `SLOT_LOCKED`).
5. **Pembayaran Aman & Pembentukan Sesi Otomatis:**
   - Setelah pembayaran lunas (didukung simulasi instan untuk demo), pesanan beralih ke `PAID` dan deretan baris `booking_sessions` terbit di database dengan status `SCHEDULED`.
   - 100% dana orang tua aman tersimpan di rekening bersama (*escrow* platform).
6. **Pemantauan Sesi & Jurnal Belajar Guru:**
   - Orang tua memantau tanggal dan jam belajar les di dashboard.
   - Setelah guru mengajar dan menginput jurnal refleksi pembelajaran, orang tua dapat langsung membaca catatan perkembangan anak.
7. **Pengajuan Kendala Sesi & Pembekuan Escrow (*Dispute Filing*):**
   - Jika guru tidak hadir (*TUTOR_NO_SHOW*), datang terlambat, atau tidak profesional, orang tua dapat menekan tombol **"Laporkan Kendala Sesi"**.
   - Sesi seketika beralih status menjadi `DISPUTED`, escrow dana untuk sesi tersebut otomatis dibekukan, dan laporan diteruskan ke meja pengawas Administrator.

### D. Integrasi Endpoint API Terkait
- `POST /api/v1/students` – Menambahkan profil anak.
- `GET /api/v1/students` – Mengambil daftar profil anak milik orang tua.
- `DELETE /api/v1/students/:id` – Menghapus profil anak.
- `POST /api/v1/cart` – Memasukkan paket les ke keranjang beserta jadwal & siswa.
- `GET /api/v1/cart` – Mengambil isi keranjang belanja orang tua.
- `DELETE /api/v1/cart/:id` – Menghapus item dari keranjang.
- `POST /api/v1/orders/checkout` – Mengonversi keranjang menjadi pesanan & mengunci slot Redis.
- `GET /api/v1/orders/mine` – Mengambil riwayat invoice pesanan orang tua.
- `GET /api/v1/orders/:id` – Mengambil rincian pesanan dan baris sesi les.
- `POST /api/v1/orders/:id/simulate-payment` – Simulasi pelunasan invoice (Demo).
- `GET /api/v1/sessions/parent` – Mengambil seluruh jadwal sesi belajar anak.
- `POST /api/v1/sessions/:id/report` – Mengajukan komplain sengketa sesi les.

### E. Proteksi RBAC & Pembatasan Akses (Security Guards)
- 🔒 **Isolasi Mutlak dari Katalog B2B Modul:**
  - Navigasi "Modul & Dokumen Sekolah" disembunyikan sepenuhnya dari Navbar, Mobile Drawer, dan Footer.
  - Jika mengakses langsung URL `/modules` atau `/modules/:id`, sistem secara senyap (*silent redirect*) mengembalikan orang tua ke `/services`.
  - Pencarian katalog otomatis menyaring `serviceType=SESSION_BASED`.
- ❌ **Dilarang Mengakses Portal Suplai & Admin:**
  - Mengakses `/tutor/*`, `/institution/*`, atau `/admin/*` otomatis dialihkan ke `/parent/dashboard` atau diblokir dengan `HTTP 403 Forbidden`.

---

## 3. TUTOR (Guru / Penyedia Layanan Les & Modul)

Guru pengajar les privat sekaligus konsultan penyusun dokumen kurikulum dan modul ajar.

### A. Akun Demo & Akses Login
- **Demo Akun Tersedia:**
  1. `tutor.paud@belajarku.com` (Kak Sarah, S.Pd – Spesialis PAUD & Calistung)
  2. `tutor.smp@belajarku.com` (Kak Dimas, S.Si – Spesialis Matematika SMP)
  3. `tutor.admin@belajarku.com` (Kak Farhan, M.Pd – Konsultan Kurikulum & LPJ BOS)
  4. `ustadzah.maryam@belajarku.com` (Ustadzah Maryam, S.Pd.I – BTQ & Iqro Anak)
  5. `ustadz.ahmad@belajarku.com` (Ustadz Ahmad Al-Hafidz – Tahfidz Juz 30)
  6. `tutor.difabel@belajarku.com` (Kak Nadia Putri, S.Pd – Inklusif & Anak Berkebutuhan Khusus)
  7. `tutor.unverified@belajarku.com` (Kak Rian Hidayat – Akun Demo Belum Terverifikasi)
- **Password Semua Akun:** `password123`
- **Redirect Path:** `/tutor/dashboard`

### B. Menu Navigasi & Daftar Halaman UI
| URL Path | Nama Halaman | Fungsi & Kemampuan Halaman |
| :--- | :--- | :--- |
| `/` | Beranda | Tampilan publik dengan navbar khusus sisi penyedia (*supply-side menu*). |
| `/tutor/dashboard` | Dashboard Guru | Metrik saldo dompet, jumlah sesi terselesaikan, pesanan modul masuk, lencana verifikasi, dan pintasan aksi cepat. |
| `/tutor/services` | Kelola Layanan | Katalog layanan pribadi guru dengan tombol on/off status publikasi layanan (*publish toggle*). |
| `/tutor/services/new` | Terbitkan Layanan Baru | Form perancangan jasa bimbingan les privat maupun jasa pembuatan dokumen administrasi kurikulum. |
| `/tutor/bookings` | Pesanan & Jadwal Masuk | Antarmuka eksekusi tugas: konfirmasi sesi les tatap muka/online serta unggah berkas kurikulum sekolah. |
| `/tutor/wallet` | Dompet & Penghasilan | Buku besar mutasi saldo guru, kalkulasi transparan bagi hasil 85%, potongan 15% platform fee, dan ringkasan dana cair. |
| `/tutor/profile` | Profil Mengajar & Slot | Pengaturan biodata mengajar, kualifikasi ijazah, sarana akomodasi khusus, dan pembuatan slot jadwal hari/jam mengajar. |

### C. Daftar Fitur Utama & Alur Kerja (End-to-End Capabilities)
1. **Penerbitan Layanan Fleksibel (Sesi Belajar vs Dokumen Jadi):**
   - **Tipe Sesi (`SESSION_BASED`):** Menentukan jenjang murid (PAUD/TK/SD/SMP), jumlah sesi (misal 4 atau 8 sesi), tarif paket, durasi waktu per sesi, dan metode pembelajaran (Online atau Kunjungan Tatap Muka).
   - **Tipe Dokumen (`DELIVERABLE_BASED`):** Menentukan tarif jasa pembuatan berkas kurikulum, estimasi waktu pengerjaan (hari), batas maksimal revisi (misal 2x), dan format berkas yang didukung (DOCX, PDF, XLSX, ZIP).
2. **Manajemen Slot Ketersediaan Mingguan (*Weekly Availability*):**
   - Guru mengatur jadwal hari mengajar (Senin s/d Minggu) beserta jam mulai dan jam selesai (contoh: Senin 15:30 - 16:30).
   - Slot ini menjadi basis penguncian jadwal otomatis saat orang tua murid memilih tanggal les di kalender.
3. **Eksekusi Sesi Belajar & Pengisian Jurnal (*Learning Report*):**
   - Guru melihat jadwal mengajar yang telah dipesan orang tua di menu Pesanan Masuk.
   - Setelah mengajar, guru menekan tombol **"Selesaikan Sesi & Tulis Jurnal"** dengan menginput catatan perkembangan belajar anak (misal: penguasaan materi, PR yang diberikan).
   - Saat sesi diselesaikan, sistem secara otomatis mengeksekusi bagi hasil: 85% honor sesi langsung dikreditkan ke saldo dompet guru (`CREDIT_FROM_SESSION`) dan 15% dialokasikan ke platform fee.
4. **Alur Pengerjaan Dokumen Sekolah & Siklus Revisi (B2B Deliverables):**
   - Jika menerima pesanan dokumen dari instansi sekolah, guru melihat catatan kebutuhan dokumen yang diminta sekolah.
   - Guru mengunggah berkas dokumen modul jadi (`.pdf`, `.docx`, `.xlsx`) melalui upload form aman.
   - Status order beralih menjadi `DELIVERED`. Jika sekolah mengajukan catatan revisi, guru dapat membaca instruksi revisi dan mengunggah berkas perbaikan (hingga batas maksimal kuota revisi tercapai).
5. **Transparansi Dompet & Riwayat Payout:**
   - Guru dapat memeriksa mutasi dompet secara transparan di `/tutor/wallet`, melihat nomor invoice pemesanan, nilai kotor (*gross*), potongan platform (15%), dan nilai bersih yang diterima (85%).

### D. Integrasi Endpoint API Terkait
- `GET /api/v1/tutor/me` – Mengambil data profil dan saldo dompet guru.
- `PUT /api/v1/tutor/me` – Memperbarui biodata, latar belakang pendidikan, dan akomodasi mengajar.
- `GET /api/v1/services/mine` – Mengambil daftar layanan yang diterbitkan guru.
- `POST /api/v1/tutor/services` – Membuat paket layanan les atau dokumen baru.
- `PUT /api/v1/services/:id` – Memperbarui atau menonaktifkan status layanan.
- `GET /api/v1/services/availability` – Mengambil jadwal ketersediaan guru.
- `POST /api/v1/services/availability` – Menambahkan slot ketersediaan mengajar baru.
- `DELETE /api/v1/services/availability/:id` – Menghapus slot ketersediaan mengajar.
- `GET /api/v1/tutor/bookings` – Mengambil daftar pesanan les dan dokumen masuk.
- `POST /api/v1/sessions/:id/complete` – Menyelesaikan sesi mengajar dan mengunggah jurnal belajar.
- `POST /api/v1/orders/:id/upload-deliverable` – Mengunggah berkas deliverable dokumen modul ke server.

### E. Proteksi RBAC & Pembatasan Akses (Security Guards)
- ❌ **Dilarang Memesan Layanan Sendiri (*No Self-Booking*):**
  - Akun bertipe `TUTOR` diblokir dari melakukan checkout di keranjang belanja (`/orders/checkout` mengembalikan `HTTP 403 Forbidden`).
  - Halaman keranjang belanja menampilkan banner informatif bahwa mode pemesanan hanya untuk Orang Tua atau Institusi.
- ❌ **Anti Manipulasi Sengketa:** Guru tidak dapat menyelesaikan sesi les (`/complete`) apabila sesi tersebut sedang berada dalam status sengketa `DISPUTED`.
- ❌ **Terkunci dari Portal Admin & Institusi:** Dilarang mengakses rute `/admin/*` dan `/institution/*`.

---

## 4. INSTITUTION (Sekolah / Pembeli Layanan B2B)

Kepala Sekolah, Wakil Kurikulum, atau Bendahara Sekolah yang memesan perangkat administrasi guru (Modul Ajar Kurikulum Merdeka, RPP, dan LPJ Dana BOS).

### A. Akun Demo & Akses Login
- **Email:** `kepsek.sdn01@belajarku.com`
- **Password:** `password123`
- **Nama Profil Demo:** Bpk. Drs. H. Suryanto, M.Pd
- **Nama Sekolah:** SD Negeri 01 Pagi Menteng
- **Redirect Path:** `/institution/dashboard`

### B. Menu Navigasi & Daftar Halaman UI
| URL Path | Nama Halaman | Fungsi & Kemampuan Halaman |
| :--- | :--- | :--- |
| `/` | Beranda | Beranda dengan navbar bernuansa biru korporat khusus instansi pendidikan. |
| `/institution/dashboard` | Dashboard Sekolah | Pusat manajemen pesanan dokumen administrasi, verifikasi berkas kurikulum yang diunggah konsultan guru, pengajuan revisi berkas, dan persetujuan pencairan escrow. |
| `/modules` | Katalog Modul & Dokumen | Katalog utama penyusunan dokumen Kurikulum Merdeka, modul ajar tematik, dan berkas SPJ/LPJ Dana BOS. |
| `/cart` | Keranjang Pesanan Sekolah | Keranjang belanja B2B khusus pembelian paket dokumen kurikulum dengan kolom instruksi kebutuhan sekolah. |

### C. Daftar Fitur Utama & Alur Kerja (End-to-End Capabilities)
1. **Katalog Terisolasi Berfokus Modul & Kurikulum:**
   - Navigasi sekolah mengutamakan "Katalog Modul & Dokumen".
   - Jika perwakilan sekolah membuka katalog les privat `/services`, sistem secara otomatis mengalihkan navigasi ke `/modules` agar sekolah fokus pada pengadaan dokumen akademik.
2. **Pemesanan Paket Dokumen dengan Catatan Kustomisasi:**
   - Sekolah memilih paket dokumen yang dibutuhkan (contoh: *Paket Lengkap Modul Ajar IPAS Kelas 4 Fase B*).
   - Pada saat memasukkan ke keranjang, sekolah dapat memberikan instruksi spesifik (contoh: fokus pada instrumen rubrik asesmen formatif dan LKPD berbasis lingkungan sekolah).
3. **Checkout Terpadu & Invoice Resmi:**
   - Melakukan checkout dan pelunasan invoice (dilengkapi nomor invoice formal untuk pembukuan sekolah).
   - Dana pesanan disimpan aman di rekening escrow platform dengan status `AWAITING_DELIVERY`.
4. **Pemeriksaan & Pengunduhan Berkas Terproteksi (*Secure Deliverable Download*):**
   - Setelah guru menyusun dan mengunggah berkas dokumen, pihak sekolah mendapatkan notifikasi status `DELIVERED`.
   - Sekolah dapat mengunduh berkas fisik asli melalui endpoint aman `/orders/:id/deliverables/:fileId/download`.
5. **Pengajuan Siklus Revisi Dokumen Terkendali (*Revision Loop*):**
   - Jika isi modul membutuhkan penyesuaian dengan arahan pengawas sekolah, pihak sekolah dapat menekan tombol **"Minta Revisi"** dan menginput catatan kekurangan berkas.
   - Status pesanan berubah menjadi `REVISION_REQUESTED` dan counter revisi bertambah.
   - Sistem secara otomatis mengunci kuota revisi agar tidak melebihi batas perjanjian jasa (maksimal 2x revisi).
6. **Persetujuan Akhir & Pencairan Dana Guru (*Escrow Settlement*):**
   - Apabila berkas dokumen telah sesuai, pihak sekolah menekan tombol **"Setujui & Selesaikan Dokumen"**.
   - Sistem menandai pesanan sebagai `COMPLETED` dan mengeksekusi pembagian hasil secara otomatis: 85% honor langsung diteruskan ke dompet guru dan 15% dialokasikan ke platform fee.

### D. Integrasi Endpoint API Terkait
- `GET /api/v1/categories` – Mengambil kategori administrasi guru (`ADMINISTRASI_GURU`).
- `GET /api/v1/services` – Mengambil daftar paket modul dan dokumen sekolah.
- `POST /api/v1/cart` – Memasukkan paket dokumen ke keranjang pemesanan.
- `GET /api/v1/cart` – Memeriksa item belanja dokumen instansi.
- `POST /api/v1/orders/checkout` – Mengonfirmasi pemesanan dokumen instansi.
- `GET /api/v1/orders/mine` – Mengambil daftar riwayat pemesanan dokumen dan invoice sekolah.
- `GET /api/v1/orders/:id/deliverables/:fileId/download` – Mengunduh berkas fisik modul yang diunggah guru.
- `POST /api/v1/orders/:id/request-revision` – Mengajukan permohonan revisi dokumen ke guru.
- `POST /api/v1/orders/:id/complete-deliverable` – Menyetujui dokumen final dan mencairkan escrow 85% ke guru.

### E. Proteksi RBAC & Pembatasan Akses (Security Guards)
- 🔒 **Isolasi dari Katalog Siswa B2C:** Otomatis dialihkan dari rute `/services` ke `/modules`.
- ❌ **Proteksi Kuota Revisi:** Percobaan meminta revisi ke-3 ditolak secara tegas oleh backend dengan `HTTP 400 Bad Request ("Batas maksimal revisi telah tercapai")`.
- ❌ **Terkunci dari Portal Tutor & Admin:** Dilarang mengakses dashboard pengajar `/tutor/*` maupun portal pengawasan `/admin/*`.

---

## 5. ADMIN (Pengelola Platform & Pengawas Escrow)

Pengawas ekosistem platform yang memegang kendali penuh atas keamanan transaksi rekening bersama (*escrow*), verifikasi kredensial guru, resolusi sengketa, dan tata kelola akun anggota.

### A. Akun Demo & Akses Login
- **Email:** `admin.demo@belajarku.com`
- **Password:** `password123`
- **Nama Profil Demo:** Admin Belajar-Ku
- **Hak Akses:** Super Admin (Akses Penuh Seluruh Modul)
- **Redirect Path:** `/admin/dashboard`

### B. Menu Navigasi & Daftar Halaman UI
| URL Path | Nama Halaman | Fungsi & Kemampuan Halaman |
| :--- | :--- | :--- |
| `/` | Beranda | Tampilan beranda dengan akses cepat badge Admin Portal. |
| `/admin/dashboard` | Konsol Admin | Pusat kendali utama: pemantauan ringkasan GMV, verifikasi pengajar, dan meja penyelesaian laporan sengketa (*Dispute Desk*). |
| `/admin/users` | Direktori Pengguna | Direktori seluruh anggota terdaftar lintas peran (Parent, Tutor, Sekolah, Admin) dengan tombol pembekuan akun instan (*Suspend/Activate Toggle*). |
| `/admin/transactions` | Riwayat Transaksi & Escrow | Buku besar (*ledger*) transaksi menyeluruh, pelacakan progres pencairan escrow per sesi/modul, modal audit jejak kronologis, pelunasan manual, dan ekspor laporan CSV. |

### C. Daftar Fitur Utama & Alur Kerja (End-to-End Capabilities)
1. **Verifikasi Kredensial Pengajar (*One-Click Tutor Verification*):**
   - Admin memeriksa daftar guru baru yang belum terverifikasi beserta berkas ijazah dan sertifikat mengajar.
   - Mengubah status verifikasi guru secara instan (*Verified Badge*), yang meningkatkan kepercayaan orang tua murid di katalog publik.
2. **Meja Resolusi Sengketa Les dengan 4 Tindakan Penyelesaian (*Dispute Resolution Desk*):**
   - Jika orang tua melaporkan kendala sesi les (contoh: guru tidak hadir), sengketa masuk ke meja review Admin.
   - Admin dapat mengambil salah satu dari 4 keputusan yang berdampak langsung pada database:
     * **`REFUND_TO_PARENT`:** Dana sesi les dikembalikan ke orang tua, sesi diubah menjadi `CANCELLED`, dan saldo guru tidak bertambah.
     * **`RELEASE_FUNDS_TO_TUTOR`:** Menyelesaikan sesi secara paksa, mencairkan honor 85% ke dompet guru dan 15% platform fee.
     * **`REJECT_REPORT`:** Menolak laporan orang tua jika tidak terbukti bersalah, mengembalikan sesi ke jadwal semula `SCHEDULED`.
     * **`SUSPEND_USER`:** Membekukan dan menonaktifkan akun pihak yang melanggar ketentuan platform secara permanen.
3. **Direktori & Manajemen Pengguna Terpadu (*Member Tracking & Directory*):**
   - Menelusuri seluruh akun terdaftar berdasarkan filter peran (`ALL`, `PARENT`, `TUTOR`, `INSTITUTION`, `ADMIN`).
   - Mencari pengguna berdasarkan nama, email, nomor HP, atau nama instansi sekolah.
   - Tombol pengaktifan/penonaktifan status akun (*Active / Suspended Toggle*) secara langsung tanpa refresh halaman.
4. **Buku Besar Transaksi & Escrow Platform (*Financial Ledger & Escrow Monitoring*):**
   - Memantau 4 kartu metrik keuangan global secara real-time:
     * **Total GMV Platform** (Akumulasi bruto seluruh order lunas).
     * **Dana Escrow Tertahan** (Total dana rekening bersama yang masih menunggu sesi les atau dokumen kurikulum diselesaikan).
     * **Pendapatan Platform 15%** (Total penerimaan komisi platform yang telah terealisasi).
     * **Dana Cair ke Guru 85%** (Total honorarium yang telah masuk ke saldo dompet pengajar).
   - Tabel transaksi terperinci yang menampilkan progres pencairan escrow (contoh: `1/4 Sesi Selesai`), badge peran pembeli, jenis layanan, dan status order.
5. **Modal Audit Transaksi Kronologis (*Chronological Audit Trail*):**
   - Melihat riwayat jejak peristiwa transaksi secara mendalam: tanggal pembuatan order, pelunasan pembayaran, rincian per sesi belajar, pengunggahan berkas deliverable, hingga mutasi saldo dompet.
   - Dilengkapi tombol cepat **"⚡ Konfirmasi Lunas Manual (Demo)"** untuk memvalidasi transaksi yang sedang menunggu pembayaran.
6. **Ekspor Laporan Transaksi ke Format CSV (*Export to CSV*):**
   - Mengunduh seluruh rekap riwayat transaksi yang sedang difilter ke dalam file `.csv` standar secara instan di sisi klien untuk keperluan pembukuan dan audit keuangan.

### D. Integrasi Endpoint API Terkait
- `GET /api/v1/admin/stats` – Mengambil statistik keuangan global dan operasional.
- `GET /api/v1/admin/reports` – Mengambil daftar laporan kendala/sengketa sesi les.
- `POST /api/v1/admin/reports/:id/resolve` – Mengeksekusi putusan sengketa (Refund, Release, Reject, Suspend).
- `GET /api/v1/admin/tutors/unverified` – Mengambil daftar guru yang menunggu verifikasi.
- `POST /api/v1/admin/tutors/:tutorId/verify` – Mengubah status verifikasi guru.
- `GET /api/v1/admin/users` – Mengambil direktori seluruh pengguna terdaftar dengan filter & pencarian.
- `PATCH /api/v1/admin/users/:id/toggle-status` – Menyalakan/mematikan status keaktifan akun pengguna.
- `GET /api/v1/admin/transactions` – Mengambil daftar buku besar transaksi dengan filter, pagination, dan summary KPI.
- `GET /api/v1/admin/transactions/:orderId` – Mengambil audit rincian transaksi lengkap dan timeline kronologis.
- `POST /api/v1/admin/transactions/:orderId/confirm-payment` – Konfirmasi pelunasan transaksi manual oleh Admin.

### E. Proteksi RBAC & Pembatasan Akses (Security Guards)
- 🛡️ **Penegakan Hak Akses Eksklusif:**
  - Seluruh rute `/api/v1/admin/*` diproteksi secara ketat menggunakan middleware `[authenticate, authorizeRoles('ADMIN')]`.
  - Akses ilegal dari token selain Admin akan ditolak secara mutlak dengan respon terstandarisasi `HTTP 403 Forbidden`.
- ❌ **Dilarang Melakukan Pemesanan:** Akun Administrator diblokir dari melakukan checkout layanan di keranjang belanja.

---

## 6. TABEL MATRIKS HAK AKSES & FITUR UTAMA (MASTER RBAC MATRIX)

Tabel berikut memetakan ketersediaan fitur inti platform terhadap kelima entitas aktor:

| Kategori Fitur & Modul | GUEST | PARENT | TUTOR | INSTITUTION | ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Katalog & Eksplorasi** | | | | | |
| Jelajah Katalog Les Privat (`/services`) | ✅ Akses Penuh | ✅ Akses Penuh | 👀 Hanya Lihat | ❌ Dialihkan ke Modul | 👀 Hanya Lihat |
| Jelajah Katalog Dokumen B2B (`/modules`) | ✅ Akses Penuh | ❌ Dialihkan ke Les | 👀 Hanya Lihat | ✅ Akses Penuh | 👀 Hanya Lihat |
| Cek Profil & Slot Ketersediaan Guru | ✅ Akses Penuh | ✅ Akses Penuh | ✅ Akses Penuh | ✅ Akses Penuh | ✅ Akses Penuh |
| **Pemesanan & Transaksi (B2C & B2B)** | | | | | |
| Tambah Item ke Keranjang (`/cart`) | ❌ Harus Login | ✅ Akses Penuh | ❌ Ditolak (403) | ✅ Akses Penuh | ❌ Ditolak (403) |
| Pemilihan Jadwal Terkunci Hari Guru | ❌ | ✅ Akses Penuh | ❌ | ❌ (N/A Modul) | ❌ |
| Checkout Bergaransi Redis Lock | ❌ | ✅ Akses Penuh | ❌ Ditolak (403) | ✅ Akses Penuh | ❌ Ditolak (403) |
| Simulasi Pelunasan Invoice (Demo) | ❌ | ✅ Akses Penuh | ❌ | ✅ Akses Penuh | ✅ Akses Penuh |
| Rekening Bersama (*Platform Escrow*) | ❌ | ✅ Dilindungi | ✅ Penerima 85% | ✅ Dilindungi | ✅ Pengawas Penuh |
| **B2C Les Privat & Murid** | | | | | |
| Pengelolaan Profil Anak (`/students`) | ❌ | ✅ Akses Penuh | ❌ | ❌ | 👀 Via Detail Order |
| Pemantauan Sesi Les Terjadwal | ❌ | ✅ Akses Penuh | ✅ Sesi Mengajar | ❌ | 👀 Audit Transaksi |
| Pengisian Jurnal Belajar Guru | ❌ | ❌ | ✅ Akses Penuh | ❌ | 👀 Lihat Jurnal |
| Pelaporan Kendala / Sengketa Sesi | ❌ | ✅ Ajukan Dispute | ❌ | ❌ | ✅ Putuskan Resolusi |
| **B2B Administrasi & Dokumen Sekolah** | | | | | |
| Pemesanan Perangkat Kurikulum & BOS | ❌ | ❌ | ❌ | ✅ Akses Penuh | 👀 Audit Transaksi |
| Pengunggahan Berkas Deliverable Dokumen | ❌ | ❌ | ✅ Unggah Berkas | ❌ | 👀 Unduh Berkas |
| Pengunduhan Berkas Dokumen Kurikulum | ❌ | ❌ | ✅ Berkas Sendiri | ✅ Berkas Pesanan | ✅ Berkas Pesanan |
| Pengajuan Revisi Dokumen (Maks. 2x) | ❌ | ❌ | ❌ | ✅ Ajukan Revisi | 👀 Pantau Siklus |
| Konfirmasi Selesai & Rilis Escrow Dokumen | ❌ | ❌ | ❌ | ✅ Rilis Escrow | ✅ Override Rilis |
| **Sisi Guru (Supply-Side)** | | | | | |
| Pembuatan Layanan Baru (Sesi/Modul) | ❌ | ❌ | ✅ Akses Penuh | ❌ | 👀 Pantau Layanan |
| Pengaturan Slot Jadwal Mingguan | ❌ | ❌ | ✅ Akses Penuh | ❌ | 👀 Pantau Slot |
| Dompet Saldo & Riwayat Bagi Hasil 85% | ❌ | ❌ | ✅ Dompet Pribadi | ❌ | 👀 Akumulasi Disbursed |
| **Administrasi & Pengawasan Sistem** | | | | | |
| Verifikasi Kredensial Guru (*One-Click*) | ❌ | ❌ | ❌ (Menunggu) | ❌ | ✅ Akses Penuh |
| Meja Resolusi Sengketa (4 Aksi) | ❌ | ❌ (Pelapor) | ❌ (Pihak Terlapor) | ❌ | ✅ Akses Penuh |
| Direktori Anggota & Freeze Akun | ❌ | ❌ | ❌ | ❌ | ✅ Akses Penuh |
| Buku Besar Transaksi & Status Escrow | ❌ | ❌ (Order Sendiri) | ❌ (Order Sendiri) | ❌ (Order Sendiri) | ✅ Akses Penuh |
| Ekspor Laporan Keuangan ke CSV | ❌ | ❌ | ❌ | ❌ | ✅ Akses Penuh |
| Konfirmasi Lunas Manual Transaksi | ❌ | ❌ | ❌ | ❌ | ✅ Akses Penuh |

---

### Keterangan Simbol:
- `✅ Akses Penuh`: Pengguna memiliki izin penuh untuk melihat, membuat, mengubah, atau mengeksekusi alur kerja.
- `👀 Hanya Lihat`: Pengguna dapat membaca/melihat data terkait namun tidak memiliki wewenang memodifikasi langsung.
- `❌ Terkunci / Disembunyikan`: Rute/fitur dilindungi oleh RBAC (*Role-Based Access Control*), disembunyikan dari UI, atau diblokir pada tingkat API (`HTTP 401 Unauthorized` / `HTTP 403 Forbidden` / *Silent Redirect*).
