import Link from 'next/link';
import type { Player, Team } from '@/lib/league-types';
import { initials } from '@/lib/utils';
import { TeamLogo } from './TeamLogo';

interface StatLeaderCardProps {
  player: Player;
  team: Team;
  rank: number;
  label: string;
  value: string | number;
}

export function StatLeaderCard({ player, team, rank, label, value }: StatLeaderCardProps) {
  return (
    <Link href={`/players/${player.slug}`} className="lift grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-soft)] text-xs font-black text-[var(--ink-soft)]">
        {rank === 1 ? initials(player.displayName) : `#${rank}`}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-black">{player.displayName}</span>
        <span className="mt-1 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--ink-faint)]">
          <TeamLogo team={team} size="sm" className="!h-4 !w-4 !rounded-md !text-[0.35rem]" />
          {team.abbreviation} · {player.position}
        </span>
      </span>
      <span className="text-right">
        <span className="number-tabular block text-xl font-black tracking-[-0.05em] text-[var(--orange-soft)]">{value}</span>
        <span className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span>
      </span>
    </Link>
  );
}

