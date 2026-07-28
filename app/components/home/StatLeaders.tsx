'use client';

import { cn, getStatColor, getStatLabel } from '../../lib/utils';
import { StatLeaderCard } from '../ui/StatLeaderCard';
import { getStatLeaders } from '../../lib/data/players';

interface StatLeadersProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

const statKeys = [
  'pointsPerGame',
  'reboundsPerGame',
  'assistsPerGame',
  'stealsPerGame',
  'fieldGoalPct',
  'threePointPct',
] as const;

export function StatLeaders({ title = 'Stat Leaders', subtitle = 'Preseason 2', className }: StatLeadersProps) {
  return (
    <section className={cn('rounded-2xl border border-white/10 bg-[var(--bg-secondary)] p-4 shadow-lg', className)}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--text-primary)]">{title}</h2>
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">{subtitle}</span>
      </div>
      <div className="space-y-3">
        {statKeys.map((statKey) => {
          const leaders = getStatLeaders(statKey, 5);
          if (leaders.length === 0) return null;

          return (
            <StatLeaderCard
              key={statKey}
              leader={leaders[0]}
              statLabel={getStatLabel(statKey)}
              statColor={getStatColor(statKey)}
              rank={1}
            />
          );
        })}
      </div>
    </section>
  );
}