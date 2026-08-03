'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Medal,
  Search,
  SearchX,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { StatCard } from '@/app/components/ui/StatCard';
import { TeamLogo } from '@/app/components/ui/TeamLogo';
import { PlayerAvatar } from '@/app/components/ui/PlayerAvatar';
import type { Player, PlayerStats, Team } from '@/lib/league-types';

type MetricKey = keyof Pick<
  PlayerStats,
  | 'pointsPerGame'
  | 'reboundsPerGame'
  | 'assistsPerGame'
  | 'stealsPerGame'
  | 'blocksPerGame'
  | 'fieldGoalPct'
  | 'threePointPct'
>;

interface MetricConfig {
  key: MetricKey;
  shortLabel: string;
  label: string;
  description: string;
  percentage?: boolean;
}

const metrics: MetricConfig[] = [
  { key: 'pointsPerGame', shortLabel: 'PPG', label: 'Points per game', description: 'Average points scored per appearance.' },
  { key: 'reboundsPerGame', shortLabel: 'RPG', label: 'Rebounds per game', description: 'Average total rebounds per appearance.' },
  { key: 'assistsPerGame', shortLabel: 'APG', label: 'Assists per game', description: 'Average assists created per appearance.' },
  { key: 'stealsPerGame', shortLabel: 'SPG', label: 'Steals per game', description: 'Average steals recorded per appearance.' },
  { key: 'blocksPerGame', shortLabel: 'BPG', label: 'Blocks per game', description: 'Average blocked shots per appearance.' },
  { key: 'fieldGoalPct', shortLabel: 'FG%', label: 'Field goal percentage', description: 'Share of total field goal attempts made.', percentage: true },
  { key: 'threePointPct', shortLabel: '3PT%', label: 'Three-point percentage', description: 'Share of three-point attempts made.', percentage: true },
];

interface StatsExplorerProps {
  seasonName: string;
  players: Player[];
  teams: Team[];
}

