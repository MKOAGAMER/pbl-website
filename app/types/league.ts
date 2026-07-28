export interface LeagueStats {
  teams: number;
  players: number;
  games: number;
  upcomingGames: number;
  completedGames: number;
  liveGames: number;
}

export interface StatCardProps {
  value: number | string;
  label: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export interface LeagueStatsProps {
  stats: LeagueStats;
  className?: string;
}

export interface Season {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  playoffsStartDate?: string;
}

export interface League {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  currentSeason: Season;
  seasons: Season[];
}