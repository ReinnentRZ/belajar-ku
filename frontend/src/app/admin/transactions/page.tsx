'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { formatDate, formatRupiah } from '../../../lib/utils';

export default function AdminTransactionsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Filters & Pagination State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  // Detail Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auth Guard: Admin Only
  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'ADMIN') {
        if (user.role === 'TUTOR') router.replace('/tutor/dashboard');
        else if (user.role === 'INSTITUTION') router.replace('/institution/dashboard');
        else router.replace('/parent/dashboard');
      }
    }
  }, [user, isAuthLoading, router]);

  // 1. Fetch Transactions List with Summary Metrics
  const { data: transactionsData, isLoading: isTransactionsLoading, refetch } = useQuery({
    queryKey: ['admin-transactions', statusFilter, serviceTypeFilter, debouncedSearch, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (serviceTypeFilter !== 'ALL') params.append('serviceType', serviceTypeFilter);
      if (debouncedSearch.trim()) params.append('search', debouncedSearch.trim());
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await api.get(`/api/v1/admin/transactions?${params.toString()}`);
      return res.data;
    },
    enabled: !!user && user.role === 'ADMIN',
  });

  // 2. Fetch Selected Transaction Detail
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-transaction-detail', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await api.get(`/api/v1/admin/transactions/${selectedOrderId}`);
      return res.data?.data;
    },
    enabled: !!user && user.role === 'ADMIN' && !!selectedOrderId,
  });

  // 3. Confirm Manual Payment Mutation (Demo/Support)
  const confirmPaymentMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/api/v1/admin/transactions/${orderId}/confirm-payment`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-transaction-detail', selectedOrderId] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setActionMessage({ type: 'success', text: data.message || 'Pembayaran berhasil dikonfirmasi lunas!' });
      setTimeout(() => setActionMessage(null), 5000);
    },
    onError: (err: any) => {
      setActionMessage({
        type: 'error',
        text: err.response?.data?.message || 'Gagal memproses konfirmasi pembayaran.',
      });
      setTimeout(() => setActionMessage(null), 5000);
    },
  });

  // CSV Exporter (Client-side)
  const handleExportCSV = () => {
    const rows = transactionsData?.data || [];
    if (rows.length === 0) {
      alert('Tidak ada data transaksi untuk diekspor pada filter ini.');
      return;
    }

    const headers = [
      'ID Invoice',
      'Tanggal Dibuat',
      'Tanggal Bayar',
      'Nama Pembeli',
      'Peran Pembeli',
      'Nama Sekolah',
      'Nama Guru',
      'Judul Layanan',
      'Tipe Layanan',
      'Nominal Kotor (GMV)',
      'Bagi Hasil Guru (85%)',
      'Fee Platform (15%)',
      'Progres Escrow',
      'Dana Dicairkan (Rp)',
      'Dana Tertahan Escrow (Rp)',
      'Status Transaksi',
      'Ada Sengketa',
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any) => {
        return [
          `"${row.invoiceNumber}"`,
          `"${formatDate(row.createdAt)}"`,
          `"${row.paidAt ? formatDate(row.paidAt) : '-'}"`,
          `"${row.buyer.name.replace(/"/g, '""')}"`,
          `"${row.buyer.role}"`,
          `"${(row.buyer.schoolName || '-').replace(/"/g, '""')}"`,
          `"${row.tutor.name.replace(/"/g, '""')}"`,
          `"${row.serviceTitle.replace(/"/g, '""')}"`,
          `"${row.serviceType}"`,
          row.grossAmount,
          row.tutorNetShare,
          row.platformFee,
          `"${row.escrowStatus.progressLabel}"`,
          row.escrowStatus.releasedAmount,
          row.escrowStatus.heldEscrowAmount,
          `"${row.orderStatus}"`,
          row.hasDispute ? 'YA' : 'TIDAK',
        ].join(',');
      }),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BelajarKu_Laporan_Transaksi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isAuthLoading || (user && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const transactions = transactionsData?.data || [];
  const pagination = transactionsData?.pagination || { total: 0, page: 1, limit: 15, totalPages: 1 };
  const summary = transactionsData?.summary || {
    totalGMV: 0,
    totalEscrowHeld: 0,
    totalPlatformRevenue: 0,
    totalTutorDisbursed: 0,
    counts: { all: 0, waitingPayment: 0, paid: 0, completed: 0, disputed: 0, cancelled: 0 },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Banner & Control Center Header */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-purple-800/40">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/30">
              Sistem Keuangan & Escrow Ledger
            </span>
            <span className="text-xs text-purple-200/80">• Portal Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-8 h-8 text-purple-400" />
            Riwayat Transaksi & Escrow Platform
          </h1>
          <p className="text-purple-100 text-xs sm:text-sm leading-relaxed">
            Audit komprehensif transaksi B2C (Orang Tua Murid) dan B2B (Sekolah & Institusi). Pantau aliran dana rekening bersama, skema bagi hasil 85% : 15%, dan riwayat pencairan dompet guru.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-white text-purple-950 font-bold text-xs sm:text-sm shadow-md hover:bg-purple-50 transition-all flex items-center gap-2 hover:scale-[1.02]"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2.5 rounded-xl bg-purple-800/60 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm border border-purple-600/50 transition-all flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-purple-300" />
            <span>Pusat Sengketa</span>
          </Link>
        </div>
      </div>

      {/* Global Alerts */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-2.5 animate-in fade-in ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top KPI Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total GMV */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Transaksi (GMV)</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {formatRupiah(summary.totalGMV)}
          </div>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <span>Dari <strong>{summary.counts.paid + summary.counts.completed}</strong> pesanan lunas terverifikasi</span>
          </p>
        </div>

        {/* Card 2: Held Escrow */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Dana di Escrow (Held)</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700">
            {formatRupiah(summary.totalEscrowHeld)}
          </div>
          <p className="text-[11px] text-blue-600/80">
            Aman terkunci hingga sesi selesai / dokumen disetujui
          </p>
        </div>

        {/* Card 3: Platform Revenue 15% */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pendapatan Platform (15%)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {formatRupiah(summary.totalPlatformRevenue)}
          </div>
          <p className="text-[11px] text-emerald-600/80">
            Fee platform bersih yang terealisasi
          </p>
        </div>

        {/* Card 4: Tutor Disbursed 85% */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 hover:border-indigo-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Dana Dicairkan ke Guru (85%)</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-700">
            {formatRupiah(summary.totalTutorDisbursed)}
          </div>
          <p className="text-[11px] text-indigo-600/80">
            Honor mengajar yang telah masuk dompet guru
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID invoice, nama orang tua, sekolah, atau nama guru..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status & Service Type Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Status ({summary.counts.all})</option>
                <option value="WAITING_PAYMENT">Menunggu Bayar ({summary.counts.waitingPayment})</option>
                <option value="PAID">Dibayar / Escrow Aktif ({summary.counts.paid})</option>
                <option value="COMPLETED">Selesai ({summary.counts.completed})</option>
                <option value="DISPUTED">Sengketa ({summary.counts.disputed})</option>
                <option value="CANCELLED">Dibatalkan ({summary.counts.cancelled})</option>
              </select>
            </div>

            {/* Service Type Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-200 text-xs">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-slate-500">Tipe:</span>
              <select
                value={serviceTypeFilter}
                onChange={(e) => {
                  setServiceTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Layanan</option>
                <option value="SESSION_BASED">B2C - Les Privat</option>
                <option value="DELIVERABLE_BASED">B2B - Modul Sekolah</option>
              </select>
            </div>

            <button
              onClick={() => {
                setStatusFilter('ALL');
                setServiceTypeFilter('ALL');
                setSearchQuery('');
                setPage(1);
                refetch();
              }}
              className="p-2.5 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Reset Filter"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Rich Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Daftar Transaksi Platform
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {transactions.length} dari total {pagination.total} transaksi terdaftar
            </p>
          </div>
          <div className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-200">
            Halaman {pagination.page} dari {pagination.totalPages}
          </div>
        </div>

        {isTransactionsLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">Memuat data ledger transaksi...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-800">Tidak Ada Transaksi</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ditemukan data transaksi yang cocok dengan kriteria pencarian atau filter yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6">Invoice & Tanggal</th>
                  <th className="py-3.5 px-4">Pembeli (Buyer)</th>
                  <th className="py-3.5 px-4">Guru & Layanan</th>
                  <th className="py-3.5 px-4 text-right">Nominal Kotor</th>
                  <th className="py-3.5 px-4">Skema Bagi Hasil</th>
                  <th className="py-3.5 px-4">Progres Escrow</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {transactions.map((tx: any) => {
                  const isParent = tx.buyer.role === 'PARENT';
                  const isDeliv = tx.serviceType === 'DELIVERABLE_BASED';

                  return (
                    <tr key={tx.orderId} className="hover:bg-slate-50/80 transition-colors">
                      {/* Column 1: ID & Date */}
                      <td className="py-4 px-4 sm:px-6 space-y-1">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{tx.invoiceNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {formatDate(tx.createdAt)}
                        </div>
                        {tx.paidAt && (
                          <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                            <span>Lunas: {formatDate(tx.paidAt)}</span>
                          </div>
                        )}
                      </td>

                      {/* Column 2: Buyer */}
                      <td className="py-4 px-4 space-y-1">
                        <div className="font-bold text-slate-900">{tx.buyer.name}</div>
                        <div className="text-[11px] text-slate-400">{tx.buyer.email}</div>
                        <div>
                          {isParent ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Users className="w-2.5 h-2.5" />
                              ORANG TUA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              <Building2 className="w-2.5 h-2.5" />
                              {tx.buyer.schoolName ? `INSTITUSI (${tx.buyer.schoolName})` : 'INSTITUSI'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 3: Tutor & Service */}
                      <td className="py-4 px-4 space-y-1 max-w-xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1 truncate">
                          <span>Guru: {tx.tutor.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 line-clamp-1" title={tx.serviceTitle}>
                          {tx.serviceTitle}
                        </div>
                        <div>
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isDeliv
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {isDeliv ? '📑 Modul & Dokumen' : '🎯 Les Privat'}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Gross Amount */}
                      <td className="py-4 px-4 text-right">
                        <div className="font-black text-slate-900 text-sm">
                          {formatRupiah(tx.grossAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400">Total Tagihan</div>
                      </td>

                      {/* Column 5: Split Calculation */}
                      <td className="py-4 px-4 space-y-1 min-w-[140px]">
                        <div className="text-[11px] text-indigo-900 font-semibold flex justify-between">
                          <span className="text-slate-400">85% Guru:</span>
                          <span className="font-bold">{formatRupiah(tx.tutorNetShare)}</span>
                        </div>
                        <div className="text-[11px] text-emerald-900 font-semibold flex justify-between">
                          <span className="text-slate-400">15% Fee:</span>
                          <span className="font-bold">{formatRupiah(tx.platformFee)}</span>
                        </div>
                      </td>

                      {/* Column 6: Escrow Progress */}
                      <td className="py-4 px-4 space-y-1.5 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-700">
                            {tx.escrowStatus.progressLabel}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {tx.escrowStatus.progressPercent}%
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              tx.escrowStatus.progressPercent === 100
                                ? 'bg-emerald-500'
                                : tx.hasDispute
                                ? 'bg-amber-500'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${tx.escrowStatus.progressPercent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between">
                          <span>Cair: <strong>{formatRupiah(tx.escrowStatus.releasedAmount)}</strong></span>
                        </div>
                      </td>

                      {/* Column 7: Status */}
                      <td className="py-4 px-4">
                        {tx.hasDispute ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            SENGKETA (DISPUTED)
                          </span>
                        ) : tx.orderStatus === 'COMPLETED' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            SELESAI (LUNAS)
                          </span>
                        ) : tx.orderStatus === 'PAID' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1 w-fit">
                            <Lock className="w-3 h-3 text-blue-600" />
                            ESCROW AKTIF
                          </span>
                        ) : tx.orderStatus === 'WAITING_PAYMENT' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
                            <Clock className="w-3 h-3 text-amber-600" />
                            MENUNGGU BAYAR
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3 text-slate-500" />
                            {tx.orderStatus}
                          </span>
                        )}
                      </td>

                      {/* Column 8: Action */}
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOrderId(tx.orderId)}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 sm:p-6 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} Total Transaksi)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-3 py-1 text-xs font-bold text-slate-800">
                {page} / {pagination.totalPages}
              </span>

              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Audit Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-4xl w-full rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                    {detailData?.order?.invoiceNumber || 'Detail Transaksi'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {detailData?.order?.createdAt ? formatDate(detailData.order.createdAt) : ''}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  {detailData?.service?.title || 'Audit Transaksi & Escrow Platform'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderId(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isDetailLoading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">Memuat rincian audit transaksi...</p>
              </div>
            ) : !detailData ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Data detail pesanan tidak ditemukan.
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Parties & Financial Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Buyer & Tutor Cards */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                    <div className="font-bold text-slate-900 pb-2 border-b border-slate-200/60 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-purple-600" />
                        Pihak Transaksi
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white font-mono font-bold text-slate-600 border border-slate-200">
                        {detailData.order.serviceType}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pembeli:</span>
                        <span className="font-bold text-slate-800">
                          {detailData.buyer.name} ({detailData.buyer.role})
                        </span>
                      </div>
                      {detailData.buyer.schoolName && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Nama Sekolah:</span>
                          <span className="font-bold text-purple-700">
                            {detailData.buyer.schoolName}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email Pembeli:</span>
                        <span className="text-slate-700">{detailData.buyer.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Kontak:</span>
                        <span className="text-slate-700">{detailData.buyer.phone || '-'}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200/60 flex justify-between">
                        <span className="text-slate-400">Konsultan Guru:</span>
                        <span className="font-bold text-slate-800">{detailData.tutor.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Email Guru:</span>
                        <span className="text-slate-700">{detailData.tutor.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown Card */}
                  <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200/80 space-y-3 text-xs">
                    <div className="font-bold text-purple-950 pb-2 border-b border-purple-200/60 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        Rincian Nilai & Bagi Hasil
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 font-bold text-purple-800">
                        85% : 15% Split
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Nominal Kotor (Gross GMV):</span>
                        <span className="font-black text-slate-900 text-sm">
                          {formatRupiah(detailData.financials.grossAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between text-indigo-900">
                        <span className="text-slate-500">Hak Bersih Guru (85%):</span>
                        <span className="font-bold">{formatRupiah(detailData.financials.tutorNetShare)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-900">
                        <span className="text-slate-500">Fee Platform Belajar-Ku (15%):</span>
                        <span className="font-bold">{formatRupiah(detailData.financials.platformFee)}</span>
                      </div>
                      <div className="pt-2 border-t border-purple-200/60 flex justify-between">
                        <span className="text-slate-500">Dana Dicairkan ke Saldo Guru:</span>
                        <span className="font-bold text-emerald-700">
                          {formatRupiah(detailData.financials.disbursedAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Sisa Dana di Rekening Escrow:</span>
                        <span className="font-black text-blue-700">
                          {formatRupiah(detailData.financials.heldEscrowAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Admin Quick Actions (If WAITING_PAYMENT) */}
                {detailData.order.status === 'WAITING_PAYMENT' && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5 text-amber-900">
                      <div className="font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span>Status: Menunggu Pembayaran dari Pembeli</span>
                      </div>
                      <p className="text-amber-800/80">
                        Transaksi ini belum lunas. Sebagai Administrator, Anda dapat mengonfirmasi pembayaran lunas secara manual untuk keperluan simulasi/demo atau transfer manual.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={confirmPaymentMutation.isPending}
                      onClick={() => confirmPaymentMutation.mutate(detailData.order.id)}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>
                        {confirmPaymentMutation.isPending
                          ? 'Memproses...'
                          : '⚡ Konfirmasi Lunas Manual (Demo)'}
                      </span>
                    </button>
                  </div>
                )}

                {/* 3. Items Breakdown (Sessions or Deliverables) */}
                {detailData.order.serviceType === 'SESSION_BASED' ? (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>Daftar Sesi Pembelajaran & Status Escrow ({detailData.sessions.length} Sesi)</span>
                    </h4>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                          <tr className="border-b border-slate-200">
                            <th className="py-2.5 px-3">Sesi</th>
                            <th className="py-2.5 px-3">Jadwal Belajar</th>
                            <th className="py-2.5 px-3">Status Sesi</th>
                            <th className="py-2.5 px-3">Catatan Jurnal Guru</th>
                            <th className="py-2.5 px-3 text-right">Nilai Escrow Sesi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailData.sessions.map((sess: any) => {
                            const perSessionGross = Math.round(
                              detailData.financials.grossAmount / detailData.sessions.length
                            );
                            const perSessionTutor = Math.round(perSessionGross * 0.85);

                            return (
                              <tr key={sess.id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-bold text-slate-800">
                                  Sesi {sess.sessionNumber}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {formatDate(sess.scheduledDate)} ({sess.startTime} - {sess.endTime} WIB)
                                </td>
                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      sess.status === 'COMPLETED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : sess.status === 'DISPUTED'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {sess.status === 'COMPLETED'
                                      ? '✅ Selesai (Cair)'
                                      : sess.status === 'DISPUTED'
                                      ? '⚠️ Sengketa'
                                      : '⏳ Terjadwal'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 italic max-w-xs truncate">
                                  {sess.learningReport || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                  {formatRupiah(perSessionTutor)} (85%)
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-purple-600" />
                      <span>Berkas Dokumen Kurikulum ({detailData.deliverableFiles.length} Berkas)</span>
                    </h4>

                    {detailData.deliverableFiles.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                        Belum ada berkas dokumen yang diunggah oleh guru.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {detailData.deliverableFiles.map((file: any) => (
                          <div
                            key={file.id}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="truncate mr-2">
                              <div className="font-bold text-slate-800 truncate">{file.fileName}</div>
                              <div className="text-[10px] text-slate-400">
                                {(file.fileSize / 1024).toFixed(1)} KB • {formatDate(file.uploadedAt)}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-purple-700 font-bold shrink-0">
                              Terverifikasi
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {detailData.order.revisionNotes && (
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900">
                        <span className="font-bold block mb-0.5">Catatan Revisi dari Sekolah:</span>
                        <p className="italic">{detailData.order.revisionNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Chronological Audit Trail Timeline */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Jejak Audit Kronologis Transaksi (Timeline)</span>
                  </h4>

                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {detailData.timelineEvents.map((evt: any) => (
                      <div key={evt.id} className="relative text-xs space-y-0.5">
                        {/* Dot indicator */}
                        <div
                          className={`absolute -left-6 top-1 w-2.5 h-2.5 rounded-full border-2 border-white ring-2 ${
                            evt.badgeColor === 'emerald'
                              ? 'bg-emerald-500 ring-emerald-200'
                              : evt.badgeColor === 'purple'
                              ? 'bg-purple-600 ring-purple-200'
                              : evt.badgeColor === 'amber'
                              ? 'bg-amber-500 ring-amber-200'
                              : evt.badgeColor === 'rose'
                              ? 'bg-rose-500 ring-rose-200'
                              : 'bg-blue-500 ring-blue-200'
                          }`}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{evt.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDate(evt.timestamp)}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed text-[11px]">{evt.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Close Button */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                  >
                    Tutup Rincian
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
