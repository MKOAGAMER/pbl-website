import { authenticateBotRequest } from '@/lib/bot-auth';
import { getDisciplinaryActions } from '@/lib/discipline';
import { getSiteData } from '@/lib/league-data';
import { operationErrorResponse } from '@/lib/operation-error';
import { getPublicTournaments } from '@/lib/tournament-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = authenticateBotRequest(request);
    const [site, tournaments, activeDiscipline] = await Promise.all([
      getSiteData(),
      getPublicTournaments(),
      getDisciplinaryActions(supabase, { activeOnly: true, limit: 500 }),
    ]);
    return Response.json({
      generatedAt: new Date().toISOString(),
      season: site.season,
      seasons: site.seasons,
      teams: site.teams,
      players: site.players,
      matches: site.games,
      tournaments,
      news: site.news,
      accolades: site.accolades,
      staff: site.staff,
      links: site.links,
      activeDiscipline,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return operationErrorResponse(error);
  }
}
