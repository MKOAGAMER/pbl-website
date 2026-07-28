'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="site-shell grid min-h-[65vh] place-items-center py-16 text-center">
      <div>
        <AlertTriangle className="mx-auto h-9 w-9 text-[var(--orange-soft)]" />
        <p className="eyebrow mt-6">Temporary timeout</p>
        <h1 className="display-type mt-4 text-5xl sm:text-6xl">We lost the ball.</h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[var(--ink-soft)]">The page could not finish loading. Your data has not been changed.</p>
        <button type="button" onClick={reset} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--orange)] px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    </section>
  );
}

