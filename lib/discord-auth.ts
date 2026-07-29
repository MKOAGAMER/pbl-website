import 'server-only';

import { getSiteUrl } from './site-url';

const DISCORD_AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/v10/oauth2/token';
const DISCORD_ME_URL = 'https://discord.com/api/v10/users/@me';

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

export type DiscordUserInfo = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

function requiredDiscordConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID?.trim();
  const clientSecret = process.env.DISCORD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Discord Application OAuth is not configured.');
  return { clientId, clientSecret };
}

export function isDiscordAuthConfigured() {
  return Boolean(process.env.DISCORD_CLIENT_ID?.trim() && process.env.DISCORD_CLIENT_SECRET?.trim());
}

export function getDiscordRedirectUri(origin: string) {
  const configured = process.env.DISCORD_REDIRECT_URI?.trim();
  if (configured) return configured;

  const requestOrigin = origin.replace(/\/+$/, '');
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin);
  const baseUrl = process.env.NODE_ENV !== 'production' && isLocal
    ? requestOrigin
    : getSiteUrl();
  return `${baseUrl.replace(/\/+$/, '')}/api/auth/discord/callback`;
}

export function buildDiscordAuthorizeUrl(origin: string, state: string) {
  const { clientId } = requiredDiscordConfig();
  const url = new URL(DISCORD_AUTHORIZE_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', getDiscordRedirectUri(origin));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'consent');
  return url;
}

export async function exchangeDiscordCode(code: string, origin: string) {
  const { clientId, clientSecret } = requiredDiscordConfig();
  const response = await fetch(DISCORD_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: getDiscordRedirectUri(origin),
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Discord token exchange failed (${response.status}).`);
  return (await response.json()) as DiscordTokenResponse;
}

export async function getDiscordUserInfo(accessToken: string) {
  const response = await fetch(DISCORD_ME_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Discord user lookup failed (${response.status}).`);
  return (await response.json()) as DiscordUserInfo;
}

export function discordAvatarUrl(user: DiscordUserInfo) {
  if (!user.avatar) return null;
  const extension = user.avatar.startsWith('a_') ? 'gif' : 'png';
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=160`;
}
