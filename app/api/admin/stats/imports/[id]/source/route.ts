import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAdminContext } from '@/lib/admin-auth';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await getApiAdminContext('staff');
  if (!admin) return NextResponse.json({ error: 'ไม่มีสิทธิ์ดูภาพต้นฉบับ' }, { status: 403 });
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'รหัสรายการไม่ถูกต้อง' }, { status: 400 });

  const { data: statImport } = await admin.supabase
    .from('stat_imports')
    .select('storage_bucket, storage_path, original_filename')
    .eq('id', id)
    .maybeSingle();
  if (!statImport) return NextResponse.json({ error: 'ไม่พบภาพต้นฉบับ' }, { status: 404 });

  const { data, error } = await admin.supabase.storage
    .from(statImport.storage_bucket)
    .createSignedUrl(statImport.storage_path, 60, { download: statImport.original_filename });
  if (error || !data?.signedUrl) return NextResponse.json({ error: 'สร้างลิงก์ภาพไม่สำเร็จ' }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
