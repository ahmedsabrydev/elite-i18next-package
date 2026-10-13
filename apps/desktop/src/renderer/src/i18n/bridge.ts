export interface DesktopBridge {
  getLocale(): Promise<string>
  setLocale(lng: string): Promise<void>
  onLocaleChange(cb: (lng: string) => void): () => void
}

const LOCALE_KEY = 'faang-i18n:locale'

function browserFallback(): DesktopBridge {
  const listeners = new Set<(lng: string) => void>()
  return {
    async getLocale() {
      const stored = globalThis.localStorage?.getItem(LOCALE_KEY)
      if (stored) return stored
      return (navigator.language || 'en').split('-')[0] || 'en'
    },
    async setLocale(lng) {
      globalThis.localStorage?.setItem(LOCALE_KEY, lng)
      for (const listener of listeners) listener(lng)
    },
    onLocaleChange(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
  }
}

export function getBridge(): DesktopBridge {
  const global = globalThis as { desktopI18n?: DesktopBridge }
  return global.desktopI18n ?? browserFallback()
}
