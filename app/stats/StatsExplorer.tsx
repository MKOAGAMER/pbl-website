'use client';

import Link from 'next/link';
import {
  BarChart3,
  Check,
  ChevronDown,
  Medal,
  Search,
  SearchX,
  Shield,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { PlayerAvatar } from '@/app/components/ui/PlayerAvatar';
import { StatCard } from '@/app/components/ui/StatCard';
import { TeamLogo } from '@/app/components/ui/TeamLogo';
import type { Player, PlayerStats, Team } from '@/lib/league-types';
import type { CompetitionStatLine, StatsCompetition, StatsExplorerData } from '@/lib/stats-data';

type MetricKey = keyof Pick<PlayerStats,
  'pointsPerGame' | 'reboundsPerGame' | 'assistsPerGame' | 'stealsPerGame' |
  'blocksPerGame' | 'fieldGoalPct' | 'threePointPct'>;
type ViewMode = 'players' | 'teams';

type MetricConfig = {
  key: MetricKey;
  shortLabel: string;
  label: string;
  description: string;
  percentage?: boolean;
};

type Aggregate = {
  id: string;
  teamId: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  stats: PlayerStats;
};

const metrics: MetricConfig[] = [
  { key: 'pointsPerGame', shortLabel: 'PPG', label: 'Points per game', description: 'Average points scored per appearance.' },
  { key: 'reboundsPerGame', shortLabel: 'RPG', label: 'Rebounds per game', description: 'Average total rebounds per appearance.' },
  { key: 'assistsPerGame', shortLabel: 'APG', label: 'Assists per game', description: 'Average assists created per appearance.' },
  { key: 'stealsPerGame', shortLabel: 'SPG', label: 'Steals per game', description: 'Average steals recorded per appearance.' },
  { key: 'blocksPerGame', shortLabel: 'BPG', label: 'Blocks per game', description: 'Average blocked shots per appearance.' },
  { key: 'fieldGoalPct', shortLabel: 'FG%', label: 'Field goal percentage', description: 'Share of total field goal attempts made.', percentage: true },
  { key: 'threePointPct', shortLabel: '3PT%', label: 'Three-point percentage', description: 'Share of three-point attempts made.', percentage: true },
];

export function StatsExplorer({ statsData, players, teams }: { statsData: StatsExplorerData; players: Player[]; teams: Team[] }) {
  const [view, setView] = useState<ViewMode>('players');
  const [metricKey, setMetricKey] = useState<MetricKey>('pointsPerGame');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => statsData.competitions.map((item) => item.id));
  const [teamId, setTeamId] = useState('all');
  const [minGames, setMinGames] = useState(1);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const metric = metrics.find((item) => item.key === metricKey) ?? metrics[0];
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedLines = useMemo(() => statsData.lines.filter((line) => selectedSet.has(line.competitionId)), [selectedSet, statsData.lines]);
  const selectedResults = useMemo(() => statsData.results.filter((result) => selectedSet.has(result.competitionId)), [selectedSet, statsData.results]);
  const playerAggregates = useMemo(() => aggregatePlayers(selectedLines), [selectedLines]);
  const teamAggregates = useMemo(() => aggregateTeams(selectedLines, selectedResults), [selectedLines, selectedResults]);
  const visibleTeamStats = useMemo(() => teamAggregates
    .filter((entry) => entry.gamesPlayed > 0 && teamsById.has(entry.id))
    .sort((a, b) => b.stats.pointsPerGame - a.stats.pointsPerGame || teamName(a.id, teamsById).localeCompare(teamName(b.id, teamsById))), [teamAggregates, teamsById]);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const leaderboard = useMemo(() => {
    if (view === 'players') {
      return playerAggregates
        .filter((entry) => entry.gamesPlayed >= minGames)
        .filter((entry) => teamId === 'all' || entry.teamId === teamId)
        .filter((entry) => {
          const player = playersById.get(entry.id);
          const team = teamsById.get(entry.teamId);
          return !normalizedQuery || [player?.displayName, player?.robloxUsername, team?.name]
            .some((value) => value?.toLowerCase().includes(normalizedQuery));
        })
        .sort((a, b) => b.stats[metricKey] - a.stats[metricKey] || playerName(a.id, playersById).localeCompare(playerName(b.id, playersById)));
    }
    return teamAggregates
      .filter((entry) => entry.gamesPlayed >= minGames)
      .filter((entry) => {
        const team = teamsById.get(entry.id);
        return !normalizedQuery || [team?.name, team?.abbreviation, team?.city]
          .some((value) => value?.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => b.stats[metricKey] - a.stats[metricKey] || teamName(a.id, teamsById).localeCompare(teamName(b.id, teamsById)));
  }, [metricKey, minGames, normalizedQuery, playerAggregates, playersById, teamAggregates, teamId, teamsById, view]);

  const leader = leaderboard[0];
  const averageValue = leaderboard.length
    ? leaderboard.reduce((total, entry) => total + entry.stats[metricKey], 0) / leaderboard.length
    : 0;
  const gamesTracked = leaderboard.reduce((highest, entry) => Math.max(highest, entry.gamesPlayed), 0);
  const selectionLabel = selectedIds.length === statsData.competitions.length && selectedIds.length
    ? 'All-Time'
    : selectedIds.length === 1
      ? statsData.competitions.find((item) => item.id === selectedIds[0])?.name ?? 'Select competitions'
      : selectedIds.length ? `${selectedIds.length} competitions` : 'Select competitions';

  const toggleCompetition = (id: string) => setSelectedIds((current) => current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id]);

  return (
    <div className="site-shell py-12 sm:py-16">
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex w-fit rounded-full border border-[var(--line)] bg-[var(--surface)] p-1" aria-label="Statistics view">
          <ViewButton active={view === 'players'} onClick={() => setView('players')} icon={Users}>Player stats</ViewButton>
          <ViewButton active={view === 'teams'} onClick={() => { setView('teams'); setTeamId('all'); }} icon={Shield}>Team stats</ViewButton>
        </div>
        <CompetitionSelector competitions={statsData.competitions} selectedIds={selectedIds} label={selectionLabel} onToggle={toggleCompetition} onAll={() => setSelectedIds(statsData.competitions.map((item) => item.id))} onClear={() => setSelectedIds([])} />
      </div>

      <section aria-labelledby="stats-summary-heading">
        <h2 id="stats-summary-heading" className="sr-only">Statistics summary</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard value={leaderboard.length} label={`${view === 'players' ? 'Players' : 'Teams'} tracked`} detail={selectionLabel} icon={view === 'players' ? Users : Shield} accent="orange" />
          <StatCard value={gamesTracked} label="Most games played" detail={`By an eligible ${view === 'players' ? 'player' : 'team'}`} icon={BarChart3} accent="blue" />
          <StatCard value={leader ? formatMetricValue(leader.stats[metricKey], metric) : '-'} label={`${metric.shortLabel} leader`} detail={leader ? entityName(leader, view, playersById, teamsById) : 'No eligible entry'} icon={Medal} accent="mint" />
          <StatCard value={leaderboard.length ? formatMetricValue(averageValue, metric) : '-'} label={`${view === 'players' ? 'Player' : 'Team'} ${metric.shortLabel}`} detail={`${leaderboard.length} eligible entries`} icon={TrendingUp} accent="orange" />
        </div>
      </section>

      <section className="mt-8 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5" aria-labelledby="leaderboard-controls-heading" aria-busy={query !== deferredQuery}>
        <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="eyebrow">Choose a category</p><h2 id="leaderboard-controls-heading" className="mt-3 text-xl font-black tracking-[-0.04em]">Build the {view === 'players' ? 'player' : 'team'} leaderboard</h2></div>
          <p className="max-w-lg text-sm leading-6 text-[var(--ink-soft)]">{metric.description}</p>
        </div>
        <div className="hide-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Statistic category">
          {metrics.map((item) => <button key={item.key} type="button" onClick={() => setMetricKey(item.key)} aria-pressed={metricKey === item.key} className={`shrink-0 rounded-full px-4 py-2.5 text-[0.65rem] font-black uppercase tracking-[0.12em] transition ${metricKey === item.key ? 'bg-[var(--orange)] text-black' : 'border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-soft)] hover:text-[var(--ink)]'}`}>{item.shortLabel}</button>)}
        </div>
        <div className={`mt-5 grid gap-3 ${view === 'players' ? 'lg:grid-cols-[minmax(0,1fr)_15rem_13rem]' : 'lg:grid-cols-[minmax(0,1fr)_13rem]'}`}>
          <label className="relative block"><span className="sr-only">Search leaderboard</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === 'players' ? 'Search player or Roblox username...' : 'Search team...'} className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--page)] pl-11 pr-4 text-sm" /></label>
          {view === 'players' && <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-bold"><option value="all">All teams</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>}
          <select value={minGames} onChange={(event) => setMinGames(Number(event.target.value))} className="h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-bold"><option value={0}>All game totals</option><option value={1}>At least 1 game</option><option value={5}>At least 5 games</option><option value={10}>At least 10 games</option></select>
        </div>
      </section>

      {leaderboard.length === 0 ? <div className="mt-7"><EmptyState icon={selectedIds.length ? SearchX : BarChart3} title={selectedIds.length ? `No eligible ${view}` : 'Choose a season or tournament'} description={selectedIds.length ? 'Try lowering the games requirement or changing the search filters.' : 'Use Select seasons above to choose the competitions shown in this leaderboard.'} /></div> : (
        <>
          <section className="mt-10" aria-labelledby="podium-heading">
            <div className="mb-5"><p className="eyebrow">Top performers</p><h2 id="podium-heading" className="display-type mt-3 text-3xl sm:text-4xl">{metric.label}</h2></div>
            <div className="grid gap-4 md:grid-cols-3">{leaderboard.slice(0, 3).map((entry, index) => <LeaderSpotlight key={entry.id} entry={entry} rank={index + 1} metric={metric} view={view} players={playersById} teams={teamsById} />)}</div>
          </section>
          <section className="mt-10" aria-labelledby="full-leaderboard-heading">
            <div className="mb-5"><p className="eyebrow">Full table</p><h2 id="full-leaderboard-heading" className="display-type mt-3 text-3xl sm:text-4xl">{view === 'players' ? 'Player leaderboard' : 'Team leaderboard'}</h2></div>
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_4rem_5rem] gap-3 border-b border-[var(--line)] px-4 py-3 text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)] sm:grid-cols-[3rem_minmax(0,1fr)_minmax(8rem,0.65fr)_5rem_6rem] sm:px-5"><span>Rank</span><span>{view === 'players' ? 'Player' : 'Team'}</span><span className="hidden sm:block">{view === 'players' ? 'Team' : 'Record'}</span><span>GP</span><span className="text-right">{metric.shortLabel}</span></div>
              {leaderboard.map((entry, index) => <LeaderboardRow key={entry.id} entry={entry} rank={index + 1} view={view} metric={metric} players={playersById} teams={teamsById} />)}
            </div>
          </section>
        </>
      )}
      {view === 'players' && <TeamStatsTable entries={visibleTeamStats} teams={teamsById} selectionLabel={selectionLabel} />}
    </div>
  );
}

