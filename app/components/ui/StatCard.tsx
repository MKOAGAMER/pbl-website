import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  value: number | string;
  label: string;
  detail?: string;
  icon?: LucideIcon;
  accent?: 'orange' | 'blue' | 'mint';
  className?: string;
}

const accentClasses = {
  orange: 'text-[var(--orange-soft)] bg-orange-400/10',
  blue: 'text-blue-300 bg-blue-400/10',
  mint: 'text-emerald-300 bg-emerald-400/10',
};

export function StatCard({ value, label, detail, icon: Icon, accent = 'orange', className }: StatCardProps) {
  return (
    <div className={cn('rounded-[1.35rem] border border-[var(--line)] bg-[var(--surface)] p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="number-tabular text-3xl font-black tracking-[-0.06em] sm:text-4xl">{value}</p>
          <p className="mt-1 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--ink-soft)]">{label}</p>
          {detail && <p className="mt-2 text-xs text-[var(--ink-faint)]">{detail}</p>}
        </div>
        {Icon && (
          <span className={cn('grid h-10 w-10 place-items-center rounded-xl', accentClasses[accent])}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}

