'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Plus,
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
import { formatDate } from '../../../lib/utils';

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

  if (isAuthLoading) {
    return <div className="p-16 text-center text-slate-500">Memuat profil...</div>;
  }

  if (!user || user.role !== 'PARENT') {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Akses Khusus Orang Tua</h2>
        <p className="text-sm text-slate-500">
          Halaman ini khusus untuk orang tua yang mendampingi proses belajar anak.
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-600 rounded-3xl p-6 sm:p-10 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
            Portal Orang Tua Belajar-Ku
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Halo, {user.name}! 👨‍👩‍👧
          </h1>
          <p className="text-emerald-100 text-sm max-w-lg">
            Pantau profil ananda, jadwal les mendatang, dan laporan kemajuan belajar yang disusun oleh guru privat.
          </p>
        </div>

        <button
          onClick={() => setIsAddStudentOpen(true)}
          className="px-5 py-3 rounded-2xl bg-white text-emerald-800 font-bold text-sm shadow-md hover:bg-emerald-50 transition-all flex items-center gap-2 hover:scale-105 shrink-0"
        >
          <Plus className="w-5 h-5 text-emerald-600" />
          Tambah Profil Anak
        </button>
      </div>

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
    </div>
  );
}
