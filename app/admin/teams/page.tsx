import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, ShieldCheck, UsersRound } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Team Command', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };
type TeamRow = { id: string; name: string; abbreviation: string; city: string | null; logo_url: string | null; primary_color: string | null; is_active: boolean };
type SeasonTeamRow = { team_id: string; conference: string | null; is_active: boolean };
type RosterRow = { team_id: string; player_id: string };
type RosterPlayer = { id: string; name: string; roblox_username: string | null; avatar_url: string | null };

export default async function TeamCommandPage({ searchParams }: Props) {
  const [{ supabase }, params] = await Promise.all([requireAdminPermission('staff'), searchParams]);
  const [{ data: seasons }, { data: teams }] = await Promise.all([
    supabase.from('seasons').select('id, name, status').order('starts_on', { ascending: false }),
    supabase.from('teams').select('id, name, abbreviation, city, logo_url, primary_color, is_active').order('name'),
  ]);
  const activeSeason = seasons?.find((season) => season.status === 'active') ?? seasons?.[0] ?? null;
  const [{ data: memberships }, { data: rosters }] = activeSeason
    ? await Promise.all([
        supabase.from('season_teams').select('team_id, conference, is_active').eq('season_id', activeSeason.id),
        supabase.from('rosters').select('team_id, player_id').eq('season_id', activeSeason.id).eq('status', 'active'),
      ])
    : [{ data: [] }, { data: [] }];
  const teamRows = (teams ?? []) as TeamRow[];
  const teamMemberships = new Map(((memberships ?? []) as SeasonTeamRow[]).map((item) => [item.team_id, item]));
  const rosterRows = (rosters ?? []) as RosterRow[];
  const rosterPlayerIds = rosterRows.map((roster) => roster.player_id);
  const { data: rosterPlayers } = rosterPlayerIds.length
    ? await supabase.from('players').select('id, name, roblox_username, avatar_url').in('id', rosterPlayerIds)
    : { data: [] as RosterPlayer[] };
  const playersById = new Map(((rosterPlayers ?? []) as RosterPlayer[]).map((player) => [player.id, player]));
  const rosterByTeam = new Map<string, RosterPlayer[]>();
  for (const roster of rosterRows) {
    const player = playersById.get(roster.player_id);
    if (player) rosterByTeam.set(roster.team_id, [...(rosterByTeam.get(roster.team_id) ?? []), player]);
  }
  const orderedTeams = [...teamRows].sort((a, b) => Number(Boolean(teamMemberships.get(b.id)?.is_active)) - Number(Boolean(teamMemberships.get(a.id)?.is_active)) || a.name.localeCompare(b.name));

  return (
    <main className="site-shell py-10 sm:py-14">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--ink-faint)] transition hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Command Center</Link>
      <section className="mt-7 border-b border-[var(--line)] pb-8">
        <p className="eyebrow">League administration</p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="display-type text-5xl sm:text-6xl">Team Command</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">Open one team to manage its profile, active roster, captain, jersey numbers and player movements without hunting through a long league form.</p>
          </div>
          <div className="rounded-xl border border-[var(--orange)]/25 bg-[var(--orange)]/10 px-4 py-3 text-sm">
            <span className="block text-[0.6rem] font-black uppercase tracking-[.12em] text-[var(--orange-soft)]">Working season</span>
            <span className="mt-1 block font-bold">{activeSeason?.name ?? 'No season configured'}</span>
          </div>
        </div>
      </section>

      {params.saved && <p role="status" className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Changes saved. League pages have been refreshed.</p>}
      {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">That action could not be completed. Check the team data or related records and try again.</p>}

      <div className="mt-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--orange)]/10 text-[var(--orange-soft)]"><UsersRound className="h-5 w-5" /></span><div><h2 className="font-black">All teams</h2><p className="text-sm text-[var(--ink-soft)]">{orderedTeams.length} team{orderedTeams.length === 1 ? '' : 's'} registered</p></div></div>
        <Link href="/admin/league" className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-bold text-[var(--ink-soft)] transition hover:border-[var(--orange)] hover:text-[var(--ink)]">Create team <ArrowUpRight className="h-3.5 w-3.5" /></Link>
      </div>

      {orderedTeams.length ? <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {orderedTeams.map((team) => {
          const membership = teamMemberships.get(team.id);
          const active = Boolean(team.is_active && membership?.is_active);
          const members = rosterByTeam.get(team.id) ?? [];
          return <Link key={team.id} href={`/admin/teams/${team.id}`} className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--orange)]/60 hover:shadow-[0_18px_40px_rgba(0,0,0,.16)]">
            <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: team.primary_color || '#ff6b22' }} />
            <div className="flex items-start justify-between gap-4"><TeamMark team={team} /><span className={`rounded-full px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[.1em] ${active ? 'bg-emerald-400/10 text-emerald-300' : 'bg-white/5 text-[var(--ink-faint)]'}`}>{active ? 'Active' : 'Archived'}</span></div>
            <h3 className="mt-5 text-xl font-black transition group-hover:text-[var(--orange-soft)]">{team.name}</h3>
            <p className="mt-1 text-sm text-[var(--ink-faint)]">{team.city || 'City not set'} · {membership?.conference || 'Unassigned conference'}</p>
            <div className="mt-5 border-t border-[var(--line)] pt-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[var(--ink-soft)]">{members.length} active players</span><span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--orange-soft)]">Move players <ArrowUpRight className="h-3.5 w-3.5" /></span></div>{members.length ? <div className="mt-3 flex items-center gap-2 overflow-hidden">{members.slice(0, 3).map((player) => <MemberPreview key={player.id} player={player} />)}{members.length > 3 && <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[var(--surface-soft)] px-1 text-[0.6rem] font-black text-[var(--ink-soft)]">+{members.length - 3}</span>}</div> : <p className="mt-3 text-xs text-[var(--ink-faint)]">No players assigned</p>}</div>
          </Link>;
        })}
      </div> : <div className="mt-6 rounded-2xl border border-dashed border-[var(--line-strong)] p-10 text-center"><ShieldCheck className="mx-auto h-7 w-7 text-[var(--ink-faint)]" /><p className="mt-3 font-black">No teams yet</p><p className="mt-1 text-sm text-[var(--ink-soft)]">Create the first season and team in League Operations.</p></div>}
    </main>
  );
}

function TeamMark({ team }: { team: TeamRow }) {
  return <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl border border-white/10 bg-[var(--surface-soft)] text-sm font-black" style={{ color: team.primary_color || '#ff784b' }}>
    {team.logo_url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={team.logo_url} alt="" className="h-full w-full object-contain p-1.5" />
    ) : team.abbreviation}
  </span>;
}

function MemberPreview({ player }: { player: RosterPlayer }) {
  return <span className="flex min-w-0 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--page)] py-1 pl-1 pr-2 text-xs font-bold"><span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--orange)]/15 text-[0.5rem] text-[var(--orange-soft)]">{player.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={player.avatar_url} alt="" className="h-full w-full object-cover" />
  ) : player.name.slice(0, 1).toUpperCase()}</span><span className="truncate">{player.roblox_username || player.name}</span></span>;
}
