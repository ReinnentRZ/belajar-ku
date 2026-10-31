'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  GraduationCap,
  MapPin,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
  User,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { ReportSessionModal } from '../../../components/ReportSessionModal';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { DAY_NAMES, formatDate, formatRupiah } from '../../../lib/utils';

export default function TutorDashboardPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'schedule' | 'deliverables' | 'availability' | 'wallet' | 'profile'>('schedule');

  // Complete Session Modal State
  const [completeModal, setCompleteModal] = useState<{
    isOpen: boolean;
    sessionId?: string;
    studentName?: string;
    sessionNumber?: number;
  }>({ isOpen: false });
  const [learningReport, setLearningReport] = useState('');
  const [completeError, setCompleteError] = useState('');

  // Report Modal State
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    sessionId?: string;
    sessionTitle?: string;
  }>({ isOpen: false });

  // Add Availability State
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('15:00');
  const [endTime, setEndTime] = useState('16:30');
  const [availError, setAvailError] = useState('');

  // Update Profile State
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [address, setAddress] = useState('');
  const [profileMessage, setProfileMessage] = useState('');

  // 1. Fetch Tutor Profile & Wallet Balance
  const { data: tutorProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['tutor-profile'],
    queryFn: async () => {
      const res = await api.get('/api/v1/users/tutor/me');
      const data = res.data?.data;
      if (data) {
        setBio(data.bio || '');
        setEducation(data.education || '');
        setAddress(data.address || '');
      }
      return data;
    },
    enabled: !!user && user.role === 'TUTOR',
  });

  // 2. Fetch Tutor Teaching Sessions
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['my-tutor-sessions'],
    queryFn: async () => {
      const res = await api.get('/api/v1/sessions/tutor');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'TUTOR',
  });

  // 3. Fetch Tutor Availabilities
  const { data: availabilities = [], isLoading: isAvailLoading } = useQuery({
    queryKey: ['my-availabilities'],
    queryFn: async () => {
      const res = await api.get('/api/v1/services/availability');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'TUTOR',
  });

  // 4. Fetch Tutor Orders (for Deliverables)
  const { data: myOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['my-tutor-orders'],
    queryFn: async () => {
      const res = await api.get('/api/v1/orders/mine');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'TUTOR',
  });

  const deliverableOrders = myOrders.filter((o: any) => o.serviceType === 'DELIVERABLE_BASED');
  const [uploadingOrderId, setUploadingOrderId] = useState<string | null>(null);

  const handleFileUpload = async (orderId: string, file: File) => {
    if (!file) return;

    // Strict 50MB per-file validation (52,428,800 bytes)
    const MAX_SIZE = 52428800;
    if (file.size > MAX_SIZE) {
      alert(`Ukuran file "${file.name}" melebihi batas maksimal 50MB (${(file.size / 1024 / 1024).toFixed(1)}MB).`);
      return;
    }

    const allowedExtensions = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.zip'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      alert(`Format file "${ext}" tidak didukung. Harap unggah format: .pdf, .docx, .xlsx, .zip`);
      return;
    }

    setUploadingOrderId(orderId);
    try {
      const formData = new FormData();
      formData.append('file', file);

      await api.post(`/api/v1/orders/${orderId}/upload-deliverable`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      queryClient.invalidateQueries({ queryKey: ['my-tutor-orders'] });
      alert('Dokumen berhasil diunggah!');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengunggah file dokumen.';
      alert(msg);
    } finally {
      setUploadingOrderId(null);
    }
  };

  const handleDownload = async (orderId: string, fileId: string, fileName: string) => {
    try {
      const res = await api.get(`/api/v1/orders/${orderId}/deliverables/${fileId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Gagal mengunduh file dokumen.');
    }
  };

  // Mutation: Complete Session
  const completeSessionMutation = useMutation({
    mutationFn: async () => {
      if (!completeModal.sessionId) return;
      await api.post(`/api/v1/sessions/${completeModal.sessionId}/complete`, {
        learningReport,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tutor-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['tutor-profile'] });
      setCompleteModal({ isOpen: false });
      setLearningReport('');
    },
    onError: (err: any) => {
      setCompleteError(err.response?.data?.message || 'Gagal menyelesaikan sesi les.');
    },
  });

  // Mutation: Add Availability
  const addAvailabilityMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/v1/services/availability', {
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
      setAvailError('');
    },
    onError: (err: any) => {
      setAvailError(err.response?.data?.message || 'Gagal menambahkan slot ketersediaan.');
    },
  });

  // Mutation: Delete Availability
  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/services/availability/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-availabilities'] });
    },
  });

  // Mutation: Update Profile
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      await api.put('/api/v1/users/tutor/me', {
        bio,
        education,
        address,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tutor-profile'] });
      setProfileMessage('Profil guru berhasil diperbarui!');
      setTimeout(() => setProfileMessage(''), 3000);
    },
  });

  if (isAuthLoading) {
    return <div className="p-16 text-center text-slate-500">Memuat portal guru...</div>;
  }

  if (!user || user.role !== 'TUTOR') {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Akses Khusus Guru / Tutor</h2>
        <p className="text-sm text-slate-500">
          Silakan masuk dengan akun Guru untuk mengakses portal pengajar.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm"
        >
          Masuk Akun
        </Link>
      </div>
    );
  }

  const upcomingSessions = sessions.filter((s: any) => s.status === 'SCHEDULED');
  const disputedSessions = sessions.filter((s: any) => s.status === 'DISPUTED');
  const completedSessions = sessions.filter((s: any) => s.status === 'COMPLETED');
  const walletBalance = tutorProfile?.walletBalance || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner & Wallet Summary */}
      <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-indigo-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
              Portal Pengajar Belajar-Ku
            </span>
            {tutorProfile?.isVerified && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-400 text-emerald-950 flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Selamat Datang, {user.name}! 👨‍🏫
          </h1>
          <p className="text-brand-100 text-sm max-w-lg">
            Kelola jadwal sesi bimbingan belajar, input laporan perkembangan murid, dan pantau saldo pencairan dompet Anda.
          </p>
        </div>

        {/* Wallet Balance Card */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 min-w-[240px] text-right space-y-1 shadow-inner">
          <div className="text-xs text-brand-200 uppercase font-bold flex items-center justify-end gap-1.5">
            <Wallet className="w-4 h-4 text-accent-300" />
            Saldo Dompet Guru
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white">
            {formatRupiah(walletBalance)}
          </div>
          <div className="text-[11px] text-brand-200">
            Pencairan otomatis per sesi selesai
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'schedule'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Jadwal Mengajar ({sessions.length})
        </button>

        <button
          onClick={() => setActiveTab('deliverables')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'deliverables'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Dokumen Deliverable ({deliverableOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'availability'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Ketersediaan Jam Les ({availabilities.length})
        </button>

        <button
          onClick={() => setActiveTab('wallet')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'wallet'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Dompet & Pencairan
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-4 border-b-2 transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'profile'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          Profil & Kualifikasi
        </button>
      </div>

      {/* Tab 1: Teaching Schedule */}
      {activeTab === 'schedule' && (
        <div className="space-y-8">
          {/* Upcoming Sessions */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              Sesi Mendatang yang Perlu Dilaksanakan ({upcomingSessions.length})
            </h2>

            {isSessionsLoading ? (
              <div className="text-slate-400 text-sm">Memuat jadwal mengajar...</div>
            ) : upcomingSessions.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-500 text-sm">
                Belum ada jadwal sesi mengajar yang aktif.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingSessions.map((s: any) => (
                  <div
                    key={s.id}
                    className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          Sesi #{s.sessionNumber}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {s.startTime} - {s.endTime} WIB
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {s.orderItem?.service?.title}
                      </h3>

                      <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-3 rounded-xl">
                        <div>
                          Murid: <strong>{s.student?.studentName}</strong> ({s.student?.gradeLevel})
                        </div>
                        <div>Jadwal: {formatDate(s.scheduledDate)}</div>
                        {s.student?.learningNotes && (
                          <div className="italic text-slate-500">
                            Catatan: "{s.student.learningNotes}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() =>
                          setCompleteModal({
                            isOpen: true,
                            sessionId: s.id,
                            studentName: s.student?.studentName,
                            sessionNumber: s.sessionNumber,
                          })
                        }
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Selesai & Laporan
                      </button>
                      <button
                        onClick={() =>
                          setReportModal({
                            isOpen: true,
                            sessionId: s.id,
                            sessionTitle: `Sesi #${s.sessionNumber} — ${s.student?.studentName} (${s.orderItem?.service?.title})`,
                          })
                        }
                        className="py-2.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                        title="Laporkan kendala sesi ke admin"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        Laporkan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Disputed Sessions */}
          {disputedSessions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Sesi Dalam Investigasi / Sengketa ({disputedSessions.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {disputedSessions.map((s: any) => (
                  <div
                    key={s.id}
                    className="bg-white p-6 rounded-2xl border border-rose-200 shadow-sm space-y-3 bg-gradient-to-br from-white to-rose-50/20"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-800">
                        Sesi #{s.sessionNumber} — {s.student?.studentName} ({s.student?.gradeLevel})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        DISPUTED
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-slate-900">
                      {s.orderItem?.service?.title}
                    </div>

                    <div className="text-xs text-slate-500">
                      {formatDate(s.scheduledDate)} ({s.startTime} - {s.endTime} WIB)
                    </div>

                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-800">
                      Sesi ini dalam investigasi oleh Admin Belajar-Ku. Pelepasan dana escrow sementara ditahan sampai keputusan sengketa selesai.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Sessions */}
          {completedSessions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Riwayat Sesi yang Telah Selesai ({completedSessions.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedSessions.map((s: any) => (
                  <div
                    key={s.id}
                    className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">
                        Sesi #{s.sessionNumber} — {s.student?.studentName}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        SELESAI & CAIR
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      {formatDate(s.scheduledDate)} ({s.startTime} - {s.endTime})
                    </div>

                    <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs">
                      <span className="font-bold text-emerald-900 block mb-1">
                        Jurnal Belajar yang Dikirimkan:
                      </span>
                      <p className="text-slate-700 italic">"{s.learningReport}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Deliverable Orders */}
      {activeTab === 'deliverables' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Pesanan Dokumen & Administrasi Sekolah ({deliverableOrders.length})
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kelola pengerjaan dokumen, unggah berkas hasil pengerjaan (maksimal 50MB per file), dan pantau persetujuan klien.
              </p>
            </div>
          </div>

          {isOrdersLoading ? (
            <div className="text-slate-400 text-sm py-8 text-center">Memuat data pesanan dokumen...</div>
          ) : deliverableOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="text-slate-700 font-bold">Belum Ada Pesanan Dokumen</div>
              <p className="text-slate-500 text-xs max-w-md mx-auto">
                Pesanan administrasi guru atau dokumen sekolah dari institusi/guru akan tampil di sini untuk Anda kerjakan dan unggah berkasnya.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {deliverableOrders.map((ord: any) => {
                const item = ord.items?.[0];
                const attachments = ord.attachments || [];
                const clientName = ord.user?.name || ord.user?.email || 'Klien Institusi';
                const schoolName = ord.user?.schoolName;

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            {ord.invoiceNumber || ord.id.slice(0, 8)}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              ord.deliverableStatus === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.deliverableStatus === 'DELIVERED'
                                ? 'bg-blue-100 text-blue-800'
                                : ord.deliverableStatus === 'REVISION_REQUESTED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.deliverableStatus === 'AWAITING_DELIVERY' && 'Menunggu Unggah Hasil'}
                            {ord.deliverableStatus === 'DELIVERED' && 'Sudah Dikirim (Menunggu Review Klien)'}
                            {ord.deliverableStatus === 'REVISION_REQUESTED' && 'Permintaan Revisi dari Klien'}
                            {ord.deliverableStatus === 'COMPLETED' && 'Pekerjaan Selesai & Dana Dicairkan'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          {item?.service?.title || 'Jasa Administrasi Guru'}
                        </h3>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Pemesan: <strong className="text-slate-800">{clientName}</strong></span>
                          {schoolName && (
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">
                              🏫 {schoolName}
                            </span>
                          )}
                          <span>•</span>
                          <span>Tanggal Order: {formatDate(ord.createdAt)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-slate-400">Total Pembayaran Klien</div>
                        <div className="text-lg font-black text-slate-900">
                          {formatRupiah(ord.totalAmount)}
                        </div>
                        <div className="text-[11px] text-emerald-600 font-semibold">
                          Pendapatan Tutor (85%): {formatRupiah(Number(ord.totalAmount) * 0.85)}
                        </div>
                      </div>
                    </div>

                    {/* Order Notes from Client */}
                    {item?.notes && (
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs">
                        <div className="font-bold text-slate-700 mb-1">Catatan Kebutuhan dari Klien:</div>
                        <p className="text-slate-600 whitespace-pre-line">{item.notes}</p>
                      </div>
                    )}

                    {/* Revision Request Banner if any */}
                    {ord.deliverableStatus === 'REVISION_REQUESTED' && ord.revisionNotes && (
                      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs space-y-1">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Permintaan Revisi (Revisi ke-{ord.revisionCount} / {ord.maxRevisions || 2}):
                        </div>
                        <p className="text-amber-800 whitespace-pre-line">{ord.revisionNotes}</p>
                      </div>
                    )}

                    {/* Attachment List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Berkas Deliverable Terunggah ({attachments.length})
                      </h4>

                      {attachments.length === 0 ? (
                        <div className="text-xs text-slate-400 italic">
                          Belum ada berkas yang diunggah untuk pesanan ini.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {attachments.map((att: any) => (
                            <div
                              key={att.id}
                              className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
                                <div className="truncate">
                                  <div className="text-xs font-semibold text-slate-800 truncate" title={att.fileName}>
                                    {att.fileName}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {(att.fileSize / 1024 / 1024).toFixed(2)} MB • {formatDate(att.uploadedAt)}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDownload(ord.id, att.id, att.fileName)}
                                className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition shrink-0 ml-2"
                                title="Unduh Berkas"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Upload Box (Only if not completed) */}
                    {ord.deliverableStatus !== 'COMPLETED' && (
                      <div className="bg-indigo-50/50 rounded-2xl p-5 border border-dashed border-indigo-200 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Upload className="w-4 h-4 text-indigo-600" />
                              Unggah Berkas Hasil Pekerjaan (Maks. 50MB per file)
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Format didukung: <code>.pdf</code>, <code>.docx</code>, <code>.xlsx</code>, <code>.zip</code>. Berkas akan langsung tersimpan secara aman di volume persistent server.
                            </div>
                          </div>

                          <label
                            className={`cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm shrink-0 ${
                              uploadingOrderId === ord.id
                                ? 'bg-indigo-300 text-white cursor-not-allowed'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                          >
                            {uploadingOrderId === ord.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Mengunggah...
                              </>
                            ) : (
                              <>
                                <Upload className="w-3.5 h-3.5" />
                                Pilih Berkas
                              </>
                            )}
                            <input
                              type="file"
                              disabled={uploadingOrderId === ord.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(ord.id, file);
                                }
                                e.target.value = '';
                              }}
                              className="hidden"
                              accept=".pdf,.docx,.doc,.xlsx,.xls,.zip"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Availability Manager */}
      {activeTab === 'availability' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Slot Form */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-600" />
              Tambah Ketersediaan Jam
            </h3>

            {availError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {availError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addAvailabilityMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Hari dalam Seminggu
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
                >
                  <option value={1}>Senin</option>
                  <option value={2}>Selasa</option>
                  <option value={3}>Rabu</option>
                  <option value={4}>Kamis</option>
                  <option value={5}>Jumat</option>
                  <option value={6}>Sabtu</option>
                  <option value={7}>Minggu</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jam Mulai (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Jam Selesai (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={addAvailabilityMutation.isPending}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
              >
                {addAvailabilityMutation.isPending ? 'Menambahkan...' : 'Simpan Ketersediaan Jam'}
              </button>
            </form>
          </div>

          {/* Current Slots List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Daftar Jam Les Aktif ({availabilities.length})
            </h3>

            {isAvailLoading ? (
              <div className="text-slate-400 text-sm">Memuat jam les...</div>
            ) : availabilities.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-slate-500 text-sm">
                Belum ada jam les yang Anda daftarkan. Tambahkan jadwal agar orang tua murid dapat memilih slot belajar.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {availabilities.map((av: any) => (
                  <div
                    key={av.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        {DAY_NAMES[av.dayOfWeek] || `Hari ${av.dayOfWeek}`}
                      </div>
                      <div className="text-sm font-semibold text-brand-600">
                        {av.startTime} - {av.endTime} WIB
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAvailabilityMutation.mutate(av.id)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      title="Hapus slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Wallet Overview & Revenue Sharing */}
      {activeTab === 'wallet' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Saldo Tersedia (Bersih)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                {formatRupiah(walletBalance)}
              </div>
              <p className="text-[11px] text-slate-500">Siap ditarik ke rekening bank</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Total Pendapatan Kotor
              </span>
              <div className="text-2xl sm:text-3xl font-black text-slate-800">
                {formatRupiah(
                  (tutorProfile?.walletMutations || []).reduce(
                    (acc: number, m: any) => acc + (m.grossAmount || m.amount),
                    0
                  )
                )}
              </div>
              <p className="text-[11px] text-slate-500">Sebelum potongan komisi platform</p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Bagi Hasil Platform (15%)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-amber-600">
                {formatRupiah(
                  (tutorProfile?.walletMutations || []).reduce(
                    (acc: number, m: any) => acc + (m.feeDeducted || 0),
                    0
                  )
                )}
              </div>
              <p className="text-[11px] text-slate-500">Biaya sistem, escrow & promosi</p>
            </div>
          </div>

          {/* Revenue Sharing Information Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-5 rounded-2xl text-xs text-blue-900 space-y-1.5 shadow-sm">
            <div className="font-bold flex items-center gap-1.5 text-blue-950 text-sm">
              <Award className="w-4 h-4 text-blue-600" />
              Transparansi Bagi Hasil Platform (Platform Fee 15%)
            </div>
            <p className="leading-relaxed text-blue-800/90">
              Sistem Belajar-Ku menerapkan skema bagi hasil transparan: <strong>85%</strong> biaya les dicairkan langsung ke dompet guru setiap sesi selesai diverifikasi, dan <strong>15%</strong> digunakan untuk pemeliharaan infrastruktur, perlindungan rekening bersama (escrow), dan pemasaran layanan Anda.
            </p>
          </div>

          {/* Wallet Mutations Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Riwayat Mutasi Saldo & Rincian Potongan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftar mutasi saldo masuk dari sesi yang telah Anda selesaikan
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {(tutorProfile?.walletMutations || []).length} Transaksi
              </span>
            </div>

            {!(tutorProfile?.walletMutations && tutorProfile.walletMutations.length > 0) ? (
              <div className="py-12 text-center text-slate-400 text-sm space-y-2">
                <div className="text-3xl">🪙</div>
                <p>Belum ada mutasi saldo. Selesaikan sesi les pertama Anda untuk mencairkan saldo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-3 font-bold">Waktu</th>
                      <th className="py-3 px-3 font-bold">Keterangan Sesi</th>
                      <th className="py-3 px-3 font-bold text-right">Nilai Kotor (Gross)</th>
                      <th className="py-3 px-3 font-bold text-right">Potongan (15%)</th>
                      <th className="py-3 px-3 font-bold text-right">Bersih Dikreditkan</th>
                      <th className="py-3 px-3 font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tutorProfile.walletMutations.map((m: any) => {
                      const gross = m.grossAmount || m.amount;
                      const fee = m.feeDeducted || Math.round(gross * 0.15);
                      const net = m.netAmount || (gross - fee);
                      const session = m.session;
                      const student = session?.student;

                      return (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                            {formatDate(m.createdAt)}
                          </td>
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-slate-800">
                              {session ? `Sesi #${session.sessionNumber}` : 'Pencairan Sesi'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate max-w-xs">
                              {student ? `Murid: ${student.studentName} (${student.gradeLevel})` : 'Pencairan les'}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                            {formatRupiah(gross)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-semibold text-amber-600 whitespace-nowrap">
                            - {formatRupiah(fee)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-black text-emerald-600 whitespace-nowrap text-sm">
                            + {formatRupiah(net)}
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              DIKREDITKAN
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Profile Editor */}
      {activeTab === 'profile' && (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-brand-600" />
            Pengaturan Kualifikasi & Profil Pengajar
          </h3>

          {profileMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
              {profileMessage}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateProfileMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Latar Belakang Pendidikan / Gelar
              </label>
              <input
                type="text"
                required
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="Misal: S.Pd Pendidikan Guru PAUD / S.Si Matematika..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Wilayah Domisili / Alamat
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Misal: Tebet, Jakarta Selatan"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Biodata & Pendekatan Mengajar (Min. 10 karakter)
              </label>
              <textarea
                rows={4}
                required
                minLength={10}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ceritakan pengalaman mengajar, pendekatan terhadap anak usia dini, dan metode belajar menyenangkan yang Anda gunakan..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="py-3 px-6 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all"
            >
              {updateProfileMutation.isPending ? 'Menyimpan...' : 'Simpan Profil Guru'}
            </button>
          </form>
        </div>
      )}

      {/* Selesaikan Sesi Modal */}
      {completeModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Konfirmasi Selesai Sesi #{completeModal.sessionNumber}
              </h3>
              <button
                onClick={() => setCompleteModal({ isOpen: false })}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Murid: <strong>{completeModal.studentName}</strong>. Tuliskan laporan kemajuan materi agar orang tua dapat memantau perkembangan belajar.
            </p>

            {completeError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {completeError}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                completeSessionMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jurnal / Laporan Belajar Siswa (Min. 10 karakter)
                </label>
                <textarea
                  rows={4}
                  required
                  minLength={10}
                  value={learningReport}
                  onChange={(e) => setLearningReport(e.target.value)}
                  placeholder="Misal: Ananda sudah mampu membaca suku kata ba-bi-bu-be-bo dan bersemangat saat menghitung balok kayu..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCompleteModal({ isOpen: false })}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={completeSessionMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {completeSessionMutation.isPending ? 'Memproses Escrow...' : 'Konfirmasi Selesai & Klaim Saldo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report Session Modal */}
      <ReportSessionModal
        isOpen={reportModal.isOpen}
        onClose={() => setReportModal({ isOpen: false })}
        sessionId={reportModal.sessionId || ''}
        sessionTitle={reportModal.sessionTitle || ''}
      />
    </div>
  );
}
