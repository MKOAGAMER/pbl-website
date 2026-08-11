import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createTradeRequest } from '@/lib/league-operations';
import { operationErrorResponse } from '@/lib/operation-error';
import { isSameOriginRequest } from '@/lib/request-security';
import { getCurrentUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-admin';

const requestSchema = z.object({
  playerId: z.string().uuid(),
  toTeamId: z.string().uuid().nullable(),
  requestKind: z.enum(['acquire', 'release', 'transfer']),
  notes: z.string().trim().max(500).optional().default(''),
});

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  const [user, supabase] = await Promise.all([
    getCurrentUser(),
    Promise.resolve(createAdminClient()),
  ]);
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนยื่นคำขอ' }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'ระบบฐานข้อมูลยังไม่พร้อมใช้งาน' }, { status: 503 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลคำขอไม่ถูกต้อง' }, { status: 400 });

  try {
    const trade = await createTradeRequest(supabase, user, {
      ...parsed.data,
      source: 'web',
    });
    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    return operationErrorResponse(error);
  }
}
