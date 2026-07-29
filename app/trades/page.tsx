import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-admin';
import { getSiteData } from '@/lib/league-data';
import type { TradeRecord, TradeRequestKind, TradeStatus } from '@/lib/trade-types';
import { TradeCenter } from './TradeCenter';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Trade Center',
  description: 'Submit, review and explore official PBAL player movement.',
};

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export default async function TradesPage() {
  const [siteData, user] = await Promise.all([getSiteData(), getCurrentUser()]);
  const supabase = createAdminClient();
  let tradeRows: Row[] = [];
  let historyPlayerRows: Row[] = [];
  let historyTeamRows: Row[] = [];

  if (supabase) {
    const [tradesResult, playersResult, teamsResult] = await Promise.all([
      supabase
        .from('trades')
        .select('id, player_id, from_team_id, to_team_id, trade_date, status, request_kind, notes, review_note, created_by, created_at, reviewed_at')
        .order('trade_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('players').select('id, name, first_name, last_name, slug'),
      supabase.from('teams').select('id, name, abbreviation'),
    ]);
    if (!tradesResult.error && Array.isArray(tradesResult.data)) tradeRows = tradesResult.data as Row[];
    if (!playersResult.error && Array.isArray(playersResult.data)) historyPlayerRows = playersResult.data as Row[];
    if (!teamsResult.error && Array.isArray(teamsResult.data)) historyTeamRows = teamsResult.data as Row[];
  }

  const playerById = new Map(siteData.players.map((player) => [player.id, { name: player.displayName, slug: player.slug }]));
  historyPlayerRows.forEach((row) => {
    const fallbackName = `${text(row.first_name)} ${text(row.last_name)}`.trim();
    playerById.set(text(row.id), { name: text(row.name) || fallbackName || 'Unknown player', slug: text(row.slug) });
  });
  const teamById = new Map(siteData.teams.map((team) => [team.id, { name: team.name, abbreviation: team.abbreviation }]));
  historyTeamRows.forEach((row) => teamById.set(text(row.id), { name: text(row.name) || 'Unknown team', abbreviation: text(row.abbreviation) || '—' }));
  const isStaff = user?.role === 'staff' || user?.role === 'admin';
  const visibleRows = tradeRows.filter((row) => (
    row.status === 'approved' || row.created_by === user?.id || isStaff
  ));
  const trades: TradeRecord[] = visibleRows.map((row) => {
    const player = playerById.get(text(row.player_id));
    const fromTeam = teamById.get(text(row.from_team_id));
    const toTeam = teamById.get(text(row.to_team_id));
    return {
      id: text(row.id),
      playerId: text(row.player_id),
      playerName: player?.name ?? 'Unknown player',
      playerSlug: player?.slug ?? '',
      fromTeamId: text(row.from_team_id),
      fromTeamName: fromTeam?.name ?? 'Free Agent',
      fromTeamAbbreviation: fromTeam?.abbreviation ?? 'FA',
      toTeamId: text(row.to_team_id),
      toTeamName: toTeam?.name ?? 'Unknown team',
      toTeamAbbreviation: toTeam?.abbreviation ?? '—',
      tradeDate: text(row.trade_date),
      status: text(row.status) as TradeStatus,
      requestKind: (text(row.request_kind) || 'transfer') as TradeRequestKind,
      notes: text(row.notes),
      reviewNote: text(row.review_note),
      requestedAt: text(row.created_at),
      reviewedAt: text(row.reviewed_at) || null,
      isOwnRequest: row.created_by === user?.id,
    };
  });

  return (
    <TradeCenter
      trades={trades}
      players={siteData.players}
      teams={siteData.teams}
      currentUsername={user?.username ?? null}
      isStaff={isStaff}
      canRequestTrade={isStaff || user?.role === 'franchise_owner'}
      franchiseTeamId={user?.franchiseTeamId ?? null}
    />
  );
}
