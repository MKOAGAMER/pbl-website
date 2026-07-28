import { getSiteData } from '@/lib/league-data';

export async function GET() {
  const data = await getSiteData();
  const databaseReady = data.source === 'supabase';
  const seasonReady = databaseReady && data.season.id !== 'unpublished';

  return Response.json(
    {
      ok: databaseReady,
      databaseReady,
      seasonReady,
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
      status: databaseReady ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
