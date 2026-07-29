'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AuthButton } from './AuthButton';
import { LanguageSwitcher } from './LanguageSwitcher';

const internalLinks = [
  { href: '/', key: 'home' }, { href: '/games', key: 'live' }, { href: '/standings', key: 'standings' },
  { href: '/teams', key: 'teams' }, { href: '/players', key: 'players' }, { href: '/stats', key: 'stats' },
  { href: '/rankings', key: 'rankings' }, { href: '/accolades', key: 'accolades' }, { href: '/playoffs', key: 'playoffs' },
  { href: '/news', key: 'news' }, { href: '/partners', key: 'partners' }, { href: '/staff', key: 'staff' },
  { href: '/links', key: 'community' }, { href: '/privacy', key: 'privacy' }, { href: '/terms', key: 'terms' },
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

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#090a0d]/90 backdrop-blur-xl">
      <div className="site-shell flex min-h-[4.5rem] items-center gap-3 py-2">
        <Link href="/" className="group flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <span className="race-mark grid h-10 w-10 place-items-center text-xs font-black italic tracking-[-0.08em] text-black">PBAL</span>
          <span className="hidden leading-none xl:block"><span className="block text-[0.55rem] font-black uppercase tracking-[0.22em] text-[var(--orange-soft)]">Roblox Basketball</span><span className="block text-sm font-black uppercase italic">Race Control</span></span>
        </Link>

        <nav className="hide-scrollbar hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto xl:flex" aria-label="Main navigation">
          {internalLinks.map((link) => <Link key={link.href} href={link.href} className={`race-nav ${isActive(link.href) ? 'race-nav-active' : ''}`}>{t(link.key)}</Link>)}
          {externalLinks.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="race-nav whitespace-nowrap text-[var(--orange-soft)]">{t(link.key)}</a>)}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href="/search" className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--orange)] hover:text-[var(--orange-soft)]" aria-label={t('search')}><Search className="h-4 w-4" /></Link>
          <LanguageSwitcher />
          <AuthButton />
          <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] xl:hidden" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-navigation" aria-label={open ? t('closeMenu') : t('openMenu')}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && <div id="mobile-navigation" className="border-t border-[var(--line)] bg-[#0a0b0e] xl:hidden"><nav className="site-shell grid gap-1 py-4" aria-label="Mobile navigation">
        {internalLinks.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={`rounded-lg px-4 py-3 text-sm font-black uppercase italic ${isActive(link.href) ? 'bg-[var(--orange)] text-black' : 'text-[var(--ink-soft)] hover:bg-[var(--surface)] hover:text-[var(--ink)]'}`}>{t(link.key)}</Link>)}
        <div className="mt-2 grid gap-1 border-t border-[var(--line)] pt-3">{externalLinks.map((link) => <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="rounded-lg px-4 py-3 text-sm font-black uppercase italic text-[var(--orange-soft)] hover:bg-[var(--surface)]">{t(link.key)} ↗</a>)}</div>
      </nav></div>}
    </header>
  );
}
