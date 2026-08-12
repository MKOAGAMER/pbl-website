'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-auth';

const uuid = z.string().uuid();
const optionalId = z.union([z.literal(''), uuid]);
const recipient = z.string().regex(/^(player|team):[0-9a-f-]{36}$/i);
const competition = z.string().regex(/^(season|tournament):[0-9a-f-]{36}$/i);
const recipients = z.array(recipient).min(1).max(100);

function refreshAccolades() {
  updateTag('pbal-site-data');
  revalidatePath('/accolades');
  revalidatePath('/players');
  revalidatePath('/teams');
  revalidatePath('/admin/accolades');
}

export async function saveAccolade(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = z.object({
    id: optionalId,
    competition,
    recipients,
    title: z.string().trim().min(2).max(120),
    category: z.enum(['achievement', 'medal', 'championship', 'award', 'record']),
    description: z.string().trim().max(1200),
    awardedOn: z.union([z.literal(''), z.string().date()]),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    isPublic: z.boolean(),
  }).safeParse({
    id: formData.get('id') ?? '',
    competition: formData.get('competition'),
    recipients: formData.getAll('recipients'),
    title: formData.get('title'),
    category: formData.get('category'),
    description: formData.get('description'),
    awardedOn: formData.get('awarded_on') ?? '',
    sortOrder: formData.get('sort_order') ?? 0,
    isPublic: formData.get('is_public') === 'on',
  });
  if (!parsed.success) redirect('/admin/accolades?error=invalid-accolade');
  if (parsed.data.id && parsed.data.recipients.length !== 1) redirect('/admin/accolades?error=invalid-recipient-count');

  const recipientEntries = [...new Set(parsed.data.recipients)].map((entry) => {
    const [type, id] = entry.split(':') as ['player' | 'team', string];
    return { type, id };
  });
  const playerIds = recipientEntries.filter((entry) => entry.type === 'player').map((entry) => entry.id);
  const teamIds = recipientEntries.filter((entry) => entry.type === 'team').map((entry) => entry.id);
  const [playerResult, teamResult] = await Promise.all([
    playerIds.length ? supabase.from('players').select('id').in('id', playerIds) : Promise.resolve({ data: [], error: null }),
    teamIds.length ? supabase.from('teams').select('id').in('id', teamIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (playerResult.error || teamResult.error || playerResult.data.length !== playerIds.length || teamResult.data.length !== teamIds.length) {
    redirect('/admin/accolades?error=recipient-not-found');
  }

  const [competitionType, competitionId] = parsed.data.competition.split(':') as ['season' | 'tournament', string];
  const competitionTable = competitionType === 'season' ? 'seasons' : 'tournaments';
  const { data: competitionRow } = await supabase.from(competitionTable).select('id').eq('id', competitionId).maybeSingle();
  if (!competitionRow) redirect('/admin/accolades?error=competition-not-found');

  const sharedPayload = {
    season_id: competitionType === 'season' ? competitionId : null,
    tournament_id: competitionType === 'tournament' ? competitionId : null,
    title: parsed.data.title,
    category: parsed.data.category,
    description: parsed.data.description || null,
    awarded_on: parsed.data.awardedOn || null,
    sort_order: parsed.data.sortOrder,
    is_public: parsed.data.isPublic,
    updated_at: new Date().toISOString(),
  };
  const result = parsed.data.id
    ? await supabase.from('accolades').update({
        ...sharedPayload,
        player_id: recipientEntries[0].type === 'player' ? recipientEntries[0].id : null,
        team_id: recipientEntries[0].type === 'team' ? recipientEntries[0].id : null,
      }).eq('id', parsed.data.id)
    : await supabase.from('accolades').insert(recipientEntries.map((entry) => ({
        ...sharedPayload,
        player_id: entry.type === 'player' ? entry.id : null,
        team_id: entry.type === 'team' ? entry.id : null,
      })));
  if (result.error) {
    console.error('[accolade:save]', result.error.message);
    redirect('/admin/accolades?error=save-failed');
  }

  refreshAccolades();
  redirect(`/admin/accolades?saved=accolade&count=${recipientEntries.length}`);
}

export async function deleteAccolade(formData: FormData) {
  const { supabase } = await requireAdminPermission('staff');
  const parsed = uuid.safeParse(formData.get('id'));
  if (!parsed.success) redirect('/admin/accolades?error=invalid-accolade');
  const { error } = await supabase.from('accolades').delete().eq('id', parsed.data);
  if (error) redirect('/admin/accolades?error=delete-failed');
  refreshAccolades();
  redirect('/admin/accolades?saved=deleted');
}
