import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

const ROBLOX_AUTHORIZE_URL = 'https://apis.roblox.com/oauth/v1/authorize';
const ROBLOX_TOKEN_URL = 'https://apis.roblox.com/oauth/v1/token';
const ROBLOX_USERINFO_URL = 'https://apis.roblox.com/oauth/v1/userinfo';
export const MKOA_COMMUNITY_ID = 9515965;

export type RobloxUserInfo = {
  sub: string;
  name?: string;
  nickname?: string;
  preferred_username?: string;
  picture?: string | null;
};

type RobloxTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

function requiredRobloxConfig() {
  const clientId = process.env.ROBLOX_CLIENT_ID?.trim();
  const clientSecret = process.env.ROBLOX_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error('Roblox OAuth is not configured.');
  }
  return { clientId, clientSecret };
}

export function isRobloxAuthConfigured() {
  return Boolean(
    process.env.ROBLOX_CLIENT_ID?.trim() &&
      process.env.ROBLOX_CLIENT_SECRET?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export function createOAuthSecret(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function createCodeChallenge(verifier: string) {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function getRobloxRedirectUri(origin: string) {
  return (
    process.env.ROBLOX_REDIRECT_URI?.trim() ||
    `${origin.replace(/\/+$/, '')}/api/auth/roblox/callback`
  );
}

export function buildRobloxAuthorizeUrl(input: {
  origin: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) {
  const { clientId } = requiredRobloxConfig();
  const url = new URL(ROBLOX_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', getRobloxRedirectUri(input.origin));
  url.searchParams.set('scope', 'openid profile');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', input.state);
  url.searchParams.set('nonce', input.nonce);
  url.searchParams.set('code_challenge', input.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url;
}

export async function exchangeRobloxCode(input: {
  code: string;
  codeVerifier: string;
  origin: string;
}) {
  const { clientId, clientSecret } = requiredRobloxConfig();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code: input.code,
    code_verifier: input.codeVerifier,
    redirect_uri: getRobloxRedirectUri(input.origin),
  });

  const response = await fetch(ROBLOX_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Roblox token exchange failed (${response.status}).`);
  return (await response.json()) as RobloxTokenResponse;
}

export async function getRobloxUserInfo(accessToken: string) {
  const response = await fetch(ROBLOX_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Roblox user info failed (${response.status}).`);
  return (await response.json()) as RobloxUserInfo;
}

export async function isMkoaGroupMember(robloxId: string) {
  let cursor = '';
  for (let page = 0; page < 10; page += 1) {
    const url = new URL(
      `https://groups.roblox.com/v2/users/${encodeURIComponent(robloxId)}/groups/roles`,
    );
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as {
      data?: Array<{ group?: { id?: number | string } }>;
      nextPageCursor?: string | null;
    };
    if (payload.data?.some((membership) => Number(membership.group?.id) === MKOA_COMMUNITY_ID)) {
      return true;
    }
    if (!payload.nextPageCursor) return false;
    cursor = payload.nextPageCursor;
  }
  return false;
}