export function StatsExplorer({ seasonName, players, teams }: StatsExplorerProps) {
  const [metricKey, setMetricKey] = useState<MetricKey>('pointsPerGame');
  const [teamId, setTeamId] = useState('all');
  const [minGames, setMinGames] = useState(1);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const metric = metrics.find((item) => item.key === metricKey) ?? metrics[0];
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const leaderboard = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();

    return players
      .filter((player) => teamId === 'all' || player.teamId === teamId)
      .filter((player) => player.stats.gamesPlayed >= minGames)
      .filter((player) => {
        if (!normalizedQuery) return true;
        const team = teamsById.get(player.teamId);
        return [player.displayName, player.robloxUsername, team?.name ?? '']
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => b.stats[metricKey] - a.stats[metricKey] || a.displayName.localeCompare(b.displayName));
  }, [deferredQuery, metricKey, minGames, players, teamId, teamsById]);

  const leader = leaderboard[0];
  const averageValue = leaderboard.length
    ? leaderboard.reduce((total, player) => total + player.stats[metricKey], 0) / leaderboard.length
    : 0;
  const gamesTracked = players.reduce((highest, player) => Math.max(highest, player.stats.gamesPlayed), 0);
  const resetFilters = () => {
    setTeamId('all');
    setMinGames(1);
    setQuery('');
  };

  return (
    <div className="site-shell py-12 sm:py-16">
      <section aria-labelledby="stats-summary-heading">
        <h2 id="stats-summary-heading" className="sr-only">Statistics summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value={players.length} label="Players tracked" detail={seasonName} icon={Users} accent="orange" />
          <StatCard value={gamesTracked} label="Most games played" detail="By an individual player" icon={BarChart3} accent="blue" />
          <StatCard
            value={leader ? formatMetricValue(leader.stats[metricKey], metric) : '-'}
            label={`${metric.shortLabel} leader`}
            detail={leader?.displayName ?? 'No eligible player'}
            icon={Medal}
            accent="mint"
          />
          <StatCard
            value={leaderboard.length ? formatMetricValue(averageValue, metric) : '-'}
            label={`League ${metric.shortLabel}`}
            detail={`${leaderboard.length} eligible players`}
            icon={TrendingUp}
            accent="orange"
          />
        </div>
      </section>

      <section className="mt-8 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5" aria-labelledby="leaderboard-controls-heading" aria-busy={query !== deferredQuery}>
        <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Choose a category</p>
            <h2 id="leaderboard-controls-heading" className="mt-3 text-xl font-black tracking-[-0.04em]">Build the leaderboard</h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-[var(--ink-soft)]">{metric.description}</p>
        </div>

        <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Statistic category">
          {metrics.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setMetricKey(item.key)}
              aria-pressed={metricKey === item.key}
              className={`shrink-0 rounded-full px-4 py-2.5 text-[0.65rem] font-black uppercase tracking-[0.12em] transition ${
                metricKey === item.key
                  ? 'bg-[var(--orange)] text-black'
                  : 'border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]'
              }`}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem_13rem]">
          <label className="relative block">
            <span className="sr-only">Search leaderboard</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player or Roblox username..."
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--page)] pl-11 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
            />
          </label>
          <label>
            <span className="sr-only">Filter by team</span>
            <select
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--ink)]"
            >
              <option value="all">All teams</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Minimum games played</span>
            <select
              value={minGames}
              onChange={(event) => setMinGames(Number(event.target.value))}
              className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--ink)]"
            >
              <option value={0}>All game totals</option>
              <option value={1}>At least 1 game</option>
              <option value={5}>At least 5 games</option>
              <option value={10}>At least 10 games</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]" aria-live="polite">
            <span className="text-[var(--ink)]">{leaderboard.length}</span> eligible players
          </p>
          {(query || teamId !== 'all' || minGames !== 1) && (
            <button type="button" onClick={resetFilters} className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">
              Reset eligibility
            </button>
          )}
        </div>
      </section>

      {leaderboard.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            icon={players.length === 0 ? BarChart3 : SearchX}
            title={players.length === 0 ? 'No player stats yet' : 'No eligible players'}
            description={
              players.length === 0
                ? 'Leaderboards will appear after player statistics are recorded.'
                : 'Lower the games-played requirement or clear the team and search filters.'
            }
          />
        </div>
      ) : (
        <>
          <section className="mt-10" aria-labelledby="podium-heading">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Top performers</p>
                <h2 id="podium-heading" className="display-type mt-3 text-3xl sm:text-4xl">{metric.label}</h2>
              </div>
              <span className="hidden text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)] sm:block">{seasonName}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {leaderboard.slice(0, 3).map((player, index) => (
                <LeaderSpotlight
                  key={player.id}
                  player={player}
                  team={teamsById.get(player.teamId)}
                  rank={index + 1}
                  metric={metric}
                />
              ))}
            </div>
          </section>

          <section className="mt-10" aria-labelledby="full-leaderboard-heading">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow">Full table</p>
                <h2 id="full-leaderboard-heading" className="display-type mt-3 text-3xl sm:text-4xl">League leaderboard</h2>
              </div>
              <Link href="/players" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">
                Player directory <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4rem_5rem] gap-3 border-b border-[var(--line)] px-4 py-3 text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)] sm:grid-cols-[3rem_minmax(0,1fr)_minmax(8rem,0.65fr)_5rem_6rem] sm:px-5">
                <span>Rank</span><span>Player</span><span className="hidden sm:block">Team</span><span>GP</span><span className="text-right">{metric.shortLabel}</span>
              </div>
              {leaderboard.map((player, index) => {
                const team = teamsById.get(player.teamId);
                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.slug}`}
                    className="content-auto group grid grid-cols-[2.5rem_minmax(0,1fr)_4rem_5rem] items-center gap-3 border-b border-[var(--line)] px-4 py-3.5 transition last:border-0 hover:bg-[var(--surface-raised)] sm:grid-cols-[3rem_minmax(0,1fr)_minmax(8rem,0.65fr)_5rem_6rem] sm:px-5"
                  >
                    <span className={`number-tabular text-sm font-black ${index < 3 ? 'text-[var(--orange-soft)]' : 'text-[var(--ink-faint)]'}`}>#{index + 1}</span>
                    <span className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar src={player.avatarUrl} name={player.displayName} size="sm" primaryColor={team?.primaryColor} secondaryColor={team?.secondaryColor} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black transition group-hover:text-[var(--orange-soft)]">{player.displayName}</span>
                        <span className="mt-0.5 block truncate text-[0.62rem] text-[var(--ink-faint)]">{player.positions.join(' / ')} - @{player.robloxUsername}</span>
                      </span>
                    </span>
                    <span className="hidden min-w-0 items-center gap-2 text-xs font-bold text-[var(--ink-soft)] sm:flex">
                      {team ? <><TeamLogo team={team} size="sm" className="!h-6 !w-6 !rounded-lg !text-[0.4rem]" /><span className="truncate">{team.abbreviation}</span></> : 'FA'}
                    </span>
                    <span className="number-tabular text-sm font-bold text-[var(--ink-soft)]">{player.stats.gamesPlayed}</span>
                    <span className="number-tabular text-right text-lg font-black tracking-[-0.04em] text-[var(--orange-soft)]">{formatMetricValue(player.stats[metricKey], metric)}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function formatMetricValue(value: number, metric: MetricConfig) {
  return `${value.toFixed(1)}${metric.percentage ? '%' : ''}`;
}

function LeaderSpotlight({
  player,
  team,
  rank,
  metric,
}: {
  player: Player;
  team?: Team;
  rank: number;
  metric: MetricConfig;
}) {
  const primaryColor = team?.primaryColor ?? '#ff6b22';
  const secondaryColor = team?.secondaryColor ?? '#ffb067';

  return (
    <Link
      href={`/players/${player.slug}`}
      className="lift group relative isolate overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5"
    >
      <span className="absolute -right-6 -top-8 -z-10 text-[7rem] font-black leading-none tracking-[-0.1em] text-white/[0.025]">{rank}</span>
      <div className="flex items-start justify-between gap-4">
        <PlayerAvatar src={player.avatarUrl} name={player.displayName} size="md" className="!h-14 !w-14" primaryColor={primaryColor} secondaryColor={secondaryColor} />
        <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${rank === 1 ? 'bg-[var(--orange)] text-black' : 'bg-[var(--surface-soft)] text-[var(--ink-soft)]'}`}>#{rank}</span>
      </div>
      <h3 className="mt-5 truncate text-lg font-black tracking-[-0.035em] transition group-hover:text-[var(--orange-soft)]">{player.displayName}</h3>
      <p className="mt-1 text-xs font-bold text-[var(--ink-faint)]">{team?.abbreviation ?? 'FA'} - {player.positions.join(' / ')}</p>
      <div className="mt-5 flex items-end justify-between border-t border-[var(--line)] pt-4">
        <span>
          <span className="number-tabular block text-3xl font-black tracking-[-0.06em] text-[var(--orange-soft)]">{formatMetricValue(player.stats[metric.key], metric)}</span>
          <span className="mt-1 block text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{metric.shortLabel}</span>
        </span>
        <Target className="mb-1 h-5 w-5 text-[var(--ink-faint)]" />
      </div>
    </Link>
  );
}
