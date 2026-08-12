import { Award, Medal, Trophy } from 'lucide-react';
import type { Accolade } from '@/lib/league-types';

export function MedalBadges({ accolades, className = '', size = 'md' }: { accolades: Accolade[]; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  if (!accolades.length) return null;
  const badgeSize = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const iconSize = size === 'lg' ? 'h-5 w-5' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return <span className={`flex flex-wrap items-center gap-1.5 ${className}`}>{accolades.map((item) => {
    const Icon = item.type === 'championship' ? Trophy : item.type === 'record' ? Award : Medal;
    const color = item.color || '#f59e0b';
    return <span key={item.id} className="group/medal relative z-20 inline-flex">
      <span className={`grid ${badgeSize} place-items-center rounded-full border-2 shadow-lg ring-2 ring-[var(--page)] transition group-hover/medal:-translate-y-0.5`} style={{ color, borderColor: color, backgroundColor: `${color}24`, boxShadow: `0 8px 24px ${color}25` }} title={`${item.title} · ${item.season}`}><Icon className={iconSize} /></span>
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-0 z-50 mb-3 w-max max-w-64 rounded-xl border border-[var(--line-strong)] bg-[var(--surface-raised)] px-3 py-2 text-left opacity-0 shadow-2xl transition group-hover/medal:opacity-100">
        <span className="block text-[0.55rem] font-black uppercase tracking-[0.1em]" style={{ color }}>{item.category} · {item.competitionType === 'tournament' ? 'Tournament' : 'League'}</span>
        <span className="mt-1 block text-xs font-black text-[var(--ink)]">{item.title}</span>
        <span className="mt-0.5 block text-[0.62rem] text-[var(--ink-soft)]">{item.season}</span>
        {item.description && <span className="mt-1 block text-[0.62rem] leading-4 text-[var(--ink-faint)]">{item.description}</span>}
      </span>
    </span>;
  })}</span>;
}
