import { createI18n } from '@faang/i18n'

export const runtime = createI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  fallbackLng: 'en',
  catalogs: { public: 'catalogs', shared: '@faang/i18n/catalogs' },
})
