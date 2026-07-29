'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('Footer');
  return (
    <footer className="mt-24 border-t border-[var(--line)] bg-[#07080a]">
      <div className="site-shell grid gap-10 py-14 md:grid-cols-[1.2fr_0.8fr]">
        <div><p className="race-eyebrow">PBAL / Official</p><p className="race-display mt-4 max-w-xl text-4xl sm:text-5xl">{t('tagline')}</p><p className="mt-5 max-w-lg text-sm leading-6 text-[var(--ink-soft)]">{t('body')}</p></div>
        <div className="flex flex-col items-start gap-4 md:items-end md:text-right"><div className="flex flex-wrap gap-x-5 gap-y-3 md:justify-end"><Link href="/privacy" className="footer-link">{t('privacy')}</Link><Link href="/terms" className="footer-link">{t('terms')}</Link><Link href="/partners" className="footer-link">Partners</Link><a href="https://discord.gg/FPh4hVEx8J" target="_blank" rel="noreferrer" className="footer-link">Discord</a></div><Link href="/links" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-5 py-2.5 text-xs font-black uppercase italic tracking-[0.1em] transition hover:border-[var(--orange)] hover:text-[var(--orange-soft)]">Community <ArrowUpRight className="h-4 w-4" /></Link></div>
      </div>
      <div className="border-t border-[var(--line)]"><div className="site-shell py-5 text-xs text-[var(--ink-faint)]">{t('copyright', { year: new Date().getFullYear() })}</div></div>
    </footer>
  );
}
