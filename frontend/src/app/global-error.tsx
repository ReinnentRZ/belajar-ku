'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Global Root Layout Error:', error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-800 font-sans antialiased min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
            ⚠️
          </div>

          <div className="space-y-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Sistem Mengalami Kendala Kritis
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Komponen aplikasi gagal dimuat pada tingkat root. Silakan coba muat ulang halaman.
            </p>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = '/';
              }}
              className="px-6 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              Muat Ulang Beranda
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
