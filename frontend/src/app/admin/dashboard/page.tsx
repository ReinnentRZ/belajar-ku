'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  Ban,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  Filter,
  GraduationCap,
  Layers,
  Phone,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { formatDate, formatRupiah } from '../../../lib/utils';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'metrics' | 'disputes'>('metrics');
  const [reportStatusFilter, setReportStatusFilter] = useState<string>('ALL');

  // Selected Dispute Report for Resolution Modal
  const [selectedReport, setSelectedReport] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionError, setActionError] = useState('');
  const [selectedAction, setSelectedAction] = useState<
    'REFUND_TO_PARENT' | 'RELEASE_FUNDS_TO_TUTOR' | 'SUSPEND_USER' | 'REJECT_REPORT' | null
  >(null);

  // 1. Fetch Admin Statistics
  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/stats');
      return res.data?.data;
    },
    enabled: !!user && user.role === 'ADMIN',
  });

  // 2. Fetch Unverified Tutors
  const { data: unverifiedTutors = [], isLoading: isTutorsLoading } = useQuery({
    queryKey: ['admin-unverified-tutors'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/tutors/unverified');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'ADMIN',
  });

  // 3. Fetch Reports List
  const { data: reportsData, isLoading: isReportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['admin-reports', reportStatusFilter],
    queryFn: async () => {
      const url =
        reportStatusFilter === 'ALL'
          ? '/api/v1/admin/reports'
          : `/api/v1/admin/reports?status=${reportStatusFilter}`;
      const res = await api.get(url);
      return res.data;
    },
    enabled: !!user && user.role === 'ADMIN',
  });

  const reports = reportsData?.data || [];

  // Mutation: Verify Tutor
  const verifyTutorMutation = useMutation({
    mutationFn: async ({ tutorId, isVerified }: { tutorId: string; isVerified: boolean }) => {
      const res = await api.post(`/api/v1/admin/tutors/${tutorId}/verify`, { isVerified });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-unverified-tutors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  // Mutation: Resolve Dispute Report
  const resolveReportMutation = useMutation({
    mutationFn: async ({
      reportId,
      action,
      adminNotes,
    }: {
      reportId: string;
      action: string;
      adminNotes?: string;
    }) => {
      const res = await api.post(`/api/v1/admin/reports/${reportId}/resolve`, {
        action,
        adminNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedReport(null);
      setSelectedAction(null);
      setAdminNotes('');
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || 'Gagal memproses penyelesaian sengketa.');
    },
  });

  if (isAuthLoading) {
    return (
      <div className="max-w-7xl mx-auto p-16 text-center text-slate-500">
        Memuat Dashboard Administrator...
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Akses Ditolak (Khusus Admin)</h2>
        <p className="text-sm text-slate-500">
          Halaman ini dilindungi dan hanya dapat diakses oleh Administrator Belajar-Ku.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm shadow-md"
        >
          Masuk sebagai Admin
        </Link>
      </div>
    );
  }

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'TUTOR_NO_SHOW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            Guru Tidak Hadir
          </span>
        );
      case 'PARENT_NO_SHOW':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Murid Tidak Hadir
          </span>
        );
      case 'INAPPROPRIATE_BEHAVIOR':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Perilaku Tidak Pantas
          </span>
        );
      case 'POOR_QUALITY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
            Kualitas Rendah
          </span>
        );
      case 'TECHNICAL_ISSUE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Kendala Teknis
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            Lainnya
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
            <Clock className="w-3 h-3" />
            MENUNGGU TINJAUAN
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 flex items-center gap-1">
            <Search className="w-3 h-3" />
            INVESTIGASI
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            SELESAI (RESOLVED)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            DITOLAK
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
              Admin Control Center
            </span>
            <span className="text-xs text-slate-300">Belajar-Ku Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-8 h-8 text-purple-400" />
            Pusat Pengawasan & Resolusi Sengketa
          </h1>
          <p className="text-purple-200 text-sm max-w-xl">
            Audit perputaran transaksi escrow, verifikasi kualifikasi profil guru baru, dan tangani
            sengketa sesi demi menjaga integritas belajar anak.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              refetchStats();
              refetchReports();
            }}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Segarkan Data
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* GMV Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total GMV Transaksi
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatRupiah(stats?.totalGmv || 0)}
          </div>
          <p className="text-[11px] text-slate-400">Total nilai pesanan berstatus PAID</p>
        </div>

        {/* Escrow Held Card */}
        <div className="bg-white p-6 rounded-3xl border border-blue-200/80 shadow-sm space-y-2 bg-gradient-to-br from-white to-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              Dana Escrow Tertahan
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-900">
            {formatRupiah(stats?.heldEscrow || 0)}
          </div>
          <p className="text-[11px] text-blue-600/70">Aman ditahan sampai sesi les dikonfirmasi selesai</p>
        </div>

        {/* Net Platform Revenue Card */}
        <div className="bg-white p-6 rounded-3xl border border-purple-200/80 shadow-sm space-y-2 bg-gradient-to-br from-white to-purple-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">
              Net Fee Platform (15%)
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-900">
            {formatRupiah(stats?.platformRevenue || 0)}
          </div>
          <p className="text-[11px] text-purple-600/70">Pendapatan bersih komisi dari sesi selesai</p>
        </div>

        {/* Pending Disputes Card */}
        <div className="bg-white p-6 rounded-3xl border border-rose-200/80 shadow-sm space-y-2 bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Laporan Sengketa Aktif
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 flex items-center gap-2">
            {stats?.pendingReportsCount || 0}
            {stats?.pendingReportsCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold animate-pulse">
                Butuh Tindakan
              </span>
            )}
          </div>
          <p className="text-[11px] text-rose-600/70">
            {stats?.unverifiedTutorsCount || 0} guru menunggu verifikasi profil
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`py-3.5 px-5 border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'metrics'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building className="w-4 h-4" />
          Verifikasi Guru ({unverifiedTutors.length})
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`py-3.5 px-5 border-b-2 transition-all flex items-center gap-2 relative ${
            activeTab === 'disputes'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="w-4 h-4" />
          Sengketa & Laporkan Sesi ({reports.length})
          {stats?.pendingReportsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {stats.pendingReportsCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Unverified Tutors */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                Permohonan Verifikasi Guru Baru
              </h2>
              <p className="text-xs text-slate-500">
                Tinjau kredensial ijazah, bio, dan alamat calon guru sebelum mengaktifkan tanda
                centang verifikasi resmi.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full w-fit">
              {unverifiedTutors.length} akun belum diverifikasi
            </span>
          </div>

          {isTutorsLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Memuat daftar guru...</div>
          ) : unverifiedTutors.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Semua Guru Telah Terverifikasi!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Tidak ada permohonan verifikasi baru saat ini. Semua profil guru aktif di pasar telah
                diaudit.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {unverifiedTutors.map((tutor: any) => (
                <div
                  key={tutor.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between hover:border-purple-300 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                          {tutor.user?.name}
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            Belum Terverifikasi
                          </span>
                        </h3>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{tutor.user?.email}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {tutor.user?.phone}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <strong className="text-slate-700">Pendidikan / Kualifikasi:</strong>{' '}
                        <span className="text-slate-600">{tutor.education || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-slate-700">Domisili / Wilayah:</strong>{' '}
                        <span className="text-slate-600">{tutor.address || '-'}</span>
                      </div>
                      <div>
                        <strong className="text-slate-700">Bio:</strong>{' '}
                        <span className="text-slate-600 italic">"{tutor.bio || '-'}"</span>
                      </div>
                    </div>

                    {tutor.services?.length > 0 && (
                      <div className="text-xs space-y-1">
                        <span className="font-semibold text-slate-700">Layanan Les:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {tutor.services.map((srv: any) => (
                            <span
                              key={srv.id}
                              className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-100"
                            >
                              {srv.title} ({formatRupiah(srv.price)})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      onClick={() =>
                        verifyTutorMutation.mutate({
                          tutorId: tutor.id,
                          isVerified: true,
                        })
                      }
                      disabled={verifyTutorMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm shadow-purple-600/20 transition-all flex items-center gap-1.5"
                    >
                      <BadgeCheck className="w-4 h-4" />
                      {verifyTutorMutation.isPending ? 'Menyimpan...' : 'Verifikasi Akun Guru'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Dispute Resolution */}
      {activeTab === 'disputes' && (
        <div className="space-y-6">
          {/* Header & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Daftar Laporan & Sengketa Sesi Belajar
              </h2>
              <p className="text-xs text-slate-500">
                Sesi dengan status DISPUTED menahan pencairan dana escrow secara otomatis hingga
                Admin mengambil keputusan.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl w-fit text-xs font-semibold">
              {['ALL', 'PENDING', 'RESOLVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setReportStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    reportStatusFilter === st
                      ? 'bg-white text-purple-700 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'ALL'
                    ? 'Semua'
                    : st === 'PENDING'
                    ? 'Menunggu'
                    : st === 'RESOLVED'
                    ? 'Selesai'
                    : 'Ditolak'}
                </button>
              ))}
            </div>
          </div>

          {isReportsLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Memuat laporan sengketa...</div>
          ) : reports.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Tidak Ada Laporan Ditemukan</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Semua sesi les belajar berjalan dengan tertib tanpa ada sengketa yang perlu
                ditangani pada kategori filter ini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report: any) => {
                const perSessionPrice =
                  report.session?.orderItem?.priceSnapshot &&
                  report.session?.orderItem?.totalSessions
                    ? report.session.orderItem.priceSnapshot /
                      report.session.orderItem.totalSessions
                    : 0;

                return (
                  <div
                    key={report.id}
                    className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        {getReasonBadge(report.reason)}
                        {getStatusBadge(report.status)}
                        <span className="text-xs text-slate-400">
                          ID: {report.id.substring(0, 8)}...
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Dilaporkan: {formatDate(report.createdAt)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      {/* Column 1: Pelapor */}
                      <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                        <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                          Pihak Pelapor
                        </span>
                        <div className="font-semibold text-slate-900">{report.reporter?.name}</div>
                        <div className="text-slate-500">
                          Peran: <strong>{report.reporter?.role}</strong> • {report.reporter?.email}
                        </div>
                        <div className="text-slate-500">Telp: {report.reporter?.phone || '-'}</div>
                      </div>

                      {/* Column 2: Detail Sesi & Guru */}
                      <div className="space-y-1 bg-slate-50 p-3 rounded-xl">
                        <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                          Detail Sesi & Murid
                        </span>
                        <div className="font-semibold text-slate-900">
                          Sesi #{report.session?.sessionNumber} —{' '}
                          {report.session?.orderItem?.service?.title}
                        </div>
                        <div className="text-slate-500">
                          Murid: <strong>{report.session?.student?.studentName}</strong> (
                          {report.session?.student?.gradeLevel})
                        </div>
                        <div className="text-slate-500">
                          Guru Terkait:{' '}
                          <strong>{report.session?.tutor?.user?.name || 'Tutor Belajar'}</strong>
                        </div>
                      </div>

                      {/* Column 3: Nilai Escrow Terkunci */}
                      <div className="space-y-1 bg-blue-50/70 border border-blue-100 p-3 rounded-xl text-blue-900">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-blue-700">
                          Dana Escrow Terkunci
                        </span>
                        <div className="text-base font-black text-blue-900">
                          {formatRupiah(perSessionPrice)}
                        </div>
                        <div className="text-[11px] text-blue-700/80">
                          Invoice: {report.session?.orderItem?.order?.invoiceNumber || '-'}
                        </div>
                        <div className="text-[11px] text-blue-700/80">
                          Status Sesi Saat Ini: <strong>{report.session?.status}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Deskripsi Kronologi */}
                    <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-100 text-xs space-y-1.5">
                      <span className="font-bold text-rose-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        Kronologi / Alasan Pelapor:
                      </span>
                      <p className="text-slate-700 leading-relaxed italic">
                        "{report.description}"
                      </p>
                      {report.evidenceUrl && (
                        <div className="pt-2 flex items-center gap-2">
                          <a
                            href={report.evidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 hover:text-rose-900 underline"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Buka Bukti Lampiran Foto / Screenshot
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Hasil Resolusi Jika Sudah Selesai */}
                    {report.status !== 'PENDING' && (
                      <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1">
                        <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Tindakan Admin: {report.actionTaken || 'REJECT_REPORT'}
                        </span>
                        <div className="text-slate-700">
                          Catatan Admin: "{report.adminNotes || 'Tidak ada catatan tambahan'}"
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Ditangani oleh {report.resolvedBy?.name || 'Admin'} pada{' '}
                          {formatDate(report.resolvedAt)}
                        </div>
                      </div>
                    )}

                    {/* Action Button for Pending Reports */}
                    {report.status === 'PENDING' && (
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                        <button
                          onClick={() => {
                            setSelectedReport(report);
                            setSelectedAction(null);
                            setAdminNotes('');
                            setActionError('');
                          }}
                          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
                        >
                          <Scale className="w-4 h-4" />
                          Investigasi & Putuskan Sengketa
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Resolution Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scale className="w-6 h-6 text-purple-600" />
                <h3 className="text-lg font-bold text-slate-900">
                  Keputusan Sengketa Sesi #{selectedReport.session?.sessionNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {actionError}
              </div>
            )}

            {/* Summary of Incident */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Pelapor:</span>
                <span className="font-semibold text-slate-900">
                  {selectedReport.reporter?.name} ({selectedReport.reporter?.role})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Murid & Layanan:</span>
                <span className="text-slate-800">
                  {selectedReport.session?.student?.studentName} —{' '}
                  {selectedReport.session?.orderItem?.service?.title}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Tutor:</span>
                <span className="text-slate-800">
                  {selectedReport.session?.tutor?.user?.name} ({selectedReport.session?.tutor?.user?.phone})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">Nilai Escrow Sesi:</span>
                <span className="text-slate-900 font-bold">
                  {formatRupiah(
                    selectedReport.session?.orderItem?.priceSnapshot /
                      selectedReport.session?.orderItem?.totalSessions
                  )}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Kronologi:</span>
                <p className="italic text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                  "{selectedReport.description}"
                </p>
              </div>

              {selectedReport.evidenceUrl && (
                <div className="pt-2">
                  <span className="font-bold text-slate-700 block mb-1">Bukti Foto / Lampiran:</span>
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-100">
                    <img
                      src={selectedReport.evidenceUrl}
                      alt="Bukti Sengketa"
                      className="w-full h-auto object-cover max-h-48"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <a
                    href={selectedReport.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 mt-1 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Buka gambar di tab baru
                  </a>
                </div>
              )}
            </div>

            {/* Resolution Options */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Pilih Opsi Tindakan Resolusi (Wajib):
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. REFUND_TO_PARENT */}
                <button
                  type="button"
                  onClick={() => setSelectedAction('REFUND_TO_PARENT')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all ${
                    selectedAction === 'REFUND_TO_PARENT'
                      ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                    <XCircle className="w-4 h-4" />
                    Refund ke Orang Tua
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Batalkan sesi dan tahan pembayaran kepada tutor agar dana kembali ke orang tua.
                  </p>
                </button>

                {/* 2. RELEASE_FUNDS_TO_TUTOR */}
                <button
                  type="button"
                  onClick={() => setSelectedAction('RELEASE_FUNDS_TO_TUTOR')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all ${
                    selectedAction === 'RELEASE_FUNDS_TO_TUTOR'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Lepas Escrow ke Tutor
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Tandai sesi selesai dan cairkan saldo bersih (-15% fee) ke dompet guru.
                  </p>
                </button>

                {/* 3. SUSPEND_USER */}
                <button
                  type="button"
                  onClick={() => setSelectedAction('SUSPEND_USER')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all ${
                    selectedAction === 'SUSPEND_USER'
                      ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                    <Ban className="w-4 h-4" />
                    Bekukan Akun Pelanggar
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Nonaktifkan akun pengguna (isActive: false) dan batalkan sesi ini.
                  </p>
                </button>

                {/* 4. REJECT_REPORT */}
                <button
                  type="button"
                  onClick={() => setSelectedAction('REJECT_REPORT')}
                  className={`p-3.5 rounded-2xl border text-left space-y-1 transition-all ${
                    selectedAction === 'REJECT_REPORT'
                      ? 'border-purple-500 bg-purple-50/50 ring-2 ring-purple-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4" />
                    Tolak Laporan Sengketa
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight">
                    Kembalikan status sesi ke SCHEDULED agar pembelajaran dapat dilanjutkan.
                  </p>
                </button>
              </div>
            </div>

            {/* Admin Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                Catatan Investigasi / Alasan Keputusan Admin
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Tuliskan justifikasi audit dan bukti verifikasi telepon/chat..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                disabled={resolveReportMutation.isPending}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedAction || resolveReportMutation.isPending}
                onClick={() => {
                  if (!selectedAction) return;
                  resolveReportMutation.mutate({
                    reportId: selectedReport.id,
                    action: selectedAction,
                    adminNotes,
                  });
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
              >
                <Scale className="w-4 h-4" />
                {resolveReportMutation.isPending ? 'Mengeksekusi Keputusan...' : 'Eksekusi Putusan Sengketa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
