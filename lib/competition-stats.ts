import type { PlayerStats } from './league-types';
import type { CompetitionResult, CompetitionStatLine, StatsCompetition } from './stats-data';

export type CompetitionSelection = 'all' | 'season' | 'tournament' | string;

export type PlayerCompetitionStats = {
  playerId: string;
  teamId: string;
  stats: PlayerStats;
};

export type TeamCompetitionStats = {
  teamId: string;
  wins: number;
  losses: number;
  stats: PlayerStats;
};

type Totals = {
  teamId: string;
  targetIds: Set<string>;
  gamesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
};

export function competitionIdsForSelection(competitions: StatsCompetition[], selection: CompetitionSelection) {
  if (selection === 'all') return competitions.map((item) => item.id);
  if (selection === 'season' || selection === 'tournament') {
    return competitions.filter((item) => item.kind === selection).map((item) => item.id);
  }
  return competitions.some((item) => item.id === selection) ? [selection] : [];
}

export function competitionSelectionLabel(competitions: StatsCompetition[], selection: CompetitionSelection) {
  if (selection === 'all') return 'All competitions';
  if (selection === 'season') return 'All league seasons';
  if (selection === 'tournament') return 'All tournaments';
  return competitions.find((item) => item.id === selection)?.name ?? 'Selected competition';
}

export function aggregatePlayerCompetitionStats(lines: CompetitionStatLine[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  const totals = new Map<string, Totals>();

  lines.forEach((line) => {
    if (!selected.has(line.competitionId) || !line.playerId) return;
    const current = totals.get(line.playerId) ?? emptyTotals(line.teamId);
    current.teamId = line.teamId || current.teamId;
    current.gamesPlayed += line.gamesPlayed;
    addLine(current, line);
    totals.set(line.playerId, current);
  });

  return new Map([...totals].map(([playerId, total]) => [playerId, {
    playerId,
    teamId: total.teamId,
    stats: toStats(total, total.gamesPlayed),
  }] satisfies [string, PlayerCompetitionStats]));
}

export function aggregateTeamCompetitionStats(lines: CompetitionStatLine[], results: CompetitionResult[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  const totals = new Map<string, Totals>();
  const records = new Map<string, { wins: number; losses: number; targetIds: Set<string> }>();

  lines.forEach((line) => {
    if (!selected.has(line.competitionId) || !line.teamId) return;
    const current = totals.get(line.teamId) ?? emptyTotals(line.teamId);
    current.targetIds.add(line.targetId);
    addLine(current, line);
    totals.set(line.teamId, current);
  });

  results.forEach((result) => {
    if (!selected.has(result.competitionId)) return;
    [result.homeTeamId, result.awayTeamId].forEach((teamId) => {
      const record = records.get(teamId) ?? { wins: 0, losses: 0, targetIds: new Set<string>() };
      record.targetIds.add(result.targetId);
      records.set(teamId, record);
    });
    if (result.homeScore === result.awayScore) return;
    const winnerId = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
    const loserId = winnerId === result.homeTeamId ? result.awayTeamId : result.homeTeamId;
    records.get(winnerId)!.wins += 1;
    records.get(loserId)!.losses += 1;
  });

  const teamIds = new Set([...totals.keys(), ...records.keys()]);
  return new Map([...teamIds].map((teamId) => {
    const total = totals.get(teamId) ?? emptyTotals(teamId);
    const record = records.get(teamId) ?? { wins: 0, losses: 0, targetIds: new Set<string>() };
    const gamesPlayed = Math.max(total.targetIds.size, record.targetIds.size);
    return [teamId, {
      teamId,
      wins: record.wins,
      losses: record.losses,
      stats: toStats(total, gamesPlayed),
    }] satisfies [string, TeamCompetitionStats];
  }));
}

function emptyTotals(teamId: string): Totals {
  return {
    teamId,
    targetIds: new Set<string>(),
    gamesPlayed: 0,
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    blocks: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
  };
}

function addLine(total: Totals, line: CompetitionStatLine) {
  total.points += line.points;
  total.rebounds += line.rebounds;
  total.assists += line.assists;
  total.steals += line.steals;
  total.blocks += line.blocks;
  total.fieldGoalsMade += line.fieldGoalsMade;
  total.fieldGoalsAttempted += line.fieldGoalsAttempted;
  total.threePointersMade += line.threePointersMade;
  total.threePointersAttempted += line.threePointersAttempted;
}

function toStats(total: Totals, gamesPlayed: number): PlayerStats {
  const divisor = gamesPlayed || 1;
  return {
    gamesPlayed,
    pointsPerGame: total.points / divisor,
    reboundsPerGame: total.rebounds / divisor,
    assistsPerGame: total.assists / divisor,
    stealsPerGame: total.steals / divisor,
    blocksPerGame: total.blocks / divisor,
    fieldGoalPct: total.fieldGoalsAttempted ? total.fieldGoalsMade / total.fieldGoalsAttempted * 100 : 0,
    threePointPct: total.threePointersAttempted ? total.threePointersMade / total.threePointersAttempted * 100 : 0,
  };
}
