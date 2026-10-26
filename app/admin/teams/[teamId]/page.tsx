import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Crown, ShieldAlert, UserPlus } from 'lucide-react';
import { notFound } from 'next/navigation';
import { requireAdminPermission } from '@/lib/admin-auth';
import { ConfirmSubmitButton } from '../../ConfirmSubmitButton';
import { ImageUploadField } from '../../ImageUploadField';
import { SubmitButton } from '../../SubmitButton';
import { assignTeamMember, removeTeamCommand, updateTeamCommand } from '../../league/actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Manage Team', robots: { index: false, follow: false } };

type Props = { params: Promise<{ teamId: string }>; searchParams: Promise<{ saved?: string; error?: string }> };
type Player = { id: string; name: string; roblox_username: string | null; avatar_url: string | null; position: string | null; team_id: string | null; is_active: boolean };
type Roster = { player_id: string; team_id: string; jersey_number: number | null; position: string | null; is_captain: boolean };
type Team = { id: string; name: string; abbreviation: string; city: string | null; description: string | null; logo_url: string | null; primary_color: string | null; secondary_color: string | null; website_url: string | null; home_venue: string | null; is_active: boolean };
const positions = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'];

export default async function ManageTeamPage({ params, searchParams }: Props) {
  const [{ teamId }, query] = await Promise.all([params, searchParams]);
  const { supabase } = await requireAdminPermission('staff');
  const [{ data: team }, { data: seasons }] = await Promise.all([
    supabase.from('teams').select('id, name, abbreviation, city, description, logo_url, primary_color, secondary_color, website_url, home_venue, is_active').eq('id', teamId).maybeSingle(),
    supabase.from('seasons').select('id, name, status').order('starts_on', { ascending: false }),
  ]);
  if (!team) notFound();
  const activeSeason = seasons?.find((season) => season.status === 'active') ?? seasons?.[0] ?? null;
  const [{ data: memberships }, { data: players }, { data: rosters }] = activeSeason
    ? await Promise.all([
        supabase.from('season_teams').select('team_id, conference, is_active').eq('season_id', activeSeason.id),
        supabase.from('players').select('id, name, roblox_username, avatar_url, position, team_id, is_active').eq('is_active', true).order('name'),
        supabase.from('rosters').select('player_id, team_id, jersey_number, position, is_captain').eq('season_id', activeSeason.id).eq('status', 'active'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];
  const typedTeam = team as Team;
  const currentMembership = memberships?.find((item) => item.team_id === teamId) ?? null;
  const rosterByPlayer = new Map((rosters ?? []).map((row) => [row.player_id, row as Roster]));
  const roster = ((players ?? []) as Player[]).flatMap((player) => {
    const assignment = rosterByPlayer.get(player.id);
    return assignment?.team_id === teamId ? [{ player, assignment }] : [];
  }).sort((a, b) => Number(b.assignment.is_captain) - Number(a.assignment.is_captain) || a.player.name.localeCompare(b.player.name));
  const freeAgents = ((players ?? []) as Player[]).filter((player) => !rosterByPlayer.has(player.id));
  const destinationTeams = ((memberships ?? []) as { team_id: string; conference: string | null; is_active: boolean }[]).filter((membership) => membership.is_active).map((membership) => membership.team_id);
  const teamsById = new Map((await supabase.from('teams').select('id, name, abbreviation').in('id', destinationTeams)).data?.map((item) => [item.id, item]) ?? []);

  return (
    <main className="site-shell py-10 sm:py-14">
      <Link href="/admin/teams" className="inline-flex items-center gap-2 text-xs font-bold text-[var(--ink-faint)] transition hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Team Command</Link>
      <section className="relative mt-7 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
        <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: typedTeam.primary_color || '#ff6b22' }} />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><TeamLogo team={typedTeam} /><div><p className="text-[0.65rem] font-black uppercase tracking-[.14em] text-[var(--orange-soft)]">Team workspace</p><h1 className="mt-1 text-3xl font-black tracking-[-.045em] sm:text-4xl">{typedTeam.name}</h1><p className="mt-1 text-sm text-[var(--ink-soft)]">{activeSeason?.name ?? 'Season not configured'} · {currentMembership?.conference || 'Unassigned conference'}</p></div></div><div className="rounded-xl border border-[var(--line)] bg-[var(--page)] px-4 py-3"><span className="block text-[0.6rem] font-black uppercase tracking-[.1em] text-[var(--ink-faint)]">Active roster</span><span className="mt-1 block text-2xl font-black">{roster.length}</span></div></div>
      </section>

      {query.saved && <p role="status" className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">Team Command saved your changes and refreshed public league data.</p>}
      {query.error && <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">That change could not be saved. Verify the selected destination team and roster details.</p>}

      {!activeSeason || !currentMembership ? <div className="mt-6 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-100"><ShieldAlert className="mb-2 h-5 w-5" />This team is not attached to a working season. Add it to a season in League Operations before editing its roster.</div> : <>
        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)]"><div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-6"><div><p className="text-[0.65rem] font-black uppercase tracking-[.12em] text-[var(--orange-soft)]">Roster control</p><h2 className="mt-1 text-xl font-black">Players and roles</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">Choose a destination and save to move the player immediately.</p></div><span className="rounded-full bg-[var(--orange)]/10 px-3 py-1.5 text-xs font-bold text-[var(--orange-soft)]">{roster.length} active</span></div>
            <div className="divide-y divide-[var(--line)]">{roster.length ? roster.map(({ player, assignment }) => <PlayerRow key={player.id} teamId={teamId} seasonId={activeSeason.id} player={player} assignment={assignment} teams={teamsById} />) : <p className="px-6 py-10 text-center text-sm text-[var(--ink-soft)]">No active players. Add a Free Agent from the panel on the right.</p>}</div>
          </div>
          <aside className="h-fit rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><div className="flex gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--orange)]/10 text-[var(--orange-soft)]"><UserPlus className="h-5 w-5" /></span><div><h2 className="font-black">Add Free Agent</h2><p className="mt-1 text-sm leading-5 text-[var(--ink-soft)]">Sign an unassigned player to this roster.</p></div></div>
            {freeAgents.length ? <form action={assignTeamMember} className="mt-5 space-y-3"><input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="season_id" value={activeSeason.id} /><input type="hidden" name="destination_team_id" value={teamId} /><Field label="Player"><select name="player_id" className="admin-input">{freeAgents.map((player) => <option key={player.id} value={player.id}>{player.roblox_username || player.name}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Jersey #"><input name="jersey_number" className="admin-input" type="number" min="0" max="99" defaultValue="0" required /></Field><Field label="Position"><PositionSelect /></Field></div><label className="flex items-center gap-2 text-sm font-bold text-[var(--ink-soft)]"><input name="is_captain" type="checkbox" /> Team captain</label><SubmitButton>Sign player</SubmitButton></form> : <p className="mt-5 rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-sm text-[var(--ink-faint)]">No Free Agents available in this season.</p>}
          </aside>
        </section>

        <section className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <TeamIdentity team={typedTeam} seasonId={activeSeason.id} conference={currentMembership.conference || 'East'} />
          <section className="h-fit rounded-2xl border border-red-400/20 bg-red-400/[.045] p-5"><div className="flex gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 text-red-300" /><div><h2 className="font-black">Remove team</h2><p className="mt-1 text-sm leading-5 text-[var(--ink-soft)]">A team with matches, trades or tournament history is archived safely. A team without history is removed permanently.</p></div></div><form action={removeTeamCommand} className="mt-5"><input type="hidden" name="team_id" value={teamId} /><ConfirmSubmitButton message={`Remove ${typedTeam.name}? Historical teams are archived; empty teams are permanently deleted.`}>Remove team</ConfirmSubmitButton></form></section>
        </section>
      </>}
    </main>
  );
}

function PlayerRow({ teamId, seasonId, player, assignment, teams }: { teamId: string; seasonId: string; player: Player; assignment: Roster; teams: Map<string, { id: string; name: string; abbreviation: string }> }) {
  return <form action={assignTeamMember} className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(11rem,1fr)_6rem_6rem_minmax(9rem,.8fr)_auto] sm:items-end sm:px-6"><input type="hidden" name="team_id" value={teamId} /><input type="hidden" name="season_id" value={seasonId} /><input type="hidden" name="player_id" value={player.id} /><div className="flex min-w-0 items-center gap-3"><Avatar player={player} /><div className="min-w-0"><p className="truncate font-black">{player.name}</p><p className="truncate text-xs text-[var(--ink-faint)]">@{player.roblox_username || 'unknown'} {assignment.is_captain && <span className="ml-1 inline-flex items-center gap-1 text-amber-300"><Crown className="h-3 w-3" />Captain</span>}</p></div></div><Field label="Jersey"><input name="jersey_number" className="admin-input" type="number" min="0" max="99" defaultValue={assignment.jersey_number ?? 0} required /></Field><Field label="Position"><PositionSelect defaultValue={assignment.position || player.position || 'UTIL'} /></Field><Field label="Destination"><select name="destination_team_id" className="admin-input" defaultValue={teamId}><option value="">Release to Free Agent</option>{[...teams.values()].map((team) => <option key={team.id} value={team.id}>{team.abbreviation} · {team.name}</option>)}</select></Field><div><label className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--ink-soft)]"><input name="is_captain" type="checkbox" defaultChecked={assignment.is_captain} /> Captain</label><SubmitButton>Save</SubmitButton></div></form>;
}

