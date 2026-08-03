import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { requireOperationPermission } from './league-authorization';
import { LeagueOperationError } from './operation-error';
import type { PbalUser } from './pbal-types';

export const DISCIPLINE_ACTION_TYPES = [
  'warning',
  'match_suspension',
  'trade_ban',
  'account_ban',
  'blacklist',
] as const;

export type DisciplineActionType = (typeof DISCIPLINE_ACTION_TYPES)[number];
export type OperationSource = 'web' | 'discord_bot' | 'bot_api' | 'system';

export type DisciplinaryActionRecord = {
  id: string;
  playerId: string;
  actionType: DisciplineActionType;
  reason: string;
  publicNote: string | null;
  evidenceUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  isPublic: boolean;
  issuedBy: string | null;
  source: OperationSource;
  revokedAt: string | null;
  revokedBy: string | null;
  revocationReason: string | null;
  createdAt: string;
  isActive: boolean;
};

type Row = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function nullableText(value: unknown) {
  const parsed = text(value);
  return parsed || null;
}

export function isActionActive(row: {
  startsAt: string;
  endsAt: string | null;
  revokedAt: string | null;
}, now = Date.now()) {
  return !row.revokedAt
    && new Date(row.startsAt).getTime() <= now
    && (!row.endsAt || new Date(row.endsAt).getTime() > now);
}

export function mapDisciplinaryAction(row: Row): DisciplinaryActionRecord {
  const action = {
    id: text(row.id),
    playerId: text(row.player_id),
    actionType: text(row.action_type) as DisciplineActionType,
    reason: text(row.reason),
    publicNote: nullableText(row.public_note),
    evidenceUrl: nullableText(row.evidence_url),
    startsAt: text(row.starts_at),
    endsAt: nullableText(row.ends_at),
    isPublic: row.is_public === true,
    issuedBy: nullableText(row.issued_by),
    source: text(row.source) as OperationSource,
    revokedAt: nullableText(row.revoked_at),
    revokedBy: nullableText(row.revoked_by),
    revocationReason: nullableText(row.revocation_reason),
    createdAt: text(row.created_at),
  };
  return { ...action, isActive: isActionActive(action) };
}

export async function getDisciplinaryActions(
  supabase: SupabaseClient,
  options: { playerId?: string; activeOnly?: boolean; limit?: number } = {},
) {
  let query = supabase
    .from('player_disciplinary_actions')
    .select('id, player_id, action_type, reason, public_note, evidence_url, starts_at, ends_at, is_public, issued_by, source, revoked_at, revoked_by, revocation_reason, created_at')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(options.limit ?? 200, 1), 500));
  if (options.playerId) query = query.eq('player_id', options.playerId);
  if (options.activeOnly) {
    const now = new Date().toISOString();
    query = query.is('revoked_at', null).lte('starts_at', now).or(`ends_at.is.null,ends_at.gt.${now}`);
  }
  const { data, error } = await query;
  if (error) throw new LeagueOperationError(503, 'discipline_unavailable', error.message);
  return ((data ?? []) as Row[]).map(mapDisciplinaryAction);
}

export async function hasActiveDiscipline(
  supabase: SupabaseClient,
  playerId: string,
  actionTypes: DisciplineActionType[],
) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('player_disciplinary_actions')
    .select('id')
    .eq('player_id', playerId)
    .in('action_type', actionTypes)
    .is('revoked_at', null)
    .lte('starts_at', now)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .limit(1)
    .maybeSingle();
  if (error) throw new LeagueOperationError(503, 'discipline_unavailable', error.message);
  return Boolean(data);
}

