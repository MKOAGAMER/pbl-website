import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { CalendarPlus, Database, FilePlus2, ShieldCheck, Trophy, UserCog, UserPlus, Users, type LucideIcon } from 'lucide-react';
import { getStaffSession, type StaffRole } from '@/lib/admin-auth';
import { formatGameDate, formatGameTime } from '@/lib/utils';
import { assignPlayerToRoster, createGame, createNewsPost, createPlayer, createSeason, createTeam, updateSeason, updateStaffRole, updateTeamProfile, upsertPlayerStats } from './actions';
import { getAdminError, getAdminSuccess } from './notices';
import { ScoreDesk } from './ScoreDesk';
import { SubmitButton } from './SubmitButton';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'PBL league operations dashboard.',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const query = await searchParams;
  const session = await getStaffSession();
  if (!session.supabase || !session.user) redirect('/login?next=/admin');

  const role = String(session.profile?.role ?? 'member') as StaffRole;
  const isStaff = ['team_manager', 'editor', 'statistician', 'admin', 'super_admin'].includes(role);
  if (!isStaff) {
    return (
      <section className="site-shell grid min-h-[65vh] place-items-center py-16 text-center">
        <div className="max-w-lg">
          <ShieldCheck className="mx-auto h-9 w-9 text-[var(--ink-faint)]" />
          <p className="eyebrow mt-6">Authenticated</p>
          <h1 className="display-type mt-4 text-5xl">No staff role assigned.</h1>
          <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">Your account is valid, but a super administrator must update your profile role before you can manage league data.</p>
          <Link href="/" className="mt-8 inline-flex rounded-full border border-[var(--line)] px-5 py-3 text-xs font-black uppercase tracking-[0.12em]">Return to site</Link>
        </div>
      </section>
    );
  }

  const canAdmin = role === 'admin' || role === 'super_admin';
  const canEdit = canAdmin || role === 'editor';
  const canManageTeam = canEdit || role === 'team_manager';
  const canAssignRoster = canManageTeam;
  const canScore = canEdit || role === 'statistician';
  const canSchedule = canEdit;

  const [seasonsResult, teamsResult, playersResult, gamesResult, newsResult, profilesResult] = await Promise.all([
    session.supabase.from('seasons').select('id, name, status, is_public').order('starts_on', { ascending: false }),
    session.supabase.from('teams').select('id, name, abbreviation, city, description, logo_url, primary_color, secondary_color, is_active').order('name'),
    session.supabase.from('players').select('id, first_name, last_name, position, team_id, is_active').order('last_name'),
    session.supabase.from('games').select('id, scheduled_at, status, home_team_id, away_team_id, home_score, away_score').order('scheduled_at', { ascending: false }),
    session.supabase.from('news_posts').select('id, title, status, published_at').order('created_at', { ascending: false }).limit(10),
    session.supabase.from('profiles').select('id, display_name, role, managed_team_id').order('display_name'),
  ]);

  const seasons = seasonsResult.data ?? [];
  const teams = teamsResult.data ?? [];
  const players = playersResult.data ?? [];
  const games = gamesResult.data ?? [];
  const stories = newsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const setupError = [seasonsResult.error, teamsResult.error, playersResult.error, gamesResult.error, newsResult.error, profilesResult.error].find(Boolean);
  if (setupError) console.error('[pbl-admin:load-dashboard]', setupError.code, setupError.message);
  const teamName = (id: string | null) => teams.find((team) => team.id === id)?.abbreviation ?? 'TBD';
  const availableTeams = role === 'team_manager'
    ? teams.filter((team) => team.id === session.profile?.managed_team_id)
    : teams;
  const hasScoreDeskGames = games.some((game) => {
    const status = String(game.status).toLowerCase();
    return status === 'scheduled' || status === 'live' || (canEdit && status === 'final');
  });
  const boxScoreGames = games.filter(
    (game) => String(game.status).toLowerCase() === 'live',
  );
  const successMessage = getAdminSuccess(query.success);
  const errorMessage = getAdminError(query.error);

  return (
    <>
      <header className="border-b border-[var(--line)] bg-[var(--page-deep)] py-10">
        <div className="site-shell flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">League operations</p>
            <h1 className="display-type mt-4 text-4xl sm:text-5xl">PBL Admin</h1>
            <p className="mt-3 text-sm text-[var(--ink-soft)]">Signed in as {session.profile?.display_name ?? session.user.email} · <span className="font-bold text-[var(--orange-soft)]">{role.replaceAll('_', ' ')}</span></p>
          </div>
          <nav className="hide-scrollbar flex gap-2 overflow-x-auto" aria-label="Admin sections">
            {['Overview', 'Seasons', 'Teams', 'Players', 'Games', 'News', ...(canAdmin ? ['Staff'] : [])].map((label) => <a key={label} href={`#${label.toLowerCase()}`} className="shrink-0 rounded-full border border-[var(--line)] px-4 py-2 text-[0.65rem] font-black uppercase tracking-[0.11em] text-[var(--ink-soft)] hover:text-[var(--ink)]">{label}</a>)}
          </nav>
        </div>
      </header>

      <div className="site-shell space-y-10 py-10">
        {successMessage && <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-4 text-sm text-emerald-200">{successMessage}</div>}
        {errorMessage && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-4 text-sm text-red-200">{errorMessage}</div>}
        {setupError && (
          <div className="rounded-[1.4rem] border border-amber-400/20 bg-amber-400/10 p-5 text-sm leading-6 text-amber-100">
            <strong className="flex items-center gap-2"><Database className="h-4 w-4" /> Supabase schema is not ready</strong>
            <span className="mt-2 block text-amber-100/70">Run the SQL migration in the Supabase SQL Editor, then reload this page. Seed data is optional outside production.</span>
          </div>
        )}

        <section id="overview" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetric icon={Trophy} value={teams.length} label="Teams" />
          <AdminMetric icon={Users} value={players.length} label="Players" />
          <AdminMetric icon={CalendarPlus} value={games.length} label="Recent games" />
          <AdminMetric icon={FilePlus2} value={stories.length} label="Stories" />
        </section>

        <div className="grid gap-6 xl:grid-cols-2">
          <AdminPanel id="seasons" title="Season setup" description="Create the first season before adding clubs or games." icon={CalendarPlus} allowed={canEdit} denied="Only editors and administrators can create seasons.">
            <div className="space-y-7">
              <form action={createSeason} className="grid gap-4 sm:grid-cols-2">
                <p className="sm:col-span-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Create season</p>
                <Field label="Season name" wide><input name="name" required placeholder="PBL Season 2026" className="admin-input" /></Field>
                <Field label="Starts on"><input name="starts_on" type="date" required className="admin-input" /></Field>
                <Field label="Ends on"><input name="ends_on" type="date" required className="admin-input" /></Field>
                <Field label="Status"><select name="status" className="admin-input"><option value="planned">Planned</option><option value="active">Active</option></select></Field>
                <label className="flex items-center gap-2 self-end pb-3 text-sm text-[var(--ink-soft)]"><input type="checkbox" name="is_public" className="accent-[var(--orange)]" /> Show this season publicly</label>
                <div className="sm:col-span-2"><SubmitButton>Create season</SubmitButton></div>
              </form>
              {seasons.length > 0 && (
                <form action={updateSeason} className="grid gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Update season</p>
                  <Field label="Season"><select name="season_id" required className="admin-input"><option value="">Select season</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></Field>
                  <Field label="Status"><select name="status" className="admin-input"><option value="planned">Planned</option><option value="active">Active</option><option value="completed">Completed</option><option value="archived">Archived</option></select></Field>
                  <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]"><input type="checkbox" name="is_public" className="accent-[var(--orange)]" /> Keep public</label>
                  <div className="sm:col-span-2"><SubmitButton>Update season</SubmitButton></div>
                </form>
              )}
            </div>
          </AdminPanel>

          <AdminPanel id="teams" title="Teams" description="Create clubs or update the team you are responsible for." icon={Trophy} allowed={canManageTeam} denied="Your role cannot manage teams.">
            <div className="space-y-7">
              {canEdit && (
                <form action={createTeam} className="grid gap-4 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Create club</p>
                  <Field label="Team name"><input name="name" required placeholder="Bangkok Blaze" className="admin-input" /></Field>
                  <Field label="Abbreviation"><input name="abbreviation" required minLength={2} maxLength={6} placeholder="BBZ" className="admin-input uppercase" /></Field>
                  <Field label="Season"><select name="season_id" required className="admin-input"><option value="">Select season</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></Field>
                  <Field label="Conference"><select name="conference" className="admin-input"><option>East</option><option>West</option></select></Field>
                  <Field label="City"><input name="city" placeholder="Bangkok" className="admin-input" /></Field>
                  <Field label="Primary color"><input name="primary_color" type="color" defaultValue="#ff6b22" className="admin-input h-11 p-1" /></Field>
                  <Field label="Secondary color"><input name="secondary_color" type="color" defaultValue="#ffb067" className="admin-input h-11 p-1" /></Field>
                  <Field label="Description" wide><textarea name="description" rows={3} placeholder="Team identity and short bio" className="admin-input py-3" /></Field>
                  <div className="sm:col-span-2"><SubmitButton>Create team</SubmitButton></div>
                </form>
              )}
              <form action={updateTeamProfile} className="grid gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
                <p className="sm:col-span-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Update team profile</p>
                <Field label="Team" wide><select name="team_id" required className="admin-input"><option value="">Select team</option>{availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
                <Field label="City"><input name="city" placeholder="Bangkok" className="admin-input" /></Field>
                <Field label="Logo URL"><input name="logo_url" type="url" placeholder="https://..." className="admin-input" /></Field>
                <Field label="Primary color"><input name="primary_color" type="color" defaultValue="#ff6b22" className="admin-input h-11 p-1" /></Field>
                <Field label="Secondary color"><input name="secondary_color" type="color" defaultValue="#ffb067" className="admin-input h-11 p-1" /></Field>
                <Field label="Description" wide><textarea name="description" rows={3} className="admin-input py-3" /></Field>
                <div className="sm:col-span-2"><SubmitButton>Update team</SubmitButton></div>
              </form>
            </div>
          </AdminPanel>

          <AdminPanel id="players" title="Players & rosters" description="Create players or assign an existing player to a season roster." icon={UserPlus} allowed={canAssignRoster} denied="Your role cannot manage rosters.">
            <div className="space-y-7">
              {canEdit && (
                <form action={createPlayer} className="grid gap-4 sm:grid-cols-2">
                  <p className="sm:col-span-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Create player</p>
                  <Field label="First name"><input name="first_name" required className="admin-input" /></Field>
                  <Field label="Last name"><input name="last_name" required className="admin-input" /></Field>
                  <Field label="Position"><select name="position" className="admin-input">{['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'].map((position) => <option key={position}>{position}</option>)}</select></Field>
                  <Field label="Jersey number"><input name="jersey_number" type="number" min="0" max="99" required className="admin-input" /></Field>
                  <Field label="Roblox username"><input name="roblox_username" minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" placeholder="PlayerUsername" className="admin-input" /></Field>
                  <Field label="Photo URL"><input name="avatar_url" type="url" placeholder="https://..." className="admin-input" /></Field>
                  <Field label="Season"><select name="season_id" required className="admin-input"><option value="">Select season</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></Field>
                  <Field label="Team"><select name="team_id" required className="admin-input"><option value="">Select team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
                  <Field label="Player bio" wide><textarea name="bio" rows={3} className="admin-input py-3" /></Field>
                  <div className="sm:col-span-2"><SubmitButton>Add player</SubmitButton></div>
                </form>
              )}
              <form action={assignPlayerToRoster} className="grid gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2">
                <p className="sm:col-span-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Assign existing player</p>
                <Field label="Player" wide><select name="player_id" required className="admin-input"><option value="">Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name}</option>)}</select></Field>
                <Field label="Season"><select name="season_id" required className="admin-input"><option value="">Select season</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></Field>
                <Field label="Team"><select name="team_id" required className="admin-input"><option value="">Select team</option>{availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
                <Field label="Position"><select name="position" className="admin-input">{['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'].map((position) => <option key={position}>{position}</option>)}</select></Field>
                <Field label="Jersey number"><input name="jersey_number" type="number" min="0" max="99" required className="admin-input" /></Field>
                <div className="sm:col-span-2"><SubmitButton>Assign roster spot</SubmitButton></div>
              </form>
            </div>
          </AdminPanel>

          <AdminPanel id="games" title="Schedule a game" description="Create the next matchup in the current season." icon={CalendarPlus} allowed={canSchedule} denied="Only editors and administrators can schedule games.">
            <form action={createGame} className="grid gap-4 sm:grid-cols-2">
              <Field label="Season"><select name="season_id" required className="admin-input"><option value="">Select season</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}</select></Field>
              <Field label="Round / week"><input name="round_number" type="number" min="1" defaultValue="1" required className="admin-input" /></Field>
              <Field label="Home team"><select name="home_team_id" required className="admin-input"><option value="">Select team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
              <Field label="Away team"><select name="away_team_id" required className="admin-input"><option value="">Select team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
              <Field label="Tip-off (ICT)"><input name="scheduled_at" type="datetime-local" required className="admin-input" /></Field>
              <Field label="Venue"><input name="venue" placeholder="PBL Arena 1" className="admin-input" /></Field>
              <Field label="Stream URL" wide><input name="stream_url" type="url" placeholder="https://youtube.com/..." className="admin-input" /></Field>
              <div className="sm:col-span-2"><SubmitButton>Schedule game</SubmitButton></div>
            </form>
          </AdminPanel>

          <AdminPanel id="news" title="Newsroom" description="Draft or publish a league story." icon={FilePlus2} allowed={canEdit} denied="Only editors and administrators can publish stories.">
            <form action={createNewsPost} className="grid gap-4 sm:grid-cols-2">
              <Field label="Headline" wide><input name="title" required className="admin-input" /></Field>
              <Field label="Category"><input name="category" defaultValue="League" required className="admin-input" /></Field>
              <Field label="Status"><select name="status" className="admin-input"><option value="draft">Draft</option><option value="published">Publish now</option></select></Field>
              <Field label="Cover image URL"><input name="cover_url" type="url" placeholder="https://..." className="admin-input" /></Field>
              <Field label="Excerpt" wide><textarea name="excerpt" rows={2} required className="admin-input py-3" /></Field>
              <Field label="Story" wide><textarea name="content" rows={7} required className="admin-input py-3" placeholder="Separate paragraphs with a blank line." /></Field>
              <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]"><input type="checkbox" name="is_featured" className="accent-[var(--orange)]" /> Feature on home page</label>
              <div className="sm:col-span-2"><SubmitButton>Save story</SubmitButton></div>
            </form>
          </AdminPanel>

          {canAdmin && (
            <AdminPanel id="staff" title="Staff roles" description="Assign operational access. Only a super administrator can grant or revoke super admin." icon={UserCog} allowed={canAdmin} denied="Only administrators can manage roles.">
              <form action={updateStaffRole} className="grid gap-4 sm:grid-cols-2">
                <Field label="Account" wide><select name="profile_id" required className="admin-input"><option value="">Select account</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.display_name} · {String(profile.role).replaceAll('_', ' ')}</option>)}</select></Field>
                <Field label="Role"><select name="role" className="admin-input">{['member', 'team_manager', 'statistician', 'editor', 'admin', ...(role === 'super_admin' ? ['super_admin'] : [])].map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></Field>
                <Field label="Managed team"><select name="managed_team_id" className="admin-input"><option value="">Not assigned</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></Field>
                <p className="sm:col-span-2 text-xs leading-5 text-[var(--ink-faint)]">A managed team is required only for the team manager role. The database prevents removal of the final super administrator.</p>
                <div className="sm:col-span-2"><SubmitButton>Update role</SubmitButton></div>
              </form>
            </AdminPanel>
          )}
        </div>

        {canScore && hasScoreDeskGames && (
          <section className="rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.13em] text-[var(--orange-soft)]">Score desk</p><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Update a result</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">The available action follows the selected game state: start scheduled games, update or finalize live games, and — for editors — reopen finals before correcting them.</p></div>
            <ScoreDesk games={games} teams={teams} canEdit={canEdit} />
          </section>
        )}

        {canScore && boxScoreGames.length > 0 && players.length > 0 && (
          <section className="rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
            <details>
              <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-4">
                  <div><p className="text-xs font-black uppercase tracking-[0.13em] text-[var(--orange-soft)]">Box score</p><h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Enter a player stat line</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">Select a live game. Saving the same player again updates that stat line; reopen a final game first if a correction is required.</p></div>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[var(--line)] text-lg">+</span>
                </div>
              </summary>
              <form action={upsertPlayerStats} className="mt-6 grid gap-4 border-t border-[var(--line)] pt-6 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Game" wide><select name="game_id" required className="admin-input"><option value="">Select game</option>{boxScoreGames.map((game) => <option key={game.id} value={game.id}>{teamName(game.away_team_id)} @ {teamName(game.home_team_id)} · {formatGameDate(game.scheduled_at)}</option>)}</select></Field>
                <Field label="Player" wide><select name="player_id" required className="admin-input"><option value="">Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.first_name} {player.last_name} · {teamName(player.team_id)}</option>)}</select></Field>
                <NumberField name="minutes" label="Minutes" step="0.01" max="60" />
                <NumberField name="points" label="Points" max="200" />
                <NumberField name="rebounds" label="Rebounds" max="100" />
                <NumberField name="assists" label="Assists" max="100" />
                <NumberField name="steals" label="Steals" max="50" />
                <NumberField name="blocks" label="Blocks" max="50" />
                <NumberField name="turnovers" label="Turnovers" max="50" />
                <span className="hidden lg:block" />
                <NumberField name="field_goals_made" label="FG made" max="100" />
                <NumberField name="field_goals_attempted" label="FG attempts" max="100" />
                <NumberField name="three_pointers_made" label="3PT made" max="100" />
                <NumberField name="three_pointers_attempted" label="3PT attempts" max="100" />
                <NumberField name="free_throws_made" label="FT made" max="100" />
                <NumberField name="free_throws_attempted" label="FT attempts" max="100" />
                <div className="sm:col-span-2 lg:col-span-4"><SubmitButton>Save stat line</SubmitButton></div>
              </form>
            </details>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
            <h2 className="border-b border-[var(--line)] px-5 py-4 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-soft)]">Recent games</h2>
            {games.slice(0, 8).map((game) => <div key={game.id} className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3.5 last:border-0"><div><p className="text-sm font-black">{teamName(game.away_team_id)} <span className="text-[var(--ink-faint)]">@</span> {teamName(game.home_team_id)}</p><p className="mt-1 text-xs text-[var(--ink-faint)]">{formatGameDate(game.scheduled_at)} · {formatGameTime(game.scheduled_at)}</p></div><span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em]">{game.status}</span></div>)}
          </div>
          <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
            <h2 className="border-b border-[var(--line)] px-5 py-4 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-soft)]">Recent stories</h2>
            {stories.map((story) => <div key={story.id} className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3.5 last:border-0"><p className="truncate text-sm font-black">{story.title}</p><span className="rounded-full border border-[var(--line)] px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em]">{story.status}</span></div>)}
          </div>
        </section>
      </div>
    </>
  );
}

function AdminMetric({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return <div className="flex items-center justify-between rounded-[1.35rem] border border-[var(--line)] bg-[var(--surface)] p-5"><div><p className="number-tabular text-3xl font-black tracking-[-0.06em]">{value}</p><p className="mt-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{label}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-400/10 text-[var(--orange-soft)]"><Icon className="h-5 w-5" /></span></div>;
}

function AdminPanel({ id, title, description, icon: Icon, allowed, denied, children }: { id: string; title: string; description: string; icon: LucideIcon; allowed: boolean; denied: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-6 flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--surface-soft)] text-[var(--orange-soft)]"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-black tracking-[-0.035em]">{title}</h2><p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{description}</p></div></div>
      {allowed ? children : <p className="rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-sm text-[var(--ink-faint)]">{denied}</p>}
    </section>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-2 block text-[0.65rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">{label}</span>{children}</label>;
}

function NumberField({ name, label, max, step = '1' }: { name: string; label: string; max: string; step?: string }) {
  return <Field label={label}><input name={name} type="number" min="0" max={max} step={step} defaultValue="0" required className="admin-input" /></Field>;
}
