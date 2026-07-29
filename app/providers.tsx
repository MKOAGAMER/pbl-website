'use client';

import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { LiveThemeConfig } from './components/layout/LiveThemeConfig';
import type { SiteConfig } from '@/lib/pbal-types';

export function Providers({ children, siteConfig }: { children: React.ReactNode; siteConfig: SiteConfig }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} themes={['dark', 'light']}>
      <AuthProvider>
        <LiveThemeConfig initialConfig={siteConfig} />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--surface-raised)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
