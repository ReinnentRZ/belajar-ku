'use client';

import { ArrowRight, Building2, GraduationCap, Lock, Mail, Phone, User, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [role, setRole] = useState<'PARENT' | 'TUTOR' | 'INSTITUTION'>('PARENT');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // 1. Register user
      await api.post('/api/v1/auth/register', {
        name,
        email,
        phone,
        password,
        role,
        ...(role === 'INSTITUTION' ? { schoolName } : {}),
      });

      // 2. Automatically log in
      const loginRes = await api.post('/api/v1/auth/login', {
        email,
        password,
      });

      if (loginRes.data?.success && loginRes.data?.data) {
        const { token, user } = loginRes.data.data;
        login(token, user);

        if (user.role === 'TUTOR') {
          router.push('/tutor/dashboard');
        } else {
          router.push('/parent/dashboard');
        }
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Pendaftaran gagal. Periksa kembali kelengkapan data.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Buat Akun Baru</h1>
          <p className="text-sm text-slate-500">
            Bergabung dengan Belajar-Ku untuk mendampingi masa depan buah hati
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('PARENT')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all ${
              role === 'PARENT'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Orang Tua</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('TUTOR')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all ${
              role === 'TUTOR'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Guru/Tutor</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('INSTITUTION')}
            className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition-all ${
              role === 'INSTITUTION'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Sekolah</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap
            </label>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  role === 'PARENT'
                    ? 'Bunda / Ayah ...'
                    : role === 'TUTOR'
                    ? 'Kak / Bu / Pak ...'
                    : 'Bpk. / Ibu Kepala Sekolah / Guru'
                }
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-colors"
              />
            </div>
          </div>

          {role === 'INSTITUTION' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Sekolah / Instansi Pendidikan
              </label>
              <div className="relative">
                <Building2 className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Contoh: SD Negeri 01 Pagi Menteng"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors"
                />
              </div>
            </div>
          )}

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
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nomor WhatsApp / HP
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081234567890"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Kata Sandi (Min. 8 karakter)
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              role === 'PARENT'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                : role === 'TUTOR'
                ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
            }`}
          >
            {isSubmitting
              ? 'Mendaftarkan...'
              : role === 'PARENT'
              ? 'Daftar sebagai Orang Tua'
              : role === 'TUTOR'
              ? 'Daftar sebagai Guru'
              : 'Daftar sebagai Pihak Sekolah'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-sm text-slate-600">
          Sudah punya akun?{' '}
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}
