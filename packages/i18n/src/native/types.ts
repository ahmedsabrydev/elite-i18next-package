import type {
  DefaultLocale,
  I18nEvent,
  I18nRuntime,
  Namespace,
  NamespaceResources,
} from '../core/types'
import type { AppStatePort, NativeLocalization, NativeRtl, NativeStorage } from './ports'

export interface CreateNativeI18nConfig<L extends string = DefaultLocale> {
  locales: readonly L[]
  defaultLocale: L
  fallbackLng?: L
  defaultNS?: Namespace
  catalogs: Record<string, NamespaceResources>
  storage: NativeStorage
  localization?: NativeLocalization
  rtl?: NativeRtl
  appState?: AppStatePort
  onEvent?: (event: I18nEvent) => void
  storageKey?: string
}

export interface NativeController<L extends string> {
  getStoredLocale(): Promise<L | undefined>
  getInitialLocale(): Promise<L>
  setLocale(lng: L): Promise<void>
  applyDirection(lng: L): void
  subscribeSystemLocale(cb: (lng: L) => void): () => void
}

export interface NativeI18n<L extends string> {
  runtime: I18nRuntime<L>
  controller: NativeController<L>
}
