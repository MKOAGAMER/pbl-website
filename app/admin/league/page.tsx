import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, CalendarPlus, Pencil, ShieldCheck, UserRoundCog, UsersRound } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { ConfirmSubmitButton } from '../ConfirmSubmitButton';
import { ImageUploadField } from '../ImageUploadField';
import { SubmitButton } from '../SubmitButton';
import {
  createSeason,
  createTeam,
  deleteGame,
  deleteSeason,
  deleteTeam,
  movePlayer,
  scheduleGame,
  updateGame,
  updateSeason,
  updateTeam,
} from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'League Operations', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ saved?: string; error?: string }> };
type Row = Record<string, unknown>;
const value = (input: unknown) => typeof input === 'string' ? input : '';
const bool = (input: unknown) => input === true;
const numberValue = (input: unknown) => typeof input === 'number' ? input : Number(input ?? 0);
const dateTimeLocal = (input: unknown) => {
  const date = new Date(String(input ?? ''));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 16);
};

export default async function LeagueOperationsPage({ searchParams }: Props) {
  const [{ supabase, permission }, params] = await Promise.all([requireAdminPermission('staff'), searchParams]);
  const [seasonResult, teamResult, playerResult, rosterResult, seasonTeamResult, gameResult] = await Promise.all([
    supabase.from('seasons').select('id, name, status, is_public, starts_on, ends_on').order('starts_on', { ascending: false }),
    supabase.from('teams').select('id, name, abbreviation, city, description, logo_url, primary_color, secondary_color, website_url, home_venue, is_active').order('name'),
    supabase.from('players').select('id, name, roblox_username').order('name'),
    supabase.from('rosters').select('season_id, player_id, team_id, jersey_number, status').eq('status', 'active'),
    supabase.from('season_teams').select('season_id, team_id, conference, is_active'),
    supabase.from('games').select('*').order('scheduled_at', { ascending: false }).limit(100),
  ]);
  const seasons = (seasonResult.data ?? []) as Row[];
  const allTeams = (teamResult.data ?? []) as Row[];
  const players = (playerResult.data ?? []) as Row[];
  const rosters = (rosterResult.data ?? []) as Row[];
  const games = (gameResult.data ?? []) as Row[];
  const seasonTeams = (seasonTeamResult.data ?? []) as Row[];
  const activeSeason = seasons.find((season) => value(season.status) === 'active') ?? seasons[0];
  const activeSeasonId = value(activeSeason?.id);
  const activeTeamIds = new Set(seasonTeams.filter((row) => value(row.season_id) === activeSeasonId && bool(row.is_active)).map((row) => value(row.team_id)));
  const teams = allTeams.filter((team) => activeTeamIds.has(value(team.id)));
  const activeRosters = rosters.filter((roster) => value(roster.season_id) === activeSeasonId);
  const rosterByPlayer = new Map(activeRosters.map((roster) => [value(roster.player_id), roster]));
  const teamById = new Map(allTeams.map((team) => [value(team.id), team]));
  const membershipByTeam = new Map<string, Row>();
  seasonTeams.forEach((row) => {
    const teamId = value(row.team_id);
    const current = membershipByTeam.get(teamId);
    if (!current || value(row.season_id) === activeSeasonId) membershipByTeam.set(teamId, row);
  });

  return (
    <main className="site-shell py-10 sm:py-14">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Staff Control</Link>
      <div className="mt-7 border-b border-[var(--line)] pb-7">
        <p className="eyebrow">League office</p>
        <h1 className="display-type mt-4 text-5xl sm:text-6xl">League Operations</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">Create, edit, publish, archive and remove league data from one protected workspace. Changes are reflected across the public site after save.</p>
      </div>
      {params.saved && <p role="status" className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">League operation saved and public pages refreshed.</p>}
      {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">Unable to save that operation. Check required fields, duplicates and related records.</p>}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Seasons" value={seasons.length} />
        <Metric label="Teams" value={allTeams.length} />
        <Metric label="Players" value={players.length} />
        <Metric label="Games" value={games.length} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <OperationCard icon={CalendarPlus} title="Create season" description="Create a season, choose visibility and make it active when ready.">
          <form action={createSeason} className="grid gap-3 sm:grid-cols-2">
            <Input name="name" label="Season name" placeholder="PBAL Season 1" required wide />
            <Input name="starts_on" label="Start date" type="date" required />
            <Input name="ends_on" label="End date" type="date" required />
            <Select name="status" label="Status"><option value="planned">Planned</option><option value="active">Active</option></Select>
            <Checkbox name="is_public" label="Publish season" />
            <div className="sm:col-span-2"><SubmitButton>Create season</SubmitButton></div>
          </form>
        </OperationCard>

        <OperationCard icon={UsersRound} title="Create team" description="Create a team with its real logo and attach it to the current season.">
          {activeSeasonId ? <form action={createTeam} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="season_id" value={activeSeasonId} />
            <Input name="name" label="Team name" placeholder="Bangkok Ballers" required wide />
            <Input name="abbreviation" label="Abbreviation" placeholder="BKB" required />
            <Input name="city" label="City" placeholder="Bangkok" />
            <Select name="conference" label="Conference"><option value="East">East</option><option value="West">West</option></Select>
            <Input name="home_venue" label="Home venue" placeholder="PBAL Arena" />
            <Input name="primary_color" label="Primary" type="color" defaultValue="#ff6b22" required />
            <Input name="secondary_color" label="Secondary" type="color" defaultValue="#ffffff" required />
            <Input name="website_url" label="Website" type="url" placeholder="https://..." wide />
            <Textarea name="description" label="Description" wide />
            <ImageUploadField name="logo_url" label="Team logo" bucket="team-logos" help="Upload directly or paste an image URL." />
            <div className="sm:col-span-2"><SubmitButton>Create team</SubmitButton></div>
          </form> : <EmptyOperation text="Create a season before adding teams." />}
        </OperationCard>

        <OperationCard icon={UserRoundCog} title="Roster & Free Agents" description="Move a player between teams or release them as a Free Agent.">
          {activeSeasonId && players.length ? <form action={movePlayer} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="season_id" value={activeSeasonId} />
            <Select name="player_id" label="Player" wide>{players.map((player) => { const roster = rosterByPlayer.get(value(player.id)); const team = teamById.get(value(roster?.team_id)); return <option key={value(player.id)} value={value(player.id)}>{value(player.roblox_username) || value(player.name)} · {team ? value(team.abbreviation) : 'Free Agent'}</option>; })}</Select>
            <Select name="team_id" label="Destination" wide><option value="">Free Agent / Release</option>{teams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.name)}</option>)}</Select>
            <Input name="jersey_number" label="Jersey #" type="number" defaultValue="0" min="0" max="99" required />
            <PositionSelect />
            <div className="sm:col-span-2"><SubmitButton>Update roster</SubmitButton></div>
          </form> : <EmptyOperation text="Players appear here after Roblox login. An active season is also required." />}
        </OperationCard>

        <OperationCard icon={ShieldCheck} title="Schedule game" description="Schedule a matchup between two teams in the active season.">
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

      <section className="mt-12 space-y-8">
        <ManageSection icon={CalendarClock} title="Manage seasons" description="Change dates, publication and lifecycle. Only Super Admin can permanently delete a season.">
          {seasons.map((season) => <details key={value(season.id)} className="admin-record"><summary>{value(season.name)} <RecordMeta>{value(season.status)} · {bool(season.is_public) ? 'Public' : 'Hidden'}</RecordMeta></summary><div className="mt-4 grid gap-3">
            <form action={updateSeason} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="season_id" value={value(season.id)} />
              <Input name="name" label="Season name" defaultValue={value(season.name)} required wide />
              <Input name="starts_on" label="Start date" type="date" defaultValue={value(season.starts_on)} required />
              <Input name="ends_on" label="End date" type="date" defaultValue={value(season.ends_on)} required />
              <Select name="status" label="Status" defaultValue={value(season.status)}><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></Select>
              <Checkbox name="is_public" label="Publish season" defaultChecked={bool(season.is_public)} />
              <div className="sm:col-span-2"><SubmitButton>Save season</SubmitButton></div>
            </form>
            {permission === 'super_admin' && <form action={deleteSeason}><input type="hidden" name="season_id" value={value(season.id)} /><ConfirmSubmitButton message={`Delete ${value(season.name)} and all of its games, rosters and statistics?`}>Delete season</ConfirmSubmitButton></form>}
          </div></details>)}
          {!seasons.length && <EmptyOperation text="No seasons yet." />}
        </ManageSection>

        <ManageSection icon={UsersRound} title="Manage teams" description="Edit team identity, upload a logo, change conference, archive or delete a team.">
          {allTeams.map((team) => {
            const membership = membershipByTeam.get(value(team.id));
            return <details key={value(team.id)} className="admin-record"><summary>{value(team.name)} <RecordMeta>{value(team.abbreviation)} · {bool(team.is_active) ? 'Active' : 'Archived'}</RecordMeta></summary><div className="mt-4 grid gap-3">
              <form action={updateTeam} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="team_id" value={value(team.id)} /><input type="hidden" name="season_id" value={value(membership?.season_id)} />
                <Input name="name" label="Team name" defaultValue={value(team.name)} required wide />
                <Input name="abbreviation" label="Abbreviation" defaultValue={value(team.abbreviation)} required />
                <Input name="city" label="City" defaultValue={value(team.city)} />
                <Select name="conference" label="Conference" defaultValue={value(membership?.conference) || 'East'}><option value="East">East</option><option value="West">West</option></Select>
                <Input name="home_venue" label="Home venue" defaultValue={value(team.home_venue)} />
                <Input name="primary_color" label="Primary" type="color" defaultValue={value(team.primary_color) || '#ff6b22'} required />
                <Input name="secondary_color" label="Secondary" type="color" defaultValue={value(team.secondary_color) || '#ffffff'} required />
                <Input name="website_url" label="Website" type="url" defaultValue={value(team.website_url)} wide />
                <Textarea name="description" label="Description" defaultValue={value(team.description)} wide />
                <ImageUploadField name="logo_url" label="Team logo" bucket="team-logos" initialValue={value(team.logo_url)} />
                <Checkbox name="is_active" label="Team is active" defaultChecked={bool(team.is_active)} />
                <div className="sm:col-span-2"><SubmitButton>Save team</SubmitButton></div>
              </form>
              <form action={deleteTeam}><input type="hidden" name="team_id" value={value(team.id)} /><ConfirmSubmitButton message={`Remove ${value(team.name)}? Teams with game history are archived instead of destroyed.`}>Remove team</ConfirmSubmitButton></form>
            </div></details>;
          })}
          {!allTeams.length && <EmptyOperation text="No teams yet." />}
        </ManageSection>

        <ManageSection icon={Pencil} title="Manage games" description="Correct schedule, matchup, status, scores, stream URL and notes, or remove a game.">
          {games.map((game) => {
            const home = teamById.get(value(game.home_team_id)); const away = teamById.get(value(game.away_team_id));
            return <details key={value(game.id)} className="admin-record"><summary>{value(home?.abbreviation) || 'TBD'} vs {value(away?.abbreviation) || 'TBD'} <RecordMeta>{value(game.status)} · {new Date(value(game.scheduled_at)).toLocaleDateString('en-GB')}</RecordMeta></summary><div className="mt-4 grid gap-3">
              <form action={updateGame} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="game_id" value={value(game.id)} />
                <Select name="home_team_id" label="Home team" defaultValue={value(game.home_team_id)}>{allTeams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.abbreviation)} · {value(team.name)}</option>)}</Select>
                <Select name="away_team_id" label="Away team" defaultValue={value(game.away_team_id)}>{allTeams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.abbreviation)} · {value(team.name)}</option>)}</Select>
                <Input name="starts_at" label="Tip-off" type="datetime-local" defaultValue={dateTimeLocal(game.scheduled_at)} required />
                <Input name="venue" label="Venue" defaultValue={value(game.venue)} />
                <Select name="status" label="Status" defaultValue={value(game.status)}><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="final">Final</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></Select>
                <Select name="result_type" label="Result type" defaultValue={value(game.result_type) || 'played'}><option value="played">Played game</option><option value="forfeit">Forfeit / walkover (20–0)</option></Select>
                <Select name="forfeit_team_id" label="Team that forfeited" defaultValue={value(game.forfeit_team_id)}><option value="">None</option>{allTeams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.abbreviation)} · {value(team.name)}</option>)}</Select>
                <Input name="stream_url" label="Stream URL" type="url" defaultValue={value(game.stream_url)} />
                <Input name="home_score" label="Home score" type="number" min="0" defaultValue={game.home_score === null ? '' : numberValue(game.home_score)} />
                <Input name="away_score" label="Away score" type="number" min="0" defaultValue={game.away_score === null ? '' : numberValue(game.away_score)} />
                <Textarea name="notes" label="Notes" defaultValue={value(game.notes)} wide />
                <div className="sm:col-span-2"><SubmitButton>Save game</SubmitButton></div>
              </form>
              <form action={deleteGame}><input type="hidden" name="game_id" value={value(game.id)} /><ConfirmSubmitButton message="Delete this game and its box score permanently?">Delete game</ConfirmSubmitButton></form>
            </div></details>;
          })}
          {!games.length && <EmptyOperation text="No games scheduled yet." />}
        </ManageSection>
      </section>
    </main>
  );
}

