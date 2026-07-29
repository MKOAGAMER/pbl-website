import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, MapPin, Radio, Trophy, UsersRound } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import { getPublicTournaments } from '@/lib/tournament-data';
import type { Team } from '@/lib/league-types';
import { TeamLogo } from '@/app/components/ui/TeamLogo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tournaments', description: 'Official PBAL tournaments, participants, brackets and match results.' };

const formatLabel = (value: string) => value.replaceAll('_', ' ');
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : 'TBA';

export default async function TournamentsPage() {
  const [tournaments, data] = await Promise.all([getPublicTournaments(), getSiteData()]);
  const teamById = new Map(data.teams.map((team) => [team.id, team]));

  return <main className="site-shell py-12 sm:py-20">
    <header className="max-w-4xl border-b border-[var(--line)] pb-10">
      <p className="race-eyebrow">PBAL competition hub</p>
      <h1 className="race-display mt-4 text-5xl sm:text-7xl">Tournaments</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">ติดตามรายชื่อทีม สายการแข่งขัน ตารางแข่ง ผลคะแนน และแชมป์ของทัวร์นาเมนต์อย่างเป็นทางการ</p>
    </header>

    <div className="mt-12 space-y-16">
      {tournaments.map((tournament) => {
        const champion = tournament.championTeamId ? teamById.get(tournament.championTeamId) : undefined;
        return <article id={tournament.slug} key={tournament.id} className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface)]">
          <div className="grid gap-8 border-b border-[var(--line)] p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-[0.65rem] font-black uppercase tracking-[0.11em]"><span className="rounded-full bg-[var(--orange)] px-3 py-1.5 text-black">{tournament.status}</span><span className="text-[var(--ink-faint)]">{formatLabel(tournament.format)}</span></div>
              <div className="mt-5 flex items-center gap-5">
                {tournament.logoUrl && <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--page)] sm:h-24 sm:w-24">
                  {/* Staff-managed provider URL keeps tournament uploads provider-agnostic. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tournament.logoUrl} alt="" className="h-full w-full object-cover" />
                </span>}
                <h2 className="race-display text-4xl sm:text-5xl">{tournament.name}</h2>
              </div>
              {tournament.description && <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--ink-soft)]">{tournament.description}</p>}
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold text-[var(--ink-faint)]"><span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[var(--orange-soft)]" /> {dateLabel(tournament.startsAt)}</span>{tournament.venue && <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--orange-soft)]" /> {tournament.venue}</span>}<span className="inline-flex items-center gap-2"><UsersRound className="h-4 w-4 text-[var(--orange-soft)]" /> {tournament.teams.length} teams</span></div>
            </div>
            {champion && <div className="flex min-w-56 items-center gap-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4"><Trophy className="h-7 w-7 text-amber-300" /><div className="flex items-center gap-3"><TeamLogo team={champion} size="sm" /><div><p className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-amber-200">Champion</p><p className="mt-1 text-sm font-black">{champion.name}</p></div></div></div>}
          </div>

          <div className="grid gap-12 p-6 sm:p-9 xl:grid-cols-[0.72fr_1.28fr]">
            <section><h3 className="text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Teams & seeds</h3><div className="mt-5 space-y-3">{tournament.teams.map((entry) => <TournamentTeamRow key={entry.id} team={teamById.get(entry.teamId)} seed={entry.seed} group={entry.groupName} />)}{!tournament.teams.length && <Empty text="ยังไม่มีทีมเข้าร่วม" />}</div></section>
            <section><h3 className="text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Matches</h3><div className="mt-5 grid gap-4">{tournament.matches.map((match) => <div key={match.id} className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3"><p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-[var(--orange-soft)]">{match.roundLabel}{match.matchNumber ? ` · Match ${match.matchNumber}` : ''}</p><span className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{match.status}</span></div><div className="mt-4 grid gap-3"><MatchTeam team={match.homeTeamId ? teamById.get(match.homeTeamId) : undefined} score={match.homeScore} winner={match.winnerTeamId === match.homeTeamId} /><MatchTeam team={match.awayTeamId ? teamById.get(match.awayTeamId) : undefined} score={match.awayScore} winner={match.winnerTeamId === match.awayTeamId} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.68rem] font-bold text-[var(--ink-faint)]"><span>{dateLabel(match.scheduledAt)}{match.venue ? ` · ${match.venue}` : ''}</span>{match.streamUrl && <a href={match.streamUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-red-300"><Radio className="h-3.5 w-3.5" /> Watch</a>}</div></div>)}{!tournament.matches.length && <Empty text="ยังไม่มีแมตช์ในทัวร์นาเมนต์นี้" />}</div></section>
          </div>
        </article>;
      })}
      {!tournaments.length && <div className="rounded-[2rem] border border-dashed border-[var(--line-strong)] p-14 text-center"><Trophy className="mx-auto h-10 w-10 text-[var(--orange-soft)]" /><h2 className="mt-5 text-2xl font-black">ยังไม่มี Tournament ที่เผยแพร่</h2><p className="mt-2 text-sm text-[var(--ink-faint)]">เมื่อ Staff เปิดเผยการแข่งขัน รายละเอียดทั้งหมดจะแสดงที่นี่</p></div>}
    </div>
  </main>;
}

function TournamentTeamRow({ team, seed, group }: { team?: Team; seed: number | null; group: string | null }) { return <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3"><span className="race-display w-8 text-center text-xl text-[var(--ink-faint)]">{seed ?? '—'}</span>{team ? <><TeamLogo team={team} size="sm" /><Link href={`/teams/${team.slug}`} className="min-w-0 flex-1 truncate text-sm font-black hover:text-[var(--orange-soft)]">{team.name}</Link></> : <span className="flex-1 text-sm text-[var(--ink-faint)]">Team unavailable</span>}{group && <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[0.58rem] font-black uppercase text-[var(--ink-faint)]">{group}</span>}</div>; }
function MatchTeam({ team, score, winner }: { team?: Team; score: number | null; winner: boolean }) { return <div className={`flex items-center gap-3 ${winner ? 'text-[var(--orange-soft)]' : ''}`}>{team ? <><TeamLogo team={team} size="sm" /><span className="min-w-0 flex-1 truncate text-sm font-black">{team.name}</span></> : <span className="flex-1 text-sm font-black text-[var(--ink-faint)]">TBD</span>}<span className="race-display text-3xl">{score ?? '—'}</span></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-[var(--line)] p-7 text-center text-sm text-[var(--ink-faint)]">{text}</p>; }
