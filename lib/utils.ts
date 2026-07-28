import { clsx, type ClassValue } from 'clsx';
import type { Team } from './league-types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatGameDate(value: string, withYear = false) {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {}),
  }).format(new Date(value));
}

export function formatGameTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatPublishedDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function initials(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function winPercentage(wins: number, losses: number) {
  const total = wins + losses;
  return total === 0 ? 0 : wins / total;
}

type StandingTeam = Pick<Team, 'id' | 'name' | 'wins' | 'losses'>;

export function compareTeamsByStanding(a: StandingTeam, b: StandingTeam) {
  const percentageDifference = winPercentage(b.wins, b.losses) - winPercentage(a.wins, a.losses);
  if (percentageDifference !== 0) return percentageDifference;
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (a.losses !== b.losses) return a.losses - b.losses;

  const normalizedA = a.name.normalize('NFKD').toLocaleLowerCase('en-US');
  const normalizedB = b.name.normalize('NFKD').toLocaleLowerCase('en-US');
  if (normalizedA < normalizedB) return -1;
  if (normalizedA > normalizedB) return 1;
  if (a.name < b.name) return -1;
  if (a.name > b.name) return 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function rankTeamsByStanding<T extends StandingTeam>(teams: readonly T[]) {
  return [...teams].sort(compareTeamsByStanding);
}

export function normalizeStatus(value: unknown) {
  const status = String(value ?? 'scheduled').toLowerCase();
  if (status === 'upcoming') return 'scheduled';
  if (status === 'completed') return 'final';
  if (['scheduled', 'live', 'final', 'postponed', 'cancelled'].includes(status)) {
    return status as 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
  }
  return 'scheduled';
}
