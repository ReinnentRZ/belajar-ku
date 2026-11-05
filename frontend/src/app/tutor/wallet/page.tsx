'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TutorWalletPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tutor/dashboard?tab=wallet');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
