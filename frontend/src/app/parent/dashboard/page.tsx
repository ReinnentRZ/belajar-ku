'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { ReportSessionModal } from '../../../components/ReportSessionModal';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { formatDate, formatRupiah } from '../../../lib/utils';

export default function ParentDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Modal State for adding student
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [gradeLevel, setGradeLevel] = useState<'PAUD' | 'TK' | 'SD' | 'SMP'>('PAUD');
  const [learningNotes, setLearningNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Selected session to view full learning report
  const [activeReportSession, setActiveReportSession] = useState<any | null>(null);

  // Modal State for reporting a session problem
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    sessionId?: string;
    sessionTitle?: string;
  }>({ isOpen: false });

  // Modal State for requesting a deliverable revision
  const [revisionModal, setRevisionModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    notes: string;
  }>({ isOpen: false, notes: '' });

  // Fetch Parent's Students
  const { data: students = [], isLoading: isStudentsLoading } = useQuery({
    queryKey: ['my-students'],
    queryFn: async () => {
      const res = await api.get('/api/v1/users/students');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'PARENT',
  });

  // Fetch Parent's Learning Sessions
  const { data: sessions = [], isLoading: isSessionsLoading } = useQuery({
    queryKey: ['my-parent-sessions'],
    queryFn: async () => {
      const res = await api.get('/api/v1/sessions/parent');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'PARENT',
  });

  // Fetch Orders (for deliverables and escrow tracking)
  const { data: myOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: async () => {
      const res = await api.get('/api/v1/orders/mine');
      return res.data?.data || [];
    },
    enabled: !!user && (user.role === 'PARENT' || user.role === 'INSTITUTION'),
  });

  // Add Student Mutation
  const addStudentMutation = useMutation({
    mutationFn: async () => {
      await api.post('/api/v1/users/students', {
        studentName,
        gradeLevel,
        learningNotes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-students'] });
      setIsAddStudentOpen(false);
      setStudentName('');
      setLearningNotes('');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Gagal menambahkan profil anak.');
    },
  });

  // Delete Student Mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/v1/users/students/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-students'] });
    },
  });

  // Complete Deliverable Mutation (Escrow Release: 85% to tutor, 15% to platform)
  const completeDeliverableMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.post(`/api/v1/orders/${orderId}/complete-deliverable`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gagal menyelesaikan pesanan deliverable.');
    },
  });

  // Request Revision Mutation
  const requestRevisionMutation = useMutation({
    mutationFn: async ({ orderId, notes }: { orderId: string; notes: string }) => {
      await api.post(`/api/v1/orders/${orderId}/request-revision`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      setRevisionModal({ isOpen: false, orderId: '', notes: '' });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gagal mengajukan revisi.');
    },
  });

  // Download Deliverable File Handler
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

  if (isAuthLoading) {
    return <div className="p-16 text-center text-slate-500">Memuat profil...</div>;
  }

  if (!user || (user.role !== 'PARENT' && user.role !== 'INSTITUTION')) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Akses Dashboard</h2>
        <p className="text-sm text-slate-500">
          Halaman ini khusus untuk akun Orang Tua Murid atau Pihak Sekolah.
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

  const deliverableOrders = myOrders.filter((o: any) => o.serviceType === 'DELIVERABLE_BASED');
  const upcomingSessions = sessions.filter((s: any) => s.status === 'SCHEDULED');
  const disputedSessions = sessions.filter((s: any) => s.status === 'DISPUTED');
  const completedSessions = sessions.filter((s: any) => s.status === 'COMPLETED');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Welcome Banner */}
      <div
        className={`rounded-3xl p-6 sm:p-10 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
          user.role === 'INSTITUTION'
            ? 'bg-gradient-to-r from-indigo-800 via-indigo-700 to-purple-700'
            : 'bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600'
        }`}
      >
        <div className="space-y-1">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
            {user.role === 'INSTITUTION' ? '🏫 Portal Administrasi Sekolah' : '👨‍👩‍👧 Portal Orang Tua Belajar-Ku'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Halo, {user.name}!
          </h1>
          <p className="text-white/90 text-sm max-w-lg">
            {user.role === 'INSTITUTION'
              ? `Kelola pesanan modul ajar Kurikulum Merdeka dan penyusunan LPJ Dana BOS untuk ${user.schoolName || 'sekolah Anda'}.`
              : 'Pantau profil ananda, jadwal les mendatang, dan laporan kemajuan belajar yang disusun oleh guru privat.'}
          </p>
        </div>

        {user.role === 'PARENT' && (
          <button
            onClick={() => setIsAddStudentOpen(true)}
            className="px-5 py-3 rounded-2xl bg-white text-emerald-800 font-bold text-sm shadow-md hover:bg-emerald-50 transition-all flex items-center gap-2 hover:scale-105 shrink-0"
          >
            <Plus className="w-5 h-5 text-emerald-600" />
            <span>Tambah Profil Anak</span>
          </button>
        )}
      </div>
      {/* Deliverable Orders Section (Prominent for Institution or when Deliverable Orders exist) */}
      {(user.role === 'INSTITUTION' || deliverableOrders.length > 0) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Pesanan Dokumen & Administrasi Sekolah ({deliverableOrders.length})
            </h2>
            <Link
              href="/services?type=teacher"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>+ Pesan Dokumen Baru</span>
            </Link>
          </div>

          {isOrdersLoading ? (
            <div className="text-slate-400 text-sm">Memuat daftar pesanan dokumen...</div>
          ) : deliverableOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">
                Belum ada pesanan dokumen administrasi aktif.
              </p>
              <Link
                href="/services?type=teacher"
                className="inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
              >
                Jelajahi Pojok Administrasi Guru
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {deliverableOrders.map((ord: any) => {
                const item = ord.items?.[0];
                const tutorUser = item?.tutor?.user;
                const status = ord.deliverableStatus || item?.deliverableStatus;
                const attachments = ord.attachments || [];

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl border border-indigo-100 shadow-md p-6 sm:p-8 space-y-6"
                  >
                    {/* Header info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                            {ord.invoiceNumber}
                          </span>
                          <span className="text-xs text-slate-400">
                            {formatDate(ord.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">
                          {item?.service?.title || 'Layanan Dokumen Administrasi'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Penyusun: <strong>{tutorUser?.name}</strong> • Nilai Pesanan: <strong className="text-slate-800">{formatRupiah(ord.totalAmount)}</strong>
                        </p>
                      </div>

                      {/* Status Badge */}
                      <div>
                        {status === 'AWAITING_DELIVERY' && (
                          <span className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-600" /> Sedang Dikerjakan Konsultan
                          </span>
                        )}
                        {status === 'DELIVERED' && (
                          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            <FileText className="w-4 h-4 text-blue-600" /> Dokumen Siap Ditinjau
                          </span>
                        )}
                        {status === 'REVISION_REQUESTED' && (
                          <span className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold flex items-center gap-1.5">
                            <RefreshCw className="w-4 h-4 text-rose-600" /> Revisi Sedang Diproses ({ord.revisionCount}/{ord.maxRevisions}x)
                          </span>
                        )}
                        {status === 'COMPLETED' && (
                          <span className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-600" /> Dokumen Disetujui (Selesai)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Buyer Instructions & Revision Notes */}
                    {item?.notes && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-slate-700 space-y-1">
                        <span className="font-bold text-slate-900 block">Instruksi Awal Pemesanan:</span>
                        <p className="italic text-slate-600">"{item.notes}"</p>
                      </div>
                    )}

                    {ord.revisionNotes && (
                      <div className="bg-rose-50/80 p-4 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                        <span className="font-bold block flex items-center gap-1.5 text-rose-800">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Catatan Revisi Terakhir (Revisi ke-{ord.revisionCount}):
                        </span>
                        <p className="italic text-rose-700">"{ord.revisionNotes}"</p>
                      </div>
                    )}

                    {/* Uploaded Attachments */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-indigo-600" />
                        Dokumen Hasil Kerja ({attachments.length} Berkas)
                      </h4>

                      {attachments.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs text-amber-800">
                          Konsultan belum mengunggah file deliverable. File dokumen akan muncul di sini setelah diunggah.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {attachments.map((att: any) => (
                            <div
                              key={att.id}
                              className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between gap-3 hover:border-indigo-300 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  📄
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-800 truncate" title={att.fileName}>
                                    {att.fileName}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {(att.fileSize / 1024 / 1024).toFixed(2)} MB • {formatDate(att.createdAt)}
                                  </div>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownload(ord.id, att.id, att.fileName)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm shrink-0 transition-colors"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Escrow Review Actions */}
                    {(status === 'DELIVERED' || (status === 'REVISION_REQUESTED' && attachments.length > 0)) && (
                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-indigo-50/40 p-4 rounded-2xl">
                        <div className="text-xs text-slate-600">
                          <strong className="text-slate-800 font-semibold block">Proteksi Escrow Aktif</strong>
                          Silakan tinjau berkas dokumen di atas sebelum menyetujui pelepasan dana ke konsultan.
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                          {ord.revisionCount < ord.maxRevisions && (
                            <button
                              type="button"
                              onClick={() => setRevisionModal({ isOpen: true, orderId: ord.id, notes: '' })}
                              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Ajukan Revisi ({ord.maxRevisions - ord.revisionCount}x tersisa)</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Apakah Anda yakin menyetujui dokumen ini? Dana escrow akan diteruskan ke konsultan dan pesanan dinyatakan selesai.')) {
                                completeDeliverableMutation.mutate(ord.id);
                              }
                            }}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Setujui & Selesaikan</span>
                          </button>
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

      {/* Children Profiles Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Profil Anak ({students.length})
          </h2>
        </div>

        {isStudentsLoading ? (
          <div className="text-slate-400 text-sm">Memuat profil anak...</div>
        ) : students.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
            <User className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-600 font-medium">
              Belum ada profil anak terdaftar.
            </p>
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="text-xs font-bold text-emerald-600 hover:underline"
            >
              + Tambahkan Profil Anak Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {students.map((st: any) => (
              <div
                key={st.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-4 group hover:border-emerald-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {st.gradeLevel === 'PAUD'
                        ? '👶 PAUD (Calistung)'
                        : st.gradeLevel === 'TK'
                        ? '🎨 TK'
                        : st.gradeLevel === 'SD'
                        ? '🎒 SD'
                        : '📐 SMP'}
                    </span>
                    <button
                      onClick={() => deleteStudentMutation.mutate(st.id)}
                      className="text-slate-300 hover:text-rose-500 transition-colors"
                      title="Hapus Profil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{st.studentName}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    "{st.learningNotes || 'Tidak ada catatan khusus'}"
                  </p>
                </div>

                <Link
                  href={`/services?gradeLevel=${st.gradeLevel}`}
                  className="pt-3 border-t border-slate-100 text-xs font-bold text-emerald-700 flex items-center justify-between hover:text-emerald-800"
                >
                  <span>Cari Guru untuk {st.studentName}</span>
                  <span>→</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learning Sessions Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-600" />
          Jadwal Les & Laporan Perkembangan Belajar
        </h2>

        {isSessionsLoading ? (
          <div className="text-slate-400 text-sm">Memuat jadwal sesi les...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3 shadow-sm">
            <Clock className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Belum Ada Sesi Les Aktif</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Setelah memesan paket les di katalog dan menyelesaikan pembayaran, jadwal sesi ananda akan tampil di sini.
            </p>
            <Link
              href="/services"
              className="inline-block px-5 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-xs mt-2"
            >
              Pilih Layanan Les
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upcoming Sessions */}
            {upcomingSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></span>
                  Sesi Mendatang ({upcomingSessions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingSessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700">
                            Sesi #{s.sessionNumber} — {s.orderItem?.service?.title}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                            TERJADWAL
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-900">
                          {formatDate(s.scheduledDate)} ({s.startTime} - {s.endTime})
                        </div>
                        <div className="text-xs text-slate-500">
                          Murid: <strong>{s.student?.studentName}</strong> • Guru: {s.tutor?.user?.name}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Escrow dijamin platform</span>
                        <button
                          onClick={() =>
                            setReportModal({
                              isOpen: true,
                              sessionId: s.id,
                              sessionTitle: `Sesi #${s.sessionNumber} — ${s.student?.studentName} (${s.orderItem?.service?.title})`,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium flex items-center gap-1 transition-colors"
                          title="Laporkan kendala sesi ke admin"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Laporkan Kendala
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disputed Sessions */}
            {disputedSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Sesi Dalam Peninjauan / Sengketa ({disputedSessions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {disputedSessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm space-y-3 bg-gradient-to-br from-white to-rose-50/30"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-rose-800">
                          Sesi #{s.sessionNumber} — {s.student?.studentName}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          DISPUTED
                        </span>
                      </div>

                      <div className="text-sm font-semibold text-slate-900">
                        {formatDate(s.scheduledDate)} ({s.startTime} - {s.endTime})
                      </div>
                      <div className="text-xs text-slate-500">
                        Layanan: {s.orderItem?.service?.title} • Guru: {s.tutor?.user?.name}
                      </div>

                      <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-xs text-rose-800">
                        Sesi ini telah dilaporkan dan sedang ditinjau secara berkala oleh Admin Belajar-Ku.
                        Pencairan dana ke dompet guru ditangguhkan sampai sengketa diselesaikan.
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed Sessions with Learning Reports */}
            {completedSessions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Sesi Selesai & Laporan Belajar Guru ({completedSessions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completedSessions.map((s: any) => (
                    <div
                      key={s.id}
                      className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-emerald-700">
                          Sesi #{s.sessionNumber} — {s.student?.studentName}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          SELESAI
                        </span>
                      </div>

                      <div className="text-xs text-slate-500">
                        {formatDate(s.scheduledDate)} • Guru: {s.tutor?.user?.name}
                      </div>

                      {/* Learning Report Box */}
                      <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/60 text-xs space-y-1">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                          Catatan Perkembangan dari Guru:
                        </span>
                        <p className="text-slate-700 leading-relaxed italic">
                          "{s.learningReport || 'Sesi pembelajaran telah terlaksana dengan baik.'}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Tambah Profil Anak
              </h3>
              <button
                onClick={() => setIsAddStudentOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMessage}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addStudentMutation.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nama Panggilan / Nama Lengkap Anak
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Misal: Budi Pratama"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Jenjang Pendidikan
                </label>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                >
                  <option value="PAUD">👶 PAUD (Calistung / Usia 3-5 Tahun)</option>
                  <option value="TK">🎨 TK (TK A / TK B)</option>
                  <option value="SD">🎒 SD (Sekolah Dasar Kelas 1-6)</option>
                  <option value="SMP">📐 SMP (Sekolah Menengah Pertama)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Catatan Karakter / Kebutuhan Belajar Anak
                </label>
                <textarea
                  rows={3}
                  value={learningNotes}
                  onChange={(e) => setLearningNotes(e.target.value)}
                  placeholder="Misal: Anak suka bernyanyi, mudah bosan bila duduk terlalu lama, butuh pendekatan bermain..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addStudentMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {addStudentMutation.isPending ? 'Menyimpan...' : 'Simpan Profil'}
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

      {/* Revision Modal */}
      {revisionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-rose-600" />
              Ajukan Catatan Revisi Dokumen
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Jelaskan bagian dokumen yang perlu diperbaiki atau disesuaikan oleh konsultan. Konsultan akan menerima notifikasi dan mengunggah versi revisi.
            </p>
            <textarea
              rows={4}
              required
              value={revisionModal.notes}
              onChange={(e) => setRevisionModal({ ...revisionModal, notes: e.target.value })}
              placeholder="Contoh: Pada bagian Capaian Pembelajaran Bab 3, mohon tambahkan indikator asesmen kinerja rubrik skala 1-4..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionModal({ isOpen: false, orderId: '', notes: '' })}
                className="px-4 py-2 rounded-xl text-slate-600 text-xs font-semibold hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!revisionModal.notes.trim() || requestRevisionMutation.isPending}
                onClick={() => {
                  if (revisionModal.orderId && revisionModal.notes.trim()) {
                    requestRevisionMutation.mutate({
                      orderId: revisionModal.orderId,
                      notes: revisionModal.notes,
                    });
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {requestRevisionMutation.isPending ? 'Mengirim...' : 'Kirim Catatan Revisi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
