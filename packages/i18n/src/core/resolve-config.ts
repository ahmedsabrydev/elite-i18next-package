import { DEFAULT_NS, LOADER } from './defaults'
import type { CreateI18nConfig, DefaultLocale, ResolvedConfig } from './types'

export function resolveConfig<L extends string = DefaultLocale>(
  config: CreateI18nConfig<L>,
): ResolvedConfig<L> {
  return {
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    fallbackLng: config.fallbackLng ?? config.defaultLocale,
    defaultNS: config.defaultNS ?? DEFAULT_NS,
    catalogs: config.catalogs,
    publicPath: config.publicPath,
    numberingSystem: config.numberingSystem ?? 'latn',
    onEvent: config.onEvent,
    backend: config.backend,
  }
}

export const loaderDefaults = LOADER
