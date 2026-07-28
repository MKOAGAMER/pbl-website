'use client';

import Link from 'next/link';
import { Calendar, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GameCard } from '../ui/GameCard';
import type { Game } from '../../types/game';

interface UpcomingMatchupsProps {
  games: Game[];
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  limit?: number;
  className?: string;
}

export function UpcomingMatchups({
  games,
  title = 'Upcoming Matchups',
  subtitle,
  showViewAll = true,
  viewAllHref = '/games',
  limit = 5,
  className,
}: UpcomingMatchupsProps) {
  const upcomingGames = games
    .filter((game) => game.status === 'UPCOMING')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, limit);

  if (upcomingGames.length === 0) {
    return (
      <section className={cn('rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-4 shadow-lg', className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-eba-blue" />
            {title}
          </h2>
          {showViewAll && (
            <Link
              href={viewAllHref}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              View Schedule <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-[var(--bg-primary)] p-6 text-center text-sm text-[var(--text-secondary)]">
          No upcoming games yet
        </div>
      </section>
    );
  }

  return (
    <section className={cn('rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-4 shadow-lg', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
          <Calendar className="w-4 h-4 text-eba-blue" />
          {title}
        </h2>
        {subtitle && <span className="text-[11px] font-medium text-[var(--text-secondary)]">{subtitle}</span>}
        {showViewAll && (
          <Link
            href={viewAllHref}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            View Schedule <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {upcomingGames.map((game) => (
          <GameCard key={game.id} game={game} variant="upcoming" />
        ))}
      </div>
    </section>
  );
}