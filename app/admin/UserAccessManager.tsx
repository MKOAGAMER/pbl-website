import { UserCog } from 'lucide-react';
import { updateUserAccess } from './actions';
import { SubmitButton } from './SubmitButton';

export type AccessUser = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: 'guest' | 'player' | 'staff' | 'admin';
  group_member: boolean;
  admin_permission: 'editor' | 'staff' | 'super_admin' | null;
};

export function UserAccessManager({ users }: { users: AccessUser[] }) {
  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="mb-5 flex gap-3">
        <UserCog className="mt-0.5 h-5 w-5 text-[var(--orange-soft)]" />
        <div>
          <h2 className="font-black">User access</h2>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">Super Admin only. Guest/Player comes from league access; Staff/Admin also requires an admin permission.</p>
        </div>
      </div>
      <div className="space-y-3">
        {users.map((user) => (
          <form key={user.id} action={updateUserAccess} className="grid items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3 md:grid-cols-[1fr_10rem_12rem_auto]">
            <input type="hidden" name="user_id" value={user.id} />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{user.username}</p>
              <p className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.09em] text-[var(--ink-faint)]">MKOA {user.group_member ? 'member' : 'guest'}</p>
            </div>
            <select name="role" defaultValue={user.role} className="admin-input" aria-label={`Role for ${user.username}`}>
              <option value="guest">Guest</option>
              <option value="player">Player</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <select name="admin_permission" defaultValue={user.admin_permission ?? ''} className="admin-input" aria-label={`Admin permission for ${user.username}`}>
              <option value="">No admin access</option>
              <option value="editor">Editor</option>
              <option value="staff">Staff</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <SubmitButton>Update</SubmitButton>
          </form>
        ))}
      </div>
    </section>
  );
}

