'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Trash2 } from 'lucide-react';

export type MediaAsset = {
  id: string;
  secure_url: string;
  original_filename: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
  created_at: string;
};

export function MediaLibrary({ assets }: { assets: MediaAsset[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setBusy(true);
    setError('');
    const body = new FormData();
    body.set('file', file);
    const response = await fetch('/api/admin/media', { method: 'POST', body });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) return setError(result.error ?? 'Upload failed.');
    if (inputRef.current) inputRef.current.value = '';
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this image from Cloudinary?')) return;
    setBusy(true);
    setError('');
    const response = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) return setError(result.error ?? 'Delete failed.');
    router.refresh();
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-start gap-3">
        <ImagePlus className="mt-0.5 h-5 w-5 text-[var(--orange-soft)]" />
        <div><h2 className="font-black">Media library</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">Cloudinary images, up to 8 MB.</p></div>
      </div>
      <label className="mt-5 grid cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--line-strong)] px-4 py-6 text-center text-xs font-black uppercase tracking-[0.1em] hover:border-[var(--orange)]">
        {busy ? 'Working…' : 'Upload image'}
        <input ref={inputRef} type="file" accept="image/*" disabled={busy} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      </label>
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {assets.map((asset) => (
          <figure key={asset.id} className="group relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--page)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.secure_url} alt={asset.original_filename ?? 'PBAL media'} className="aspect-square w-full object-cover" loading="lazy" />
            <button type="button" disabled={busy} onClick={() => void remove(asset.id)} aria-label={`Delete ${asset.original_filename ?? 'image'}`} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-red-200 opacity-0 transition group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-4 w-4" /></button>
          </figure>
        ))}
      </div>
      {assets.length === 0 && <p className="mt-5 text-center text-sm text-[var(--ink-faint)]">No uploaded images yet.</p>}
    </section>
  );
}

