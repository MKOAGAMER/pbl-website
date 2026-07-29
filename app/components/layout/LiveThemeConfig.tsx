'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { SiteConfig, ThemeConfig } from '@/lib/pbal-types';

function applyTheme(theme: ThemeConfig) {
  const root = document.documentElement;
  root.style.setProperty('--orange', theme.primary);
  root.style.setProperty('--orange-soft', theme.primary);
  root.style.setProperty('--blue', theme.secondary);
  root.style.setProperty('--page', theme.background);
  root.style.setProperty('--page-deep', theme.background);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--ink', theme.foreground);
}

export function LiveThemeConfig({ initialConfig }: { initialConfig: SiteConfig }) {
  useEffect(() => {
    applyTheme(initialConfig.theme);
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel('site-config-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'site_config', filter: 'id=eq.main' },
        (payload) => {
          const next = payload.new as { theme?: ThemeConfig };
          if (next.theme) applyTheme(next.theme);
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [initialConfig]);

  return null;
}

