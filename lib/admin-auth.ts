import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createAdminClient } from './supabase-admin';
import { getCurrentUser } from './session';
import type { AdminPermission } from './pbal-types';

// Legacy names remain accepted so preserved operational actions still compile.
export type StaffRole =
  | AdminPermission
  | 'team_manager'
  | 'statistician'
  | 'admin';

const permissionRank: Record<AdminPermission, number> = {
  editor: 1,
  staff: 2,
  super_admin: 3,
};

export async function getApiAdminContext(minimum: AdminPermission = 'editor') {
  const supabase = createAdminClient();
  const user = await getCurrentUser();
  if (!supabase || !user?.adminPermission) return null;
  if (user.role !== 'staff' && user.role !== 'admin') return null;
  if (permissionRank[user.adminPermission] < permissionRank[minimum]) return null;
  return { supabase, user, permission: user.adminPermission };
}

function legacyPermission(role: StaffRole): AdminPermission {
  if (role === 'super_admin' || role === 'admin') return 'super_admin';
  if (role === 'staff' || role === 'team_manager' || role === 'statistician') return 'staff';
  return 'editor';
}

export const getStaffSession = cache(async () => {
  const supabase = createAdminClient();
  const user = await getCurrentUser();
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  return {
    supabase,
    user,
    profile: isStaff && user
      ? {
          id: user.id,
          display_name: user.username,
          role: user.adminPermission,
          managed_team_id: null,
        }
      : null,
  };
});

export async function requireStaff(roles?: StaffRole[]) {
  const session = await getStaffSession();
  if (!session.supabase || !session.user) {
    redirect('/login?next=/admin');
  }
  if (
    (session.user.role !== 'staff' && session.user.role !== 'admin') ||
    !session.user.adminPermission
  ) redirect('/?error=forbidden');

  const permission = session.user.adminPermission;
  if (
    roles?.length &&
    !roles.some((role) => permissionRank[permission] >= permissionRank[legacyPermission(role)])
  ) {
    redirect('/admin?error=forbidden');
  }

  return {
    supabase: session.supabase,
    user: session.user,
    profile: session.profile,
    role: permission as StaffRole,
  };
}

export async function requireAdminPermission(minimum: AdminPermission = 'editor') {
  const session = await requireStaff([minimum]);
  return { ...session, permission: session.user.adminPermission as AdminPermission };
}
