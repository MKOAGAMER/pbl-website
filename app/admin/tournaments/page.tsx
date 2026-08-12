import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Plus, ShieldCheck, Swords, Trophy, UsersRound } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { ConfirmSubmitButton } from '../ConfirmSubmitButton';
import { ImageUploadField } from '../ImageUploadField';
import { SubmitButton } from '../SubmitButton';
import { addTournamentTeam, deleteTournament, deleteTournamentMatch, generateFibaGroupStage, generateFibaKnockout, removeTournamentTeam, saveTournament, saveTournamentMatch } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tournament Control', robots: { index: false, follow: false } };
type Props = { searchParams: Promise<{ saved?: string; error?: string }> };
type Row = Record<string, unknown>;
const value = (input: unknown) => typeof input === 'string' ? input : '';
const bool = (input: unknown) => input === true;
const num = (input: unknown) => typeof input === 'number' ? input : '';
const dateTimeLocal = (input: unknown) => {
  const date = new Date(String(input ?? ''));
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
};

export default async function TournamentControlPage({ searchParams }: Props) {
  const [{ supabase }, params] = await Promise.all([requireAdminPermission('staff'), searchParams]);
  const [tournamentResult, teamResult, seasonResult, entryResult, matchResult] = await Promise.all([
    supabase.from('tournaments').select('*').order('starts_at', { ascending: false }),
    supabase.from('teams').select('id, name, abbreviation').eq('is_active', true).order('name'),
    supabase.from('seasons').select('id, name').order('starts_on', { ascending: false }),
    supabase.from('tournament_teams').select('*').order('seed'),
    supabase.from('tournament_matches').select('*').order('match_number').order('scheduled_at'),
  ]);
  const tournaments = (tournamentResult.data ?? []) as Row[];
  const teams = (teamResult.data ?? []) as Row[];
  const seasons = (seasonResult.data ?? []) as Row[];
  const entries = (entryResult.data ?? []) as Row[];
  const matches = (matchResult.data ?? []) as Row[];
  const teamById = new Map(teams.map((team) => [value(team.id), team]));

  return <main className="site-shell py-10 sm:py-14">
    <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Staff Control</Link>
    <header className="mt-7 border-b border-[var(--line)] pb-9"><p className="eyebrow">Competition administration</p><h1 className="display-type mt-4 text-5xl sm:text-6xl">Tournament Control</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">สร้างการแข่งขัน จัดทีมและ seed วางแมตช์ ใส่ผล ผู้ชนะ ลิงก์ถ่ายทอดสด และควบคุมการเผยแพร่จากหน้านี้</p></header>
    {params.saved && <Notice good>บันทึกข้อมูล Tournament แล้ว</Notice>}{params.error && <Notice>บันทึกไม่สำเร็จ กรุณาตรวจข้อมูล ทีมที่ซ้ำ หรือช่วงเวลา</Notice>}

    <section className="mt-12 rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
      <SectionHead icon={Plus} title="Create tournament" description="เริ่มจากข้อมูลหลักก่อน แล้วค่อยเพิ่มทีมและแมตช์ด้านล่าง" />
      <form action={saveTournament} className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Tournament name" wide><input name="name" required className="admin-input" placeholder="PBAL Summer Cup" /></Field>
        <Field label="Season"><select name="season_id" className="admin-input"><option value="">No linked season</option>{seasons.map((season) => <option key={value(season.id)} value={value(season.id)}>{value(season.name)}</option>)}</select></Field>
        <FormatSelect />
        <StatusSelect />
        <Field label="Starts at"><input name="starts_at" type="datetime-local" className="admin-input" /></Field>
        <Field label="Ends at"><input name="ends_at" type="datetime-local" className="admin-input" /></Field>
        <Field label="Venue"><input name="venue" className="admin-input" /></Field>
        <Field label="Description" wide><textarea name="description" rows={5} className="admin-input py-3" /></Field>
        <ImageUploadField name="logo_url" label="Tournament image" bucket="news-images" />
        <label className="flex items-center gap-2 text-sm font-bold text-[var(--ink-soft)]"><input type="checkbox" name="is_public" /> Publish tournament</label>
        <div className="md:col-span-2 xl:col-span-3"><SubmitButton>Create tournament</SubmitButton></div>
      </form>
    </section>

    <div className="mt-16 space-y-16">
      {tournaments.map((tournament) => {
        const tournamentEntries = entries.filter((entry) => value(entry.tournament_id) === value(tournament.id));
        const tournamentMatches = matches.filter((match) => value(match.tournament_id) === value(tournament.id));
        const entryTeamIds = new Set(tournamentEntries.map((entry) => value(entry.team_id)));
        const availableTeams = teams.filter((team) => !entryTeamIds.has(value(team.id)));
        const participantTeams = tournamentEntries.map((entry) => teamById.get(value(entry.team_id))).filter(Boolean) as Row[];
        const isFiba = value(tournament.format) === 'fiba';
        const groupMatches = tournamentMatches.filter((match) => value(match.stage) === 'group' || value(match.round_label).startsWith('Group '));
        const completedGroupMatches = groupMatches.filter((match) => value(match.status) === 'final');
        const knockoutMatches = tournamentMatches.filter((match) => value(match.stage) === 'knockout');
        const matchNumbers = tournamentMatches.map((match) => num(match.match_number)).filter(Boolean);
        const duplicateMatchNumbers = new Set(matchNumbers.filter((number, index) => matchNumbers.indexOf(number) !== index));
        return <article key={value(tournament.id)} className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex flex-col gap-4 border-b border-[var(--line)] p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">{value(tournament.status)} · {value(tournament.format).replaceAll('_', ' ')}</p><h2 className="mt-2 text-3xl font-black">{value(tournament.name)}</h2><p className="mt-2 text-xs text-[var(--ink-faint)]">{tournamentEntries.length} teams · {tournamentMatches.length} matches · {bool(tournament.is_public) ? 'Public' : 'Hidden'}</p></div><a href={`/tournaments#${value(tournament.slug)}`} className="text-xs font-black uppercase tracking-[0.1em] text-[var(--orange-soft)]">View public page →</a></div>

          <div className="grid gap-5 p-6 sm:p-8">
            {duplicateMatchNumbers.size > 0 && <Notice>Integrity warning: duplicate match numbers ({[...duplicateMatchNumbers].join(', ')}). Review the historical results before publishing or archiving this tournament.</Notice>}
            <details className="admin-workspace-section"><summary><SectionHead icon={ShieldCheck} title="Tournament settings" description="แก้ข้อมูลหลัก สถานะ แชมป์ และการเผยแพร่" /></summary><div className="admin-workspace-section-body"><form action={saveTournament} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <input type="hidden" name="id" value={value(tournament.id)} />
              <Field label="Tournament name" wide><input name="name" defaultValue={value(tournament.name)} required className="admin-input" /></Field>
              <Field label="Season"><select name="season_id" defaultValue={value(tournament.season_id)} className="admin-input"><option value="">No linked season</option>{seasons.map((season) => <option key={value(season.id)} value={value(season.id)}>{value(season.name)}</option>)}</select></Field>
              <FormatSelect defaultValue={value(tournament.format)} /><StatusSelect defaultValue={value(tournament.status)} />
              <Field label="Champion"><select name="champion_team_id" defaultValue={value(tournament.champion_team_id)} className="admin-input"><option value="">No champion yet</option>{participantTeams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.name)}</option>)}</select></Field>
              <Field label="Starts at"><input name="starts_at" type="datetime-local" defaultValue={dateTimeLocal(tournament.starts_at)} className="admin-input" /></Field>
              <Field label="Ends at"><input name="ends_at" type="datetime-local" defaultValue={dateTimeLocal(tournament.ends_at)} className="admin-input" /></Field>
              <Field label="Venue"><input name="venue" defaultValue={value(tournament.venue)} className="admin-input" /></Field>
              <Field label="Description" wide><textarea name="description" defaultValue={value(tournament.description)} rows={5} className="admin-input py-3" /></Field>
              <ImageUploadField name="logo_url" label="Tournament image" bucket="news-images" initialValue={value(tournament.logo_url)} />
              <label className="flex items-center gap-2 text-sm font-bold text-[var(--ink-soft)]"><input type="checkbox" name="is_public" defaultChecked={bool(tournament.is_public)} /> Publish tournament</label>
              <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-3"><SubmitButton>Save settings</SubmitButton></div>
            </form><form action={deleteTournament} className="mt-6 border-t border-[var(--line)] pt-5"><input type="hidden" name="id" value={value(tournament.id)} /><ConfirmSubmitButton message={`Delete ${value(tournament.name)} and every tournament match?`}>Delete tournament</ConfirmSubmitButton></form></div></details>

            <details className="admin-workspace-section" open><summary><SectionHead icon={UsersRound} title="Teams & seeding" description={`เพิ่มหรือลบทีม กำหนด seed และกลุ่มการแข่งขัน · ${tournamentEntries.length} teams`} /></summary><div className="admin-workspace-section-body">
              <div className="grid gap-8 xl:grid-cols-[0.8fr_1.2fr]"><form action={addTournamentTeam} className="grid content-start gap-4 rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5"><input type="hidden" name="tournament_id" value={value(tournament.id)} /><Field label="Team"><select name="team_id" className="admin-input" required><option value="">Choose team</option>{availableTeams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.name)}</option>)}</select></Field><div className="grid grid-cols-2 gap-3"><Field label="Seed"><input name="seed" type="number" min="1" className="admin-input" /></Field><Field label="Group"><input name="group_name" maxLength={40} className="admin-input" placeholder="A" /></Field></div><SubmitButton>Add team</SubmitButton></form>
                 <div className="space-y-3">{tournamentEntries.map((entry) => { const team = teamById.get(value(entry.team_id)); return <div key={value(entry.id)} className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--line)] p-4"><span className="race-display w-8 text-2xl text-[var(--ink-faint)]">{num(entry.seed) || '—'}</span><span className="min-w-0 flex-1 font-black">{value(team?.name) || 'Unknown team'} <span className="ml-2 text-xs font-medium text-[var(--ink-faint)]">{value(entry.group_name) && `Group ${value(entry.group_name)}`}</span></span><form action={removeTournamentTeam}><input type="hidden" name="id" value={value(entry.id)} /><ConfirmSubmitButton message="Remove this team from the tournament?">Remove</ConfirmSubmitButton></form></div>; })}{!tournamentEntries.length && <Empty text="No teams registered." />}</div></div>
            </div></details>

            {isFiba && <details className="admin-workspace-section" open><summary><SectionHead icon={Trophy} title="FIBA 2-stage setup" description="สร้าง 4 กลุ่ม กลุ่มละ 4 ทีม และสร้าง Knockout bracket จากอันดับจริงโดยอัตโนมัติ" /></summary><div className="admin-workspace-section-body">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5"><p className="text-xs font-black uppercase tracking-[0.11em] text-[var(--orange-soft)]">Stage 1 · Group Stage</p><h3 className="mt-2 text-xl font-black">4 groups × 4 teams</h3><p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">ระบบกระจาย seed แบบ snake, สร้าง Round Robin 24 เกม และคิดชนะ 2 คะแนน / แพ้ 1 คะแนน</p><p className="mt-4 text-xs font-bold text-[var(--ink-faint)]">{tournamentEntries.length}/16 teams · {completedGroupMatches.length}/{groupMatches.length || 24} results</p>{groupMatches.length === 0 && <form action={generateFibaGroupStage} className="mt-5"><input type="hidden" name="tournament_id" value={value(tournament.id)} /><ConfirmSubmitButton message="Assign all 16 teams into Groups A-D and create 24 round-robin matches?">Generate Group Stage</ConfirmSubmitButton></form>}</div>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5"><p className="text-xs font-black uppercase tracking-[0.11em] text-sky-300">Stage 2 · Knockout</p><h3 className="mt-2 text-xl font-black">Quarter-Final → Final</h3><p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">อันดับ 1–2 ของแต่ละกลุ่มผ่านเข้ารอบ โดยไขว้กลุ่ม A/B และ C/D เพื่อไม่พบทีมกลุ่มเดียวกันใน Quarter-Final</p><p className="mt-4 text-xs font-bold text-[var(--ink-faint)]">{knockoutMatches.length ? 'Bracket generated' : 'Waiting for all 24 group results'}</p>{groupMatches.length > 0 && knockoutMatches.length === 0 && <form action={generateFibaKnockout} className="mt-5"><input type="hidden" name="tournament_id" value={value(tournament.id)} /><ConfirmSubmitButton message="Use the final group standings to create Quarter-Finals, Semi-Finals and Final?">Generate Knockout Bracket</ConfirmSubmitButton></form>}</div>
              </div>
            </div></details>}

            <details className="admin-workspace-section"><summary><SectionHead icon={Swords} title="Matches & results" description={`สร้างตาราง ใส่คะแนน ผู้ชนะ และลิงก์ถ่ายทอดสด · ${tournamentMatches.length} matches`} /></summary><div className="admin-workspace-section-body">
              <details className="admin-record"><summary>Create a match</summary><MatchForm tournamentId={value(tournament.id)} teams={participantTeams} /></details>
              <div className="mt-7 space-y-5">{tournamentMatches.map((match) => <details key={value(match.id)} className="admin-record"><summary>{value(match.round_label)} · Match {num(match.match_number) || '—'} <span className="ml-2 text-xs font-medium text-[var(--ink-faint)]">{value(teamById.get(value(match.home_team_id))?.abbreviation) || 'TBD'} vs {value(teamById.get(value(match.away_team_id))?.abbreviation) || 'TBD'} · {value(match.status)}</span></summary><MatchForm tournamentId={value(tournament.id)} match={match} teams={participantTeams} /><form action={deleteTournamentMatch} className="mt-4"><input type="hidden" name="id" value={value(match.id)} /><ConfirmSubmitButton message="Delete this tournament match?">Delete match</ConfirmSubmitButton></form></details>)}{!tournamentMatches.length && <Empty text="No matches scheduled." />}</div>
            </div></details>
          </div>
        </article>;
      })}
      {!tournaments.length && <Empty text="No tournaments yet. Create the first one above." />}
    </div>
  </main>;
}

