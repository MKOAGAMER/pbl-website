'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminPermission } from '@/lib/admin-auth';

const uuid = z.string().uuid();
const optionalId = z.union([z.literal(''), uuid]);
const optionalUrl = z.union([z.literal(''), z.string().url().max(500)]);

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function refreshContent() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin/content');
  revalidatePath('/news');
  revalidatePath('/staff');
  revalidatePath('/links');
}

export async function saveNewsPost(formData: FormData) {
  const { supabase } = await requireAdminPermission('editor');
  const parsed = z.object({
    id: optionalId,
    title: z.string().trim().min(3).max(160),
    excerpt: z.string().trim().max(500),
    content: z.string().trim().min(1).max(50_000),
    category: z.string().trim().min(1).max(60),
    coverUrl: optionalUrl,
    status: z.enum(['draft', 'published', 'archived']),
    featured: z.boolean(),
  }).safeParse({
    id: formData.get('id'), title: formData.get('title'), excerpt: formData.get('excerpt'), content: formData.get('content'),
    category: formData.get('category'), coverUrl: formData.get('cover_url'), status: formData.get('status'), featured: formData.get('is_featured') === 'on',
  });
  if (!parsed.success) redirect('/admin/content?error=invalid-news');
  const payload = {
    title: parsed.data.title,
    excerpt: parsed.data.excerpt || null,
    content: parsed.data.content,
    category: parsed.data.category,
    cover_image_url: parsed.data.coverUrl || null,
    status: parsed.data.status,
    is_featured: parsed.data.featured,
    published_at: parsed.data.status === 'published' ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const result = parsed.data.id
    ? await supabase.from('news_posts').update(payload).eq('id', parsed.data.id)
    : await supabase.from('news_posts').insert({ ...payload, slug: `${slugify(parsed.data.title) || 'news'}-${Date.now().toString(36)}` });
  if (result.error) {
    console.error('[content:news]', result.error.message);
    redirect('/admin/content?error=news-save');
  }
  refreshContent();
  redirect('/admin/content?saved=news');
}

export async function deleteNewsPost(formData: FormData) {
  const { supabase } = await requireAdminPermission('editor');
  const parsed = uuid.safeParse(formData.get('id'));
  if (!parsed.success) redirect('/admin/content?error=invalid-news');
  const { error } = await supabase.from('news_posts').delete().eq('id', parsed.data);
  if (error) redirect('/admin/content?error=news-delete');
  refreshContent();
  redirect('/admin/content?saved=news-deleted');
}

export async function saveStaffMember(formData: FormData) {
  const { supabase } = await requireAdminPermission('editor');
  const parsed = z.object({
    id: optionalId,
    name: z.string().trim().min(1).max(80),
    role: z.string().trim().min(1).max(80),
    department: z.string().trim().max(80),
    username: z.union([z.literal(''), z.string().trim().regex(/^[A-Za-z0-9_]{3,20}$/)]),
    avatarUrl: optionalUrl,
    sortOrder: z.coerce.number().int().min(0).max(999),
    isActive: z.boolean(),
  }).safeParse({
    id: formData.get('id'), name: formData.get('display_name'), role: formData.get('role'), department: formData.get('department'),
    username: formData.get('roblox_username'), avatarUrl: formData.get('avatar_url'), sortOrder: formData.get('sort_order'), isActive: formData.get('is_active') === 'on',
  });
  if (!parsed.success) redirect('/admin/content?error=invalid-staff');
  const payload = {
    display_name: parsed.data.name,
    role: parsed.data.role,
    department: parsed.data.department || null,
    roblox_username: parsed.data.username || null,
    avatar_url: parsed.data.avatarUrl || null,
    sort_order: parsed.data.sortOrder,
    is_active: parsed.data.isActive,
    updated_at: new Date().toISOString(),
  };
  const result = parsed.data.id
    ? await supabase.from('staff_members').update(payload).eq('id', parsed.data.id)
    : await supabase.from('staff_members').insert(payload);
  if (result.error) redirect('/admin/content?error=staff-save');
  refreshContent();
  redirect('/admin/content?saved=staff');
}

export async function deleteStaffMember(formData: FormData) {
  const { supabase } = await requireAdminPermission('editor');
  const parsed = uuid.safeParse(formData.get('id'));
  if (!parsed.success) redirect('/admin/content?error=invalid-staff');
  const { error } = await supabase.from('staff_members').delete().eq('id', parsed.data);
  if (error) redirect('/admin/content?error=staff-delete');
  refreshContent();
  redirect('/admin/content?saved=staff-deleted');
}

export async function saveLeagueLink(formData: FormData) {
  const { supabase } = await requireAdminPermission('editor');
  const parsed = z.object({
    id: optionalId,
    label: z.string().trim().min(1).max(80),
    url: z.string().url().max(500),
    kind: z.enum(['social', 'stream', 'sponsor', 'document', 'contact', 'other']),
    description: z.string().trim().max(300),
    sortOrder: z.coerce.number().int().min(0).max(999),
    isActive: z.boolean(),
  }).safeParse({
    id: formData.get('id'), label: formData.get('label'), url: formData.get('url'), kind: formData.get('kind'),
    description: formData.get('description'), sortOrder: formData.get('sort_order'), isActive: formData.get('is_active') === 'on',
  });
  if (!parsed.success) redirect('/admin/content?error=invalid-link');
  const payload = {
    label: parsed.data.label, url: parsed.data.url, kind: parsed.data.kind, description: parsed.data.description || null,
    sort_order: parsed.data.sortOrder, is_active: parsed.data.isActive, updated_at: new Date().toISOString(),
  };
  const result = parsed.data.id
    ? await supabase.from('league_links').update(payload).eq('id', parsed.data.id)
    : await supabase.from('league_links').insert(payload);
  if (result.error) redirect('/admin/content?error=link-save');
  refreshContent();
  redirect('/admin/content?saved=link');
}

export async function deleteLeagueLink(formData: FormData) {
  const { supabase } = await requireAdminPermission('editor');
  const parsed = uuid.safeParse(formData.get('id'));
  if (!parsed.success) redirect('/admin/content?error=invalid-link');
  const { error } = await supabase.from('league_links').delete().eq('id', parsed.data);
  if (error) redirect('/admin/content?error=link-delete');
  refreshContent();
  redirect('/admin/content?saved=link-deleted');
}
