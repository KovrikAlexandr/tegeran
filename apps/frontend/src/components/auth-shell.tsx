import Link from 'next/link';
import { PropsWithChildren } from 'react';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  footerLabel: string;
  footerHref: string;
  footerAction: string;
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  footerLabel,
  footerHref,
  footerAction,
  children,
}: PropsWithChildren<AuthShellProps>) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-footer">
          {footerLabel}{' '}
          <Link href={footerHref}>{footerAction}</Link>
        </p>
      </section>
    </main>
  );
}
