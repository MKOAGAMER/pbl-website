import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlayerAvatarProps = {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  primaryColor?: string;
  secondaryColor?: string;
};

const sizes = {
  sm: 'h-9 w-9 rounded-xl [&_svg]:h-4 [&_svg]:w-4',
  md: 'h-12 w-12 rounded-2xl [&_svg]:h-5 [&_svg]:w-5',
  lg: 'h-16 w-16 rounded-[1.25rem] [&_svg]:h-7 [&_svg]:w-7',
  xl: 'h-28 w-28 rounded-[2rem] sm:h-36 sm:w-36 sm:rounded-[2.35rem] [&_svg]:h-10 [&_svg]:w-10',
};

export function PlayerAvatar({
  src,
  name,
  size = 'md',
  className,
  primaryColor = '#ff6b22',
  secondaryColor = '#ffb067',
}: PlayerAvatarProps) {
  return (
    <span
      className={cn(
        'relative grid shrink-0 place-items-center overflow-hidden border border-white/15 text-white shadow-lg',
        sizes[size],
        className,
      )}
      style={{ background: `linear-gradient(145deg, ${primaryColor}, ${secondaryColor})` }}
    >
      {src ? (
        // Roblox and staff-managed images can live on external CDN hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`${name} profile`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <UserRound aria-hidden="true" />
      )}
    </span>
  );
}