export async function createDisciplinaryAction(
  supabase: SupabaseClient,
  actor: PbalUser,
  input: {
    playerId: string;
    actionType: DisciplineActionType;
    reason: string;
    publicNote?: string;
    evidenceUrl?: string;
    startsAt?: string;
    endsAt?: string | null;
    isPublic?: boolean;
    source: OperationSource;
    externalRequestId?: string;
  },
) {
  requireOperationPermission(actor, 'staff');
  if (input.isPublic && (input.publicNote?.trim().length ?? 0) < 3) {
    throw new LeagueOperationError(400, 'public_note_required', 'A public note is required for a public disciplinary action.');
  }
  const startsAt = input.startsAt || new Date().toISOString();
  const startsAtTime = new Date(startsAt).getTime();
  const endsAtTime = input.endsAt ? new Date(input.endsAt).getTime() : null;
  if (!Number.isFinite(startsAtTime) || (endsAtTime !== null && (!Number.isFinite(endsAtTime) || endsAtTime <= startsAtTime))) {
    throw new LeagueOperationError(400, 'invalid_discipline_dates', 'Disciplinary action end time must be after its start time.');
  }
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('id', input.playerId)
    .maybeSingle();
  if (playerError) throw new LeagueOperationError(503, 'database_unavailable', playerError.message);
  if (!player) throw new LeagueOperationError(404, 'player_not_found', 'Player was not found.');

  if (input.externalRequestId) {
    const { data: existing } = await supabase
      .from('player_disciplinary_actions')
      .select('id, player_id, action_type, reason, public_note, evidence_url, starts_at, ends_at, is_public, issued_by, source, revoked_at, revoked_by, revocation_reason, created_at')
      .eq('source', input.source)
      .eq('external_request_id', input.externalRequestId)
      .maybeSingle();
    if (existing) return mapDisciplinaryAction(existing as Row);
  }

  const { data, error } = await supabase
    .from('player_disciplinary_actions')
    .insert({
      player_id: input.playerId,
      action_type: input.actionType,
      reason: input.reason,
      public_note: input.publicNote?.trim() || null,
      evidence_url: input.evidenceUrl?.trim() || null,
      starts_at: startsAt,
      ends_at: input.endsAt || null,
      is_public: input.isPublic ?? false,
      issued_by: actor.id,
      source: input.source,
      external_request_id: input.externalRequestId || null,
    })
    .select('id, player_id, action_type, reason, public_note, evidence_url, starts_at, ends_at, is_public, issued_by, source, revoked_at, revoked_by, revocation_reason, created_at')
    .single();
  if (error || !data) {
    throw new LeagueOperationError(409, 'discipline_create_failed', error?.message || 'Unable to create disciplinary action.');
  }
  await logLeagueOperation(supabase, actor, {
    source: input.source,
    externalRequestId: input.externalRequestId,
    operation: 'discipline.create',
    resourceType: 'player_disciplinary_action',
    resourceId: String(data.id),
    payload: { playerId: input.playerId, actionType: input.actionType },
  });
  return mapDisciplinaryAction(data as Row);
}

export async function revokeDisciplinaryAction(
  supabase: SupabaseClient,
  actor: PbalUser,
  input: {
    actionId: string;
    reason: string;
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
      .eq('operation', 'discipline.revoke')
      .maybeSingle();
    if (audit?.resource_id) {
      const { data: existing } = await supabase
        .from('player_disciplinary_actions')
        .select('id, player_id, action_type, reason, public_note, evidence_url, starts_at, ends_at, is_public, issued_by, source, revoked_at, revoked_by, revocation_reason, created_at')
        .eq('id', audit.resource_id)
        .maybeSingle();
      if (existing) return mapDisciplinaryAction(existing as Row);
    }
  }
  const { data, error } = await supabase
    .from('player_disciplinary_actions')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: actor.id,
      revocation_reason: input.reason,
    })
    .eq('id', input.actionId)
    .is('revoked_at', null)
    .select('id, player_id, action_type, reason, public_note, evidence_url, starts_at, ends_at, is_public, issued_by, source, revoked_at, revoked_by, revocation_reason, created_at')
    .maybeSingle();
  if (error) throw new LeagueOperationError(409, 'discipline_revoke_failed', error.message);
  if (!data) throw new LeagueOperationError(404, 'discipline_not_active', 'Active disciplinary action was not found.');
  await logLeagueOperation(supabase, actor, {
    source: input.source,
    externalRequestId: input.externalRequestId,
    operation: 'discipline.revoke',
    resourceType: 'player_disciplinary_action',
    resourceId: input.actionId,
    payload: { reason: input.reason },
  });
  return mapDisciplinaryAction(data as Row);
}

export async function logLeagueOperation(
  supabase: SupabaseClient,
  actor: PbalUser,
  input: {
    source: OperationSource;
    externalRequestId?: string;
    operation: string;
    resourceType: string;
    resourceId?: string;
    payload?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from('league_operation_log').insert({
    source: input.source,
    external_request_id: input.externalRequestId || null,
    actor_user_id: actor.id,
    actor_discord_id: actor.discordId,
    operation: input.operation,
    resource_type: input.resourceType,
    resource_id: input.resourceId || null,
    payload: input.payload ?? {},
  });
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    console.error('[league-operation:audit]', error.message);
  }
}
