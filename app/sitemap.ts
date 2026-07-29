import type { MetadataRoute } from 'next';
import { getSiteData, isSiteDataHealthy } from '@/lib/league-data';
import { getSiteUrl } from '@/lib/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const data = await getSiteData();
  if (!isSiteDataHealthy(data)) return [];

  const now = new Date();
  const staticRoutes = ['', '/games', '/standings', '/rankings', '/teams', '/players', '/stats', '/news', '/accolades', '/staff', '/links', '/search', '/playoffs', '/partners', '/privacy', '/terms'];

  return [
    ...staticRoutes.map((path) => ({ url: `${baseUrl}${path}`, lastModified: now, changeFrequency: path === '' || path === '/games' ? ('daily' as const) : ('weekly' as const) })),
    ...data.teams.map((team) => ({ url: `${baseUrl}/teams/${team.slug}`, lastModified: now, changeFrequency: 'weekly' as const })),
    ...data.players.map((player) => ({ url: `${baseUrl}/players/${player.slug}`, lastModified: now, changeFrequency: 'weekly' as const })),
    ...data.games.map((game) => ({ url: `${baseUrl}/games/${game.slug}`, lastModified: new Date(game.startsAt), changeFrequency: 'weekly' as const })),
    ...data.news.map((post) => ({ url: `${baseUrl}/news/${post.slug}`, lastModified: new Date(post.publishedAt), changeFrequency: 'monthly' as const })),
  ];
}
