'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Building,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Power,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { formatDate, formatRupiah } from '../../../lib/utils';

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const limit = 15;

  // 1. Fetch Users Directory
  const { data: usersData, isLoading, isFetching } = useQuery({
    queryKey: ['admin-users', roleFilter, searchQuery, currentPage],
    queryFn: async () => {
      let url = `/api/v1/admin/users?page=${currentPage}&limit=${limit}`;
      if (roleFilter !== 'ALL') {
        url += `&role=${roleFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await api.get(url);
      return res.data?.data;
    },
    enabled: !!user && user.role === 'ADMIN',
  });

  const usersList = usersData?.users || [];
  const summary = usersData?.summary || {
    totalUsers: 0,
    totalParents: 0,
    totalTutors: 0,
    totalActiveTutors: 0,
    totalInstitutions: 0,
    totalAdmins: 0,
  };
  const pagination = usersData?.pagination || {
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  };

  // 2. Toggle User Status Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.patch(`/api/v1/admin/users/${userId}/toggle-status`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gagal mengubah status akun pengguna.');
    },
  });

  const handleToggleStatus = (targetUser: any) => {
    const actionName = targetUser.isActive ? 'menonaktifkan' : 'mengaktifkan kembali';
    if (confirm(`Apakah Anda yakin ingin ${actionName} akun pengguna "${targetUser.name}" (${targetUser.email})?`)) {
      toggleStatusMutation.mutate(targetUser.id);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Memeriksa hak akses administrator...</p>
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Akses Ditolak (403 Forbidden)</h2>
        <p className="text-sm text-slate-500">
          Halaman ini hanya dapat diakses oleh Administrator Sistem Belajar-Ku.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-xl bg-purple-700 text-white font-semibold text-xs"
        >
          Masuk sebagai Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-purple-700 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Konsol Admin
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span>Direktori & Manajemen Pengguna</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              Admin Portal
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit seluruh basis pengguna Belajar-Ku, pantau verifikasi tutor, serta kelola status aktif/nonaktif akun.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <span>Verifikasi & Sengketa</span>
          </Link>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Pengguna</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{summary.totalUsers}</div>
          <div className="text-[11px] text-slate-500 mt-1">Akun terdaftar di sistem</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Orang Tua Murid</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{summary.totalParents}</div>
          <div className="text-[11px] text-emerald-500 mt-1">Konsumen jasa les</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-200/80 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Guru & Mitra Tutor</div>
          <div className="text-2xl font-black text-blue-700 mt-1">
            {summary.totalActiveTutors} <span className="text-sm font-semibold text-slate-400">/ {summary.totalTutors}</span>
          </div>
          <div className="text-[11px] text-blue-500 mt-1">Tutor terverifikasi aktif</div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-indigo-200/80 shadow-sm bg-gradient-to-br from-indigo-50/50 to-white">
          <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Mitra Sekolah</div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{summary.totalInstitutions}</div>
          <div className="text-[11px] text-indigo-500 mt-1">Institusi & Satuan Pendidikan</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'Semua Akun' },
              { id: 'PARENT', label: 'Orang Tua' },
              { id: 'TUTOR', label: 'Guru / Tutor' },
              { id: 'INSTITUTION', label: 'Sekolah' },
              { id: 'ADMIN', label: 'Admin' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setRoleFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  roleFilter === tab.id
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, email, no HP, sekolah..."
              className="w-full text-xs pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-6">Pengguna</th>
                <th className="py-3.5 px-4">Peran (Role)</th>
                <th className="py-3.5 px-4">Kontak / Institusi</th>
                <th className="py-3.5 px-4">Info Tambahan</th>
                <th className="py-3.5 px-4">Terdaftar Sejak</th>
                <th className="py-3.5 px-4">Status Akun</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <span>Memuat data pengguna...</span>
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-600">Tidak ada data pengguna yang cocok.</p>
                  </td>
                </tr>
              ) : (
                usersList.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* User Identity */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-600'
                              : u.role === 'TUTOR'
                              ? 'bg-blue-600'
                              : u.role === 'INSTITUTION'
                              ? 'bg-indigo-600'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 truncate">{u.name}</div>
                          <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                          {u.tutorProfile?.education && (
                            <div className="text-[11px] text-blue-600 font-medium truncate flex items-center gap-1 mt-0.5">
                              <span>🎓 {u.tutorProfile.education}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'TUTOR'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'INSTITUTION'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role === 'ADMIN'
                          ? '👑 Admin'
                          : u.role === 'TUTOR'
                          ? '👨‍🏫 Guru'
                          : u.role === 'INSTITUTION'
                          ? '🏫 Sekolah'
                          : '👨‍👩‍👧 Orang Tua'}
                      </span>
                    </td>

                    {/* Contact & Institution */}
                    <td className="py-4 px-4">
                      <div className="space-y-0.5">
                        <div className="text-slate-700 font-medium">{u.phone || '-'}</div>
                        {u.schoolName && (
                          <div className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            <span>{u.schoolName}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Extra Role Info */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {u.role === 'TUTOR' && u.tutorProfile ? (
                        <div className="space-y-1">
                          <div>
                            {u.tutorProfile.isVerified ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Terverifikasi
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                                ⏳ Belum Verifikasi
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Saldo: {formatRupiah(u.tutorProfile.walletBalance || 0)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Joined Date */}
                    <td className="py-4 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                      {formatDate(u.createdAt)}
                    </td>

                    {/* Active Status Badge */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Action Toggle */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      {u.role === 'ADMIN' ? (
                        <span className="text-slate-300 text-[11px] italic">Superuser</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(u)}
                          disabled={toggleStatusMutation.isPending}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 ml-auto transition-all ${
                            u.isActive
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{u.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Menampilkan {usersList.length} dari {pagination.total} total pengguna
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold px-2">
                Halaman {currentPage} dari {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                disabled={currentPage >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
