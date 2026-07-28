import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { safeInternalPath } from '@/lib/navigation';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next');
  const nextPath = safeInternalPath(requestedNext, '/admin');
  const supabase = await createClient();

  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(nextPath, url.origin));
  }

  return NextResponse.redirect(
    new URL('/login?error=auth-callback', url.origin),
  );
}
