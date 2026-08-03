'use client';

import { Check, Save } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

const POSITION_OPTIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'] as const;

type Props = {
  initialBio: string;
  initialPositions: string[];
  initialJerseyNumber: number;
  profileSlug: string | null;
};

export function ProfileAboutForm({ initialBio, initialPositions, initialJerseyNumber, profileSlug }: Props) {
  const router = useRouter();
  const validInitialPositions = initialPositions.filter((position) => (
    POSITION_OPTIONS.includes(position as (typeof POSITION_OPTIONS)[number])
  )).slice(0, 3);
  const [bio, setBio] = useState(initialBio);
  const [positions, setPositions] = useState<string[]>(validInitialPositions.length ? validInitialPositions : ['UTIL']);
  const [jerseyNumber, setJerseyNumber] = useState(initialJerseyNumber);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function togglePosition(position: string) {
    setPositions((current) => {
      if (current.includes(position)) {
        return current.length === 1 ? current : current.filter((item) => item !== position);
      }
      return current.length < 3 ? [...current, position] : current;
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bio, positions, jerseyNumber }),
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error || 'บันทึกโปรไฟล์ไม่สำเร็จ');
      setMessage('บันทึก About Me ตำแหน่ง และเบอร์เรียบร้อยแล้ว');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'บันทึกโปรไฟล์ไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-10 rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--orange-soft)]">Public player profile</p>
          <h2 className="mt-2 text-2xl font-black">About me</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">ปรับข้อความแนะนำตัว ตำแหน่งที่เล่น และเบอร์ของคุณ ข้อมูลจะปรากฏบนโปรไฟล์สาธารณะ</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--ink-faint)]">{bio.length}/1500</span>
          {profileSlug && <Link href={`/players/${profileSlug}`} className="text-xs font-black uppercase tracking-[0.08em] text-[var(--orange-soft)]">View profile →</Link>}
        </div>
      </div>

      <div className="mt-7 grid gap-6 md:grid-cols-[1fr_10rem]">
        <fieldset className="rounded-2xl border border-[var(--line)] bg-[var(--page)] p-4 sm:p-5">
          <legend className="px-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">ตำแหน่งที่เล่น</legend>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {positions.map((position, index) => (
              <span key={position} className={`rounded-full px-3 py-1.5 text-[0.68rem] font-black uppercase ${index === 0 ? 'bg-[var(--orange)] text-black' : 'bg-[var(--surface-soft)] text-[var(--ink-soft)]'}`}>
                {index === 0 ? 'ตำแหน่งหลัก' : `ตัวเลือก ${index + 1}`} · {position}
              </span>
            ))}
            <span className="ml-auto text-xs text-[var(--ink-faint)]">{positions.length}/3</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {POSITION_OPTIONS.map((position) => {
              const selected = positions.includes(position);
              return (
                <button
                  key={position}
                  type="button"
                  aria-pressed={selected}
                  disabled={!selected && positions.length >= 3}
                  onClick={() => togglePosition(position)}
                  className={`flex min-h-11 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-black transition ${selected ? 'border-[var(--orange)] bg-[var(--orange)]/10 text-[var(--orange-soft)]' : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-35'}`}
                >
                  {selected && <Check className="h-3.5 w-3.5" />} {position}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label>
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">เบอร์ที่ต้องการ</span>
          <input
            type="number"
            min="0"
            max="99"
            required
            value={jerseyNumber}
            onChange={(event) => setJerseyNumber(Number(event.target.value))}
            className="admin-input text-center text-2xl font-black number-tabular"
          />
          <span className="mt-2 block text-xs leading-5 text-[var(--ink-faint)]">เลือกได้ตั้งแต่ 0–99 และต้องไม่ซ้ำกับผู้เล่นในทีม</span>
        </label>
      </div>

      <label className="mt-6 block">
        <span className="mb-2 block text-xs font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">About / Biography</span>
        <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={7} maxLength={1500} className="admin-input py-4 leading-7" placeholder="เล่าเกี่ยวกับตัวคุณ สไตล์การเล่น หรือเป้าหมายในลีก..." />
      </label>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-[var(--ink-soft)]">{message}</p>
        <button type="submit" disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--orange)] px-5 text-xs font-black uppercase tracking-[0.1em] text-black disabled:opacity-50">
          <Save className="h-4 w-4" /> {busy ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </form>
  );
}
