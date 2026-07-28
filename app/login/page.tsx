import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { safeInternalPath } from '@/lib/navigation';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: 'Staff Login',
  description: 'Secure staff access to the PBL administration dashboard.',
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next, '/admin');
  const supabase = await createClient();
  const initialError = params.error === 'auth-callback'
    ? 'Unable to complete sign-in. Please try again.'
    : undefined;

  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(nextPath);
  }

  return (
    <section className="site-shell grid min-h-[calc(100vh-4.5rem)] items-center gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="eyebrow">Protected workspace</p>
        <h1 className="display-type mt-5 text-balance text-5xl sm:text-6xl">Run the league from one place.</h1>
        <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-[var(--ink-soft)]">
          Staff accounts can manage seasons, rosters, schedules, box scores, news and league records according to their assigned role.
        </p>
        <div className="mt-8 flex items-center gap-3 text-sm text-[var(--ink-faint)]">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/10 text-emerald-300"><ShieldCheck className="h-5 w-5" /></span>
          Supabase Auth session · RLS-protected data
        </div>
      </div>
      <LoginForm nextPath={nextPath} initialError={initialError} />
    </section>
  );
}
