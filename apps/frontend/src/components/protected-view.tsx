'use client';

import { PropsWithChildren } from 'react';

import { useRequireAuth } from '@/lib/auth/use-require-auth';

export function ProtectedView({ children }: PropsWithChildren) {
  const { isReady, token } = useRequireAuth();

  if (!isReady || !token) {
    return (
      <main className="centered-page">
        <div className="status-card">
          <p className="eyebrow">Checking session</p>
          <h2>Preparing your workspace</h2>
          <p className="muted">Please wait while we confirm your access token.</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
