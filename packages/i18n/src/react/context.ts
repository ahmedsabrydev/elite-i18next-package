import { createContext } from 'react'
import type { I18nRuntime } from '../core/types'
import type { Dir } from '../core/types'

export type LocaleSnapshot = {
  lng: string
  dir: Dir
  isRtl: boolean
  status: 'hydrated' | 'switching' | 'loading-ns'
}

export type I18nContextValue = {
  runtime: I18nRuntime
  locale: string
  snapshot: LocaleSnapshot
  navigate?: (href: string) => void
  onLocaleChange?: (lng: string) => void
}

export const I18nContext = createContext<I18nContextValue | null>(null)
