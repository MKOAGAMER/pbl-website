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

export async function sendDiscordNotification(embed: DiscordEmbed) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookUrl) throw new Error('DISCORD_WEBHOOK_URL is not configured');
  if (!/^https:\/\/(?:canary\.|ptb\.)?discord(?:app)?\.com\/api\/webhooks\//i.test(webhookUrl)) {
    throw new Error('DISCORD_WEBHOOK_URL is not a Discord webhook URL');
  }

  const url = new URL(webhookUrl);
  url.searchParams.set('wait', 'true');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: 'PBAL League Desk',
      allowed_mentions: { parse: [] },
      embeds: [{ color: 0xff4b1f, footer: { text: 'Practical Basketball Asia League' }, ...embed }],
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Discord webhook returned ${response.status}: ${detail}`);
  }
}

