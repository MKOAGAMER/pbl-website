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
    <header className="sticky top-0 z-50 isolate border-b border-white/10 bg-[#090a0d]/90 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="site-shell flex min-h-[4.5rem] items-center gap-3 py-2">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)} aria-label="PBAL home">
          <span className="race-mark grid h-10 w-10 place-items-center text-xs font-black italic tracking-[-0.08em] text-black">PBAL</span>
          <span className="hidden leading-none 2xl:block">
            <span className="block text-[0.55rem] font-black uppercase tracking-[0.22em] text-[var(--orange-soft)]">Practical Basketball</span>
            <span className="mt-1 block text-sm font-black uppercase italic">Asia League</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`race-nav whitespace-nowrap ${isActive(link.href) ? 'race-nav-active' : ''}`}>
              {t(link.key)}
            </Link>
          ))}

          <details className="group relative">
            <summary className={`race-nav flex cursor-pointer list-none items-center gap-1 whitespace-nowrap ${competitionActive ? 'race-nav-active' : ''}`}>
              Competition <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute left-1/2 top-full z-50 mt-3 grid w-[26rem] -translate-x-1/2 grid-cols-2 gap-1 rounded-2xl border border-[var(--line)] bg-[#0b0c10] p-2.5 shadow-2xl">
              {competitionLinks.map((link) => (
                <Link key={link.href} href={link.href} className={`rounded-xl px-3.5 py-3 transition ${isActive(link.href) ? 'bg-[var(--orange)] text-black' : 'hover:bg-[var(--surface)]'}`}>
                  <span className="block text-xs font-black uppercase italic">{t(link.key)}</span>
                  <span className={`mt-1 block text-[0.65rem] ${isActive(link.href) ? 'text-black/65' : 'text-[var(--ink-faint)]'}`}>{link.description}</span>
                </Link>
              ))}
            </div>
          </details>

          <details className="group relative">
            <summary className={`race-nav flex cursor-pointer list-none items-center gap-1 whitespace-nowrap ${leagueActive ? 'race-nav-active' : ''}`}>
              League <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-3 grid w-56 gap-1 rounded-2xl border border-[var(--line)] bg-[#0b0c10] p-2.5 shadow-2xl">
              {leagueLinks.map((link) => (
                <Link key={link.href} href={link.href} className={`rounded-xl px-3.5 py-3 text-xs font-black uppercase italic transition ${isActive(link.href) ? 'bg-[var(--orange)] text-black' : 'text-[var(--ink-soft)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'}`}>
                  {t(link.key)}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/search" className="hidden h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] transition hover:border-[var(--orange)] hover:text-[var(--orange-soft)] sm:grid" aria-label={t('search')}>
            <Search className="h-4 w-4" />
          </Link>
          <LanguageSwitcher />
          <AuthButton />
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] xl:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? t('closeMenu') : t('openMenu')}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-navigation" className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-[var(--line)] bg-[#0a0b0e] xl:hidden">
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
