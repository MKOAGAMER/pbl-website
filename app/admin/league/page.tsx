import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CalendarPlus, ShieldCheck, UserRoundCog, UsersRound } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { SubmitButton } from '../SubmitButton';
import { createSeason, createTeam, movePlayer, scheduleGame } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'League Operations', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };
type Row = Record<string, unknown>;
const value = (input: unknown) => typeof input === 'string' ? input : '';

export default async function LeagueOperationsPage({ searchParams }: Props) {
  const [{ supabase }, params] = await Promise.all([requireAdminPermission('staff'), searchParams]);
  const [seasonResult, teamResult, playerResult, rosterResult, seasonTeamResult] = await Promise.all([
    supabase.from('seasons').select('id, name, status, is_public, starts_on').order('starts_on', { ascending: false }),
    supabase.from('teams').select('id, name, abbreviation, is_active').eq('is_active', true).order('name'),
    supabase.from('players').select('id, name, roblox_username, team_id, position').eq('is_active', true).order('name'),
    supabase.from('rosters').select('season_id, player_id, team_id, jersey_number, status').eq('status', 'active'),
    supabase.from('season_teams').select('season_id, team_id, is_active').eq('is_active', true),
  ]);
  const seasons = (seasonResult.data ?? []) as Row[];
  const allTeams = (teamResult.data ?? []) as Row[];
  const players = (playerResult.data ?? []) as Row[];
  const rosters = (rosterResult.data ?? []) as Row[];
  const activeSeason = seasons.find((season) => value(season.status) === 'active') ?? seasons[0];
  const activeSeasonId = value(activeSeason?.id);
  const activeTeamIds = new Set(((seasonTeamResult.data ?? []) as Row[]).filter((row) => value(row.season_id) === activeSeasonId).map((row) => value(row.team_id)));
  const teams = allTeams.filter((team) => activeTeamIds.has(value(team.id)));
  const activeRosters = rosters.filter((roster) => value(roster.season_id) === activeSeasonId);
  const rosterByPlayer = new Map(activeRosters.map((roster) => [value(roster.player_id), roster]));
  const teamById = new Map(teams.map((team) => [value(team.id), team]));

  return (
    <main className="site-shell py-10 sm:py-14">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Staff Control</Link>
      <div className="mt-7 border-b border-[var(--line)] pb-7"><p className="eyebrow">League office</p><h1 className="display-type mt-4 text-5xl sm:text-6xl">League Operations</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">Staff controls the competitive structure. Players arrive from Roblox as Free Agents; only this workspace can create teams, place or release players, and schedule games.</p></div>
      {params.saved && <p role="status" className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">League operation saved.</p>}
      {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">Unable to save that operation. Check the fields, duplicate names/jersey numbers, and active season.</p>}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <OperationCard icon={CalendarPlus} title="Create season" description="Start with an empty season. No scores or statistics are generated.">
          <form action={createSeason} className="grid gap-3 sm:grid-cols-2">
            <Input name="name" label="Season name" placeholder="PBAL Season 1" required wide />
            <Input name="starts_on" label="Start date" type="date" required />
            <Input name="ends_on" label="End date" type="date" required />
            <Select name="status" label="Status"><option value="planned">Planned</option><option value="active">Active</option></Select>
            <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-[var(--ink-soft)]"><input type="checkbox" name="is_public" /> Publish season</label>
            <div className="sm:col-span-2"><SubmitButton>Create season</SubmitButton></div>
          </form>
        </OperationCard>

        <OperationCard icon={UsersRound} title="Create team" description="Create a clean team and attach it to a season.">
          {activeSeasonId ? <form action={createTeam} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="season_id" value={activeSeasonId} />
            <Input name="name" label="Team name" placeholder="Bangkok Ballers" required wide />
            <Input name="abbreviation" label="Abbreviation" placeholder="BKB" required />
            <Input name="city" label="City" placeholder="Bangkok" />
            <Select name="conference" label="Conference"><option value="East">East</option><option value="West">West</option></Select>
            <Input name="primary_color" label="Primary" type="color" defaultValue="#ff6b22" required />
            <Input name="secondary_color" label="Secondary" type="color" defaultValue="#ffffff" required />
            <div className="sm:col-span-2"><SubmitButton>Create team</SubmitButton></div>
          </form> : <EmptyOperation text="Create a season before adding teams." />}
        </OperationCard>

        <OperationCard icon={UserRoundCog} title="Roster & Free Agents" description="Move a player to a team, between teams, or release them back to Free Agent.">
          {activeSeasonId && players.length ? <form action={movePlayer} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="season_id" value={activeSeasonId} />
            <Select name="player_id" label="Player" wide>{players.map((player) => { const roster = rosterByPlayer.get(value(player.id)); const team = teamById.get(value(roster?.team_id)); return <option key={value(player.id)} value={value(player.id)}>{value(player.roblox_username) || value(player.name)} · {team ? value(team.abbreviation) : 'Free Agent'}</option>; })}</Select>
            <Select name="team_id" label="Destination" wide><option value="">Free Agent / Release</option>{teams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.name)}</option>)}</Select>
            <Input name="jersey_number" label="Jersey #" type="number" defaultValue="0" min="0" max="99" required />
            <Select name="position" label="Position"><option>UTIL</option><option>PG</option><option>SG</option><option>SF</option><option>PF</option><option>C</option><option>G</option><option>F</option></Select>
            <div className="sm:col-span-2"><SubmitButton>Update roster</SubmitButton></div>
          </form> : <EmptyOperation text="Players appear here after Roblox login. An active season is also required." />}
        </OperationCard>

        <OperationCard icon={ShieldCheck} title="Schedule game" description="Schedule a matchup between two active league teams.">
          {activeSeasonId && teams.length >= 2 ? <form action={scheduleGame} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="season_id" value={activeSeasonId} />
            <Select name="home_team_id" label="Home team">{teams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.abbreviation)} · {value(team.name)}</option>)}</Select>
            <Select name="away_team_id" label="Away team">{teams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.abbreviation)} · {value(team.name)}</option>)}</Select>
            <Input name="starts_at" label="Tip-off" type="datetime-local" required />
            <Input name="venue" label="Venue" placeholder="PBAL Arena" />
            <div className="sm:col-span-2"><SubmitButton>Schedule game</SubmitButton></div>
          </form> : <EmptyOperation text="Create an active season with at least two teams first." />}
        </OperationCard>
      </div>
    </main>
  );
}

function OperationCard({ icon: Icon, title, description, children }: { icon: typeof CalendarPlus; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="mb-6 flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm leading-5 text-[var(--ink-soft)]">{description}</p></div></div>{children}</section>;
}
function Input({ label, wide, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span><input {...props} className="admin-input" /></label>; }
function Select({ label, wide, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span><select {...props} className="admin-input">{children}</select></label>; }
function EmptyOperation({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-[var(--line-strong)] p-6 text-center text-sm text-[var(--ink-faint)]">{text}</p>; }