function TeamIdentity({ team, seasonId, conference }: { team: Team; seasonId: string; conference: string }) {
  return <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"><div><p className="text-[0.65rem] font-black uppercase tracking-[.12em] text-[var(--orange-soft)]">Team profile</p><h2 className="mt-1 text-xl font-black">Identity and public details</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">These fields are used across the directory, schedule, standings and team profile.</p></div><form action={updateTeamCommand} className="mt-6 grid gap-3 sm:grid-cols-2"><input type="hidden" name="team_id" value={team.id} /><input type="hidden" name="season_id" value={seasonId} /><Field label="Team name" wide><input name="name" className="admin-input" defaultValue={team.name} required /></Field><Field label="Abbreviation"><input name="abbreviation" className="admin-input" defaultValue={team.abbreviation} maxLength={6} required /></Field><Field label="City"><input name="city" className="admin-input" defaultValue={team.city || ''} /></Field><Field label="Conference"><select name="conference" className="admin-input" defaultValue={conference}><option value="East">East</option><option value="West">West</option></select></Field><Field label="Home venue"><input name="home_venue" className="admin-input" defaultValue={team.home_venue || ''} /></Field><Field label="Primary colour"><input name="primary_color" className="admin-input !p-1" type="color" defaultValue={team.primary_color || '#ff6b22'} required /></Field><Field label="Secondary colour"><input name="secondary_color" className="admin-input !p-1" type="color" defaultValue={team.secondary_color || '#ffffff'} required /></Field><Field label="Website" wide><input name="website_url" className="admin-input" type="url" defaultValue={team.website_url || ''} placeholder="https://..." /></Field><Field label="Description" wide><textarea name="description" className="admin-input min-h-28 py-3" defaultValue={team.description || ''} /></Field><div className="sm:col-span-2"><ImageUploadField name="logo_url" label="Team logo" bucket="team-logos" initialValue={team.logo_url || ''} /></div><label className="sm:col-span-2 flex items-center gap-2 text-sm font-bold text-[var(--ink-soft)]"><input name="is_active" type="checkbox" defaultChecked={team.is_active} /> Team is active and visible publicly</label><div className="sm:col-span-2"><SubmitButton>Save team profile</SubmitButton></div></form></section>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[.1em] text-[var(--ink-faint)]">{label}</span>{children}</label>; }
function PositionSelect({ defaultValue = 'UTIL' }: { defaultValue?: string }) { return <select name="position" className="admin-input" defaultValue={defaultValue}>{positions.map((position) => <option key={position}>{position}</option>)}</select>; }
function Avatar({ player }: { player: Player }) { return <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--orange)]/15 text-xs font-black text-[var(--orange-soft)]">{player.avatar_url ? (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={player.avatar_url} alt="" className="h-full w-full object-cover" />
) : player.name.slice(0, 2).toUpperCase()}</span>; }
function TeamLogo({ team }: { team: Team }) { return <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-soft)] text-base font-black" style={{ color: team.primary_color || '#ff784b' }}>{team.logo_url ? (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={team.logo_url} alt="" className="h-full w-full object-contain p-2" />
) : team.abbreviation}</span>; }
