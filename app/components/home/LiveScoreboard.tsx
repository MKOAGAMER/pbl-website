'use client';

import Link from 'next/link';
import { Radio, TimerReset, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Game, Team } from '@/lib/league-types';
import type { Tournament, TournamentMatch } from '@/lib/tournament-types';
import { TeamLogo } from '../ui/TeamLogo';

type TournamentScoreMatch = TournamentMatch & {
  tournamentId: string;
  tournamentName: string;
  tournamentSlug: string;
  tournamentStartsAt: string | null;
};

type ScoreboardCandidate = {
  id: string;
  type: 'league' | 'tournament';
  status: 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
  startsAt: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  href: string;
  context: string;
};

const MAX_VISIBLE_MATCHES = 4;

function tournamentMatches(tournaments: Tournament[]): TournamentScoreMatch[] {
  return tournaments.flatMap((tournament) => tournament.matches.map((match) => ({
    ...match,
    tournamentId: tournament.id,
    tournamentName: tournament.name,
    tournamentSlug: tournament.slug,
    tournamentStartsAt: tournament.startsAt,
  })));
}

export function LiveScoreboard({ games, teams, tournaments }: { games: Game[]; teams: Team[]; tournaments: Tournament[] }) {
  const [currentGames, setCurrentGames] = useState(games);
  const [currentTournamentMatches, setCurrentTournamentMatches] = useState(() => tournamentMatches(tournaments));
  const t = useTranslations('Home');
  const teamIds = useMemo(() => new Set(teams.map((team) => team.id)), [teams]);

  const candidates = useMemo<ScoreboardCandidate[]>(() => [
    ...currentGames.map((game) => ({
      id: game.id,
      type: 'league' as const,
      status: game.status,
      startsAt: game.startsAt,
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      homeScore: game.homeScore,
      awayScore: game.awayScore,
      href: `/games/${game.slug}`,
      context: `WEEK ${game.week}`,
    })),
    ...currentTournamentMatches.flatMap((match): ScoreboardCandidate[] => (
      match.homeTeamId && match.awayTeamId ? [{
        id: match.id,
        type: 'tournament',
        status: match.status,
        startsAt: match.scheduledAt ?? match.tournamentStartsAt ?? '',
        homeTeamId: match.homeTeamId,
        awayTeamId: match.awayTeamId,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        href: `/tournaments#${match.tournamentSlug}`,
        context: `${match.tournamentName} · ${match.roundLabel}`,
      }] : []
    )),
  ], [currentGames, currentTournamentMatches]);

  const scoreboard = useMemo(() => {
    const statusOrder: Record<ScoreboardCandidate['status'], number> = { live: 0, scheduled: 1, final: 2, postponed: 3, cancelled: 4 };
    const sorted = candidates.filter((candidate) => (
      teamIds.has(candidate.homeTeamId) && teamIds.has(candidate.awayTeamId)
    )).sort((a, b) => (
      statusOrder[a.status] - statusOrder[b.status]
      || Number(Boolean(b.type === 'tournament')) - Number(Boolean(a.type === 'tournament'))
      || (a.status === 'final' ? dateValue(b.startsAt) - dateValue(a.startsAt) : dateValue(a.startsAt) - dateValue(b.startsAt))
    ));
    return { total: sorted.length, games: sorted.slice(0, MAX_VISIBLE_MATCHES) };
  }, [candidates, teamIds]);
  const visibleGames = scoreboard.games;

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel('pbal-live-scoreboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
        const record = payload.new as { id?: string; status?: Game['status']; home_score?: number | null; away_score?: number | null };
        if (!record.id) return;
        setCurrentGames((existing) => existing.map((item) => item.id === record.id ? {
          ...item,
          status: record.status ?? item.status,
          homeScore: record.home_score ?? null,
          awayScore: record.away_score ?? null,
        } : item));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches' }, (payload) => {
        const record = payload.new as {
          id?: string;
          tournament_id?: string;
          round_label?: string;
          scheduled_at?: string | null;
          status?: TournamentMatch['status'];
          home_team_id?: string | null;
          away_team_id?: string | null;
          home_score?: number | null;
          away_score?: number | null;
        };
        if (!record.id) return;
        const recordId = record.id;
        setCurrentTournamentMatches((existing) => {
          const current = existing.find((item) => item.id === recordId);
          if (current) return existing.map((item) => item.id === recordId ? {
            ...item,
            roundLabel: record.round_label ?? item.roundLabel,
            scheduledAt: record.scheduled_at === undefined ? item.scheduledAt : record.scheduled_at,
            status: record.status ?? item.status,
            homeTeamId: record.home_team_id === undefined ? item.homeTeamId : record.home_team_id,
            awayTeamId: record.away_team_id === undefined ? item.awayTeamId : record.away_team_id,
            homeScore: record.home_score === undefined ? item.homeScore : record.home_score,
            awayScore: record.away_score === undefined ? item.awayScore : record.away_score,
          } : item);

          const tournament = tournaments.find((item) => item.id === record.tournament_id);
          if (!tournament || !record.status) return existing;
          return [...existing, {
            id: recordId,
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            tournamentSlug: tournament.slug,
            tournamentStartsAt: tournament.startsAt,
            roundLabel: record.round_label ?? 'Round 1',
            matchNumber: null,
            scheduledAt: record.scheduled_at ?? null,
            venue: null,
            status: record.status,
            homeTeamId: record.home_team_id ?? null,
            awayTeamId: record.away_team_id ?? null,
            homeScore: record.home_score ?? null,
            awayScore: record.away_score ?? null,
            winnerTeamId: null,
            streamUrl: null,
            notes: null,
          }];
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [tournaments]);

  if (!visibleGames.length) return <div className="race-panel rounded-[1.5rem] p-7 text-center text-sm text-[var(--ink-soft)]">{t('noLive')}</div>;

  return (
    <section aria-label="All matches">
      <div className="mb-3 flex items-center justify-between px-1 text-[0.65rem] font-black uppercase italic tracking-[0.13em] text-[var(--ink-faint)]">
        <span>All matches</span>
        <span>Showing {visibleGames.length} of {scoreboard.total}</span>
      </div>
      <div className="max-h-[44rem] space-y-3 overflow-y-auto pr-1 lg:max-h-[calc(100vh-8rem)]">
        {visibleGames.map((game) => {
          const away = teams.find((team) => team.id === game.awayTeamId);
          const home = teams.find((team) => team.id === game.homeTeamId);
          if (!away || !home) return null;
          const isLive = game.status === 'live';
          const isFinal = game.status === 'final';
          const isTournament = game.type === 'tournament';
          const statusLabel = isLive ? t('liveNow') : game.status === 'scheduled' ? t('nextUp') : isFinal ? t('final') : game.status;
          return (
            <Link key={`${game.type}-${game.id}`} href={game.href} className="race-panel group block overflow-hidden rounded-[1.4rem] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] pb-3 text-[0.6rem] font-black uppercase italic tracking-[0.11em]">
                <span className={isLive ? 'flex shrink-0 items-center gap-2 text-red-300' : 'flex shrink-0 items-center gap-2 text-[var(--orange-soft)]'}>
                  {isLive ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : isTournament ? <Trophy className="h-3.5 w-3.5" /> : <TimerReset className="h-3.5 w-3.5" />}
                  {isTournament && <span>Tournament ·</span>} {statusLabel}
                </span>
                <span className="truncate text-right text-[var(--ink-faint)]">{game.context}</span>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-5">
                <ClubScore team={away} score={game.awayScore} align="left" />
                <span className="race-display text-xl text-[var(--orange)]">{isLive || isFinal ? '–' : t('vs')}</span>
                <ClubScore team={home} score={game.homeScore} align="right" />
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3 text-[0.68rem] text-[var(--ink-faint)]">
                <span>{isLive ? (isTournament ? 'Live tournament scoreboard' : t('liveScoreboard')) : isFinal ? 'Final score' : game.status === 'scheduled' ? formatStart(game.startsAt) : statusLabel}</span>
                <span className="shrink-0 font-black uppercase italic text-[var(--orange-soft)] group-hover:text-[var(--ink)]">{isTournament ? 'View tournament' : t('viewMatch')} →</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function dateValue(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function formatStart(value: string) {
  const timestamp = dateValue(value);
  return Number.isFinite(timestamp)
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp))
    : 'Schedule pending';
}

function ClubScore({ team, score, align }: { team: Team; score: number | null; align: 'left' | 'right' }) {
  return <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}><div className={`flex items-center gap-3 ${align === 'right' ? 'justify-end' : ''}`}><TeamLogo team={team} size="sm" /><span className="truncate text-sm font-black uppercase italic">{team.abbreviation}</span></div><p className="race-display mt-3 text-4xl sm:text-5xl">{score ?? '—'}</p></div>;
}
