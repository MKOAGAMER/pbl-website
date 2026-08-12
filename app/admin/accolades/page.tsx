import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Trophy } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { ConfirmSubmitButton } from '../ConfirmSubmitButton';
import { SubmitButton } from '../SubmitButton';
import { deleteAccolade, saveAccolade } from './actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Achievement Control', robots: { index: false, follow: false } };

type Row = Record<string, unknown>;
type Props = { searchParams: Promise<{ saved?: string; error?: string; count?: string }> };
const value = (input: unknown) => typeof input === 'string' ? input : '';
const bool = (input: unknown) => input === true;
const numberValue = (input: unknown) => typeof input === 'number' ? input : Number(input ?? 0);

export default async function AccoladeControlPage({ searchParams }: Props) {
  const [{ supabase }, params] = await Promise.all([requireAdminPermission('staff'), searchParams]);
  const [accoladeResult, seasonResult, tournamentResult, playerResult, teamResult] = await Promise.all([
    supabase.from('accolades').select('*').order('awarded_on', { ascending: false, nullsFirst: false }).order('sort_order'),
    supabase.from('seasons').select('id, name, status').order('starts_on', { ascending: false }),
    supabase.from('tournaments').select('id, name, status').order('starts_at', { ascending: false }),
    supabase.from('players').select('id, name, roblox_username, is_active').order('name'),
    supabase.from('teams').select('id, name, abbreviation, is_active').order('name'),
  ]);
  const accolades = (accoladeResult.data ?? []) as Row[];
  const seasons = (seasonResult.data ?? []) as Row[];
  const tournaments = (tournamentResult.data ?? []) as Row[];
  const players = (playerResult.data ?? []) as Row[];
  const teams = (teamResult.data ?? []) as Row[];
  const activeSeason = seasons.find((season) => value(season.status) === 'active') ?? seasons[0];
  const activeTournament = tournaments.find((tournament) => value(tournament.status) === 'active') ?? tournaments[0];
  const defaultCompetition = activeSeason
    ? `season:${value(activeSeason.id)}`
    : activeTournament ? `tournament:${value(activeTournament.id)}` : '';
  const playerById = new Map(players.map((player) => [value(player.id), player]));
  const teamById = new Map(teams.map((team) => [value(team.id), team]));
  const seasonById = new Map(seasons.map((season) => [value(season.id), season]));
  const tournamentById = new Map(tournaments.map((tournament) => [value(tournament.id), tournament]));

  return (
    <main className="site-shell py-10 sm:py-14">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Staff Control</Link>
      <header className="mt-7 border-b border-[var(--line)] pb-9">
        <p className="eyebrow">Recognition system</p>
        <h1 className="display-type mt-4 text-5xl sm:text-6xl">Medals & Achievements</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">มอบเหรียญ รางวัล แชมป์ หรือ Achievement ให้ผู้เล่นและทีม พร้อมแสดงในหน้าโปรไฟล์และคลังเกียรติยศ</p>
      </header>

      {params.saved && <Notice good>{numberValue(params.count) > 1 ? `มอบรางวัลให้ ${numberValue(params.count)} ผู้รับเรียบร้อยแล้ว` : 'บันทึก Achievement เรียบร้อยแล้ว'}</Notice>}
      {params.error && <Notice>บันทึกไม่สำเร็จ กรุณาตรวจผู้รับ ชื่อรางวัล และฤดูกาลอีกครั้ง</Notice>}

      <section className="mt-8 rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
        <SectionHead icon={Sparkles} title="Give a new achievement" description="เลือกผู้รับได้หลายคนหรือหลายทีม แล้วมอบ Medal หรือ Achievement เดียวกันพร้อมกันได้" />
        {defaultCompetition ? (
          <AccoladeForm seasons={seasons} tournaments={tournaments} players={players} teams={teams} defaultCompetition={defaultCompetition} />
        ) : (
          <p className="mt-6 rounded-xl border border-dashed border-[var(--line-strong)] p-6 text-center text-sm text-[var(--ink-faint)]">Create a league season or tournament before giving an achievement.</p>
        )}
      </section>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="eyebrow">Recognition archive</p><h2 className="display-type mt-3 text-3xl sm:text-4xl">Manage achievements</h2></div><span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-black text-[var(--ink-soft)]">{accolades.length} entries</span></div>
        <div className="space-y-3">
          {accolades.map((accolade) => {
            const playerId = value(accolade.player_id);
            const teamId = value(accolade.team_id);
            const player = playerById.get(playerId);
            const team = teamById.get(teamId);
            const recipientName = player ? value(player.roblox_username) || value(player.name) : value(team?.name) || 'Unknown recipient';
            const tournamentId = value(accolade.tournament_id);
            const competitionName = tournamentId
              ? value(tournamentById.get(tournamentId)?.name)
              : value(seasonById.get(value(accolade.season_id))?.name);
            return (
              <details key={value(accolade.id)} className="admin-record">
                <summary>{value(accolade.title)} <span className="ml-2 text-xs font-medium text-[var(--ink-faint)]">{recipientName} · {value(accolade.category)} · {competitionName || 'Unknown competition'}</span></summary>
                <div className="mt-5 space-y-4">
                  <AccoladeForm
                    seasons={seasons}
                    tournaments={tournaments}
                    players={players}
                    teams={teams}
                    accolade={accolade}
                    defaultCompetition={tournamentId ? `tournament:${tournamentId}` : `season:${value(accolade.season_id)}`}
                  />
                  <form action={deleteAccolade}>
                    <input type="hidden" name="id" value={value(accolade.id)} />
                    <ConfirmSubmitButton message={`Delete ${value(accolade.title)} from ${recipientName}?`}>Delete achievement</ConfirmSubmitButton>
                  </form>
                </div>
              </details>
            );
          })}
          {!accolades.length && <p className="rounded-2xl border border-dashed border-[var(--line-strong)] p-8 text-center text-sm text-[var(--ink-faint)]">No medals or achievements have been given yet.</p>}
        </div>
      </section>
    </main>
  );
}

