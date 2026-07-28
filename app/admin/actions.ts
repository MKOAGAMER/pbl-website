'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import slugify from 'slugify';
import { z } from 'zod';
import { requireStaff } from '@/lib/admin-auth';
import type { AdminErrorCode, AdminSuccessCode } from './notices';

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const httpUrl = z.string().url().refine((value) => {
  const protocol = new URL(value).protocol;
  return protocol === 'http:' || protocol === 'https:';
});
const optionalHttpUrl = z.union([z.literal(''), httpUrl]);

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function done(code: AdminSuccessCode) {
  revalidatePath('/', 'layout');
  redirect(`/admin?success=${code}`);
}

function fail(code: AdminErrorCode): never {
  redirect(`/admin?error=${code}`);
}

function databaseFail(context: string, error: { message: string; code?: string } | null): never {
  console.error(`[pbl-admin:${context}]`, error?.code ?? 'unknown', error?.message ?? 'No error returned');
  fail('database-write');
}

export async function createSeason(formData: FormData) {
  const { supabase } = await requireStaff(['editor', 'admin', 'super_admin']);
  const parsed = z.object({
    name: z.string().min(2).max(80),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['planned', 'active']),
    isPublic: z.boolean(),
  }).safeParse({
    name: text(formData, 'name'),
    startsOn: text(formData, 'starts_on'),
    endsOn: text(formData, 'ends_on'),
    status: text(formData, 'status'),
    isPublic: formData.get('is_public') === 'on',
  });

  if (!parsed.success || parsed.data.endsOn < parsed.data.startsOn) fail('invalid-season');
  const { error } = await supabase.from('seasons').insert({
    name: parsed.data.name,
    slug: slugify(parsed.data.name, { lower: true, strict: true }),
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    status: parsed.data.status,
    is_public: parsed.data.isPublic || parsed.data.status === 'active',
  });
  if (error) databaseFail('create-season', error);
  done('season-created');
}

export async function updateSeason(formData: FormData) {
  const { supabase } = await requireStaff(['editor', 'admin', 'super_admin']);
  const parsed = z.object({
    seasonId: z.string().uuid(),
    status: z.enum(['planned', 'active', 'completed', 'archived']),
    isPublic: z.boolean(),
  }).safeParse({
    seasonId: text(formData, 'season_id'),
    status: text(formData, 'status'),
    isPublic: formData.get('is_public') === 'on',
  });
  if (!parsed.success) fail('invalid-season');

  const { error } = await supabase
    .from('seasons')
    .update({
      status: parsed.data.status,
      is_public: parsed.data.isPublic || parsed.data.status === 'active',
    })
    .eq('id', parsed.data.seasonId)
    .select('id')
    .single();
  if (error) databaseFail('update-season', error);
  done('season-updated');
}

export async function createTeam(formData: FormData) {
  const { supabase } = await requireStaff(['editor', 'admin', 'super_admin']);
  const parsed = z.object({
    name: z.string().min(2).max(80),
    abbreviation: z.string().min(2).max(6).regex(/^[A-Z0-9]+$/),
    city: z.string().max(80),
    description: z.string().max(500),
    primaryColor: color,
    secondaryColor: color,
    seasonId: z.string().uuid(),
    conference: z.enum(['East', 'West']),
  }).safeParse({
    name: text(formData, 'name'),
    abbreviation: text(formData, 'abbreviation').toUpperCase(),
    city: text(formData, 'city'),
    description: text(formData, 'description'),
    primaryColor: text(formData, 'primary_color'),
    secondaryColor: text(formData, 'secondary_color'),
    seasonId: text(formData, 'season_id'),
    conference: text(formData, 'conference'),
  });

  if (!parsed.success) fail('invalid-team');
  const { data: teamId, error } = await supabase.rpc('create_team_with_season', {
    p_name: parsed.data.name,
    p_slug: slugify(parsed.data.name, { lower: true, strict: true }),
    p_abbreviation: parsed.data.abbreviation,
    p_season_id: parsed.data.seasonId,
    p_conference: parsed.data.conference,
    p_city: parsed.data.city || null,
    p_description: parsed.data.description || null,
    p_primary_color: parsed.data.primaryColor,
    p_secondary_color: parsed.data.secondaryColor,
  });
  if (error || !teamId) databaseFail('create-team', error);
  done('team-created');
}

