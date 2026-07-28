import type { Game, Team } from '@/types/game';
import type { Team as TeamType } from '@/types/team';

const mockTeams: Record<string, TeamType> = {
  'phi': { id: 'phi', name: 'Philadelphia Glory', abbreviation: 'PHI', logo: '/teams/phi.png', primaryColor: '#006BB6', secondaryColor: '#EF3E42', wins: 12, losses: 3, winPct: 0.800, conference: 'East', division: 'Atlantic' },
  'tor': { id: 'tor', name: 'Toronto Terror', abbreviation: 'TOR', logo: '/teams/tor.png', primaryColor: '#CE1141', secondaryColor: '#000000', wins: 10, losses: 5, winPct: 0.667, conference: 'East', division: 'Atlantic' },
  'por': { id: 'por', name: 'Portland Vipers', abbreviation: 'POR', logo: '/teams/por.png', primaryColor: '#E03A3E', secondaryColor: '#000000', wins: 9, losses: 6, winPct: 0.600, conference: 'West', division: 'Pacific' },
  'pho': { id: 'pho', name: 'Phoenix Power', abbreviation: 'PHO', logo: '/teams/pho.png', primaryColor: '#1D1160', secondaryColor: '#E56020', wins: 11, losses: 4, winPct: 0.733, conference: 'West', division: 'Pacific' },
  'sac': { id: 'sac', name: 'Sacramento Rage', abbreviation: 'SAC', logo: '/teams/sac.png', primaryColor: '#5A2D81', secondaryColor: '#63727A', wins: 8, losses: 7, winPct: 0.533, conference: 'West', division: 'Pacific' },
  'nas': { id: 'nas', name: 'Nashville Anthem', abbreviation: 'NAS', logo: '/teams/nas.png', primaryColor: '#0C2340', secondaryColor: '#FFB81C', wins: 7, losses: 8, winPct: 0.467, conference: 'East', division: 'Central' },
  'hou': { id: 'hou', name: 'Houston Hustle', abbreviation: 'HOU', logo: '/teams/hou.png', primaryColor: '#CE1141', secondaryColor: '#000000', wins: 10, losses: 5, winPct: 0.667, conference: 'West', division: 'Southwest' },
  'chi': { id: 'chi', name: 'Chicago Cyclones', abbreviation: 'CHI', logo: '/teams/chi.png', primaryColor: '#CE1141', secondaryColor: '#000000', wins: 9, losses: 6, winPct: 0.600, conference: 'East', division: 'Central' },
  'nyk': { id: 'nyk', name: 'New York Knights', abbreviation: 'NYK', logo: '/teams/nyk.png', primaryColor: '#006BB6', secondaryColor: '#F58426', wins: 8, losses: 7, winPct: 0.533, conference: 'East', division: 'Atlantic' },
  'bos': { id: 'bos', name: 'Boston Blaze', abbreviation: 'BOS', logo: '/teams/bos.png', primaryColor: '#007A33', secondaryColor: '#BA9653', wins: 11, losses: 4, winPct: 0.733, conference: 'East', division: 'Atlantic' },
  'lal': { id: 'lal', name: 'Los Angeles Legends', abbreviation: 'LAL', logo: '/teams/lal.png', primaryColor: '#552583', secondaryColor: '#FDB927', wins: 12, losses: 3, winPct: 0.800, conference: 'West', division: 'Pacific' },
  'gsw': { id: 'gsw', name: 'Golden State Guardians', abbreviation: 'GSW', logo: '/teams/gsw.png', primaryColor: '#1D428A', secondaryColor: '#FFC72C', wins: 9, losses: 6, winPct: 0.600, conference: 'West', division: 'Pacific' },
  'mia': { id: 'mia', name: 'Miami Magic', abbreviation: 'MIA', logo: '/teams/mia.png', primaryColor: '#98002E', secondaryColor: '#F9A01B', wins: 7, losses: 8, winPct: 0.467, conference: 'East', division: 'Southeast' },
  'dal': { id: 'dal', name: 'Dallas Defenders', abbreviation: 'DAL', logo: '/teams/dal.png', primaryColor: '#00538C', secondaryColor: '#002B5E', wins: 8, losses: 7, winPct: 0.533, conference: 'West', division: 'Southwest' },
  'den': { id: 'den', name: 'Denver Dynamos', abbreviation: 'DEN', logo: '/teams/den.png', primaryColor: '#0E2240', secondaryColor: '#FEC524', wins: 10, losses: 5, winPct: 0.667, conference: 'West', division: 'Northwest' },
  'uta': { id: 'uta', name: 'Utah United', abbreviation: 'UTA', logo: '/teams/uta.png', primaryColor: '#002B5C', secondaryColor: '#00471B', wins: 6, losses: 9, winPct: 0.400, conference: 'West', division: 'Northwest' },
  'okc': { id: 'okc', name: 'Oklahoma City Outlaws', abbreviation: 'OKC', logo: '/teams/okc.png', primaryColor: '#007AC1', secondaryColor: '#EF3B24', wins: 9, losses: 6, winPct: 0.600, conference: 'West', division: 'Northwest' },
  'min': { id: 'min', name: 'Minnesota Mammoths', abbreviation: 'MIN', logo: '/teams/min.png', primaryColor: '#0C2340', secondaryColor: '#236192', wins: 7, losses: 8, winPct: 0.467, conference: 'West', division: 'Northwest' },
  'det': { id: 'det', name: 'Detroit Destroyers', abbreviation: 'DET', logo: '/teams/det.png', primaryColor: '#C8102E', secondaryColor: '#1D428A', wins: 5, losses: 10, winPct: 0.333, conference: 'East', division: 'Central' },
  'cle': { id: 'cle', name: 'Cleveland Crushers', abbreviation: 'CLE', logo: '/teams/cle.png', primaryColor: '#860038', secondaryColor: '#FDBB30', wins: 6, losses: 9, winPct: 0.400, conference: 'East', division: 'Central' },
  'ind': { id: 'ind', name: 'Indiana Invaders', abbreviation: 'IND', logo: '/teams/ind.png', primaryColor: '#002D62', secondaryColor: '#FDBB30', wins: 8, losses: 7, winPct: 0.533, conference: 'East', division: 'Central' },
  'mil': { id: 'mil', name: 'Milwaukee Maulers', abbreviation: 'MIL', logo: '/teams/mil.png', primaryColor: '#00471B', secondaryColor: '#EEE1C6', wins: 9, losses: 6, winPct: 0.600, conference: 'East', division: 'Central' },
  'atl': { id: 'atl', name: 'Atlanta Apex', abbreviation: 'ATL', logo: '/teams/atl.png', primaryColor: '#E03A3E', secondaryColor: '#C1D32F', wins: 6, losses: 9, winPct: 0.400, conference: 'East', division: 'Southeast' },
  'orl': { id: 'orl', name: 'Orlando Outlaws', abbreviation: 'ORL', logo: '/teams/orl.png', primaryColor: '#0077C0', secondaryColor: '#C4CED4', wins: 5, losses: 10, winPct: 0.333, conference: 'East', division: 'Southeast' },
  'wsh': { id: 'wsh', name: 'Washington Warriors', abbreviation: 'WSH', logo: '/teams/wsh.png', primaryColor: '#002B5C', secondaryColor: '#C8102E', wins: 7, losses: 8, winPct: 0.467, conference: 'East', division: 'Southeast' },
  'cha': { id: 'cha', name: 'Charlotte Challengers', abbreviation: 'CHA', logo: '/teams/cha.png', primaryColor: '#1D1160', secondaryColor: '#00788C', wins: 4, losses: 11, winPct: 0.267, conference: 'East', division: 'Southeast' },
  'mem': { id: 'mem', name: 'Memphis Mammoths', abbreviation: 'MEM', logo: '/teams/mem.png', primaryColor: '#5D76A9', secondaryColor: '#12173F', wins: 8, losses: 7, winPct: 0.533, conference: 'West', division: 'Southwest' },
  'nop': { id: 'nop', name: 'New Orleans Night', abbreviation: 'NOP', logo: '/teams/nop.png', primaryColor: '#0C2340', secondaryColor: '#85714D', wins: 6, losses: 9, winPct: 0.400, conference: 'West', division: 'Southwest' },
  'sas': { id: 'sas', name: 'San Antonio Strikers', abbreviation: 'SAS', logo: '/teams/sas.png', primaryColor: '#C4CED4', secondaryColor: '#000000', wins: 5, losses: 10, winPct: 0.333, conference: 'West', division: 'Southwest' },
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const today = new Date();
const yesterday = addDays(today, -1);
const twoDaysAgo = addDays(today, -2);
const threeDaysAgo = addDays(today, -3);
const tomorrow = addDays(today, 1);
const twoDays = addDays(today, 2);
const threeDays = addDays(today, 3);
const fourDays = addDays(today, 4);
const fiveDays = addDays(today, 5);
const sixDays = addDays(today, 6);
const sevenDays = addDays(today, 7);

export const mockGames: Game[] = [
  // Recent Games (FINAL)
  {
    id: '1',
    league: 'PBL',
    date: formatDate(yesterday),
    time: '7:00 PM EST',
    status: 'FINAL',
    homeTeam: mockTeams['phi'],
    awayTeam: mockTeams['tor'],
    homeScore: 32,
    awayScore: 61,
    venue: 'Wells Fargo Center',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/1',
  },
  {
    id: '2',
    league: 'PBL',
    date: formatDate(yesterday),
    time: '8:00 PM EST',
    status: 'FINAL',
    homeTeam: mockTeams['por'],
    awayTeam: mockTeams['pho'],
    homeScore: 69,
    awayScore: 92,
    venue: 'Moda Center',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/2',
  },
  {
    id: '3',
    league: 'PBL',
    date: formatDate(twoDaysAgo),
    time: '7:30 PM EST',
    status: 'FINAL',
    homeTeam: mockTeams['sac'],
    awayTeam: mockTeams['nas'],
    homeScore: 57,
    awayScore: 106,
    venue: 'Golden 1 Center',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/3',
  },
  {
    id: '4',
    league: 'PBL',
    date: formatDate(threeDaysAgo),
    time: '8:00 PM EST',
    status: 'FINAL',
    homeTeam: mockTeams['hou'],
    awayTeam: mockTeams['lal'],
    homeScore: 88,
    awayScore: 95,
    venue: 'Toyota Center',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/4',
  },
  {
    id: '5',
    league: 'Elevate',
    date: formatDate(yesterday),
    time: '6:00 PM EST',
    status: 'FINAL',
    homeTeam: mockTeams['chi'],
    awayTeam: mockTeams['bos'],
    homeScore: 76,
    awayScore: 89,
    venue: 'United Center',
    streamUrl: 'https://twitch.tv/elevate',
    gameUrl: '/games/5',
  },
  {
    id: '6',
    league: 'Elevate',
    date: formatDate(twoDaysAgo),
    time: '7:00 PM EST',
    status: 'FINAL',
    homeTeam: mockTeams['nyk'],
    awayTeam: mockTeams['gsw'],
    homeScore: 82,
    awayScore: 91,
    venue: 'Madison Square Garden',
    streamUrl: 'https://twitch.tv/elevate',
    gameUrl: '/games/6',
  },

  // Upcoming Games
  {
    id: '7',
    league: 'PBL',
    date: formatDate(tomorrow),
    time: '7:00 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['bos'],
    awayTeam: mockTeams['nyk'],
    homeScore: 0,
    awayScore: 0,
    venue: 'TD Garden',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/7',
  },
  {
    id: '8',
    league: 'PBL',
    date: formatDate(tomorrow),
    time: '8:00 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['lal'],
    awayTeam: mockTeams['gsw'],
    homeScore: 0,
    awayScore: 0,
    venue: 'Crypto.com Arena',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/8',
  },
  {
    id: '9',
    league: 'PBL',
    date: formatDate(twoDays),
    time: '7:30 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['tor'],
    awayTeam: mockTeams['chi'],
    homeScore: 0,
    awayScore: 0,
    venue: 'Scotiabank Arena',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/9',
  },
  {
    id: '10',
    league: 'PBL',
    date: formatDate(threeDays),
    time: '8:00 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['pho'],
    awayTeam: mockTeams['por'],
    homeScore: 0,
    awayScore: 0,
    venue: 'Footprint Center',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/10',
  },
  {
    id: '11',
    league: 'PBL',
    date: formatDate(fourDays),
    time: '7:00 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['mia'],
    awayTeam: mockTeams['atl'],
    homeScore: 0,
    awayScore: 0,
    venue: 'Kaseya Center',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/11',
  },
  {
    id: '12',
    league: 'PBL',
    date: formatDate(fiveDays),
    time: '7:00 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['den'],
    awayTeam: mockTeams['uta'],
    homeScore: 0,
    awayScore: 0,
    venue: 'Ball Arena',
    streamUrl: 'https://twitch.tv/pbl',
    gameUrl: '/games/12',
  },
  {
    id: '13',
    league: 'Elevate',
    date: formatDate(tomorrow),
    time: '6:00 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['mil'],
    awayTeam: mockTeams['ind'],
    homeScore: 0,
    awayScore: 0,
    venue: 'Fiserv Forum',
    streamUrl: 'https://twitch.tv/elevate',
    gameUrl: '/games/13',
  },
  {
    id: '14',
    league: 'Elevate',
    date: formatDate(twoDays),
    time: '7:00 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['cle'],
    awayTeam: mockTeams['det'],
    homeScore: 0,
    awayScore: 0,
    venue: 'Rocket Mortgage FieldHouse',
    streamUrl: 'https://twitch.tv/elevate',
    gameUrl: '/games/14',
  },
  {
    id: '15',
    league: 'Elevate',
    date: formatDate(threeDays),
    time: '8:00 PM EST',
    status: 'UPCOMING',
    homeTeam: mockTeams['okc'],
    awayTeam: mockTeams['min'],
    homeScore: 0,
    awayScore: 0,
    venue: 'Paycom Center',
    streamUrl: 'https://twitch.tv/elevate',
    gameUrl: '/games/15',
  },
];

export const getUpcomingGames = (league?: 'PBL' | 'Elevate', limit?: number): Game[] => {
  const games = mockGames
    .filter((game) => game.status === 'UPCOMING')
    .filter((game) => !league || game.league === league)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return limit ? games.slice(0, limit) : games;
};

export const getRecentGames = (league?: 'PBL' | 'Elevate', limit?: number): Game[] => {
  const games = mockGames
    .filter((game) => game.status === 'FINAL')
    .filter((game) => !league || game.league === league)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return limit ? games.slice(0, limit) : games;
};

export const getGameById = (id: string): Game | undefined => {
  return mockGames.find((game) => game.id === id);
};

export const getTeams = (): TeamType[] => {
  return Object.values(mockTeams);
};

export const getTeamById = (id: string): TeamType | undefined => {
  return mockTeams[id];
};

export const getLeagueStats = () => ({
  teams: 24,
  players: 234,
  games: 33,
  upcomingGames: 8,
  completedGames: 25,
  liveGames: 0,
});