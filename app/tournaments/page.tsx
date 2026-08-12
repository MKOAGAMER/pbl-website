import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Radio, Trophy, UsersRound } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import { getPublicTournaments } from '@/lib/tournament-data';
import { getStatsExplorerData } from '@/lib/stats-data';
import type { Team } from '@/lib/league-types';
import type { Tournament, TournamentMatch } from '@/lib/tournament-types';
import { calculateFibaStandings } from '@/lib/fiba-tournament';
import { TeamLogo } from '@/app/components/ui/TeamLogo';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tournaments', description: 'Official PBAL tournaments, participants, brackets and match results.' };

const formatLabel = (value: string) => value.replaceAll('_', ' ');
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok' }).format(new Date(value)) : 'TBA';

export default async function TournamentsPage() {
  const data = await getSiteData();
  const [tournaments, statsData] = await Promise.all([getPublicTournaments(), getStatsExplorerData(data)]);
  const teamById = new Map([...statsData.teams, ...data.teams].map((team) => [team.id, team]));
  const activeCount = tournaments.filter((tournament) => tournament.status === 'active').length;
  const upcomingCount = tournaments.filter((tournament) => tournament.status === 'registration' || tournament.status === 'draft').length;
  const completedCount = tournaments.filter((tournament) => tournament.status === 'completed').length;

  return <main className="site-shell py-12 sm:py-20">
    <header className="max-w-4xl border-b border-[var(--line)] pb-10">
      <p className="race-eyebrow">PBAL competition hub</p>
      <h1 className="race-display mt-4 text-5xl sm:text-7xl">Tournaments</h1>
      <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">ติดตามรายชื่อทีม สายการแข่งขัน ตารางแข่ง ผลคะแนน และแชมป์ของทัวร์นาเมนต์อย่างเป็นทางการ</p>
    </header>

    <section className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="Tournament overview">
      <TournamentMetric value={activeCount} label="Live events" accent="text-red-300" />
      <TournamentMetric value={upcomingCount} label="Upcoming" accent="text-[var(--orange-soft)]" />
      <TournamentMetric value={completedCount} label="Completed" accent="text-emerald-300" />
    </section>

    {tournaments.length > 1 && <nav className="mt-14" aria-label="Browse tournaments">
      <p className="mb-4 text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Browse tournaments</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tournaments.map((tournament) => <Link key={tournament.id} href={`#${tournament.slug}`} className="group flex items-center justify-between gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--orange)]">
          <span className="min-w-0"><span className="block truncate text-sm font-black group-hover:text-[var(--orange-soft)]">{tournament.name}</span><span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">{tournament.status} · {tournament.teams.length} teams</span></span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[var(--orange-soft)] transition-transform group-hover:translate-x-1" />
        </Link>)}
      </div>
    </nav>}

    <div className="mt-16 space-y-20">
      {tournaments.map((tournament) => {
        const champion = tournament.championTeamId ? teamById.get(tournament.championTeamId) : undefined;
        return <article id={tournament.slug} key={tournament.id} className="content-auto scroll-mt-24 overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[var(--surface)] shadow-[0_28px_90px_rgba(0,0,0,0.18)]">
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

          {tournament.format === 'fiba'
            ? <FibaTournamentView tournament={tournament} teamById={teamById} />
            : <div className="grid gap-12 p-6 sm:p-9 xl:grid-cols-[0.72fr_1.28fr]">
              <section><h3 className="text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Teams & seeds</h3><div className="mt-5 space-y-3">{tournament.teams.map((entry) => <TournamentTeamRow key={entry.id} team={teamById.get(entry.teamId)} seed={entry.seed} group={entry.groupName} />)}{!tournament.teams.length && <Empty text="ยังไม่มีทีมเข้าร่วม" />}</div></section>
              <section><h3 className="text-xs font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Matches</h3><div className="mt-5 grid gap-4">{tournament.matches.map((match) => <MatchCard key={match.id} match={match} teamById={teamById} />)}{!tournament.matches.length && <Empty text="ยังไม่มีแมตช์ในทัวร์นาเมนต์นี้" />}</div></section>
            </div>}
        </article>;
      })}
      {!tournaments.length && <div className="rounded-[2rem] border border-dashed border-[var(--line-strong)] p-14 text-center"><Trophy className="mx-auto h-10 w-10 text-[var(--orange-soft)]" /><h2 className="mt-5 text-2xl font-black">ยังไม่มี Tournament ที่เผยแพร่</h2><p className="mt-2 text-sm text-[var(--ink-faint)]">เมื่อ Staff เปิดเผยการแข่งขัน รายละเอียดทั้งหมดจะแสดงที่นี่</p></div>}
    </div>
  </main>;
}

function TournamentMetric({ value, label, accent }: { value: number; label: string; accent: string }) { return <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"><span className={`race-display block text-4xl ${accent}`}>{value}</span><span className="mt-2 block text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{label}</span></div>; }

