import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import {
  exchangeRobloxCode,
  getRobloxUserInfo,
  getMkoaGroupPermission,
} from '@/lib/roblox-auth';
import {
  generateSessionToken,
  hashSessionToken,
  SESSION_COOKIE,
  SESSION_DURATION_SECONDS,
} from '@/lib/session';
import { safeInternalPath } from '@/lib/navigation';
import type { AdminPermission, UserRole } from '@/lib/pbal-types';
import { getRobloxUserByUsername } from '@/lib/roblox-users';

export const runtime = 'nodejs';

const OAUTH_COOKIES = [
  'pbal_oauth_state',
  'pbal_oauth_nonce',
  'pbal_oauth_verifier',
  'pbal_oauth_next',
];

function failed(origin: string, code: string) {
  const response = NextResponse.redirect(new URL(`/login?error=${code}`, origin));
  OAUTH_COOKIES.forEach((name) => response.cookies.delete(name));
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookies = new Map(
    cookieHeader.split(';').flatMap((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [];
      return [[part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1))]];
    }),
  );
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = cookies.get('pbal_oauth_state');
  const verifier = cookies.get('pbal_oauth_verifier');
  const nextPath = safeInternalPath(cookies.get('pbal_oauth_next'), '/');

  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return failed(url.origin, 'oauth-state');
  }

  const supabase = createAdminClient();
  if (!supabase) return failed(url.origin, 'not-configured');

  try {
    const token = await exchangeRobloxCode({ code, codeVerifier: verifier, origin: url.origin });
    const roblox = await getRobloxUserInfo(token.access_token);
    const username = roblox.preferred_username ?? roblox.nickname ?? roblox.name;
    if (!username || !/^\w{3,20}$/.test(username) || !/^\d+$/.test(roblox.sub)) {
      return failed(url.origin, 'invalid-profile');
    }

    const directoryProfile = await getRobloxUserByUsername(username).catch(() => null);
    const avatarUrl = directoryProfile?.avatarUrl ?? roblox.picture ?? null;

    const groupPermission = await getMkoaGroupPermission(roblox.sub);
    const groupMember = Boolean(groupPermission);
    const { data: existing } = await supabase
      .from('users')
      .select('role, admin_permission')
      .eq('roblox_id', roblox.sub)
      .maybeSingle<{ role: UserRole; admin_permission: AdminPermission | null }>();

    const privileged = existing?.role === 'staff' || existing?.role === 'admin';
    const franchiseOwner = existing?.role === 'franchise_owner';
    // Existing manual grants remain authoritative; otherwise map MKOA ranks.
    const role: UserRole = privileged
      ? existing.role
      : franchiseOwner
        ? 'franchise_owner'
        : groupPermission === 'group_holder' || groupPermission === 'admin'
        ? 'admin'
        : 'player';
    // Both PBAL leadership ranks are full web administrators. Group rank is
    // authoritative for these ranks so an earlier login cannot leave Admin
    // without the Staff controls.
    const adminPermission: AdminPermission | null =
      groupPermission === 'group_holder' || groupPermission === 'admin'
        ? 'super_admin'
        : privileged
          ? existing.admin_permission
          : null;

    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert(
        {
          roblox_id: roblox.sub,
          username,
          avatar_url: avatarUrl,
          group_member: groupMember,
          role,
          admin_permission: adminPermission,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: 'roblox_id' },
      )
      .select('id')
      .single<{ id: string }>();
    if (userError || !user) throw userError ?? new Error('Unable to create PBAL user.');

    // A Roblox login always creates or refreshes the public player identity.
    // No roster row is created here, so the player starts as a Free Agent and
    // only Staff can place them on a team.
    const playerIdentity = {
      user_id: user.id,
      roblox_username: username,
      roblox_user_id: roblox.sub,
      avatar_url: avatarUrl,
      is_active: true,
    };
    const { data: playerByRobloxId } = await supabase
      .from('players')
      .select('id')
      .eq('roblox_user_id', roblox.sub)
      .maybeSingle<{ id: string }>();
    const { data: playerByUsername } = playerByRobloxId
      ? { data: null }
      : await supabase
          .from('players')
          .select('id')
          .ilike('roblox_username', username)
          .maybeSingle<{ id: string }>();
    const existingPlayerId = playerByRobloxId?.id ?? playerByUsername?.id;
    const playerWrite = existingPlayerId
      ? await supabase.from('players').update(playerIdentity).eq('id', existingPlayerId)
      : await supabase.from('players').insert({
          ...playerIdentity,
          name: username,
          first_name: username,
          last_name: '',
          slug: `roblox-${roblox.sub}`,
          position: 'UTIL',
          positions: ['UTIL'],
          team_id: null,
        });
    if (playerWrite.error) throw playerWrite.error;

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);
    const { error: sessionError } = await supabase.from('auth_sessions').insert({
      user_id: user.id,
      token_hash: hashSessionToken(sessionToken),
      expires_at: expiresAt.toISOString(),
    });
    if (sessionError) throw sessionError;

    const response = NextResponse.redirect(new URL(nextPath, url.origin));
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });
    OAUTH_COOKIES.forEach((name) => response.cookies.delete(name));
    return response;
  } catch (error) {
    console.error('Roblox OAuth callback failed', error);
    return failed(url.origin, 'oauth-callback');
  }
}
