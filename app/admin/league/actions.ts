'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-auth';
import { getRobloxUserByUsername } from '@/lib/roblox-users';

const uuid = z.string().uuid();
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const position = z.enum(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']);
const optionalUrl = z.union([z.literal(''), z.string().url().max(500)]);
const teamFields = z.object({
  name: z.string().trim().min(2).max(80),
  abbreviation: z.string().trim().min(2).max(6).regex(/^[A-Za-z0-9]+$/),
  city: z.string().trim().max(80),
  conference: z.enum(['East', 'West']),
  primary: hex,
  secondary: hex,
  logoUrl: optionalUrl,
  description: z.string().trim().max(1200),
  websiteUrl: optionalUrl,
  homeVenue: z.string().trim().max(120),
});

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function refreshLeague() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/league');
  revalidatePath('/teams');
  revalidatePath('/players');
  revalidatePath('/games');
  revalidatePath('/stats');
  revalidatePath('/standings');
}

export async function createSeason(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({
    name: z.string().trim().min(2).max(80),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    status: z.enum(['planned', 'active']),
    isPublic: z.boolean(),
  }).safeParse({
    name: formData.get('name'),
    startsOn: formData.get('starts_on'),
    endsOn: formData.get('ends_on'),
    status: formData.get('status'),
    isPublic: formData.get('is_public') === 'on',
  });
  if (!parsed.success || parsed.data.endsOn < parsed.data.startsOn) redirect('/admin/league?error=invalid-season');
  if (parsed.data.status === 'active') {
    const { error } = await supabase.from('seasons').update({ status: 'completed' }).eq('status', 'active');
    if (error) redirect('/admin/league?error=season-save');
  }
  const baseSlug = slugify(parsed.data.name) || 'season';
  const { error } = await supabase.from('seasons').insert({
    name: parsed.data.name,
    slug: `${baseSlug}-${parsed.data.startsOn.slice(0, 4)}`,
    league_name: 'PBAL',
    starts_on: parsed.data.startsOn,
    ends_on: parsed.data.endsOn,
    status: parsed.data.status,
    is_public: parsed.data.isPublic,
  });
  if (error) {
    console.error('[league:create-season]', error.message);
    redirect('/admin/league?error=season-save');
  }
  refreshLeague();
  redirect('/admin/league?saved=season');
}

export async function createTeam(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = teamFields.extend({
    seasonId: uuid,
  }).safeParse({
    seasonId: formData.get('season_id'), name: formData.get('name'), abbreviation: formData.get('abbreviation'),
    city: formData.get('city'), conference: formData.get('conference'), primary: formData.get('primary_color'), secondary: formData.get('secondary_color'),
    logoUrl: formData.get('logo_url'), description: formData.get('description'), websiteUrl: formData.get('website_url'), homeVenue: formData.get('home_venue'),
  });
  if (!parsed.success) redirect('/admin/league?error=invalid-team');
  const { data: team, error } = await supabase.from('teams').insert({
    name: parsed.data.name,
    slug: `${slugify(parsed.data.name)}-${Date.now().toString(36)}`,
    abbreviation: parsed.data.abbreviation.toUpperCase(),
    city: parsed.data.city || null,
    description: parsed.data.description || null,
    logo_url: parsed.data.logoUrl || null,
    primary_color: parsed.data.primary,
    secondary_color: parsed.data.secondary,
    website_url: parsed.data.websiteUrl || null,
    home_venue: parsed.data.homeVenue || null,
    is_active: true,
    wins: 0,
    losses: 0,
  }).select('id').single<{ id: string }>();
  if (error || !team) {
    console.error('[league:create-team]', error?.message);
    redirect('/admin/league?error=team-save');
  }
  const { error: seasonError } = await supabase.from('season_teams').insert({
    season_id: parsed.data.seasonId,
    team_id: team.id,
    conference: parsed.data.conference,
    is_active: true,
  });
  if (seasonError) {
    await supabase.from('teams').delete().eq('id', team.id);
    console.error('[league:create-team-season]', seasonError.message);
    redirect('/admin/league?error=team-save');
  }
  refreshLeague();
  redirect('/admin/league?saved=team');
}

