'use client';

import { useMemo, useState } from 'react';
import { CalendarX2, RotateCcw } from 'lucide-react';
import type { Game, Team } from '@/lib/league-types';
import { GameCard } from '@/app/components/ui/GameCard';
import { EmptyState } from '@/app/components/ui/EmptyState';

type StatusFilter = 'all' | 'upcoming' | 'live' | 'final';

interface GamesExplorerProps {
  games: Game[];
  teams: Team[];
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All games' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'live', label: 'Live' },
  { value: 'final', label: 'Finals' },
];

export function GamesExplorer({ games, teams }: GamesExplorerProps) {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [teamId, setTeamId] = useState('all');
  const [week, setWeek] = useState('all');

  const availableWeeks = useMemo(
    () => [...new Set(games.map((game) => game.week))].sort((a, b) => b - a),
    [games],
  );

  const counts = useMemo(
    () => ({
      all: games.length,
      upcoming: games.filter((game) => game.status === 'scheduled').length,
      live: games.filter((game) => game.status === 'live').length,
      final: games.filter((game) => game.status === 'final').length,
    }),
    [games],
  );

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesStatus =
        status === 'all' ||
        (status === 'upcoming' && game.status === 'scheduled') ||
        game.status === status;
      const matchesTeam =
        teamId === 'all' || game.homeTeamId === teamId || game.awayTeamId === teamId;
      const matchesWeek = week === 'all' || game.week === Number(week);
      return matchesStatus && matchesTeam && matchesWeek;
    });
  }, [games, status, teamId, week]);

  const groupedGames = useMemo(() => {
    const groups = new Map<number, Game[]>();
    for (const game of filteredGames) {
      const group = groups.get(game.week) ?? [];
      group.push(game);
      groups.set(game.week, group);
    }

    return [...groups.entries()]
      .sort(([weekA], [weekB]) => weekB - weekA)
      .map(([weekNumber, weekGames]) => ({
        week: weekNumber,
        games: weekGames.sort(
          (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        ),
      }));
  }, [filteredGames]);

  function resetFilters() {
    setStatus('all');
    setTeamId('all');
    setWeek('all');
  }

  return (
    <div>
      <div className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Filter games by status">
          {statusOptions.map((option) => {
            const active = status === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatus(option.value)}
                aria-pressed={active}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[0.65rem] font-black uppercase tracking-[0.11em] transition ${
                  active
                    ? 'bg-[var(--orange)] text-black'
                    : 'border border-[var(--line)] bg-[var(--surface-raised)] text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]'
                }`}
              >
                {option.label}
                <span
                  className={`number-tabular rounded-full px-1.5 py-0.5 text-[0.58rem] ${
                    active ? 'bg-black/15' : 'bg-[var(--surface-soft)]'
                  }`}
                >
                  {counts[option.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid gap-2 border-t border-[var(--line)] pt-3 sm:grid-cols-2">
          <label className="grid gap-1.5">
            <span className="px-1 text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">
              Team
            </span>
            <select
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
              className="h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--ink)] outline-none transition focus:border-[var(--orange)]"
            >
              <option value="all">All teams</option>
              {[...teams]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
            </select>
          </label>

          <label className="grid gap-1.5">
            <span className="px-1 text-[0.6rem] font-black uppercase tracking-[0.13em] text-[var(--ink-faint)]">
              Week
            </span>
            <select
              value={week}
              onChange={(event) => setWeek(event.target.value)}
              className="h-11 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-sm font-bold text-[var(--ink)] outline-none transition focus:border-[var(--orange)]"
            >
              <option value="all">All weeks</option>
              {availableWeeks.map((weekNumber) => (
                <option key={weekNumber} value={weekNumber}>Week {weekNumber}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {groupedGames.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={CalendarX2}
            title="No games match these filters"
            description="Try another team, week or game status to find a matchup."
          />
          {(status !== 'all' || teamId !== 'all' || week !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface)] px-5 py-2.5 text-xs font-black uppercase tracking-[0.11em] transition hover:border-[var(--orange)] hover:text-[var(--orange-soft)]"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {groupedGames.map((group) => (
            <section key={group.week} aria-labelledby={`week-${group.week}`}>
              <div className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--line)] pb-3">
                <div>
                  <p className="text-[0.62rem] font-black uppercase tracking-[0.15em] text-[var(--orange-soft)]">
                    Regular season
                  </p>
                  <h2 id={`week-${group.week}`} className="display-type mt-1 text-3xl">Week {group.week}</h2>
                </div>
                <span className="number-tabular text-xs font-bold text-[var(--ink-faint)]">
                  {group.games.length} {group.games.length === 1 ? 'matchup' : 'matchups'}
                </span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {group.games.map((game) => (
                  <GameCard key={game.id} game={game} teams={teams} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
