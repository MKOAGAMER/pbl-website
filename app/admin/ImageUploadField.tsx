'use client';

import { CheckCircle2, ImagePlus, LoaderCircle, UploadCloud, X } from 'lucide-react';
import { useId, useRef, useState, type DragEvent } from 'react';
import { uploadAdminImage, type ImageBucket } from './media-upload';

type ImageUploadFieldProps = {
  name: string;
  label: string;
  initialValue?: string | null;
  help?: string;
  bucket?: ImageBucket;
};

export function ImageUploadField({
  name,
  label,
  initialValue,
  help,
  bucket = 'news-images',
}: ImageUploadFieldProps) {
  const fieldId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(initialValue ?? '');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [uploadedName, setUploadedName] = useState('');

  async function upload(file: File) {
    setBusy(true);
    setProgress(0);
    setError('');
    setUploadedName('');
    try {
      const asset = await uploadAdminImage(file, bucket, setProgress);
      setUrl(asset.secure_url);
      setUploadedName(asset.original_filename ?? file.name);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (busy) return;
    const file = event.dataTransfer.files?.[0];
    if (file) void upload(file);
  }

  return (
    <div className="sm:col-span-2">
      <label htmlFor={fieldId} className="mb-2 block text-[0.62rem] font-black uppercase tracking-[0.11em] text-[var(--ink-faint)]">
        {label}
      </label>
      <input
        id={fieldId}
        name={name}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        type="url"
        placeholder="https://..."
        className="admin-input"
        aria-describedby={`${fieldId}-help`}
      />

      <div
        className={`mt-3 grid min-h-28 place-items-center rounded-2xl border border-dashed px-5 py-5 text-center transition-colors ${
          dragging
            ? 'border-[var(--orange)] bg-[var(--orange)]/10'
            : 'border-[var(--line-strong)] bg-[var(--page)] hover:border-[var(--orange)]/70'
        }`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div>
          {busy ? (
            <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-[var(--orange-soft)]" />
          ) : (
            <UploadCloud className="mx-auto h-6 w-6 text-[var(--orange-soft)]" />
          )}
          <p className="mt-2 text-xs font-black uppercase tracking-[0.08em]">
            {busy ? `กำลังอัปโหลด ${progress}%` : 'ลากรูปมาวาง หรือเลือกจากเครื่อง'}
          </p>
          <p className="mt-1 text-[0.68rem] text-[var(--ink-faint)]">JPG, PNG, WebP · สูงสุด {bucket === 'news-images' ? 8 : 5} MB</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-[0.68rem] font-black uppercase tracking-[0.08em] transition hover:border-[var(--orange)] disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" /> เลือกรูปภาพ
          </button>
        </div>
      </div>

      {busy && (
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]" aria-hidden>
          <span className="block h-full rounded-full bg-[var(--orange)] transition-[width]" style={{ width: `${progress}%` }} />
        </span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <div id={`${fieldId}-help`} className="mt-3 flex flex-wrap items-center gap-3">
        {help && <p className="text-xs text-[var(--ink-faint)]">{help}</p>}
        {uploadedName && (
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> {uploadedName}
          </p>
        )}
        {url && (
          <button
            type="button"
            onClick={() => { setUrl(''); setUploadedName(''); }}
            className="inline-flex items-center gap-1 text-[0.65rem] font-black uppercase tracking-[0.08em] text-red-300"
          >
            <X className="h-3.5 w-3.5" /> Remove image
          </button>
        )}
      </div>

      {url && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3">
          <span className="block h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {/* Staff-managed URL remains provider-agnostic for older Cloudinary assets. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Selected image preview" className="h-full w-full object-cover" />
          </span>
          <p className="min-w-0 truncate text-xs text-[var(--ink-faint)]">{uploadedName || url}</p>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-bold text-red-300">{error}</p>}
    </div>
  );
}
