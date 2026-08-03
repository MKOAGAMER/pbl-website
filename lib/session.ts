import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createAdminClient } from './supabase-admin';
import type { PbalUser } from './pbal-types';
import { hasActiveDiscipline } from './discipline';

export const SESSION_COOKIE = 'pbal_session';
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

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

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateSessionToken() {
  return randomBytes(32).toString('base64url');
}

function toUser(row: UserRow): PbalUser {
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

export const getCurrentUser = cache(async (): Promise<PbalUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const supabase = createAdminClient();
  if (!token || !supabase) return null;

  const { data: session } = await supabase
    .from('auth_sessions')
    .select('user_id, expires_at, revoked_at')
    .eq('token_hash', hashSessionToken(token))
    .maybeSingle();

  if (
    !session ||
    session.revoked_at ||
    new Date(session.expires_at).getTime() <= Date.now()
  ) {
    return null;
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, roblox_id, username, avatar_url, role, group_member, admin_permission, franchise_team_id, discord_id, discord_username, discord_avatar_url')
    .eq('id', session.user_id)
    .maybeSingle<UserRow>();

  if (!user) return null;

  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string }>();
  if (!playerError && player) {
    try {
      if (await hasActiveDiscipline(supabase, player.id, ['account_ban', 'blacklist'])) {
        return null;
      }
    } catch (error) {
      // Keep existing accounts usable during a rolling deployment where the
      // application may become live immediately before the migration finishes.
      console.error('[session:discipline-check]', error instanceof Error ? error.message : error);
    }
  }

  return toUser(user);
});

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const supabase = createAdminClient();

  if (token && supabase) {
    await supabase
      .from('auth_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashSessionToken(token));
  }

  cookieStore.delete(SESSION_COOKIE);
}
