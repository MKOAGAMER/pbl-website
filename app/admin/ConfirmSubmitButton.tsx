'use client';

import { Trash2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

export function ConfirmSubmitButton({ message, children }: { message: string; children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-400/10 px-4 text-xs font-black uppercase tracking-[0.08em] text-red-200 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" /> {pending ? 'Working...' : children}
    </button>
  );
}
