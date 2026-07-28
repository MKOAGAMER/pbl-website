'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

export function AuthButton() {
  const router = useRouter();
  const { user, signOut } = useAuth();

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--orange)] px-4 text-xs font-extrabold uppercase tracking-[0.12em] text-black transition hover:bg-[var(--orange-soft)]"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Staff login</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Link
        href="/admin"
        className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition hover:text-[var(--ink)]"
        title="Admin dashboard"
        aria-label="Admin dashboard"
      >
        <LayoutDashboard className="h-4 w-4" />
      </Link>
      <button
        type="button"
        onClick={() => {
          void signOut().finally(() => {
            router.replace('/');
            router.refresh();
          });
        }}
        className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition hover:border-red-400/40 hover:text-red-300"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
