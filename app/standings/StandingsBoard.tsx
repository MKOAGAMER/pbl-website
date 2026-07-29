'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { rankTeamsByStanding, winPercentage } from '@/lib/utils';
import type { Team } from '@/lib/league-types';
import { TeamLogo } from '../components/ui/TeamLogo';

export function StandingsBoard({ teams, season }: { teams: Team[]; season: string }) {
  const t = useTranslations('Standings');
  const east = rankTeamsByStanding(teams.filter((team) => team.conference === 'East'));
  const west = rankTeamsByStanding(teams.filter((team) => team.conference === 'West'));
  return <><section className="relative overflow-hidden border-b border-[var(--line)]"><div className="race-grid absolute inset-0 opacity-25" /><div className="site-shell relative py-16 sm:py-24"><p className="race-eyebrow">{t('eyebrow')} / {season}</p><h1 className="race-display mt-4 max-w-4xl text-5xl sm:text-7xl">{t('title')}</h1><p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">{t('body')}</p></div></section><main className="site-shell py-12 sm:py-16">{teams.length === 0 ? <div className="race-panel rounded-2xl p-8 text-[var(--ink-soft)]">{t('noData')}</div> : <div className="grid gap-6 xl:grid-cols-2"><Table title={t('east')} teams={east} /><Table title={t('west')} teams={west} /></div>}</main></>;
}

function Table({ title, teams }: { title: string; teams: Team[] }) {
  const t = useTranslations('Standings');
  const leader = teams[0];
  return <section className="race-panel overflow-hidden rounded-[1.5rem]"><div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4"><h2 className="race-display text-3xl">{title}</h2><span className="text-[.62rem] font-black uppercase tracking-[.12em] text-[var(--orange-soft)]">{teams.length} Teams</span></div><div className="overflow-x-auto"><table className="w-full min-w-[35rem] text-left"><thead><tr className="border-b border-[var(--line)] text-[.6rem] font-black uppercase tracking-[.12em] text-[var(--ink-faint)]"><th className="px-4 py-3">#</th><th className="px-3 py-3">{t('team')}</th><th className="px-3 py-3 text-center">{t('games')}</th><th className="px-3 py-3 text-center">{t('record')}</th><th className="px-3 py-3 text-center">{t('pct')}</th><th className="px-4 py-3 text-center">{t('gb')}</th></tr></thead><tbody>{teams.map((team, index) => <tr key={team.id} className="border-b border-[var(--line)] last:border-0 hover:bg-white/[.03]"><td className="race-display px-4 py-4 text-xl text-[var(--ink-faint)]">{String(index + 1).padStart(2, '0')}</td><td className="px-3 py-3"><Link href={`/teams/${team.slug}`} className="flex items-center gap-3"><TeamLogo team={team} size="sm" /><span><span className="block text-sm font-black uppercase italic hover:text-[var(--orange-soft)]">{team.name}</span><span className="text-[.6rem] font-bold uppercase tracking-[.1em] text-[var(--ink-faint)]">{team.abbreviation}</span></span></Link></td><Metric value={team.wins + team.losses} /><Metric value={`${team.wins}–${team.losses}`} strong /><Metric value={winPercentage(team.wins, team.losses).toFixed(3).replace(/^0/, '')} /><Metric value={gamesBehind(leader, team)} /></tr>)}</tbody></table></div></section>;
}
function Metric({ value, strong }: { value: string | number; strong?: boolean }) { return <td className={`px-3 py-4 text-center text-sm ${strong ? 'font-black' : 'font-bold text-[var(--ink-soft)]'}`}>{value}</td>; }
function gamesBehind(leader: Team | undefined, team: Team) { if (!leader || leader.id === team.id) return '—'; const value = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2; return value === 0 ? '—' : Number.isInteger(value) ? String(value) : value.toFixed(1); }

