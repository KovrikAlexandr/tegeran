import type { Metadata } from 'next';
import { PropsWithChildren } from 'react';

import { AuthProvider } from '@/lib/auth/auth-context';

import './globals.css';

export const metadata: Metadata = {
  title: 'Tegeran Messenger',
  description: 'Frontend for the Tegeran messenger demo',
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
