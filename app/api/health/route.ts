import { getSiteData } from '@/lib/league-data';
import { createAdminClient } from '@/lib/supabase-admin';
import { isRobloxAuthConfigured } from '@/lib/roblox-auth';
import { getCloudinaryConfig } from '@/lib/cloudinary';
import { isBotApiConfigured } from '@/lib/bot-auth';
import { isDiscordInteractionsConfigured } from '@/lib/discord-interactions';
import { getPublicTournaments } from '@/lib/tournament-data';

export async function GET() {
  const supabase = createAdminClient();
  const [data, foundationResult, tournaments] = await Promise.all([
    getSiteData(),
    supabase
      ? supabase.from('site_config').select('id').eq('id', 'main').maybeSingle()
      : Promise.resolve({ data: null, error: new Error('Supabase service role is not configured.') }),
    getPublicTournaments(),
  ]);
  const databaseReady = data.source === 'supabase';
  const foundationReady = Boolean(foundationResult.data && !foundationResult.error);
  const seasonReady = databaseReady && data.season.id !== 'unpublished';
  const tournamentReady = tournaments.length > 0;
  const mode = seasonReady ? 'league' : tournamentReady ? 'tournament-only' : 'setup';
  const ok = databaseReady && foundationReady;

  return Response.json(
    {
      ok,
      databaseReady,
      foundationReady,
      seasonReady,
      tournamentReady,
      mode,
      robloxAuthReady: isRobloxAuthConfigured(),
      botApiReady: isBotApiConfigured(),
      discordInteractionsReady: isDiscordInteractionsConfigured(),
      integrationSetup: {
        botApi: isBotApiConfigured() ? [] : ['PBAL_BOT_API_SECRET'],
        discordInteractions: isDiscordInteractionsConfigured() ? [] : ['DISCORD_PUBLIC_KEY'],
      },
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
