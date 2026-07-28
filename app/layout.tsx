import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { getSiteData, isSiteDataHealthy } from '@/lib/league-data';
import { getSiteUrl } from '@/lib/site-url';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const siteUrl = getSiteUrl();

// Public league data is statically served and refreshed at least once per minute.
// Admin mutations also call revalidatePath for immediate updates.
export const revalidate = 60;

const baseMetadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Practical Basketball League',
    template: '%s | PBL',
  },
  description:
    'The official home of the Practical Basketball League — schedules, results, standings, player stats and league news.',
  applicationName: 'Practical Basketball League',
  keywords: ['PBL', 'basketball league', 'Roblox basketball', 'league standings', 'player stats'],
  openGraph: {
    title: 'Practical Basketball League',
    description: 'Follow every matchup, team, player and story from the PBL.',
    siteName: 'Practical Basketball League',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Practical Basketball League',
    description: 'Follow every matchup, team, player and story from the PBL.',
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSiteData();

  return {
    ...baseMetadata,
    robots: isSiteDataHealthy(data)
      ? undefined
      : { index: false, follow: false, nocache: true },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const data = await getSiteData();

  return (
    <html lang="en" className={geist.variable} suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-[var(--orange)] px-4 py-2 text-sm font-bold text-black transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <Providers>
          <Navbar />
          {data.source === 'demo' && (
            <div className="border-b border-amber-400/20 bg-amber-400/10 px-4 py-2.5 text-center text-xs font-bold text-amber-100">
              Preview mode · All league data shown below is fictional and will never be used in production.
            </div>
          )}
          {data.source === 'unavailable' && (
            <div className="border-b border-red-400/20 bg-red-400/10 px-4 py-2.5 text-center text-xs font-bold text-red-100" role="status">
              League data is temporarily unavailable. This site is showing an empty state, never placeholder results.
            </div>
          )}
          <main id="main-content" className="min-h-[70vh]">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
