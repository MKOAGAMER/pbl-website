'use client';

import { Save } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export function ProfileAboutForm({ initialBio }: { initialBio: string }) {
  const [bio, setBio] = useState(initialBio);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bio }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'Unable to save About.');
      setMessage('บันทึก About แล้ว');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save About.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-8 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Public player profile</p><h2 className="mt-2 text-xl font-black">About me</h2><p className="mt-2 text-sm text-[var(--ink-soft)]">เขียนแนะนำตัวเอง ข้อความนี้จะแสดงในหน้าโปรไฟล์ผู้เล่นของคุณ</p></div>
        <span className="text-xs text-[var(--ink-faint)]">{bio.length}/1500</span>
      </div>
      <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={7} maxLength={1500} className="admin-input mt-5 py-3" placeholder="เล่าเกี่ยวกับตัวคุณ สไตล์การเล่น หรือเป้าหมายในลีก..." />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-[var(--ink-soft)]">{message}</p>
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--orange)] px-5 text-xs font-black uppercase tracking-[0.1em] text-black disabled:opacity-50"><Save className="h-4 w-4" /> {busy ? 'Saving...' : 'Save About'}</button>
      </div>
    </form>
  );
}
