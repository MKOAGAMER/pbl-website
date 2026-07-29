import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { sendDiscordNotification } from '@/lib/discord';
import { createAdminClient } from '@/lib/supabase-admin';
import { getSiteUrl } from '@/lib/site-url';

export const runtime = 'nodejs';

type WebhookPayload = {
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
  table?: string;
  schema?: string;
  record?: Record<string, unknown> | null;
  old_record?: Record<string, unknown> | null;
};

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function safeEqual(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

function short(value: unknown, maximum = 900) {
  const text = stringValue(value).trim();
  return text.length > maximum ? `${text.slice(0, maximum - 1)}…` : text;
}

export async function POST(request: Request) {
  const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET?.trim();
  if (!expectedSecret) return NextResponse.json({ error: 'Webhook receiver is not configured' }, { status: 503 });
  const suppliedSecret = request.headers.get('x-pbal-webhook-secret') ?? '';
  if (!safeEqual(suppliedSecret, expectedSecret)) return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });

  const payload = await request.json().catch(() => null) as WebhookPayload | null;
  if (!payload || payload.schema !== 'public' || !payload.record) {
    return NextResponse.json({ error: 'Invalid Supabase webhook payload' }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase service role is not configured' }, { status: 503 });
  let eventKey = '';
  try {
    if (payload.table === 'news_posts') {
      const isNewPublication = payload.record.status === 'published'
        && (payload.type === 'INSERT' || payload.old_record?.status !== 'published');
      if (!isNewPublication) return NextResponse.json({ skipped: true });
      const recordId = stringValue(payload.record.id);
      if (!recordId) return NextResponse.json({ error: 'News event has no record id' }, { status: 400 });
      eventKey = `news-published:${recordId}:${stringValue(payload.record.published_at) || 'unknown-time'}`;
      const { data: claimed, error: claimError } = await supabase.rpc('claim_discord_notification', {
        p_event_key: eventKey,
        p_event_type: 'news_published',
        p_record_id: recordId,
      });
      if (claimError) throw claimError;
      if (!claimed) return NextResponse.json({ skipped: true, duplicate: true });
      const slug = stringValue(payload.record.slug);
      const coverUrl = stringValue(payload.record.cover_image_url);
      await sendDiscordNotification({
        title: `📰 ${short(payload.record.title, 240) || 'ข่าวใหม่จาก PBAL'}`,
        description: short(payload.record.excerpt) || 'ติดตามรายละเอียดข่าวล่าสุดจาก Practical Basketball Asia League',
        url: slug ? `${getSiteUrl()}/news/${encodeURIComponent(slug)}` : `${getSiteUrl()}/news`,
        image: coverUrl ? { url: coverUrl } : undefined,
        timestamp: stringValue(payload.record.published_at) || new Date().toISOString(),
      });
      await supabase.from('discord_notification_log').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('event_key', eventKey);
      return NextResponse.json({ delivered: true });
    }

    if (payload.table === 'games') {
      const isNewResult = payload.record.status === 'final'
        && (payload.type === 'INSERT' || payload.old_record?.status !== 'final');
      if (!isNewResult) return NextResponse.json({ skipped: true });
      const gameId = stringValue(payload.record.id);
      if (!gameId) return NextResponse.json({ error: 'Game event has no record id' }, { status: 400 });
      eventKey = `game-final:${gameId}:${stringValue(payload.record.updated_at) || 'unknown-time'}`;
      const { data: claimed, error: claimError } = await supabase.rpc('claim_discord_notification', {
        p_event_key: eventKey,
        p_event_type: 'game_final',
        p_record_id: gameId,
      });
      if (claimError) throw claimError;
      if (!claimed) return NextResponse.json({ skipped: true, duplicate: true });
      const homeTeamId = stringValue(payload.record.home_team_id);
      const awayTeamId = stringValue(payload.record.away_team_id);
      const { data: teams } = await supabase.from('teams').select('id, name, abbreviation, logo_url').in('id', [homeTeamId, awayTeamId]);
      const home = teams?.find((team) => team.id === homeTeamId);
      const away = teams?.find((team) => team.id === awayTeamId);
      const homeScore = Number(payload.record.home_score ?? 0);
      const awayScore = Number(payload.record.away_score ?? 0);
      await sendDiscordNotification({
        title: `🏀 FINAL · ${away?.abbreviation ?? 'AWAY'} ${awayScore}–${homeScore} ${home?.abbreviation ?? 'HOME'}`,
        description: `${away?.name ?? 'Away Team'} พบ ${home?.name ?? 'Home Team'} · ประกาศผลการแข่งขันอย่างเป็นทางการแล้ว`,
        url: `${getSiteUrl()}/games/game-${encodeURIComponent(gameId)}`,
        thumbnail: home?.logo_url ? { url: home.logo_url } : away?.logo_url ? { url: away.logo_url } : undefined,
        fields: [
          { name: away?.name ?? 'Away', value: String(awayScore), inline: true },
          { name: home?.name ?? 'Home', value: String(homeScore), inline: true },
        ],
        timestamp: stringValue(payload.record.updated_at) || new Date().toISOString(),
      });
      await supabase.from('discord_notification_log').update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null }).eq('event_key', eventKey);
      return NextResponse.json({ delivered: true });
    }

    return NextResponse.json({ skipped: true });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Unknown notification error';
    console.error('[discord:webhook]', detail);
    if (eventKey) await supabase.from('discord_notification_log').update({ status: 'failed', last_error: detail.slice(0, 1000) }).eq('event_key', eventKey);
    return NextResponse.json({ error: 'Discord delivery failed' }, { status: 502 });
  }
}
