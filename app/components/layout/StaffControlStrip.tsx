import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';

export async function StaffControlStrip() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) return null;

  return (
    <aside className="border-b border-[var(--orange)]/25 bg-[var(--orange)]/10 px-4 py-2 text-center text-xs font-bold text-[var(--orange-soft)]">
      <Link href="/admin" className="inline-flex items-center gap-2 hover:text-[var(--ink)]">
        <Settings2 className="h-3.5 w-3.5" />
        {user.username} · {user.adminPermission?.replace('_', ' ')} · Open staff control
      </Link>
    </aside>
  );
}

