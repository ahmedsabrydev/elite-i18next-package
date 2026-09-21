import { defineConfig } from 'i18next-cli'

export default defineConfig({
  locales: ['en', 'ar'],
  extract: {
    input: ['packages/i18n/src/**/*.{ts,tsx}', 'apps/*/src/**/*.{ts,tsx}'],
    ignore: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.test-d.ts'],
    useTranslationNames: ['useTranslation', 'useT'],
    output: 'packages/i18n/catalogs/{{language}}/{{namespace}}.json',
    defaultNS: 'common',
    keySeparator: '.',
    nsSeparator: ':',
    removeUnusedKeys: false,
  },
  types: {
    output: 'packages/i18n/src/@types/i18next.d.ts',
  },
})
