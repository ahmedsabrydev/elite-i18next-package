import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createI18n } from '@faang/i18n'
import { I18nProvider } from '@faang/i18n/react'
import { catalogs } from './catalogs'
import { APP_NAMESPACES } from './namespaces'
import { getBridge } from './bridge'

const bridge = getBridge()

const runtime = createI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  fallbackLng: 'en',
  catalogs: { public: '@faang/i18n/catalogs' },
  backend: { load: async (lng, ns) => catalogs[`${lng}:${ns}`] },
})

async function loadAll(lng: string): Promise<void> {
  await Promise.all(APP_NAMESPACES.map((ns) => runtime.loadNamespace(lng as 'en', ns)))
}

function applyDom(lng: string): void {
  const { dir } = runtime.getHtmlAttributes(lng)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
    document.documentElement.dir = dir
  }
}

export function DesktopI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void bridge.getLocale().then(async (lng) => {
      await loadAll(lng)
      if (active) setLocale(lng)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return bridge.onLocaleChange((lng) => {
      void loadAll(lng).then(() => setLocale(lng))
    })
  }, [])

  useEffect(() => {
    if (locale) applyDom(locale)
  }, [locale])

  const onLocaleChange = useMemo(
    () => (lng: string) => {
      void bridge.setLocale(lng).then(() => loadAll(lng)).then(() => setLocale(lng))
    },
    [],
  )

  if (!locale) {
    return <p role="status">Loading…</p>
  }

  return (
    <I18nProvider runtime={runtime} locale={locale} onLocaleChange={onLocaleChange}>
      {children}
    </I18nProvider>
  )
}
