'use client';

import Link from 'next/link';
import { ArrowRight, MapPin, Search, SearchX, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/app/components/ui/EmptyState';
import { TeamLogo } from '@/app/components/ui/TeamLogo';
import type { Conference, Team } from '@/lib/league-types';
import { winPercentage } from '@/lib/utils';

type ConferenceFilter = 'All' | Conference;
type SortMode = 'record' | 'name';

interface TeamDirectoryProps {
  teams: Team[];
}

export function TeamDirectory({ teams }: TeamDirectoryProps) {
  const [query, setQuery] = useState('');
  const [conference, setConference] = useState<ConferenceFilter>('All');
  const [sort, setSort] = useState<SortMode>('record');

  const filteredTeams = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return teams
      .filter((team) => conference === 'All' || team.conference === conference)
      .filter((team) => {
        if (!normalizedQuery) return true;
        return [team.name, team.shortName, team.city, team.abbreviation]
          .some((value) => value.toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        return winPercentage(b.wins, b.losses) - winPercentage(a.wins, a.losses)
          || b.wins - a.wins
          || a.name.localeCompare(b.name);
      });
  }, [conference, query, sort, teams]);

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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]" aria-live="polite">
            Showing <span className="text-[var(--ink)]">{filteredTeams.length}</span> of {teams.length} teams
          </p>
          <label className="flex items-center gap-2 text-xs font-bold text-[var(--ink-soft)]">
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortMode)}
              className="h-9 rounded-full border border-[var(--line)] bg-[var(--surface-raised)] px-3 text-xs font-bold text-[var(--ink)]"
            >
              <option value="record">Best record</option>
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
            const winPct = winPercentage(team.wins, team.losses);

            return (
              <Link
                key={team.id}
                href={`/teams/${team.slug}`}
                className="lift group relative isolate overflow-hidden rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6"
              >
                <span
                  className="absolute -right-12 -top-12 -z-10 h-40 w-40 rounded-full opacity-15 blur-2xl"
                  style={{ backgroundColor: team.primaryColor }}
                />
                <div className="flex items-start justify-between gap-4">
                  <TeamLogo team={team} size="lg" />
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

                <div className="mt-7 grid grid-cols-3 gap-3 border-t border-[var(--line)] pt-5">
                  <TeamMetric label="Record" value={`${team.wins}-${team.losses}`} />
                  <TeamMetric label="Win pct" value={totalGames ? winPct.toFixed(3).replace(/^0/, '') : '.000'} />
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
