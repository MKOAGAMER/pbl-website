'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AuthButton } from './AuthButton';
import { LanguageSwitcher } from './LanguageSwitcher';

const primaryLinks = [
  { href: '/', key: 'home' },
  { href: '/games', key: 'live' },
  { href: '/standings', key: 'standings' },
  { href: '/teams', key: 'teams' },
  { href: '/players', key: 'players' },
] as const;

const competitionLinks = [
  { href: '/controls', key: 'controlLab', description: 'Controls & practice' },
  { href: '/stats', key: 'stats', description: 'Player performance' },
  { href: '/trades', key: 'trades', description: 'Player movement' },
  { href: '/tournaments', key: 'tournaments', description: 'Events & brackets' },
  { href: '/rankings', key: 'rankings', description: 'Power rankings' },
  { href: '/accolades', key: 'accolades', description: 'Awards & records' },
  { href: '/playoffs', key: 'playoffs', description: 'Postseason' },
] as const;

const leagueLinks = [
  { href: '/news', key: 'news' },
  { href: '/blacklist', key: 'blacklist' },
  { href: '/partners', key: 'partners' },
  { href: '/staff', key: 'staff' },
  { href: '/links', key: 'community' },
] as const;

const externalLinks = [
  { href: 'https://discord.gg/FPh4hVEx8J', key: 'discord' },
  { href: 'https://www.roblox.com/games/80681221431821', key: 'game' },
  { href: 'https://www.roblox.com/communities/9515965/MKOA', key: 'group' },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations('Nav');
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => href === '/' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const competitionActive = competitionLinks.some((link) => isActive(link.href));
  const leagueActive = leagueLinks.some((link) => isActive(link.href));

  return (
    <header className="sticky top-0 z-50 isolate border-b border-[var(--line)] bg-[color:color-mix(in_srgb,var(--page)_94%,transparent)] shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="site-shell flex min-h-16 items-center gap-3 py-2">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)} aria-label="PBAL home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#3b82f6] text-[0.58rem] font-black tracking-[-0.08em] text-white shadow-[0_8px_20px_rgba(59,130,246,.26)]">PBAL</span>
          <span className="hidden leading-none 2xl:block">
            <span className="block text-[0.55rem] font-bold uppercase tracking-[0.18em] text-[#60a5fa]">Practical Basketball</span>
            <span className="mt-1 block text-sm font-black">Asia League</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`eba-nav whitespace-nowrap ${isActive(link.href) ? 'eba-nav-active' : ''}`}>
              {t(link.key)}
            </Link>
          ))}

          <details className="group relative">
            <summary className={`eba-nav flex cursor-pointer list-none items-center gap-1 whitespace-nowrap ${competitionActive ? 'eba-nav-active' : ''}`}>
              Competition <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-1/2 top-full z-50 mt-3 grid w-[26rem] -translate-x-1/2 grid-cols-2 gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-2 shadow-2xl">
              {competitionLinks.map((link) => (
                <Link key={link.href} href={link.href} className={`rounded-lg px-3.5 py-3 transition ${isActive(link.href) ? 'bg-[#3b82f6] text-white' : 'hover:bg-[var(--surface-soft)]'}`}>
                  <span className="block text-xs font-bold">{t(link.key)}</span>
                  <span className={`mt-1 block text-[0.65rem] ${isActive(link.href) ? 'text-black/65' : 'text-[var(--ink-faint)]'}`}>{link.description}</span>
                </Link>
              ))}
            </div>
          </details>

          <details className="group relative">
            <summary className={`eba-nav flex cursor-pointer list-none items-center gap-1 whitespace-nowrap ${leagueActive ? 'eba-nav-active' : ''}`}>
              League <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-3 grid w-56 gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] p-2 shadow-2xl">
              {leagueLinks.map((link) => (
                <Link key={link.href} href={link.href} className={`rounded-lg px-3.5 py-3 text-xs font-bold transition ${isActive(link.href) ? 'bg-[#3b82f6] text-white' : 'text-[var(--ink-soft)] hover:bg-[var(--surface-soft)] hover:text-[var(--ink)]'}`}>
                  {t(link.key)}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/search" className="hidden h-9 w-9 place-items-center rounded-lg border border-[var(--line)] text-[var(--ink-soft)] transition hover:border-[#3b82f6] hover:text-[#60a5fa] sm:grid" aria-label={t('search')}>
            <Search className="h-4 w-4" />
          </Link>
          <LanguageSwitcher />
          <AuthButton />
          <button type="button" className="grid h-10 w-10 place-items-center rounded-lg border border-[var(--line)] xl:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? t('closeMenu') : t('openMenu')}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-navigation" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[var(--line)] bg-[var(--surface-raised)] xl:hidden">
          <nav className="site-shell py-5" aria-label="Mobile navigation">
            <MobileGroup label="Main">
              {primaryLinks.map((link) => <MobileLink key={link.href} href={link.href} active={isActive(link.href)} onClick={() => setOpen(false)}>{t(link.key)}</MobileLink>)}
            </MobileGroup>
            <MobileGroup label="Competition">
              {competitionLinks.map((link) => <MobileLink key={link.href} href={link.href} active={isActive(link.href)} onClick={() => setOpen(false)}>{t(link.key)}</MobileLink>)}
            </MobileGroup>
            <MobileGroup label="League">
              {leagueLinks.map((link) => <MobileLink key={link.href} href={link.href} active={isActive(link.href)} onClick={() => setOpen(false)}>{t(link.key)}</MobileLink>)}
            </MobileGroup>
            <div className="mt-5 grid gap-1 border-t border-[var(--line)] pt-4 sm:grid-cols-3">
              {externalLinks.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="rounded-xl px-4 py-3 text-sm font-black uppercase italic text-[var(--orange-soft)] hover:bg-[var(--surface)]">{t(link.key)} ↗</a>)}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function MobileGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="mb-2 px-4 text-[0.6rem] font-black uppercase tracking-[0.16em] text-[var(--ink-faint)]">{label}</p>
      <div className="grid gap-1 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function MobileLink({ href, active, onClick, children }: { href: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className={`rounded-xl px-4 py-3 text-sm font-black uppercase italic ${active ? 'bg-[var(--orange)] text-black' : 'text-[var(--ink-soft)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'}`}>
      {children}
    </Link>
  );
}
