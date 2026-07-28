import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  MapPin,
  Radio,
  Trophy,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { getGameBoxScore, getSiteData } from '@/lib/league-data';
import type { GameStatLine, GameStatus, Team } from '@/lib/league-types';
import { cn, formatGameDate, formatGameTime } from '@/lib/utils';
import { GameCard } from '@/app/components/ui/GameCard';
import { TeamLogo } from '@/app/components/ui/TeamLogo';

type Props = { params: Promise<{ slug: string }> };

const statusLabels: Record<GameStatus, string> = {
  scheduled: 'Scheduled',
  live: 'Live now',
  final: 'Final',
  postponed: 'Postponed',
  cancelled: 'Cancelled',
};

const statusStyles: Record<GameStatus, string> = {
  scheduled: 'border-blue-300/20 bg-blue-400/10 text-blue-300',
  live: 'border-red-300/20 bg-red-400/10 text-red-300',
  final: 'border-emerald-300/20 bg-emerald-400/10 text-emerald-300',
  postponed: 'border-amber-300/20 bg-amber-400/10 text-amber-300',
  cancelled: 'border-[var(--line)] bg-white/5 text-[var(--ink-faint)]',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSiteData();
  const game = data.games.find((item) => item.slug === slug);
  if (!game) return { title: 'Game not found' };

  const homeTeam = data.teams.find((team) => team.id === game.homeTeamId);
  const awayTeam = data.teams.find((team) => team.id === game.awayTeamId);
  const matchup = homeTeam && awayTeam
    ? `${awayTeam.name} at ${homeTeam.name}`
    : 'PBL game';

  return {
    title: matchup,
    description: `${matchup} - ${statusLabels[game.status]}, Week ${game.week} of the PBL season.`,
    openGraph: {
      title: matchup,
      description: `${formatGameDate(game.startsAt, true)} at ${formatGameTime(game.startsAt)} ICT`,
    },
  };
}

