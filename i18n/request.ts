import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isAppLocale } from './config';

export default getRequestConfig(async () => {
  const preferredLocale = (await cookies()).get('pbal_locale')?.value;
  const locale = isAppLocale(preferredLocale) ? preferredLocale : defaultLocale;
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});

