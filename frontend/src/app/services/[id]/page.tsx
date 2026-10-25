'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  Heart,
  MapPin,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  User,
  Video,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';
import { DAY_NAMES, formatRupiah } from '../../../lib/utils';

export default function ServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.id as string;
  const router = useRouter();
  const { user } = useAuth();

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [teachingAddress, setTeachingAddress] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<
    Array<{ date: string; startTime: string; endTime: string }>
  >([]);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [selectedAvailTime, setSelectedAvailTime] = useState<{ startTime: string; endTime: string } | null>(null);
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

  const tutor = service?.tutor;
  const tutorUser = tutor?.user;
  const availabilities = tutor?.availabilities || [];

  const handleAddSlot = () => {
    if (!newSlotDate) {
      alert('Pilih tanggal belajar terlebih dahulu');
      return;
    }
    if (!selectedAvailTime) {
      alert('Pilih jam belajar yang tersedia');
      return;
    }

    if (selectedSlots.length >= service.sessionCount) {
      alert(`Paket ini hanya untuk ${service.sessionCount} sesi.`);
      return;
    }

    // Check duplicate
    const exists = selectedSlots.some(
      (s) => s.date === newSlotDate && s.startTime === selectedAvailTime.startTime
    );
    if (exists) {
      alert('Slot ini sudah Anda tambahkan.');
      return;
    }

    setSelectedSlots([
      ...selectedSlots,
      {
        date: newSlotDate,
        startTime: selectedAvailTime.startTime,
        endTime: selectedAvailTime.endTime,
      },
    ]);
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

    if (user.role !== 'PARENT') {
      setErrorMsg('Hanya akun Orang Tua yang dapat memesan les.');
      return;
    }

    if (!selectedStudentId) {
      setErrorMsg('Pilih profil anak yang akan mengikuti les.');
      return;
    }

    if (selectedSlots.length !== service.sessionCount) {
      setErrorMsg(`Pilih tepat ${service.sessionCount} jadwal sesi belajar.`);
      return;
    }

    if (service.teachingMode === 'OFFLINE_VISIT' && !teachingAddress.trim()) {
      setErrorMsg('Masukkan alamat lengkap rumah untuk kunjungan guru.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/api/v1/cart', {
        serviceId: service.id,
        studentId: selectedStudentId,
        selectedSlots,
        teachingAddress: service.teachingMode === 'OFFLINE_VISIT' ? teachingAddress : undefined,
      });

      router.push('/cart');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Gagal menambahkan ke keranjang.';
      setErrorMsg(message);
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
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                {service.category?.name}
              </span>
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
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {service.title}
            </h1>

            <p className="text-slate-600 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {service.description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-brand-600" />
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">Durasi</div>
                  <div className="text-sm font-bold text-slate-800">{service.durationMinutes} Menit / Sesi</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-accent-600" />
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">Jumlah Pertemuan</div>
                  <div className="text-sm font-bold text-slate-800">Paket {service.sessionCount} Sesi</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-[11px] text-slate-400 font-semibold uppercase">Jaminan Belajar</div>
                  <div className="text-sm font-bold text-slate-800">Escrow Aman</div>
                </div>
              </div>
            </div>
          </div>

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
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6 sticky top-24">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Total Biaya Paket</div>
              <div className="text-3xl font-black text-brand-700 mt-1">
                {formatRupiah(service.price)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Sudah termasuk {service.sessionCount} sesi les dan laporan belajar berkala.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

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
                <span className="text-xs font-semibold text-brand-600">
                  {selectedSlots.length} / {service.sessionCount} Terpilih
                </span>
              </div>

              {/* Time slot picker */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Pilih Tanggal:
                  </span>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs bg-white"
                  />
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Jam Tersedia Guru:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto">
                    {availabilities.length === 0 ? (
                      <div className="text-xs text-slate-400 italic">Jadwal guru fleksibel</div>
                    ) : (
                      availabilities.map((av: any) => {
                        const isChosen =
                          selectedAvailTime?.startTime === av.startTime &&
                          selectedAvailTime?.endTime === av.endTime;

                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setSelectedAvailTime({ startTime: av.startTime, endTime: av.endTime })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between border transition-all ${
                              isChosen
                                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-brand-400'
                            }`}
                          >
                            <span>{DAY_NAMES[av.dayOfWeek] || `Hari ${av.dayOfWeek}`}</span>
                            <span className="font-semibold">{av.startTime} - {av.endTime}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddSlot}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambahkan ke Jadwal Sesi
                </button>
              </div>

              {/* List of chosen slots */}
              {selectedSlots.length > 0 && (
                <div className="space-y-1.5">
                  {selectedSlots.map((slot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-brand-50 border border-brand-200 text-xs text-brand-900"
                    >
                      <span className="font-semibold">
                        Sesi {idx + 1}: {slot.date} ({slot.startTime} - {slot.endTime})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(idx)}
                        className="text-rose-600 font-bold hover:underline"
                      >
                        Batal
                      </button>
                    </div>
                  ))}
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
          </div>
        </div>
      </div>
    </div>
  );
}
