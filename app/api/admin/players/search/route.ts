import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAdminContext } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
const querySchema = z.string().trim().min(2).max(80);

export async function GET(request: Request) {
  const admin = await getApiAdminContext('staff');
  if (!admin) return NextResponse.json({ error: 'Staff access required.' }, { status: 403 });
  const parsed = querySchema.safeParse(new URL(request.url).searchParams.get('q'));
  if (!parsed.success) return NextResponse.json({ error: 'พิมพ์อย่างน้อย 2 ตัวอักษร' }, { status: 400 });

  const select = 'id, name, roblox_username, avatar_url, bio, position, positions, is_active, team_id';
  const pattern = `%${parsed.data}%`;
  const [nameResult, usernameResult] = await Promise.all([
    admin.supabase.from('players').select(select).ilike('name', pattern).order('name').limit(20),
    admin.supabase.from('players').select(select).ilike('roblox_username', pattern).order('name').limit(20),
  ]);
  if (nameResult.error || usernameResult.error) return NextResponse.json({ error: 'ค้นหาโปรไฟล์ไม่สำเร็จ' }, { status: 500 });
  const merged = new Map<string, Record<string, unknown>>();
  for (const row of [...(nameResult.data ?? []), ...(usernameResult.data ?? [])]) merged.set(String(row.id), row);
  return NextResponse.json({ players: [...merged.values()].slice(0, 20) }, { headers: { 'cache-control': 'private, no-store' } });
}
