'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api, { getApiErrorMessage } from '../../../lib/api';
import { formatDate, formatRupiah } from '../../../lib/utils';

export default function TutorBookingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SCHEDULED' | 'COMPLETED' | 'DISPUTED' | 'DELIVERABLE'>('ALL');

  // Complete Session Modal
  const [completeModal, setCompleteModal] = useState<{
    isOpen: boolean;
    sessionId?: string;
    studentName?: string;
    sessionNumber?: number;
    serviceTitle?: string;
  }>({ isOpen: false });
  const [learningReport, setLearningReport] = useState('');
  const [completeError, setCompleteError] = useState('');

  // View Report Modal
  const [viewReportModal, setViewReportModal] = useState<{
    isOpen: boolean;
    studentName?: string;
    reportNotes?: string;
    sessionNumber?: number;
  }>({ isOpen: false });

  // 1. Fetch Bookings from API
  const { data: bookingsData, isLoading, refetch } = useQuery({
    queryKey: ['tutor-bookings'],
    queryFn: async () => {
      const res = await api.get('/api/v1/tutor/bookings');
      return res.data?.data;
    },
    enabled: !!user && user.role === 'TUTOR',
  });

  const summary = bookingsData?.summary || {
    totalBookings: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    disputedSessions: 0,
    deliverablesPending: 0,
  };

  const sessions = bookingsData?.sessions || [];
  const deliverables = bookingsData?.deliverables || [];

  // Complete Session Mutation
  const completeSessionMutation = useMutation({
    mutationFn: async ({ sessionId, report }: { sessionId: string; report: string }) => {
      const res = await api.post(`/api/v1/sessions/${sessionId}/complete`, {
        learningReport: report,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['tutor-profile'] });
      queryClient.invalidateQueries({ queryKey: ['my-tutor-sessions'] });
      setCompleteModal({ isOpen: false });
      setLearningReport('');
      setCompleteError('');
    },
    onError: (err: unknown) => {
      const parsed = getApiErrorMessage(err);
      setCompleteError(parsed.fieldErrors.learningReport || parsed.message);
    },
  });

  const handleOpenCompleteModal = (s: any) => {
    setCompleteModal({
      isOpen: true,
      sessionId: s.id,
      studentName: s.childName,
      sessionNumber: s.sessionNumber,
      serviceTitle: s.serviceTitle,
    });
    setLearningReport('');
    setCompleteError('');
  };

  const handleSubmitCompleteSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeModal.sessionId) return;
    if (learningReport.trim().length < 10) {
      setCompleteError('Catatan perkembangan belajar minimal 10 karakter.');
      return;
    }

    completeSessionMutation.mutate({
      sessionId: completeModal.sessionId,
      report: learningReport,
    });
  };

  // Helper WhatsApp Link
  const getWhatsAppLink = (phone: string, childName: string, serviceTitle: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('62')) {
      // already 62
    } else {
      clean = '62' + clean;
    }
    const text = encodeURIComponent(
      `Halo Bapak/Ibu, saya guru pendamping ananda ${childName} dari Belajar-Ku untuk mata pelajaran/layanan "${serviceTitle}". Ingin berkoordinasi mengenai jadwal sesi belajar.`
    );
    return `https://wa.me/${clean}?text=${text}`;
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter((s: any) => {
    const matchesSearch =
      s.childName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.serviceTitle.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'SCHEDULED') return s.status === 'SCHEDULED';
    if (statusFilter === 'COMPLETED') return s.status === 'COMPLETED';
    if (statusFilter === 'DISPUTED') return s.status === 'DISPUTED';
    return false;
  });

  if (isAuthLoading || isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Memuat data pemesanan dan jadwal belajar...</p>
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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pemesanan & Sesi Belajar Masuk
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pantau anak didik yang telah memesan jasa Anda, hubungi wali murid via WhatsApp, dan input jurnal belajar untuk mencairkan saldo escrow.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/tutor/services"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <BookOpen className="w-4 h-4 text-brand-600" />
            Layanan Saya
          </Link>
          <Link
            href="/tutor/profile"
            className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Calendar className="w-4 h-4" />
            Atur Jam Ketersediaan
          </Link>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pemesanan</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{summary.totalBookings}</div>
          <div className="text-[11px] text-slate-500 mt-1">Sesi les & dokumen kerja</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Menunggu Sesi</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{summary.upcomingSessions}</div>
          <div className="text-[11px] text-blue-500 mt-1">Siap diajar</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Selesai & Cair</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{summary.completedSessions}</div>
          <div className="text-[11px] text-emerald-500 mt-1">85% Masuk Dompet</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200/80 shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
          <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Kasus Sengketa</div>
          <div className="text-2xl font-black text-rose-700 mt-1">{summary.disputedSessions}</div>
          <div className="text-[11px] text-rose-500 mt-1">Perlu investigasi admin</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({sessions.length})
            </button>
            <button
              onClick={() => setStatusFilter('SCHEDULED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'SCHEDULED'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Menunggu Sesi ({summary.upcomingSessions})
            </button>
            <button
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Selesai ({summary.completedSessions})
            </button>
            <button
              onClick={() => setStatusFilter('DISPUTED')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === 'DISPUTED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sengketa ({summary.disputedSessions})
            </button>
            {deliverables.length > 0 && (
              <button
                onClick={() => setStatusFilter('DELIVERABLE')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  statusFilter === 'DELIVERABLE'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Dokumen Kerja ({deliverables.length})
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari murid, orang tua, materi..."
              className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Content: Sessions List or Deliverables */}
      {statusFilter === 'DELIVERABLE' ? (
        /* Deliverable Orders View */
        <div className="space-y-4">
          {deliverables.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700">Belum Ada Pesanan Dokumen</h3>
              <p className="text-xs text-slate-500 mt-1">
                Pesanan modul ajar atau LPJ dari pihak sekolah akan tampil di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliverables.map((order: any) => (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-800">Invoice: #{order.invoiceNumber}</span>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      {order.deliverableStatus || 'AWAITING_DELIVERY'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {order.items?.[0]?.service?.title || 'Dokumen Jasa Guru'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pemesan: {order.parent?.name} {order.parent?.schoolName ? `(${order.parent.schoolName})` : ''}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-emerald-600">
                      {formatRupiah(order.totalAmount || 0)}
                    </span>
                    <Link
                      href="/tutor/dashboard"
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      Unggah File di Dashboard <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Teaching Sessions Cards */
        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-700">Tidak Ada Sesi Belajar yang Cocok</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Coba ganti filter atau kata kunci pencarian Anda.'
                  : 'Belum ada sesi pemesanan les masuk dari murid saat ini.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSessions.map((s: any) => (
                <div
                  key={s.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:border-brand-200 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top Row: Session Number & Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
                          Sesi #{s.sessionNumber}
                        </span>
                        <span className="text-xs text-slate-400">#{s.invoiceNumber}</span>
                      </div>

                      {s.status === 'SCHEDULED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3 text-blue-600" />
                          Menunggu Sesi
                        </span>
                      )}
                      {s.status === 'COMPLETED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Selesai & Cair
                        </span>
                      )}
                      {s.status === 'DISPUTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Kasus Sengketa
                        </span>
                      )}
                    </div>

                    {/* Service Title */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {s.serviceTitle}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="font-semibold text-brand-600">
                          {s.teachingMode === 'OFFLINE_VISIT' ? '🚗 Guru Datang ke Rumah' : '💻 Les Online (Google Meet)'}
                        </span>
                        <span>•</span>
                        <span>{s.scheduledDate ? formatDate(s.scheduledDate) : 'Tanggal fleksibel'}</span>
                      </div>
                    </div>

                    {/* Student Info Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                            {s.childName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800">{s.childName}</div>
                            <div className="text-[10px] text-slate-500">Jenjang: {s.gradeLevel}</div>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                          Murid Belajar-Ku
                        </span>
                      </div>

                      {/* Learning notes / needs */}
                      {s.learningNotes && (
                        <div className="text-[11px] text-slate-600 bg-white p-2 rounded-xl border border-slate-200/60">
                          <span className="font-bold text-slate-700">Catatan Belajar:</span> {s.learningNotes}
                        </div>
                      )}
                    </div>

                    {/* Parent Contact Box */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-amber-100/80">
                      <div>
                        <div className="text-[10px] font-bold text-amber-700 uppercase">Wali Murid</div>
                        <div className="text-xs font-bold text-slate-800">{s.parentName}</div>
                        <div className="text-[11px] text-slate-500">{s.parentPhone || 'No telp belum diset'}</div>
                      </div>

                      {s.parentPhone && (
                        <a
                          href={getWhatsAppLink(s.parentPhone, s.childName, s.serviceTitle)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="text-xs font-bold text-slate-700">
                      Tarif Sesi: <span className="text-brand-600">{formatRupiah(s.priceSnapshot || 0)}</span>
                    </div>

                    {s.status === 'SCHEDULED' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCompleteModal(s)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selesaikan Sesi</span>
                      </button>
                    )}

                    {s.status === 'COMPLETED' && s.reportNotes && (
                      <button
                        type="button"
                        onClick={() =>
                          setViewReportModal({
                            isOpen: true,
                            studentName: s.childName,
                            sessionNumber: s.sessionNumber,
                            reportNotes: s.reportNotes,
                          })
                        }
                        className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lihat Jurnal Belajar</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Complete Session Modal */}
      {completeModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Konfirmasi Selesai Sesi</h3>
                  <p className="text-xs text-slate-500">
                    Sesi #{completeModal.sessionNumber} - Murid: {completeModal.studentName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompleteModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {completeError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{completeError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCompleteSession} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Jurnal & Catatan Perkembangan Anak <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={learningReport}
                  onChange={(e) => {
                    setLearningReport(e.target.value);
                    if (completeError) setCompleteError('');
                  }}
                  placeholder="Tuliskan materi yang telah dipelajari, pemahaman anak, serta rekomendasi latihan mandiri di rumah (minimal 10 karakter)..."
                  className={`w-full text-xs px-3.5 py-3 rounded-2xl border transition-colors ${
                    completeError
                      ? 'border-rose-400 ring-2 ring-rose-500/10 focus:border-rose-500 text-slate-800'
                      : 'border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800'
                  }`}
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Catatan ini akan dikirimkan kepada orang tua dan tersimpan pada riwayat belajar anak.
                </span>
              </div>

              {/* Escrow payout notification */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Pencairan Saldo Dompet Escrow (85%)
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  Dengan menyelesaikan sesi ini, dana pembayaran akan langsung ditransfer ke saldo dompet akun Anda (dikurangi komisi platform 15%).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCompleteModal({ isOpen: false })}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={completeSessionMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {completeSessionMutation.isPending ? 'Memproses...' : 'Konfirmasi & Selesaikan'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Learning Report Modal */}
      {viewReportModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Jurnal Belajar Anak</h3>
                  <p className="text-xs text-slate-500">
                    Sesi #{viewReportModal.sessionNumber} - Murid: {viewReportModal.studentName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewReportModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
              {viewReportModal.reportNotes}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewReportModal({ isOpen: false })}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