function CompetitionSelector({ competitions, selectedIds, label, onToggle, onAll, onClear }: { competitions: StatsCompetition[]; selectedIds: string[]; label: string; onToggle: (id: string) => void; onAll: () => void; onClear: () => void }) {
  const allSelected = competitions.length > 0 && selectedIds.length === competitions.length;
  return <details className="group relative w-full lg:w-80">
    <summary className="flex h-12 cursor-pointer list-none items-center justify-between rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-left [&::-webkit-details-marker]:hidden"><span className="min-w-0"><span className="block text-[0.55rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Select seasons</span><strong className="mt-0.5 block truncate text-sm">{label}</strong></span><ChevronDown className="h-4 w-4 text-[var(--ink-faint)] transition group-open:rotate-180" /></summary>
    <div className="absolute right-0 z-40 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] shadow-2xl">
      <div className="sticky top-0 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-[0.62rem] font-black uppercase tracking-[0.08em]"><span className="text-[var(--ink-faint)]">Select seasons</span><span className="flex gap-3"><button type="button" onClick={onClear} className="text-sky-300">Clear</button><button type="button" onClick={onAll} className="text-sky-300">All</button></span></div>
      <button type="button" onClick={onAll} className="flex w-full items-center justify-between border-b border-[var(--line)] px-4 py-3 text-sm font-black hover:bg-[var(--surface-raised)]"><span>All-Time</span>{allSelected && <Check className="h-4 w-4 text-sky-300" />}</button>
      {(['season', 'tournament'] as const).map((kind) => {
        const options = competitions.filter((item) => item.kind === kind);
        if (!options.length) return null;
        return <div key={kind}><p className="px-4 pb-1 pt-3 text-[0.55rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{kind === 'season' ? 'Seasons' : 'Tournaments'}</p>{options.map((item) => <button key={item.id} type="button" onClick={() => onToggle(item.id)} className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-[var(--surface-raised)] ${selectedIds.includes(item.id) ? 'text-sky-300' : ''}`}><span className="min-w-0 truncate font-bold">{item.name}</span><span className="flex shrink-0 items-center gap-2">{item.isCurrent && <span className="rounded bg-sky-400/10 px-2 py-1 text-[0.5rem] font-black uppercase tracking-[0.08em] text-sky-300">Current</span>}{selectedIds.includes(item.id) && <Check className="h-4 w-4" />}</span></button>)}</div>;
      })}
    </div>
  </details>;
}

function ViewButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Users; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-[0.65rem] font-black uppercase tracking-[0.1em] ${active ? 'bg-[var(--orange)] text-black' : 'text-[var(--ink-soft)]'}`}><Icon className="h-4 w-4" />{children}</button>;
}

function aggregatePlayers(lines: CompetitionStatLine[]) {
  return aggregate(lines, 'player');
}

function aggregateTeams(lines: CompetitionStatLine[], results: StatsExplorerData['results']) {
  const aggregates = aggregate(lines, 'team');
  const byTeam = new Map(aggregates.map((entry) => [entry.id, entry]));
  const targetIdsByTeam = new Map<string, Set<string>>();
  results.forEach((result) => {
    [result.homeTeamId, result.awayTeamId].forEach((id) => {
      const current = byTeam.get(id) ?? emptyAggregate(id, id);
      byTeam.set(id, current);
      const ids = targetIdsByTeam.get(id) ?? new Set<string>();
      ids.add(result.targetId);
      targetIdsByTeam.set(id, ids);
    });
    if (result.homeScore === result.awayScore) return;
    const winner = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
    const loser = winner === result.homeTeamId ? result.awayTeamId : result.homeTeamId;
    byTeam.get(winner)!.wins += 1;
    byTeam.get(loser)!.losses += 1;
  });
  byTeam.forEach((entry, id) => {
    const resultGames = targetIdsByTeam.get(id)?.size ?? 0;
    if (!entry.gamesPlayed && resultGames) entry.gamesPlayed = resultGames;
    entry.stats.gamesPlayed = entry.gamesPlayed;
  });
  return [...byTeam.values()];
}

function aggregate(lines: CompetitionStatLine[], mode: 'player' | 'team') {
  type Totals = Aggregate & { points: number; rebounds: number; assists: number; steals: number; blocks: number; fgm: number; fga: number; threePm: number; threePa: number; teamGames: Map<string, number>; targetIds: Set<string>; maxLineGames: number };
  const map = new Map<string, Totals>();
  lines.forEach((line) => {
    const id = mode === 'player' ? line.playerId : line.teamId;
    if (!id) return;
    const current = map.get(id) ?? { ...emptyAggregate(id, line.teamId), points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, fgm: 0, fga: 0, threePm: 0, threePa: 0, teamGames: new Map<string, number>(), targetIds: new Set<string>(), maxLineGames: 0 };
    if (mode === 'player') current.gamesPlayed += line.gamesPlayed;
    current.targetIds.add(line.targetId);
    current.maxLineGames = Math.max(current.maxLineGames, line.gamesPlayed);
    current.points += line.points; current.rebounds += line.rebounds; current.assists += line.assists; current.steals += line.steals; current.blocks += line.blocks;
    current.fgm += line.fieldGoalsMade; current.fga += line.fieldGoalsAttempted; current.threePm += line.threePointersMade; current.threePa += line.threePointersAttempted;
    if (mode === 'player') current.teamGames.set(line.teamId, (current.teamGames.get(line.teamId) ?? 0) + line.gamesPlayed);
    map.set(id, current);
  });
  return [...map.values()].map((entry): Aggregate => {
    if (mode === 'player' && entry.teamGames.size) entry.teamId = [...entry.teamGames].sort((a, b) => b[1] - a[1])[0][0];
    if (mode === 'team') {
      entry.gamesPlayed = [...entry.targetIds].every((id) => id.startsWith('fallback:'))
        ? entry.maxLineGames
        : entry.targetIds.size;
    }
    const games = entry.gamesPlayed || 1;
    return { id: entry.id, teamId: entry.teamId, gamesPlayed: entry.gamesPlayed, wins: entry.wins, losses: entry.losses, stats: { gamesPlayed: entry.gamesPlayed, pointsPerGame: entry.points / games, reboundsPerGame: entry.rebounds / games, assistsPerGame: entry.assists / games, stealsPerGame: entry.steals / games, blocksPerGame: entry.blocks / games, fieldGoalPct: entry.fga ? entry.fgm / entry.fga * 100 : 0, threePointPct: entry.threePa ? entry.threePm / entry.threePa * 100 : 0 } };
  });
}

function emptyAggregate(id: string, teamId: string): Aggregate { return { id, teamId, gamesPlayed: 0, wins: 0, losses: 0, stats: { gamesPlayed: 0, pointsPerGame: 0, reboundsPerGame: 0, assistsPerGame: 0, stealsPerGame: 0, blocksPerGame: 0, fieldGoalPct: 0, threePointPct: 0 } }; }
function formatMetricValue(value: number, metric: MetricConfig) { return `${value.toFixed(1)}${metric.percentage ? '%' : ''}`; }
function playerName(id: string, players: Map<string, Player>) { return players.get(id)?.displayName ?? 'Unknown player'; }
function teamName(id: string, teams: Map<string, Team>) { return teams.get(id)?.name ?? 'Unknown team'; }
function entityName(entry: Aggregate, view: ViewMode, players: Map<string, Player>, teams: Map<string, Team>) { return view === 'players' ? playerName(entry.id, players) : teamName(entry.id, teams); }

function LeaderSpotlight({ entry, rank, metric, view, players, teams }: { entry: Aggregate; rank: number; metric: MetricConfig; view: ViewMode; players: Map<string, Player>; teams: Map<string, Team> }) {
  const player = players.get(entry.id); const team = teams.get(view === 'players' ? entry.teamId : entry.id);
  const href = view === 'players' && player ? `/players/${player.slug}` : team ? `/teams/${team.slug}` : '/stats';
  return <Link href={href} className="lift group relative isolate overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5"><span className="absolute -right-6 -top-8 -z-10 text-[7rem] font-black leading-none text-white/[0.025]">{rank}</span><div className="flex items-start justify-between">{view === 'players' ? <PlayerAvatar src={player?.avatarUrl} name={player?.displayName ?? 'Player'} size="md" primaryColor={team?.primaryColor} secondaryColor={team?.secondaryColor} /> : team ? <TeamLogo team={team} size="md" /> : <Target className="h-12 w-12" />}<span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-black ${rank === 1 ? 'bg-[var(--orange)] text-black' : 'bg-[var(--surface-soft)]'}`}>#{rank}</span></div><h3 className="mt-5 truncate text-lg font-black group-hover:text-[var(--orange-soft)]">{entityName(entry, view, players, teams)}</h3><p className="mt-1 text-xs font-bold text-[var(--ink-faint)]">{view === 'players' ? team?.abbreviation ?? 'FA' : `${entry.wins}-${entry.losses} record`} · {entry.gamesPlayed} GP</p><div className="mt-5 border-t border-[var(--line)] pt-4"><span className="number-tabular text-3xl font-black text-[var(--orange-soft)]">{formatMetricValue(entry.stats[metric.key], metric)}</span><span className="ml-2 text-[0.58rem] font-black uppercase text-[var(--ink-faint)]">{metric.shortLabel}</span></div></Link>;
}

