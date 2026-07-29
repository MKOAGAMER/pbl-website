'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-auth';

const uuid = z.string().uuid();
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const position = z.enum(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']);

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function refreshLeague() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/league');
  revalidatePath('/teams');
  revalidatePath('/players');
  revalidatePath('/games');
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
  const parsed = z.object({
    seasonId: uuid,
    name: z.string().trim().min(2).max(80),
    abbreviation: z.string().trim().min(2).max(5).regex(/^[A-Za-z0-9]+$/),
    city: z.string().trim().max(80),
    conference: z.enum(['East', 'West']),
    primary: hex,
    secondary: hex,
  }).safeParse({
    seasonId: formData.get('season_id'), name: formData.get('name'), abbreviation: formData.get('abbreviation'),
    city: formData.get('city'), conference: formData.get('conference'), primary: formData.get('primary_color'), secondary: formData.get('secondary_color'),
  });
  if (!parsed.success) redirect('/admin/league?error=invalid-team');
  const { data: team, error } = await supabase.from('teams').insert({
    name: parsed.data.name,
    slug: `${slugify(parsed.data.name)}-${Date.now().toString(36)}`,
    abbreviation: parsed.data.abbreviation.toUpperCase(),
    city: parsed.data.city || null,
    primary_color: parsed.data.primary,
    secondary_color: parsed.data.secondary,
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
