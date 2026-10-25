import { Award, BookOpen, CheckCircle, Clock, Heart, Shield, Sparkles, Star, Users } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/80 via-white to-slate-50 pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent-50 border border-accent-200 text-accent-700 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 text-accent-600" />
              <span>Spesialis Calistung PAUD & Pelajaran SD - SMP</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] mb-6">
              Les Privat Menyenangkan untuk{' '}
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-accent-600 bg-clip-text text-transparent">
                Tumbuh Kembang Buah Hati
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed mb-8">
              Hubungkan ananda dengan guru privat berdedikasi. Dari persiapan baca-tulis-hitung PAUD yang ramah anak, hingga pendampingan pelajaran SD dan SMP.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/services"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-lg shadow-brand-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2 text-base"
              >
                <BookOpen className="w-5 h-5" />
                Cari Guru Les Sekarang
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-300 shadow-sm transition-all hover:border-slate-400 flex items-center justify-center gap-2 text-base"
              >
                <Users className="w-5 h-5 text-slate-500" />
                Daftar Jadi Tutor
              </Link>
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

      {/* Why Choose Belajar-Ku */}
      <section className="bg-slate-100/70 py-16 border-y border-slate-200/80">
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
