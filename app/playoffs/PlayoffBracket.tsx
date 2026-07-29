'use client';

import { useTranslations } from 'next-intl';
import { rankTeamsByStanding } from '@/lib/utils';
import type { Team } from '@/lib/league-types';
import { TeamLogo } from '../components/ui/TeamLogo';

export function PlayoffBracket({ teams }: { teams: Team[] }) {
  const t = useTranslations('Playoffs');
  const east = rankTeamsByStanding(teams.filter((team) => team.conference === 'East')).slice(0, 4);
  const west = rankTeamsByStanding(teams.filter((team) => team.conference === 'West')).slice(0, 4);
  return <><section className="relative overflow-hidden border-b border-[var(--line)]"><div className="race-grid absolute inset-0 opacity-25" /><div className="site-shell relative py-16 sm:py-24"><p className="race-eyebrow">{t('eyebrow')}</p><h1 className="race-display mt-4 max-w-4xl text-5xl sm:text-7xl">{t('title')}</h1><p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">{t('body')}</p></div></section><main className="site-shell py-12 sm:py-16"><div className="grid gap-8 xl:grid-cols-[1fr_auto_1fr]"><Conference title={t('east')} teams={east} /><section className="race-panel order-first flex min-h-48 flex-col justify-center rounded-[1.5rem] p-6 text-center xl:order-none"><p className="race-eyebrow">CHAMPIONSHIP</p><h2 className="race-display mt-3 text-4xl">{t('finals')}</h2><div className="my-7 border-y border-[var(--line)] py-5 text-sm font-bold text-[var(--ink-faint)]">{t('tbd')}</div><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--orange)] text-black">★</span></section><Conference title={t('west')} teams={west} /></div></main></>;
}
function Conference({ title, teams }: { title: string; teams: Team[] }) { const t = useTranslations('Playoffs'); const pairings = [[teams[0], teams[3]], [teams[1], teams[2]]] as const; return <section className="race-panel rounded-[1.5rem] p-5"><div className="mb-5 flex items-center justify-between"><h2 className="race-display text-3xl">{title}</h2><span className="text-[.62rem] font-black uppercase tracking-[.12em] text-[var(--orange-soft)]">{t('seed')}</span></div><div className="space-y-5">{pairings.map(([top, bottom], index) => <div key={index} className="rounded-xl border border-[var(--line)] bg-black/20"><MatchRow team={top} seed={index === 0 ? 1 : 2} /><MatchRow team={bottom} seed={index === 0 ? 4 : 3} /></div>)}</div></section>; }
function MatchRow({ team, seed }: { team: Team | undefined; seed: number }) { const t = useTranslations('Playoffs'); return <div className="flex items-center gap-3 border-b border-[var(--line)] px-3 py-3 last:border-0"><span className="w-5 text-center text-xs font-black text-[var(--ink-faint)]">{seed}</span>{team ? <><TeamLogo team={team} size="sm" /><span className="min-w-0 flex-1 truncate text-sm font-black uppercase italic">{team.name}</span><span className="text-xs font-bold text-[var(--ink-faint)]">{team.wins}–{team.losses}</span></> : <span className="flex-1 text-sm text-[var(--ink-faint)]">{t('tbd')}</span>}</div>; }

