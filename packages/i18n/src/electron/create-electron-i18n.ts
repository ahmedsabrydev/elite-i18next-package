import { createI18n } from '../core/create-i18n'
import { dirFor, resolveLocale } from '../core/locale'
import { emit } from '../obs/events'
import type { DefaultLocale, Dir, NamespaceResources } from '../core/types'
import type { CreateElectronI18nConfig, ElectronI18n } from './types'

const LOCALE_KEY = 'faang-i18n:locale'
const NS_CACHE_PREFIX = 'faang-i18n:ns'

export function createElectronI18n<L extends string = DefaultLocale>(
  config: CreateElectronI18nConfig<L>,
): ElectronI18n<L> {
  const localeKey = config.storageKey ?? LOCALE_KEY

  const runtime = createI18n<L>({
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    fallbackLng: config.fallbackLng,
    defaultNS: config.defaultNS,
    catalogs: { public: '@faang/i18n/catalogs' },
    onEvent: config.onEvent,
    backend: {
      load: async (lng, ns) => {
        const cacheKey = `${NS_CACHE_PREFIX}:${lng}:${ns}`
        const cached = await safeGet(config.storage, cacheKey)
        if (cached) {
          try {
            return JSON.parse(cached) as NamespaceResources
          } catch {
            // Corrupt cache entry; fall through to the bundled catalog.
          }
        }
        const source = config.catalogs[`${lng}:${ns}`]
        if (source) await safeSet(config.storage, cacheKey, JSON.stringify(source))
        return source
      },
    },
  })

  const isKnown = (lng: string): lng is L => config.locales.includes(lng as L)

  const fromSystem = (): L | undefined => {
    const tag = config.locale?.getSystemLocale()
    if (!tag) return undefined
    const resolved = resolveLocale(tag, config.locales, config.defaultLocale)
    return isKnown(resolved) ? resolved : undefined
  }

  const applySurfaces = (lng: L): void => {
    if (!config.surfaces) return
    const t = runtime.getT(lng, runtime.config.defaultNS)
    config.surfaces.setApplicationMenu(lng, t)
    config.surfaces.setTrayMenu(lng, t)
    config.surfaces.setWindowTitle(lng, t)
  }

  const getStoredLocale = async (): Promise<L | undefined> => {
    const stored = await safeGet(config.storage, localeKey)
    return stored && isKnown(stored) ? stored : undefined
  }

  const getInitialLocale = async (): Promise<L> => {
    const stored = await getStoredLocale()
    if (stored) return stored
    return fromSystem() ?? config.defaultLocale
  }

  const setLocale = async (lng: L): Promise<void> => {
    const from = runtime.instance.resolvedLanguage ?? config.defaultLocale
    await safeSet(config.storage, localeKey, lng)
    await runtime.loadNamespace(lng, runtime.config.defaultNS)
    applySurfaces(lng)
    config.messenger?.broadcast(lng)
    emit(config.onEvent, { type: 'locale.switch', from, to: lng })
  }

  const applyDirection = (lng: L): Dir => dirFor(lng)

  const subscribeSystemLocale = (cb: (lng: L) => void): (() => void) => {
    const subscribe = config.locale?.subscribeSystemLocale
    if (!subscribe) return () => {}
    return subscribe((tag) => {
      const resolved = resolveLocale(tag, config.locales, config.defaultLocale)
      if (isKnown(resolved)) cb(resolved)
    })
  }

  return {
    runtime,
    controller: {
      getStoredLocale,
      getInitialLocale,
      setLocale,
      applyDirection,
      subscribeSystemLocale,
    },
  }
}

async function safeGet(storage: { get(key: string): Promise<string | null> }, key: string) {
  try {
    return await storage.get(key)
  } catch {
    return null
  }
}

async function safeSet(
  storage: { set(key: string, value: string): Promise<void> },
  key: string,
  value: string,
): Promise<void> {
  try {
    await storage.set(key, value)
  } catch {
    // Persistence is best-effort; the in-memory cache still serves the namespace.
  }
}
