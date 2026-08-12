export type FibaEntry = {
  teamId: string;
  groupName: string;
  seed: number | null;
};

export type FibaMatch = {
  id: string;
  stage: 'group' | 'knockout' | null;
  groupName: string | null;
  roundLabel: string;
  bracketRound: 'quarter_final' | 'semi_final' | 'final' | null;
  bracketPosition: number | null;
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerTeamId: string | null;
};

export type FibaStanding = {
  teamId: string;
  groupName: string;
  rank: number;
  played: number;
  wins: number;
  losses: number;
  competitionPoints: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDifference: number;
  qualified: boolean;
};

type StandingTotals = Omit<FibaStanding, 'rank' | 'qualified' | 'pointDifference'>;

export function assignFibaGroups(teamIds: Array<{ teamId: string; seed: number | null }>) {
  if (teamIds.length !== 16) throw new Error('FIBA format requires exactly 16 teams.');
  const sorted = [...teamIds].sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER) || a.teamId.localeCompare(b.teamId));
  const groupNames = ['A', 'B', 'C', 'D'];
  return sorted.map((entry, index): FibaEntry => {
    const row = Math.floor(index / groupNames.length);
    const column = index % groupNames.length;
    const groupIndex = row % 2 === 0 ? column : groupNames.length - 1 - column;
    return { ...entry, groupName: groupNames[groupIndex] };
  });
}

export function createFibaGroupPairings(entries: FibaEntry[]) {
  const pairings: Array<{ groupName: string; round: number; homeTeamId: string; awayTeamId: string }> = [];
  const schedule = [
    [[0, 3], [1, 2]],
    [[0, 2], [3, 1]],
    [[0, 1], [2, 3]],
  ];

  for (const groupName of ['A', 'B', 'C', 'D']) {
    const group = entries.filter((entry) => entry.groupName === groupName).sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999));
    if (group.length !== 4) throw new Error(`Group ${groupName} must contain four teams.`);
    schedule.forEach((roundPairings, roundIndex) => roundPairings.forEach(([homeIndex, awayIndex]) => {
      pairings.push({ groupName, round: roundIndex + 1, homeTeamId: group[homeIndex].teamId, awayTeamId: group[awayIndex].teamId });
    }));
  }
  return pairings;
}

export function calculateFibaStandings(entries: FibaEntry[], matches: FibaMatch[]): FibaStanding[] {
  const standings: FibaStanding[] = [];
  const groupMatches = matches.filter((match) => match.stage === 'group' || match.roundLabel.startsWith('Group '));

  for (const groupName of [...new Set(entries.map((entry) => entry.groupName))].sort()) {
    const groupEntries = entries.filter((entry) => entry.groupName === groupName);
    const groupTeamIds = new Set(groupEntries.map((entry) => entry.teamId));
    const completed = groupMatches.filter((match) => {
      const matchGroup = match.groupName ?? (match.roundLabel.startsWith('Group ') ? match.roundLabel.slice(6).trim() : null);
      return matchGroup === groupName && match.status === 'final' && match.homeTeamId && match.awayTeamId
        && match.homeScore !== null && match.awayScore !== null && match.homeScore !== match.awayScore;
    });
    const totals = new Map(groupEntries.map((entry) => [entry.teamId, emptyStanding(entry.teamId, groupName)]));
    completed.forEach((match) => applyResult(totals, match));

    const sorted = [...totals.values()].sort((a, b) => {
      if (a.competitionPoints !== b.competitionPoints) return b.competitionPoints - a.competitionPoints;
      const tiedIds = new Set([...totals.values()].filter((row) => row.competitionPoints === a.competitionPoints).map((row) => row.teamId));
      const mini = buildMiniTable(tiedIds, completed, groupName);
      const aMini = mini.get(a.teamId)!;
      const bMini = mini.get(b.teamId)!;
      if (aMini.competitionPoints !== bMini.competitionPoints) return bMini.competitionPoints - aMini.competitionPoints;
      const aMiniDiff = aMini.pointsFor - aMini.pointsAgainst;
      const bMiniDiff = bMini.pointsFor - bMini.pointsAgainst;
      if (aMiniDiff !== bMiniDiff) return bMiniDiff - aMiniDiff;
      if (aMini.pointsFor !== bMini.pointsFor) return bMini.pointsFor - aMini.pointsFor;
      const aDiff = a.pointsFor - a.pointsAgainst;
      const bDiff = b.pointsFor - b.pointsAgainst;
      if (aDiff !== bDiff) return bDiff - aDiff;
      if (a.pointsFor !== b.pointsFor) return b.pointsFor - a.pointsFor;
      const aSeed = groupEntries.find((entry) => entry.teamId === a.teamId)?.seed ?? 9999;
      const bSeed = groupEntries.find((entry) => entry.teamId === b.teamId)?.seed ?? 9999;
      return aSeed - bSeed || a.teamId.localeCompare(b.teamId);
    });

    sorted.forEach((row, index) => standings.push({
      ...row,
      pointDifference: row.pointsFor - row.pointsAgainst,
      rank: index + 1,
      qualified: index < 2 && groupTeamIds.size === 4 && completed.length === 6,
    }));
  }
  return standings;
}

