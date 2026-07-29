import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LockKeyhole, ShieldCheck, Users } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { safeInternalPath } from '@/lib/navigation';
import { isRobloxAuthConfigured, MKOA_COMMUNITY_ID } from '@/lib/roblox-auth';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in with Roblox',
  description: 'Roblox OAuth access for the PBAL portal.',
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

const errorMessages: Record<string, string> = {
  'not-configured': 'Roblox OAuth or the server database key is not configured yet.',
  'oauth-state': 'The sign-in request expired or could not be verified. Please try again.',
  'oauth-callback': 'Roblox sign-in could not be completed. Please try again.',
  'invalid-profile': 'Roblox returned an incomplete user profile.',
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = safeInternalPath(params.next, '/');
  const user = await getCurrentUser();
  if (user) redirect(nextPath);
  const configured = isRobloxAuthConfigured();

  return (
    <section className="site-shell grid min-h-[calc(100vh-4.5rem)] items-center gap-10 py-14 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="eyebrow">PBAL identity</p>
        <h1 className="display-type mt-5 text-balance text-5xl sm:text-6xl">One Roblox account. The right league access.</h1>
        <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-[var(--ink-soft)]">
          PBAL reads your Roblox username, avatar and MKOA community membership. Staff and Admin access is assigned separately by a Super Admin.
        </p>
        <div className="mt-8 grid max-w-lg gap-3 sm:grid-cols-2">
          <Info icon={Users} text={`MKOA community ${MKOA_COMMUNITY_ID}`} />
          <Info icon={ShieldCheck} text="Server-only token exchange" />
        </div>
      </div>

      <div className="surface-card mx-auto w-full max-w-lg rounded-[1.8rem] p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--orange)] text-black"><LockKeyhole className="h-5 w-5" /></span>
        <h2 className="mt-6 text-2xl font-black tracking-[-0.04em]">Sign in to PBAL</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
          Roblox will ask you to approve the openid and profile scopes. PBAL never sends the client secret or access token to your browser.
        </p>

        {params.error && (
          <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {errorMessages[params.error] ?? 'Unable to sign in.'}
          </p>
        )}

        <Link
          href={`/api/auth/roblox?next=${encodeURIComponent(nextPath)}`}
          aria-disabled={!configured}
          className={`mt-6 inline-flex h-12 w-full items-center justify-center rounded-full text-xs font-black uppercase tracking-[0.13em] ${
            configured
              ? 'bg-[var(--orange)] text-black hover:bg-[var(--orange-soft)]'
              : 'pointer-events-none bg-[var(--surface-soft)] text-[var(--ink-faint)]'
          }`}
        >
          {configured ? 'Continue with Roblox' : 'OAuth not configured'}
        </Link>
      </div>
    </section>
  );
}
function Info({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs font-bold text-[var(--ink-soft)]"><Icon className="h-4 w-4 shrink-0 text-[var(--orange-soft)]" />{text}</div>;
}
