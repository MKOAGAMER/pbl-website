import type { LucideIcon } from 'lucide-react';

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-10 text-center">
      <Icon className="mx-auto h-7 w-7 text-[var(--ink-faint)]" />
      <h3 className="mt-4 font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--ink-soft)]">{description}</p>
    </div>
  );
}

