import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authenticateBotRequest, requireBotActor } from '@/lib/bot-auth';
import { createTradeRequest } from '@/lib/league-operations';
import { operationErrorResponse } from '@/lib/operation-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  playerId: z.string().uuid(),
  toTeamId: z.string().uuid(),
  requestKind: z.enum(['acquire', 'release', 'transfer']),
  notes: z.string().trim().max(500).optional().default(''),
  externalRequestId: z.string().trim().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = authenticateBotRequest(request);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 300);
    let query = supabase
      .from('trades')
      .select('id, player_id, from_team_id, to_team_id, trade_date, status, request_kind, notes, review_note, created_by, reviewed_by, created_at, reviewed_at, source')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ trades: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return operationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = authenticateBotRequest(request);
    const actor = await requireBotActor(request, supabase);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return Response.json({ error: 'Invalid trade request', issues: parsed.error.flatten() }, { status: 400 });
    }
    const trade = await createTradeRequest(supabase, actor, {
      ...parsed.data,
      source: 'bot_api',
    });
    revalidateTag('pbal-site-data', { expire: 0 });
    revalidatePath('/trades');
    revalidatePath('/admin/trades');
    return Response.json(trade, { status: trade.duplicate ? 200 : 201 });
  } catch (error) {
    return operationErrorResponse(error);
  }
}
