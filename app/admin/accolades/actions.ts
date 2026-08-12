'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-auth';

const uuid = z.string().uuid();
const optionalId = z.union([z.literal(''), uuid]);
const recipient = z.string().regex(/^(player|team):[0-9a-f-]{36}$/i);
const competition = z.string().regex(/^(season|tournament):[0-9a-f-]{36}$/i);

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
    recipient,
    title: z.string().trim().min(2).max(120),
    category: z.enum(['achievement', 'medal', 'championship', 'award', 'record']),
    description: z.string().trim().max(1200),
    awardedOn: z.union([z.literal(''), z.string().date()]),
    sortOrder: z.coerce.number().int().min(0).max(9999),
    isPublic: z.boolean(),
  }).safeParse({
    id: formData.get('id') ?? '',
    competition: formData.get('competition'),
    recipient: formData.get('recipient'),
    title: formData.get('title'),
    category: formData.get('category'),
    description: formData.get('description'),
    awardedOn: formData.get('awarded_on') ?? '',
    sortOrder: formData.get('sort_order') ?? 0,
    isPublic: formData.get('is_public') === 'on',
  });
  if (!parsed.success) redirect('/admin/accolades?error=invalid-accolade');

  const [recipientType, recipientId] = parsed.data.recipient.split(':') as ['player' | 'team', string];
  const recipientTable = recipientType === 'player' ? 'players' : 'teams';
  const { data: recipientRow } = await supabase.from(recipientTable).select('id').eq('id', recipientId).maybeSingle();
  if (!recipientRow) redirect('/admin/accolades?error=recipient-not-found');

  const [competitionType, competitionId] = parsed.data.competition.split(':') as ['season' | 'tournament', string];
  const competitionTable = competitionType === 'season' ? 'seasons' : 'tournaments';
  const { data: competitionRow } = await supabase.from(competitionTable).select('id').eq('id', competitionId).maybeSingle();
  if (!competitionRow) redirect('/admin/accolades?error=competition-not-found');

  const payload = {
    season_id: competitionType === 'season' ? competitionId : null,
    tournament_id: competitionType === 'tournament' ? competitionId : null,
    player_id: recipientType === 'player' ? recipientId : null,
    team_id: recipientType === 'team' ? recipientId : null,
    title: parsed.data.title,
    category: parsed.data.category,
    description: parsed.data.description || null,
    awarded_on: parsed.data.awardedOn || null,
    sort_order: parsed.data.sortOrder,
    is_public: parsed.data.isPublic,
    updated_at: new Date().toISOString(),
  };
  const result = parsed.data.id
    ? await supabase.from('accolades').update(payload).eq('id', parsed.data.id)
    : await supabase.from('accolades').insert(payload);
  if (result.error) {
    console.error('[accolade:save]', result.error.message);
    redirect('/admin/accolades?error=save-failed');
  }

  refreshAccolades();
  redirect('/admin/accolades?saved=accolade');
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
