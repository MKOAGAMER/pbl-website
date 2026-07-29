'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-auth';
import { getRobloxUserByUsername } from '@/lib/roblox-users';
import { getMkoaGroupPermission } from '@/lib/roblox-auth';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const themeSchema = z.object({
  mode: z.enum(['dark', 'light', 'system']),
  primary: hex,
  secondary: hex,
  background: hex,
  surface: hex,
  foreground: hex,
});
const staffSchema = z.array(z.object({
  name: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(80),
  robloxUsername: z.string().trim().regex(/^[A-Za-z0-9_]{3,20}$/).optional(),
  avatarUrl: z.string().url().optional(),
})).max(50);
const linksSchema = z.array(z.object({
  label: z.string().trim().min(1).max(60),
  url: z.string().url(),
})).max(50);
const addonsSchema = z.record(z.string().max(80), z.union([
  z.boolean(),
  z.string().max(500),
  z.number().finite(),
]));

function parseJson(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export async function updateSiteConfig(formData: FormData) {
  const { supabase, user } = await requireAdminPermission('editor');
  const parsed = z.object({
    theme: themeSchema,
    staff: staffSchema,
    links: linksSchema,
    addons: addonsSchema,
  }).safeParse({
    theme: {
      mode: formData.get('theme_mode'),
      primary: formData.get('theme_primary'),
      secondary: formData.get('theme_secondary'),
      background: formData.get('theme_background'),
      surface: formData.get('theme_surface'),
      foreground: formData.get('theme_foreground'),
    },
    staff: parseJson(formData.get('staff_json')),
    links: parseJson(formData.get('links_json')),
    addons: parseJson(formData.get('addons_json')),
  });

  if (!parsed.success) redirect('/admin?error=invalid-config');

  const { error } = await supabase.from('site_config').upsert({
    id: 'main',
    ...parsed.data,
    updated_by: user.id,
  });
  if (error) {
    console.error('Unable to update site config', error);
    redirect('/admin?error=config-save');
  }

  revalidatePath('/', 'layout');
  redirect('/admin?saved=config');
}

export async function updateRobloxUserAccess(formData: FormData) {
  const { supabase } = await requireAdminPermission('super_admin');
  const parsed = z.object({
    username: z.string().trim().regex(/^[A-Za-z0-9_]{3,20}$/),
    role: z.enum(['player', 'staff', 'admin']),
    permission: z.enum(['', 'editor', 'staff', 'super_admin']),
  }).safeParse({
    username: formData.get('roblox_username'),
    role: formData.get('role'),
    permission: formData.get('admin_permission'),
  });
  if (!parsed.success) redirect('/admin?error=invalid-access');
  const privileged = parsed.data.role === 'staff' || parsed.data.role === 'admin';
  if (privileged !== Boolean(parsed.data.permission)) redirect('/admin?error=invalid-access');

  const roblox = await getRobloxUserByUsername(parsed.data.username);
  if (!roblox) redirect('/admin?error=roblox-user-not-found');
  const groupMember = Boolean(await getMkoaGroupPermission(roblox.id));
  const { data: leagueUser, error: userError } = await supabase.from('users').upsert({
    roblox_id: roblox.id,
    username: roblox.username,
    avatar_url: roblox.avatarUrl,
    role: parsed.data.role,
    group_member: groupMember,
    admin_permission: parsed.data.permission || null,
  }, { onConflict: 'roblox_id' }).select('id').single<{ id: string }>();
  if (userError || !leagueUser) {
    console.error('[user-access]', userError?.message);
    redirect('/admin?error=access-save');
  }

  const playerIdentity = {
    user_id: leagueUser.id,
    roblox_username: roblox.username,
    roblox_user_id: roblox.id,
    avatar_url: roblox.avatarUrl,
    is_active: true,
  };
  const { data: existingPlayer } = await supabase.from('players').select('id').eq('roblox_user_id', roblox.id).maybeSingle<{ id: string }>();
  const playerWrite = existingPlayer
    ? await supabase.from('players').update(playerIdentity).eq('id', existingPlayer.id)
    : await supabase.from('players').insert({
        ...playerIdentity,
        name: roblox.username,
        first_name: roblox.username,
        last_name: '',
        slug: `roblox-${roblox.id}`,
        position: 'UTIL',
        team_id: null,
      });
  if (playerWrite.error) {
    console.error('[player-access]', playerWrite.error.message);
    redirect('/admin?error=access-save');
  }

  revalidatePath('/admin');
  revalidatePath('/players');
  redirect('/admin?saved=access');
}
