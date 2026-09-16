export { createI18n } from './core/create-i18n'
export { resolveConfig } from './core/resolve-config'
export { dirFor, resolveLocale, assertSupportedLocale } from './core/locale'
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  DEFAULT_NS,
  RTL_LOCALES,
  NS_ID_PATTERN,
  BUDGETS,
  LOADER,
} from './core/defaults'
export { LruCache } from './cache/lru'
export { MemoryStore } from './loader/memory'
export { PersistentStore } from './loader/persistent'
export { InflightLoader, TimeoutError } from './loader/inflight'
export { TieredBackend, namespaceChunkLoader } from './loader/backend'
export { emit } from './obs/events'
export type { NamespaceLoader, TieredBackendOptions } from './loader/backend'
export type {
  Dir,
  DefaultLocale,
  Namespace,
  I18nEvent,
  CreateI18nConfig,
  ResolvedConfig,
  I18nRuntime,
  I18nBackend,
  NamespaceResources,
} from './core/types'
