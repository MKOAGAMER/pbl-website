import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authenticateBotRequest, requireBotActor } from '@/lib/bot-auth';
import { updateLeagueMatch } from '@/lib/league-operations';
import { operationErrorResponse } from '@/lib/operation-error';

export const runtime = 'nodejs';

const changesSchema = z.object({
  homeTeamId: z.string().uuid().optional(),
  awayTeamId: z.string().uuid().optional(),
  startsAt: z.string().datetime().optional(),
  venue: z.string().trim().max(120).optional(),
  status: z.enum(['scheduled', 'live', 'final', 'postponed', 'cancelled']).optional(),
  homeScore: z.number().int().min(0).nullable().optional(),
  awayScore: z.number().int().min(0).nullable().optional(),
  streamUrl: z.union([z.literal(''), z.string().url().max(500), z.null()]).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  externalRequestId: z.string().trim().min(1).max(200).optional(),
}).refine((value) => Object.keys(value).some((key) => key !== 'externalRequestId'), 'At least one match field is required.');

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = authenticateBotRequest(request);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return Response.json({ error: 'Invalid match id' }, { status: 400 });
    const { data, error } = await supabase
      .from('games')
      .select('id, season_id, game_number, round_number, scheduled_at, venue, status, home_team_id, away_team_id, home_score, away_score, home_period_scores, away_period_scores, stream_url, highlights_url, notes, revision, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: 'Match not found' }, { status: 404 });
    return Response.json({ match: data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return operationErrorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = authenticateBotRequest(request);
    const actor = await requireBotActor(request, supabase);
    const { id } = await context.params;
    if (!z.string().uuid().safeParse(id).success) return Response.json({ error: 'Invalid match id' }, { status: 400 });
    const parsed = changesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: 'Invalid match update', issues: parsed.error.flatten() }, { status: 400 });
    const { externalRequestId, ...changes } = parsed.data;
    const match = await updateLeagueMatch(supabase, actor, {
      matchId: id,
      changes,
      source: 'bot_api',
      externalRequestId,
    });
    revalidateTag('pbal-site-data', { expire: 0 });
    revalidatePath('/games');
    revalidatePath(`/games/game-${id}`);
    revalidatePath('/admin/league');
    return Response.json({ match });
  } catch (error) {
    return operationErrorResponse(error);
  }
}
