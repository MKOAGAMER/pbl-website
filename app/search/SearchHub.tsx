'use client';

import Link from 'next/link';
import { Search, Shield, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Player, Team } from '@/lib/league-types';
import { TeamLogo } from '../components/ui/TeamLogo';
import { PlayerAvatar } from '../components/ui/PlayerAvatar';

export function SearchHub({ players, teams }: { players: Player[]; teams: Team[] }) {
  const t = useTranslations('Search');
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return { players: players.slice(0, 6), teams: teams.slice(0, 6) };
    return {
      players: players.filter((player) => [player.displayName, player.robloxUsername, player.positions.join(' ')].some((item) => item.toLowerCase().includes(value))).slice(0, 12),
      teams: teams.filter((team) => [team.name, team.abbreviation, team.city].some((item) => item.toLowerCase().includes(value))).slice(0, 12),
    };
  }, [players, query, teams]);

  return (
    <>
      <section className="relative overflow-hidden border-b border-[var(--line)]">
        <div className="race-grid absolute inset-0 opacity-25" />
        <div className="site-shell relative py-16 sm:py-24">
          <p className="race-eyebrow">{t('eyebrow')}</p><h1 className="race-display mt-4 text-5xl sm:text-7xl">{t('title')}</h1><p className="mt-5 max-w-xl text-sm leading-7 text-[var(--ink-soft)]">{t('body')}</p>
          <label className="race-panel mt-8 flex max-w-2xl items-center gap-3 rounded-xl px-4"><Search className="h-5 w-5 text-[var(--orange-soft)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('placeholder')} className="h-14 min-w-0 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-[var(--ink-faint)]" autoFocus /></label>
        </div>
      </section>
      <main className="site-shell grid gap-7 py-12 lg:grid-cols-2">
        <Results title={t('players')} icon={UserRound}>
          {results.players.map((player) => {
            const team = teams.find((item) => item.id === player.teamId);
            return <Link key={player.id} href={`/players/${player.slug}`} className="flex items-center gap-3 border-b border-[var(--line)] p-3 last:border-0 hover:bg-white/[.03]"><PlayerAvatar src={player.avatarUrl} name={player.displayName} size="sm" className="!h-10 !w-10" primaryColor={team?.primaryColor} secondaryColor={team?.secondaryColor} /><span className="min-w-0"><span className="block truncate font-black uppercase italic">{player.displayName}</span><span className="text-xs text-[var(--ink-faint)]">@{player.robloxUsername} · {team?.abbreviation}</span></span></Link>;
          })}
        </Results>
        <Results title={t('teams')} icon={Shield}>
          {results.teams.map((team) => <Link key={team.id} href={`/teams/${team.slug}`} className="flex items-center gap-3 border-b border-[var(--line)] p-3 last:border-0 hover:bg-white/[.03]"><TeamLogo team={team} size="sm" /><span><span className="block font-black uppercase italic">{team.name}</span><span className="text-xs text-[var(--ink-faint)]">{team.city} · {team.wins}–{team.losses}</span></span></Link>)}
        </Results>
        {query && results.players.length === 0 && results.teams.length === 0 && <p className="lg:col-span-2 text-center text-sm text-[var(--ink-faint)]">{t('empty')}</p>}
      </main>
    </>
  );
}

function Results({ title, icon: Icon, children }: { title: string; icon: typeof Search; children: React.ReactNode }) {
  return <section className="race-panel overflow-hidden rounded-[1.5rem]"><h2 className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4 text-lg font-black uppercase italic"><Icon className="h-5 w-5 text-[var(--orange-soft)]" />{title}</h2>{children}</section>;
}
