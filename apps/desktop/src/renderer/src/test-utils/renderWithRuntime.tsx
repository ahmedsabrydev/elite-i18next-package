import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { createI18n } from '@faang/i18n'
import { I18nProvider } from '@faang/i18n/react'
import { catalogs } from '../i18n/catalogs'
import { APP_NAMESPACES } from '../i18n/namespaces'

export function makeRuntime() {
  return createI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    catalogs: { public: 'catalogs' },
    backend: { load: async (lng, ns) => catalogs[`${lng}:${ns}`] },
  })
}

export async function renderWithRuntime(ui: ReactElement, locale: 'en' | 'ar' = 'en'): Promise<void> {
  const runtime = makeRuntime()
  await Promise.all(APP_NAMESPACES.map((ns) => runtime.loadNamespace(locale, ns)))
  render(
    <I18nProvider runtime={runtime} locale={locale}>
      {ui}
    </I18nProvider>,
  )
}
