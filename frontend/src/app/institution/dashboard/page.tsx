'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Download,
  FileCheck,
  FileText,
  History,
  Layers,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { formatDate, formatRupiah } from '../../../lib/utils';

export default function InstitutionDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'deliverables' | 'invoices'>('deliverables');

  // Modal State for Requesting a Deliverable Revision
  const [revisionModal, setRevisionModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    maxRevisions: number;
    currentCount: number;
    notes: string;
  }>({ isOpen: false, maxRevisions: 2, currentCount: 0, notes: '' });

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Strict Role Guard
  useEffect(() => {
    if (!isAuthLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'INSTITUTION') {
        if (user.role === 'ADMIN') {
          router.replace('/admin/dashboard');
        } else if (user.role === 'TUTOR') {
          router.replace('/tutor/dashboard');
        } else {
          router.replace('/parent/dashboard');
        }
      }
    }
  }, [user, isAuthLoading, router]);

  // Fetch Institution Orders (for deliverables and invoices)
  const { data: myOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['institution-orders'],
    queryFn: async () => {
      const res = await api.get('/api/v1/orders/mine');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'INSTITUTION',
  });

  // Complete Deliverable Mutation (Escrow Release)
  const completeDeliverableMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await api.post(`/api/v1/orders/${orderId}/complete-deliverable`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-orders'] });
      setSuccessMessage('Pesanan modul/dokumen telah disetujui. Dana escrow telah dicairkan ke konsultan pengajar.');
      setTimeout(() => setSuccessMessage(''), 6000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Gagal menyelesaikan pesanan dokumen.');
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  // Request Revision Mutation
  const requestRevisionMutation = useMutation({
    mutationFn: async ({ orderId, revisionNotes }: { orderId: string; revisionNotes: string }) => {
      const res = await api.post(`/api/v1/orders/${orderId}/request-revision`, {
        revisionNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['institution-orders'] });
      setRevisionModal({ isOpen: false, maxRevisions: 2, currentCount: 0, notes: '' });
      setSuccessMessage('Permintaan revisi telah diajukan ke penyusun modul.');
      setTimeout(() => setSuccessMessage(''), 6000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Gagal mengajukan revisi.');
      setTimeout(() => setErrorMessage(''), 5000);
    },
  });

  // Download Deliverable File Handler
  const handleDownloadDeliverable = async (orderId: string, fileId: string, fileName: string) => {
    try {
      const response = await api.get(
        `/api/v1/orders/${orderId}/deliverables/${fileId}/download`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal mengunduh berkas modul dokumen.');
    }
  };

  // Instant Payment Simulation for Demo
  const handleSimulatePayment = async (invoiceNumber: string) => {
    try {
      await api.post('/api/v1/orders/webhook/payment', {
        invoiceNumber,
        paymentStatus: 'SETTLEMENT',
      });
      queryClient.invalidateQueries({ queryKey: ['institution-orders'] });
      setSuccessMessage(`Pembayaran invoice ${invoiceNumber} berhasil disimulasikan.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Gagal memproses simulasi pembayaran.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  if (isAuthLoading || (user && user.role !== 'INSTITUTION')) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const deliverableOrders = myOrders.filter(
    (o: any) => o.serviceType === 'DELIVERABLE_BASED'
  );

  const activeDeliverables = deliverableOrders.filter(
    (o: any) => o.deliverableStatus !== 'COMPLETED' && o.status !== 'CANCELLED'
  );

  const completedDeliverables = deliverableOrders.filter(
    (o: any) => o.deliverableStatus === 'COMPLETED'
  );

  const waitingPaymentOrders = myOrders.filter(
    (o: any) => o.status === 'WAITING_PAYMENT'
  );

  const totalSpent = myOrders
    .filter((o: any) => o.status === 'PAID')
    .reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Institution Header Banner */}
      <div className="rounded-3xl p-6 sm:p-10 text-white shadow-xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold backdrop-blur-sm">
            <Building2 className="w-3.5 h-3.5" />
            <span>Portal Resmi Institusi Pendidikan & Pihak Sekolah (B2B)</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            {user.schoolName || user.name}
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm leading-relaxed">
            Kelola pengadaan Modul Ajar Kurikulum Merdeka (CP, ATP, LKPD), dokumen akreditasi, dan asistensi LPJ Dana BOS berbasis pengawasan rekening bersama (escrow).
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-indigo-200">
            <span>Penanggung Jawab: <strong>{user.name}</strong></span>
            <span>•</span>
            <span>Email: <strong>{user.email}</strong></span>
            {user.phone && (
              <>
                <span>•</span>
                <span>Kontak: <strong>{user.phone}</strong></span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch gap-3 shrink-0">
          <Link
            href="/modules"
            className="px-5 py-3 rounded-2xl bg-white text-indigo-900 font-bold text-xs sm:text-sm shadow-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>+ Pesan Modul & Dokumen Baru</span>
          </Link>
          <Link
            href="/cart"
            className="px-4 py-3 rounded-2xl bg-indigo-700/60 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm border border-indigo-500/50 transition-all flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Keranjang Belanja</span>
          </Link>
        </div>
      </div>

      {/* Alert Banners */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Pesanan Dokumen Aktif</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {activeDeliverables.length}
          </div>
          <p className="text-[11px] text-slate-500">
            {activeDeliverables.length > 0 ? 'Sedang disusun konsultan / dalam revisi' : 'Semua pesanan selesai'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Dokumen Siap Review</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FileCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700">
            {deliverableOrders.filter((o: any) => o.deliverableStatus === 'SUBMITTED').length}
          </div>
          <p className="text-[11px] text-slate-500">
            Telah diunggah oleh guru dan siap diunduh
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tagihan Menunggu Bayar</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {waitingPaymentOrders.length}
          </div>
          <p className="text-[11px] text-slate-500">
            Invoice aktif yang siap diselesaikan
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Anggaran Teralokasi</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-700">
            {formatRupiah(totalSpent)}
          </div>
          <p className="text-[11px] text-slate-500">
            Total pesanan modul terlindungi rekening bersama
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('deliverables')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'deliverables'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Pesanan Modul & Dokumen Sekolah ({deliverableOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all ${
            activeTab === 'invoices'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Riwayat Tagihan & Invoice ({myOrders.length})</span>
        </button>
      </div>

      {/* TAB 1: B2B DELIVERABLE ORDERS & PROGRESS */}
      {activeTab === 'deliverables' && (
        <div className="space-y-6">
          {isOrdersLoading ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Memuat data modul sekolah...
            </div>
          ) : deliverableOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-3xl">
                📑
              </div>
              <h3 className="text-lg font-bold text-slate-900">Belum Ada Pesanan Modul Sekolah</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sekolah Anda belum memesan Modul Ajar Kurikulum Merdeka atau bantuan administrasi LPJ BOS. Jelajahi katalog resmi untuk memesan.
              </p>
              <Link
                href="/modules"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/20"
              >
                <span>Buka Katalog Modul Sekolah</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {deliverableOrders.map((order: any) => {
                const item = order.items?.[0];
                const svc = item?.service;
                const tutorUser = svc?.tutor?.user;
                const files = order.deliverableFiles || [];
                const maxRevs = svc?.maxRevisions || 2;
                const usedRevs = order.revisionCount || 0;
                const remainingRevs = Math.max(0, maxRevs - usedRevs);

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 hover:border-indigo-300 transition-all"
                  >
                    {/* Header Row: Title & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
                            {order.invoiceNumber}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            Dipesan pada {formatDate(order.createdAt)}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {svc?.title || 'Pengadaan Modul Ajar & Administrasi Sekolah'}
                        </h3>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Konsultan/Penyusun: <strong>{tutorUser?.name || 'Tutor Terverifikasi'}</strong></span>
                          <span>•</span>
                          <span>Jenjang: <strong>{svc?.gradeLevel || 'Semua Jenjang'}</strong></span>
                        </div>
                      </div>

                      {/* Escrow Status Badge */}
                      <div className="text-left sm:text-right space-y-1">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {order.deliverableStatus === 'PENDING'
                              ? '⏳ Dalam Proses Pengerjaan'
                              : order.deliverableStatus === 'SUBMITTED'
                              ? '📥 Menunggu Konfirmasi Anda'
                              : order.deliverableStatus === 'REVISION_REQUESTED'
                              ? '🔄 Sedang Direvisi Konsultan'
                              : '✅ Selesai & Dana Dicairkan'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Total Nilai: <strong className="text-slate-900 font-bold">{formatRupiah(order.totalAmount)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Specifications & Notes */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block mb-0.5">Estimasi Pengerjaan:</span>
                        <span className="font-bold text-slate-800">{svc?.estimatedDays || 3} Hari Kerja</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block mb-0.5">Sisa Kuota Garansi Revisi:</span>
                        <span className="font-bold text-emerald-700">
                          {remainingRevs}x dari {maxRevs}x Revisi
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block mb-0.5">Proteksi Pembayaran:</span>
                        <span className="font-bold text-indigo-700">Rekening Bersama (Escrow)</span>
                      </div>
                      {item?.notes && (
                        <div className="md:col-span-3 pt-2 border-t border-slate-200/60">
                          <span className="text-slate-400 font-semibold block mb-0.5">Catatan/Spesifikasi Sekolah:</span>
                          <span className="text-slate-700 italic">{item.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Uploaded Deliverables Section */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck className="w-4 h-4 text-indigo-600" />
                        <span>Berkas Modul & Dokumen Yang Diunggah ({files.length})</span>
                      </h4>

                      {files.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-800 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>
                            Konsultan pengajar sedang menyusun dokumen sesuai instruksi sekolah Anda. Berkas akan muncul di sini setelah diunggah.
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {files.map((file: any) => (
                            <div
                              key={file.id}
                              className="p-3.5 bg-white rounded-2xl border border-indigo-200/80 shadow-sm flex items-center justify-between gap-3 hover:bg-indigo-50/30 transition-colors"
                            >
                              <div className="space-y-0.5 min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {file.originalName || 'Berkas Dokumen'}
                                </div>
                                <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                  <span>{formatDate(file.uploadedAt)}</span>
                                  <span>•</span>
                                  <span className="font-mono">{(file.fileSize / 1024).toFixed(1)} KB</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownloadDeliverable(order.id, file.id, file.originalName)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all shadow-sm shadow-indigo-600/20"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Escrow Actions (Approve & Complete OR Request Revision) */}
                    {order.status === 'PAID' && order.deliverableStatus !== 'COMPLETED' && (
                      <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-0.5 text-xs text-slate-700">
                          <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                            <ShieldCheck className="w-4 h-4 text-indigo-700" />
                            <span>Persetujuan & Pencairan Dana Escrow</span>
                          </div>
                          <p className="text-slate-600 text-[11px] leading-relaxed">
                            Pastikan berkas telah diperiksa. Menyetujui dokumen akan langsung mencairkan honorarium 85% ke konsultan pengajar.
                          </p>
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0">
                          {remainingRevs > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setRevisionModal({
                                  isOpen: true,
                                  orderId: order.id,
                                  maxRevisions: maxRevs,
                                  currentCount: usedRevs,
                                  notes: '',
                                })
                              }
                              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
                              <span>Minta Revisi ({remainingRevs}x Sisa)</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  'Apakah sekolah Anda telah memeriksa dan menyetujui seluruh berkas dokumen? Tindakan ini akan menyelesaikan pesanan dan merilis dana ke guru.'
                                )
                              ) {
                                completeDeliverableMutation.mutate(order.id);
                              }
                            }}
                            disabled={completeDeliverableMutation.isPending}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>
                              {completeDeliverableMutation.isPending
                                ? 'Memproses...'
                                : 'Setujui & Selesaikan Dokumen'}
                            </span>
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

      {/* TAB 2: INVOICES & BILLING HISTORY */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {myOrders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-3">
              <History className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Belum Ada Riwayat Invoice</h3>
              <p className="text-xs text-slate-500">
                Semua invoice pengadaan modul ajar dan dokumen akan tercatat secara resmi di sini.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Riwayat Tagihan & Pembayaran Sekolah</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data transaksi resmi pengadaan dokumen untuk pelaporan dan audit sekolah
                  </p>
                </div>
                <div className="text-xs text-slate-500 font-semibold">
                  Total: {myOrders.length} Tagihan
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {myOrders.map((ord: any) => {
                  const isPaid = ord.status === 'PAID';
                  const isWaiting = ord.status === 'WAITING_PAYMENT';

                  return (
                    <div
                      key={ord.id}
                      className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {ord.invoiceNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isWaiting
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isPaid ? 'LUNAS (ESCROW AKTIF)' : isWaiting ? 'MENUNGGU PEMBAYARAN' : ord.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>Tanggal: <strong>{formatDate(ord.createdAt)}</strong></span>
                          <span>•</span>
                          <span>{ord.items?.length || 1} Item Layanan</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-xs text-slate-400 uppercase font-semibold">Total Tagihan</div>
                          <div className="text-base font-black text-brand-700">
                            {formatRupiah(ord.totalAmount)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isWaiting && (
                            <button
                              type="button"
                              onClick={() => handleSimulatePayment(ord.invoiceNumber)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Simulasi Bayar</span>
                            </button>
                          )}

                          <Link
                            href={`/parent/orders/${ord.id}`}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <span>Detail Tagihan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Revision Request Modal */}
      {revisionModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Ajukan Revisi Modul Dokumen</h3>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                Sisa Revisi: {Math.max(0, revisionModal.maxRevisions - revisionModal.currentCount)}x
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tuliskan poin-poin yang perlu diperbaiki oleh konsultan pengajar. Sertakan detail materi, penyesuaian kurikulum sekolah, atau format LKPD yang diinginkan.
            </p>

            <textarea
              rows={5}
              value={revisionModal.notes}
              onChange={(e) => setRevisionModal((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Contoh: Mohon tambahkan 2 lembar instrumen asesmen diagnostik dan sesuaikan alokasi waktu JP pada Capaian Pembelajaran Fase B..."
              className="w-full p-3.5 rounded-2xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRevisionModal({ isOpen: false, maxRevisions: 2, currentCount: 0, notes: '' })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
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
                      revisionNotes: revisionModal.notes.trim(),
                    });
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{requestRevisionMutation.isPending ? 'Mengirim Revisi...' : 'Kirim Catatan Revisi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
