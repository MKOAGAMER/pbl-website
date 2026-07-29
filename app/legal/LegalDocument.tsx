'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function LegalDocument({ kind }: { kind: 'privacy' | 'terms' }) {
  const t = useTranslations('Legal');
  const title = kind === 'privacy' ? t('privacyTitle') : t('termsTitle');
  const intro = kind === 'privacy' ? t('privacyIntro') : t('termsIntro');
  return <main className="site-shell max-w-4xl py-16 sm:py-24"><p className="race-eyebrow">PBAL / Legal</p><h1 className="race-display mt-4 text-5xl sm:text-7xl">{title}</h1><p className="mt-5 text-sm text-[var(--ink-faint)]">{t('updated')}</p><section className="race-panel mt-10 rounded-[1.5rem] p-6 sm:p-9"><p className="text-lg font-bold leading-8 text-[var(--ink-soft)]">{intro}</p><LegalSection title={t('account')} body={t('accountBody')} /><LegalSection title={t('community')} body={t('communityBody')} /><LegalSection title={t('contact')} body={t('contactBody')} /></section></main>;
}
function LegalSection({ title, body }: { title: string; body: string }) { return <div className="mt-8 border-t border-[var(--line)] pt-7"><h2 className="flex items-center gap-2 text-lg font-black uppercase italic"><ShieldCheck className="h-5 w-5 text-[var(--orange-soft)]" />{title}</h2><p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">{body}</p></div>; }