function FibaTournamentView({ tournament, teamById }: { tournament: Tournament; teamById: Map<string, Team> }) {
  const entries = tournament.teams.filter((entry) => entry.groupName).map((entry) => ({ teamId: entry.teamId, groupName: entry.groupName!, seed: entry.seed }));
  const standings = calculateFibaStandings(entries, tournament.matches);
  const groupMatches = tournament.matches.filter((match) => match.stage === 'group' || match.roundLabel.startsWith('Group '));
  const knockoutMatches = tournament.matches.filter((match) => match.stage === 'knockout' || match.bracketRound);
  return <div className="space-y-12 p-6 sm:p-9">
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5 sm:p-6"><div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">FIBA 2-stage format</p><h3 className="mt-2 text-2xl font-black">Group Stage → Knockout Stage</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">ทุกทีมพบกันหมดในกลุ่ม ชนะ 2 คะแนน แพ้ 1 คะแนน อันดับ 1–2 ผ่านเข้ารอบ Quarter-Final โดยใช้ Head-to-Head ก่อนผลต่างคะแนนและคะแนนที่ทำได้เมื่อแต้มเท่ากัน</p></div><div className="grid grid-cols-2 gap-2 text-center"><StageMetric value={groupMatches.filter((match) => match.status === 'final').length} label="of 24 group games" /><StageMetric value={knockoutMatches.length} label="knockout games" /></div></div></section>

    <section><div className="mb-5"><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Stage 1</p><h3 className="race-display mt-2 text-3xl sm:text-4xl">Group standings</h3></div><div className="grid gap-5 xl:grid-cols-2">{['A', 'B', 'C', 'D'].map((groupName) => <GroupTable key={groupName} groupName={groupName} standings={standings.filter((row) => row.groupName === groupName)} teamById={teamById} />)}</div></section>

    <section><div className="mb-5"><p className="text-[0.62rem] font-black uppercase tracking-[0.12em] text-sky-300">Stage 2</p><h3 className="race-display mt-2 text-3xl sm:text-4xl">Tournament bracket</h3><p className="mt-2 text-sm text-[var(--ink-soft)]">Quarter-Final pairings cross Groups A/B and C/D, preventing teams from the same group meeting in the first knockout round.</p></div>{knockoutMatches.length ? <KnockoutBracket matches={knockoutMatches} teamById={teamById} /> : <Empty text="Bracket จะเปิดหลังผลการแข่งขัน Group Stage ครบทุกเกม" />}</section>

    <section><details className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)]"><summary className="cursor-pointer list-none p-5 text-sm font-black [&::-webkit-details-marker]:hidden">Group Stage matches · {groupMatches.length} games</summary><div className="grid gap-4 border-t border-[var(--line)] p-5 lg:grid-cols-2">{groupMatches.map((match) => <MatchCard key={match.id} match={match} teamById={teamById} />)}</div></details></section>
  </div>;
}

function GroupTable({ groupName, standings, teamById }: { groupName: string; standings: ReturnType<typeof calculateFibaStandings>; teamById: Map<string, Team> }) {
  return <div className="overflow-hidden rounded-[1.35rem] border border-[var(--line)] bg-[var(--page)]"><div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4"><h4 className="text-lg font-black">Group {groupName}</h4><span className="text-[0.58rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">Top 2 qualify</span></div><div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-sm"><thead><tr className="border-b border-[var(--line)] text-[0.56rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]"><th className="px-3 py-3 text-center">#</th><th className="px-3 py-3 text-left">Team</th><th className="px-2 py-3">P</th><th className="px-2 py-3">W</th><th className="px-2 py-3">L</th><th className="px-2 py-3">Pts</th><th className="px-2 py-3">+/-</th></tr></thead><tbody>{standings.map((row) => { const team = teamById.get(row.teamId); return <tr key={row.teamId} className={`border-b border-[var(--line)] last:border-0 ${row.qualified ? 'bg-emerald-400/[0.05]' : ''}`}><td className="px-3 py-3 text-center font-black"><span className={row.qualified ? 'text-emerald-300' : 'text-[var(--ink-faint)]'}>{row.rank}</span></td><td className="px-3 py-3"><span className="flex items-center gap-2">{team && <TeamLogo team={team} size="sm" className="!h-7 !w-7 !rounded-lg !text-[0.45rem]" />}<span className="font-black">{team?.name ?? 'Unknown team'}</span></span></td><td className="number-tabular px-2 py-3 text-center">{row.played}</td><td className="number-tabular px-2 py-3 text-center">{row.wins}</td><td className="number-tabular px-2 py-3 text-center">{row.losses}</td><td className="number-tabular px-2 py-3 text-center font-black text-[var(--orange-soft)]">{row.competitionPoints}</td><td className="number-tabular px-2 py-3 text-center">{row.pointDifference > 0 ? '+' : ''}{row.pointDifference}</td></tr>; })}</tbody></table></div></div>;
}

function KnockoutBracket({ matches, teamById }: { matches: TournamentMatch[]; teamById: Map<string, Team> }) {
  const rounds = [
    { key: 'quarter_final', label: 'Quarter-Final' },
    { key: 'semi_final', label: 'Semi-Final' },
    { key: 'final', label: 'Final' },
  ] as const;
  return <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-[var(--page)] p-5"><div className="grid min-w-[58rem] grid-cols-3 gap-8">{rounds.map((round) => { const roundMatches = matches.filter((match) => match.bracketRound === round.key).sort((a, b) => (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)); return <div key={round.key} className="flex min-h-[34rem] flex-col"><h4 className="border-b border-[var(--line)] pb-3 text-center text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{round.label}</h4><div className="flex flex-1 flex-col justify-around gap-4 py-4">{roundMatches.map((match) => <BracketMatch key={match.id} match={match} teamById={teamById} />)}{!roundMatches.length && <BracketMatch teamById={teamById} />}</div></div>; })}</div></div>;
}

