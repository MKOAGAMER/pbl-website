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

  const { data: localUsers, error: localError } = await admin.supabase
    .from('users')
    .select('roblox_id, username, avatar_url, role, admin_permission')
    .ilike('username', `%${parsed.data}%`)
    .order('username')
    .limit(12);
  if (localError) console.error('[local-user-search]', localError.message);

  try {
    const robloxUsers = await searchRobloxUsers(parsed.data);
    const localById = new Map((localUsers ?? []).map((row) => [String(row.roblox_id), row]));
    const merged = new Map(robloxUsers.map((user) => [user.id, user]));
    for (const user of localUsers ?? []) {
      const id = String(user.roblox_id);
      if (!merged.has(id)) merged.set(id, {
        id,
        username: String(user.username),
        displayName: String(user.username),
        avatarUrl: user.avatar_url ? String(user.avatar_url) : null,
        verified: false,
      });
    }
    return NextResponse.json({
      users: [...merged.values()].map((user) => {
        const access = localById.get(user.id);
        return {
          ...user,
          avatarUrl: user.avatarUrl ?? (access?.avatar_url ? String(access.avatar_url) : null),
          role: access?.role ?? 'player',
          adminPermission: access?.admin_permission ?? null,
          registered: Boolean(access),
        };
      }),
    }, { headers: { 'cache-control': 'private, no-store' } });
  } catch (error) {
    console.error('[roblox-user-search]', error instanceof Error ? error.message : error);
    if (localUsers?.length) {
      return NextResponse.json({
        users: localUsers.map((user) => ({
          id: String(user.roblox_id), username: String(user.username), displayName: String(user.username),
          avatarUrl: user.avatar_url ? String(user.avatar_url) : null, verified: false, registered: true,
          role: user.role, adminPermission: user.admin_permission,
        })),
      }, { headers: { 'cache-control': 'private, no-store' } });
    }
    return NextResponse.json({ error: 'Roblox search is temporarily unavailable and no matching PBAL account was found.' }, { status: 502 });
  }
}
