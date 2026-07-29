'use client';

import { Search, ShieldCheck, UserCog, Verified } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { updateRobloxUserAccess } from './actions';
import { SubmitButton } from './SubmitButton';
import { PlayerAvatar } from '@/app/components/ui/PlayerAvatar';

type SearchUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  verified: boolean;
  registered: boolean;
  role: 'player' | 'franchise_owner' | 'staff' | 'admin';
  adminPermission: 'editor' | 'staff' | 'super_admin' | null;
  franchiseTeamId: string | null;
};

type TeamOption = { id: string; name: string };

export function UserAccessManager({ teams }: { teams: TeamOption[] }) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 3) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query.trim())}`, { cache: 'no-store' });
      const payload = await response.json() as { users?: SearchUser[]; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Search failed.');
      setUsers(payload.users ?? []);
      if (!payload.users?.length) setMessage('No Roblox users found.');
    } catch (error) {
      setUsers([]);
      setMessage(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex gap-3">
        <UserCog className="mt-0.5 h-5 w-5 text-[var(--orange-soft)]" />
        <div><h2 className="font-black">User access</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">Search Roblox only when you need to grant or change access. The dashboard no longer loads every account.</p></div>
      </div>

      <form onSubmit={search} className="mt-5 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Roblox username</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Roblox username..." minLength={3} maxLength={20} className="admin-input !pl-11" />
        </label>
        <button type="submit" disabled={busy || query.trim().length < 3} className="rounded-xl bg-[var(--orange)] px-5 text-xs font-black uppercase tracking-[0.1em] text-black disabled:opacity-50">{busy ? 'Searching...' : 'Search'}</button>
      </form>
      {message && <p role="status" className="mt-3 text-sm text-[var(--ink-faint)]">{message}</p>}

      <div className="mt-5 space-y-3">
        {users.map((user) => <AccessForm key={user.id} user={user} teams={teams} />)}
      </div>
    </section>
  );
}

function AccessForm({ user, teams }: { user: SearchUser; teams: TeamOption[] }) {
  const [role, setRole] = useState<SearchUser['role']>(user.role);
  const [permission, setPermission] = useState(user.adminPermission ?? '');
  const [franchiseTeamId, setFranchiseTeamId] = useState(user.franchiseTeamId ?? '');
  const staffRole = role === 'staff' || role === 'admin';

  return <form action={updateRobloxUserAccess} className="grid items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-4 xl:grid-cols-[minmax(14rem,1fr)_10rem_12rem_14rem_auto]">
    <input type="hidden" name="roblox_username" value={user.username} />
    <div className="flex min-w-0 items-center gap-3">
      <PlayerAvatar src={user.avatarUrl} name={user.username} size="sm" className="!h-11 !w-11" />
      <div className="min-w-0"><p className="flex items-center gap-1.5 truncate text-sm font-black">{user.username}{user.verified && <Verified className="h-3.5 w-3.5 text-sky-300" />}</p><p className="mt-0.5 truncate text-xs text-[var(--ink-faint)]">{user.displayName} · {user.registered ? 'PBAL account' : 'Not registered yet'}</p></div>
    </div>
    <select name="role" value={role} onChange={(event) => { const nextRole = event.target.value as SearchUser['role']; setRole(nextRole); if (nextRole === 'staff' || nextRole === 'admin') { setPermission((current) => current || 'staff'); setFranchiseTeamId(''); } else { setPermission(''); if (nextRole !== 'franchise_owner') setFranchiseTeamId(''); } }} className="admin-input" aria-label={`Role for ${user.username}`}>
      <option value="player">Player</option><option value="franchise_owner">Franchise Owner</option><option value="staff">Staff</option><option value="admin">Admin</option>
    </select>
    {!staffRole && <input type="hidden" name="admin_permission" value="" />}
    <select name="admin_permission" value={permission} onChange={(event) => setPermission(event.target.value as typeof permission)} disabled={!staffRole} className="admin-input disabled:opacity-45" aria-label={`Admin permission for ${user.username}`}>
      <option value="">No staff control</option><option value="editor">Editor</option><option value="staff">Staff</option><option value="super_admin">Super Admin</option>
    </select>
    {role !== 'franchise_owner' && <input type="hidden" name="franchise_team_id" value="" />}
    <select name="franchise_team_id" value={franchiseTeamId} onChange={(event) => setFranchiseTeamId(event.target.value)} disabled={role !== 'franchise_owner'} required={role === 'franchise_owner'} className="admin-input disabled:opacity-45" aria-label={`Franchise team for ${user.username}`}>
      <option value="">Choose franchise team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
    </select>
    <SubmitButton><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Save access</span></SubmitButton>
  </form>;
}