export async function updateTeamProfile(formData: FormData) {
  const { supabase, profile, role } = await requireStaff([
    'team_manager',
    'editor',
    'admin',
    'super_admin',
  ]);
  const parsed = z.object({
    teamId: z.string().uuid(),
    city: z.string().max(80),
    description: z.string().max(500),
    primaryColor: color,
    secondaryColor: color,
    logoUrl: optionalHttpUrl,
  }).safeParse({
    teamId: text(formData, 'team_id'),
    city: text(formData, 'city'),
    description: text(formData, 'description'),
    primaryColor: text(formData, 'primary_color'),
    secondaryColor: text(formData, 'secondary_color'),
    logoUrl: text(formData, 'logo_url'),
  });

  if (!parsed.success) fail('invalid-team');
  if (role === 'team_manager' && profile?.managed_team_id !== parsed.data.teamId) {
    fail('forbidden');
  }

  const { error } = await supabase
    .from('teams')
    .update({
      city: parsed.data.city || null,
      description: parsed.data.description || null,
      primary_color: parsed.data.primaryColor,
      secondary_color: parsed.data.secondaryColor,
      logo_url: parsed.data.logoUrl || null,
    })
    .eq('id', parsed.data.teamId)
    .select('id')
    .single();
  if (error) databaseFail('update-team', error);
  done('team-updated');
}

