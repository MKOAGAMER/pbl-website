import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authenticateBotRequest, requireBotActor } from '@/lib/bot-auth';
import { createDisciplinaryAction, DISCIPLINE_ACTION_TYPES, getDisciplinaryActions } from '@/lib/discipline';
import { operationErrorResponse } from '@/lib/operation-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  playerId: z.string().uuid(),
  actionType: z.enum(DISCIPLINE_ACTION_TYPES),
  reason: z.string().trim().min(3).max(2000),
  publicNote: z.string().trim().max(1000).optional().default(''),
  evidenceUrl: z.union([z.literal(''), z.string().url().max(500)]).optional().default(''),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  isPublic: z.boolean().optional(),
  externalRequestId: z.string().trim().min(1).max(200).optional(),
}).refine((value) => !value.endsAt || !value.startsAt || value.endsAt > value.startsAt, {
  message: 'endsAt must be after startsAt', path: ['endsAt'],
}).refine((value) => !value.isPublic || value.publicNote.length >= 3, {
  message: 'publicNote is required when isPublic is true', path: ['publicNote'],
});

export async function GET(request: Request) {
  try {
    const supabase = authenticateBotRequest(request);
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId') ?? undefined;
    const activeOnly = url.searchParams.get('active') !== 'false';
    if (playerId && !z.string().uuid().safeParse(playerId).success) return Response.json({ error: 'Invalid player id' }, { status: 400 });
    const actions = await getDisciplinaryActions(supabase, { playerId, activeOnly, limit: 500 });
    return Response.json({ actions }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return operationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = authenticateBotRequest(request);
    const actor = await requireBotActor(request, supabase);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: 'Invalid punishment', issues: parsed.error.flatten() }, { status: 400 });
    const action = await createDisciplinaryAction(supabase, actor, { ...parsed.data, source: 'bot_api' });
    revalidatePath('/blacklist');
    revalidatePath('/admin/discipline');
    revalidatePath('/trades');
    return Response.json({ action }, { status: 201 });
  } catch (error) {
    return operationErrorResponse(error);
  }
}
