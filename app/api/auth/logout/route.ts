import { NextResponse } from 'next/server';
import { revokeCurrentSession } from '@/lib/session';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: 'Invalid origin.' }, { status: 403 });
  }

  await revokeCurrentSession();
  return NextResponse.json({ ok: true });
}

