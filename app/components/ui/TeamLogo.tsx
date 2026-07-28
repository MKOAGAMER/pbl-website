import type { Team } from '@/lib/league-types';
import { cn } from '@/lib/utils';

interface TeamLogoProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'h-9 w-9 rounded-xl text-[0.62rem]',
  md: 'h-12 w-12 rounded-2xl text-xs',
  lg: 'h-16 w-16 rounded-[1.35rem] text-sm',
  xl: 'h-24 w-24 rounded-[1.8rem] text-xl',
};

export function TeamLogo({ team, size = 'md', className }: TeamLogoProps) {
  return (
    <span
      className={cn(
        'relative isolate grid shrink-0 place-items-center overflow-hidden border border-white/20 font-black tracking-[-0.04em] text-white shadow-lg',
        sizes[size],
        className,
      )}
      style={{
        background: `linear-gradient(145deg, ${team.primaryColor}, ${team.secondaryColor})`,
        boxShadow: `0 12px 30px color-mix(in srgb, ${team.primaryColor} 26%, transparent)`,
      }}
      title={team.name}
      aria-label={`${team.name} logo`}
    >
      {team.logoUrl && (
        // The URL is an administrator-managed Supabase Storage asset. Keeping
        // the native element avoids coupling deployments to one project host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.logoUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span className="absolute -right-3 -top-4 h-10 w-10 rounded-full border border-white/25" />
      <span className="absolute -bottom-5 -left-4 h-12 w-12 rounded-full bg-black/15" />
      {!team.logoUrl && <span className="relative">{team.abbreviation}</span>}
    </span>
  );
}
