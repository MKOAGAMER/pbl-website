'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AppLocale } from '@/i18n/config';

export function LanguageSwitcher() {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('Common');
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) return;
    setPending(true);
    try {
      await fetch('/api/locale', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: nextLocale }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center rounded-full border border-[var(--line)] bg-black/20 p-1" aria-label={t('language')}>
      <Languages className="ml-2 h-3.5 w-3.5 text-[var(--ink-faint)]" aria-hidden="true" />
      {(['en', 'th'] as const).map((item) => (
        <button
          key={item}
          type="button"
          disabled={pending}
          onClick={() => void switchLocale(item)}
          className={`rounded-full px-2 py-1 text-[0.6rem] font-black uppercase tracking-[0.1em] transition ${
            locale === item ? 'bg-[var(--orange)] text-black' : 'text-[var(--ink-faint)] hover:text-[var(--ink)]'
          }`}
        >
          {item === 'en' ? 'EN' : 'TH'}
        </button>
      ))}
    </div>
  );
}