function BracketMatch({ match, teamById }: { match?: TournamentMatch; teamById: Map<string, Team> }) {
  const teams = [match?.homeTeamId ?? null, match?.awayTeamId ?? null];
  const scores = [match?.homeScore ?? null, match?.awayScore ?? null];
  return <div className="relative rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-3 shadow-lg"><p className="mb-2 text-[0.52rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{match ? `Match ${match.matchNumber ?? 'TBD'} · ${match.status}` : 'TBD'}</p>{teams.map((teamId, index) => { const team = teamId ? teamById.get(teamId) : undefined; const winner = Boolean(match?.winnerTeamId && match.winnerTeamId === teamId); return <div key={`${index}-${teamId ?? 'tbd'}`} className={`flex items-center gap-2 border-t border-[var(--line)] py-2 first-of-type:border-0 ${winner ? 'text-[var(--orange-soft)]' : ''}`}>{team && <TeamLogo team={team} size="sm" className="!h-7 !w-7 !rounded-lg !text-[0.45rem]" />}<span className="min-w-0 flex-1 truncate text-xs font-black">{team?.name ?? 'TBD'}</span><span className="number-tabular text-lg font-black">{scores[index] ?? '—'}</span></div>; })}</div>;
}

function MatchCard({ match, teamById }: { match: TournamentMatch; teamById: Map<string, Team> }) { return <div className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3"><p className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-[var(--orange-soft)]">{match.roundLabel}{match.groupName ? ` · Round ${match.notes?.match(/\d+/)?.[0] ?? ''}` : match.matchNumber ? ` · Match ${match.matchNumber}` : ''}</p><span className="text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{match.status}</span></div><div className="mt-4 grid gap-3"><MatchTeam team={match.homeTeamId ? teamById.get(match.homeTeamId) : undefined} score={match.homeScore} winner={match.winnerTeamId === match.homeTeamId} /><MatchTeam team={match.awayTeamId ? teamById.get(match.awayTeamId) : undefined} score={match.awayScore} winner={match.winnerTeamId === match.awayTeamId} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[0.68rem] font-bold text-[var(--ink-faint)]"><span>{dateLabel(match.scheduledAt)}{match.venue ? ` · ${match.venue}` : ''}</span>{match.streamUrl && <a href={match.streamUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-red-300"><Radio className="h-3.5 w-3.5" /> Watch</a>}</div></div>; }

function StageMetric({ value, label }: { value: number; label: string }) { return <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"><span className="number-tabular block text-2xl font-black">{value}</span><span className="mt-1 block text-[0.52rem] font-black uppercase tracking-[0.08em] text-[var(--ink-faint)]">{label}</span></div>; }

function TournamentTeamRow({ team, seed, group }: { team?: Team; seed: number | null; group: string | null }) { return <div className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3"><span className="race-display w-8 text-center text-xl text-[var(--ink-faint)]">{seed ?? '—'}</span>{team ? <><TeamLogo team={team} size="sm" /><Link href={`/teams/${team.slug}`} className="min-w-0 flex-1 truncate text-sm font-black hover:text-[var(--orange-soft)]">{team.name}</Link></> : <span className="flex-1 text-sm text-[var(--ink-faint)]">Team unavailable</span>}{group && <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[0.58rem] font-black uppercase text-[var(--ink-faint)]">{group}</span>}</div>; }
function MatchTeam({ team, score, winner }: { team?: Team; score: number | null; winner: boolean }) { return <div className={`flex items-center gap-3 ${winner ? 'text-[var(--orange-soft)]' : ''}`}>{team ? <><TeamLogo team={team} size="sm" /><span className="min-w-0 flex-1 truncate text-sm font-black">{team.name}</span></> : <span className="flex-1 text-sm font-black text-[var(--ink-faint)]">TBD</span>}<span className="race-display text-3xl">{score ?? '—'}</span></div>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-[var(--line)] p-7 text-center text-sm text-[var(--ink-faint)]">{text}</p>; }
