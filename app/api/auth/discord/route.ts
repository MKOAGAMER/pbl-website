import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { createOAuthSecret } from '@/lib/roblox-auth';
import { buildDiscordAuthorizeUrl, isDiscordAuthConfigured } from '@/lib/discord-auth';
import { safeInternalPath } from '@/lib/navigation';
import { getSiteUrl } from '@/lib/site-url';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const canonicalUrl = new URL(getSiteUrl());
  if (process.env.NODE_ENV === 'production' && url.origin !== canonicalUrl.origin) {
    const destination = new URL('/api/auth/discord', canonicalUrl);
    const requestedNext = url.searchParams.get('next');
    if (requestedNext) destination.searchParams.set('next', requestedNext);
    return NextResponse.redirect(destination);
  }
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login?next=/account', url.origin));
  if (!isDiscordAuthConfigured()) return NextResponse.redirect(new URL('/account?error=discord-not-configured', url.origin));

  const state = createOAuthSecret();
  const nextPath = safeInternalPath(url.searchParams.get('next'), '/account');
  const response = NextResponse.redirect(buildDiscordAuthorizeUrl(url.origin, state));
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 10 * 60,
  };
  response.cookies.set('pbal_discord_state', state, options);
  response.cookies.set('pbal_discord_next', nextPath, options);
  return response;
}
