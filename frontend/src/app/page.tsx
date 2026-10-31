import { ArrowRight, Award, BookOpen, Building2, CheckCircle, Clock, FileText, Heart, Shield, Sparkles, Star, Users } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-white to-slate-50 pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span>Platform Terpadu Les Privat Murid & Pojok Administrasi Guru</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] mb-6">
              Satu Platform untuk{' '}
              <span className="bg-gradient-to-r from-brand-600 via-indigo-600 to-accent-600 bg-clip-text text-transparent">
                Pendidikan Berkualitas
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8 max-w-3xl mx-auto">
              Solusi holistik pendidikan Indonesia: hubungkan buah hati dengan guru privat berdedikasi, atau penuhi kebutuhan administrasi & kurikulum sekolah Anda bersama konsultan berpengalaman.
            </p>

            {/* Dual-Portal Interactive Gateway Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 text-left">
              {/* Portal Card A: Siswa & Les Privat */}
              <div className="relative group bg-white rounded-3xl p-6 sm:p-8 border-2 border-emerald-100 hover:border-emerald-400 shadow-xl shadow-emerald-500/5 hover:shadow-emerald-500/15 transition-all duration-300 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                      👶 Zona Murid & Orang Tua
                    </span>
                    <span className="text-2xl">🎒</span>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                      Les Privat Siswa (Sesi)
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Pendampingan belajar personal calistung PAUD, akademik SD & SMP, kelas Al-Qur'an, dan bimbingan inklusif anak difabel (ABK).
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Guru tersertifikasi & terverifikasi langsung</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Jadwal fleksibel (Datang ke Rumah / Online)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span>Sistem escrow aman & laporan perkembangan jurnal</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4">
                  <Link
                    href="/services?type=student"
                    className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 group-hover:gap-3"
                  >
                    <span>Jelajahi Les Privat Siswa</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Portal Card B: Pojok Administrasi Guru & Sekolah */}
              <div className="relative group bg-white rounded-3xl p-6 sm:p-8 border-2 border-indigo-100 hover:border-indigo-400 shadow-xl shadow-indigo-500/5 hover:shadow-indigo-500/15 transition-all duration-300 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
                      📑 Pojok Guru & Pihak Sekolah
                    </span>
                    <span className="text-2xl">🏫</span>
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Layanan Dokumen & Modul Guru
                    </h3>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Layanan pengerjaan Modul Ajar Kurikulum Merdeka, CP, ATP, LKPD, serta asistensi penyusunan SPJ / LPJ Dana BOS sesuai ARKAS.
                    </p>
                  </div>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600 pt-2 border-t border-slate-100">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span>Format dokumen lengkap editable (.docx, .xlsx, .pdf)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span>Estimasi pengerjaan kilat 3 - 5 hari kerja</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                      <span>Garansi 2x revisi gratis & proteksi dana escrow 100%</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4">
                  <Link
                    href="/services?type=teacher"
                    className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 group-hover:gap-3"
                  >
                    <span>Jelajahi Dokumen & Modul Guru</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-14 pt-10 border-t border-slate-200/80 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Keamanan Dana</div>
                  <div className="text-sm font-bold text-slate-800">Sistem Escrow</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Bebas Bentrok</div>
                  <div className="text-sm font-bold text-slate-800">Lock Real-time</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Transparansi</div>
                  <div className="text-sm font-bold text-slate-800">Jurnal Belajar</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-slate-500">Metode Nyaman</div>
                  <div className="text-sm font-bold text-slate-800">Ramah Anak</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Target Grade Levels Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pilihan Jenjang & Fokus Belajar
          </h2>
          <p className="text-slate-600 mt-2">
            Materi disesuaikan dengan kurikulum serta tahap psikologi perkembangan anak.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* PAUD */}
          <Link
            href="/services?gradeLevel=PAUD"
            className="group relative bg-white p-6 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-xl transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
              👶
            </div>
            <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 mb-2">
              USIA 3 - 5 TAHUN
            </span>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
              PAUD / Calistung
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Belajar mengenal huruf vokal, bunyi kata, motorik halus, dan berhitung dasar dengan permainan edukatif.
            </p>
          </Link>

          {/* TK */}
          <Link
            href="/services?gradeLevel=TK"
            className="group relative bg-white p-6 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:shadow-xl transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
              🎨
            </div>
            <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
              USIA 5 - 6 TAHUN
            </span>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
              TK A & TK B
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Kesiapan masuk sekolah dasar (SD), membaca suku kata bertahap, logika spasial, dan percaya diri berbicara.
            </p>
          </Link>

          {/* SD */}
          <Link
            href="/services?gradeLevel=SD"
            className="group relative bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
              🎒
            </div>
            <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              KELAS 1 - 6 SD
            </span>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
              Sekolah Dasar (SD)
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Matematika dasar hingga pecahan, IPA, Bahasa Indonesia, serta pendampingan PR dan ujian sekolah.
            </p>
          </Link>

          {/* SMP */}
          <Link
            href="/services?gradeLevel=SMP"
            className="group relative bg-white p-6 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-300"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg mb-4 group-hover:scale-110 transition-transform">
              📐
            </div>
            <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              KELAS 7 - 9 SMP
            </span>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Sekolah Menengah (SMP)
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Penguatan konsep Aljabar, Fisika, Biologi, dan Bahasa Inggris untuk persiapan ujian dan kenaikan kelas.
            </p>
          </Link>
        </div>
      </section>

      {/* Featured Religious & Inclusive Programs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-brand-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl space-y-8">
          <div className="max-w-2xl space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold backdrop-blur-sm border border-emerald-400/20">
              <Sparkles className="w-3.5 h-3.5" />
              Program Khusus & Inklusif
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Keluasan Belajar: Dari Tahsin Al-Qur'an hingga Kelas Inklusif Difabel
            </h2>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Belajar-Ku kini menyediakan guru tersertifikasi untuk literasi Al-Qur'an dan pendidikan ramah anak berkebutuhan khusus (ABK).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Islamic Studies Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-emerald-400/40 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl font-bold">
                  📖
                </div>
                <h3 className="text-xl font-bold text-white">
                  Literasi Al-Qur'an, Tajwid & Tahfidz
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Bimbingan membaca Iqro / Tilawati dengan kartu visual, pengenalan makharijul huruf anak usia dini, hingga bimbingan muroja'ah intensif Juz 'Amma (Juz 30) bersama guru bersertifikat tahsin dan sanad hafalan.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Iqro Visual Anak
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Kaidah Tajwid
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Muroja'ah Juz 30
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Guru Lulusan PTIQ / LPPQ</span>
                <Link
                  href="/services?categoryGroup=BACA_TULIS_QURAN"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  Lihat Guru Al-Qur'an
                </Link>
              </div>
            </div>

            {/* Special Needs / Inclusive Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-rose-400/40 transition-all flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-2xl font-bold">
                  🤝
                </div>
                <h3 className="text-xl font-bold text-white">
                  Kelas Inklusif & Anak Berkebutuhan Khusus (ABK)
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Layanan privat anak autisme, ADHD, slow learner, dan tunarungu didampingi sarjana Pendidikan Luar Biasa (PLB). Pembelajaran menggunakan Program Pembelajaran Individual (PPI), stimulasi sensori taktil, dan pendekatan ramah anak.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Guru Lulusan PLB
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Sensori Motorik
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    PPI Individual
                  </span>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Lisensi Terapi Perilaku & PLB</span>
                <Link
                  href="/services?categoryGroup=DIFABEL"
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  Lihat Guru Inklusif
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Belajar-Ku */}
      <section id="cara-kerja" className="bg-slate-100/70 py-16 border-y border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Mengapa Para Orang Tua Memilih Belajar-Ku?
            </h2>
            <p className="text-slate-600 mt-2">
              Kemudahan memilih jadwal dan kenyamanan perkembangan belajar anak dalam satu genggaman.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Jurnal Belajar Setiap Sesi</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Guru wajib mencatatkan laporan kemajuan materi yang telah dikuasai anak di setiap pertemuan sebelum sesi dinyatakan selesai.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-brand-600 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Garansi Dana Aman (Escrow)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Biaya les ditahan secara aman oleh sistem dan baru diteruskan ke dompet guru per sesi setelah pembelajaran selesai dilaksanakan.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Pilihan Online atau Kunjungan</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Bebas memilih mode tatap muka interaktif melalui Zoom/Google Meet atau guru datang langsung ke rumah Anda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-accent-600 rounded-3xl p-8 sm:p-12 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-black">Mulai Pendampingan Belajar Hari Ini</h2>
            <p className="text-brand-100 text-sm sm:text-base leading-relaxed">
              Lihat pilihan paket guru privat Calistung, SD, dan SMP terdekat dengan ananda. Pendaftaran mudah dan cepat!
            </p>
          </div>
          <Link
            href="/services"
            className="px-8 py-3.5 rounded-xl bg-white text-brand-700 font-bold hover:bg-brand-50 transition-all shadow-md hover:scale-105 shrink-0"
          >
            Lihat Semua Layanan Les
          </Link>
        </div>
      </section>
    </div>
  );
}
