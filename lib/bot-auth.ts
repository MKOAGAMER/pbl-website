import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { hasActiveDiscipline } from './discipline';
import { LeagueOperationError } from './operation-error';
import type { PbalUser } from './pbal-types';
import { createAdminClient } from './supabase-admin';

type UserRow = {
  id: string;
  roblox_id: number | string;
  username: string;
  avatar_url: string | null;
  role: PbalUser['role'];
  group_member: boolean;
  admin_permission: PbalUser['adminPermission'];
  franchise_team_id: string | null;
  discord_id: number | string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
};

function safeSecretEqual(value: string, expected: string) {
  const left = createHash('sha256').update(value).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';
  return authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : request.headers.get('x-pbal-bot-secret')?.trim() ?? '';
}

export function isBotApiConfigured() {
  const secret = process.env.PBAL_BOT_API_SECRET?.trim();
  return Boolean(secret && secret.length >= 32);
}

export function authenticateBotRequest(request: Request) {
  const expected = process.env.PBAL_BOT_API_SECRET?.trim();
  if (!expected || expected.length < 32) {
    throw new LeagueOperationError(503, 'bot_api_not_configured', 'Bot API is not configured.');
  }
  if (!safeSecretEqual(bearerToken(request), expected)) {
    throw new LeagueOperationError(401, 'invalid_bot_credentials', 'Invalid bot API credentials.');
  }
  const supabase = createAdminClient();
  if (!supabase) {
    throw new LeagueOperationError(503, 'database_not_configured', 'Supabase service role is not configured.');
  }
  return supabase;
}

function toPbalUser(row: UserRow): PbalUser {
  return {
    id: row.id,
    robloxId: String(row.roblox_id),
    username: row.username,
    avatarUrl: row.avatar_url,
    role: row.role,
    groupMember: row.group_member,
    adminPermission: row.admin_permission,
    franchiseTeamId: row.franchise_team_id,
    discordId: row.discord_id === null ? null : String(row.discord_id),
    discordUsername: row.discord_username,
    discordAvatarUrl: row.discord_avatar_url,
  };
}

export async function getDiscordActor(
  supabase: SupabaseClient,
  discordId: string,
) {
  if (!/^\d{15,22}$/.test(discordId)) {
    throw new LeagueOperationError(400, 'invalid_discord_actor', 'Discord user id is invalid.');
  }
  const { data, error } = await supabase
    .from('users')
    .select('id, roblox_id, username, avatar_url, role, group_member, admin_permission, franchise_team_id, discord_id, discord_username, discord_avatar_url')
    .eq('discord_id', discordId)
    .maybeSingle<UserRow>();
  if (error) throw new LeagueOperationError(503, 'database_unavailable', error.message);
  if (!data) {
    throw new LeagueOperationError(
      403,
      'discord_not_linked',
      'Discord account is not linked to a PBAL account. Link it from the Account page first.',
    );
  }

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', data.id)
    .maybeSingle<{ id: string }>();
  if (playerError) throw new LeagueOperationError(503, 'database_unavailable', playerError.message);
  if (player && await hasActiveDiscipline(supabase, player.id, ['account_ban', 'blacklist'])) {
    throw new LeagueOperationError(403, 'account_suspended', 'This PBAL account is currently suspended.');
  }
  return toPbalUser(data);
}

export async function requireBotActor(request: Request, supabase: SupabaseClient) {
  const discordId = request.headers.get('x-discord-user-id')?.trim() ?? '';
  return getDiscordActor(supabase, discordId);
}
