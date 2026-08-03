import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/session';
import { createAdminClient } from '@/lib/supabase-admin';
import { isSameOriginRequest } from '@/lib/request-security';

const positionSchema = z.enum(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']);
const profileSchema = z.object({
  bio: z.string().trim().max(1500),
  positions: z.array(positionSchema).min(1).max(3).refine((items) => new Set(items).size === items.length),
  jerseyNumber: z.coerce.number().int().min(0).max(99),
});

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const [user, supabase] = await Promise.all([getCurrentUser(), Promise.resolve(createAdminClient())]);
  if (!user) return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนแก้โปรไฟล์' }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: 'ระบบฐานข้อมูลยังไม่พร้อมใช้งาน' }, { status: 503 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'กรุณาตรวจ About ตำแหน่ง 1–3 ตำแหน่ง และเบอร์ 0–99' }, { status: 400 });

  const { data: player } = await supabase.from('players').select('id, slug').eq('user_id', user.id).maybeSingle();
  if (!player) return NextResponse.json({ error: 'ไม่พบโปรไฟล์ผู้เล่นที่เชื่อมกับบัญชีนี้' }, { status: 404 });
  const { error } = await supabase.rpc('update_player_self_profile', {
    p_player_id: player.id,
    p_bio: parsed.data.bio,
    p_positions: parsed.data.positions,
    p_jersey_number: parsed.data.jerseyNumber,
  });
  if (error) {
    const duplicateNumber = error.code === '23505';
    return NextResponse.json({
      error: duplicateNumber
        ? 'เบอร์นี้มีผู้เล่นในทีมใช้อยู่แล้ว กรุณาเลือกเบอร์อื่น'
        : 'บันทึกโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่',
    }, { status: duplicateNumber ? 409 : 500 });
  }

  revalidateTag('pbal-site-data', { expire: 0 });
  revalidatePath('/account');
  revalidatePath('/players');
  revalidatePath(`/players/${player.slug}`);
  return NextResponse.json({ ok: true });
}