export function createFibaQuarterFinals(standings: FibaStanding[]) {
  const byGroupRank = new Map(standings.map((row) => [`${row.groupName}:${row.rank}`, row.teamId]));
  const get = (group: string, rank: number) => {
    const teamId = byGroupRank.get(`${group}:${rank}`);
    if (!teamId) throw new Error(`Missing Group ${group} rank ${rank}.`);
    return teamId;
  };
  return [
    { position: 1, homeTeamId: get('A', 1), awayTeamId: get('B', 2) },
    { position: 2, homeTeamId: get('C', 1), awayTeamId: get('D', 2) },
    { position: 3, homeTeamId: get('B', 1), awayTeamId: get('A', 2) },
    { position: 4, homeTeamId: get('D', 1), awayTeamId: get('C', 2) },
  ];
}

export function areFibaGroupsComplete(entries: FibaEntry[], matches: FibaMatch[]) {
  const expectedGames = entries.length / 4 * 6;
  const groupMatches = matches.filter((match) => match.stage === 'group' || match.roundLabel.startsWith('Group '));
  return groupMatches.length === expectedGames && groupMatches.every((match) => match.status === 'final'
    && match.homeScore !== null && match.awayScore !== null && match.homeScore !== match.awayScore);
}

function emptyStanding(teamId: string, groupName: string): StandingTotals {
  return { teamId, groupName, played: 0, wins: 0, losses: 0, competitionPoints: 0, pointsFor: 0, pointsAgainst: 0 };
}

function applyResult(totals: Map<string, StandingTotals>, match: FibaMatch) {
  const home = match.homeTeamId ? totals.get(match.homeTeamId) : undefined;
  const away = match.awayTeamId ? totals.get(match.awayTeamId) : undefined;
  if (!home || !away || match.homeScore === null || match.awayScore === null || match.homeScore === match.awayScore) return;
  home.played += 1; away.played += 1;
  home.pointsFor += match.homeScore; home.pointsAgainst += match.awayScore;
  away.pointsFor += match.awayScore; away.pointsAgainst += match.homeScore;
  if (match.homeScore > match.awayScore) {
    home.wins += 1; home.competitionPoints += 2;
    away.losses += 1; away.competitionPoints += 1;
  } else {
    away.wins += 1; away.competitionPoints += 2;
    home.losses += 1; home.competitionPoints += 1;
  }
}

function buildMiniTable(teamIds: Set<string>, matches: FibaMatch[], groupName: string) {
  const mini = new Map([...teamIds].map((teamId) => [teamId, emptyStanding(teamId, groupName)]));
  matches.filter((match) => match.homeTeamId && match.awayTeamId && teamIds.has(match.homeTeamId) && teamIds.has(match.awayTeamId))
    .forEach((match) => applyResult(mini, match));
  return mini;
}
