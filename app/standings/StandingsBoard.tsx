'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { rankTeamsByStanding, winPercentage } from '@/lib/utils';
import type { Team } from '@/lib/league-types';
import { TeamLogo } from '../components/ui/TeamLogo';

export function StandingsBoard({ teams, season }: { teams: Team[]; season: string }) {
  const t = useTranslations('Standings');
  const east = useMemo(() => rankTeamsByStanding(teams.filter((team) => team.conference === 'East')), [teams]);
  const west = useMemo(() => rankTeamsByStanding(teams.filter((team) => team.conference === 'West')), [teams]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--line)]">
        <div className="race-grid absolute inset-0 opacity-25" />
        <div className="site-shell relative py-16 sm:py-24">
          <p className="race-eyebrow">{t('eyebrow')} / {season}</p>
          <h1 className="race-display mt-4 max-w-4xl text-5xl sm:text-7xl">{t('title')}</h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">{t('body')}</p>
        </div>
      </section>
      <main className="site-shell py-12 sm:py-16">
        {teams.length === 0
          ? <div className="race-panel rounded-2xl p-8 text-[var(--ink-soft)]">{t('noData')}</div>
          : <div className="grid gap-6 xl:grid-cols-2"><Table title={t('east')} teams={east} /><Table title={t('west')} teams={west} /></div>}
      </main>
    </>
  );
}

function Table({ title, teams }: { title: string; teams: Team[] }) {
  const t = useTranslations('Standings');
  const leader = teams[0];

  return (
    <section className="race-panel overflow-hidden rounded-[1.5rem]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-4 sm:px-5">
        <h2 className="race-display text-3xl">{title}</h2>
        <span className="text-[.62rem] font-black uppercase tracking-[.12em] text-[var(--orange-soft)]">{teams.length} Teams</span>
      </div>
      <table className="w-full table-fixed text-left">
        <thead>
          <tr className="border-b border-[var(--line)] text-[.56rem] font-black uppercase tracking-[.08em] text-[var(--ink-faint)] sm:text-[.6rem] sm:tracking-[.12em]">
            <th className="w-9 px-2 py-3 text-center sm:w-12 sm:px-4">#</th>
            <th className="px-2 py-3 sm:px-3">{t('team')}</th>
            <th className="hidden w-12 px-2 py-3 text-center sm:table-cell">{t('games')}</th>
            <th className="w-16 px-2 py-3 text-center sm:w-20 sm:px-3">{t('record')}</th>
            <th className="hidden w-16 px-2 py-3 text-center md:table-cell">{t('pct')}</th>
            <th className="w-12 px-2 py-3 text-center sm:w-16 sm:px-4">{t('gb')}</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => (
            <tr key={team.id} className="border-b border-[var(--line)] last:border-0 hover:bg-white/[.03]">
              <td className="race-display px-2 py-4 text-center text-lg text-[var(--ink-faint)] sm:px-4 sm:text-xl">{String(index + 1).padStart(2, '0')}</td>
              <td className="min-w-0 px-2 py-3 sm:px-3">
                <Link href={`/teams/${team.slug}`} className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <TeamLogo team={team} size="sm" className="!h-8 !w-8 shrink-0 sm:!h-10 sm:!w-10" />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black uppercase italic hover:text-[var(--orange-soft)] sm:text-sm">{team.name}</span>
                    <span className="text-[.56rem] font-bold uppercase tracking-[.08em] text-[var(--ink-faint)] sm:text-[.6rem] sm:tracking-[.1em]">{team.abbreviation}</span>
                  </span>
                </Link>
              </td>
              <Metric value={team.wins + team.losses} hidden="sm" />
              <Metric value={`${team.wins}–${team.losses}`} strong />
              <Metric value={winPercentage(team.wins, team.losses).toFixed(3).replace(/^0/, '')} hidden="md" />
              <Metric value={gamesBehind(leader, team)} />
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Metric({ value, strong, hidden }: { value: string | number; strong?: boolean; hidden?: 'sm' | 'md' }) {
  const responsiveClass = hidden === 'sm' ? 'hidden sm:table-cell' : hidden === 'md' ? 'hidden md:table-cell' : '';
  return <td className={`${responsiveClass} px-2 py-4 text-center text-xs sm:px-3 sm:text-sm ${strong ? 'font-black' : 'font-bold text-[var(--ink-soft)]'}`}>{value}</td>;
}

function gamesBehind(leader: Team | undefined, team: Team) {
  if (!leader || leader.id === team.id) return '—';
  const value = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
  return value === 0 ? '—' : Number.isInteger(value) ? String(value) : value.toFixed(1);
}
