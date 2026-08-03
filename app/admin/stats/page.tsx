import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { getSiteData } from '@/lib/league-data';
import { extractedStatRowSchema, type StatEntryPlayer, type StatEntryTarget, type StatImportSummary } from '@/lib/stat-import';
import { StatImportWorkbench } from './StatImportWorkbench';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'AI Stat Entry',
  robots: { index: false, follow: false },
};

type Row = Record<string, unknown>;
const stringValue = (value: unknown) => typeof value === 'string' ? value : '';

export default async function AdminStatsPage() {
  const [{ supabase }, siteData] = await Promise.all([
    requireAdminPermission('staff'),
    getSiteData(),
  ]);
  const teamById = new Map(siteData.teams.map((team) => [team.id, team]));
  const leagueTargets: StatEntryTarget[] = siteData.games
    .filter((game) => game.status === 'final')
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    .map((game) => ({
      id: game.id,
      type: 'league',
      homeTeamId: game.homeTeamId,
      awayTeamId: game.awayTeamId,
      label: `${new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(new Date(game.startsAt))} · ${teamById.get(game.awayTeamId)?.abbreviation ?? 'AWY'} ${game.awayScore ?? '—'}–${game.homeScore ?? '—'} ${teamById.get(game.homeTeamId)?.abbreviation ?? 'HOME'}`,
    }));
  const [tournamentResult, tournamentMatchResult] = await Promise.all([
    supabase.from('tournaments').select('id, name'),
    supabase.from('tournament_matches')
      .select('id, tournament_id, round_label, match_number, scheduled_at, status, home_team_id, away_team_id, home_score, away_score')
      .not('home_team_id', 'is', null)
      .not('away_team_id', 'is', null)
      .not('status', 'in', '(postponed,cancelled)')
      .order('scheduled_at', { ascending: false }),
  ]);
  const tournamentNameById = new Map(((tournamentResult.data ?? []) as Row[]).map((row) => [stringValue(row.id), stringValue(row.name)]));
  const tournamentTargets: StatEntryTarget[] = ((tournamentMatchResult.data ?? []) as Row[]).map((match) => {
    const homeTeamId = stringValue(match.home_team_id);
    const awayTeamId = stringValue(match.away_team_id);
    const matchNumber = typeof match.match_number === 'number' ? ` · Match ${match.match_number}` : '';
    const score = match.status === 'final' ? ` · ${match.away_score ?? '—'}–${match.home_score ?? '—'}` : '';
    return {
      id: stringValue(match.id),
      type: 'tournament',
      homeTeamId,
      awayTeamId,
      label: `${tournamentNameById.get(stringValue(match.tournament_id)) ?? 'Tournament'} · ${stringValue(match.round_label) || 'Round'}${matchNumber} · ${teamById.get(awayTeamId)?.abbreviation ?? 'AWY'} vs ${teamById.get(homeTeamId)?.abbreviation ?? 'HOME'}${score}`,
    };
  });
  const targets = [...tournamentTargets, ...leagueTargets];

  const players: StatEntryPlayer[] = siteData.players.map((player) => ({
    id: player.id,
    name: `${player.displayName} (@${player.robloxUsername})`,
    teamId: player.teamId,
  }));

  const { data } = await supabase
    .from('stat_imports')
    .select('id, game_id, tournament_match_id, status, original_filename, created_at, model, error_message, warnings, extracted_rows')
    .order('created_at', { ascending: false })
    .limit(30);
  const imports: StatImportSummary[] = ((data ?? []) as Row[]).map((row) => ({
    id: stringValue(row.id),
    gameId: stringValue(row.game_id) || null,
    tournamentMatchId: stringValue(row.tournament_match_id) || null,
    status: stringValue(row.status) as StatImportSummary['status'],
    originalFilename: stringValue(row.original_filename),
    createdAt: stringValue(row.created_at),
    model: stringValue(row.model) || null,
    errorMessage: stringValue(row.error_message) || null,
    warnings: Array.isArray(row.warnings) ? row.warnings.filter((item): item is string => typeof item === 'string') : [],
    rows: Array.isArray(row.extracted_rows)
      ? row.extracted_rows.map((item) => extractedStatRowSchema.safeParse(item)).filter((item) => item.success).map((item) => item.data)
      : [],
  }));

  return (
    <main className="site-shell py-10 sm:py-14">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Admin</Link>
      <div className="mt-7 border-b border-[var(--line)] pb-7">
        <p className="eyebrow">Staff workflow</p>
        <h1 className="display-type mt-4 text-5xl sm:text-6xl">AI-Assisted Stat Entry</h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--ink-soft)]">อัปโหลดภาพสถิติจบเกมให้ Gemini ช่วยอ่าน จากนั้นจับคู่ผู้เล่น ตรวจทุกค่า และแก้ไขได้ก่อนยืนยัน เกมลีกจะบันทึก box score ตามเดิม ส่วน Tournament จะรวม PTS ของแต่ละทีมเพื่อสร้างสกอร์ ผู้ชนะ และผล Final อัตโนมัติ</p>
      </div>
      <StatImportWorkbench targets={targets} players={players} imports={imports} />
    </main>
  );
}
