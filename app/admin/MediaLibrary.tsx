'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, ImagePlus, LoaderCircle, Trash2, UploadCloud } from 'lucide-react';
import { uploadAdminImage } from './media-upload';

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
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  async function upload(file: File) {
    setBusy(true);
    setProgress(0);
    setError('');
    try {
      await uploadAdminImage(file, 'news-images', setProgress);
      if (inputRef.current) inputRef.current.value = '';
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Upload failed.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this image permanently?')) return;
    setBusy(true);
    setError('');
    const response = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
    const result = (await response.json()) as { error?: string };
    setBusy(false);
    if (!response.ok) return setError(result.error ?? 'Delete failed.');
    router.refresh();
  }

  async function copyUrl(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    window.setTimeout(() => setCopied(''), 1500);
  }

  return (
    <section className="rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-start gap-3">
        <ImagePlus className="mt-0.5 h-5 w-5 text-[var(--orange-soft)]" />
        <div><h2 className="font-black">Media library</h2><p className="mt-1 text-sm text-[var(--ink-soft)]">รูปภาพที่อัปโหลดจากเครื่อง สูงสุด 8 MB</p></div>
      </div>
      <label className="mt-5 grid cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--page)] px-4 py-7 text-center hover:border-[var(--orange)]">
        {busy ? <LoaderCircle className="h-6 w-6 animate-spin text-[var(--orange-soft)]" /> : <UploadCloud className="h-6 w-6 text-[var(--orange-soft)]" />}
        <span className="mt-2 text-xs font-black uppercase tracking-[0.1em]">{busy ? `Uploading ${progress}%` : 'Choose image from computer'}</span>
        <span className="mt-1 text-[0.68rem] font-normal text-[var(--ink-faint)]">JPG, PNG or WebP</span>
        <input ref={inputRef} type="file" accept="image/*" disabled={busy} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      </label>
      {busy && <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]"><span className="block h-full rounded-full bg-[var(--orange)] transition-[width]" style={{ width: `${progress}%` }} /></span>}
      {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {assets.map((asset) => (
          <figure key={asset.id} className="group relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--page)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.secure_url} alt={asset.original_filename ?? 'PBAL media'} className="aspect-square w-full object-cover" loading="lazy" />
            <button type="button" onClick={() => void copyUrl(asset.id, asset.secure_url)} aria-label={`Copy URL for ${asset.original_filename ?? 'image'}`} className="absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100">{copied === asset.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
            <button type="button" disabled={busy} onClick={() => void remove(asset.id)} aria-label={`Delete ${asset.original_filename ?? 'image'}`} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/75 text-red-200 opacity-0 transition group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-4 w-4" /></button>
          </figure>
        ))}
      </div>
      {assets.length === 0 && <p className="mt-5 text-center text-sm text-[var(--ink-faint)]">No uploaded images yet.</p>}
    </section>
  );
}
