import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { getSiteUrl } from '@/lib/site-url';
import { getSiteConfig } from '@/lib/site-config';
import type { CSSProperties } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { StaffControlStrip } from './components/layout/StaffControlStrip';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const siteUrl = getSiteUrl();

// Public league data is statically served and refreshed at least once per minute.
// Admin mutations also call revalidatePath for immediate updates.
export const revalidate = 60;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PBAL — Practical Basketball Asia League',
    template: '%s | PBAL',
  },
  description:
    'The official home of the Practical Basketball Asia League — schedules, results, standings, player stats, trades and league news.',
  applicationName: 'PBAL — Practical Basketball Asia League',
  keywords: ['PBAL', 'PBL', 'basketball league', 'Roblox basketball', 'league standings', 'player stats'],
  openGraph: {
    title: 'PBAL — Practical Basketball Asia League',
    description: 'Live scores, standings, player profiles and every PBAL matchup.',
    siteName: 'PBAL',
    type: 'website',
    images: [{ url: '/og-basketball.png', width: 1734, height: 907, alt: 'Practical Basketball Asia League' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PBAL — Practical Basketball Asia League',
    description: 'Live scores, standings, player profiles and every PBAL matchup.',
    images: ['/og-basketball.png'],
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [siteConfig, locale, messages] = await Promise.all([getSiteConfig(), getLocale(), getMessages()]);
  const themeStyle = {
    '--orange': siteConfig.theme.primary,
    '--orange-soft': siteConfig.theme.primary,
    '--blue': siteConfig.theme.secondary,
    '--page': siteConfig.theme.background,
    '--page-deep': siteConfig.theme.background,
    '--surface': siteConfig.theme.surface,
    '--ink': siteConfig.theme.foreground,
  } as CSSProperties;

  return (
    <html lang={locale} className={geist.variable} style={themeStyle} suppressHydrationWarning>
      <body>
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-24 rounded-full bg-[var(--orange)] px-4 py-2 text-sm font-bold text-black transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers siteConfig={siteConfig}>
          <Navbar />
          <StaffControlStrip />
          <main id="main-content" className="min-h-[70vh]">
            {children}
          </main>
          <Footer />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
