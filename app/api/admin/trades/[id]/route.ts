import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAdminContext } from '@/lib/admin-auth';
import { reviewTradeRequest } from '@/lib/league-operations';
import { operationErrorResponse } from '@/lib/operation-error';
import { isSameOriginRequest } from '@/lib/request-security';

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional().default(''),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  const admin = await getApiAdminContext('staff');
  if (!admin) return NextResponse.json({ error: 'ไม่มีสิทธิ์ตรวจสอบคำขอเทรด' }, { status: 403 });
  const { id } = await context.params;
  const parsedId = z.string().uuid().safeParse(id);
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !parsed.success) {
    return NextResponse.json({ error: 'ข้อมูลการตรวจสอบไม่ถูกต้อง' }, { status: 400 });
  }

  try {
    await reviewTradeRequest(admin.supabase, admin.user, {
      tradeId: id,
      action: parsed.data.action,
      note: parsed.data.note,
      source: 'web',
    });
  } catch (error) {
    return operationErrorResponse(error);
  }

  revalidateTag('pbal-site-data', { expire: 0 });
  revalidatePath('/trades');
  revalidatePath('/players');
  revalidatePath('/teams');
  revalidatePath('/admin/trades');
  return NextResponse.json({ ok: true });
}
