'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

import { AuthShell } from '@/components/auth-shell';
import { useAuth } from '@/lib/auth/auth-context';
import { registerUser } from '@/lib/services/auth-service';

export default function RegisterPage() {
  const router = useRouter();
  const { isReady, token } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isReady && token) {
      router.replace('/chats');
    }
  }, [isReady, router, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await registerUser(form);
      setSuccessMessage('Registration completed. Redirecting to login...');
      setForm({
        name: '',
        email: '',
        password: '',
      });
      window.setTimeout(() => {
        router.push('/login');
      }, 800);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Registration failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="New account"
      title="Create your messenger profile"
      subtitle="Choose a name, enter your email and create a password."
      footerLabel="Already registered?"
      footerHref="/login"
      footerAction="Sign in"
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span>Name</span>
          <input
            autoComplete="name"
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            required
            value={form.name}
          />
        </label>
        <label className="field">
          <span>Email</span>
          <input
            autoComplete="email"
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            required
            type="email"
            value={form.email}
          />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            autoComplete="new-password"
            minLength={6}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            required
            type="password"
            value={form.password}
          />
        </label>

        {error ? <p className="status-error">{error}</p> : null}
        {successMessage ? <p className="status-success">{successMessage}</p> : null}

        <button className="primary-button" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </AuthShell>
  );
}
