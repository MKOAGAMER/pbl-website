import type { LeagueStats, Season, League } from '@/types/league';

export const mockLeagueStats: LeagueStats = {
  teams: 24,
  players: 234,
  games: 33,
  upcomingGames: 8,
  completedGames: 25,
  liveGames: 0,
};

export const mockSeasons: Season[] = [
  {
    id: 'season-2026',
    name: '2026 Season',
    year: 2026,
    isActive: true,
    startDate: '2026-10-22',
    endDate: '2027-04-10',
    playoffsStartDate: '2027-04-15',
  },
  {
    id: 'season-2025',
    name: '2025 Season',
    year: 2025,
    isActive: false,
    startDate: '2025-10-24',
    endDate: '2026-04-12',
    playoffsStartDate: '2026-04-17',
  },
  {
    id: 'season-2024',
    name: '2024 Season',
    year: 2024,
    isActive: false,
    startDate: '2024-10-26',
    endDate: '2025-04-14',
    playoffsStartDate: '2025-04-19',
  },
];

export const mockLeagues: League[] = [
  {
    id: 'pbl',
    name: 'Practical Basketball League',
    abbreviation: 'PBL',
    logo: '/logo.png',
    primaryColor: '#00A8E8',
    secondaryColor: '#000000',
    currentSeason: mockSeasons[0],
    seasons: mockSeasons,
  },
  {
    id: 'elevate',
    name: 'Elevate Basketball League',
    abbreviation: 'Elevate',
    logo: '/logo-elevate.png',
    primaryColor: '#FF6B00',
    secondaryColor: '#000000',
    currentSeason: mockSeasons[0],
    seasons: mockSeasons,
  },
];

export const getLeagueStats = (): LeagueStats => {
  return mockLeagueStats;
};

export const getCurrentSeason = (): Season => {
  return mockSeasons.find((s) => s.isActive) || mockSeasons[0];
};

export const getLeagueById = (id: string): League | undefined => {
  return mockLeagues.find((league) => league.id === id);
};

export const getAllLeagues = (): League[] => {
  return mockLeagues;
};