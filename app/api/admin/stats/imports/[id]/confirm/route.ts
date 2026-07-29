import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAdminContext } from '@/lib/admin-auth';
import { extractedStatRowsSchema, toDatabaseStatRows, validateBasketballStatRows } from '@/lib/stat-import';
import { isSameOriginRequest } from '@/lib/request-security';

const bodySchema = z.object({ rows: extractedStatRowsSchema });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  const admin = await getApiAdminContext('staff');
  if (!admin) return NextResponse.json({ error: 'ไม่มีสิทธิ์ยืนยันสถิติ' }, { status: 403 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'รหัสรายการนำเข้าไม่ถูกต้อง' }, { status: 400 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'ข้อมูลตารางไม่ถูกต้องหรือเกินขอบเขตที่รองรับ' }, { status: 400 });
  const issues = validateBasketballStatRows(parsed.data.rows);
  if (issues.length) return NextResponse.json({ error: issues[0], issues }, { status: 422 });

  const { data, error } = await admin.supabase.rpc('confirm_stat_import', {
    p_import_id: id,
    p_reviewer_id: admin.user.id,
    p_rows: toDatabaseStatRows(parsed.data.rows),
  });
  if (error) {
    console.error('[stats:confirm]', error.message);
    return NextResponse.json({ error: error.message }, { status: 409 });
  }

  revalidatePath('/stats');
  revalidatePath('/games');
  revalidatePath('/players');
  revalidatePath('/admin/stats');
  return NextResponse.json({ ok: true, savedRows: data });
}
