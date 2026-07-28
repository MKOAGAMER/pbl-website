'use client';

import Link from 'next/link';
import { Trophy, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { GameCard } from '../ui/GameCard';
import type { Game } from '../../types/game';

interface LatestResultsProps {
  games: Game[];
  title?: string;
  subtitle?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  limit?: number;
  className?: string;
}

export function LatestResults({
  games,
  title = 'Latest Results',
  subtitle,
  showViewAll = true,
  viewAllHref = '/games',
  limit = 5,
  className,
}: LatestResultsProps) {
  const recentGames = games
    .filter((game) => game.status === 'FINAL')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  if (recentGames.length === 0) {
    return (
      <section className={cn('rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-4 shadow-lg', className)}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            {title}
          </h2>
          {showViewAll && (
            <Link
              href={viewAllHref}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-[var(--bg-primary)] p-6 text-center text-sm text-[var(--text-secondary)]">
          No recent games
        </div>
      </section>
    );
  }

  return (
    <section className={cn('rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-4 shadow-lg', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          {title}
        </h2>
        {subtitle && <span className="text-[11px] font-medium text-[var(--text-secondary)]">{subtitle}</span>}
        {showViewAll && (
          <Link
            href={viewAllHref}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            View All <ChevronRight className="w-3 h-3" />
          </Link>
        )}
      </div>
      <div className="space-y-3">
        {recentGames.map((game) => (
          <GameCard key={game.id} game={game} variant="recent" />
        ))}
      </div>
    </section>
  );
}