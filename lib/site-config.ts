import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from './supabase-admin';
import { DEFAULT_SITE_CONFIG, type SiteConfig } from './pbal-types';

async function loadSiteConfig(): Promise<SiteConfig> {
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
}

const getCachedSiteConfig = unstable_cache(loadSiteConfig, ['pbal-site-config-v1'], {
  tags: ['pbal-site-config'],
  revalidate: 60,
});

export const getSiteConfig = cache(getCachedSiteConfig);
