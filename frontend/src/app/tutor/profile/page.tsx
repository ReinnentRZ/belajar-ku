'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  HelpCircle,
  Layers,
  MapPin,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { DAY_NAMES, formatRupiah } from '../../../lib/utils';

export default function TutorProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Profile Form States
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [address, setAddress] = useState('');
  const [teachingCredentials, setTeachingCredentials] = useState('');
  const [specialAccommodations, setSpecialAccommodations] = useState('');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Availability Slot States
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [startTime, setStartTime] = useState<string>('15:00');
  const [endTime, setEndTime] = useState<string>('16:30');
  const [slotSuccessMsg, setSlotSuccessMsg] = useState('');
  const [slotErrorMsg, setSlotErrorMsg] = useState('');

  // 1. Fetch Tutor Profile & Wallet Balance
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['tutor-profile'],
    queryFn: async () => {
      const res = await api.get('/api/v1/users/tutor/me');
      return res.data?.data;
    },
    enabled: !!user && user.role === 'TUTOR',
  });

  // Sync initial profile values
  useEffect(() => {
    if (profileData) {
      setBio(profileData.bio || '');
      setEducation(profileData.education || '');
      setAddress(profileData.address || '');
      setTeachingCredentials(profileData.teachingCredentials || '');
      setSpecialAccommodations(profileData.specialAccommodations || '');
    }
  }, [profileData]);

  // 2. Fetch Availability Slots
  const { data: availabilities = [], isLoading: isAvailLoading } = useQuery({
    queryKey: ['my-availabilities'],
    queryFn: async () => {
      const res = await api.get('/api/v1/services/availability');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'TUTOR',
  });

  // Profile Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (payload: {
      bio: string;
      education: string;
      address: string;
      teachingCredentials?: string;
      specialAccommodations?: string;
    }) => {
      const res = await api.put('/api/v1/users/tutor/me', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-profile'] });
      setProfileSuccessMsg('Profil pengajar berhasil diperbarui!');
      setProfileErrorMsg('');
      setTimeout(() => setProfileSuccessMsg(''), 4000);
    },
    onError: (err: any) => {
      setProfileErrorMsg(err.response?.data?.message || 'Gagal menyimpan profil.');
      setProfileSuccessMsg('');
    },
  });

  // Add Availability Mutation
  const addAvailabilityMutation = useMutation({
    mutationFn: async (payload: { dayOfWeek: number; startTime: string; endTime: string }) => {
      const res = await api.post('/api/v1/services/availability', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
      setSlotSuccessMsg('Slot jadwal berhasil ditambahkan.');
      setSlotErrorMsg('');
      setTimeout(() => setSlotSuccessMsg(''), 3000);
    },
    onError: (err: any) => {
      setSlotErrorMsg(err.response?.data?.message || 'Gagal menambahkan slot jadwal.');
      setSlotSuccessMsg('');
    },
  });

  // Delete Availability Mutation
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const res = await api.delete(`/api/v1/services/availability/${slotId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gagal menghapus slot jadwal.');
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (bio.trim().length < 10) {
      setProfileErrorMsg('Deskripsi profil / bio minimal 10 karakter.');
      return;
    }
    if (education.trim().length < 2) {
      setProfileErrorMsg('Riwayat pendidikan harus diisi.');
      return;
    }
    if (address.trim().length < 5) {
      setProfileErrorMsg('Alamat operasional minimal 5 karakter.');
      return;
    }

    updateProfileMutation.mutate({
      bio,
      education,
      address,
      teachingCredentials: teachingCredentials || undefined,
      specialAccommodations: specialAccommodations || undefined,
    });
  };

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setSlotErrorMsg('Jam mulai dan jam selesai harus dipilih.');
      return;
    }
    if (startTime >= endTime) {
      setSlotErrorMsg('Jam mulai harus lebih awal dari jam selesai.');
      return;
    }

    addAvailabilityMutation.mutate({
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
    });
  };

  if (isAuthLoading || isProfileLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Memuat data profil & jadwal guru...</p>
      </div>
    );
  }

  if (!user || user.role !== 'TUTOR') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Akses Terbatas Guru</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Halaman ini khusus untuk Pengajar / Konsultan Pendidikan Belajar-Ku.
        </p>
        <Link
          href="/login"
          className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700"
        >
          Masuk Akun Guru
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/tutor/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-brand-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Dashboard
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Profil & Pengaturan Guru</span>
            {profileData?.isVerified ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Terverifikasi
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Menunggu Verifikasi Admin
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola identitas profesional, kualifikasi mengajar, serta slot ketersediaan les mingguan Anda.
          </p>
        </div>

        {/* Quick Balance / Actions */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-right">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saldo Dompet</div>
            <div className="text-base font-extrabold text-emerald-600">
              {formatRupiah(profileData?.walletBalance || 0)}
            </div>
          </div>
          <Link
            href="/tutor/services"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <BookOpen className="w-4 h-4 text-brand-600" />
            Layanan Saya ({profileData?.services?.length || 0})
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile & Credentials (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Biodata & Kualifikasi Pengajar</h2>
                  <p className="text-xs text-slate-500">Informasi ini akan ditampilkan kepada calon wali murid.</p>
                </div>
              </div>
            </div>

            {profileSuccessMsg && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Readonly Account Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">Nama Lengkap</label>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{user.name}</div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase">Email Akun</label>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">{user.email}</div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bio Singkat & Pengalaman Mengajar <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Ceritakan latar belakang pendidikan, spesialisasi kurikulum (e.g. Merdeka Belajar/Montessori), serta pendekatan belajar Anda..."
                  className="w-full text-xs px-3.5 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Minimal 10 karakter.</span>
              </div>

              {/* Education */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Pendidikan Terakhir & Universitas <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    placeholder="Contoh: S1 Pendidikan Guru Sekolah Dasar (PGSD) - Universitas Negeri Jakarta"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Address / Operational Coverage */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alamat / Wilayah Jangkauan Les Visit <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Contoh: Jagakarsa, Pasar Minggu, Jakarta Selatan & Sekitarnya"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800"
                    required
                  />
                </div>
              </div>

              {/* Teaching Credentials / Certifications */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Sertifikat & Lisensi Pendidik (Opsional)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={teachingCredentials}
                    onChange={(e) => setTeachingCredentials(e.target.value)}
                    placeholder="Contoh: Guru Penggerak Angkatan 7, Sertifikasi TOEFL 580"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Special Accommodations */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Kemampuan Pendampingan Khusus / Inklusi</span>
                  <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                </label>
                <div className="relative">
                  <Sparkles className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={specialAccommodations}
                    onChange={(e) => setSpecialAccommodations(e.target.value)}
                    placeholder="Contoh: Berpengalaman menangani anak aktif / ADHD, metode multisensori"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-brand-500/20 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Weekly Availability Slot Manager (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Jadwal Slot Mingguan</h2>
                <p className="text-xs text-slate-500">Waktu yang tersedia untuk dipilih oleh orang tua murid.</p>
              </div>
            </div>

            {/* Add Slot Form */}
            <form
              onSubmit={handleAddSlot}
              className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3"
            >
              <div className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-600" />
                Tambah Slot Waktu Baru
              </div>

              {slotSuccessMsg && (
                <div className="p-2 rounded-xl bg-emerald-100/70 text-emerald-800 text-[11px] font-semibold">
                  {slotSuccessMsg}
                </div>
              )}

              {slotErrorMsg && (
                <div className="p-2 rounded-xl bg-rose-100/70 text-rose-800 text-[11px] font-semibold">
                  {slotErrorMsg}
                </div>
              )}

              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hari</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-medium"
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <option key={d} value={d}>
                        {DAY_NAMES[d]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jam Mulai</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Jam Selesai</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 font-medium"
                      required
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={addAvailabilityMutation.isPending}
                className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{addAvailabilityMutation.isPending ? 'Menambahkan...' : 'Simpan Slot Jam'}</span>
              </button>
            </form>

            {/* Existing Slots List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
                <span>Daftar Slot Aktif</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  Total: {availabilities.length} Slot
                </span>
              </div>

              {isAvailLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Memuat slot...</div>
              ) : availabilities.length === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-slate-200 text-center space-y-2">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">Belum Ada Slot Jadwal</p>
                  <p className="text-[11px] text-slate-400">
                    Tambahkan hari dan rentang waktu mengajar agar orang tua dapat memesan layanan Anda.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto pr-1">
                  {availabilities
                    .sort((a: any, b: any) => {
                      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                      return a.startTime.localeCompare(b.startTime);
                    })
                    .map((slot: any) => (
                      <div
                        key={slot.id}
                        className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-16 text-xs font-bold text-slate-800">
                            {DAY_NAMES[slot.dayOfWeek]}
                          </span>
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {slot.startTime} - {slot.endTime} WIB
                          </span>
                          {slot.isBooked && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                              Terpesan
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Hapus slot ketersediaan waktu ini?')) {
                              deleteAvailabilityMutation.mutate(slot.id);
                            }
                          }}
                          disabled={deleteAvailabilityMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Hapus slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Tips Card */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
            <div className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Tips Pengaturan Jadwal
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Setiap slot waktu yang aktif akan langsung muncul di halaman booking orang tua. Pastikan memberikan jeda waktu istirahat 15-30 menit di antara sesi les visit tatap muka.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
