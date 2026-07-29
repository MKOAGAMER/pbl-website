import { NextResponse } from 'next/server';
import { isAppLocale } from '@/i18n/config';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { locale?: string } | null;
  if (!isAppLocale(body?.locale)) return Response.json({ error: 'Unsupported locale.' }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('pbal_locale', body.locale, {
    path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

