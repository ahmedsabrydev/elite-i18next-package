import i18next from 'i18next'
import type { NamespaceResources } from './types'
import { DEFAULT_LOCALE } from './defaults'
import { dirFor, resolveLocale } from './locale'
import { resolveConfig } from './resolve-config'
import { TieredBackend } from '../loader/backend'
import type {
  CreateI18nConfig,
  DefaultLocale,
  I18nRuntime,
  Namespace,
  ResolvedConfig,
} from './types'

export function createI18n<L extends string = DefaultLocale>(
  config: CreateI18nConfig<L>,
): I18nRuntime<L> {
  const resolved = resolveConfig(config)
  const backend = new TieredBackend({
    config: resolved as ResolvedConfig,
    loader: resolved.backend
      ? async (lng, ns) => (await resolved.backend?.load(lng, ns)) as NamespaceResources | undefined
      : undefined,
  })

  const instance = i18next.createInstance()
  const initOptions = {
    lng: resolved.defaultLocale,
    fallbackLng: resolved.fallbackLng,
    supportedLngs: [...resolved.locales],
    nonExplicitSupportedLngs: true,
    defaultNS: resolved.defaultNS,
    ns: [resolved.defaultNS],
    keySeparator: '.',
    nsSeparator: ':',
    pluralSeparator: '_',
    contextSeparator: '_',
    compatibilityJSON: 'v4' as const,
    returnEmptyString: false,
    returnNull: false,
    interpolation: { escapeValue: true },
    resources: {},
    initImmediate: false,
  }

  void instance.init(initOptions)

  const loadNamespace = async (lng: L, ns: Namespace): Promise<void> => {
    if (!backend.has(lng, ns)) {
      const resources = await backend.load(lng, ns)
      if (resources) instance.addResourceBundle(lng, ns, resources, true, true)
    }
    if (lng !== resolved.fallbackLng && !backend.has(resolved.fallbackLng, ns)) {
      const fallback = await backend.load(resolved.fallbackLng, ns)
      if (fallback) instance.addResourceBundle(resolved.fallbackLng, ns, fallback, true, true)
    }
  }

  return {
    instance,
    config: resolved,
    loadNamespace,
    prefetch(lng, ns) {
      backend.prefetch(lng, ns)
    },
    has(lng, ns) {
      return backend.has(lng, ns)
    },
    getHtmlAttributes(lng) {
      const safe = resolveLocale(lng, resolved.locales, resolved.defaultLocale)
      return { lang: safe, dir: dirFor(safe) }
    },
    getT(lng, ns = resolved.defaultNS) {
      return instance.getFixedT(lng, ns)
    },
  }
}
