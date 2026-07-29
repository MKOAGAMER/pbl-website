import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeftRight, Bot, Cloud, Database, Gamepad2, MessageCircle, Newspaper, ScanLine, Trophy, UserSearch, UsersRound } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { getSiteConfig } from '@/lib/site-config';
import { ConfigEditor } from './ConfigEditor';
import { MediaLibrary, type MediaAsset } from './MediaLibrary';
import { UserAccessManager } from './UserAccessManager';
import { isRobloxAuthConfigured } from '@/lib/roblox-auth';
import { isDiscordAuthConfigured } from '@/lib/discord-auth';
import { PlayerAvatar } from '@/app/components/ui/PlayerAvatar';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PBAL Admin',
  description: 'PBAL runtime configuration and media dashboard.',
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AdminPage({ searchParams }: Props) {
  const [{ supabase, user, permission }, config, params] = await Promise.all([
    requireAdminPermission('editor'),
    getSiteConfig(),
    searchParams,
  ]);
  const { data: media } = await supabase
    .from('media_assets')
    .select('id, secure_url, original_filename, width, height, bytes, created_at')
    .order('created_at', { ascending: false })
    .limit(60);
  const { data: accessTeams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  return (
    <section className="site-shell py-10 sm:py-14">
      <div className="mb-8 flex flex-col gap-5 border-b border-[var(--line)] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Protected workspace</p>
          <h1 className="display-type mt-4 text-5xl sm:text-6xl">PBAL Admin</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            Runtime settings are stored in Supabase and broadcast through Realtime, so saving here does not require a new deployment.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
          <PlayerAvatar src={user.avatarUrl} name={user.username} size="sm" className="!h-11 !w-11" />
          <div>
            <p className="text-sm font-black">{user.username}</p>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--orange-soft)]">
              {permission.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {(params.saved || params.error) && (
        <p
          role="status"
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            params.saved
              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
              : 'border-red-400/20 bg-red-400/10 text-red-200'
          }`}
        >
          {params.saved ? 'Configuration saved and published.' : 'Unable to save that change. Check the values and try again.'}
        </p>
      )}

      <div className="mb-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusCard icon={Database} label="Configuration" value="Supabase" />
        <StatusCard icon={Gamepad2} label="Roblox OAuth" value={isRobloxAuthConfigured() ? 'Ready' : 'Setup needed'} />
        <StatusCard icon={MessageCircle} label="Discord App" value={isDiscordAuthConfigured() ? 'Ready' : 'Setup needed'} />
        <StatusCard icon={Bot} label="Gemini AI" value={process.env.GEMINI_API_KEY?.trim() ? 'Ready' : 'Setup needed'} />
      </div>

      <p className="mb-4 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Content & presentation</p>
      <Link href="/admin/content" className="mb-12 flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 transition hover:border-[var(--orange)]">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><Newspaper className="h-5 w-5" /></span>
        <span><span className="block font-black">Content Studio</span><span className="mt-1 block text-xs text-[var(--ink-faint)]">News, public staff profiles, images and league links</span></span>
      </Link>

      {permission !== 'editor' && <section className="mb-14"><p className="mb-4 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">League & competition</p><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/league" className="group flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--orange)]">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><UsersRound className="h-5 w-5" /></span>
          <span><span className="block font-black group-hover:text-[var(--orange-soft)]">League operations</span><span className="mt-1 block text-xs text-[var(--ink-faint)]">Seasons, teams, rosters and games</span></span>
        </Link>
        <Link href="/admin/players" className="group flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--orange)]">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><UserSearch className="h-5 w-5" /></span>
          <span><span className="block font-black group-hover:text-[var(--orange-soft)]">Player profiles</span><span className="mt-1 block text-xs text-[var(--ink-faint)]">Search before editing About, image and positions</span></span>
        </Link>
        <Link href="/admin/tournaments" className="group flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--orange)]">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><Trophy className="h-5 w-5" /></span>
          <span><span className="block font-black group-hover:text-[var(--orange-soft)]">Tournament control</span><span className="mt-1 block text-xs text-[var(--ink-faint)]">Events, teams, seeds, brackets and results</span></span>
        </Link>
        <Link href="/admin/trades" className="group flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--orange)]">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><ArrowLeftRight className="h-5 w-5" /></span>
          <span><span className="block font-black group-hover:text-[var(--orange-soft)]">Trade review</span><span className="mt-1 block text-xs text-[var(--ink-faint)]">Approve or reject player movement</span></span>
        </Link>
        <Link href="/admin/stats" className="group flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:border-[var(--orange)]">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><ScanLine className="h-5 w-5" /></span>
          <span><span className="block font-black group-hover:text-[var(--orange-soft)]">AI stat entry</span><span className="mt-1 block text-xs text-[var(--ink-faint)]">Extract, review and confirm box scores</span></span>
        </Link>
      </div></section>}

      <p className="mb-4 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Website settings & media</p>
      <div className="grid gap-7 xl:grid-cols-[1.3fr_0.7fr]">
        <ConfigEditor config={config} />
        <div className="space-y-7">
          <MediaLibrary assets={(media ?? []) as MediaAsset[]} />
          <aside className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-3">
              <Cloud className="h-5 w-5 text-[var(--orange-soft)]" />
              <h2 className="font-black">Role model</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
              Editor manages config and media. Staff inherits editor access. Super Admin is reserved for user and permission management.
            </p>
            <Link href="/" className="mt-4 inline-flex text-xs font-black uppercase tracking-[0.1em] text-[var(--orange-soft)]">
              View public site →
            </Link>
          </aside>
        </div>
      </div>
      {permission === 'super_admin' && (
        <div className="mt-14">
          <UserAccessManager teams={(accessTeams ?? []).map((team) => ({ id: String(team.id), name: String(team.name) }))} />
        </div>
      )}
    </section>
  );
}

function StatusCard({ icon: Icon, label, value }: { icon: typeof Database; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--orange-soft)]">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="text-[0.62rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">{label}</p>
        <p className="mt-0.5 text-sm font-black capitalize">{value}</p>
      </div>
    </div>
  );
}
