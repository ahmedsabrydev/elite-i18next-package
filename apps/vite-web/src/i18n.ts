import { createI18n, type NamespaceResources } from '@faang/i18n'
import arCommon from '@faang/i18n/catalogs/ar/common.json'
import arErrors from '@faang/i18n/catalogs/ar/errors.json'
import enCommon from '@faang/i18n/catalogs/en/common.json'
import enErrors from '@faang/i18n/catalogs/en/errors.json'

const shared: Record<string, NamespaceResources> = {
  'en:common': enCommon,
  'en:errors': enErrors,
  'ar:common': arCommon,
  'ar:errors': arErrors,
}

export const runtime = createI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  fallbackLng: 'en',
  catalogs: { public: '/catalogs' },
  backend: {
    load: async (lng, ns) => shared[`${lng}:${ns}`],
  },
})
