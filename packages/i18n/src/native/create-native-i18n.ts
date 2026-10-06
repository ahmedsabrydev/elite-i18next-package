import { createI18n } from '../core/create-i18n'
import { dirFor, resolveLocale } from '../core/locale'
import { emit } from '../obs/events'
import type { DefaultLocale, NamespaceResources } from '../core/types'
import type { CreateNativeI18nConfig, NativeI18n } from './types'

const LOCALE_KEY = 'faang-i18n:locale'
const NS_CACHE_PREFIX = 'faang-i18n:ns'

export function createNativeI18n<L extends string = DefaultLocale>(
  config: CreateNativeI18nConfig<L>,
): NativeI18n<L> {
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

  const fromDevice = (): L | undefined => {
    for (const entry of config.localization?.getLocales() ?? []) {
      const tag = entry.languageTag ?? entry.languageCode
      if (!tag) continue
      const resolved = resolveLocale(tag, config.locales, config.defaultLocale)
      if (isKnown(resolved)) return resolved
    }
    return undefined
  }

  const applyDirection = (lng: L): void => {
    if (!config.rtl) return
    config.rtl.allowRTL(true)
    config.rtl.forceRTL(dirFor(lng) === 'rtl')
  }

  const getStoredLocale = async (): Promise<L | undefined> => {
    const stored = await safeGet(config.storage, localeKey)
    return stored && isKnown(stored) ? stored : undefined
  }

  const getInitialLocale = async (): Promise<L> => {
    const stored = await getStoredLocale()
    if (stored) return stored
    return fromDevice() ?? config.defaultLocale
  }

  const setLocale = async (lng: L): Promise<void> => {
    const from = runtime.instance.resolvedLanguage ?? config.defaultLocale
    await safeSet(config.storage, localeKey, lng)
    applyDirection(lng)
    await runtime.loadNamespace(lng, runtime.config.defaultNS)
    emit(config.onEvent, { type: 'locale.switch', from, to: lng })
  }

  const subscribeSystemLocale = (cb: (lng: L) => void): (() => void) => {
    if (!config.appState) return () => {}
    const sub = config.appState.addEventListener('change', () => {
      const next = fromDevice()
      if (next) cb(next)
    })
    return () => sub.remove()
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

async function safeGet(storage: { getItem(key: string): Promise<string | null> }, key: string) {
  try {
    return await storage.getItem(key)
  } catch {
    return null
  }
}

async function safeSet(
  storage: { setItem(key: string, value: string): Promise<void> },
  key: string,
  value: string,
): Promise<void> {
  try {
    await storage.setItem(key, value)
  } catch {
    // Persistence is best-effort; the in-memory cache still serves the namespace.
  }
}
