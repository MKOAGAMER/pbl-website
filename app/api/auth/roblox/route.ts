import { NextResponse } from 'next/server';
import { safeInternalPath } from '@/lib/navigation';
import {
  buildRobloxAuthorizeUrl,
  createCodeChallenge,
  createOAuthSecret,
  isRobloxAuthConfigured,
} from '@/lib/roblox-auth';

export const runtime = 'nodejs';

const OAUTH_COOKIE_MAX_AGE = 60 * 10;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  if (!isRobloxAuthConfigured()) {
    return NextResponse.redirect(new URL('/login?error=not-configured', requestUrl.origin));
  }

  const state = createOAuthSecret();
  const nonce = createOAuthSecret();
  const verifier = createOAuthSecret(48);
  const nextPath = safeInternalPath(requestUrl.searchParams.get('next'), '/');
  const authorizeUrl = buildRobloxAuthorizeUrl({
    origin: requestUrl.origin,
    state,
    nonce,
    codeChallenge: createCodeChallenge(verifier),
  });
  const response = NextResponse.redirect(authorizeUrl);
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: OAUTH_COOKIE_MAX_AGE,
  };

  response.cookies.set('pbal_oauth_state', state, options);
  response.cookies.set('pbal_oauth_nonce', nonce, options);
  response.cookies.set('pbal_oauth_verifier', verifier, options);
  response.cookies.set('pbal_oauth_next', nextPath, options);
  return response;
}

