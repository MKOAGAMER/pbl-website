import { z } from 'zod';

const boxScoreNumber = z.coerce.number().int().min(0).max(500);

export const extractedStatRowSchema = z.object({
  player: z.string().trim().min(1).max(80),
  playerId: z.string().uuid().or(z.literal('')),
  teamId: z.string().uuid().or(z.literal('')),
  pts: boxScoreNumber,
  fgm: boxScoreNumber,
  fga: boxScoreNumber,
  fgPct: z.coerce.number().min(0).max(100),
  threePm: boxScoreNumber,
  threePa: boxScoreNumber,
  threePct: z.coerce.number().min(0).max(100),
  ftm: boxScoreNumber,
  fta: boxScoreNumber,
  ftPct: z.coerce.number().min(0).max(100),
  ast: boxScoreNumber,
  stl: boxScoreNumber,
  bk: boxScoreNumber,
  orb: boxScoreNumber,
  drb: boxScoreNumber,
  reb: boxScoreNumber,
  tov: boxScoreNumber,
  fls: boxScoreNumber,
  plusMinus: z.coerce.number().int().min(-500).max(500),
  ping: z.coerce.number().int().min(0).max(30000),
});

export const extractedStatRowsSchema = z.array(extractedStatRowSchema).min(1).max(50);

export type EditableStatRow = z.infer<typeof extractedStatRowSchema>;

export type MatchMvpRecommendation = {
  playerId: string;
  player: string;
  teamId: string;
  score: number;
  rank: number;
  winnerTeamId: string | null;
  isWinningTeam: boolean;
  reason: string;
};

export type StatImportSummary = {
  id: string;
  gameId: string | null;
  tournamentMatchId: string | null;
  status: 'processing' | 'review_required' | 'confirmed' | 'failed';
  originalFilename: string;
  createdAt: string;
  model: string | null;
  errorMessage: string | null;
  warnings: string[];
  rows: EditableStatRow[];
};

export type StatEntryTarget = {
  id: string;
  type: 'league' | 'tournament';
  label: string;
  homeTeamId: string;
  awayTeamId: string;
};

export type StatEntryPlayer = {
  id: string;
  name: string;
  teamId: string;
};

export function validateBasketballStatRows(rows: EditableStatRow[]) {
  const issues: string[] = [];
  const seenPlayers = new Set<string>();

  rows.forEach((row, index) => {
    const label = `แถว ${index + 1} (${row.player})`;
    if (!row.playerId || !row.teamId) issues.push(`${label}: กรุณาจับคู่ผู้เล่นและทีม`);
    if (row.playerId && seenPlayers.has(row.playerId)) issues.push(`${label}: ผู้เล่นซ้ำในตาราง`);
    if (row.playerId) seenPlayers.add(row.playerId);
    if (row.fgm > row.fga) issues.push(`${label}: FGM มากกว่า FGA`);
    if (row.threePm > row.threePa) issues.push(`${label}: 3PM มากกว่า 3PA`);
    if (row.threePm > row.fgm || row.threePa > row.fga) {
      issues.push(`${label}: สถิติสามแต้มมากกว่าสถิติฟิลด์โกลรวม`);
    }
    if (row.ftm > row.fta) issues.push(`${label}: FTM มากกว่า FTA`);
    const calculatedPoints = (row.fgm - row.threePm) * 2 + row.threePm * 3 + row.ftm;
    if (row.pts !== calculatedPoints) {
      issues.push(`${label}: PTS ควรเป็น ${calculatedPoints} จาก FGM/3PM/FTM`);
    }
    if (row.reb !== row.orb + row.drb) {
      issues.push(`${label}: REB ควรเป็น ${row.orb + row.drb} จาก ORB + DRB`);
    }
  });

  return issues;
}

export function calculateMatchMvp(rows: EditableStatRow[]) {
  const teamScores = new Map<string, number>();
  rows.forEach((row) => {
    if (row.teamId) teamScores.set(row.teamId, (teamScores.get(row.teamId) ?? 0) + row.pts);
  });
  const rankedTeams = [...teamScores].sort((a, b) => b[1] - a[1]);
  const winnerTeamId = rankedTeams.length >= 2 && rankedTeams[0][1] !== rankedTeams[1][1]
    ? rankedTeams[0][0]
    : null;

  const scoredPlayers = rows
    .map((row) => {
      const missedFieldGoals = Math.max(0, row.fga - row.fgm);
      const missedFreeThrows = Math.max(0, row.fta - row.ftm);
      const isWinningTeam = Boolean(winnerTeamId && row.teamId === winnerTeamId);
      const rawScore = row.pts
        + row.reb * 1.2
        + row.ast * 1.5
        + row.stl * 3
        + row.bk * 3
        - missedFieldGoals * 0.75
        - missedFreeThrows * 0.5
        - row.tov * 1.5
        - row.fls * 0.25
        + row.plusMinus * 0.2
        + (isWinningTeam ? 4 : 0);
      const score = Math.round(rawScore * 10) / 10;
      const impact = row.stl + row.bk;
      const plusMinus = `${row.plusMinus >= 0 ? '+' : ''}${row.plusMinus}`;
      return {
        playerId: row.playerId,
        player: row.player,
        teamId: row.teamId,
        score,
        rank: 0,
        winnerTeamId,
        isWinningTeam,
        points: row.pts,
        assists: row.ast,
        rebounds: row.reb,
        reason: `${row.pts} PTS · ${row.reb} REB · ${row.ast} AST · ${impact} STL+BLK · ${plusMinus} +/-${isWinningTeam ? ' · ทีมชนะ' : ''}`,
      };
    })
    .sort((a, b) => b.score - a.score
      || b.points - a.points
      || b.assists - a.assists
      || b.rebounds - a.rebounds
      || a.player.localeCompare(b.player));
  const rankings: MatchMvpRecommendation[] = scoredPlayers.map((entry, index) => ({
    playerId: entry.playerId,
    player: entry.player,
    teamId: entry.teamId,
    score: entry.score,
    rank: index + 1,
    winnerTeamId: entry.winnerTeamId,
    isWinningTeam: entry.isWinningTeam,
    reason: entry.reason,
  }));

  return { winnerTeamId, rankings, mvp: rankings[0] ?? null };
}

export function toDatabaseStatRows(rows: EditableStatRow[]) {
  const { rankings } = calculateMatchMvp(rows);
  const rankingsByPlayer = new Map(rankings.map((entry) => [entry.playerId, entry]));
  return rows.map((row) => {
    const recommendation = rankingsByPlayer.get(row.playerId);
    return {
      player_id: row.playerId,
      team_id: row.teamId,
      pts: row.pts,
      fgm: row.fgm,
      fga: row.fga,
      three_pm: row.threePm,
      three_pa: row.threePa,
      ftm: row.ftm,
      fta: row.fta,
      ast: row.ast,
      stl: row.stl,
      bk: row.bk,
      orb: row.orb,
      drb: row.drb,
      tov: row.tov,
      fls: row.fls,
      plus_minus: row.plusMinus,
      ping: row.ping,
      mvp_score: recommendation?.score ?? null,
      mvp_rank: recommendation?.rank ?? null,
      mvp_recommended: recommendation?.rank === 1,
      mvp_reason: recommendation?.reason ?? null,
    };
  });
}
