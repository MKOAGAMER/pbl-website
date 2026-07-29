'use client';

import Link from 'next/link';
import { Radio, TimerReset } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Game, Team } from '@/lib/league-types';
import { TeamLogo } from '../ui/TeamLogo';

export function LiveScoreboard({ games, teams }: { games: Game[]; teams: Team[] }) {
  const [currentGames, setCurrentGames] = useState(games);
  const t = useTranslations('Home');
  const liveGames = useMemo(() => currentGames.filter((game) => game.status === 'live'), [currentGames]);
  const fallback = useMemo(() => currentGames.filter((game) => game.status === 'scheduled').sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0], [currentGames]);
  const game = liveGames[0] ?? fallback;

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase.channel('pbal-live-scoreboard').on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
      const record = payload.new as { id?: string; status?: Game['status']; home_score?: number | null; away_score?: number | null };
      if (!record.id) return;
      setCurrentGames((existing) => existing.map((item) => item.id === record.id ? { ...item, status: record.status ?? item.status, homeScore: record.home_score ?? null, awayScore: record.away_score ?? null } : item));
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, []);

  if (!game) return <div className="race-panel rounded-[1.5rem] p-7 text-center text-sm text-[var(--ink-soft)]">{t('noLive')}</div>;
  const away = teams.find((team) => team.id === game.awayTeamId);
  const home = teams.find((team) => team.id === game.homeTeamId);
  if (!away || !home) return null;
  const isLive = game.status === 'live';

  return (
    <Link href={`/games/${game.slug}`} className="race-panel group block overflow-hidden rounded-[1.6rem] p-5 sm:p-7">
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-4 text-[0.65rem] font-black uppercase italic tracking-[0.13em]">
        <span className={isLive ? 'flex items-center gap-2 text-red-300' : 'flex items-center gap-2 text-[var(--orange-soft)]'}>{isLive ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : <TimerReset className="h-3.5 w-3.5" />}{isLive ? t('liveNow') : t('nextUp')}</span>
        <span className="text-[var(--ink-faint)]">WEEK {game.week}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-7">
        <ClubScore team={away} score={game.awayScore} align="left" />
        <span className="race-display text-2xl text-[var(--orange)]">{isLive || game.status === 'final' ? '—' : t('vs')}</span>
        <ClubScore team={home} score={game.homeScore} align="right" />
      </div>
      <div className="flex items-center justify-between border-t border-[var(--line)] pt-4 text-xs text-[var(--ink-faint)]"><span>{isLive ? t('liveScoreboard') : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(game.startsAt))}</span><span className="font-black uppercase italic text-[var(--orange-soft)] group-hover:text-[var(--ink)]">{t('viewMatch')} →</span></div>
    </Link>
  );
}

function ClubScore({ team, score, align }: { team: Team; score: number | null; align: 'left' | 'right' }) {
  return <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}><div className={`flex items-center gap-3 ${align === 'right' ? 'justify-end' : ''}`}><TeamLogo team={team} size="sm" /><span className="truncate text-sm font-black uppercase italic sm:text-base">{team.abbreviation}</span></div><p className="race-display mt-4 text-5xl sm:text-6xl">{score ?? '—'}</p></div>;
}