function LeaderboardRow({ entry, rank, view, metric, players, teams }: { entry: Aggregate; rank: number; view: ViewMode; metric: MetricConfig; players: Map<string, Player>; teams: Map<string, Team> }) {
  const player = players.get(entry.id); const team = teams.get(view === 'players' ? entry.teamId : entry.id);
  const href = view === 'players' && player ? `/players/${player.slug}` : team ? `/teams/${team.slug}` : '/stats';
  return <Link href={href} className="group grid grid-cols-[2.5rem_minmax(0,1fr)_4rem_5rem] items-center gap-3 border-b border-[var(--line)] px-4 py-3.5 last:border-0 hover:bg-[var(--surface-raised)] sm:grid-cols-[3rem_minmax(0,1fr)_minmax(8rem,0.65fr)_5rem_6rem] sm:px-5"><span className={`number-tabular text-sm font-black ${rank <= 3 ? 'text-[var(--orange-soft)]' : 'text-[var(--ink-faint)]'}`}>#{rank}</span><span className="flex min-w-0 items-center gap-3">{view === 'players' ? <PlayerAvatar src={player?.avatarUrl} name={player?.displayName ?? 'Player'} size="sm" primaryColor={team?.primaryColor} secondaryColor={team?.secondaryColor} /> : team ? <TeamLogo team={team} size="sm" /> : null}<span className="min-w-0"><span className="block truncate text-sm font-black">{entityName(entry, view, players, teams)}</span><span className="block truncate text-[0.62rem] text-[var(--ink-faint)]">{view === 'players' ? `@${player?.robloxUsername ?? 'unknown'}` : team?.abbreviation ?? ''}</span></span></span><span className="hidden text-xs font-bold text-[var(--ink-soft)] sm:block">{view === 'players' ? team?.abbreviation ?? 'FA' : `${entry.wins}-${entry.losses}`}</span><span className="number-tabular text-sm font-bold text-[var(--ink-soft)]">{entry.gamesPlayed}</span><span className="number-tabular text-right text-lg font-black text-[var(--orange-soft)]">{formatMetricValue(entry.stats[metric.key], metric)}</span></Link>;
}

