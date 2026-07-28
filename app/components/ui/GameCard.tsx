import Link from 'next/link';
import { Clock3, MapPin, Radio } from 'lucide-react';
import type { Game, Team } from '@/lib/league-types';
import { cn, formatGameDate, formatGameTime } from '@/lib/utils';
import { TeamLogo } from './TeamLogo';

interface GameCardProps {
  game: Game;
  teams: Team[];
  className?: string;
  compact?: boolean;
}

const statusStyles = {
  scheduled: 'bg-blue-400/10 text-blue-300 border-blue-300/20',
  live: 'bg-red-400/10 text-red-300 border-red-300/20',
  final: 'bg-emerald-400/10 text-emerald-300 border-emerald-300/20',
  postponed: 'bg-amber-400/10 text-amber-300 border-amber-300/20',
  cancelled: 'bg-white/5 text-[var(--ink-faint)] border-[var(--line)]',
};

export function GameCard({ game, teams, className, compact = false }: GameCardProps) {
  const homeTeam = teams.find((team) => team.id === game.homeTeamId);
  const awayTeam = teams.find((team) => team.id === game.awayTeamId);

  if (!homeTeam || !awayTeam) return null;

  const hasScore = game.homeScore !== null && game.awayScore !== null;
  const homeWon = game.status === 'final' && hasScore && game.homeScore! > game.awayScore!;
  const awayWon = game.status === 'final' && hasScore && game.awayScore! > game.homeScore!;

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cn(
        'lift group block min-w-0 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5',
        compact ? 'shadow-none' : 'shadow-[var(--shadow)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">
          <span>Week {game.week}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--line-strong)]" />
          <span className="truncate">{formatGameDate(game.startsAt)}</span>
        </div>
        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.11em]', statusStyles[game.status])}>
          {game.status === 'live' && <span className="live-dot h-1.5 w-1.5 rounded-full bg-red-400" />}
          {game.status}
        </span>
      </div>

      <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamScore team={awayTeam} score={game.awayScore} winner={awayWon} align="left" />
        <div className="text-center">
          {hasScore ? (
            <span className="text-[0.65rem] font-black uppercase tracking-[0.15em] text-[var(--ink-faint)]">{game.status === 'live' ? 'Live' : 'Final'}</span>
          ) : (
            <>
              <span className="block text-lg font-black number-tabular">{formatGameTime(game.startsAt)}</span>
              <span className="text-[0.6rem] font-bold uppercase tracking-[0.13em] text-[var(--ink-faint)]">ICT</span>
            </>
          )}
        </div>
        <TeamScore team={homeTeam} score={game.homeScore} winner={homeWon} align="right" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-3 text-[0.68rem] font-medium text-[var(--ink-faint)]">
        <span className="flex min-w-0 items-center gap-1.5 truncate">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          {game.venue}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-[var(--ink-soft)] transition group-hover:text-[var(--orange-soft)]">
          {game.status === 'live' ? <Radio className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
          Match center
        </span>
      </div>
    </Link>
  );
}

function TeamScore({ team, score, winner, align }: { team: Team; score: number | null; winner: boolean; align: 'left' | 'right' }) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', align === 'right' && 'flex-row-reverse text-right')}>
      <TeamLogo team={team} size="md" />
      <div className="min-w-0">
        <span className="block truncate text-xs font-black uppercase tracking-[0.03em] sm:text-sm">{team.shortName}</span>
        <span className={cn('number-tabular mt-0.5 block text-2xl font-black tracking-[-0.06em]', winner ? 'text-[var(--orange-soft)]' : 'text-[var(--ink)]')}>
          {score ?? '—'}
        </span>
      </div>
    </div>
  );
}