function Metric({ label, value: metricValue }: { label: string; value: number }) { return <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"><p className="text-[0.6rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{label}</p><p className="mt-2 text-3xl font-black">{metricValue}</p></div>; }
function OperationCard({ icon: Icon, title, description, children }: { icon: typeof CalendarPlus; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="mb-6 flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm leading-5 text-[var(--ink-soft)]">{description}</p></div></div>{children}</section>; }
function ManageSection({ icon: Icon, title, description, children }: { icon: typeof CalendarPlus; title: string; description: string; children: React.ReactNode }) { return <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div className="mb-5 flex gap-3"><Icon className="mt-0.5 h-5 w-5 text-[var(--orange-soft)]" /><div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">{description}</p></div></div><div className="space-y-3">{children}</div></section>; }
function RecordMeta({ children }: { children: React.ReactNode }) { return <span className="ml-2 text-xs font-medium text-[var(--ink-faint)]">{children}</span>; }
function Input({ label, wide, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span><input {...props} className="admin-input" /></label>; }
function Textarea({ label, wide, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span><textarea {...props} rows={3} className="admin-input py-3" /></label>; }
function Select({ label, wide, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; wide?: boolean }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span><select {...props} className="admin-input">{children}</select></label>; }
function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) { return <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-[var(--ink-soft)]"><input {...props} type="checkbox" /> {label}</label>; }
function PositionSelect({ defaultValue = 'UTIL' }: { defaultValue?: string }) { return <Select name="position" label="Position" defaultValue={defaultValue}><option>UTIL</option><option>PG</option><option>SG</option><option>SF</option><option>PF</option><option>C</option><option>G</option><option>F</option></Select>; }
function EmptyOperation({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-[var(--line-strong)] p-6 text-center text-sm text-[var(--ink-faint)]">{text}</p>; }
