'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, Calendar, GraduationCap, LayoutDashboard, LogOut, ShieldCheck, ShoppingCart, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Fetch cart count for PARENT
  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/api/v1/cart');
      return res.data?.data;
    },
    enabled: !!user && user.role === 'PARENT',
  });

  const cartItemCount = cartData?.items?.length || 0;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-brand-700 to-accent-600 bg-clip-text text-transparent">
              Belajar-Ku
            </span>
            <span className="block text-[10px] text-slate-500 font-medium -mt-1 tracking-wide">
              LES PRIVAT PAUD — SMP
            </span>
          </div>
        </Link>

        {/* Center Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600">
          <Link href="/" className="hover:text-brand-600 transition-colors">
            Beranda
          </Link>
          <Link href="/services" className="hover:text-brand-600 transition-colors flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-brand-500" />
            Katalog Les
          </Link>
          {user?.role === 'PARENT' && (
            <Link href="/parent/dashboard" className="hover:text-brand-600 transition-colors flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-accent-500" />
              Jadwal Anak
            </Link>
          )}
          {user?.role === 'TUTOR' && (
            <Link href="/tutor/dashboard" className="hover:text-brand-600 transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4 text-brand-500" />
              Portal Guru
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link href="/admin/dashboard" className="hover:text-purple-600 transition-colors flex items-center gap-1.5 font-semibold text-purple-700">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              Admin Portal
            </Link>
          )}
        </nav>

        {/* Right Section (Auth / Cart / Profile) */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {user ? (
            <>
              {/* Parent Cart Icon */}
              {user.role === 'PARENT' && (
                <Link
                  href="/cart"
                  className="relative p-2 rounded-xl text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                  title="Keranjang Belajar"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              )}

              {/* User Role Badge & Name */}
              <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-semibold text-slate-800 leading-tight">
                    {user.name}
                  </div>
                  <span
                    className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mt-0.5 ${
                      user.role === 'TUTOR'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : user.role === 'PARENT'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}
                  >
                    {user.role === 'TUTOR' ? '👨‍🏫 Guru' : user.role === 'PARENT' ? '👨‍👩‍👧 Orang Tua' : '👑 Admin'}
                  </span>
                </div>

                {/* Dashboard Shortcut */}
                <Link
                  href={user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'TUTOR' ? '/tutor/dashboard' : '/parent/dashboard'}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-brand-50 hover:text-brand-600 text-slate-600 transition-colors"
                  title="Buka Dashboard"
                >
                  <UserIcon className="w-5 h-5" />
                </Link>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Keluar"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm shadow-brand-500/20 transition-all hover:scale-[1.02]"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
