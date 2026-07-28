'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { AuthButton } from './AuthButton';
import { ThemeToggle } from './ThemeToggle';

const primaryLinks = [
  { href: '/games', label: 'Games' },
  { href: '/standings', label: 'Standings' },
  { href: '/teams', label: 'Teams' },
  { href: '/players', label: 'Players' },
  { href: '/stats', label: 'Stats' },
  { href: '/news', label: 'News' },
];

const secondaryLinks = [
  { href: '/rankings', label: 'Power rankings' },
  { href: '/accolades', label: 'Accolades' },
  { href: '/staff', label: 'League staff' },
  { href: '/links', label: 'Community links' },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color:color-mix(in_srgb,var(--page)_88%,transparent)] backdrop-blur-xl">
      <div className="site-shell flex h-[4.5rem] items-center justify-between gap-4">
        <Link href="/" className="group flex min-w-0 items-center gap-3" onClick={() => setOpen(false)}>
          <span className="relative grid h-10 w-10 shrink-0 rotate-3 place-items-center overflow-hidden rounded-[0.9rem] bg-[var(--orange)] text-xs font-black tracking-[-0.04em] text-[#11151c] transition-transform group-hover:-rotate-3">
            PBL
            <span className="absolute inset-x-0 top-1/2 h-px -rotate-[24deg] bg-black/25" />
            <span className="absolute -right-3 top-0 h-10 w-6 rounded-full border border-black/25" />
          </span>
          <span className="hidden leading-none sm:block">
            <span className="block text-[0.62rem] font-extrabold uppercase tracking-[0.22em] text-[var(--ink-faint)]">
              Practical
            </span>
            <span className="block text-sm font-black uppercase tracking-[-0.02em]">Basketball League</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3.5 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.11em] transition ${
                isActive(link.href)
                  ? 'bg-[var(--surface-soft)] text-[var(--ink)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <details className="group relative">
            <summary
              className={`cursor-pointer list-none rounded-full px-3.5 py-2 text-[0.7rem] font-extrabold uppercase tracking-[0.11em] transition [&::-webkit-details-marker]:hidden ${
                secondaryLinks.some((link) => isActive(link.href))
                  ? 'bg-[var(--surface-soft)] text-[var(--ink)]'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              }`}
            >
              More <span className="ml-1 inline-block transition-transform group-open:rotate-180">⌄</span>
            </summary>
            <div className="absolute right-0 top-[calc(100%+0.75rem)] w-52 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] p-2 shadow-[var(--shadow)]">
              {secondaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                    isActive(link.href)
                      ? 'bg-[var(--orange)] text-black'
                      : 'text-[var(--ink-soft)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <AuthButton />
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            aria-label={open ? 'Close navigation' : 'Open navigation'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-navigation" className="border-t border-[var(--line)] bg-[var(--page)] lg:hidden">
          <nav className="site-shell grid gap-1 py-4" aria-label="Mobile navigation">
            {[...primaryLinks, ...secondaryLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  isActive(link.href)
                    ? 'bg-[var(--orange)] text-black'
                    : 'text-[var(--ink-soft)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
