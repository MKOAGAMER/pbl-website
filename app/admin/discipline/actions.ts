'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-auth';
import { createDisciplinaryAction, DISCIPLINE_ACTION_TYPES, revokeDisciplinaryAction } from '@/lib/discipline';

const optionalUrl = z.union([z.literal(''), z.string().url().max(500)]);
const optionalLocalDateTime = z.union([z.literal(''), z.string().datetime({ local: true })]);

export async function issueDisciplinaryAction(formData: FormData) {
  const { supabase, user } = await requireAdminPermission('staff');
  const parsed = z.object({
    playerId: z.string().uuid(),
    actionType: z.enum(DISCIPLINE_ACTION_TYPES),
    reason: z.string().trim().min(3).max(2000),
    publicNote: z.string().trim().max(1000),
    evidenceUrl: optionalUrl,
    startsAt: optionalLocalDateTime,
    endsAt: optionalLocalDateTime,
    isPublic: z.boolean(),
  }).refine((value) => !value.isPublic || value.publicNote.length >= 3, {
    message: 'A public note is required for a public action.',
    path: ['publicNote'],
  }).safeParse({
    playerId: formData.get('player_id'),
    actionType: formData.get('action_type'),
    reason: formData.get('reason'),
    publicNote: formData.get('public_note'),
    evidenceUrl: formData.get('evidence_url'),
    startsAt: formData.get('starts_at'),
    endsAt: formData.get('ends_at'),
    isPublic: formData.get('is_public') === 'on',
  });
  if (!parsed.success) redirect('/admin/discipline?error=invalid-action');
  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt).toISOString() : new Date().toISOString();
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt).toISOString() : null;
  if (endsAt && endsAt <= startsAt) redirect('/admin/discipline?error=invalid-dates');

  try {
    await createDisciplinaryAction(supabase, user, {
      ...parsed.data,
      startsAt,
      endsAt,
      source: 'web',
    });
  } catch (error) {
    console.error('[discipline:issue]', error instanceof Error ? error.message : error);
    redirect('/admin/discipline?error=save-failed');
  }
  revalidatePath('/blacklist');
  revalidatePath('/admin/discipline');
  revalidatePath('/trades');
  redirect('/admin/discipline?saved=issued');
}

export async function revokeAction(formData: FormData) {
  const { supabase, user } = await requireAdminPermission('staff');
  const parsed = z.object({
    actionId: z.string().uuid(),
    reason: z.string().trim().min(3).max(1000),
  }).safeParse({
    actionId: formData.get('action_id'),
    reason: formData.get('revocation_reason'),
  });
  if (!parsed.success) redirect('/admin/discipline?error=invalid-revocation');
  try {
    await revokeDisciplinaryAction(supabase, user, {
      ...parsed.data,
      source: 'web',
    });
  } catch (error) {
    console.error('[discipline:revoke]', error instanceof Error ? error.message : error);
    redirect('/admin/discipline?error=revoke-failed');
  }
  revalidatePath('/blacklist');
  revalidatePath('/admin/discipline');
  redirect('/admin/discipline?saved=revoked');
}
