'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle,
  Clock,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';

function ModulesCatalogContent() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const searchParams = useSearchParams();

  // Route Guard: Silently redirect PARENT users away from B2B Modules
  useEffect(() => {
    if (!isAuthLoading && user?.role === 'PARENT') {
      router.replace('/services');
    }
  }, [user, isAuthLoading, router]);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedGrade, setSelectedGrade] = useState(searchParams.get('gradeLevel') || '');

  // Fetch B2B Module Categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-modules'],
    queryFn: async () => {
      const res = await api.get('/api/v1/categories');
      const all = res.data?.data || [];
      return all.filter((c: any) => c.categoryGroup === 'ADMINISTRASI_GURU');
    },
  });

  // Fetch B2B Module & Document Services
  const { data: servicesData, isLoading: isServicesLoading } = useQuery({
    queryKey: ['b2b-modules', selectedGrade, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', 'teacher');
      params.append('categoryGroup', 'ADMINISTRASI_GURU');
      if (selectedGrade) params.append('gradeLevel', selectedGrade);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/api/v1/services?${params.toString()}`);
      return res.data?.data;
    },
    enabled: !user || user.role !== 'PARENT',
  });

  // Block rendering for PARENT accounts during redirect
  if (isAuthLoading || user?.role === 'PARENT') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const modules = servicesData?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Hero Banner */}
      <div className="rounded-3xl p-6 sm:p-10 text-white bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-800 shadow-xl shadow-indigo-950/10">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm">
            <Building2 className="w-3.5 h-3.5" />
            <span>Katalog Resmi Modul & Dokumen Sekolah (B2B)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            Perangkat Kurikulum Merdeka & Administrasi Sekolah
          </h1>
          <p className="text-indigo-100 text-sm sm:text-base leading-relaxed">
            Layanan penyusunan Modul Ajar, Capaian Pembelajaran (CP), Alur Tujuan Pembelajaran (ATP), Modul Projek P5, LKPD, serta asistensi LPJ / SPJ Dana BOS sesuai standar ARKAS.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-indigo-200">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Format Editable (.docx, .xlsx, .pdf)
            </span>
            <span className="flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-400" />
              Garansi Bebas 2x Revisi
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              100% Proteksi Dana Escrow
            </span>
          </div>
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
              placeholder="Cari modul ajar, fase kurikulum, LKPD, atau LPJ BOS..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-colors"
            />
          </div>

          {/* Grade Level Filter */}
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            className="py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
          >
            <option value="">Semua Jenjang / Fase</option>
            <option value="PAUD">Fase Fondasi (PAUD/TK)</option>
            <option value="SD">Fase A, B, C (SD)</option>
            <option value="SMP">Fase D (SMP)</option>
          </select>
        </div>
      </div>

      {/* Module Catalog Grid */}
      {isServicesLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          Memuat katalog modul dan dokumen sekolah...
        </div>
      ) : modules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Dokumen Tidak Ditemukan</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Tidak ada dokumen atau modul ajar yang cocok dengan kata kunci pencarian Anda. Silakan coba kata kunci lain.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedGrade('');
            }}
            className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl hover:bg-indigo-100 transition-colors"
          >
            Reset Pencarian
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((item: any) => {
            const formats = item.deliverableFormats && item.deliverableFormats.length > 0
              ? item.deliverableFormats
              : ['DOCX', 'PDF'];

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-indigo-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all p-6 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Category & Grade Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      📑 {item.category?.name || 'Administrasi Guru'}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {item.category?.targetGrade ? `Jenjang ${item.category.targetGrade}` : 'Semua Jenjang'}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Document Specifications */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        Pengerjaan:
                      </span>
                      <span className="font-bold text-slate-800">{item.estimatedDays || 3} Hari</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                        Format:
                      </span>
                      <div className="flex items-center gap-1 font-mono font-bold text-[10px] text-indigo-700">
                        {formats.map((fmt: string) => (
                          <span key={fmt} className="px-1.5 py-0.5 bg-white border border-indigo-200 rounded">
                            .{fmt.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                        Garansi Revisi:
                      </span>
                      <span className="font-bold text-emerald-700">{item.maxRevisions || 2}x Bebas Biaya</span>
                    </div>
                  </div>
                </div>

                {/* Price & Action */}
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Biaya Paket</span>
                    <span className="text-base font-black text-indigo-600">{formatRupiah(item.price)}</span>
                  </div>

                  <Link
                    href={`/services/${item.id}`}
                    className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 hover:gap-2"
                  >
                    <span>Pesan Dokumen</span>
                    <ArrowRight className="w-3.5 h-3.5" />
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

export default function ModulesCatalogPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400 text-sm">Memuat modul...</div>}>
      <ModulesCatalogContent />
    </Suspense>
  );
}
