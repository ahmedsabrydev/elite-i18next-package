import { useMemo, type ReactNode } from 'react'
import { I18nextProvider as ReactI18nProvider } from 'react-i18next'
import { dirFor } from '../core/locale'
import type { I18nRuntime } from '../core/types'
import { I18nContext, type LocaleSnapshot } from './context'

export type I18nProviderProps = {
  runtime: I18nRuntime
  locale: string
  navigate?: (href: string) => void
  onLocaleChange?: (lng: string) => void
  children: ReactNode
}

export function I18nProvider({ runtime, locale, navigate, onLocaleChange, children }: I18nProviderProps) {
  const snapshot = useMemo<LocaleSnapshot>(
    () => ({
      lng: locale,
      dir: dirFor(locale),
      isRtl: dirFor(locale) === 'rtl',
      status: runtime.has(locale as never, runtime.config.defaultNS) ? 'hydrated' : 'loading-ns',
    }),
    [locale, runtime],
  )

  const value = useMemo(
    () => ({ runtime, locale, snapshot, navigate, onLocaleChange }),
    [runtime, locale, snapshot, navigate, onLocaleChange],
  )

  return (
    <I18nContext.Provider value={value}>
      <ReactI18nProvider i18n={runtime.instance}>
        {children}
      </ReactI18nProvider>
    </I18nContext.Provider>
  )
}
