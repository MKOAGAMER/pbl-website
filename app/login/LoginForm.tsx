'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export function LoginForm({ nextPath, initialError }: { nextPath: string; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError ?? '');
  const supabase = createClient();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      setError('Supabase environment variables are not configured.');
      return;
    }

    setSubmitting(true);
    setError('');
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) {
      setError(result.error.message);
      setSubmitting(false);
      return;
    }
    router.replace(nextPath);
    router.refresh();
  }

  return (
    <div className="surface-card mx-auto w-full max-w-lg rounded-[1.8rem] p-6 sm:p-8">
      <div className="mb-7">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.14em] text-[var(--orange-soft)]">Staff access</p>
        <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Sign in to PBL Admin</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">Use a staff account invited or created in Supabase Auth.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--ink-soft)]">Email</span>
          <span className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--page)] px-4 focus-within:border-[var(--orange)]">
            <Mail className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" />
            <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-faint)]" placeholder="staff@example.com" />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--ink-soft)]">Password</span>
          <span className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--page)] px-4 focus-within:border-[var(--orange)]">
            <LockKeyhole className="h-4 w-4 shrink-0 text-[var(--ink-faint)]" />
            <input type="password" required minLength={6} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--ink-faint)]" placeholder="••••••••" />
          </span>
        </label>

        {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}

        <button type="submit" disabled={submitting || !supabase} className="h-12 w-full rounded-full bg-[var(--orange)] text-xs font-black uppercase tracking-[0.13em] text-black transition hover:bg-[var(--orange-soft)] disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? 'Signing in…' : supabase ? 'Sign in' : 'Supabase not configured'}
        </button>
      </form>
    </div>
  );
}
