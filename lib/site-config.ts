import 'server-only';

import { cache } from 'react';
import { createAdminClient } from './supabase-admin';
import { DEFAULT_SITE_CONFIG, type SiteConfig } from './pbal-types';

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const supabase = createAdminClient();
  if (!supabase) return DEFAULT_SITE_CONFIG;

  const { data, error } = await supabase
    .from('site_config')
    .select('id, theme, staff, links, addons, updated_at')
    .eq('id', 'main')
    .maybeSingle();

  if (error || !data) return DEFAULT_SITE_CONFIG;
  return {
    id: 'main',
    theme: data.theme as SiteConfig['theme'],
    staff: data.staff as SiteConfig['staff'],
    links: data.links as SiteConfig['links'],
    addons: data.addons as SiteConfig['addons'],
    updatedAt: data.updated_at,
  };
});

