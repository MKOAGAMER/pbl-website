'use client';

import Link from 'next/link';
import { ArrowUpRight, ChevronRight, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SiteData } from '@/lib/league-types';
import type { Tournament } from '@/lib/tournament-types';
import { rankTeamsByStanding } from '@/lib/utils';
import { TeamLogo } from '../ui/TeamLogo';
import { LiveScoreboard } from './LiveScoreboard';

export function RaceHome({ data, tournaments }: { data: SiteData; tournaments: Tournament[] }) {
  const t = useTranslations('Home');
  const common = useTranslations('Common');
  const rankings = rankTeamsByStanding(data.teams).slice(0, 5);
  const leaders = [...data.players].filter((player) => player.stats.gamesPlayed > 0).sort((a, b) => b.stats.pointsPerGame - a.stats.pointsPerGame).slice(0, 3);
  const tournamentMatchCount = tournaments.reduce((total, tournament) => total + tournament.matches.length, 0);
  const competitionsAreEmpty = data.teams.length === 0 && data.games.length === 0 && tournamentMatchCount === 0;
  const watchHref = data.games.length > 0 ? '/games' : tournamentMatchCount > 0 ? '/tournaments' : '/login';
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-[var(--line)]">
        <div className="race-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
        <div className="absolute -right-[15%] top-0 h-full w-[52%] bg-[linear-gradient(115deg,transparent_25%,var(--orange)_25%,var(--orange)_30%,transparent_30%)] opacity-10" />
        <div className="site-shell relative grid min-h-[calc(100vh-4.5rem)] gap-10 py-16 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-24">
          <div className="hero-enter">
            <p className="race-eyebrow">{t('kicker')}</p>
            <h1 className="race-display mt-7 max-w-4xl text-[clamp(4.25rem,10vw,9.5rem)]"><span className="block">{t('titleLead')}</span><span className="block text-[var(--orange)]">{t('titleAccent')}</span></h1>
            <p className="mt-8 max-w-xl text-base leading-7 text-[var(--ink-soft)] sm:text-lg">{t('body')}</p>
            <div className="mt-9 flex flex-wrap gap-3"><Link href={watchHref} className="inline-flex h-12 items-center gap-2 bg-[var(--orange)] px-6 text-xs font-black uppercase italic tracking-[.12em] text-black transition hover:translate-x-1">{competitionsAreEmpty ? 'Join as a Player' : t('watchLive')} <ChevronRight className="h-4 w-4" /></Link><Link href="/players" className="inline-flex h-12 items-center gap-2 border border-[var(--line-strong)] bg-black/20 px-6 text-xs font-black uppercase italic tracking-[.12em] transition hover:border-[var(--orange)]">View Players</Link></div>
            <div className="mt-14 grid max-w-xl grid-cols-3 divide-x divide-[var(--line)] border-y border-[var(--line)]"><Telemetry label="TEAMS" value={data.teams.length} /><Telemetry label="PLAYERS" value={data.players.length} /><Telemetry label="GAMES" value={data.games.length + tournamentMatchCount} /></div>
          </div>
          <div className="hero-enter hero-enter-delayed"><LiveScoreboard games={data.games} teams={data.teams} tournaments={tournaments} /></div>
        </div>
      </section>

      <section className="site-shell scroll-reveal py-16 sm:py-24"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="race-eyebrow">{data.season.name}</p><h2 className="race-display mt-3 text-4xl sm:text-5xl">{t('standings')}</h2></div><Link href="/standings" className="inline-flex items-center gap-1 text-xs font-black uppercase italic tracking-[.1em] text-[var(--orange-soft)]">{t('viewStandings')} <ArrowUpRight className="h-4 w-4" /></Link></div><div className="race-panel overflow-hidden rounded-[1.5rem]">{rankings.length ? rankings.map((team, index) => <Link key={team.id} href={`/teams/${team.slug}`} className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b border-[var(--line)] px-4 py-4 last:border-0 hover:bg-white/[.035] sm:grid-cols-[4rem_1fr_auto]"><span className="race-display text-2xl text-[var(--ink-faint)]">{String(index + 1).padStart(2, '0')}</span><span className="flex min-w-0 items-center gap-3"><TeamLogo team={team} size="sm" /><span className="min-w-0"><span className="block truncate text-sm font-black uppercase italic group-hover:text-[var(--orange-soft)]">{team.name}</span><span className="text-[.62rem] font-bold uppercase tracking-[.1em] text-[var(--ink-faint)]">{team.conference}</span></span></span><span className="text-right"><span className="race-display block text-2xl">{team.wins}–{team.losses}</span><span className="text-[.58rem] font-black uppercase tracking-[.1em] text-[var(--ink-faint)]">{t('record')}</span></span></Link>) : <div className="p-10 text-center"><p className="font-black">No teams yet</p><p className="mt-2 text-sm text-[var(--ink-faint)]">Staff will create the league structure from Staff Control.</p></div>}</div></section>

      <section className="carbon-panel border-y border-[var(--line)]"><div className="site-shell scroll-reveal py-16 sm:py-24"><div className="mb-8 flex items-end justify-between gap-4"><div><p className="race-eyebrow">TOP THREE</p><h2 className="race-display mt-3 text-4xl sm:text-5xl">{t('leaders')}</h2></div><Link href="/stats" className="text-xs font-black uppercase italic tracking-[.1em] text-[var(--orange-soft)]">{common('viewAll')} →</Link></div>{leaders.length ? <div className="grid gap-4 md:grid-cols-3">{leaders.map((player, index) => { const team = data.teams.find((item) => item.id === player.teamId); return <Link key={player.id} href={`/players/${player.slug}`} className="race-panel group relative overflow-hidden rounded-[1.4rem] p-5"><span className="absolute right-4 top-3 race-display text-5xl text-white/5">0{index + 1}</span><p className="text-[.62rem] font-black uppercase tracking-[.13em] text-[var(--orange-soft)]">{t('points')}</p><p className="race-display mt-5 text-6xl">{player.stats.pointsPerGame.toFixed(1)}</p><p className="mt-7 text-lg font-black uppercase italic group-hover:text-[var(--orange-soft)]">{player.displayName}</p><p className="mt-1 text-xs text-[var(--ink-faint)]">{team?.name ?? 'Free Agent'}</p></Link>; })}</div> : <div className="race-panel rounded-[1.4rem] p-10 text-center"><p className="font-black">No statistics yet</p><p className="mt-2 text-sm text-[var(--ink-faint)]">Official leaders appear only after Staff confirms a completed game.</p></div>}</div></section>

      <section className="site-shell scroll-reveal py-16 sm:py-24"><div className="race-panel relative overflow-hidden rounded-[1.7rem] p-7 sm:p-10"><div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--orange)] opacity-15 blur-3xl" /><p className="race-eyebrow">{t('partners')}</p><h2 className="race-display mt-4 max-w-2xl text-4xl sm:text-6xl">{t('partners')}</h2><p className="mt-5 max-w-xl text-sm leading-7 text-[var(--ink-soft)]">{t('partnerBody')}</p><Link href="/partners" className="mt-7 inline-flex items-center gap-2 border-b-2 border-[var(--orange)] pb-2 text-xs font-black uppercase italic tracking-[.12em]">{t('becomePartner')} <Trophy className="h-4 w-4" /></Link></div></section>
    </>
  );
}

function Telemetry({ label, value }: { label: string; value: string | number }) { return <div className="px-4 py-5 first:pl-0"><span className="race-display block text-3xl">{value}</span><span className="mt-1 block text-[.55rem] font-black uppercase tracking-[.1em] text-[var(--ink-faint)]">{label}</span></div>; }
