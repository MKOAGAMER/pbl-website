'use client';

import { Search, UserRoundCog } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ImageUploadField } from '../ImageUploadField';
import { SubmitButton } from '../SubmitButton';
import { syncPlayerAvatar, updatePlayerProfile } from '../league/actions';

type PlayerResult = {
  id: string;
  name: string;
  roblox_username: string | null;
  avatar_url: string | null;
  bio: string | null;
  position: string;
  positions: string[] | null;
  is_active: boolean;
};

const positionOptions = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'];

export function PlayerProfileManager() {
  const [query, setQuery] = useState('');
  const [players, setPlayers] = useState<PlayerResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('ค้นหาด้วยชื่อที่แสดงหรือ Roblox username เพื่อเริ่มแก้ไข');

  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/admin/players/search?q=${encodeURIComponent(query.trim())}`, { cache: 'no-store' });
      const payload = await response.json() as { players?: PlayerResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error || 'Search failed.');
      setPlayers(payload.players ?? []);
      if (!payload.players?.length) setMessage('ไม่พบโปรไฟล์ผู้เล่น');
    } catch (error) {
      setPlayers([]);
      setMessage(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-8">
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-6">
      <div className="flex gap-3"><UserRoundCog className="mt-0.5 h-5 w-5 text-[var(--orange-soft)]" /><div><h2 className="font-black">ค้นหา Player Profile</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">ระบบจะไม่โหลดผู้เล่นทั้งหมดขึ้นมาพร้อมกัน</p></div></div>
      <form onSubmit={search} className="mt-5 flex gap-3">
        <label className="relative min-w-0 flex-1"><span className="sr-only">ค้นหาผู้เล่น</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-faint)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} placeholder="ชื่อผู้เล่น หรือ Roblox username..." className="admin-input !pl-11" /></label>
        <button type="submit" disabled={busy || query.trim().length < 2} className="rounded-xl bg-[var(--orange)] px-6 text-xs font-black uppercase tracking-[0.1em] text-black disabled:opacity-50">{busy ? 'Searching...' : 'Search'}</button>
      </form>
      {message && <p role="status" className="mt-4 text-sm text-[var(--ink-faint)]">{message}</p>}
    </section>

    {players.map((player) => {
      const positions = player.positions?.length ? player.positions : [player.position || 'UTIL'];
      return <section key={player.id} className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="mb-6 border-b border-[var(--line)] pb-5"><p className="text-xs font-black uppercase tracking-[0.1em] text-[var(--orange-soft)]">@{player.roblox_username || 'unknown'}</p><h2 className="mt-2 text-2xl font-black">{player.name}</h2></div>
        <form action={updatePlayerProfile} className="grid gap-5 md:grid-cols-2">
          <input type="hidden" name="player_id" value={player.id} /><input type="hidden" name="roblox_username" value={player.roblox_username ?? ''} />
          <Field label="Display name"><input name="display_name" defaultValue={player.name} required className="admin-input" /></Field>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold text-[var(--ink-soft)]"><input type="checkbox" name="is_active" defaultChecked={player.is_active} /> Publish player</label>
          <fieldset className="md:col-span-2"><legend className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">Positions — เลือกได้สูงสุด 3 ตำแหน่ง ลำดับแรกเป็นตำแหน่งหลัก</legend><div className="grid grid-cols-4 gap-2 sm:grid-cols-8">{positionOptions.map((position) => <label key={position} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--page)] px-3 py-3 text-xs font-black"><input type="checkbox" name="positions" value={position} defaultChecked={positions.includes(position)} /> {position}</label>)}</div></fieldset>
          <Field label="About / Biography" wide><textarea name="bio" defaultValue={player.bio ?? ''} rows={7} maxLength={1500} className="admin-input py-3" /></Field>
          <ImageUploadField name="avatar_url" label="Player profile image" bucket="player-photos" initialValue={player.avatar_url} help="เลือกไฟล์จากเครื่อง หรือกด Sync Roblox image" />
          <div className="flex flex-wrap gap-3 md:col-span-2"><SubmitButton>Save player profile</SubmitButton><button type="submit" formAction={syncPlayerAvatar} className="min-h-11 rounded-xl border border-[var(--line)] px-5 text-xs font-black uppercase tracking-[0.08em]">Sync Roblox image</button></div>
        </form>
      </section>;
    })}
  </div>;
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span>{children}</label>; }
