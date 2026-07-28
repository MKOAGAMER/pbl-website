'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-10 rounded-full bg-[var(--orange)] px-5 text-[0.65rem] font-black uppercase tracking-[0.12em] text-black transition hover:bg-[var(--orange-soft)] disabled:cursor-wait disabled:opacity-60">
      {pending ? 'Saving…' : children}
    </button>
  );
}

