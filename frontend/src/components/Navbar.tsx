'use client';

import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingCart,
  User as UserIcon,
  Wallet,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Fetch cart count for PARENT and INSTITUTION
  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/api/v1/cart');
      return res.data?.data;
    },
    enabled: !!user && (user.role === 'PARENT' || user.role === 'INSTITUTION'),
  });

  const cartItemCount = cartData?.items?.length || 0;

  const handleLogout = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    logout();
    router.push('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-brand-700 to-accent-600 bg-clip-text text-transparent">
              Belajar-Ku
            </span>
            <span className="block text-[10px] text-slate-500 font-medium -mt-1 tracking-wide">
              LES PRIVAT & ADMINISTRASI GURU
            </span>
          </div>
        </Link>

        {/* Center Navigation - Conditional RBAC Rendering */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-sm font-medium">
          {/* 1. ADMIN Navigation: Only Beranda & Admin Portal */}
          {user?.role === 'ADMIN' ? (
            <>
              <Link
                href="/"
                className={`px-3.5 py-2 rounded-xl transition-colors ${
                  isActive('/') && pathname === '/'
                    ? 'text-purple-700 bg-purple-50 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Beranda
              </Link>
              <Link
                href="/admin/dashboard"
                className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 font-bold ${
                  isActive('/admin/dashboard')
                    ? 'text-purple-700 bg-purple-50 shadow-sm border border-purple-200'
                    : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50/60'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Admin Portal</span>
              </Link>
            </>
          ) : user ? (
            /* 2. Logged-in PARENT, TUTOR, INSTITUTION Navigation */
            <>
              <Link
                href="/"
                className={`px-3.5 py-2 rounded-xl transition-colors ${
                  isActive('/') && pathname === '/'
                    ? 'text-brand-600 bg-brand-50 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Beranda
              </Link>
              <Link
                href="/services"
                className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                  isActive('/services')
                    ? 'text-brand-600 bg-brand-50 font-bold'
                    : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-brand-500" />
                <span>Katalog Jasa</span>
              </Link>
            </>
          ) : (
            /* 3. Public / Guest Navigation */
            <>
              <Link
                href="/"
                className={`px-3.5 py-2 rounded-xl transition-colors ${
                  isActive('/') && pathname === '/'
                    ? 'text-brand-600 bg-brand-50 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Beranda
              </Link>
              <Link
                href="/services"
                className={`px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 ${
                  isActive('/services')
                    ? 'text-brand-600 bg-brand-50 font-bold'
                    : 'text-slate-600 hover:text-brand-600 hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4 text-brand-500" />
                <span>Katalog Jasa</span>
              </Link>
              <Link
                href="/#cara-kerja"
                className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-brand-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Panduan</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Section (Cart, User Dropdown, Mobile Toggle) */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {user ? (
            <>
              {/* Cart Icon (Only for PARENT & INSTITUTION) */}
              {(user.role === 'PARENT' || user.role === 'INSTITUTION') && (
                <Link
                  href="/cart"
                  className="relative p-2 rounded-xl text-slate-600 hover:text-brand-600 hover:bg-slate-100 transition-colors"
                  title="Keranjang Pesanan"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {cartItemCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Admin Badge Shortcut (Visible on desktop for Admin) */}
              {user.role === 'ADMIN' && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Admin
                </span>
              )}

              {/* User Dropdown Profile Container */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border transition-all ${
                    isDropdownOpen
                      ? 'bg-slate-100 border-slate-300 ring-2 ring-brand-500/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left max-w-[120px]">
                    <div className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      {user.role === 'ADMIN'
                        ? 'Administrator'
                        : user.role === 'TUTOR'
                        ? 'Guru'
                        : user.role === 'INSTITUTION'
                        ? user.schoolName || 'Institusi'
                        : 'Orang Tua'}
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                      isDropdownOpen ? 'rotate-180 text-brand-600' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Card */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* User Header Profile */}
                    <div className="px-4 py-3 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900 truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      {user.schoolName && (
                        <div className="text-[10px] text-indigo-600 font-semibold mt-0.5 truncate">
                          🏫 {user.schoolName}
                        </div>
                      )}
                      <div className="mt-2">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            user.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'TUTOR'
                              ? 'bg-blue-100 text-blue-800'
                              : user.role === 'INSTITUTION'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {user.role === 'ADMIN'
                            ? '👑 Administrator'
                            : user.role === 'TUTOR'
                            ? '👨‍🏫 Guru / Konsultan'
                            : user.role === 'INSTITUTION'
                            ? '🏫 Guru / Sekolah'
                            : '👨‍👩‍👧 Orang Tua Murid'}
                        </span>
                      </div>
                    </div>

                    {/* Role-Specific Menu Options */}
                    <div className="py-1">
                      {user.role === 'ADMIN' && (
                        <Link
                          href="/admin/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-purple-700 hover:bg-purple-50 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4 text-purple-600" />
                          <span>Konsol Admin</span>
                        </Link>
                      )}

                      {user.role === 'PARENT' && (
                        <>
                          <Link
                            href="/parent/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                            <span>Dashboard Orang Tua</span>
                          </Link>
                          <Link
                            href="/parent/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <Calendar className="w-4 h-4 text-emerald-600" />
                            <span>Jadwal & Sesi Belajar</span>
                          </Link>
                          <Link
                            href="/cart"
                            className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <ShoppingCart className="w-4 h-4 text-brand-600" />
                              <span>Keranjang Pesanan</span>
                            </div>
                            {cartItemCount > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-600 text-white">
                                {cartItemCount}
                              </span>
                            )}
                          </Link>
                        </>
                      )}

                      {user.role === 'INSTITUTION' && (
                        <>
                          <Link
                            href="/parent/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <Building2 className="w-4 h-4 text-indigo-600" />
                            <span>Dashboard Sekolah</span>
                          </Link>
                          <Link
                            href="/parent/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                          >
                            <FileText className="w-4 h-4 text-indigo-600" />
                            <span>Pesanan Dokumen & LPJ</span>
                          </Link>
                        </>
                      )}

                      {user.role === 'TUTOR' && (
                        <>
                          <Link
                            href="/tutor/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <LayoutDashboard className="w-4 h-4 text-blue-600" />
                            <span>Dashboard Guru</span>
                          </Link>
                          <Link
                            href="/tutor/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                          >
                            <Wallet className="w-4 h-4 text-blue-600" />
                            <span>Jadwal & Dompet</span>
                          </Link>
                        </>
                      )}
                    </div>

                    {/* Divider & Logout Action */}
                    <div className="border-t border-slate-100 pt-1 mt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 w-full text-left transition-colors"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>Keluar Akun</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Guest Actions */
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-brand-600 transition-colors"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm shadow-brand-500/20 transition-all hover:scale-[1.02]"
              >
                Daftar
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden transition-colors"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 shadow-lg animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {user?.role === 'ADMIN' ? (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Beranda
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold text-purple-700 bg-purple-50"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span>Admin Portal</span>
                </Link>
              </>
            ) : user ? (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Beranda
                </Link>
                <Link
                  href="/services"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  <span>Katalog Jasa</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Beranda
                </Link>
                <Link
                  href="/services"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  <span>Katalog Jasa</span>
                </Link>
                <Link
                  href="/#cara-kerja"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>Panduan</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Profile & Actions */}
          {user && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="px-3 py-1 text-xs text-slate-500 font-semibold">
                Masuk sebagai <strong className="text-slate-800">{user.name}</strong>
              </div>
              {user.role === 'PARENT' && (
                <Link
                  href="/parent/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard Orang Tua</span>
                </Link>
              )}
              {user.role === 'INSTITUTION' && (
                <Link
                  href="/parent/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Dashboard Sekolah</span>
                </Link>
              )}
              {user.role === 'TUTOR' && (
                <Link
                  href="/tutor/dashboard"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-700 bg-blue-50"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard Guru</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 w-full text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
