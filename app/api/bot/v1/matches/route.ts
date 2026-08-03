import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { authenticateBotRequest, requireBotActor } from '@/lib/bot-auth';
import { scheduleLeagueMatch } from '@/lib/league-operations';
import { operationErrorResponse } from '@/lib/operation-error';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const scheduleSchema = z.object({
  seasonId: z.string().uuid(),
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  startsAt: z.string().datetime(),
  venue: z.string().trim().max(120).optional().default(''),
  externalRequestId: z.string().trim().min(1).max(200).optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = authenticateBotRequest(request);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const seasonId = url.searchParams.get('seasonId');
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 300);
    let query = supabase
      .from('games')
      .select('id, season_id, game_number, round_number, scheduled_at, venue, status, home_team_id, away_team_id, home_score, away_score, stream_url, notes, revision, updated_at')
      .order('scheduled_at', { ascending: false })
      .limit(limit);
    if (status && ['scheduled', 'live', 'final', 'postponed', 'cancelled'].includes(status)) query = query.eq('status', status);
    if (seasonId && z.string().uuid().safeParse(seasonId).success) query = query.eq('season_id', seasonId);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json({ matches: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return operationErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = authenticateBotRequest(request);
    const actor = await requireBotActor(request, supabase);
    const parsed = scheduleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: 'Invalid match schedule', issues: parsed.error.flatten() }, { status: 400 });
    const match = await scheduleLeagueMatch(supabase, actor, { ...parsed.data, source: 'bot_api' });
    revalidateTag('pbal-site-data', { expire: 0 });
    revalidatePath('/games');
    revalidatePath('/admin/league');
    return Response.json(match, { status: match.duplicate ? 200 : 201 });
  } catch (error) {
    return operationErrorResponse(error);
  }
}
