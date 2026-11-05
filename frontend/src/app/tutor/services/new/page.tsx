'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  GraduationCap,
  Layers,
  MapPin,
  Plus,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useAuth } from '../../../../context/AuthContext';
import api, { getApiErrorMessage } from '../../../../lib/api';

export default function NewTutorServicePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [serviceType, setServiceType] = useState<'SESSION_BASED' | 'DELIVERABLE_BASED'>('SESSION_BASED');
  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [teachingMode, setTeachingMode] = useState<'ONLINE' | 'OFFLINE_VISIT'>('ONLINE');
  const [sessionCount, setSessionCount] = useState<number>(4);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [syllabusInput, setSyllabusInput] = useState('');
  const [specialAccommodations, setSpecialAccommodations] = useState('');

  // Deliverable fields
  const [estimatedDays, setEstimatedDays] = useState<number>(3);
  const [maxRevisions, setMaxRevisions] = useState<number>(2);
  const [deliverableFormats, setDeliverableFormats] = useState<string[]>(['DOCX', 'PDF']);

  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch subject categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/v1/categories');
      return res.data?.data || [];
    },
  });

  const toggleFormat = (fmt: string) => {
    setDeliverableFormats((prev) =>
      prev.includes(fmt) ? prev.filter((f) => f !== fmt) : [...prev, fmt]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setFieldErrors({});

    if (!categoryId) {
      setErrorMsg('Silakan pilih kategori subjek bimbingan');
      setFieldErrors({ categoryId: 'Kategori subjek wajib dipilih' });
      return;
    }
    if (!price || Number(price) <= 0) {
      setErrorMsg('Harga jasa harus lebih dari Rp 0');
      setFieldErrors({ price: 'Harga harus lebih dari Rp 0' });
      return;
    }

    setIsSubmitting(true);

    try {
      const syllabusHighlights = syllabusInput
        ? syllabusInput.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];

      const payload: any = {
        categoryId,
        title: title.trim(),
        description: description.trim(),
        serviceType,
        price: Number(price),
        specialAccommodations: specialAccommodations.trim() || undefined,
      };

      if (serviceType === 'SESSION_BASED') {
        payload.teachingMode = teachingMode;
        payload.sessionCount = Number(sessionCount) || 1;
        payload.durationMinutes = Number(durationMinutes) || 60;
        payload.syllabusHighlights = syllabusHighlights;
      } else {
        payload.teachingMode = 'ONLINE';
        payload.estimatedDays = Number(estimatedDays) || 3;
        payload.maxRevisions = Number(maxRevisions) ?? 2;
        payload.deliverableFormats = deliverableFormats;
        payload.sessionCount = 1;
        payload.durationMinutes = 60;
      }

      await api.post('/api/v1/tutor/services', payload);

      router.push('/tutor/services');
    } catch (err: unknown) {
      const parsed = getApiErrorMessage(err);
      setErrorMsg(parsed.message);
      setFieldErrors(parsed.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Back button & Header */}
      <div>
        <Link
          href="/tutor/services"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Katalog Jasa Saya
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Terbitkan Jasa / Layanan Baru
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Tentukan model bimbingan, paket sesi belajar, dan harga untuk calon murid atau sekolah.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Service Type Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setServiceType('SESSION_BASED')}
          className={`p-6 rounded-3xl border-2 text-left transition-all relative ${
            serviceType === 'SESSION_BASED'
              ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          {serviceType === 'SESSION_BASED' && (
            <div className="absolute top-4 right-4 text-blue-600">
              <CheckCircle className="w-5 h-5 fill-blue-600 text-white" />
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Paket Les Privat Tatap Muka / Online</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Bimbingan belajar berbasis paket pertemuan (4 / 8 / 12 sesi). Jadwal dipilih oleh orang tua
            dan dana dicairkan per sesi yang selesai.
          </p>
        </button>

        <button
          type="button"
          onClick={() => setServiceType('DELIVERABLE_BASED')}
          className={`p-6 rounded-3xl border-2 text-left transition-all relative ${
            serviceType === 'DELIVERABLE_BASED'
              ? 'border-indigo-600 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          {serviceType === 'DELIVERABLE_BASED' && (
            <div className="absolute top-4 right-4 text-indigo-600">
              <CheckCircle className="w-5 h-5 fill-indigo-600 text-white" />
            </div>
          )}
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Paket Modul Ajar, RPP & Administrasi</h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Layanan deliverable dokumen digital untuk guru atau institusi sekolah (Kurikulum Merdeka,
            format RPP, LPJ BOS). Termasuk revisi.
          </p>
        </button>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Kategori & Jenjang */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Kategori Subjek & Jenjang Pendidikan *
          </label>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              if (fieldErrors.categoryId) setFieldErrors((prev) => ({ ...prev, categoryId: '' }));
            }}
            required
            className={`w-full px-4 py-3 rounded-2xl border bg-white text-sm font-medium text-slate-800 transition-colors ${
              fieldErrors.categoryId
                ? 'border-rose-400 ring-2 ring-rose-500/10 focus:border-rose-500'
                : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            }`}
          >
            <option value="">-- Pilih Kategori Pelajaran --</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>
                [{cat.targetGrade}] {cat.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && (
            <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.categoryId}</p>
          )}
        </div>

        {/* Judul Jasa */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Judul Layanan / Jasa *
          </label>
          <input
            type="text"
            required
            minLength={3}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title) setFieldErrors((prev) => ({ ...prev, title: '' }));
            }}
            placeholder={
              serviceType === 'SESSION_BASED'
                ? 'Contoh: Les Privat Calistung PAUD Metode Montessori & Fonik Menyenangkan'
                : 'Contoh: Penyusunan Modul Ajar & RPP Kurikulum Merdeka Lengkap Semester Ganjil'
            }
            className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium text-slate-800 transition-colors ${
              fieldErrors.title
                ? 'border-rose-400 ring-2 ring-rose-500/10 focus:border-rose-500'
                : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            }`}
          />
          {fieldErrors.title && (
            <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.title}</p>
          )}
        </div>

        {/* Deskripsi Lengkap */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Deskripsi & Metode Pengajaran *
          </label>
          <textarea
            required
            minLength={10}
            rows={4}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (fieldErrors.description) setFieldErrors((prev) => ({ ...prev, description: '' }));
            }}
            placeholder="Jelaskan pendekatan belajar, kualifikasi Anda, dan hasil capaian yang diharapkan dari layanan ini..."
            className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium text-slate-800 transition-colors ${
              fieldErrors.description
                ? 'border-rose-400 ring-2 ring-rose-500/10 focus:border-rose-500'
                : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
            }`}
          />
          {fieldErrors.description && (
            <p className="text-xs text-rose-600 font-medium mt-1">{fieldErrors.description}</p>
          )}
        </div>

        {/* Dynamic Fields for SESSION_BASED */}
        {serviceType === 'SESSION_BASED' ? (
          <div className="space-y-6 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Detail Paket Pertemuan Sesi</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Jumlah Pertemuan *
                </label>
                <select
                  value={sessionCount}
                  onChange={(e) => setSessionCount(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold bg-white"
                >
                  <option value={1}>1x Pertemuan (Uji Coba)</option>
                  <option value={4}>4x Pertemuan (1 Bulan / 1x Pekan)</option>
                  <option value={8}>8x Pertemuan (1 Bulan / 2x Pekan)</option>
                  <option value={12}>12x Pertemuan (Intensif)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Durasi Tiap Sesi *
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold bg-white"
                >
                  <option value={60}>60 Menit (Standar PAUD/TK)</option>
                  <option value={90}>90 Menit (Standar SD/SMP)</option>
                  <option value={120}>120 Menit (Intensif Ujian)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Moda Mengajar *
                </label>
                <select
                  value={teachingMode}
                  onChange={(e) => setTeachingMode(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold bg-white"
                >
                  <option value="ONLINE">🌐 Online (Google Meet / Zoom)</option>
                  <option value="OFFLINE_VISIT">🏠 Kunjungan Tatap Muka ke Rumah</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pokok Bahasan / Silabus Pembelajaran (Pisahkan dengan baris baru)
              </label>
              <textarea
                rows={3}
                value={syllabusInput}
                onChange={(e) => setSyllabusInput(e.target.value)}
                placeholder={'Pertemuan 1: Pengenalan Bunyi Huruf Fonik Vokal\nPertemuan 2: Merangkai 2 Suku Kata Terbuka\nPertemuan 3: Mengenal Angka & Berhitung Objek'}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-medium font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        ) : (
          /* Dynamic Fields for DELIVERABLE_BASED */
          <div className="space-y-6 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Detail Pengerjaan & Dokumen Deliverable</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Estimasi Waktu Pengerjaan (Hari) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  required
                  value={estimatedDays}
                  onChange={(e) => setEstimatedDays(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Maksimal Jatah Revisi *
                </label>
                <select
                  value={maxRevisions}
                  onChange={(e) => setMaxRevisions(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold bg-white"
                >
                  <option value={1}>1x Revisi Ringan</option>
                  <option value={2}>2x Revisi (Standar)</option>
                  <option value={3}>3x Revisi Mendalam</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Format Berkas yang Diserahkan
              </label>
              <div className="flex flex-wrap gap-2">
                {['DOCX', 'PDF', 'XLSX', 'PPTX', 'ZIP'].map((fmt) => {
                  const isSelected = deliverableFormats.includes(fmt);
                  return (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => toggleFormat(fmt)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {fmt}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Akomodasi Khusus */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Akomodasi Khusus / Kebutuhan Inklusif (Opsional)
          </label>
          <input
            type="text"
            value={specialAccommodations}
            onChange={(e) => setSpecialAccommodations(e.target.value)}
            placeholder="Contoh: Bersedia mendampingi anak ADHD/Speech Delay, menyediakan materi visual khusus"
            className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-medium text-slate-800"
          />
        </div>

        {/* Harga Layanan */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Total Biaya Layanan Paket (Rp) *
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-base">
              Rp
            </span>
            <input
              type="number"
              min={10000}
              step={5000}
              required
              value={price}
              onChange={(e) => {
                setPrice(e.target.value === '' ? '' : Number(e.target.value));
                if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: '' }));
              }}
              placeholder="350000"
              className={`w-full pl-12 pr-4 py-3.5 rounded-xl border text-lg font-black text-slate-900 bg-white transition-colors ${
                fieldErrors.price
                  ? 'border-rose-400 ring-2 ring-rose-500/10 focus:border-rose-500'
                  : 'border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
              }`}
            />
          </div>
          {fieldErrors.price && (
            <p className="text-xs text-rose-600 font-medium">{fieldErrors.price}</p>
          )}
          <p className="text-[11px] text-slate-500">
            {serviceType === 'SESSION_BASED' && price && Number(price) > 0 && sessionCount > 0 ? (
              <span>
                Rata-rata <strong>{formatRupiah(Math.round(Number(price) / sessionCount))}</strong>{' '}
                per pertemuan sesi (dicairkan ke dompet guru tiap selesai sesi).
              </span>
            ) : (
              <span>Dana akan ditahan di rekening penampung (Escrow) dan cair setelah pihak pembeli menyetujui.</span>
            )}
          </p>
        </div>

        {/* Submit Action */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <Link
            href="/tutor/services"
            className="px-6 py-3 rounded-2xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </Link>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-8 py-3 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                <span>Menerbitkan...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Terbitkan Jasa Sekarang</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
