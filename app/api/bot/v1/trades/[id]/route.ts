import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authenticateBotRequest, requireBotActor } from '@/lib/bot-auth';
import { reviewTradeRequest } from '@/lib/league-operations';
import { operationErrorResponse } from '@/lib/operation-error';

export const runtime = 'nodejs';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional().default(''),
  externalRequestId: z.string().trim().min(1).max(200).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = authenticateBotRequest(request);
    const actor = await requireBotActor(request, supabase);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return Response.json({ error: 'Invalid trade id' }, { status: 400 });
    const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: 'Invalid trade review', issues: parsed.error.flatten() }, { status: 400 });
    const trade = await reviewTradeRequest(supabase, actor, {
      tradeId: id,
      ...parsed.data,
      source: 'bot_api',
    });
    revalidateTag('pbal-site-data', { expire: 0 });
    revalidatePath('/trades');
    revalidatePath('/admin/trades');
    revalidatePath('/players');
    revalidatePath('/teams');
    return Response.json(trade);
  } catch (error) {
    return operationErrorResponse(error);
  }
}
