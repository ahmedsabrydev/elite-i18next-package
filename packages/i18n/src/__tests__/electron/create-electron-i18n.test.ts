import { describe, expect, it, vi } from 'vitest'
import { createElectronI18n } from '../../electron'
import type { ElectronStorage } from '../../electron'

const catalogs = {
  'en:common': { hello: 'Hello' },
  'ar:common': { hello: 'مرحبا' },
}

function storage(): ElectronStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    async get(key) {
      return map.get(key) ?? null
    },
    async set(key, value) {
      map.set(key, value)
    },
  }
}

function base(overrides: Record<string, unknown> = {}) {
  return createElectronI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    catalogs,
    storage: storage(),
    ...overrides,
  })
}

describe('createElectronI18n', () => {
  it('prefers the stored locale', async () => {
    const store = storage()
    await store.set('faang-i18n:locale', 'ar')
    const { controller } = base({ storage: store })
    await expect(controller.getInitialLocale()).resolves.toBe('ar')
  })

  it('falls back to the system locale', async () => {
    const { controller } = base({ locale: { getSystemLocale: () => 'ar-SA' } })
    await expect(controller.getInitialLocale()).resolves.toBe('ar')
  })

  it('falls back to the default locale when nothing is available', async () => {
    const { controller } = base()
    await expect(controller.getInitialLocale()).resolves.toBe('en')
  })

  it('ignores an unsupported stored locale', async () => {
    const store = storage()
    await store.set('faang-i18n:locale', 'fr')
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

  it('persists the locale, applies surfaces, broadcasts, and emits locale.switch', async () => {
    const store = storage()
    const order: string[] = []
    const onEvent = vi.fn()
    const surfaces = {
      setApplicationMenu: vi.fn(() => order.push('menu')),
      setTrayMenu: vi.fn(() => order.push('tray')),
      setWindowTitle: vi.fn(() => order.push('title')),
      showMessageBox: vi.fn(),
    }
    const messenger = { broadcast: vi.fn(), onLocaleSelected: vi.fn() }
    const { controller } = base({ storage: store, surfaces, messenger, onEvent })
    await controller.setLocale('ar')
    expect(store.map.get('faang-i18n:locale')).toBe('ar')
    expect(order).toEqual(['menu', 'tray', 'title'])
    expect(messenger.broadcast).toHaveBeenCalledWith('ar')
    expect(onEvent).toHaveBeenCalledWith({ type: 'locale.switch', from: 'en', to: 'ar' })
  })

  it('applies direction from the locale', () => {
    const { controller } = base()
    expect(controller.applyDirection('en')).toBe('ltr')
    expect(controller.applyDirection('ar')).toBe('rtl')
  })

  it('notifies system locale changes through the locale port', () => {
    let listener: ((lng: string) => void) | undefined
    const locale = {
      getSystemLocale: () => 'en-US',
      subscribeSystemLocale: (cb: (lng: string) => void) => {
        listener = cb
        return vi.fn()
      },
    }
    const onSystem = vi.fn()
    const { controller } = base({ locale })
    const off = controller.subscribeSystemLocale(onSystem)
    listener?.('ar-EG')
    expect(onSystem).toHaveBeenCalledWith('ar')
    off()
  })
})
