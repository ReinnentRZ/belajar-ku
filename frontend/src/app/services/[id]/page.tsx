'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  GraduationCap,
  Heart,
  Info,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  User,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useCart } from '../../../context/CartContext';
import api, { getApiErrorMessage } from '../../../lib/api';
import { DAY_NAMES, formatRupiah } from '../../../lib/utils';

interface SlotAvailability {
  id?: string;
  dayOfWeek?: number;
  startTime: string;
  endTime: string;
}

function getDayOfWeek(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  const y = parseInt(parts[0] || '1970', 10);
  const m = parseInt(parts[1] || '1', 10);
  const d = parseInt(parts[2] || '1', 10);
  const dateObj = new Date(y, m - 1, d);
  const jsDay = dateObj.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  return jsDay === 0 ? 7 : jsDay;
}

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToCartSync } = useCart();

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [teachingAddress, setTeachingAddress] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<
    Array<{ date: string; startTime: string; endTime: string }>
  >([]);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [selectedAvailTime, setSelectedAvailTime] = useState<SlotAvailability | null>(null);
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('10:30');
  const [slotErrorMsg, setSlotErrorMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Service Details
  const { data: service, isLoading: isServiceLoading } = useQuery({
    queryKey: ['service', serviceId],
    queryFn: async () => {
      const res = await api.get(`/api/v1/services/${serviceId}`);
      return res.data?.data;
    },
    enabled: !!serviceId,
  });

  // Fetch Parent's Student Profiles (if logged in as PARENT)
  const { data: students = [] } = useQuery({
    queryKey: ['my-students'],
    queryFn: async () => {
      const res = await api.get('/api/v1/users/students');
      return res.data?.data || [];
    },
    enabled: !!user && user.role === 'PARENT',
  });

  // Auto-select student if parent has exactly one student profile
  useEffect(() => {
    if (students && students.length === 1 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [students, selectedStudentId]);

  // Route Guard: Hard redirect PARENT users away from B2B deliverable / module services
  useEffect(() => {
    if (
      user?.role === 'PARENT' &&
      service &&
      (service.serviceType === 'DELIVERABLE_BASED' ||
        service.category?.categoryGroup === 'ADMINISTRASI_GURU')
    ) {
      router.replace('/services');
    }
  }, [user, service, router]);

  // Route Guard: Hard redirect INSTITUTION users away from B2C session-based tutoring
  useEffect(() => {
    if (
      user?.role === 'INSTITUTION' &&
      service &&
      service.serviceType === 'SESSION_BASED'
    ) {
      router.replace('/modules');
    }
  }, [user, service, router]);

  const tutor = service?.tutor;
  const tutorUser = tutor?.user;
  const availabilities = tutor?.availabilities || [];

  const handleAddSlot = () => {
    setSlotErrorMsg('');

    if (!newSlotDate) {
      setSlotErrorMsg('Pilih tanggal belajar terlebih dahulu.');
      return;
    }

    // Check if date is in the past
    const todayStr = new Date().toISOString().split('T')[0];
    if (newSlotDate < todayStr) {
      setSlotErrorMsg('Tanggal belajar tidak boleh di masa lalu.');
      return;
    }

    let slotStartTime = '';
    let slotEndTime = '';

    if (availabilities.length === 0) {
      if (!customStartTime || !customEndTime) {
        setSlotErrorMsg('Tentukan jam mulai dan jam selesai belajar.');
        return;
      }
      if (customStartTime >= customEndTime) {
        setSlotErrorMsg('Jam selesai harus lebih akhir dari jam mulai.');
        return;
      }
      slotStartTime = customStartTime;
      slotEndTime = customEndTime;
    } else {
      if (!selectedAvailTime) {
        setSlotErrorMsg('Pilih salah satu jam belajar guru yang tersedia.');
        return;
      }

      // Check day matching
      if (selectedAvailTime.dayOfWeek) {
        const chosenDayOfWeek = getDayOfWeek(newSlotDate);
        if (chosenDayOfWeek !== selectedAvailTime.dayOfWeek) {
          const chosenDayName = DAY_NAMES[chosenDayOfWeek] || `Hari ${chosenDayOfWeek}`;
          const tutorDayName = DAY_NAMES[selectedAvailTime.dayOfWeek] || `Hari ${selectedAvailTime.dayOfWeek}`;
          setSlotErrorMsg(
            `Tanggal ${newSlotDate} jatuh pada hari ${chosenDayName}, sedangkan guru hanya membuka jadwal pada hari ${tutorDayName}. Harap pilih tanggal yang tepat.`
          );
          return;
        }
      }

      slotStartTime = selectedAvailTime.startTime;
      slotEndTime = selectedAvailTime.endTime;
    }

    if (selectedSlots.length >= service.sessionCount) {
      setSlotErrorMsg(`Paket ini hanya untuk ${service.sessionCount} sesi belajar.`);
      return;
    }

    // Check duplicate
    const exists = selectedSlots.some(
      (s) => s.date === newSlotDate && s.startTime === slotStartTime
    );
    if (exists) {
      setSlotErrorMsg(`Slot pada tanggal ${newSlotDate} jam ${slotStartTime} sudah ditambahkan ke jadwal.`);
      return;
    }

    setSelectedSlots([
      ...selectedSlots,
      {
        date: newSlotDate,
        startTime: slotStartTime,
        endTime: slotEndTime,
      },
    ]);
    setSlotErrorMsg('');
  };

  const handleRemoveSlot = (index: number) => {
    setSelectedSlots(selectedSlots.filter((_, i) => i !== index));
  };

  const handleAddToCart = async () => {
    setErrorMsg('');

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'PARENT' && user.role !== 'INSTITUTION') {
      setErrorMsg('Hanya akun Orang Tua atau Pihak Sekolah yang dapat memesan layanan ini.');
      return;
    }

    const isDeliverable = service.serviceType === 'DELIVERABLE_BASED' || service.category?.categoryGroup === 'ADMINISTRASI_GURU';

    if (!isDeliverable) {
      if (!selectedStudentId) {
        setErrorMsg('Pilih profil anak yang akan mengikuti les terlebih dahulu.');
        return;
      }

      if (selectedSlots.length !== service.sessionCount) {
        const remaining = service.sessionCount - selectedSlots.length;
        if (remaining > 0) {
          setErrorMsg(`Pilih ${remaining} jadwal sesi belajar lagi (total harus ${service.sessionCount} sesi).`);
        } else {
          setErrorMsg(`Pilih tepat ${service.sessionCount} jadwal sesi belajar.`);
        }
        return;
      }

      if (service.teachingMode === 'OFFLINE_VISIT' && !teachingAddress.trim()) {
        setErrorMsg('Masukkan alamat lengkap rumah untuk kunjungan guru.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/v1/cart', {
        serviceId: service.id,
        studentId: isDeliverable ? undefined : selectedStudentId,
        selectedSlots: isDeliverable ? [] : selectedSlots,
        notes: isDeliverable ? deliverableNotes : undefined,
        teachingAddress: !isDeliverable && service.teachingMode === 'OFFLINE_VISIT' ? teachingAddress : undefined,
      });

      // Synchronously write to localStorage and notify CartContext
      addToCartSync({
        serviceId: service.id,
        studentId: isDeliverable ? undefined : selectedStudentId,
        selectedSlots: isDeliverable ? [] : selectedSlots,
        notes: isDeliverable ? deliverableNotes : undefined,
        teachingAddress: !isDeliverable && service.teachingMode === 'OFFLINE_VISIT' ? teachingAddress : undefined,
      });

      // Invalidate cart query cache so the cart page renders immediately without stale cache
      await queryClient.invalidateQueries({ queryKey: ['cart'] });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cart-updated'));
      }

      router.push('/cart');
    } catch (err: any) {
      const parsed = getApiErrorMessage(err);
      setErrorMsg(parsed.message || 'Gagal menambahkan ke keranjang.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isServiceLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        Memuat detail layanan les...
      </div>
    );
  }

  // Prevent flash of content if PARENT is being redirected away from a deliverable service
  if (
    user?.role === 'PARENT' &&
    service &&
    (service.serviceType === 'DELIVERABLE_BASED' ||
      service.category?.categoryGroup === 'ADMINISTRASI_GURU')
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-800">Layanan tidak ditemukan</h2>
        <Link href="/services" className="text-brand-600 font-semibold mt-2 inline-block">
          Kembali ke Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb */}
      <div className="text-xs text-slate-500 flex items-center gap-2">
        <Link href="/services" className="hover:text-brand-600">
          Katalog Les
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate">{service.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Details & Qualifications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Title Card */}
          {(() => {
            const isDeliverable = service.serviceType === 'DELIVERABLE_BASED' || service.category?.categoryGroup === 'ADMINISTRASI_GURU';
            return (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    isDeliverable
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-brand-50 text-brand-700 border-brand-200'
                  }`}>
                    {service.category?.name}
                  </span>
                  {isDeliverable ? (
                    <>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-purple-600" /> Jasa Dokumen
                      </span>
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" /> Estimasi {service.estimatedDays || 3} Hari Kerja
                      </span>
                    </>
                  ) : (
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                        service.teachingMode === 'ONLINE'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {service.teachingMode === 'ONLINE' ? (
                        <>
                          <Video className="w-3.5 h-3.5" /> Online (Tatap Muka Virtual)
                        </>
                      ) : (
                        <>
                          <MapPin className="w-3.5 h-3.5" /> Guru Datang ke Rumah (Offline)
                        </>
                      )}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {service.title}
                </h1>

                <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                  {service.description}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Clock className={`w-5 h-5 ${isDeliverable ? 'text-indigo-600' : 'text-brand-600'}`} />
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">
                        {isDeliverable ? 'Waktu Pengerjaan' : 'Durasi'}
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {isDeliverable ? `${service.estimatedDays || 3} Hari Kerja` : `${service.durationMinutes} Menit / Sesi`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {isDeliverable ? (
                      <FileText className="w-5 h-5 text-purple-600" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-accent-600" />
                    )}
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">
                        {isDeliverable ? 'Format File' : 'Jumlah Pertemuan'}
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {isDeliverable
                          ? service.deliverableFormats?.join(', ') || 'DOCX, PDF'
                          : `Paket ${service.sessionCount} Sesi`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {isDeliverable ? (
                      <RefreshCw className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    )}
                    <div>
                      <div className="text-[11px] text-slate-400 font-semibold uppercase">
                        {isDeliverable ? 'Garansi Revisi' : 'Jaminan Belajar'}
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {isDeliverable ? `Maks. ${service.maxRevisions || 2}x Gratis` : 'Escrow Aman'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Syllabus Highlights */}
          {service.syllabusHighlights && service.syllabusHighlights.length > 0 && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-600" />
                Silabus & Rencana Pembelajaran
              </h2>
              <p className="text-xs text-slate-500">
                Materi dan capaian kompetensi yang akan dipelajari ananda selama {service.sessionCount} sesi:
              </p>
              <div className="space-y-2.5 pt-1">
                {service.syllabusHighlights.map((topic: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <span className="text-sm text-slate-700 font-medium leading-relaxed">
                      {topic}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Accommodations Card */}
          {service.specialAccommodations && (
            <div className="bg-gradient-to-br from-amber-50/90 to-amber-100/50 p-6 sm:p-8 rounded-3xl border border-amber-200/80 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-base">
                <Sparkles className="w-5 h-5 text-amber-600" />
                Akomodasi Khusus & Fasilitas Belajar
              </div>
              <p className="text-sm text-amber-950/80 leading-relaxed font-medium">
                {service.specialAccommodations}
              </p>
            </div>
          )}

          {/* Tutor Bio & Qualifications */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-brand-600" />
              Profil & Kualifikasi Guru
            </h2>

            <div className="flex items-start gap-4 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-500 text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md">
                {tutorUser?.name?.charAt(0) || 'G'}
              </div>
              <div className="space-y-1">
                <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                  {tutorUser?.name}
                  {tutor?.isVerified && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Terverifikasi
                    </span>
                  )}
                </div>
                <div className="text-xs text-brand-700 font-semibold flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {tutor?.education || 'Pendidik Profesional'}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {tutor?.address || 'Jabodetabek'}
                </div>
              </div>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {tutor?.bio || 'Berdedikasi untuk membantu anak memahami materi secara menyenangkan dan penuh perhatian.'}
            </p>

            {/* Teaching Credentials / Specific Accreditations */}
            {tutor?.teachingCredentials && (
              <div className="p-4 rounded-2xl bg-brand-50/70 border border-brand-200/80 space-y-1.5">
                <div className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  Sertifikasi & Kredensial Khusus
                </div>
                <p className="text-xs text-brand-800 leading-relaxed font-medium">
                  {tutor.teachingCredentials}
                </p>
              </div>
            )}

            {/* Tutor Personal Accommodations Support */}
            {tutor?.specialAccommodations && (
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-1.5">
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-purple-600" />
                  Kesiapan Mengajar Ramah Anak & Fasilitas Pendukung
                </div>
                <p className="text-xs text-purple-800 leading-relaxed font-medium">
                  {tutor.specialAccommodations}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Scheduling & Cart Checkout */}
        <div className="space-y-6">
          {(() => {
            const isDeliverable = service.serviceType === 'DELIVERABLE_BASED' || service.category?.categoryGroup === 'ADMINISTRASI_GURU';
            return (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6 sticky top-24">
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">
                    {isDeliverable ? 'Biaya Layanan Dokumen' : 'Total Biaya Paket'}
                  </div>
                  <div className={`text-3xl font-black mt-1 ${isDeliverable ? 'text-indigo-700' : 'text-brand-700'}`}>
                    {formatRupiah(service.price)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {isDeliverable
                      ? `Layanan dokumen tuntas siap pakai, termasuk garansi ${service.maxRevisions || 2}x revisi.`
                      : `Sudah termasuk ${service.sessionCount} sesi les dan laporan belajar berkala.`}
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {errorMsg}
                  </div>
                )}

                {user?.role === 'TUTOR' || user?.role === 'ADMIN' ? (
                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto text-xl shadow-inner">
                      ⚠️
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-900">Mode Pemesanan Terbatas</h4>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Anda masuk sebagai <strong>{user.role === 'TUTOR' ? 'Guru' : 'Admin'}</strong>. Mode pemesanan hanya tersedia untuk akun Orang Tua atau Institusi.
                      </p>
                    </div>
                    <Link
                      href={user.role === 'TUTOR' ? '/tutor/dashboard' : '/admin/dashboard'}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                    >
                      <span>Buka Dashboard {user.role === 'TUTOR' ? 'Guru' : 'Admin'}</span>
                    </Link>
                  </div>
                ) : isDeliverable ? (
                  <div className="space-y-5">
                    {/* Deliverable Specifications Card */}
                    <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          Estimasi Pengerjaan:
                        </span>
                        <span className="font-bold text-slate-900">{service.estimatedDays || 3} Hari Kerja</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          Format Output:
                        </span>
                        <div className="flex items-center gap-1 font-mono font-bold text-indigo-700">
                          {(service.deliverableFormats && service.deliverableFormats.length > 0
                            ? service.deliverableFormats
                            : ['DOCX', 'PDF']
                          ).map((fmt: string) => (
                            <span key={fmt} className="px-1.5 py-0.5 bg-white border border-indigo-200 rounded text-[10px]">
                              .{fmt.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                          Garansi Revisi:
                        </span>
                        <span className="font-bold text-emerald-700">{service.maxRevisions || 2}x Bebas Biaya</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Proteksi Escrow:
                        </span>
                        <span className="font-bold text-indigo-800">100% Aman Hingga Selesai</span>
                      </div>
                    </div>

                    {/* Instructions Textarea */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Instruksi & Catatan Khusus Pengerjaan
                      </label>
                      <textarea
                        rows={4}
                        value={deliverableNotes}
                        onChange={(e) => setDeliverableNotes(e.target.value)}
                        placeholder="Contoh: Mohon susun Modul Ajar IPAS Kelas 4 Bab Tumbuhan Sumber Kehidupan di Bumi, sertakan lembar kerja siswa (LKPD) berbasis eksperimen..."
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Sampaikan detail sekolah, kurikulum, topik spesifik, atau instruksi pendukung lainnya.
                      </p>
                    </div>

                    {/* Error Message for Deliverable */}
                    {errorMsg && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{errorMsg}</span>
                      </div>
                    )}

                    {/* Add Deliverable to Cart Button */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {isSubmitting ? 'Menyimpan...' : 'Pesan Dokumen Sekarang'}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Select Student Profile */}
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        1. Pilih Profil Anak
                      </label>
                      {user ? (
                        students.length > 0 ? (
                          <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="w-full py-2.5 px-3 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
                          >
                            <option value="">-- Pilih Profil Anak --</option>
                            {students.map((st: any) => (
                              <option key={st.id} value={st.id}>
                                {st.studentName} ({st.gradeLevel})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded-xl border border-amber-200">
                            Belum ada profil anak.{' '}
                            <Link href="/parent/dashboard" className="font-bold text-amber-700 underline">
                              Tambah profil anak di dashboard
                            </Link>
                          </div>
                        )
                      ) : (
                        <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <Link href="/login" className="font-bold text-brand-600 underline">
                            Masuk ke akun Anda
                          </Link>{' '}
                          untuk memilih profil anak.
                        </div>
                      )}
                    </div>

                    {/* Select Available Slots */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          2. Pilih {service.sessionCount} Jadwal Sesi
                        </label>
                        <span className={`text-xs font-bold ${
                          selectedSlots.length === service.sessionCount
                            ? 'text-emerald-600'
                            : 'text-brand-600'
                        }`}>
                          {selectedSlots.length} / {service.sessionCount} Terpilih
                        </span>
                      </div>

                      {/* Time slot picker */}
                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                        {/* Date Input */}
                        <div>
                          <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Pilih Tanggal Belajar:
                          </span>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={newSlotDate}
                            onChange={(e) => {
                              setNewSlotDate(e.target.value);
                              setSlotErrorMsg('');
                            }}
                            className={`w-full px-3 py-2 rounded-xl border text-xs bg-white focus:outline-none transition-colors ${
                              newSlotDate && selectedAvailTime?.dayOfWeek && getDayOfWeek(newSlotDate) !== selectedAvailTime.dayOfWeek
                                ? 'border-rose-300 bg-rose-50/30'
                                : newSlotDate && selectedAvailTime?.dayOfWeek && getDayOfWeek(newSlotDate) === selectedAvailTime.dayOfWeek
                                ? 'border-emerald-300 bg-emerald-50/30'
                                : 'border-slate-300'
                            }`}
                          />
                          {/* Inline Day Matching Guidance */}
                          {newSlotDate && (
                            <div className="mt-1.5">
                              {(() => {
                                const chosenDay = getDayOfWeek(newSlotDate);
                                const chosenDayName = DAY_NAMES[chosenDay] || `Hari ${chosenDay}`;

                                if (selectedAvailTime?.dayOfWeek) {
                                  const tutorDayName = DAY_NAMES[selectedAvailTime.dayOfWeek] || `Hari ${selectedAvailTime.dayOfWeek}`;
                                  if (chosenDay !== selectedAvailTime.dayOfWeek) {
                                    return (
                                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                          Tanggal {newSlotDate} jatuh pada hari <strong>{chosenDayName}</strong>, sedangkan guru membuka jadwal pada hari <strong>{tutorDayName}</strong>.
                                        </span>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                                        <Check className="w-3.5 h-3.5 shrink-0" />
                                        <span>
                                          ✓ Tanggal {newSlotDate} cocok dengan hari mengajar guru ({chosenDayName}).
                                        </span>
                                      </div>
                                    );
                                  }
                                }

                                return (
                                  <div className="text-[11px] text-slate-500">
                                    Hari yang dipilih: <span className="font-semibold text-slate-800">{chosenDayName}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Availability Picker */}
                        <div>
                          <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                            {availabilities.length === 0 ? 'Tentukan Jam Belajar:' : 'Jam Tersedia Guru:'}
                          </span>

                          {availabilities.length === 0 ? (
                            <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2">
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
                                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Jadwal Guru Fleksibel</span>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                Guru ini menerima jadwal fleksibel. Silakan atur jam les yang Anda inginkan:
                              </p>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Jam Mulai</span>
                                  <input
                                    type="time"
                                    value={customStartTime}
                                    onChange={(e) => setCustomStartTime(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                                  />
                                </div>
                                <div>
                                  <span className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Jam Selesai</span>
                                  <input
                                    type="time"
                                    value={customEndTime}
                                    onChange={(e) => setCustomEndTime(e.target.value)}
                                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto">
                              {availabilities.map((av: any) => {
                                const isChosen =
                                  selectedAvailTime?.id === av.id ||
                                  (selectedAvailTime?.dayOfWeek === av.dayOfWeek &&
                                    selectedAvailTime?.startTime === av.startTime &&
                                    selectedAvailTime?.endTime === av.endTime);

                                const avDayName = DAY_NAMES[av.dayOfWeek] || `Hari ${av.dayOfWeek}`;
                                const dateMatchesThis = newSlotDate ? getDayOfWeek(newSlotDate) === av.dayOfWeek : false;

                                return (
                                  <button
                                    key={av.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedAvailTime({
                                        id: av.id,
                                        dayOfWeek: av.dayOfWeek,
                                        startTime: av.startTime,
                                        endTime: av.endTime,
                                      });
                                      setSlotErrorMsg('');
                                    }}
                                    className={`px-3 py-2 rounded-xl text-xs font-medium text-left flex items-center justify-between border transition-all ${
                                      isChosen
                                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                        : dateMatchesThis
                                        ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:border-emerald-500'
                                        : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold">{avDayName}</span>
                                      {dateMatchesThis && !isChosen && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-200/60 text-emerald-800 font-semibold">
                                          Cocok dg Tanggal
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold font-mono">{av.startTime} - {av.endTime}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Inline Slot Error */}
                        {slotErrorMsg && (
                          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <span className="font-medium leading-relaxed">{slotErrorMsg}</span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={handleAddSlot}
                          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Tambahkan ke Jadwal Sesi
                        </button>
                      </div>

                      {/* List of chosen slots */}
                      {selectedSlots.length > 0 && (
                        <div className="space-y-1.5">
                          {selectedSlots.map((slot, idx) => {
                            const slotDay = getDayOfWeek(slot.date);
                            const dayName = DAY_NAMES[slotDay] || '';

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900"
                              >
                                <div className="space-y-0.5">
                                  <div className="font-bold">
                                    Sesi {idx + 1}: {dayName && `${dayName}, `}{slot.date}
                                  </div>
                                  <div className="text-[11px] text-brand-700 font-mono">
                                    {slot.startTime} - {slot.endTime} WIB
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSlot(idx)}
                                  className="text-rose-600 font-bold hover:underline px-2 py-1"
                                >
                                  Batal
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Offline Teaching Address */}
                    {service.teachingMode === 'OFFLINE_VISIT' && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          3. Alamat Rumah untuk Kunjungan
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={teachingAddress}
                          onChange={(e) => setTeachingAddress(e.target.value)}
                          placeholder="Jl. Mawar No. 15, RT 02/05, Kelurahan..."
                          className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                    )}

                    {/* Inline Form Completion Status / Checklist */}
                    {user?.role === 'PARENT' && (
                      <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 pt-1">
                        {!selectedStudentId ? (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Langkah 1: Pilih profil anak terlebih dahulu
                          </span>
                        ) : selectedSlots.length < service.sessionCount ? (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Langkah 2: Tambahkan {service.sessionCount - selectedSlots.length} jadwal sesi lagi
                          </span>
                        ) : service.teachingMode === 'OFFLINE_VISIT' && !teachingAddress.trim() ? (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Langkah 3: Masukkan alamat rumah kunjungan
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Semua data lengkap, siap ditambahkan
                          </span>
                        )}
                      </div>
                    )}

                    {/* Primary Inline Error Message above button */}
                    {errorMsg && (
                      <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{errorMsg}</span>
                      </div>
                    )}

                    {/* Add to Cart Button */}
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      {isSubmitting ? 'Menyimpan...' : 'Tambah ke Keranjang'}
                    </button>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
