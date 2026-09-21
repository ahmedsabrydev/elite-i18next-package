import { dirFor } from '@faang/i18n'
import { matchLocaleFromPath } from '@faang/i18n/vite'
import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { runtime } from './i18n'

export function LocaleGuard({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { locale } = matchLocaleFromPath(
    location.pathname,
    runtime.config.locales,
    runtime.config.defaultLocale,
  )
  const [ready, setReady] = useState(() => runtime.has(locale as never, 'common'))

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = dirFor(locale)
  }, [locale])

  useEffect(() => {
    let cancelled = false
    if (!runtime.has(locale as never, 'common')) {
      void runtime.loadNamespace(locale as never, 'common').then(() => {
        if (!cancelled) setReady(true)
      })
    }
    return () => {
      cancelled = true
    }
  }, [locale])

  if (!ready) return <div data-testid="locale-boot" aria-busy="true" />

  return <>{children}</>
}
