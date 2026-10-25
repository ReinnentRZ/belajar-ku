'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileText, Image as ImageIcon, Send, ShieldAlert, X } from 'lucide-react';
import React, { useState } from 'react';
import api from '../lib/api';

interface ReportSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionTitle: string;
  onSuccess?: () => void;
}

export function ReportSessionModal({
  isOpen,
  onClose,
  sessionId,
  sessionTitle,
  onSuccess,
}: ReportSessionModalProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<string>('TUTOR_NO_SHOW');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const reportMutation = useMutation({
    mutationFn: async () => {
      const payload: { reason: string; description: string; evidenceUrl?: string } = {
        reason,
        description,
      };
      if (evidenceUrl && evidenceUrl.trim()) {
        payload.evidenceUrl = evidenceUrl.trim();
      }
      const res = await api.post(`/api/v1/sessions/${sessionId}/report`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-parent-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['my-tutor-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      onClose();
      setDescription('');
      setEvidenceUrl('');
      setErrorMessage('');
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.message || 'Gagal mengirimkan laporan sengketa. Silakan coba lagi.'
      );
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-rose-600">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-lg font-bold text-slate-900">Laporkan Kendala Sesi</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs text-rose-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {sessionTitle}
          </div>
          <p className="text-rose-700/90 leading-relaxed">
            Pengajuan laporan ini akan mengubah status sesi menjadi <strong>DISPUTED</strong> dan
            menangguhkan pencairan dana escrow kepada guru hingga ditinjau oleh tim Admin Belajar-Ku.
          </p>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-900 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (description.trim().length < 10) {
              setErrorMessage('Deskripsi kendala minimal 10 karakter.');
              return;
            }
            reportMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Alasan Sengketa / Kendala
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              <option value="TUTOR_NO_SHOW">Tutor Tidak Hadir / Terlambat Parah</option>
              <option value="PARENT_NO_SHOW">Murid / Orang Tua Tidak Hadir</option>
              <option value="INAPPROPRIATE_BEHAVIOR">Perilaku Tidak Pantas / Melanggar Etika</option>
              <option value="POOR_QUALITY">Kualitas Pengajaran Buruk / Tidak Sesuai Silabus</option>
              <option value="TECHNICAL_ISSUE">Kendala Teknis Aplikasi / Akses Sesi</option>
              <option value="OTHER">Alasan Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
              Deskripsi Kejadian & Kronologi (Min. 10 Karakter)
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan secara detail apa yang terjadi pada waktu sesi..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
              <span>Link Bukti / Screenshot (Opsional)</span>
              <span className="text-[10px] text-slate-400 font-normal">URL Google Drive / Gambar</span>
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... atau link bukti foto"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={reportMutation.isPending}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={reportMutation.isPending}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              {reportMutation.isPending ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
