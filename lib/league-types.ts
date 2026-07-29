export type Conference = 'East' | 'West';

export type GameStatus =
  | 'scheduled'
  | 'live'
  | 'final'
  | 'postponed'
  | 'cancelled';

export interface Season {
  id: string;
  slug: string;
  name: string;
  isCurrent: boolean;
  startsOn: string;
  endsOn: string;
}

export interface Team {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  abbreviation: string;
  city: string;
  conference: Conference;
  primaryColor: string;
  secondaryColor: string;
  wins: number;
  losses: number;
  logoUrl?: string | null;
  description: string;
}

export interface PlayerStats {
  gamesPlayed: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  fieldGoalPct: number;
  threePointPct: number;
}

export interface Player {
  id: string;
  slug: string;
  displayName: string;
  robloxUsername: string;
  jerseyNumber: number;
  position: string;
  teamId: string;
  avatarUrl?: string | null;
  bio: string;
  isActive: boolean;
  stats: PlayerStats;
}

export interface Game {
  id: string;
  slug: string;
  seasonId: string;
  week: number;
  startsAt: string;
  status: GameStatus;
  venue: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  streamUrl?: string | null;
  notes?: string | null;
}

export interface GameStatLine {
  playerId: string;
  playerSlug: string;
  displayName: string;
  teamId: string;
  minutes: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
}

export interface NewsPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  publishedAt: string;
  authorName: string;
  featured: boolean;
  coverUrl?: string | null;
  accent: string;
}

export interface Accolade {
  id: string;
  season: string;
  title: string;
  recipient: string;
  teamId?: string | null;
  description: string;
  type: 'award' | 'record';
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  robloxUsername?: string | null;
  avatarUrl?: string | null;
}

export interface LeagueLink {
  id: string;
  label: string;
  description: string;
  href: string;
  kind: 'community' | 'game' | 'social' | 'resource';
}

export interface SiteData {
  source: 'supabase' | 'unavailable';
  season: Season;
  seasons: Season[];
  teams: Team[];
  players: Player[];
  games: Game[];
  news: NewsPost[];
  accolades: Accolade[];
  staff: StaffMember[];
  links: LeagueLink[];
}