export async function assignPlayerToRoster(formData: FormData) {
  const { supabase, profile, role } = await requireStaff([
    'team_manager',
    'editor',
    'admin',
    'super_admin',
  ]);
  const parsed = z.object({
    seasonId: z.string().uuid(),
    teamId: z.string().uuid(),
    playerId: z.string().uuid(),
    position: z.enum(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']),
    jerseyNumber: z.coerce.number().int().min(0).max(99),
  }).safeParse({
    seasonId: text(formData, 'season_id'),
    teamId: text(formData, 'team_id'),
    playerId: text(formData, 'player_id'),
    position: text(formData, 'position'),
    jerseyNumber: text(formData, 'jersey_number'),
  });

  if (!parsed.success) fail('invalid-roster');
  if (role === 'team_manager' && profile?.managed_team_id !== parsed.data.teamId) {
    fail('forbidden');
  }

  const { error } = await supabase
    .from('rosters')
    .insert({
      season_id: parsed.data.seasonId,
      team_id: parsed.data.teamId,
      player_id: parsed.data.playerId,
      jersey_number: parsed.data.jerseyNumber,
      position: parsed.data.position,
      status: 'active',
    })
    .select('id')
    .single();
  if (error) databaseFail('assign-roster', error);
  done('roster-assigned');
}

export async function createPlayer(formData: FormData) {
  const { supabase } = await requireStaff(['editor', 'admin', 'super_admin']);
  const parsed = z.object({
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    position: z.enum(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']),
    teamId: z.string().uuid(),
    seasonId: z.string().uuid(),
    jerseyNumber: z.coerce.number().int().min(0).max(99),
    robloxUsername: z.union([
      z.literal(''),
      z.string().min(3).max(20).regex(/^[A-Za-z0-9_]+$/),
    ]),
    avatarUrl: optionalHttpUrl,
    bio: z.string().max(1000),
  }).safeParse({
    firstName: text(formData, 'first_name'),
    lastName: text(formData, 'last_name'),
    position: text(formData, 'position'),
    teamId: text(formData, 'team_id'),
    seasonId: text(formData, 'season_id'),
    jerseyNumber: text(formData, 'jersey_number'),
    robloxUsername: text(formData, 'roblox_username'),
    avatarUrl: text(formData, 'avatar_url'),
    bio: text(formData, 'bio'),
  });
  if (!parsed.success) fail('invalid-player');
  const slug = slugify(`${parsed.data.firstName}-${parsed.data.lastName}`, { lower: true, strict: true });
  const { data: playerId, error } = await supabase.rpc('create_player_with_roster', {
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_slug: slug,
    p_position: parsed.data.position,
    p_team_id: parsed.data.teamId,
    p_season_id: parsed.data.seasonId,
    p_jersey_number: parsed.data.jerseyNumber,
    p_roblox_username: parsed.data.robloxUsername || null,
    p_avatar_url: parsed.data.avatarUrl || null,
    p_bio: parsed.data.bio || null,
  });
  if (error || !playerId) databaseFail('create-player', error);
  done('player-created');
}

export async function createGame(formData: FormData) {
  const { supabase } = await requireStaff(['editor', 'admin', 'super_admin']);
  const parsed = z.object({
    seasonId: z.string().uuid(),
    homeTeamId: z.string().uuid(),
    awayTeamId: z.string().uuid(),
    roundNumber: z.coerce.number().int().positive().max(99),
    scheduledAt: z.string().min(10),
    venue: z.string().max(120),
    streamUrl: optionalHttpUrl,
  }).safeParse({
    seasonId: text(formData, 'season_id'),
    homeTeamId: text(formData, 'home_team_id'),
    awayTeamId: text(formData, 'away_team_id'),
    roundNumber: text(formData, 'round_number'),
    scheduledAt: text(formData, 'scheduled_at'),
    venue: text(formData, 'venue'),
    streamUrl: text(formData, 'stream_url'),
  });
  if (!parsed.success) fail('invalid-game');
  if (parsed.data.homeTeamId === parsed.data.awayTeamId) fail('same-team');

  const localBangkokTime = parsed.data.scheduledAt.match(/[zZ]|[+-]\d\d:\d\d$/)
    ? parsed.data.scheduledAt
    : `${parsed.data.scheduledAt}:00+07:00`;
  const startsAt = new Date(localBangkokTime);
  if (Number.isNaN(startsAt.getTime())) fail('invalid-game');
  const { error } = await supabase.from('games').insert({
    season_id: parsed.data.seasonId,
    round_number: parsed.data.roundNumber,
    scheduled_at: startsAt.toISOString(),
    venue: parsed.data.venue || null,
    status: 'scheduled',
    home_team_id: parsed.data.homeTeamId,
    away_team_id: parsed.data.awayTeamId,
    stream_url: parsed.data.streamUrl || null,
  });
  if (error) databaseFail('create-game', error);
  done('game-created');
}

export async function updateGameResult(formData: FormData) {
  const { supabase, role } = await requireStaff(['statistician', 'editor', 'admin', 'super_admin']);
  const parsed = z.object({
    gameId: z.string().uuid(),
    homeScore: z.coerce.number().int().nonnegative(),
    awayScore: z.coerce.number().int().nonnegative(),
    status: z.enum(['live', 'final']),
  }).safeParse({
    gameId: text(formData, 'game_id'),
    homeScore: text(formData, 'home_score'),
    awayScore: text(formData, 'away_score'),
    status: text(formData, 'status'),
  });
  if (!parsed.success) fail('invalid-result');

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, status')
    .eq('id', parsed.data.gameId)
    .single();
  if (gameError || !game) fail('game-not-found');

  const currentStatus = String(game.status).toLowerCase();
  const canEdit = role === 'editor' || role === 'admin' || role === 'super_admin';
  if (currentStatus === 'scheduled' && parsed.data.status === 'final') {
    fail('start-before-final');
  }
  if (currentStatus === 'final' && (!canEdit || parsed.data.status !== 'live')) {
    fail('final-reopen-forbidden');
  }
  if (!['scheduled', 'live', 'final'].includes(currentStatus)) {
    fail('invalid-game-state');
  }
  if (parsed.data.status === 'final' && parsed.data.homeScore === parsed.data.awayScore) {
    fail('tied-final');
  }

  const { error } = parsed.data.status === 'final'
    ? await supabase.rpc('finalize_game', {
        p_game_id: parsed.data.gameId,
        p_home_score: parsed.data.homeScore,
        p_away_score: parsed.data.awayScore,
        p_home_period_scores: null,
        p_away_period_scores: null,
        p_require_stat_totals: true,
      })
    : await supabase
        .from('games')
        .update({
          home_score: parsed.data.homeScore,
          away_score: parsed.data.awayScore,
          status: 'live',
        })
        .eq('id', parsed.data.gameId)
        .eq('status', currentStatus)
        .select('id')
        .single();
  if (error) databaseFail('update-game-result', error);
  done(parsed.data.status === 'final' ? 'score-final' : 'score-live');
}

export async function upsertPlayerStats(formData: FormData) {
  const { supabase } = await requireStaff(['statistician', 'editor', 'admin', 'super_admin']);
  const parsed = z.object({
    gameId: z.string().uuid(),
    playerId: z.string().uuid(),
    minutes: z.coerce.number().min(0).max(60),
    points: z.coerce.number().int().nonnegative().max(200),
    rebounds: z.coerce.number().int().nonnegative().max(100),
    assists: z.coerce.number().int().nonnegative().max(100),
    steals: z.coerce.number().int().nonnegative().max(50),
    blocks: z.coerce.number().int().nonnegative().max(50),
    turnovers: z.coerce.number().int().nonnegative().max(50),
    fieldGoalsMade: z.coerce.number().int().nonnegative().max(100),
    fieldGoalsAttempted: z.coerce.number().int().nonnegative().max(100),
    threesMade: z.coerce.number().int().nonnegative().max(100),
    threesAttempted: z.coerce.number().int().nonnegative().max(100),
    freeThrowsMade: z.coerce.number().int().nonnegative().max(100),
    freeThrowsAttempted: z.coerce.number().int().nonnegative().max(100),
  }).safeParse({
    gameId: text(formData, 'game_id'),
    playerId: text(formData, 'player_id'),
    minutes: text(formData, 'minutes'),
    points: text(formData, 'points'),
    rebounds: text(formData, 'rebounds'),
    assists: text(formData, 'assists'),
    steals: text(formData, 'steals'),
    blocks: text(formData, 'blocks'),
    turnovers: text(formData, 'turnovers'),
    fieldGoalsMade: text(formData, 'field_goals_made'),
    fieldGoalsAttempted: text(formData, 'field_goals_attempted'),
    threesMade: text(formData, 'three_pointers_made'),
    threesAttempted: text(formData, 'three_pointers_attempted'),
    freeThrowsMade: text(formData, 'free_throws_made'),
    freeThrowsAttempted: text(formData, 'free_throws_attempted'),
  });
  if (!parsed.success) fail('invalid-stats');
  const stats = parsed.data;
  if (
    stats.fieldGoalsMade > stats.fieldGoalsAttempted ||
    stats.threesMade > stats.threesAttempted ||
    stats.freeThrowsMade > stats.freeThrowsAttempted ||
    stats.threesMade > stats.fieldGoalsMade
  ) {
    fail('shooting-line');
  }
  const calculatedPoints =
    (stats.fieldGoalsMade - stats.threesMade) * 2 +
    stats.threesMade * 3 +
    stats.freeThrowsMade;
  if (calculatedPoints !== stats.points) {
    fail('points-mismatch');
  }

  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id, season_id, status, home_team_id, away_team_id')
    .eq('id', stats.gameId)
    .single();
  if (gameError || !game) fail('game-not-found');
  if (String(game.status).toLowerCase() !== 'live') {
    fail('game-not-scoreable');
  }

  const { data: roster, error: rosterLookupError } = await supabase
    .from('rosters')
    .select('team_id')
    .eq('season_id', game.season_id)
    .eq('player_id', stats.playerId)
    .maybeSingle();
  if (rosterLookupError || !roster?.team_id) fail('roster-not-found');
  if (![game.home_team_id, game.away_team_id].includes(roster.team_id)) {
    fail('wrong-game-team');
  }

  const { error } = await supabase.from('player_game_stats').upsert(
    {
      game_id: stats.gameId,
      player_id: stats.playerId,
      team_id: roster.team_id,
      did_play: true,
      minutes: stats.minutes,
      points: stats.points,
      rebounds: stats.rebounds,
      offensive_rebounds: 0,
      defensive_rebounds: stats.rebounds,
      assists: stats.assists,
      steals: stats.steals,
      blocks: stats.blocks,
      turnovers: stats.turnovers,
      personal_fouls: 0,
      field_goals_made: stats.fieldGoalsMade,
      field_goals_attempted: stats.fieldGoalsAttempted,
      three_pointers_made: stats.threesMade,
      three_pointers_attempted: stats.threesAttempted,
      free_throws_made: stats.freeThrowsMade,
      free_throws_attempted: stats.freeThrowsAttempted,
    },
    { onConflict: 'game_id,player_id' },
  ).select('game_id').single();
  if (error) databaseFail('upsert-player-stats', error);
  done('stats-saved');
}

export async function createNewsPost(formData: FormData) {
  const { supabase, user } = await requireStaff(['editor', 'admin', 'super_admin']);
  const parsed = z.object({
    title: z.string().min(5).max(180),
    excerpt: z.string().min(10).max(400),
    content: z.string().min(20),
    category: z.string().min(2).max(40),
    status: z.enum(['draft', 'published']),
    coverUrl: optionalHttpUrl,
  }).safeParse({
    title: text(formData, 'title'),
    excerpt: text(formData, 'excerpt'),
    content: text(formData, 'content'),
    category: text(formData, 'category'),
    status: text(formData, 'status'),
    coverUrl: text(formData, 'cover_url'),
  });
  if (!parsed.success) fail('invalid-story');

  const { error } = await supabase.from('news_posts').insert({
    title: parsed.data.title,
    slug: slugify(parsed.data.title, { lower: true, strict: true }),
    excerpt: parsed.data.excerpt,
    content: parsed.data.content,
    category: parsed.data.category,
    cover_image_url: parsed.data.coverUrl || null,
    status: parsed.data.status,
    is_featured: formData.get('is_featured') === 'on',
    published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
    author_id: user.id,
  });
  if (error) databaseFail('create-news', error);
  done(parsed.data.status === 'published' ? 'story-published' : 'story-drafted');
}

export async function updateStaffRole(formData: FormData) {
  const { supabase, role: actorRole } = await requireStaff(['admin', 'super_admin']);
  const parsed = z.object({
    profileId: z.string().uuid(),
    role: z.enum(['member', 'team_manager', 'statistician', 'editor', 'admin', 'super_admin']),
    managedTeamId: z.union([z.literal(''), z.string().uuid()]),
  }).safeParse({
    profileId: text(formData, 'profile_id'),
    role: text(formData, 'role'),
    managedTeamId: text(formData, 'managed_team_id'),
  });
  if (!parsed.success) fail('invalid-role');
  if (parsed.data.role === 'team_manager' && !parsed.data.managedTeamId) fail('invalid-role');

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', parsed.data.profileId)
    .single();
  if (targetError || !target) databaseFail('find-profile', targetError);
  if (
    actorRole !== 'super_admin' &&
    (target.role === 'super_admin' || parsed.data.role === 'super_admin')
  ) {
    fail('forbidden');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      role: parsed.data.role,
      managed_team_id:
        parsed.data.role === 'team_manager' ? parsed.data.managedTeamId : null,
    })
    .eq('id', parsed.data.profileId)
    .select('id')
    .single();
  if (error) databaseFail('update-role', error);
  done('role-updated');
}
