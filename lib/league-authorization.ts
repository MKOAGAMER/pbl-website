import 'server-only';

import type { AdminPermission, PbalUser } from './pbal-types';
import { LeagueOperationError } from './operation-error';

const permissionRank: Record<AdminPermission, number> = {
  editor: 1,
  staff: 2,
  super_admin: 3,
};

export function hasAdminPermission(
  user: PbalUser | null | undefined,
  minimum: AdminPermission = 'editor',
) {
  return Boolean(
    user
      && (user.role === 'staff' || user.role === 'admin')
      && user.adminPermission
      && permissionRank[user.adminPermission] >= permissionRank[minimum],
  );
}

export function requireOperationPermission(
  user: PbalUser | null | undefined,
  minimum: AdminPermission = 'editor',
) {
  if (!hasAdminPermission(user, minimum)) {
    throw new LeagueOperationError(403, 'forbidden', 'You do not have permission for this operation.');
  }
  return user as PbalUser & { adminPermission: AdminPermission };
}
