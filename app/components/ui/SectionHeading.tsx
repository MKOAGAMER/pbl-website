import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}

export function SectionHeading({ eyebrow, title, description, href, linkLabel = 'View all' }: SectionHeadingProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="display-type mt-3 text-3xl sm:text-4xl">{title}</h2>
        {description && <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">{description}</p>}
      </div>
      {href && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-2 self-start text-xs font-black uppercase tracking-[0.13em] text-[var(--orange-soft)] sm:self-auto">
          {linkLabel} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

