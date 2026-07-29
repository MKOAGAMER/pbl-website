'use client';

import Link from 'next/link';
import { ArrowRight, Search, SearchX, UserRound, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { TeamLogo } from '@/app/components/ui/TeamLogo';
import type { Player, Team } from '@/lib/league-types';
import { initials } from '@/lib/utils';

type SortMode = 'name' | 'points' | 'rebounds' | 'assists';

interface PlayerDirectoryProps {
  players: Player[];
  teams: Team[];
}

export function PlayerDirectory({ players, teams }: PlayerDirectoryProps) {
  const [query, setQuery] = useState('');
  const [teamId, setTeamId] = useState('all');
  const [position, setPosition] = useState('all');
  const [sort, setSort] = useState<SortMode>('name');

  const positions = useMemo(
    () => [...new Set(players.map((player) => player.position).filter(Boolean))].sort(),
    [players],
  );
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);

  const filteredPlayers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return players
      .filter((player) => teamId === 'all' || (teamId === 'free-agent' ? !player.teamId : player.teamId === teamId))
      .filter((player) => position === 'all' || player.position === position)
      .filter((player) => {
        if (!normalizedQuery) return true;
        const team = teamsById.get(player.teamId);
        return [
          player.displayName,
          player.robloxUsername,
          player.position,
          team?.name ?? '',
          team?.abbreviation ?? '',
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sort === 'points') return b.stats.pointsPerGame - a.stats.pointsPerGame || a.displayName.localeCompare(b.displayName);
        if (sort === 'rebounds') return b.stats.reboundsPerGame - a.stats.reboundsPerGame || a.displayName.localeCompare(b.displayName);
        if (sort === 'assists') return b.stats.assistsPerGame - a.stats.assistsPerGame || a.displayName.localeCompare(b.displayName);
        return a.displayName.localeCompare(b.displayName);
      });
  }, [players, position, query, sort, teamId, teamsById]);

  const resetFilters = () => {
    setQuery('');
    setTeamId('all');
    setPosition('all');
    setSort('name');
  };

  return (
    <div className="site-shell py-12 sm:py-16">
      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5">
        <label className="relative block">
          <span className="sr-only">Search players</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by display name or Roblox username..."
            className="h-12 w-full rounded-full border border-[var(--line)] bg-[var(--page)] pl-11 pr-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-faint)]"
          />
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FilterSelect label="Team" value={teamId} onChange={setTeamId}>
            <option value="all">All teams</option>
            <option value="free-agent">Free Agents</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </FilterSelect>
          <FilterSelect label="Position" value={position} onChange={setPosition}>
            <option value="all">All positions</option>
            {positions.map((item) => <option key={item} value={item}>{item}</option>)}
          </FilterSelect>
          <FilterSelect label="Sort" value={sort} onChange={(value) => setSort(value as SortMode)}>
            <option value="name">Name A-Z</option>
            <option value="points">Points per game</option>
            <option value="rebounds">Rebounds per game</option>
            <option value="assists">Assists per game</option>
          </FilterSelect>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]" aria-live="polite">
            <span className="text-[var(--ink)]">{filteredPlayers.length}</span> of {players.length} players
          </p>
          {(query || teamId !== 'all' || position !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[0.65rem] font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {filteredPlayers.length === 0 ? (
        <div className="mt-7">
          <EmptyState
            icon={players.length === 0 ? Users : SearchX}
            title={players.length === 0 ? 'No players published' : 'No players match those filters'}
            description={
              players.length === 0
                ? 'Player profiles will appear here after the first Roblox login.'
                : 'Try a different name, team or position.'
            }
          />
        </div>
      ) : (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredPlayers.map((player) => {
            const team = teamsById.get(player.teamId);
            const primaryColor = team?.primaryColor ?? '#ff6b22';
            const secondaryColor = team?.secondaryColor ?? '#ffb067';

            return (
              <Link
                key={player.id}
                href={`/players/${player.slug}`}
                className="lift group relative isolate overflow-hidden rounded-[1.55rem] border border-[var(--line)] bg-[var(--surface)] p-5"
              >
                <span
                  className="absolute -right-10 -top-14 -z-10 h-36 w-36 rounded-full opacity-15 blur-2xl"
                  style={{ backgroundColor: primaryColor }}
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className="grid h-16 w-16 shrink-0 place-items-center rounded-[1.25rem] text-sm font-black text-white shadow-lg"
                      style={{ background: `linear-gradient(145deg, ${primaryColor}, ${secondaryColor})` }}
                    >
                      {initials(player.displayName)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">
                        #{player.jerseyNumber} <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" /> {player.position}
                      </span>
                      <span className="mt-1.5 block truncate text-xl font-black tracking-[-0.04em] transition group-hover:text-[var(--orange-soft)]">{player.displayName}</span>
                      <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--ink-faint)]"><UserRound className="h-3.5 w-3.5" /> @{player.robloxUsername}</span>
                    </span>
                  </div>
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${player.isActive ? 'bg-emerald-400' : 'bg-[var(--ink-faint)]'}`} title={player.isActive ? 'Active' : 'Inactive'} />
                </div>

                <div className="mt-5 flex min-h-10 items-center border-y border-[var(--line)] py-3">
                  {team ? (
                    <span className="flex min-w-0 items-center gap-2 text-xs font-bold text-[var(--ink-soft)]">
                      <TeamLogo team={team} size="sm" className="!h-6 !w-6 !rounded-lg !text-[0.45rem]" />
                      <span className="truncate">{team.name}</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-[var(--ink-faint)]">Free agent</span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3">
                  <PlayerMetric label="PPG" value={player.stats.pointsPerGame.toFixed(1)} />
                  <PlayerMetric label="RPG" value={player.stats.reboundsPerGame.toFixed(1)} />
                  <PlayerMetric label="APG" value={player.stats.assistsPerGame.toFixed(1)} />
                  <ArrowRight className="mb-1 h-5 w-5 text-[var(--orange-soft)] transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.58rem] font-black uppercase tracking-[0.12em] text-[var(--ink-faint)]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--ink)]"
      >
        {children}
      </select>
    </label>
  );
}

function PlayerMetric({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="number-tabular block text-xl font-black tracking-[-0.05em]">{value}</span>
      <span className="mt-1 block text-[0.56rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">{label}</span>
    </span>
  );
}
