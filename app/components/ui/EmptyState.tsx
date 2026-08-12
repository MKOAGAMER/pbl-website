import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-10 text-center">
      <Icon className="mx-auto h-7 w-7 text-[var(--ink-faint)]" />
      <h3 className="mt-4 font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ink-soft)]">{description}</p>
      {action && <Link href={action.href} className="mt-5 inline-flex rounded-full bg-[var(--orange)] px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-black">{action.label}</Link>}
    </div>
  );
}
