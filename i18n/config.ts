export const locales = ['en', 'th'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'en';

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return Boolean(value && locales.includes(value as AppLocale));
}