function MatchForm({ tournamentId, teams, match }: { tournamentId: string; teams: Row[]; match?: Row }) { return <form action={saveTournamentMatch} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><input type="hidden" name="id" value={value(match?.id)} /><input type="hidden" name="tournament_id" value={tournamentId} /><Field label="Round"><input name="round_label" defaultValue={value(match?.round_label) || 'Round 1'} required className="admin-input" /></Field><Field label="Match #"><input name="match_number" type="number" min="1" defaultValue={num(match?.match_number)} className="admin-input" /></Field><Field label="Status"><select name="status" defaultValue={value(match?.status) || 'scheduled'} className="admin-input"><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="final">Final</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select></Field><TeamSelect name="home_team_id" label="Home team" teams={teams} defaultValue={value(match?.home_team_id)} /><TeamSelect name="away_team_id" label="Away team" teams={teams} defaultValue={value(match?.away_team_id)} /><TeamSelect name="winner_team_id" label="Winner" teams={teams} defaultValue={value(match?.winner_team_id)} /><Field label="Result type"><select name="result_type" defaultValue={value(match?.result_type) || 'played'} className="admin-input"><option value="played">Played game</option><option value="forfeit">Forfeit / walkover (20–0)</option></select></Field><TeamSelect name="forfeit_team_id" label="Team that forfeited" teams={teams} defaultValue={value(match?.forfeit_team_id)} /><Field label="Home score"><input name="home_score" type="number" min="0" defaultValue={num(match?.home_score)} className="admin-input" /></Field><Field label="Away score"><input name="away_score" type="number" min="0" defaultValue={num(match?.away_score)} className="admin-input" /></Field><Field label="Scheduled at"><input name="scheduled_at" type="datetime-local" defaultValue={dateTimeLocal(match?.scheduled_at)} className="admin-input" /></Field><Field label="Venue"><input name="venue" defaultValue={value(match?.venue)} className="admin-input" /></Field><Field label="Stream URL"><input name="stream_url" type="url" defaultValue={value(match?.stream_url)} className="admin-input" /></Field><Field label="Notes" wide><textarea name="notes" rows={3} defaultValue={value(match?.notes)} className="admin-input py-3" /></Field><div className="md:col-span-2 xl:col-span-3"><SubmitButton>{match ? 'Save match' : 'Create match'}</SubmitButton></div></form>; }
function TeamSelect({ name, label, teams, defaultValue }: { name: string; label: string; teams: Row[]; defaultValue: string }) { return <Field label={label}><select name={name} defaultValue={defaultValue} className="admin-input"><option value="">TBD / None</option>{teams.map((team) => <option key={value(team.id)} value={value(team.id)}>{value(team.name)}</option>)}</select></Field>; }
function FormatSelect({ defaultValue = 'single_elimination' }: { defaultValue?: string }) { return <Field label="Format"><select name="format" defaultValue={defaultValue} className="admin-input"><option value="fiba">FIBA · Group + Knockout (16 teams)</option><option value="single_elimination">Single elimination</option><option value="double_elimination">Double elimination</option><option value="round_robin">Round robin</option><option value="group_stage">Group stage</option></select></Field>; }
function StatusSelect({ defaultValue = 'draft' }: { defaultValue?: string }) { return <Field label="Status"><select name="status" defaultValue={defaultValue} className="admin-input"><option value="draft">Draft</option><option value="registration">Registration</option><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></Field>; }
function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? 'md:col-span-2 xl:col-span-3' : ''}><span className="mb-2 block text-[0.62rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span>{children}</label>; }
function SectionHead({ icon: Icon, title, description }: { icon: typeof Trophy; title: string; description: string }) { return <div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{description}</p></div></div>; }
function Notice({ good, children }: { good?: boolean; children: React.ReactNode }) { return <p role="status" className={`mt-7 rounded-xl border px-4 py-3 text-sm ${good ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-red-400/20 bg-red-400/10 text-red-200'}`}>{children}</p>; }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-[var(--line-strong)] p-8 text-center text-sm text-[var(--ink-faint)]">{text}</p>; }
