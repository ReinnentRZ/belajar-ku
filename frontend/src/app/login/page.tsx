'use client';

import { ArrowRight, GraduationCap, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { getApiErrorMessage } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { user, token, isLoading: isAuthLoading, login } = useAuth();

  // Auth Guard: If already authenticated, redirect immediately based on role
  useEffect(() => {
    if (!isAuthLoading && user && token) {
      if (user.role === 'ADMIN') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'TUTOR') {
        router.replace('/tutor/dashboard');
      } else if (user.role === 'INSTITUTION') {
        router.replace('/institution/dashboard');
      } else {
        router.replace('/parent/dashboard');
      }
    }
  }, [user, token, isAuthLoading, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const res = await api.post('/api/v1/auth/login', {
        email: email.trim(),
        password,
      });

      if (res.data?.success && res.data?.data) {
        const { token: receivedToken, user: loggedUser } = res.data.data;
        login(receivedToken, loggedUser);

        if (loggedUser.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (loggedUser.role === 'TUTOR') {
          router.push('/tutor/dashboard');
        } else if (loggedUser.role === 'INSTITUTION') {
          router.push('/institution/dashboard');
        } else {
          router.push('/parent/dashboard');
        }
      }
    } catch (err: unknown) {
      const parsed = getApiErrorMessage(err);
      setErrorMsg(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Selamat Datang Kembali</h1>
          <p className="text-sm text-slate-500">
            Masuk ke akun Belajar-Ku Anda untuk mengelola les dan jadwal
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                }}
                placeholder="nama@email.com"
                className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition-colors ${
                  fieldErrors.email
                    ? 'border-rose-400 ring-2 ring-rose-500/10 focus:border-rose-500 focus:outline-none'
                    : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                }}
                placeholder="••••••••"
                className={`w-full pl-11 pr-4 py-2.5 rounded-xl border text-sm transition-colors ${
                  fieldErrors.password
                    ? 'border-rose-400 ring-2 ring-rose-500/10 focus:border-rose-500 focus:outline-none'
                    : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? 'Memproses...' : 'Masuk Sekarang'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
          Belum punya akun?{' '}
          <Link href="/register" className="font-semibold text-brand-600 hover:text-brand-700">
            Daftar di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