export async function updateTeam(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = teamFields.extend({ teamId: uuid, seasonId: z.union([z.literal(''), uuid]), isActive: z.boolean() }).safeParse({
    teamId: formData.get('team_id'), seasonId: formData.get('season_id'), name: formData.get('name'), abbreviation: formData.get('abbreviation'),
    city: formData.get('city'), conference: formData.get('conference'), primary: formData.get('primary_color'), secondary: formData.get('secondary_color'),
    logoUrl: formData.get('logo_url'), description: formData.get('description'), websiteUrl: formData.get('website_url'), homeVenue: formData.get('home_venue'),
    isActive: formData.get('is_active') === 'on',
  });
  if (!parsed.success) redirect('/admin/league?error=invalid-team');

  const { error: teamError } = await supabase.from('teams').update({
    name: parsed.data.name,
    abbreviation: parsed.data.abbreviation.toUpperCase(),
    city: parsed.data.city || null,
    description: parsed.data.description || null,
    logo_url: parsed.data.logoUrl || null,
    primary_color: parsed.data.primary,
    secondary_color: parsed.data.secondary,
    website_url: parsed.data.websiteUrl || null,
    home_venue: parsed.data.homeVenue || null,
    is_active: parsed.data.isActive,
    updated_at: new Date().toISOString(),
  }).eq('id', parsed.data.teamId);
  const membershipResult = parsed.data.seasonId
    ? await supabase.from('season_teams').update({
        conference: parsed.data.conference,
        is_active: parsed.data.isActive,
        updated_at: new Date().toISOString(),
      }).eq('season_id', parsed.data.seasonId).eq('team_id', parsed.data.teamId)
    : { error: null };
  const membershipError = membershipResult.error;
  if (teamError || membershipError) {
    console.error('[league:update-team]', teamError?.message || membershipError?.message);
    redirect('/admin/league?error=team-save');
  }
  refreshLeague();
  redirect('/admin/league?saved=team-updated');
}