export default async function GameDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await getSiteData();
  const game = data.games.find((item) => item.slug === slug);
  if (!game) notFound();

  const boxScore = data.source === 'supabase' && ['live', 'final'].includes(game.status)
    ? await getGameBoxScore(game.id)
    : [];

  const homeTeam = data.teams.find((team) => team.id === game.homeTeamId);
  const awayTeam = data.teams.find((team) => team.id === game.awayTeamId);
  if (!homeTeam || !awayTeam) notFound();

  const season = data.seasons.find((item) => item.id === game.seasonId) ?? data.season;
  const hasScore = game.homeScore !== null && game.awayScore !== null;
  const homeWon = game.status === 'final' && hasScore && game.homeScore! > game.awayScore!;
  const awayWon = game.status === 'final' && hasScore && game.awayScore! > game.homeScore!;
  const streamUrl = game.streamUrl && /^https?:\/\//i.test(game.streamUrl) ? game.streamUrl : null;
  const relatedGames = data.games
    .filter((item) => item.id !== game.id && item.seasonId === game.seasonId && item.week === game.week)
    .filter(
      (item) =>
        data.teams.some((team) => team.id === item.homeTeamId) &&
        data.teams.some((team) => team.id === item.awayTeamId),
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  return (
    <>
      <header className="relative overflow-hidden border-b border-[var(--line)] py-10 sm:py-14">
        <div className="absolute inset-0 subtle-grid opacity-20 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="site-shell relative">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/games"
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--ink-soft)] transition hover:text-[var(--orange-soft)]"
            >
              <ArrowLeft className="h-4 w-4" /> All games
            </Link>
            <span className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.65rem] font-black uppercase tracking-[0.12em]', statusStyles[game.status])}>
              {game.status === 'live' && <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-400" />}
              {statusLabels[game.status]}
            </span>
          </div>

          <div className="mt-10 rounded-[2rem] border border-[var(--line)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 shadow-[var(--shadow)] backdrop-blur sm:p-8 lg:p-10">
            <div className="mb-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[0.65rem] font-bold uppercase tracking-[0.11em] text-[var(--ink-faint)]">
              <span>{season.name} - Week {game.week}</span>
              <span className="hidden h-1 w-1 rounded-full bg-[var(--line-strong)] sm:block" />
              <span>{formatGameDate(game.startsAt, true)}</span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-6 lg:gap-12">
              <MatchupTeam team={awayTeam} side="away" winner={awayWon} />

              <div className="min-w-[6.5rem] text-center sm:min-w-[9rem]">
                {hasScore ? (
                  <div className="number-tabular flex items-center justify-center gap-2 sm:gap-4">
                    <span className={cn('text-4xl font-black tracking-[-0.07em] sm:text-6xl', awayWon && 'text-[var(--orange-soft)]')}>
                      {game.awayScore}
                    </span>
                    <span className="text-xl font-light text-[var(--ink-faint)]">-</span>
                    <span className={cn('text-4xl font-black tracking-[-0.07em] sm:text-6xl', homeWon && 'text-[var(--orange-soft)]')}>
                      {game.homeScore}
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="number-tabular block text-3xl font-black tracking-[-0.06em] sm:text-5xl">
                      {formatGameTime(game.startsAt)}
                    </span>
                    <span className="mt-1 block text-[0.62rem] font-black uppercase tracking-[0.14em] text-[var(--ink-faint)]">ICT</span>
                  </>
                )}
                <span className="mt-3 block text-[0.6rem] font-black uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {hasScore ? statusLabels[game.status] : 'Tip-off'}
                </span>
              </div>

              <MatchupTeam team={homeTeam} side="home" winner={homeWon} />
            </div>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 border-t border-[var(--line)] pt-6">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--ink-soft)]">
                <MapPin className="h-4 w-4 text-[var(--orange-soft)]" /> {game.venue}
              </span>
              {streamUrl && (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--orange)] px-5 py-2.5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[var(--orange-soft)]"
                >
                  <Radio className="h-4 w-4" /> Watch stream <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="site-shell grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-16">
        <section>
          <p className="eyebrow">Matchup notes</p>
          <h1 className="display-type mt-3 text-4xl sm:text-5xl">{awayTeam.shortName} at {homeTeam.shortName}</h1>
          <p className="mt-5 max-w-3xl text-pretty text-base leading-8 text-[var(--ink-soft)]">
            {game.notes ?? buildGameSummary(game.status, awayTeam, homeTeam, game.awayScore, game.homeScore)}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[awayTeam, homeTeam].map((team) => (
              <Link
                key={team.id}
                href={`/teams/${team.slug}`}
                className="lift flex items-center gap-4 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5"
              >
                <TeamLogo team={team} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-black">{team.name}</span>
                  <span className="mt-1 block text-xs font-bold uppercase tracking-[0.09em] text-[var(--ink-faint)]">
                    {team.conference} - {team.wins}-{team.losses}
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-[var(--ink-faint)]" />
              </Link>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 lg:sticky lg:top-24">
          <p className="eyebrow">Game details</p>
          <dl className="mt-5 space-y-4 text-sm">
            <DetailRow icon={CalendarDays} label="Date" value={formatGameDate(game.startsAt, true)} />
            <DetailRow icon={Clock3} label="Time" value={`${formatGameTime(game.startsAt)} ICT`} />
            <DetailRow icon={MapPin} label="Venue" value={game.venue} />
            <DetailRow icon={Trophy} label="Competition" value={`${season.name}, Week ${game.week}`} last />
          </dl>
          <Link
            href="/standings"
            className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[var(--line-strong)] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] transition hover:border-[var(--orange)] hover:text-[var(--orange-soft)]"
          >
            View standings
          </Link>
        </aside>
      </div>

      {['live', 'final'].includes(game.status) && (
        <section className="border-t border-[var(--line)] py-12 sm:py-16">
          <div className="site-shell">
            <p className="eyebrow">Official statistics</p>
            <h2 className="display-type mt-3 text-3xl sm:text-4xl">Box score</h2>
            {boxScore.length === 0 ? (
              <p className="mt-6 rounded-[1.4rem] border border-dashed border-[var(--line-strong)] p-6 text-sm text-[var(--ink-soft)]">Player stat lines will appear here after the score desk publishes them.</p>
            ) : (
              <div className="mt-7 space-y-6">
                {[awayTeam, homeTeam].map((team) => (
                  <BoxScoreTable key={team.id} team={team} lines={boxScore.filter((line) => line.teamId === team.id)} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {relatedGames.length > 0 && (
        <section className="border-t border-[var(--line)] py-12 sm:py-16">
          <div className="site-shell">
            <p className="eyebrow">Around the league</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 className="display-type text-3xl sm:text-4xl">More from Week {game.week}</h2>
              <Link href="/games" className="text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Full schedule</Link>
            </div>
            <div className="mt-7 grid gap-4 lg:grid-cols-2">
              {relatedGames.slice(0, 4).map((relatedGame) => (
                <GameCard key={relatedGame.id} game={relatedGame} teams={data.teams} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function BoxScoreTable({ team, lines }: { team: Team; lines: GameStatLine[] }) {
  if (lines.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <TeamLogo team={team} size="sm" />
        <h3 className="font-black">{team.name}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="number-tabular min-w-[58rem] w-full text-right text-xs">
          <thead className="bg-[var(--surface-soft)] text-[0.58rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">
            <tr>{['Player', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FG', '3PT', 'FT'].map((label) => <th key={label} className={label === 'Player' ? 'px-4 py-3 text-left' : 'px-3 py-3'}>{label}</th>)}</tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.playerId} className="border-t border-[var(--line)] first:border-0">
                <td className="px-4 py-3 text-left"><Link href={`/players/${line.playerSlug}`} className="font-black hover:text-[var(--orange-soft)]">{line.displayName}</Link></td>
                <td className="px-3 py-3 text-[var(--ink-soft)]">{line.minutes.toFixed(1)}</td>
                <td className="px-3 py-3 font-black">{line.points}</td>
                <td className="px-3 py-3">{line.rebounds}</td>
                <td className="px-3 py-3">{line.assists}</td>
                <td className="px-3 py-3">{line.steals}</td>
                <td className="px-3 py-3">{line.blocks}</td>
                <td className="px-3 py-3">{line.turnovers}</td>
                <td className="px-3 py-3">{line.fieldGoalsMade}-{line.fieldGoalsAttempted}</td>
                <td className="px-3 py-3">{line.threePointersMade}-{line.threePointersAttempted}</td>
                <td className="px-3 py-3">{line.freeThrowsMade}-{line.freeThrowsAttempted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatchupTeam({ team, side, winner }: { team: Team; side: 'away' | 'home'; winner: boolean }) {
  return (
    <Link
      href={`/teams/${team.slug}`}
      className={cn('group flex min-w-0 flex-col items-center gap-3', side === 'away' ? 'sm:items-end sm:text-right' : 'sm:items-start')}
    >
      <span className={cn('flex items-center gap-3', side === 'away' ? 'sm:flex-row-reverse' : 'sm:flex-row')}>
        <TeamLogo team={team} size="lg" className="transition-transform group-hover:scale-105" />
        <span className="hidden sm:block">
          <span className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[var(--ink-faint)]">{side}</span>
          <span className="number-tabular mt-1 block text-xs font-bold text-[var(--ink-soft)]">{team.wins}-{team.losses}</span>
        </span>
      </span>
      <span className="min-w-0">
        <span className="block max-w-32 truncate text-center text-sm font-black sm:max-w-48 sm:text-lg">{team.name}</span>
        {winner && <span className="mt-1 block text-center text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--orange-soft)]">Winner</span>}
      </span>
    </Link>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  last = false,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={cn('grid grid-cols-[auto_1fr] gap-3', !last && 'border-b border-[var(--line)] pb-4')}>
      <Icon className="mt-0.5 h-4 w-4 text-[var(--ink-faint)]" />
      <div className="flex justify-between gap-4">
        <dt className="text-[var(--ink-faint)]">{label}</dt>
        <dd className="text-right font-bold">{value}</dd>
      </div>
    </div>
  );
}

function buildGameSummary(
  status: GameStatus,
  awayTeam: Team,
  homeTeam: Team,
  awayScore: number | null,
  homeScore: number | null,
) {
  if (status === 'final' && awayScore !== null && homeScore !== null) {
    if (awayScore === homeScore) return `${awayTeam.name} and ${homeTeam.name} finished level at ${awayScore}-${homeScore}.`;
    const winner = awayScore > homeScore ? awayTeam : homeTeam;
    const loser = winner.id === awayTeam.id ? homeTeam : awayTeam;
    return `${winner.name} closed out a ${Math.max(awayScore, homeScore)}-${Math.min(awayScore, homeScore)} win over ${loser.name}. Follow the standings to see how the result changes the conference race.`;
  }
  if (status === 'postponed') return 'This matchup has been postponed. League staff will publish a new tip-off time when it is confirmed.';
  if (status === 'cancelled') return 'This matchup has been cancelled. Check the full schedule for the latest league updates.';
  if (status === 'live') return `${awayTeam.name} and ${homeTeam.name} are on court now. Scores and status will update through the official league feed.`;
  return `${awayTeam.name} travels to face ${homeTeam.name} in this regular-season matchup. Return before tip-off for the latest status and broadcast link.`;
}
