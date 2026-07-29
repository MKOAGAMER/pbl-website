import { getSiteData } from '@/lib/league-data';
import { createAdminClient } from '@/lib/supabase-admin';
import { isRobloxAuthConfigured } from '@/lib/roblox-auth';
import { getCloudinaryConfig } from '@/lib/cloudinary';

export async function GET() {
  const supabase = createAdminClient();
  const [data, foundationResult] = await Promise.all([
    getSiteData(),
    supabase
      ? supabase.from('site_config').select('id').eq('id', 'main').maybeSingle()
      : Promise.resolve({ data: null, error: new Error('Supabase service role is not configured.') }),
  ]);
  const databaseReady = data.source === 'supabase';
  const foundationReady = Boolean(foundationResult.data && !foundationResult.error);
  const seasonReady = databaseReady && data.season.id !== 'unpublished';
  const ok = databaseReady && foundationReady;

  return Response.json(
    {
      ok,
      databaseReady,
      foundationReady,
      seasonReady,
      robloxAuthReady: isRobloxAuthConfigured(),
      cloudinaryReady: Boolean(getCloudinaryConfig()),
      dataSource: data.source,
      season: data.season.slug,
      counts: {
        teams: data.teams.length,
        players: data.players.length,
        games: data.games.length,
        news: data.news.length,
      },
      checkedAt: new Date().toISOString(),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
