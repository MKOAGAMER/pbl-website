import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-admin';
import { isSameOriginRequest } from '@/lib/request-security';

const profileSchema = z.object({ bio: z.string().trim().max(1500) });

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const [user, supabase] = await Promise.all([getCurrentUser(), Promise.resolve(createAdminClient())]);
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนแก้โปรไฟล์' }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'ระบบฐานข้อมูลยังไม่พร้อมใช้งาน' }, { status: 503 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'About ต้องยาวไม่เกิน 1,500 ตัวอักษร' }, { status: 400 });

  const { data: player } = await supabase.from('players').select('id, slug').eq('user_id', user.id).maybeSingle();
  if (!player) return NextResponse.json({ error: 'ไม่พบโปรไฟล์ผู้เล่นที่เชื่อมกับบัญชีนี้' }, { status: 404 });
  const { error } = await supabase.from('players').update({ bio: parsed.data.bio || null, updated_at: new Date().toISOString() }).eq('id', player.id);
  if (error) return NextResponse.json({ error: 'บันทึก About ไม่สำเร็จ' }, { status: 500 });

  revalidateTag('pbal-site-data', { expire: 0 });
  revalidatePath('/account');
  revalidatePath('/players');
  revalidatePath(`/players/${player.slug}`);
  return NextResponse.json({ ok: true });
}
