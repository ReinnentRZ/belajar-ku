'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  Lock,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    isPaid?: boolean;
  }>({ isOpen: false });

  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Cart (Explicitly enabled for PARENT and INSTITUTION)
  const { data: cart, isLoading, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/api/v1/cart');
      return res.data?.data;
    },
    enabled: !!user && (user.role === 'PARENT' || user.role === 'INSTITUTION'),
    refetchOnMount: 'always',
    staleTime: 0,
  });

  // Listen to 'cart-updated' window event to keep cart synchronized in real-time
  useEffect(() => {
    const handleCartUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      refetch();
    };

    window.addEventListener('cart-updated', handleCartUpdated);
    return () => window.removeEventListener('cart-updated', handleCartUpdated);
  }, [queryClient, refetch]);

  // Remove Cart Item Mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/api/v1/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }
    },
  });

  // Checkout Mutation
  const handleCheckout = async () => {
    setErrorMessage('');
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'PARENT' && user.role !== 'INSTITUTION') {
      setErrorMessage(
        `Anda masuk sebagai ${
          user.role === 'TUTOR' ? 'Guru' : 'Admin'
        }. Mode pemesanan hanya tersedia untuk akun Orang Tua atau Institusi.`
      );
      return;
    }

    setIsProcessing(true);

    try {
      const res = await api.post('/api/v1/orders/checkout', {});
      if (res.data?.success && res.data?.data) {
        const order = res.data.data;
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('cart-updated'));
        }
        setCheckoutModal({
          isOpen: true,
          orderId: order.id,
          invoiceNumber: order.invoiceNumber,
          totalAmount: order.totalAmount,
          isPaid: false,
        });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal melakukan checkout pesanan.';
      setErrorMessage(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock Payment Webhook Simulation
  const handleSimulatePayment = async () => {
    if (!checkoutModal.invoiceNumber) return;
    setIsProcessing(true);

    try {
      await api.post('/api/v1/orders/webhook/payment', {
        invoiceNumber: checkoutModal.invoiceNumber,
        paymentStatus: 'SETTLEMENT',
      });

      setCheckoutModal((prev) => ({ ...prev, isPaid: true }));
      queryClient.invalidateQueries({ queryKey: ['my-parent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['my-orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memproses simulasi pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Memeriksa status akun...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Silakan Masuk Terlebih Dahulu</h2>
        <p className="text-sm text-slate-500">
          Masuk sebagai Orang Tua atau Institusi Sekolah untuk melihat dan mengelola keranjang pesanan Anda.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20"
        >
          Masuk ke Akun
        </Link>
      </div>
    );
  }

  // Supply-side & Admin Isolation Guard
  if (user.role === 'TUTOR' || user.role === 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto text-2xl shadow-sm">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">
            Mode Pemesanan Khusus Pembeli
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Anda masuk sebagai <strong>{user.role === 'TUTOR' ? 'Guru' : 'Admin'}</strong>. Mode pemesanan dan checkout keranjang hanya tersedia untuk akun Orang Tua atau Institusi.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={user.role === 'TUTOR' ? '/tutor/dashboard' : '/admin/dashboard'}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            <span>Kembali ke Dashboard {user.role === 'TUTOR' ? 'Guru' : 'Admin'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;
  const isInstitution = user.role === 'INSTITUTION';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {isInstitution ? 'Keranjang Modul & Dokumen Sekolah' : 'Keranjang Belajar Les'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isInstitution
              ? 'Konfirmasi pesanan modul kurikulum dan dokumen administrasi sebelum proses pembayaran'
              : 'Konfirmasi jadwal bimbingan les sebelum proses pembayaran'}
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4" />
          <span>Garansi Escrow Aman (100% Proteksi)</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {isLoading ? (
        <div className="p-16 text-center text-slate-400 space-y-3">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm">Memuat data keranjang...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
            🛒
          </div>
          <h3 className="text-xl font-bold text-slate-800">Keranjang Masih Kosong</h3>
          <p className="text-sm text-slate-500">
            {isInstitution
              ? 'Anda belum menambahkan paket modul atau dokumen administrasi sekolah.'
              : 'Anda belum menambahkan layanan bimbingan les privat.'}
          </p>
          <Link
            href={isInstitution ? '/modules' : '/services'}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors shadow-md shadow-brand-500/20"
          >
            <span>{isInstitution ? 'Jelajahi Katalog Modul' : 'Jelajahi Katalog Les'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item: any) => {
              const svc = item.service;
              const tutor = svc.tutor?.user;
              const student = item.student;
              const slots = (item.selectedSlots as any[]) || [];
              const isDeliverable = svc.serviceType === 'DELIVERABLE_BASED';

              return (
                <div
                  key={item.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isDeliverable
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-brand-50 text-brand-700 border-brand-200'
                        }`}
                      >
                        {svc.category?.name || (isDeliverable ? 'Modul & Dokumen' : 'Paket Les')}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{svc.title}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span>Penyedia: <strong>{tutor?.name}</strong></span>
                        <span>•</span>
                        <span>
                          {isDeliverable
                            ? `${svc.estimatedDays || 3} Hari Pengerjaan`
                            : `${svc.sessionCount} Pertemuan`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-black text-brand-700">
                        {formatRupiah(svc.price)}
                      </div>
                      <button
                        onClick={() => removeItemMutation.mutate(item.id)}
                        disabled={removeItemMutation.isPending}
                        className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 mt-1 ml-auto font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Hapus
                      </button>
                    </div>
                  </div>

                  {/* Item Breakdown (Session-Based vs Deliverable-Based) */}
                  {isDeliverable ? (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Format Berkas:
                        </span>
                        <span className="font-mono font-bold text-indigo-700">
                          {(svc.deliverableFormats && svc.deliverableFormats.length > 0
                            ? svc.deliverableFormats
                            : ['DOCX', 'PDF']
                          ).join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                          Garansi Revisi:
                        </span>
                        <span className="font-bold text-emerald-700">
                          {svc.maxRevisions || 2}x Bebas Biaya
                        </span>
                      </div>

                      {item.notes && (
                        <div className="pt-2 border-t border-slate-200/60 text-slate-600">
                          <span className="font-semibold text-slate-700 block mb-0.5">Catatan Spesifikasi:</span>
                          <span className="italic">{item.notes}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                      <div className="flex items-center gap-2 text-slate-700">
                        <User className="w-4 h-4 text-emerald-600" />
                        <span>
                          Murid: <strong>{student?.studentName || '-'}</strong>{' '}
                          {student?.gradeLevel ? `(${student.gradeLevel})` : ''}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60">
                        <span className="text-slate-400 font-semibold block mb-1">
                          Jadwal yang Dipesan ({slots.length} Sesi):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {slots.map((s: any, idx: number) => (
                            <div
                              key={idx}
                              className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 text-slate-700"
                            >
                              <Calendar className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                              <span>
                                Sesi {idx + 1}: <strong>{s.date}</strong> ({s.startTime} - {s.endTime})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {item.teachingAddress && (
                        <div className="text-slate-600 pt-1">
                          Alamat Kunjungan: {item.teachingAddress}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Order Summary & Checkout Card */}
          <div>
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6 sticky top-24">
              <h2 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">
                Ringkasan Pembayaran
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({items.length} Item)</span>
                  <span>{formatRupiah(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Platform</span>
                  <span className="text-emerald-600 font-semibold">Gratis</span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-between text-base font-black text-slate-900">
                  <span>Total Tagihan</span>
                  <span className="text-brand-700">{formatRupiah(totalAmount)}</span>
                </div>
              </div>

              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-200/70 text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-blue-600" />
                  Kunci Slot Otomatis (Redis Lock)
                </div>
                <p className="text-blue-800/80 leading-relaxed">
                  Saat checkout, jadwal guru dan alokasi pengerjaan langsung dikunci selama 15 menit agar aman dan tidak diserobot pengguna lain.
                </p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
              >
                <CreditCard className="w-5 h-5" />
                {isProcessing ? 'Mengunci Jadwal...' : 'Lanjut ke Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal & Mock Payment Simulation */}
      {checkoutModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {!checkoutModal.isPaid ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
                    ⏳
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Pesanan Telah Dibuat</h3>
                  <p className="text-xs text-slate-500">
                    Slot pesanan telah dikunci selama 15 menit. Silakan selesaikan pembayaran.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. Invoice:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {checkoutModal.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Nominal:</span>
                    <span className="font-bold text-brand-700 text-sm">
                      {formatRupiah(checkoutModal.totalAmount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status Pesanan:</span>
                    <span className="font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                      MENUNGGU PEMBAYARAN
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  {/* Mock Payment Simulation Trigger */}
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {isProcessing ? 'Memproses Webhook...' : 'Simulasi Bayar Sekarang (Demo Webhook)'}
                  </button>

                  <Link
                    href={`/parent/orders/${checkoutModal.orderId}`}
                    onClick={() => setCheckoutModal({ isOpen: false })}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Buka Halaman Tagihan & QRIS</span>
                  </Link>

                  <button
                    onClick={() => setCheckoutModal({ isOpen: false })}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs transition-colors"
                  >
                    Tutup Modal
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-6 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl">
                  🎉
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900">Pembayaran Berhasil!</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {isInstitution
                      ? 'Pesanan modul ajar / dokumen kurikulum telah diteruskan ke konsultan pengajar untuk segera diproses!'
                      : 'Jadwal sesi les telah dibuat permanen di sistem. Guru siap mendampingi ananda belajar!'}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setCheckoutModal({ isOpen: false });
                    if (isInstitution) {
                      router.push('/institution/dashboard');
                    } else {
                      router.push('/parent/dashboard');
                    }
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all"
                >
                  {isInstitution ? 'Buka Dashboard Sekolah' : 'Buka Jadwal Belajar Anak'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
