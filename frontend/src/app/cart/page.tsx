'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Calendar, CheckCircle2, CreditCard, Lock, ShieldCheck, ShoppingBag, Trash2, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { formatRupiah } from '../../lib/utils';

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [checkoutModal, setCheckoutModal] = useState<{
    isOpen: boolean;
    orderId?: string;
    invoiceNumber?: string;
    totalAmount?: number;
    isPaid?: boolean;
  }>({ isOpen: false });

  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Cart
  const { data: cart, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await api.get('/api/v1/cart');
      return res.data?.data;
    },
    enabled: !!user && user.role === 'PARENT',
  });

  // Remove Cart Item Mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await api.delete(`/api/v1/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Checkout Mutation
  const handleCheckout = async () => {
    setErrorMessage('');
    setIsProcessing(true);

    try {
      const res = await api.post('/api/v1/orders/checkout', {});
      if (res.data?.success && res.data?.data) {
        const order = res.data.data;
        queryClient.invalidateQueries({ queryKey: ['cart'] });
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
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gagal memproses simulasi pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <ShoppingBag className="w-16 h-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Silakan Masuk Terlebih Dahulu</h2>
        <p className="text-sm text-slate-500">
          Masuk sebagai Orang Tua untuk melihat dan mengelola keranjang les ananda.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm"
        >
          Masuk ke Akun
        </Link>
      </div>
    );
  }

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Keranjang Belajar Les
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Konfirmasi jadwal les ananda sebelum proses pembayaran
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Garansi Escrow Aman</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Memuat data keranjang...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
            🛒
          </div>
          <h3 className="text-xl font-bold text-slate-800">Keranjang Masih Kosong</h3>
          <p className="text-sm text-slate-500">
            Anda belum menambahkan layanan les privat untuk ananda. Jelajahi katalog kami untuk menemukan guru favorit.
          </p>
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            Jelajahi Katalog Les
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

              return (
                <div
                  key={item.id}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                        {svc.category?.name || 'Paket Les'}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">{svc.title}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <span>Guru: <strong>{tutor?.name}</strong></span>
                        <span>•</span>
                        <span>{svc.sessionCount} Pertemuan</span>
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

                  {/* Student & Slots Breakdown */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4 text-emerald-600" />
                      <span>
                        Murid: <strong>{student?.studentName}</strong> ({student?.gradeLevel})
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-slate-400 font-semibold block mb-1">
                        Jadwal yang Dipesan ({slots.length} Sesi):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {slots.map((s, idx) => (
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
                  <span>Subtotal ({items.length} Paket)</span>
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
                  Saat checkout, jadwal guru langsung dikunci selama 15 menit agar tidak bisa diserobot pengguna lain.
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
                    Jadwal les telah dikunci selama 15 menit. Silakan selesaikan pembayaran.
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
                  <p className="text-sm text-slate-600">
                    Jadwal sesi les telah dibuat permanen di sistem. Guru siap mendampingi ananda belajar!
                  </p>
                </div>

                <button
                  onClick={() => {
                    setCheckoutModal({ isOpen: false });
                    router.push('/parent/dashboard');
                  }}
                  className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all"
                >
                  Buka Jadwal Belajar Anak
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
