import Link from 'next/link';
import { ArrowLeft, SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <section className="site-shell grid min-h-[65vh] place-items-center py-16 text-center">
      <div>
        <SearchX className="mx-auto h-9 w-9 text-[var(--ink-faint)]" />
        <p className="eyebrow mt-6">404 · Out of bounds</p>
        <h1 className="display-type mt-4 text-5xl sm:text-6xl">That page is not on the roster.</h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[var(--ink-soft)]">The link may be outdated, or the record has not been published yet.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--orange)] px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-black">
          <ArrowLeft className="h-4 w-4" /> Return home
        </Link>
      </div>
    </section>
  );
}

