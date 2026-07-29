import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAdminContext } from '@/lib/admin-auth';
import { isSameOriginRequest } from '@/lib/request-security';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional().default(''),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const admin = await getApiAdminContext('staff');
  if (!admin) return NextResponse.json({ error: 'ไม่มีสิทธิ์ตรวจสอบคำขอเทรด' }, { status: 403 });
  const { id } = await context.params;
  const parsedId = z.string().uuid().safeParse(id);
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !parsed.success) return NextResponse.json({ error: 'ข้อมูลการตรวจสอบไม่ถูกต้อง' }, { status: 400 });

  if (parsed.data.action === 'approve') {
    const { error } = await admin.supabase.rpc('approve_trade_request', {
      p_trade_id: id,
      p_reviewer_id: admin.user.id,
    });
    if (error) {
      console.error('[trade:approve]', error.message);
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (parsed.data.note) {
      await admin.supabase.from('trades').update({ review_note: parsed.data.note }).eq('id', id);
    }
  } else {
    const { data, error } = await admin.supabase
      .from('trades')
      .update({
        status: 'rejected',
        review_note: parsed.data.note || null,
        reviewed_by: admin.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: error?.message || 'คำขอนี้ถูกตรวจสอบไปแล้ว' }, { status: 409 });
  }

  revalidateTag('pbal-site-data', { expire: 0 });
  revalidatePath('/trades');
  revalidatePath('/players');
  revalidatePath('/teams');
  revalidatePath('/admin/trades');
  return NextResponse.json({ ok: true });
}
