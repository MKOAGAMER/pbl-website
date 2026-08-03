import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { hasActiveDiscipline, logLeagueOperation, type OperationSource } from './discipline';
import { requireOperationPermission } from './league-authorization';
import { LeagueOperationError } from './operation-error';
import type { PbalUser } from './pbal-types';
import type { TradeRequestKind } from './trade-types';

export async function createTradeRequest(
  supabase: SupabaseClient,
  actor: PbalUser,
  input: {
    playerId: string;
    toTeamId: string;
    requestKind: TradeRequestKind;
    notes?: string;
    source: OperationSource;
    externalRequestId?: string;
  },
) {
  const isStaff = actor.role === 'staff' || actor.role === 'admin';
  if (!isStaff && actor.role !== 'franchise_owner') {
    throw new LeagueOperationError(403, 'trade_forbidden', 'Only a Franchise Owner or league staff can submit a trade request.');
  }

  if (input.externalRequestId) {
    const { data: existing } = await supabase
      .from('trades')
      .select('id, status')
      .eq('source', input.source)
      .eq('external_request_id', input.externalRequestId)
      .maybeSingle();
    if (existing) return { id: String(existing.id), status: String(existing.status), duplicate: true };
  }

  const [{ data: player, error: playerError }, { data: activeSeason, error: seasonError }] = await Promise.all([
    supabase.from('players').select('id, team_id, is_active').eq('id', input.playerId).maybeSingle(),
    supabase.from('seasons').select('id').eq('status', 'active').order('starts_on', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (playerError || seasonError) {
    throw new LeagueOperationError(503, 'database_unavailable', playerError?.message || seasonError?.message || 'Database unavailable.');
  }
  if (!player?.is_active) throw new LeagueOperationError(404, 'player_not_found', 'Player was not found or is inactive.');
  if (await hasActiveDiscipline(supabase, input.playerId, ['trade_ban', 'blacklist'])) {
    throw new LeagueOperationError(409, 'player_trade_restricted', 'Player is currently blocked from trade activity.');
  }

  let fromTeamId = typeof player.team_id === 'string' ? player.team_id : '';
  if (activeSeason?.id) {
    const { data: roster } = await supabase
      .from('rosters')
      .select('team_id')
      .eq('season_id', activeSeason.id)
      .eq('player_id', input.playerId)
      .eq('status', 'active')
      .maybeSingle();
    if (roster?.team_id) fromTeamId = String(roster.team_id);
  }
  if (!fromTeamId && input.requestKind !== 'acquire') {
    throw new LeagueOperationError(409, 'free_agent_requires_acquire', 'A Free Agent can only be submitted as an acquire request.');
  }
  if (fromTeamId === input.toTeamId) {
    throw new LeagueOperationError(400, 'same_team', 'Origin and destination teams must be different.');
  }

  if (actor.role === 'franchise_owner') {
    if (!actor.franchiseTeamId) {
      throw new LeagueOperationError(403, 'franchise_team_missing', 'Franchise Owner account is not assigned to a team.');
    }
    if (input.requestKind === 'acquire' && input.toTeamId !== actor.franchiseTeamId) {
      throw new LeagueOperationError(403, 'wrong_franchise_team', 'Acquire requests must move the player to your Franchise team.');
    }
    if (input.requestKind === 'release' && fromTeamId !== actor.franchiseTeamId) {
      throw new LeagueOperationError(403, 'wrong_franchise_team', 'Release requests must involve a player on your Franchise team.');
    }
    if (input.requestKind === 'transfer') {
      throw new LeagueOperationError(400, 'invalid_trade_kind', 'Franchise Owners must use acquire or release.');
    }
  }

  const { data: destination, error: teamError } = await supabase
    .from('teams')
    .select('id')
    .eq('id', input.toTeamId)
    .eq('is_active', true)
    .maybeSingle();
  if (teamError) throw new LeagueOperationError(503, 'database_unavailable', teamError.message);
  if (!destination) throw new LeagueOperationError(404, 'team_not_found', 'Destination team was not found.');

  const { data: existing } = await supabase
    .from('trades')
    .select('id')
    .eq('player_id', input.playerId)
    .eq('status', 'pending')
    .maybeSingle();
  if (existing) {
    throw new LeagueOperationError(409, 'trade_already_pending', 'Player already has a pending trade request.');
  }

  const { data, error } = await supabase
    .from('trades')
    .insert({
      player_id: input.playerId,
      from_team_id: fromTeamId || null,
      to_team_id: input.toTeamId,
      trade_date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      request_kind: input.requestKind,
      notes: input.notes?.trim() || null,
      created_by: actor.id,
      source: input.source,
      external_request_id: input.externalRequestId || null,
    })
    .select('id, status')
    .single();
  if (error || !data) {
    throw new LeagueOperationError(409, 'trade_create_failed', error?.message || 'Unable to create trade request.');
  }
  await logLeagueOperation(supabase, actor, {
    source: input.source,
    externalRequestId: input.externalRequestId,
    operation: 'trade.create',
    resourceType: 'trade',
    resourceId: String(data.id),
    payload: { playerId: input.playerId, toTeamId: input.toTeamId, requestKind: input.requestKind },
  });
  return { id: String(data.id), status: String(data.status), duplicate: false };
}

export async function reviewTradeRequest(
  supabase: SupabaseClient,
  actor: PbalUser,
  input: {
    tradeId: string;
    action: 'approve' | 'reject';
    note?: string;
    source: OperationSource;
    externalRequestId?: string;
  },
) {
  requireOperationPermission(actor, 'staff');
  if (input.externalRequestId) {
    const { data: audit } = await supabase
      .from('league_operation_log')
      .select('resource_id')
      .eq('source', input.source)
      .eq('external_request_id', input.externalRequestId)
      .eq('operation', `trade.${input.action}`)
      .maybeSingle();
    if (audit?.resource_id) {
      return { id: String(audit.resource_id), status: input.action === 'approve' ? 'approved' : 'rejected', duplicate: true };
    }
  }
  if (input.action === 'approve') {
    const { error } = await supabase.rpc('approve_trade_request', {
      p_trade_id: input.tradeId,
      p_reviewer_id: actor.id,
    });
    if (error) throw new LeagueOperationError(409, 'trade_approval_failed', error.message);
    if (input.note?.trim()) {
      await supabase.from('trades').update({ review_note: input.note.trim() }).eq('id', input.tradeId);
    }
  } else {
    const { data, error } = await supabase
      .from('trades')
      .update({
        status: 'rejected',
        review_note: input.note?.trim() || null,
        reviewed_by: actor.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', input.tradeId)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (error || !data) {
      throw new LeagueOperationError(409, 'trade_already_reviewed', error?.message || 'Trade has already been reviewed.');
    }
  }
  await logLeagueOperation(supabase, actor, {
    source: input.source,
    externalRequestId: input.externalRequestId,
    operation: `trade.${input.action}`,
    resourceType: 'trade',
    resourceId: input.tradeId,
    payload: { note: input.note || '' },
  });
  return { id: input.tradeId, status: input.action === 'approve' ? 'approved' : 'rejected', duplicate: false };
}

export type MatchMutation = {
  homeTeamId?: string;
  awayTeamId?: string;
  startsAt?: string;
  venue?: string;
  status?: 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
  homeScore?: number | null;
  awayScore?: number | null;
  streamUrl?: string | null;
  notes?: string | null;
};

export async function scheduleLeagueMatch(
  supabase: SupabaseClient,
  actor: PbalUser,
  input: {
    seasonId: string;
    homeTeamId: string;
    awayTeamId: string;
    startsAt: string;
    venue?: string;
    source: OperationSource;
    externalRequestId?: string;
  },
) {
  requireOperationPermission(actor, 'staff');
  if (input.homeTeamId === input.awayTeamId) {
    throw new LeagueOperationError(400, 'same_team', 'Home and away teams must be different.');
  }
  if (input.externalRequestId) {
    const { data: audit } = await supabase
      .from('league_operation_log')
      .select('resource_id')
      .eq('source', input.source)
      .eq('external_request_id', input.externalRequestId)
      .eq('operation', 'match.schedule')
      .maybeSingle();
    if (audit?.resource_id) return { id: String(audit.resource_id), duplicate: true };
  }
  const { data, error } = await supabase
    .from('games')
    .insert({
      season_id: input.seasonId,
      home_team_id: input.homeTeamId,
      away_team_id: input.awayTeamId,
      scheduled_at: input.startsAt,
      venue: input.venue?.trim() || null,
      status: 'scheduled',
    })
    .select('id')
    .single();
  if (error || !data) throw new LeagueOperationError(409, 'match_create_failed', error?.message || 'Unable to schedule match.');
  await logLeagueOperation(supabase, actor, {
    source: input.source,
    externalRequestId: input.externalRequestId,
    operation: 'match.schedule',
    resourceType: 'game',
    resourceId: String(data.id),
    payload: { seasonId: input.seasonId, homeTeamId: input.homeTeamId, awayTeamId: input.awayTeamId, startsAt: input.startsAt },
  });
  return { id: String(data.id), duplicate: false };
}

export async function updateLeagueMatch(
  supabase: SupabaseClient,
  actor: PbalUser,
  input: {
    matchId: string;
    changes: MatchMutation;
    source: OperationSource;
    externalRequestId?: string;
  },
) {
  requireOperationPermission(actor, 'staff');
  if (input.externalRequestId) {
    const { data: audit } = await supabase
      .from('league_operation_log')
      .select('resource_id')
      .eq('source', input.source)
      .eq('external_request_id', input.externalRequestId)
      .eq('operation', 'match.update')
      .maybeSingle();
    if (audit?.resource_id) {
      const { data: existing } = await supabase
        .from('games')
        .select('id, status, home_score, away_score')
        .eq('id', audit.resource_id)
        .maybeSingle();
      if (existing) return existing;
    }
  }
  const { data: current, error: currentError } = await supabase
    .from('games')
    .select('id, home_team_id, away_team_id, scheduled_at, venue, status, home_score, away_score, stream_url, notes')
    .eq('id', input.matchId)
    .maybeSingle();
  if (currentError) throw new LeagueOperationError(503, 'database_unavailable', currentError.message);
  if (!current) throw new LeagueOperationError(404, 'match_not_found', 'Match was not found.');

  const homeTeamId = input.changes.homeTeamId ?? String(current.home_team_id);
  const awayTeamId = input.changes.awayTeamId ?? String(current.away_team_id);
  const status = input.changes.status ?? String(current.status);
  const homeScore = input.changes.homeScore === undefined ? current.home_score : input.changes.homeScore;
  const awayScore = input.changes.awayScore === undefined ? current.away_score : input.changes.awayScore;
  if (homeTeamId === awayTeamId) throw new LeagueOperationError(400, 'same_team', 'Home and away teams must be different.');
  if (status === 'final' && (
    typeof homeScore !== 'number'
    || typeof awayScore !== 'number'
    || homeScore < 0
    || awayScore < 0
    || homeScore === awayScore
  )) {
    throw new LeagueOperationError(400, 'invalid_final_score', 'A final match needs nonnegative, non-tied scores.');
  }

  const changes = {
    home_team_id: homeTeamId,
    away_team_id: awayTeamId,
    scheduled_at: input.changes.startsAt ?? current.scheduled_at,
    venue: input.changes.venue === undefined ? current.venue : input.changes.venue?.trim() || null,
    status,
    home_score: homeScore,
    away_score: awayScore,
    stream_url: input.changes.streamUrl === undefined ? current.stream_url : input.changes.streamUrl,
    notes: input.changes.notes === undefined ? current.notes : input.changes.notes,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('games')
    .update(changes)
    .eq('id', input.matchId)
    .select('id, status, home_score, away_score')
    .single();
  if (error || !data) throw new LeagueOperationError(409, 'match_update_failed', error?.message || 'Unable to update match.');
  await logLeagueOperation(supabase, actor, {
    source: input.source,
    externalRequestId: input.externalRequestId,
    operation: 'match.update',
    resourceType: 'game',
    resourceId: input.matchId,
    payload: input.changes,
  });
  return data;
}
