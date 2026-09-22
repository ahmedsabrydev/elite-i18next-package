import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import type { Namespace } from '../core/types'
import { I18nContext, type LocaleSnapshot } from './context'

function useI18nContext() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useLocale must be used within an <I18nProvider>')
  return ctx
}

export function useI18nRuntime() {
  return useI18nContext().runtime
}

export function useT(ns?: Namespace): TFunction {
  const { locale } = useI18nContext()
  const { t } = useTranslation(ns, { lng: locale })
  return t
}

export function useLocale(): LocaleSnapshot & {
  changeLocale: (lng: string) => void
} {
  const { snapshot, navigate, runtime } = useI18nContext()

  const changeLocale = useMemo(
    () => (lng: string) => {
      if (typeof window === 'undefined') return
      const { pathname, search, hash } = window.location
      const pattern = new RegExp(`^/(${runtime.config.locales.map(escapeRegExp).join('|')})(?=/|$)`)
      const next = pathname.replace(pattern, `/${lng}`)
      const href = `${next === pathname ? `/${lng}${pathname}` : next}${search}${hash}`
      if (navigate) navigate(href)
      else window.location.assign(href)
    },
    [navigate, runtime],
  )

  return { ...snapshot, changeLocale }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
