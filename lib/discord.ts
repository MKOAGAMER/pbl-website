import 'server-only';

type DiscordEmbed = {
  title: string;
  description?: string;
  url?: string;
  color?: number;
  thumbnail?: { url: string };
  image?: { url: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
  footer?: { text: string };
};

export type DiscordNotificationChannel = 'announcement' | 'match_result' | 'trade' | 'discipline';
type DiscordNotificationOptions = {
  content?: string;
  allowEveryone?: boolean;
  userIds?: string[];
};

const webhookEnvironmentVariables: Record<DiscordNotificationChannel, string> = {
  announcement: 'DISCORD_ANNOUNCEMENT_WEBHOOK_URL',
  match_result: 'DISCORD_MATCH_RESULT_WEBHOOK_URL',
  trade: 'DISCORD_TRADE_WEBHOOK_URL',
  discipline: 'DISCORD_DISCIPLINE_WEBHOOK_URL',
};

function getWebhookUrl(channel: DiscordNotificationChannel) {
  const environmentVariable = webhookEnvironmentVariables[channel];
  const webhookUrl = process.env[environmentVariable]?.trim()
    || process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    throw new Error(`${environmentVariable} (or DISCORD_WEBHOOK_URL fallback) is not configured`);
  }
  if (!/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\//i.test(webhookUrl)) {
    throw new Error(`${environmentVariable} is not a Discord webhook URL`);
  }
  return webhookUrl;
}

export async function sendDiscordNotification(channel: DiscordNotificationChannel, embed: DiscordEmbed, options?: DiscordNotificationOptions) {
  const webhookUrl = getWebhookUrl(channel);
  const url = new URL(webhookUrl);
  url.searchParams.set('wait', 'true');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'PBAL League Desk',
      ...(options?.content ? { content: options.content } : {}),
      allowed_mentions: {
        parse: options?.allowEveryone ? ['everyone'] : [],
        users: options?.userIds?.filter((id) => /^\d+$/.test(id)) ?? [],
      },
      embeds: [{ color: 0xff4b1f, footer: { text: 'Practical Basketball Asia League' }, ...embed }],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Discord webhook returned ${response.status}: ${detail}`);
  }
}
