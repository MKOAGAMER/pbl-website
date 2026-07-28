import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BarChart3, Medal, Trophy } from 'lucide-react';
import { getSiteData } from '@/lib/league-data';
import type { Game, Team } from '@/lib/league-types';
import { cn, winPercentage } from '@/lib/utils';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { PageIntro } from '@/app/components/ui/PageIntro';
import { TeamLogo } from '@/app/components/ui/TeamLogo';

export const metadata: Metadata = {
  title: 'Power Rankings',
  description: 'A cross-conference PBL power ranking based on team records and scoring margin in published finals.',
};

interface RankedTeam {
  team: Team;
  averageMargin: number;
  recentForm: ('W' | 'L' | 'T')[];
}

export default async function RankingsPage() {
  const data = await getSiteData();
  const rankings = buildRankings(
    data.teams,
    data.games.filter((game) => game.seasonId === data.season.id),
  );
  const podium = rankings.slice(0, 3);
  const remaining = rankings.slice(3);

  return (
    <>
      <PageIntro
        eyebrow={`${data.season.name} power rankings`}
        title="Who owns the moment?"
        description="A single league-wide view of every club. Win percentage sets the order, with average scoring margin from published finals used as the first performance tiebreaker."
      />

      <div className="site-shell py-12 sm:py-16">
        {rankings.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="Rankings coming soon"
            description="Power rankings will appear once teams are registered for the active season."
          />
        ) : (
          <>
            <section aria-labelledby="top-ranked-teams">
              <div className="mb-7 flex items-end justify-between gap-4">
                <div>
                  <p className="eyebrow">Top tier</p>
                  <h2 id="top-ranked-teams" className="display-type mt-3 text-3xl sm:text-4xl">The leading three</h2>
                </div>
                <span className="hidden text-xs font-bold text-[var(--ink-faint)] sm:block">Current snapshot</span>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {podium.map((entry, index) => (
                  <PodiumCard key={entry.team.id} entry={entry} rank={index + 1} />
                ))}
              </div>
            </section>

            {remaining.length > 0 && (
              <section className="mt-12" aria-labelledby="full-power-ranking">
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">Chasing pack</p>
                    <h2 id="full-power-ranking" className="display-type mt-3 text-3xl sm:text-4xl">The full order</h2>
                  </div>
                  <Link href="/standings" className="text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Conference tables</Link>
                </div>

                <div className="overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)]">
                  <div className="hidden grid-cols-[4rem_minmax(0,1fr)_6rem_6rem_8rem] gap-3 border-b border-[var(--line)] px-5 py-3 text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)] sm:grid">
                    <span>Rank</span>
                    <span>Club</span>
                    <span className="text-center">Record</span>
                    <span className="text-center">Margin</span>
                    <span className="text-right">Recent</span>
                  </div>
                  {remaining.map((entry, index) => (
                    <RankingRow key={entry.team.id} entry={entry} rank={index + 4} />
                  ))}
                </div>
              </section>
            )}

            <div className="mt-8 rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-orange-400/10 text-[var(--orange-soft)]"><BarChart3 className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-sm font-black">How this snapshot works</h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--ink-soft)]">
                    Rankings use each team&apos;s official season record. If records are level, scoring margin from completed games shown on this site breaks the tie, followed by team name. Recent form reads newest result first.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function buildRankings(teams: Team[], games: Game[]): RankedTeam[] {
  const finals = games
    .filter(
      (game) =>
        game.status === 'final' &&
        game.homeScore !== null &&
        game.awayScore !== null,
    )
    .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  return teams
    .map((team) => {
      const teamGames = finals.filter(
        (game) => game.homeTeamId === team.id || game.awayTeamId === team.id,
      );
      const margins = teamGames.map((game) => {
        const isHome = game.homeTeamId === team.id;
        const pointsFor = isHome ? game.homeScore! : game.awayScore!;
        const pointsAgainst = isHome ? game.awayScore! : game.homeScore!;
        return pointsFor - pointsAgainst;
      });
      const averageMargin = margins.length
        ? margins.reduce((total, margin) => total + margin, 0) / margins.length
        : 0;
      const recentForm = margins.slice(0, 5).map((margin) =>
        margin > 0 ? 'W' as const : margin < 0 ? 'L' as const : 'T' as const,
      );
      return { team, averageMargin, recentForm };
    })
    .sort((a, b) => {
      const pctDifference = winPercentage(b.team.wins, b.team.losses) - winPercentage(a.team.wins, a.team.losses);
      if (pctDifference !== 0) return pctDifference;
      if (b.averageMargin !== a.averageMargin) return b.averageMargin - a.averageMargin;
      if (b.team.wins !== a.team.wins) return b.team.wins - a.team.wins;
      return a.team.name.localeCompare(b.team.name);
    });
}

function PodiumCard({ entry, rank }: { entry: RankedTeam; rank: number }) {
  const { team } = entry;
  return (
    <Link
      href={`/teams/${team.slug}`}
      className={cn(
        'lift group relative overflow-hidden rounded-[1.6rem] border bg-[var(--surface)] p-5',
        rank === 1 ? 'border-orange-400/35 md:-translate-y-2' : 'border-[var(--line)]',
      )}
    >
      <div
        className="absolute inset-x-0 top-0 h-24 opacity-15 blur-2xl"
        style={{ background: team.primaryColor }}
      />
      <div className="relative flex items-start justify-between gap-4">
        <span className={cn('number-tabular display-type text-5xl', rank === 1 ? 'text-[var(--orange-soft)]' : 'text-[var(--ink-faint)]')}>
          {String(rank).padStart(2, '0')}
        </span>
        <span className={cn('grid h-9 w-9 place-items-center rounded-xl', rank === 1 ? 'bg-orange-400/10 text-[var(--orange-soft)]' : 'bg-[var(--surface-soft)] text-[var(--ink-faint)]')}>
          {rank === 1 ? <Trophy className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
        </span>
      </div>

      <div className="relative mt-8 flex items-center gap-4">
        <TeamLogo team={team} size="lg" />
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black transition group-hover:text-[var(--orange-soft)]">{team.name}</h3>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.09em] text-[var(--ink-faint)]">{team.conference} Conference</p>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-3 gap-2 border-t border-[var(--line)] pt-5">
        <MiniMetric value={`${team.wins}-${team.losses}`} label="Record" />
        <MiniMetric value={formatPct(team)} label="Win pct" />
        <MiniMetric value={formatMargin(entry.averageMargin)} label="Margin" />
      </div>
      <div className="relative mt-5 flex items-center justify-between gap-3">
        <FormDots form={entry.recentForm} />
        <ArrowUpRight className="h-4 w-4 text-[var(--ink-faint)] transition group-hover:text-[var(--orange-soft)]" />
      </div>
    </Link>
  );
}

function RankingRow({ entry, rank }: { entry: RankedTeam; rank: number }) {
  const { team } = entry;
  return (
    <Link
      href={`/teams/${team.slug}`}
      className="group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--line)] px-4 py-4 last:border-0 hover:bg-[var(--surface-raised)] sm:grid-cols-[4rem_minmax(0,1fr)_6rem_6rem_8rem] sm:px-5"
    >
      <span className="number-tabular text-lg font-black text-[var(--ink-faint)]">{String(rank).padStart(2, '0')}</span>
      <span className="flex min-w-0 items-center gap-3">
        <TeamLogo team={team} size="sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-black transition group-hover:text-[var(--orange-soft)]">{team.name}</span>
          <span className="mt-0.5 block text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)] sm:hidden">{team.wins}-{team.losses} - {team.conference}</span>
          <span className="mt-0.5 hidden text-[0.6rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)] sm:block">{team.conference} Conference</span>
        </span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-[var(--ink-faint)] sm:hidden" />
      <span className="number-tabular hidden text-center text-sm font-black sm:block">{team.wins}-{team.losses}</span>
      <span className="number-tabular hidden text-center text-sm font-bold text-[var(--ink-soft)] sm:block">{formatMargin(entry.averageMargin)}</span>
      <span className="hidden justify-end sm:flex"><FormDots form={entry.recentForm} /></span>
    </Link>
  );
}

function MiniMetric({ value, label }: { value: string; label: string }) {
  return (
    <span>
      <span className="number-tabular block text-sm font-black">{value}</span>
      <span className="mt-1 block text-[0.55rem] font-bold uppercase tracking-[0.11em] text-[var(--ink-faint)]">{label}</span>
    </span>
  );
}

function FormDots({ form }: { form: ('W' | 'L' | 'T')[] }) {
  if (form.length === 0) return <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">No finals</span>;
  return (
    <span className="flex gap-1.5" aria-label={`Recent form: ${form.join(', ')}`}>
      {form.map((result, index) => (
        <span
          key={`${result}-${index}`}
          className={cn(
            'grid h-6 w-6 place-items-center rounded-full text-[0.55rem] font-black',
            result === 'W' && 'bg-emerald-400/10 text-emerald-300',
            result === 'L' && 'bg-red-400/10 text-red-300',
            result === 'T' && 'bg-white/5 text-[var(--ink-faint)]',
          )}
          aria-hidden="true"
        >
          {result}
        </span>
      ))}
    </span>
  );
}

function formatPct(team: Team) {
  return winPercentage(team.wins, team.losses).toFixed(3).replace(/^0/, '');
}

function formatMargin(value: number) {
  if (value === 0) return '0.0';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}
