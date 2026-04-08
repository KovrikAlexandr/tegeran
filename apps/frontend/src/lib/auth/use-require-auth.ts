'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from './auth-context';

export function useRequireAuth(): { isReady: boolean; token: string | null } {
  const { isReady, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isReady && !token) {
      router.replace('/login');
    }
  }, [isReady, router, token]);

  return { isReady, token };
}
