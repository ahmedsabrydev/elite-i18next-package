import { describe, expect, it, vi } from 'vitest'
import { createNativeI18n } from '../../native'
import type { AppStatePort, NativeStorage } from '../../native'

const catalogs = {
  'en:common': { hello: 'Hello' },
  'ar:common': { hello: 'مرحبا' },
}

function storage(): NativeStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    async getItem(key) {
      return map.get(key) ?? null
    },
    async setItem(key, value) {
      map.set(key, value)
    },
  }
}

function base(overrides: Record<string, unknown> = {}) {
  return createNativeI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    catalogs,
    storage: storage(),
    ...overrides,
  })
}

describe('createNativeI18n', () => {
  it('prefers the stored locale', async () => {
    const store = storage()
    await store.setItem('faang-i18n:locale', 'ar')
    const { controller } = base({ storage: store })
    await expect(controller.getInitialLocale()).resolves.toBe('ar')
  })

  it('falls back to the device locale', async () => {
    const { controller } = base({
      localization: { getLocales: () => [{ languageTag: 'ar-EG' }] },
    })
    await expect(controller.getInitialLocale()).resolves.toBe('ar')
  })

  it('falls back to the default locale when nothing is available', async () => {
    const { controller } = base()
    await expect(controller.getInitialLocale()).resolves.toBe('en')
  })

  it('ignores an unsupported stored locale', async () => {
    const store = storage()
    await store.setItem('faang-i18n:locale', 'fr')
    const { controller } = base({ storage: store })
    await expect(controller.getInitialLocale()).resolves.toBe('en')
  })

  it('caches loaded namespaces through storage', async () => {
    const store = storage()
    const first = base({ storage: store })
    await first.runtime.loadNamespace('en', 'common')
    expect(store.map.get('faang-i18n:ns:en:common')).toBe(JSON.stringify(catalogs['en:common']))

    const second = base({ storage: store })
    await second.runtime.loadNamespace('en', 'common')
    expect(second.runtime.getT('en', 'common')('hello')).toBe('Hello')
  })

  it('persists the locale, applies RTL, and emits locale.switch', async () => {
    const store = storage()
    const allowRTL = vi.fn()
    const forceRTL = vi.fn()
    const onEvent = vi.fn()
    const { controller } = base({
      storage: store,
      rtl: { allowRTL, forceRTL },
      onEvent,
    })
    await controller.setLocale('ar')
    expect(store.map.get('faang-i18n:locale')).toBe('ar')
    expect(allowRTL).toHaveBeenCalledWith(true)
    expect(forceRTL).toHaveBeenCalledWith(true)
    expect(onEvent).toHaveBeenCalledWith({ type: 'locale.switch', from: 'en', to: 'ar' })
  })

  it('notifies system locale changes through the AppState port', () => {
    let listener: ((state: string) => void) | undefined
    const appState: AppStatePort = {
      addEventListener: (_type, cb) => {
        listener = cb
        return { remove: vi.fn() }
      },
    }
    let tag = 'en-US'
    const localization = { getLocales: () => [{ languageTag: tag }] }
    const onSystem = vi.fn()
    const { controller } = base({ appState, localization })
    const off = controller.subscribeSystemLocale(onSystem)
    tag = 'ar-SA'
    listener?.('active')
    expect(onSystem).toHaveBeenCalledWith('ar')
    off()
  })
})
