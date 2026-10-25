import { BookOpen, GraduationCap, Heart, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 text-sm mt-auto border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 text-white mb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Belajar-Ku</span>
            </div>
            <p className="text-slate-400 max-w-sm leading-relaxed mb-4">
              Marketplace les privat terpercaya untuk jenjang PAUD (Calistung & Baca Tulis) hingga SMP. Menghubungkan orang tua dengan guru berpengalaman dan berdedikasi.
            </p>
            <div className="flex items-center space-x-2 text-xs text-accent-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Sistem Escrow Terlindungi & Guru Terverifikasi</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">Jenjang Pendidikan</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/services?gradeLevel=PAUD" className="hover:text-white transition-colors">
                  PAUD (Calistung & Baca Tulis)
                </Link>
              </li>
              <li>
                <Link href="/services?gradeLevel=TK" className="hover:text-white transition-colors">
                  TK (Huruf & Angka Dasar)
                </Link>
              </li>
              <li>
                <Link href="/services?gradeLevel=SD" className="hover:text-white transition-colors">
                  SD (Matematika, IPA, Tematik)
                </Link>
              </li>
              <li>
                <Link href="/services?gradeLevel=SMP" className="hover:text-white transition-colors">
                  SMP (Fisika, Biologi, Bahasa Inggris)
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold mb-3">Layanan</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Daftar Jadi Guru / Tutor
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white transition-colors">
                  Daftar Sebagai Orang Tua
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-white transition-colors">
                  Jelajahi Katalog Les
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Belajar-Ku. Hak Cipta Dilindungi.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Dibuat dengan <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> untuk masa depan pendidikan Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
