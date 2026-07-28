import type { MetadataRoute } from 'next';
import { getSiteData, isSiteDataHealthy } from '@/lib/league-data';
import { getSiteUrl } from '@/lib/site-url';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const baseUrl = getSiteUrl();
  const data = await getSiteData();

  if (!isSiteDataHealthy(data)) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/auth/', '/login'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
