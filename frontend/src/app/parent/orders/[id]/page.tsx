'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  FileText,
  GraduationCap,
  Layers,
  MapPin,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import api from '../../../../lib/api';
import { formatDate, formatRupiah } from '../../../../lib/utils';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [copiedVA, setCopiedVA] = useState(false);
  const [simulationError, setSimulationError] = useState('');

  // 1. Fetch Order Detail with 3s Polling if WAITING_PAYMENT
  const {
    data: order,
    isLoading: isOrderLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/orders/${orderId}`);
      return res.data?.data;
    },
    enabled: !!orderId && !!user,
    refetchInterval: (query) => {
      const data = query.state.data as any;
      return data?.status === 'WAITING_PAYMENT' ? 3000 : false;
    },
  });

  // 2. Simulate Payment Mutation
  const simulatePaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/api/v1/orders/${orderId}/simulate-payment`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['my-parent-sessions'] });
      setSimulationError('');
    },
    onError: (err: any) => {
      setSimulationError(err.response?.data?.message || 'Gagal menjalankan simulasi pembayaran.');
    },
  });

  const handleCopyVA = (vaNumber: string) => {
    navigator.clipboard.writeText(vaNumber);
    setCopiedVA(true);
    setTimeout(() => setCopiedVA(false), 2000);
  };

  if (isAuthLoading || isOrderLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-slate-500">Memuat rincian tagihan & pembayaran...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <FileText className="w-16 h-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Tagihan Tidak Ditemukan</h2>
        <p className="text-sm text-slate-500">
          ID pesanan tidak valid atau Anda tidak memiliki akses ke tagihan ini.
        </p>
        <Link
          href="/parent/dashboard"
          className="inline-block px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-xs"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    );
  }

  const isPaid = order.status === 'PAID';
  const isWaiting = order.status === 'WAITING_PAYMENT';
  const isCancelled = order.status === 'CANCELLED';

  // Mock Virtual Account number derived from order id
  const mockVANumber = `8809${order.invoiceNumber ? order.invoiceNumber.replace(/\D/g, '').padEnd(10, '7') : '9182374628'}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/parent/dashboard"
            className="text-xs font-semibold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Kembali ke Dashboard Orang Tua
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Tagihan #{order.invoiceNumber}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dibuat pada {formatDate(order.createdAt)} • ID: {order.id}
          </p>
        </div>

        {/* Dynamic Status Badge */}
        <div className="flex items-center gap-2">
          {isWaiting && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Menunggu Pembayaran
            </span>
          )}

          {isPaid && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              🟢 LUNAS / TERKONFIRMASI
            </span>
          )}

          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
              Pesanan Dibatalkan
            </span>
          )}
        </div>
      </div>

      {/* LUNAS Banner Animation (Celebration) */}
      {isPaid && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-emerald-500/10 flex flex-col sm:flex-row items-center gap-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-10 h-10 text-white animate-bounce" />
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-extrabold tracking-tight">Pembayaran Berhasil Dikonfirmasi!</h2>
            <p className="text-xs text-emerald-50 leading-relaxed max-w-xl">
              Dana Anda telah diamankan oleh sistem Garansi Escrow Belajar-Ku. Sesi belajar telah resmi dijadwalkan dan dapat Anda pantau langsung dari jadwal kalender ananda.
            </p>
            <div className="pt-3 flex flex-wrap gap-2.5 justify-center sm:justify-start">
              <Link
                href="/parent/dashboard"
                className="px-4 py-2 rounded-xl bg-white text-emerald-700 font-bold text-xs shadow-md hover:bg-emerald-50 transition-colors"
              >
                Lihat Jadwal di Dashboard
              </Link>
              <Link
                href="/services"
                className="px-4 py-2 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
              >
                Cari Les Lainnya
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Details + Payment Box */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Order Items & Schedule (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-600" />
                Rincian Layanan yang Dipesan
              </h2>
              <span className="text-xs text-slate-400">Total {order.items?.length || 0} Item</span>
            </div>

            {/* Items List */}
            <div className="space-y-4">
              {order.items?.map((item: any) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {item.service?.title || 'Layanan Belajar-Ku'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pengajar: <span className="font-semibold text-slate-700">{item.tutor?.user?.name || 'Tutor Terpilih'}</span>
                      </p>
                    </div>
                    <span className="text-xs font-bold text-brand-600">
                      {formatRupiah(item.priceSnapshot || 0)}
                    </span>
                  </div>

                  {/* Student & Teaching Info */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-200/60">
                    <div>
                      <span className="text-slate-400 block">Murid yang Didaftarkan:</span>
                      <span className="font-semibold text-slate-700">
                        {item.student?.studentName || '-'} ({item.student?.gradeLevel || '-'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Metode Belajar:</span>
                      <span className="font-semibold text-slate-700">
                        {item.service?.teachingMode === 'OFFLINE_VISIT' ? '🚗 Guru Datang ke Rumah' : '💻 Les Online (Google Meet)'}
                      </span>
                    </div>
                  </div>

                  {/* Scheduled Sessions if already generated */}
                  {item.bookingSessions && item.bookingSessions.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-600">Jadwal Sesi Terdaftar:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {item.bookingSessions.map((bs: any) => (
                          <span
                            key={bs.id}
                            className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-medium text-slate-700 flex items-center gap-1"
                          >
                            <Calendar className="w-3 h-3 text-brand-500" />
                            {bs.scheduledDate ? formatDate(bs.scheduledDate) : 'Sesi'} ({bs.startTime}-{bs.endTime})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Price Summary Breakdown */}
            <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Layanan</span>
                <span className="font-semibold text-slate-800">{formatRupiah(order.totalAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Biaya Platform & Escrow Guard</span>
                <span className="font-semibold text-emerald-600">Gratis (Rp 0)</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                <span>Total Tagihan</span>
                <span className="text-brand-600 text-base">{formatRupiah(order.totalAmount || 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QRIS / Payment Box & Simulation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {isWaiting ? (
            /* Waiting Payment Action Box */
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-600" />
                  Instruksi Pembayaran
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Real-time Polling
                </span>
              </div>

              {simulationError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{simulationError}</span>
                </div>
              )}

              {/* QRIS Code Box */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                  <QrCode className="w-4 h-4 text-slate-700" />
                  QRIS Semua Pembayaran
                </div>

                {/* Dummy QR Graphic */}
                <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-2">
                  <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-900 rounded-xl">
                    <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-slate-900 rounded-sm" />
                    </div>
                    <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-slate-900 rounded-sm" />
                    </div>
                    <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                      <div className="w-4 h-4 bg-slate-900 rounded-sm" />
                    </div>
                    <div className="w-8 h-8 bg-brand-500 rounded-md" />
                  </div>
                  <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">
                    BELAJAR-KU PAY
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Scan QRIS menggunakan GoPay, OVO, Dana, BCA Mobile, atau Livin Mandiri.
                </p>
              </div>

              {/* Virtual Account Box */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-900 uppercase">BCA Virtual Account</span>
                  <button
                    type="button"
                    onClick={() => handleCopyVA(mockVANumber)}
                    className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedVA ? 'Tersalin!' : 'Salin Nomor'}
                  </button>
                </div>
                <div className="text-base font-mono font-extrabold text-indigo-950 tracking-wider">
                  {mockVANumber}
                </div>
              </div>

              {/* Prominent Demo Simulator Button */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <button
                  type="button"
                  onClick={() => simulatePaymentMutation.mutate()}
                  disabled={simulatePaymentMutation.isPending}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-200 fill-amber-200 animate-pulse" />
                  <span>
                    {simulatePaymentMutation.isPending
                      ? 'Memproses Settlement...'
                      : '⚡ Simulasikan Pembayaran Berhasil (Demo Mode)'}
                  </span>
                </button>
                <p className="text-[10px] text-center text-slate-400">
                  Klik tombol di atas untuk menyimulasikan konfirmasi pembayaran webhook otomatis. Status tagihan akan langsung berubah menjadi LUNAS.
                </p>
              </div>
            </div>
          ) : (
            /* Paid Confirmation Card */
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Garansi Belajar Terlindungi</h3>
                  <p className="text-xs text-slate-500">Dana aman di rekening bersama Escrow.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Dana Anda ditahan aman dan baru akan disalurkan kepada pengajar setelah sesi les berhasil dilaksanakan sesuai jadwal.
              </p>

              <div className="pt-2">
                <Link
                  href="/parent/dashboard"
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>Buka Dashboard Belajar</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
