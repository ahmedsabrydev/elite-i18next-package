import type {
  DefaultLocale,
  Dir,
  I18nEvent,
  I18nRuntime,
  Namespace,
  NamespaceResources,
} from '../core/types'
import type { ElectronLocale, ElectronMessenger, ElectronStorage, ElectronSurfaces } from './ports'

export interface CreateElectronI18nConfig<L extends string = DefaultLocale> {
  locales: readonly L[]
  defaultLocale: L
  fallbackLng?: L
  defaultNS?: Namespace
  catalogs: Record<string, NamespaceResources>
  storage: ElectronStorage
  locale?: ElectronLocale
  surfaces?: ElectronSurfaces<L>
  messenger?: ElectronMessenger<L>
  onEvent?: (event: I18nEvent) => void
  storageKey?: string
}

export interface ElectronController<L extends string> {
  getStoredLocale(): Promise<L | undefined>
  getInitialLocale(): Promise<L>
  setLocale(lng: L): Promise<void>
  applyDirection(lng: L): Dir
  subscribeSystemLocale(cb: (lng: L) => void): () => void
}

export interface ElectronI18n<L extends string> {
  runtime: I18nRuntime<L>
  controller: ElectronController<L>
}
