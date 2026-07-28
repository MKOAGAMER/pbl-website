export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  number: number;
  position: string;
  height: string;
  weight: number;
  birthDate: string;
  hometown: string;
  college?: string;
  teamId: string;
  team?: Team;
  avatar?: string;
  isActive: boolean;
  yearsPro: number;
}

export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface PlayerStats {
  gamesPlayed: number;
  minutesPerGame: number;
  pointsPerGame: number;
  reboundsPerGame: number;
  assistsPerGame: number;
  stealsPerGame: number;
  blocksPerGame: number;
  turnoversPerGame: number;
  fieldGoalPercentage: number;
  threePointPercentage: number;
  freeThrowPercentage: number;
  plusMinus: number;
}

export interface StatLeader {
  rank: number;
  player: Player;
  team: Team;
  value: number;
  statType: 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'fg%' | '3p%';
}

export interface StatLeaderCardProps {
  leader: StatLeader;
  statLabel: string;
  statColor: string;
  className?: string;
}

export interface StatLeadersProps {
  leaders: StatLeader[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export interface PlayerSearchProps {
  players: Player[];
  onSelect?: (player: Player) => void;
  className?: string;
}