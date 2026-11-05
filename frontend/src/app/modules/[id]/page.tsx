'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';

export default function ModuleDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (!isAuthLoading) {
      if (user?.role === 'PARENT') {
        // Silently redirect Parent accounts away from B2B modules
        router.replace('/services');
      } else if (id) {
        // Forward non-parent visitors (Guests, Institutions) to the service checkout screen
        router.replace(`/services/${id}`);
      }
    }
  }, [user, isAuthLoading, router, id]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