function TeamStatsTable({ entries, teams, selectionLabel }: { entries: Aggregate[]; teams: Map<string, Team>; selectionLabel: string }) {
  return (
    <section className="mt-12" aria-labelledby="team-stats-heading">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Team performance</p><h2 id="team-stats-heading" className="display-type mt-3 text-3xl sm:text-4xl">Team stats</h2></div>
        <p className="text-xs font-bold text-[var(--ink-faint)]">Showing {selectionLabel}</p>
      </div>
      {entries.length === 0 ? (
        <EmptyState icon={Shield} title="No team stats" description="Choose a season or tournament with recorded games to see team totals." />
      ) : (
        <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full min-w-[48rem] border-collapse text-sm">
            <thead><tr className="border-b border-[var(--line)] text-left text-[0.58rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]"><th className="px-5 py-3">Team</th><th className="px-3 py-3 text-center">GP</th><th className="px-3 py-3 text-center">Record</th><th className="px-3 py-3 text-right">PPG</th><th className="px-3 py-3 text-right">RPG</th><th className="px-3 py-3 text-right">APG</th><th className="px-3 py-3 text-right">FG%</th><th className="px-5 py-3 text-right">3PT%</th></tr></thead>
            <tbody>{entries.map((entry) => {
              const team = teams.get(entry.id);
              if (!team) return null;
              return <tr key={entry.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-raised)]"><td className="px-5 py-3"><Link href={`/teams/${team.slug}`} className="flex items-center gap-3 font-black"><TeamLogo team={team} size="sm" /><span><span className="block">{team.name}</span><span className="block text-[0.62rem] text-[var(--ink-faint)]">{team.abbreviation}</span></span></Link></td><td className="number-tabular px-3 py-3 text-center font-bold">{entry.gamesPlayed}</td><td className="number-tabular px-3 py-3 text-center font-bold">{entry.wins}-{entry.losses}</td><td className="number-tabular px-3 py-3 text-right font-black text-[var(--orange-soft)]">{entry.stats.pointsPerGame.toFixed(1)}</td><td className="number-tabular px-3 py-3 text-right">{entry.stats.reboundsPerGame.toFixed(1)}</td><td className="number-tabular px-3 py-3 text-right">{entry.stats.assistsPerGame.toFixed(1)}</td><td className="number-tabular px-3 py-3 text-right">{entry.stats.fieldGoalPct.toFixed(1)}%</td><td className="number-tabular px-5 py-3 text-right">{entry.stats.threePointPct.toFixed(1)}%</td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
