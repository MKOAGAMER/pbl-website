'use client';

import { ImagePlus, LoaderCircle, X } from 'lucide-react';
import { useRef, useState } from 'react';

type ImageUploadFieldProps = {
  name: string;
  label: string;
  initialValue?: string | null;
  help?: string;
  bucket?: 'team-logos' | 'player-photos' | 'news-images' | 'staff-avatars';
};

export function ImageUploadField({ name, label, initialValue, help, bucket = 'news-images' }: ImageUploadFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialValue ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File) {
    setBusy(true);
    setError('');
    const body = new FormData();
    body.set('file', file);
    body.set('bucket', bucket);
    try {
      const response = await fetch('/api/admin/media', { method: 'POST', body });
      const payload = await response.json() as { asset?: { secure_url?: string }; error?: string };
      if (!response.ok || !payload.asset?.secure_url) throw new Error(payload.error || 'Upload failed.');
      setUrl(payload.asset.secure_url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <label className="block sm:col-span-2">
      <span className="mb-1.5 block text-[0.6rem] font-black uppercase tracking-[0.1em] text-[var(--ink-faint)]">{label}</span>
      <input name={name} value={url} onChange={(event) => setUrl(event.target.value)} type="url" placeholder="https://..." className="admin-input" />
      <span className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.08em] disabled:opacity-50">
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
          {busy ? 'Uploading' : 'Upload image'}
        </button>
        {url && <button type="button" onClick={() => setUrl('')} className="inline-flex items-center gap-1 text-[0.65rem] font-black uppercase tracking-[0.08em] text-red-300"><X className="h-3.5 w-3.5" /> Remove image</button>}
        {help && <span className="text-xs text-[var(--ink-faint)]">{help}</span>}
      </span>
      <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      {url && <span className="mt-3 block h-20 w-20 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--page)]">
        {/* Staff-managed CDN URL; native image keeps uploads provider-agnostic. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Preview" className="h-full w-full object-cover" />
      </span>}
      {error && <span className="mt-2 block text-xs text-red-300">{error}</span>}
    </label>
  );
}
