import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiAdminContext } from '@/lib/admin-auth';
import { searchRobloxUsers } from '@/lib/roblox-users';

export const dynamic = 'force-dynamic';

const querySchema = z.string().trim().min(3).max(20).regex(/^[A-Za-z0-9_]+$/);

export async function GET(request: Request) {
  const admin = await getApiAdminContext('super_admin');
  if (!admin) return NextResponse.json({ error: 'Super Admin access required.' }, { status: 403 });
  const parsed = querySchema.safeParse(new URL(request.url).searchParams.get('q'));
  if (!parsed.success) return NextResponse.json({ error: 'Enter at least 3 letters from a Roblox username.' }, { status: 400 });

  try {
    const robloxUsers = await searchRobloxUsers(parsed.data);
    const ids = robloxUsers.map((user) => user.id);
    const { data: existing } = ids.length
      ? await admin.supabase.from('users').select('roblox_id, role, admin_permission').in('roblox_id', ids)
      : { data: [] };
    const accessById = new Map((existing ?? []).map((row) => [String(row.roblox_id), row]));
    return NextResponse.json({
      users: robloxUsers.map((user) => {
        const access = accessById.get(user.id);
        return {
          ...user,
          role: access?.role ?? 'player',
          adminPermission: access?.admin_permission ?? null,
          registered: Boolean(access),
        };
      }),
    }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) {
    console.error('[roblox-user-search]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Roblox search is temporarily unavailable.' }, { status: 502 });
  }
}