export async function deleteTeam(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = uuid.safeParse(formData.get('team_id'));
  if (!parsed.success) redirect('/admin/league?error=invalid-team');

  const teamId = parsed.data;
  const { data: relatedGame } = await supabase.from('games').select('id').or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`).limit(1).maybeSingle();
  if (relatedGame) {
    const today = new Date().toISOString().slice(0, 10);
    const results = await Promise.all([
      supabase.from('teams').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', teamId),
      supabase.from('season_teams').update({ is_active: false }).eq('team_id', teamId),
      supabase.from('players').update({ team_id: null }).eq('team_id', teamId),
      supabase.from('rosters').update({ status: 'inactive', left_on: today }).eq('team_id', teamId).eq('status', 'active'),
    ]);
    if (results.some((result) => result.error)) redirect('/admin/league?error=team-delete');
    refreshLeague();
    redirect('/admin/league?saved=team-archived');
  }

  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  if (error) {
    console.error('[league:delete-team]', error.message);
    redirect('/admin/league?error=team-delete');
  }
  refreshLeague();
  redirect('/admin/league?saved=team-deleted');
}

export async function updateSeason(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({
    seasonId: uuid, name: z.string().trim().min(2).max(80), startsOn: z.string().date(), endsOn: z.string().date(),
    status: z.enum(['planned', 'active', 'completed', 'archived']), isPublic: z.boolean(),
  }).safeParse({
    seasonId: formData.get('season_id'), name: formData.get('name'), startsOn: formData.get('starts_on'), endsOn: formData.get('ends_on'),
    status: formData.get('status'), isPublic: formData.get('is_public') === 'on',
  });
  if (!parsed.success || parsed.data.endsOn < parsed.data.startsOn) redirect('/admin/league?error=invalid-season');
  if (parsed.data.status === 'active') {
    const { error } = await supabase.from('seasons').update({ status: 'completed' }).eq('status', 'active').neq('id', parsed.data.seasonId);
    if (error) redirect('/admin/league?error=season-save');
  }
  const { error } = await supabase.from('seasons').update({
    name: parsed.data.name, starts_on: parsed.data.startsOn, ends_on: parsed.data.endsOn,
    status: parsed.data.status, is_public: parsed.data.isPublic, updated_at: new Date().toISOString(),
  }).eq('id', parsed.data.seasonId);
  if (error) redirect('/admin/league?error=season-save');
  refreshLeague();
  redirect('/admin/league?saved=season-updated');
}

export async function deleteSeason(formData: FormData) {
  const { supabase } = await requireAdminPermission('super_admin');
  const parsed = uuid.safeParse(formData.get('season_id'));
  if (!parsed.success) redirect('/admin/league?error=invalid-season');
  const { error } = await supabase.from('seasons').delete().eq('id', parsed.data);
  if (error) redirect('/admin/league?error=season-delete');
  refreshLeague();
  redirect('/admin/league?saved=season-deleted');
}

export async function updatePlayerProfile(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({
    playerId: uuid, displayName: z.string().trim().min(1).max(80), avatarUrl: optionalUrl,
    bio: z.string().trim().max(1500), positions: z.array(position).min(1).max(3), isActive: z.boolean(),
  }).safeParse({
    playerId: formData.get('player_id'), displayName: formData.get('display_name'), avatarUrl: formData.get('avatar_url'),
    bio: formData.get('bio'), positions: formData.getAll('positions'), isActive: formData.get('is_active') === 'on',
  });
  if (!parsed.success) redirect('/admin/players?error=invalid-player');
  const { error } = await supabase.from('players').update({
    name: parsed.data.displayName, first_name: parsed.data.displayName, last_name: '', avatar_url: parsed.data.avatarUrl || null,
    bio: parsed.data.bio || null, position: parsed.data.positions[0], positions: parsed.data.positions,
    is_active: parsed.data.isActive, updated_at: new Date().toISOString(),
  }).eq('id', parsed.data.playerId);
  if (error) redirect('/admin/players?error=player-save');
  refreshLeague();
  redirect('/admin/players?saved=player-updated');
}

export async function syncPlayerAvatar(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({ playerId: uuid, username: z.string().trim().regex(/^[A-Za-z0-9_]{3,20}$/) }).safeParse({
    playerId: formData.get('player_id'), username: formData.get('roblox_username'),
  });
  if (!parsed.success) redirect('/admin/players?error=invalid-player');
  const roblox = await getRobloxUserByUsername(parsed.data.username).catch(() => null);
  if (!roblox?.avatarUrl) redirect('/admin/players?error=roblox-user-not-found');
  const { error } = await supabase.from('players').update({ avatar_url: roblox.avatarUrl, updated_at: new Date().toISOString() }).eq('id', parsed.data.playerId);
  if (error) redirect('/admin/players?error=player-save');
  refreshLeague();
  redirect('/admin/players?saved=player-synced');
}

export async function movePlayer(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({
    seasonId: uuid,
    playerId: uuid,
    teamId: z.union([z.literal(''), uuid]),
    jersey: z.coerce.number().int().min(0).max(99),
    position,
  }).safeParse({
    seasonId: formData.get('season_id'), playerId: formData.get('player_id'), teamId: formData.get('team_id'),
    jersey: formData.get('jersey_number'), position: formData.get('position'),
  });
  if (!parsed.success) redirect('/admin/league?error=invalid-roster');

  if (!parsed.data.teamId) {
    const { error: rosterError } = await supabase.from('rosters').update({
      status: 'inactive', left_on: new Date().toISOString().slice(0, 10),
    }).eq('season_id', parsed.data.seasonId).eq('player_id', parsed.data.playerId);
    const { error: playerError } = await supabase.from('players').update({ team_id: null }).eq('id', parsed.data.playerId);
    if (rosterError || playerError) redirect('/admin/league?error=roster-save');
  } else {
    const { data: seasonTeam } = await supabase.from('season_teams').select('id').eq('season_id', parsed.data.seasonId).eq('team_id', parsed.data.teamId).eq('is_active', true).maybeSingle();
    if (!seasonTeam) redirect('/admin/league?error=invalid-roster');
    const { error: rosterError } = await supabase.from('rosters').upsert({
      season_id: parsed.data.seasonId,
      player_id: parsed.data.playerId,
      team_id: parsed.data.teamId,
      jersey_number: parsed.data.jersey,
      position: parsed.data.position,
      status: 'active',
      joined_on: new Date().toISOString().slice(0, 10),
      left_on: null,
    }, { onConflict: 'season_id,player_id' });
    const { error: playerError } = await supabase.from('players').update({
      team_id: parsed.data.teamId,
      position: parsed.data.position,
    }).eq('id', parsed.data.playerId);
    if (rosterError || playerError) {
      console.error('[league:move-player]', rosterError?.message || playerError?.message);
      redirect('/admin/league?error=roster-save');
    }
  }
  refreshLeague();
  redirect('/admin/league?saved=roster');
}

export async function scheduleGame(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({
    seasonId: uuid, homeTeamId: uuid, awayTeamId: uuid,
    startsAt: z.string().datetime({ local: true }), venue: z.string().trim().max(120),
  }).safeParse({
    seasonId: formData.get('season_id'), homeTeamId: formData.get('home_team_id'), awayTeamId: formData.get('away_team_id'),
    startsAt: formData.get('starts_at'), venue: formData.get('venue'),
  });
  if (!parsed.success || parsed.data.homeTeamId === parsed.data.awayTeamId) redirect('/admin/league?error=invalid-game');
  const { error } = await supabase.from('games').insert({
    season_id: parsed.data.seasonId,
    home_team_id: parsed.data.homeTeamId,
    away_team_id: parsed.data.awayTeamId,
    scheduled_at: new Date(parsed.data.startsAt).toISOString(),
    venue: parsed.data.venue || null,
    status: 'scheduled',
  });
  if (error) {
    console.error('[league:schedule-game]', error.message);
    redirect('/admin/league?error=game-save');
  }
  refreshLeague();
  redirect('/admin/league?saved=game');
}

export async function updateGame(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({
    gameId: uuid,
    homeTeamId: uuid,
    awayTeamId: uuid,
    startsAt: z.string().datetime({ local: true }),
    venue: z.string().trim().max(120),
    status: z.enum(['scheduled', 'live', 'final', 'postponed', 'cancelled']),
    homeScore: z.union([z.literal(''), z.coerce.number().int().min(0)]),
    awayScore: z.union([z.literal(''), z.coerce.number().int().min(0)]),
    streamUrl: optionalUrl,
    notes: z.string().trim().max(2000),
  }).safeParse({
    gameId: formData.get('game_id'), homeTeamId: formData.get('home_team_id'), awayTeamId: formData.get('away_team_id'),
    startsAt: formData.get('starts_at'), venue: formData.get('venue'), status: formData.get('status'),
    homeScore: formData.get('home_score'), awayScore: formData.get('away_score'), streamUrl: formData.get('stream_url'), notes: formData.get('notes'),
  });
  if (!parsed.success || parsed.data.homeTeamId === parsed.data.awayTeamId) redirect('/admin/league?error=invalid-game');
  const homeScore = parsed.data.homeScore === '' ? null : parsed.data.homeScore;
  const awayScore = parsed.data.awayScore === '' ? null : parsed.data.awayScore;
  if (parsed.data.status === 'final' && (homeScore === null || awayScore === null || homeScore === awayScore)) {
    redirect('/admin/league?error=invalid-game');
  }
  const { error } = await supabase.from('games').update({
    home_team_id: parsed.data.homeTeamId,
    away_team_id: parsed.data.awayTeamId,
    scheduled_at: new Date(parsed.data.startsAt).toISOString(),
    venue: parsed.data.venue || null,
    status: parsed.data.status,
    home_score: homeScore,
    away_score: awayScore,
    stream_url: parsed.data.streamUrl || null,
    notes: parsed.data.notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', parsed.data.gameId);
  if (error) {
    console.error('[league:update-game]', error.message);
    redirect('/admin/league?error=game-save');
  }
  refreshLeague();
  redirect('/admin/league?saved=game-updated');
}

export async function deleteGame(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = uuid.safeParse(formData.get('game_id'));
  if (!parsed.success) redirect('/admin/league?error=invalid-game');
  const { error } = await supabase.from('games').delete().eq('id', parsed.data);
  if (error) redirect('/admin/league?error=game-delete');
  refreshLeague();
  redirect('/admin/league?saved=game-deleted');
}
