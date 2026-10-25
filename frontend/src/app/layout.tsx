import type { Metadata } from 'next';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { Providers } from '../components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Belajar-Ku — Platform Les Privat PAUD hingga SMP',
  description:
    'Temukan guru les privat ramah dan berpengalaman untuk Calistung PAUD, SD, dan SMP dengan jadwal fleksibel dan metode belajar menyenangkan.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="flex flex-col min-h-screen bg-slate-50 antialiased text-slate-800">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
