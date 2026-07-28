'use client';

import { Users, Calendar, Trophy, Clock } from 'lucide-react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import { StatCard } from '../ui/StatCard';
import type { LeagueStats } from '../../types/league';

interface LeagueStatsProps {
  stats: LeagueStats;
  className?: string;
}

export function LeagueStats({ stats, className }: LeagueStatsProps) {
  const statItems = [
    { value: stats.teams, label: 'Teams', icon: Users, color: 'primary' as const, href: '/teams' },
    { value: stats.players, label: 'Players', icon: Users, color: 'primary' as const, href: '/players' },
    { value: stats.games, label: 'Games', icon: Trophy, color: 'primary' as const, href: '/games' },
    { value: stats.upcomingGames, label: 'Upcoming Games', icon: Clock, color: 'warning' as const, href: '/games' },
  ];

  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item, index) => (
          <StatCard
            key={item.label}
            value={item.value}
            label={item.label}
            icon={<item.icon className="h-5 w-5" />}
            color={item.color}
            onClick={() => item.href && (window.location.href = item.href)}
          />
        ))}
      </div>

      <Link
        href="/games"
        className="block text-center py-3 px-4 bg-eba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-sm"
      >
        View Full Schedule
      </Link>
    </div>
  );
}