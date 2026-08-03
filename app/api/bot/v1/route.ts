import { authenticateBotRequest } from '@/lib/bot-auth';
import { operationErrorResponse } from '@/lib/operation-error';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    authenticateBotRequest(request);
    return Response.json({
      name: 'PBAL Bot API',
      version: 'v1',
      actorHeader: 'x-discord-user-id',
      endpoints: {
        snapshot: '/api/bot/v1/snapshot',
        matches: '/api/bot/v1/matches',
        trades: '/api/bot/v1/trades',
        punishments: '/api/bot/v1/punishments',
      },
      discordInteractions: '/api/discord/interactions',
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return operationErrorResponse(error);
  }
}
