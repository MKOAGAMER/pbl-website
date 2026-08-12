export type TournamentStatus = 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
export type TournamentFormat = 'single_elimination' | 'double_elimination' | 'round_robin' | 'group_stage' | 'fiba';

export type TournamentTeam = {
  id: string;
  teamId: string;
  seed: number | null;
  groupName: string | null;
  status: 'registered' | 'active' | 'eliminated' | 'withdrawn';
};

export type TournamentMatch = {
  id: string;
  stage: 'group' | 'knockout' | null;
  groupName: string | null;
  bracketRound: 'quarter_final' | 'semi_final' | 'final' | null;
  bracketPosition: number | null;
  nextMatchId: string | null;
  nextMatchSide: 'home' | 'away' | null;
  roundLabel: string;
  matchNumber: number | null;
  scheduledAt: string | null;
  venue: string | null;
  status: 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
  streamUrl: string | null;
  notes: string | null;
};

export type Tournament = {
  id: string;
  seasonId: string | null;
  name: string;
  slug: string;
  format: TournamentFormat;
  status: TournamentStatus;
  description: string | null;
  logoUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  venue: string | null;
  isPublic: boolean;
  championTeamId: string | null;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
};
