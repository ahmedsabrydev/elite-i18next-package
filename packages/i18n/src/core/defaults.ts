export const SUPPORTED_LOCALES = ['en', 'ar'] as const
export const DEFAULT_LOCALE = 'en' as const
export const DEFAULT_NS = 'common' as const
export const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur'])

export const NS_ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/

export const BUDGETS = {
  kernelGzipBytes: 12 * 1024,
  shellCatalogsGzipBytes: 12 * 1024,
  namespaceGzipBytes: 16 * 1024,
  manifestGzipBytes: 1536,
} as const

export const LOADER = {
  timeoutMs: 3000,
  retryDelayMs: 300,
  retries: 1,
  maxPrefetch: 2,
  lruMaxEntries: 50,
} as const
