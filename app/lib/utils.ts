import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...options,
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'LIVE':
      return 'bg-red-500';
    case 'FINAL':
      return 'bg-green-500';
    case 'UPCOMING':
      return 'bg-blue-500';
    case 'POSTPONED':
      return 'bg-yellow-500';
    case 'CANCELLED':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'LIVE':
      return 'LIVE';
    case 'FINAL':
      return 'FINAL';
    case 'UPCOMING':
      return 'UPCOMING';
    case 'POSTPONED':
      return 'POSTPONED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return status;
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function getStatColor(statKey: string): string {
  const colors: Record<string, string> = {
    pointsPerGame: '#f97316', // orange
    reboundsPerGame: '#06b6d4', // cyan
    assistsPerGame: '#a855f7', // violet
    stealsPerGame: '#22c55e', // emerald
    blocksPerGame: '#f472b6', // pink
    fieldGoalPct: '#eab308', // yellow
    threePointPct: '#ec4899', // pink
    freeThrowPct: '#3b82f6', // blue
  };
  return colors[statKey] || '#6366f1';
}

export function getStatLabel(statKey: string): string {
  const labels: Record<string, string> = {
    pointsPerGame: 'PPG',
    reboundsPerGame: 'RPG',
    assistsPerGame: 'APG',
    stealsPerGame: 'SPG',
    blocksPerGame: 'BPG',
    fieldGoalPct: 'FG%',
    threePointPct: '3P%',
    freeThrowPct: 'FT%',
  };
  return labels[statKey] || statKey;
}