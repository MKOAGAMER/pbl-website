export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  city?: string;
  conference?: string;
  division?: string;
}

export interface Game {
  id: string;
  league: 'PBL' | 'Elevate';
  seasonId: string;
  week?: number;
  date: string;
  status: 'UPCOMING' | 'LIVE' | 'FINAL' | 'POSTPONED' | 'CANCELLED';
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  homeScoreQ1?: number;
  homeScoreQ2?: number;
  homeScoreQ3?: number;
  homeScoreQ4?: number;
  awayScoreQ1?: number;
  awayScoreQ2?: number;
  awayScoreQ3?: number;
  awayScoreQ4?: number;
  venue?: string;
  broadcast?: string;
  gameUrl: string;
  boxScoreUrl?: string;
  highlightsUrl?: string;
}

export interface GameCardProps {
  game: Game;
  variant?: 'upcoming' | 'recent' | 'live';
  showLeagueBadge?: boolean;
  className?: string;
}

export interface UpcomingMatchupsProps {
  games: Game[];
  title?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  className?: string;
}

export interface LatestResultsProps {
  games: Game[];
  title?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
  className?: string;
}

export interface GameStatusBadgeProps {
  status: Game['status'];
  className?: string;
}

export interface TeamLogoProps {
  team: Team;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
}