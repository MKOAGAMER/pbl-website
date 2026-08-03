import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BadgeCheck, Gamepad2, MessageCircle, ShieldCheck } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';
import { isDiscordAuthConfigured } from '@/lib/discord-auth';
import { createAdminClient } from '@/lib/supabase-admin';
import { PlayerAvatar } from '@/app/components/ui/PlayerAvatar';
import { ProfileAboutForm } from './ProfileAboutForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My PBAL account',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ connected?: string; error?: string }> };

const errors: Record<string, string> = {
  'discord-not-configured': 'Discord Application is not configured on the server yet.',
  'discord-state': 'The Discord connection request expired. Please try again.',
  'discord-callback': 'Discord could not be connected. Please try again.',
  'not-configured': 'The database connection is not configured.',
};

export default async function AccountPage({ searchParams }: Props) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);
  if (!user) redirect('/login?next=/account');
  const discordReady = isDiscordAuthConfigured();
  const supabase = createAdminClient();
  const { data: playerProfile } = supabase
    ? await supabase.from('players').select('bio, slug, position, positions, jersey_number').eq('user_id', user.id).maybeSingle()
    : { data: null };

  return (
    <main className="site-shell py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Player identity</p>
        <h1 className="display-type mt-4 text-5xl sm:text-6xl">My PBAL account</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
          Roblox is your league identity. Every account starts as a Player and Free Agent until Staff assigns a team.
        </p>

        {params.connected === 'discord' && <p role="status" className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Discord connected successfully.</p>}
        {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{errors[params.error] ?? 'Unable to update your account.'}</p>}

        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-start gap-4">
              <PlayerAvatar src={user.avatarUrl} name={user.username} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-xl font-black">{user.username}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--orange-soft)]">{user.role.replaceAll('_', ' ')}</p>
              </div>
            </div>
            <div className="mt-6 space-y-3 border-t border-[var(--line)] pt-5 text-sm text-[var(--ink-soft)]">
              <p className="flex items-center gap-3"><Gamepad2 className="h-4 w-4 text-[var(--orange-soft)]" /> Roblox ID {user.robloxId}</p>
              <p className="flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-[var(--orange-soft)]" /> League role: {user.role.replaceAll('_', ' ')}</p>
              {user.role === 'franchise_owner' && <Link href="/trades" className="inline-flex font-black text-[var(--orange-soft)]">Request an acquisition or player release →</Link>}
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#5865F2]/15 text-[#8ea1ff]"><MessageCircle className="h-5 w-5" /></span>
              <div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">Discord Application</p><h2 className="mt-1 text-xl font-black">{user.discordId ? 'Connected' : 'Connect Discord'}</h2></div>
            </div>
            {user.discordId ? (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                {user.discordAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.discordAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : <BadgeCheck className="h-8 w-8 text-emerald-300" />}
                <div><p className="font-black">{user.discordUsername}</p><p className="text-xs text-emerald-200">Discord ID {user.discordId}</p></div>
              </div>
            ) : (
              <>
                <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">Link your Discord identity to the same PBAL player account. The app requests only the basic <code>identify</code> scope.</p>
                <Link href="/api/auth/discord?next=/account" aria-disabled={!discordReady} className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl text-xs font-black uppercase tracking-[0.11em] ${discordReady ? 'bg-[#5865F2] text-white hover:bg-[#6d78f5]' : 'pointer-events-none bg-[var(--surface-soft)] text-[var(--ink-faint)]'}`}>{discordReady ? 'Connect Discord' : 'Discord app not configured'}</Link>
              </>
            )}
          </section>
        </div>
        <ProfileAboutForm
          initialBio={typeof playerProfile?.bio === 'string' ? playerProfile.bio : ''}
          initialPositions={Array.isArray(playerProfile?.positions) && playerProfile.positions.length
            ? playerProfile.positions.filter((item): item is string => typeof item === 'string').slice(0, 3)
            : [typeof playerProfile?.position === 'string' ? playerProfile.position : 'UTIL']}
          initialJerseyNumber={typeof playerProfile?.jersey_number === 'number' ? playerProfile.jersey_number : 0}
          profileSlug={typeof playerProfile?.slug === 'string' ? playerProfile.slug : null}
        />
      </div>
    </main>
  );
}
