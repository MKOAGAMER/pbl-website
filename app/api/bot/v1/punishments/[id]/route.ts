import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authenticateBotRequest, requireBotActor } from '@/lib/bot-auth';
import { revokeDisciplinaryAction } from '@/lib/discipline';
import { operationErrorResponse } from '@/lib/operation-error';

export const runtime = 'nodejs';

const revokeSchema = z.object({
  reason: z.string().trim().min(3).max(1000),
  externalRequestId: z.string().trim().min(1).max(200).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = authenticateBotRequest(request);
    const actor = await requireBotActor(request, supabase);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return Response.json({ error: 'Invalid punishment id' }, { status: 400 });
    const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: 'Invalid revocation', issues: parsed.error.flatten() }, { status: 400 });
    const action = await revokeDisciplinaryAction(supabase, actor, {
      actionId: id,
      ...parsed.data,
      source: 'bot_api',
    });
    revalidatePath('/blacklist');
    revalidatePath('/admin/discipline');
    return Response.json({ action });
  } catch (error) {
    return operationErrorResponse(error);
  }
}
