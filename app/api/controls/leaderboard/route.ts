import { getCurrentUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-admin';

const SCHEMES = new Set(['keyboard_pc', 'controller_dpad', 'controller_rightstick']);
const MODES = new Set(['practice', 'timeAttack']);

type ScorePayload = {
  schemeId?: unknown;
  category?: unknown;
  mode?: unknown;
  score?: unknown;
  accuracy?: unknown;
  bestStreak?: unknown;
  averageResponseMs?: unknown;
  correct?: unknown;
  wrong?: unknown;
};

function validFilter(value: string | null, allowed: Set<string>) {
  return value && allowed.has(value) ? value : null;
}

function validCategory(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 120;
}

function boundedInteger(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function boundedNumber(value: unknown, min: number, max: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const schemeId = validFilter(url.searchParams.get('schemeId'), SCHEMES);
  const mode = validFilter(url.searchParams.get('mode'), MODES);
  const category = url.searchParams.get('category');
  const limitRaw = Number(url.searchParams.get('limit') ?? 10);
  const limit = boundedInteger(limitRaw, 1, 50) ? limitRaw : 10;

  if (!schemeId || !mode || !validCategory(category)) {
    return Response.json({ error: 'Invalid leaderboard filters' }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) return Response.json({ error: 'Leaderboard is not configured' }, { status: 503 });

  const { data, error } = await supabase
    .from('control_lab_leaderboard')
    .select('user_id, score, accuracy, best_streak, average_response_ms, correct, wrong, played_at')
    .eq('scheme_id', schemeId)
    .eq('category', category)
    .eq('mode', mode)
    .order('score', { ascending: false })
    .order('accuracy', { ascending: false })
    .order('best_streak', { ascending: false })
    .limit(limit);

  if (error) return Response.json({ error: 'Unable to load leaderboard' }, { status: 500 });

  const userIds = (data ?? []).map((row) => row.user_id);
  const { data: users } = userIds.length
    ? await supabase.from('users').select('id, username, avatar_url').in('id', userIds)
    : { data: [] };
  const userMap = new Map((users ?? []).map((user) => [user.id, user]));

  return Response.json({
    entries: (data ?? []).map((row, index) => ({
      rank: index + 1,
      username: userMap.get(row.user_id)?.username ?? 'PBAL Player',
      avatarUrl: userMap.get(row.user_id)?.avatar_url ?? null,
      score: row.score,
      accuracy: Number(row.accuracy),
      bestStreak: row.best_streak,
      averageResponseMs: row.average_response_ms,
      correct: row.correct,
      wrong: row.wrong,
      playedAt: row.played_at,
    })),
  }, { headers: { 'cache-control': 'public, max-age=20, stale-while-revalidate=60' } });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to submit a leaderboard score' }, { status: 401 });

  let payload: ScorePayload;
  try {
    payload = await request.json() as ScorePayload;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const schemeId = typeof payload.schemeId === 'string' && SCHEMES.has(payload.schemeId) ? payload.schemeId : null;
  const mode = typeof payload.mode === 'string' && MODES.has(payload.mode) ? payload.mode : null;
  if (!schemeId || !mode || !validCategory(payload.category)
    || !boundedInteger(payload.score, 0, 1000000000)
    || !boundedNumber(payload.accuracy, 0, 100)
    || !boundedInteger(payload.bestStreak, 0, 100000)
    || !boundedInteger(payload.averageResponseMs, 0, 3600000)
    || !boundedInteger(payload.correct, 0, 100000)
    || !boundedInteger(payload.wrong, 0, 100000)) {
    return Response.json({ error: 'Invalid score payload' }, { status: 400 });
  }

  const score = payload.score as number;
  const accuracyValue = payload.accuracy as number;
  const bestStreak = payload.bestStreak as number;
  const averageResponseMs = payload.averageResponseMs as number;
  const correct = payload.correct as number;
  const wrong = payload.wrong as number;

  const supabase = createAdminClient();
  if (!supabase) return Response.json({ error: 'Leaderboard is not configured' }, { status: 503 });

  const keyQuery = await supabase
    .from('control_lab_leaderboard')
    .select('score')
    .eq('user_id', user.id)
    .eq('scheme_id', schemeId)
    .eq('category', payload.category)
    .eq('mode', mode)
    .maybeSingle<{ score: number }>();
  if (keyQuery.error) return Response.json({ error: 'Unable to check existing score' }, { status: 500 });
  if (keyQuery.data && keyQuery.data.score >= score) {
    return Response.json({ saved: false, personalBest: keyQuery.data.score });
  }

  const { error } = await supabase.from('control_lab_leaderboard').upsert({
    user_id: user.id,
    scheme_id: schemeId,
    category: payload.category,
    mode,
    score,
    accuracy: Math.round(accuracyValue * 100) / 100,
    best_streak: bestStreak,
    average_response_ms: averageResponseMs,
    correct,
    wrong,
    played_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,scheme_id,category,mode' });

  if (error) return Response.json({ error: 'Unable to save score' }, { status: 500 });
  return Response.json({ saved: true, personalBest: score });
}
