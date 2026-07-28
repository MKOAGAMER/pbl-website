import type { ReactNode } from 'react';

interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageIntro({ eyebrow, title, description, actions }: PageIntroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--line)] py-14 sm:py-20">
      <div className="absolute inset-0 subtle-grid opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="site-shell relative">
        <p className="eyebrow">{eyebrow}</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_0.55fr] lg:items-end">
          <h1 className="display-type max-w-4xl text-balance text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
          <div>
            <p className="max-w-xl text-pretty text-sm leading-7 text-[var(--ink-soft)] sm:text-base">{description}</p>
            {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
          </div>
        </div>
      </div>
    </section>
  );
}

