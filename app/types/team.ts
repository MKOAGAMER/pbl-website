export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  wins: number;
  losses: number;
  winPct: number;
  conference?: string;
  division?: string;
}

export interface TeamStanding extends Team {
  gamesBehind: number;
  streak: string;
  lastTen: string;
  homeRecord: string;
  awayRecord: string;
  conferenceRecord: string;
  divisionRecord: string;
}

export interface TeamLogoProps {
  team: Team | Pick<Team, 'id' | 'name' | 'logo' | 'abbreviation'>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  fallback?: React.ReactNode;
}