import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { discordAvatarUrl, exchangeDiscordCode, getDiscordUserInfo } from '@/lib/discord-auth';
import { getCurrentUser } from '@/lib/session';
import { safeInternalPath } from '@/lib/navigation';

export const runtime = 'nodejs';

function clearDiscordCookies(response: NextResponse) {
  response.cookies.delete('pbal_discord_state');
  response.cookies.delete('pbal_discord_next');
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getCurrentUser();
  if (!user) return clearDiscordCookies(NextResponse.redirect(new URL('/login?next=/account', url.origin)));

  const cookieHeader = request.headers.get('cookie') ?? '';
  const cookieMap = new Map(cookieHeader.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return [];
    return [[part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1))]];
  }));
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = cookieMap.get('pbal_discord_state');
  const nextPath = safeInternalPath(cookieMap.get('pbal_discord_next'), '/account');
  if (!code || !state || !expectedState || state !== expectedState) {
    return clearDiscordCookies(NextResponse.redirect(new URL('/account?error=discord-state', url.origin)));
  }

  const supabase = createAdminClient();
  if (!supabase) return clearDiscordCookies(NextResponse.redirect(new URL('/account?error=not-configured', url.origin)));

  try {
    const token = await exchangeDiscordCode(code, url.origin);
    const discord = await getDiscordUserInfo(token.access_token);
    if (!/^\d+$/.test(discord.id) || !discord.username) throw new Error('Discord returned an invalid profile.');
    const { error } = await supabase.from('users').update({
      discord_id: discord.id,
      discord_username: discord.global_name?.trim() || discord.username,
      discord_avatar_url: discordAvatarUrl(discord),
      discord_connected_at: new Date().toISOString(),
    }).eq('id', user.id);
    if (error) throw error;
    return clearDiscordCookies(NextResponse.redirect(new URL(`${nextPath}${nextPath.includes('?') ? '&' : '?'}connected=discord`, url.origin)));
  } catch (error) {
    console.error('[discord-oauth]', error instanceof Error ? error.message : error);
    return clearDiscordCookies(NextResponse.redirect(new URL('/account?error=discord-callback', url.origin)));
  }
}
