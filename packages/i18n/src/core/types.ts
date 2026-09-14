import type { i18n as I18nInstance, TFunction } from 'i18next'

export type Dir = 'ltr' | 'rtl'
export type DefaultLocale = 'en' | 'ar'
export type Namespace =
  | 'common'
  | 'errors'
  | 'auth'
  | 'validation'
  | 'datetime'
  | (string & {})

export type I18nEvent =
  | { type: 'ns.load'; lng: string; ns: string; ms: number; bytes?: number }
  | { type: 'ns.cache_hit'; lng: string; ns: string }
  | { type: 'ns.timeout'; lng: string; ns: string; ms: number }
  | { type: 'missing_key'; lng: string; ns?: string; key: string }
  | { type: 'locale.switch'; from: string; to: string }

export type CreateI18nConfig<L extends string = DefaultLocale> = {
  locales: readonly L[]
  defaultLocale: L
  defaultNS?: Namespace
  fallbackLng?: L
  catalogs: {
    public: string
    shared?: string
  }
  publicPath?: string
  numberingSystem?: 'latn' | 'arab'
  onEvent?: (event: I18nEvent) => void
  backend?: I18nBackend
}

export type ResolvedConfig<L extends string = DefaultLocale> = {
  locales: readonly L[]
  defaultLocale: L
  fallbackLng: L
  defaultNS: Namespace
  catalogs: { public: string; shared?: string }
  publicPath?: string
  numberingSystem: 'latn' | 'arab'
  onEvent?: (event: I18nEvent) => void
  backend?: I18nBackend
}

export type NamespaceResources = Record<string, unknown>

export type I18nBackend = {
  load: (lng: string, ns: string) => Promise<NamespaceResources | undefined>
}

export type I18nRuntime<L extends string = DefaultLocale> = {
  instance: I18nInstance
  config: ResolvedConfig<L>
  loadNamespace: (lng: L, ns: Namespace) => Promise<void>
  prefetch: (lng: L, ns: Namespace) => void
  has: (lng: L, ns: Namespace) => boolean
  getHtmlAttributes: (lng: string) => { lang: string; dir: Dir }
  getT: (lng: L, ns?: Namespace) => TFunction
}
