'use client';

import { ArrowUpRight, BadgeCheck, Handshake, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function PartnersPage() {
  const t = useTranslations('Partners');
  const tiers = [[t('tierOne'), '01', BadgeCheck], [t('tierTwo'), '02', Handshake], [t('tierThree'), '03', Sparkles]] as const;
  return <><section className="relative overflow-hidden border-b border-[var(--line)]"><div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_30%,var(--orange)_30%,var(--orange)_32%,transparent_32%)] opacity-[.07]" /><div className="site-shell relative py-16 sm:py-24"><p className="race-eyebrow">{t('eyebrow')}</p><h1 className="race-display mt-4 max-w-4xl text-5xl sm:text-7xl">{t('title')}</h1><p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--ink-soft)] sm:text-base">{t('body')}</p></div></section><main className="site-shell py-12 sm:py-16"><div className="grid gap-4 md:grid-cols-3">{tiers.map(([title, number, Icon]) => <section key={number} className="race-panel relative min-h-64 overflow-hidden rounded-[1.5rem] p-6"><span className="race-display absolute right-5 top-3 text-7xl text-white/[.04]">{number}</span><Icon className="h-7 w-7 text-[var(--orange-soft)]" /><h2 className="race-display mt-12 text-3xl">{title}</h2><p className="mt-4 text-sm leading-6 text-[var(--ink-soft)]">PBAL partner placement is reserved for forthcoming collaborations.</p></section>)}</div><a href="mailto:partners@pbal.gg" className="race-panel mt-8 flex items-center justify-between rounded-[1.5rem] p-6 transition hover:border-[var(--orange)]"><span><span className="race-eyebrow">PBAL PARTNERSHIPS</span><span className="race-display mt-3 block text-3xl sm:text-4xl">{t('inquiries')}</span></span><ArrowUpRight className="h-7 w-7 text-[var(--orange-soft)]" /></a></main></>;
}