function AccoladeForm({ seasons, tournaments, players, teams, defaultCompetition, accolade }: { seasons: Row[]; tournaments: Row[]; players: Row[]; teams: Row[]; defaultCompetition: string; accolade?: Row }) {
  const recipientValue = value(accolade?.player_id)
    ? `player:${value(accolade?.player_id)}`
    : value(accolade?.team_id) ? `team:${value(accolade?.team_id)}` : '';
  return (
    <form action={saveAccolade} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <input type="hidden" name="id" value={value(accolade?.id)} />
      <Field label={accolade ? 'Recipient' : 'Recipients'} wide>
        {accolade ? (
          <select name="recipients" defaultValue={recipientValue} className="admin-input" required>
            <option value="" disabled>Select player or team</option>
            <optgroup label="Players">
              {players.map((player) => <option key={value(player.id)} value={`player:${value(player.id)}`}>{value(player.roblox_username) || value(player.name)}{bool(player.is_active) ? '' : ' · inactive'}</option>)}
            </optgroup>
            <optgroup label="Teams">
              {teams.map((team) => <option key={value(team.id)} value={`team:${value(team.id)}`}>{value(team.abbreviation)} · {value(team.name)}{bool(team.is_active) ? '' : ' · archived'}</option>)}
            </optgroup>
          </select>
        ) : (
          <div className="grid max-h-80 gap-5 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--page)] p-4 md:grid-cols-2">
            <RecipientChoices title="Players" rows={players} type="player" />
            <RecipientChoices title="Teams" rows={teams} type="team" />
          </div>
        )}
        {!accolade && <span className="mt-2 block text-xs text-[var(--ink-faint)]">Select every recipient who should receive this medal. A separate archive entry will be created for each recipient.</span>}
      </Field>
      <Field label="Achievement name" wide><input name="title" defaultValue={value(accolade?.title)} className="admin-input" placeholder="Street Test 3 Tournament Champion" minLength={2} maxLength={120} required /></Field>
      <Field label="Type"><select name="category" defaultValue={value(accolade?.category) || 'achievement'} className="admin-input"><option value="achievement">Achievement</option><option value="medal">Medal</option><option value="championship">Championship</option><option value="award">League award</option><option value="record">Record</option></select></Field>
      <Field label="Competition">
        <select name="competition" defaultValue={defaultCompetition} className="admin-input" required>
          {seasons.length > 0 && <optgroup label="League seasons">{seasons.map((season) => <option key={value(season.id)} value={`season:${value(season.id)}`}>{value(season.name)} · {value(season.status)}</option>)}</optgroup>}
          {tournaments.length > 0 && <optgroup label="Tournaments">{tournaments.map((tournament) => <option key={value(tournament.id)} value={`tournament:${value(tournament.id)}`}>{value(tournament.name)} · {value(tournament.status)}</option>)}</optgroup>}
        </select>
      </Field>
      <Field label="Awarded date"><input name="awarded_on" type="date" defaultValue={value(accolade?.awarded_on) || new Date().toISOString().slice(0, 10)} className="admin-input" /></Field>
      <Field label="Display order"><input name="sort_order" type="number" min="0" max="9999" defaultValue={numberValue(accolade?.sort_order)} className="admin-input" /></Field>
      <Field label="Description" wide><textarea name="description" rows={3} maxLength={1200} defaultValue={value(accolade?.description)} className="admin-input py-3" placeholder="Why this achievement was awarded" /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-[var(--ink-soft)]"><input name="is_public" type="checkbox" defaultChecked={accolade ? bool(accolade.is_public) : true} /> Show publicly</label>
      <div className="md:col-span-2 xl:col-span-3"><SubmitButton>{accolade ? 'Save achievement' : 'Give achievement'}</SubmitButton></div>
    </form>
  );
}

