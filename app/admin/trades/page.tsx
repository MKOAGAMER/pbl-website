import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireAdminPermission } from '@/lib/admin-auth';
import { getSiteData } from '@/lib/league-data';
import type { TradeRecord, TradeRequestKind, TradeStatus } from '@/lib/trade-types';
import { TradeReviewQueue } from './TradeReviewQueue';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trade Review',
  robots: { index: false, follow: false },
};

type Row = Record<string, unknown>;
const asText = (value: unknown) => typeof value === 'string' ? value : '';

export default async function TradeReviewPage() {
  const [{ supabase }, siteData] = await Promise.all([
    requireAdminPermission('staff'),
    getSiteData(),
  ]);
  const [tradesResult, playersResult, teamsResult, usersResult] = await Promise.all([
    supabase
      .from('trades')
      .select('id, player_id, from_team_id, to_team_id, trade_date, status, request_kind, notes, review_note, created_by, created_at, reviewed_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase.from('players').select('id, name, first_name, last_name, slug'),
    supabase.from('teams').select('id, name, abbreviation'),
    supabase.from('users').select('id, username'),
  ]);
  const playerById = new Map(siteData.players.map((player) => [player.id, { name: player.displayName, slug: player.slug }]));
  ((playersResult.data ?? []) as Row[]).forEach((row) => {
    const fallbackName = `${asText(row.first_name)} ${asText(row.last_name)}`.trim();
    playerById.set(asText(row.id), { name: asText(row.name) || fallbackName || 'Unknown player', slug: asText(row.slug) });
  });
  const teamById = new Map(siteData.teams.map((team) => [team.id, { name: team.name, abbreviation: team.abbreviation }]));
  ((teamsResult.data ?? []) as Row[]).forEach((row) => teamById.set(asText(row.id), { name: asText(row.name) || 'Unknown team', abbreviation: asText(row.abbreviation) || '—' }));
  const userById = new Map(((usersResult.data ?? []) as Row[]).map((row) => [asText(row.id), asText(row.username)]));
  const trades: TradeRecord[] = ((tradesResult.data ?? []) as Row[]).map((row) => {
    const player = playerById.get(asText(row.player_id));
    const fromTeam = teamById.get(asText(row.from_team_id));
    const toTeam = teamById.get(asText(row.to_team_id));
    return {
      id: asText(row.id),
      playerId: asText(row.player_id),
      playerName: player?.name ?? 'Unknown player',
      playerSlug: player?.slug ?? '',
      fromTeamId: asText(row.from_team_id),
      fromTeamName: fromTeam?.name ?? 'Free Agent',
      fromTeamAbbreviation: fromTeam?.abbreviation ?? 'FA',
      toTeamId: asText(row.to_team_id),
      toTeamName: toTeam?.name ?? 'Free Agent',
      toTeamAbbreviation: toTeam?.abbreviation ?? 'FA',
      tradeDate: asText(row.trade_date),
      status: asText(row.status) as TradeStatus,
      requestKind: (asText(row.request_kind) || 'transfer') as TradeRequestKind,
      notes: asText(row.notes),
      reviewNote: asText(row.review_note),
      requestedBy: userById.get(asText(row.created_by)) || 'Unknown requester',
      requestedAt: asText(row.created_at),
      reviewedAt: asText(row.reviewed_at) || null,
      isOwnRequest: false,
    };
  });

  return (
    <main className="site-shell py-10 sm:py-14">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)] hover:text-[var(--orange-soft)]"><ArrowLeft className="h-4 w-4" /> Admin</Link>
      <div className="mt-7 border-b border-[var(--line)] pb-7">
        <p className="eyebrow">Staff approval</p>
        <h1 className="display-type mt-4 text-5xl sm:text-6xl">Trade Review</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">ตรวจคำขอย้ายทีมก่อนอัปเดต roster จริง การอนุมัติจะย้ายผู้เล่นและบันทึกผู้ตรวจสอบในรายการเดียวกัน</p>
      </div>
      <TradeReviewQueue trades={trades} />
    </main>
  );
}
