'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  GraduationCap,
  Layers,
  MapPin,
  Plus,
  Power,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { formatRupiah } from '../../../lib/utils';

export default function TutorServicesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch tutor services
  const { data: services = [], isLoading, refetch } = useQuery({
    queryKey: ['tutor-services-list'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tutor/my-services');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'TUTOR',
  });

  // Toggle Service Active Status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await api.put(`/api/v1/services/${id}`, { isActive: !isActive });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tutor-services-list'] });
      setNotification(`Status layanan berhasil diperbarui`);
      setTimeout(() => setNotification(null), 3000);
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-brand-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider">
            <Link
              href="/tutor/dashboard"
              className="inline-flex items-center gap-1 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard Guru
            </Link>
            <span>/</span>
            <span>Katalog Jasa Saya</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Kelola Jasa & Layanan Belajar
          </h1>
          <p className="text-sm text-blue-100 max-w-xl leading-relaxed">
            Publikasikan paket les privat anak atau paket administrasi guru/RPP. Jasa yang berstatus
            aktif dapat langsung dipesan oleh orang tua murid dan pihak sekolah.
          </p>
        </div>

        <Link
          href="/tutor/services/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-blue-800 font-bold text-sm shadow-lg shadow-black/10 hover:bg-blue-50 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
        >
          <Plus className="w-4 h-4 text-blue-700" />
          <span>Terbitkan Jasa Baru</span>
        </Link>
      </div>

      {notification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{notification}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Jasa
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{services.length}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Paket Les Privat
            </div>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              {services.filter((s: any) => s.serviceType === 'SESSION_BASED').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Modul Ajar / RPP
            </div>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {services.filter((s: any) => s.serviceType === 'DELIVERABLE_BASED').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Services List Grid */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 space-y-3">
          <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mx-auto" />
          <p className="text-sm">Memuat daftar jasa Anda...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900">Belum Ada Jasa yang Diterbitkan</h3>
            <p className="text-sm text-slate-500">
              Mulai tawarkan bimbingan belajar PAUD/TK/SD/SMP atau konsultasi administrasi guru untuk
              menjangkau murid dan sekolah.
            </p>
          </div>
          <Link
            href="/tutor/services/new"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Jasa Sekarang</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service: any) => {
            const isSession = service.serviceType === 'SESSION_BASED';
            const bookingCount = service._count?.orderItems || 0;

            return (
              <div
                key={service.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        service.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          service.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                        }`}
                      />
                      <span>{service.isActive ? '🟢 AKTIF / TAYANG' : '⚪ NONAKTIF'}</span>
                    </span>

                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {isSession ? '📚 Les Sesi' : '📑 Dokumen RPP'}
                    </span>
                  </div>

                  {/* Title & Category */}
                  <div>
                    <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 mb-1">
                      <span>{service.category?.name || 'Kategori'}</span>
                      <span>•</span>
                      <span className="uppercase text-slate-500">
                        {service.category?.targetGrade || 'Semua Jenjang'}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                      {service.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {service.description}
                  </p>

                  {/* Highlights / Features */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                    {isSession ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            <strong>{service.sessionCount || 1}x Pertemuan</strong> ({service.durationMinutes || 60} menit/sesi)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {service.teachingMode === 'ONLINE' ? '🌐 Kelas Online' : '🏠 Kunjungan Rumah'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Format:{' '}
                            {service.deliverableFormats?.length > 0
                              ? service.deliverableFormats.join(', ')
                              : 'PDF, DOCX'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Pengerjaan: <strong>{service.estimatedDays || 3} hari</strong> • Maks.{' '}
                            {service.maxRevisions ?? 2}x Revisi
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Price & Actions */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">
                      Biaya Layanan
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {formatRupiah(service.price)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/services/${service.id}`}
                      target="_blank"
                      className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                      title="Lihat Pratinjau di Katalog Publik"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    <button
                      type="button"
                      onClick={() =>
                        toggleMutation.mutate({ id: service.id, isActive: service.isActive })
                      }
                      disabled={toggleMutation.isPending}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                        service.isActive
                          ? 'border-slate-300 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{service.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