function RecipientChoices({ title, rows, type }: { title: string; rows: Row[]; type: 'player' | 'team' }) {
  return <fieldset className="min-w-0"><legend className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--orange-soft)]">{title}</legend><div className="space-y-1">{rows.map((row) => {
    const name = type === 'player'
      ? value(row.roblox_username) || value(row.name)
      : `${value(row.abbreviation)} · ${value(row.name)}`;
    return <label key={value(row.id)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition hover:bg-[var(--surface-raised)]"><input name="recipients" type="checkbox" value={`${type}:${value(row.id)}`} className="h-4 w-4 shrink-0 accent-[var(--orange)]" /><span className="min-w-0 truncate font-bold">{name}</span>{!bool(row.is_active) && <span className="ml-auto shrink-0 text-[0.58rem] font-black uppercase text-[var(--ink-faint)]">Inactive</span>}</label>;
  })}{!rows.length && <p className="px-3 py-2 text-sm text-[var(--ink-faint)]">No {title.toLowerCase()} available.</p>}</div></fieldset>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? 'md:col-span-2 xl:col-span-3' : ''}><span className="mb-2 block text-[0.62rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span>{children}</label>; }
function SectionHead({ icon: Icon, title, description }: { icon: typeof Trophy; title: string; description: string }) { return <div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--orange)]/15 text-[var(--orange-soft)]"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-black">{title}</h2><p className="mt-1 text-sm leading-6 text-[var(--ink-soft)]">{description}</p></div></div>; }
function Notice({ good, children }: { good?: boolean; children: React.ReactNode }) { return <p role="status" className={`mt-7 rounded-xl border px-4 py-3 text-sm ${good ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-red-400/20 bg-red-400/10 text-red-200'}`}>{children}</p>; }
