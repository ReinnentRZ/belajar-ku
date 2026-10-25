'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, Calendar, Clock, Filter, GraduationCap, Heart, MapPin, Search, ShieldCheck, Sparkles, User, Video } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';

function ServicesCatalogContent() {
  const searchParams = useSearchParams();
  const initialGrade = searchParams.get('gradeLevel') || '';
  const initialCategoryGroup = searchParams.get('categoryGroup') || '';

  const [selectedGrade, setSelectedGrade] = useState(initialGrade);
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState(initialCategoryGroup);
  const [selectedMode, setSelectedMode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/v1/categories');
      return res.data?.data || [];
    },
  });

  // Fetch Services
  const { data: servicesData, isLoading } = useQuery({
    queryKey: ['services', selectedGrade, selectedCategoryGroup, selectedMode, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedGrade) params.append('gradeLevel', selectedGrade);
      if (selectedCategoryGroup) params.append('categoryGroup', selectedCategoryGroup);
      if (selectedMode) params.append('teachingMode', selectedMode);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/api/v1/services?${params.toString()}`);
      return res.data?.data;
    },
  });

  const services = servicesData?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-brand-700 via-brand-600 to-accent-600 rounded-3xl p-6 sm:p-10 text-white shadow-lg">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Katalog Les Terpercaya</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Pilihan Guru Les Privat Terbaik
          </h1>
          <p className="text-brand-100 text-sm sm:text-base leading-relaxed">
            Spesialisasi bimbingan Calistung PAUD, penguatan mata pelajaran SD & SMP, Literasi Al-Qur'an (BTQ/Tajwid), serta Kelas Khusus Difabel (ABK).
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mata pelajaran, topik (misal: Calistung, Al-Qur'an, ABK)..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-colors"
            />
          </div>

          {/* Mode Selector */}
          <div className="sm:w-56">
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm bg-white"
            >
              <option value="">Semua Metode Tatap Muka</option>
              <option value="ONLINE">💻 Online (Zoom / GMeet)</option>
              <option value="OFFLINE_VISIT">🏡 Guru Datang ke Rumah</option>
            </select>
          </div>
        </div>

        {/* Category Group Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs sm:text-sm">
          <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0 mr-1">
            <Sparkles className="w-3.5 h-3.5" />
            Kategori:
          </span>
          <button
            onClick={() => setSelectedCategoryGroup('')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
              selectedCategoryGroup === ''
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Bidang
          </button>
          {[
            { id: 'ACADEMIC', label: '📚 Akademik' },
            { id: 'BACA_TULIS_QURAN', label: "📖 Al-Qur'an (BTQ)" },
            { id: 'TAJWID', label: '✨ Tajwid & Makhraj' },
            { id: 'MUROJAAH', label: "🕌 Muroja'ah & Tahfidz" },
            { id: 'DIFABEL', label: '🤝 Inklusif / Difabel (ABK)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryGroup(cat.id === selectedCategoryGroup ? '' : cat.id)}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
                selectedCategoryGroup === cat.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grade Level Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-100 text-xs sm:text-sm">
          <span className="text-slate-400 font-semibold flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" />
            Jenjang:
          </span>
          <button
            onClick={() => setSelectedGrade('')}
            className={`px-3 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
              selectedGrade === ''
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Jenjang
          </button>
          {['PAUD', 'TK', 'SD', 'SMP'].map((g) => (
            <button
              key={g}
              onClick={() => setSelectedGrade(selectedGrade === g ? '' : g)}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 ${
                selectedGrade === g
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {g === 'PAUD' ? '👶 PAUD (Calistung)' : g === 'TK' ? '🎨 TK' : g === 'SD' ? '🎒 SD' : '📐 SMP'}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-20 bg-slate-100 rounded"></div>
              <div className="h-8 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h3 className="text-xl font-bold text-slate-800">Layanan Les Belum Ditemukan</h3>
          <p className="text-sm text-slate-500">
            Coba ubah kata kunci pencarian atau bersihkan filter jenjang untuk melihat penawaran lainnya.
          </p>
          <button
            onClick={() => {
              setSelectedGrade('');
              setSelectedCategoryGroup('');
              setSelectedMode('');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200 transition-colors"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((svc: any) => {
            const tutorUser = svc.tutor?.user;
            const category = svc.category;
            const isQuranic = ['BACA_TULIS_QURAN', 'TAJWID', 'MUROJAAH'].includes(category?.categoryGroup);
            const isDifabel = category?.categoryGroup === 'DIFABEL';

            return (
              <div
                key={svc.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg hover:border-brand-300 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Header Badge */}
                <div className="p-6 pb-4 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                        {category?.name || 'Mata Pelajaran'}
                      </span>
                      {isDifabel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-500" /> Inklusif
                        </span>
                      )}
                      {isQuranic && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-emerald-600" /> Al-Qur'an
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                        svc.teachingMode === 'ONLINE'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {svc.teachingMode === 'ONLINE' ? (
                        <>
                          <Video className="w-3 h-3" /> Online
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3 h-3" /> Ke Rumah
                        </>
                      )}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                    {svc.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {svc.description}
                  </p>

                  {/* Special Accommodations Highlight */}
                  {svc.specialAccommodations && (
                    <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 text-[11px] text-amber-900 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">
                        <strong className="font-semibold text-amber-950">Akomodasi:</strong> {svc.specialAccommodations}
                      </span>
                    </div>
                  )}

                  {/* Tutor Info */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="w-4 h-4 text-brand-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {tutorUser?.name || 'Guru Les Belajar-Ku'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                        {svc.tutor?.teachingCredentials ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-brand-600 shrink-0" />
                            <span className="truncate">{svc.tutor.teachingCredentials}</span>
                          </>
                        ) : (
                          'Guru Terverifikasi'
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Details */}
                <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">
                      {svc.sessionCount} Sesi ({svc.durationMinutes} Menit / Sesi)
                    </div>
                    <div className="text-base font-black text-brand-700">
                      {formatRupiah(svc.price)}
                    </div>
                  </div>

                  <Link
                    href={`/services/${svc.id}`}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs shadow-sm transition-all hover:scale-105"
                  >
                    Pilih Jadwal
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ServicesCatalogPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-12 text-center text-slate-500">Memuat katalog les...</div>}>
      <ServicesCatalogContent />
    </Suspense>
  );
}
