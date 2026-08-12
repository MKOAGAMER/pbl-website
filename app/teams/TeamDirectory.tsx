'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Search, SearchX, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { CompetitionStatsSelect } from '@/app/components/ui/CompetitionStatsSelect';
import { MedalBadges } from '@/app/components/ui/MedalBadges';
import { PlayerAvatar } from '@/app/components/ui/PlayerAvatar';
import { TeamLogo } from '@/app/components/ui/TeamLogo';
import { aggregateTeamCompetitionStats, competitionIdsForSelection, competitionSelectionLabel } from '@/lib/competition-stats';
import type { Accolade, Conference, Player, Team } from '@/lib/league-types';
import type { StatsExplorerData } from '@/lib/stats-data';
import { winPercentage } from '@/lib/utils';

type ConferenceFilter = 'All' | Conference;
type SortMode = 'record' | 'points' | 'name';

interface TeamDirectoryProps {
  teams: Team[];
  players: Player[];
  statsData: StatsExplorerData;
  accolades: Accolade[];
}

export function TeamDirectory({ teams, players, statsData, accolades }: TeamDirectoryProps) {
  const [query, setQuery] = useState('');
  const [conference, setConference] = useState<ConferenceFilter>('All');
  const [sort, setSort] = useState<SortMode>('record');
  const [competition, setCompetition] = useState(statsData.initialCompetitionId);
  const selectedCompetitionIds = useMemo(() => competitionIdsForSelection(statsData.competitions, competition), [competition, statsData.competitions]);
  const competitionStats = useMemo(() => aggregateTeamCompetitionStats(statsData.lines, statsData.results, selectedCompetitionIds), [selectedCompetitionIds, statsData.lines, statsData.results]);
  const competitionLabel = competitionSelectionLabel(statsData.competitions, competition);
  const displayedTeams = useMemo(() => teams.map((team) => {
    const entry = competitionStats.get(team.id);
    return { ...team, wins: entry?.wins ?? 0, losses: entry?.losses ?? 0, competitionStats: entry?.stats ?? { gamesPlayed: 0, pointsPerGame: 0, reboundsPerGame: 0, assistsPerGame: 0, stealsPerGame: 0, blocksPerGame: 0, fieldGoalPct: 0, threePointPct: 0 } };
  }), [competitionStats, teams]);

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return displayedTeams
      .filter((team) => conference === 'All' || team.conference === conference)
      .filter((team) => {
        if (!normalizedQuery) return true;
        const rosterNames = players
          .filter((player) => player.teamId === team.id)
          .map((player) => `${player.displayName} ${player.robloxUsername}`);
        return [team.name, team.shortName, team.city, team.abbreviation, ...rosterNames]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'points') return b.competitionStats.pointsPerGame - a.competitionStats.pointsPerGame || a.name.localeCompare(b.name);
        return winPercentage(b.wins, b.losses) - winPercentage(a.wins, a.losses)
          || b.wins - a.wins
          || a.name.localeCompare(b.name);
      });
  }, [conference, displayedTeams, players, query, sort]);

  const rosterByTeam = useMemo(() => {
    const rosterMap = new Map<string, Player[]>();
    players.forEach((player) => {
      if (!player.teamId) return;
      const roster = rosterMap.get(player.teamId) ?? [];
      roster.push(player);
      rosterMap.set(player.teamId, roster);
    });
    rosterMap.forEach((roster) => roster.sort((a, b) => a.jerseyNumber - b.jerseyNumber || a.displayName.localeCompare(b.displayName)));
    return rosterMap;
  }, [players]);

  const resetFilters = () => {
    setQuery('');
    setConference('All');
    setSort('record');
  };

  return (
    <div className="site-shell py-12 sm:py-16">
      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="relative block">
            <span className="sr-only">Search teams</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search team, city or abbreviation..."
              className="h-12 w-full rounded-full border border-[var(--line)] bg-[var(--page)] pl-11 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
            />
          </label>

          <div className="flex flex-wrap gap-2" aria-label="Filter teams by conference">
            {(['All', 'East', 'West'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setConference(value)}
                aria-pressed={conference === value}
                className={`h-10 rounded-full px-4 text-[0.65rem] font-black uppercase tracking-[0.12em] transition ${
                  conference === value
                    ? 'bg-[var(--orange)] text-black'
                    : 'border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]'
                }`}
              >
                {value === 'All' ? 'All teams' : `${value} conference`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t border-[var(--line)] pt-4 sm:grid-cols-[minmax(14rem,22rem)_1fr_auto] sm:items-end">
          <CompetitionStatsSelect competitions={statsData.competitions} value={competition} onChange={setCompetition} />
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]" aria-live="polite">
            Showing <span className="text-[var(--ink)]">{filteredTeams.length}</span> of {teams.length} teams · {competitionLabel}
          </p>
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--ink-soft)]">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="h-9 rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-xs font-bold text-[var(--ink)]"
            >
              <option value="record">Best record</option>
              <option value="points">Points per game</option>
              <option value="name">Team name</option>
            </select>
          </label>
        </div>
      </div>

      {filteredTeams.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            icon={teams.length === 0 ? Shield : SearchX}
            title={teams.length === 0 ? 'No teams published' : 'No teams match those filters'}
            description={
              teams.length === 0
                ? 'League clubs will appear here after they are added for the active season.'
                : 'Try another team name or clear the conference filter.'
            }
          />
          {teams.length > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="mx-auto mt-4 block text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredTeams.map((team) => {
            const totalGames = team.wins + team.losses;
            const roster = rosterByTeam.get(team.id) ?? [];

            return (
              <Link
                key={team.id}
                href={`/teams/${team.slug}`}
                className="lift group relative isolate rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)] p-5 hover:z-30 sm:p-6"
              >
                <span
                  className="absolute -right-12 -top-12 -z-10 h-40 w-40 rounded-full opacity-15 blur-2xl"
                  style={{ backgroundColor: team.primaryColor }}
                />
                <div className="flex items-start justify-between gap-4">
                  <span className="relative shrink-0">
                    <TeamLogo team={team} size="lg" />
                    <MedalBadges accolades={accolades.filter((item) => item.teamId === team.id)} size="sm" className="absolute -bottom-2 -right-3 max-w-20 justify-end" />
                  </span>
                  <span className="rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.12em] text-[var(--ink-soft)]">
                    {team.conference}
                  </span>
                </div>

                <div className="mt-7">
                  <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.11em] text-[var(--ink-faint)]">
                    <MapPin className="h-3.5 w-3.5" /> {team.city}
                  </p>
                  <h2 className="mt-2 text-2xl font-black leading-tight tracking-[-0.045em] transition group-hover:text-[var(--orange-soft)]">
                    {team.name}
                  </h2>
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--ink-soft)]">{team.description}</p>
                </div>

                <div className="mt-6 border-t border-[var(--line)] pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">Active roster</p>
                    <span className="number-tabular text-[0.62rem] font-black text-[var(--ink-soft)]">{roster.length} players</span>
                  </div>
                  {roster.length ? (
                    <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                      {roster.slice(0, 6).map((player) => (
                        <span key={player.id} className="flex min-w-0 items-center gap-2">
                          <PlayerAvatar src={player.avatarUrl} name={player.displayName} size="sm" className="!h-6 !w-6 !rounded-md !text-[0.45rem]" primaryColor={team.primaryColor} secondaryColor={team.secondaryColor} />
                          <span className="truncate text-xs font-bold">{player.displayName}</span>
                        </span>
                      ))}
                      {roster.length > 6 && <span className="text-xs font-bold text-[var(--orange-soft)]">+{roster.length - 6} more</span>}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--ink-faint)]">No roster players assigned</p>
                  )}
                </div>

                <p className="mt-5 text-[0.56rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{competitionLabel}</p>
                <div className="mt-2 grid grid-cols-[1fr_1fr_1fr_auto] gap-3 border-t border-[var(--line)] pt-5">
                  <TeamMetric label="Record" value={`${team.wins}-${team.losses}`} />
                  <TeamMetric label="PPG" value={team.competitionStats.pointsPerGame.toFixed(1)} />
                  <TeamMetric label="GP" value={String(team.competitionStats.gamesPlayed || totalGames)} />
                  <span className="flex items-end justify-end pb-1 text-[var(--orange-soft)]">
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TeamMetric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="number-tabular block text-xl font-black tracking-[-0.05em]">{value}</span>
      <span className="mt-1 block text-[0.58rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">{label}</span>
    </span>
  );
}
