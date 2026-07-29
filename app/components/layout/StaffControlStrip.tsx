import Link from 'next/link';
import { Bot, Settings2, UsersRound } from 'lucide-react';
import { getCurrentUser } from '@/lib/session';

export async function StaffControlStrip() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'staff' && user.role !== 'admin')) return null;

  return (
    <aside className="border-b border-[var(--orange)]/25 bg-[var(--orange)]/10 px-4 py-2 text-xs font-bold text-[var(--orange-soft)]">
      <div className="site-shell flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        <Link href="/admin" className="inline-flex items-center gap-2 hover:text-[var(--ink)]"><Settings2 className="h-3.5 w-3.5" />{user.username} · Staff Control</Link>
        {user.adminPermission !== 'editor' && <Link href="/admin/league" className="inline-flex items-center gap-2 hover:text-[var(--ink)]"><UsersRound className="h-3.5 w-3.5" />League operations</Link>}
        {user.adminPermission !== 'editor' && <Link href="/admin/stats" className="inline-flex items-center gap-2 hover:text-[var(--ink)]"><Bot className="h-3.5 w-3.5" />Gemini stats</Link>}
      </div>
    </aside>
  );
}
