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

export type StatImportSummary = {
  id: string;
  gameId: string;
  status: 'processing' | 'review_required' | 'confirmed' | 'failed';
  originalFilename: string;
  createdAt: string;
  model: string | null;
  errorMessage: string | null;
  warnings: string[];
  rows: EditableStatRow[];
};

export type StatEntryGame = {
  id: string;
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

export function toDatabaseStatRows(rows: EditableStatRow[]) {
  return rows.map((row) => ({
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
  }));
}

