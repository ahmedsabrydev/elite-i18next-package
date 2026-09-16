import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../../core/create-i18n'
import { resolveConfig } from '../../core/resolve-config'

describe('resolveConfig', () => {
  it('applies protocol defaults', () => {
    const resolved = resolveConfig({ locales: ['en', 'ar'], defaultLocale: 'en', catalogs: { public: 'catalogs' } })
    expect(resolved.defaultNS).toBe('common')
    expect(resolved.fallbackLng).toBe('en')
    expect(resolved.numberingSystem).toBe('latn')
  })

  it('keeps overrides', () => {
    const resolved = resolveConfig({
      locales: ['en', 'ar'],
      defaultLocale: 'ar',
      fallbackLng: 'ar',
      catalogs: { public: 'catalogs' },
      numberingSystem: 'arab',
    })
    expect(resolved.fallbackLng).toBe('ar')
    expect(resolved.numberingSystem).toBe('arab')
  })
})

describe('createI18n', () => {
  const base = {
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en' as const,
    catalogs: { public: 'catalogs' },
  }

  it('initializes an i18next instance', async () => {
    const runtime = createI18n({ ...base, backend: { load: async () => ({ hello: 'Hello' }) } })
    await runtime.loadNamespace('en', 'common')
    expect(runtime.instance.isInitialized).toBe(true)
    expect(runtime.instance.t('hello')).toBe('Hello')
  })

  it('reports has() correctly', async () => {
    const runtime = createI18n({ ...base, backend: { load: async () => ({ hello: 'Hello' }) } })
    expect(runtime.has('en', 'common')).toBe(false)
    await runtime.loadNamespace('en', 'common')
    expect(runtime.has('en', 'common')).toBe(true)
  })

  it('falls back to the default locale when the requested one has no resource', async () => {
    const runtime = createI18n({
      ...base,
      backend: {
        load: async (lng) => (lng === 'en' ? { hello: 'Hello' } : undefined),
      },
    })
    await runtime.loadNamespace('ar', 'common')
    expect(runtime.instance.t('hello', { lng: 'ar' })).toBe('Hello')
  })

  it('returns the key when nothing is found and no defaultValue is given', async () => {
    const runtime = createI18n({ ...base, backend: { load: async () => ({}) } })
    await runtime.loadNamespace('en', 'common')
    expect(runtime.instance.t('nope')).toBe('nope')
  })

  it('uses defaultValue for a missing key', async () => {
    const runtime = createI18n({ ...base, backend: { load: async () => ({}) } })
    await runtime.loadNamespace('en', 'common')
    expect(runtime.instance.t('nope', { defaultValue: 'Fallback' })).toBe('Fallback')
  })

  it('exposes getHtmlAttributes with lang and dir', () => {
    const runtime = createI18n(base)
    expect(runtime.getHtmlAttributes('ar')).toEqual({ lang: 'ar', dir: 'rtl' })
    expect(runtime.getHtmlAttributes('en')).toEqual({ lang: 'en', dir: 'ltr' })
  })

  it('maps an unknown lng to the default in getHtmlAttributes', () => {
    const runtime = createI18n(base)
    expect(runtime.getHtmlAttributes('fr')).toEqual({ lang: 'en', dir: 'ltr' })
  })

  it('getT returns a translator bound to a namespace', async () => {
    const runtime = createI18n({ ...base, backend: { load: async () => ({ hello: 'Hello' }) } })
    await runtime.loadNamespace('en', 'common')
    expect(runtime.getT('en', 'common')('hello')).toBe('Hello')
  })

  it('is safe to initialize twice', () => {
    const runtime = createI18n(base)
    expect(() => createI18n(base)).not.toThrow()
    expect(runtime.instance.isInitialized).toBe(true)
  })

  it('emits ns.load through the backend', async () => {
    const onEvent = vi.fn()
    const runtime = createI18n({ ...base, onEvent, backend: { load: async () => ({ hello: 'Hello' }) } })
    await runtime.loadNamespace('en', 'common')
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'ns.load' }))
  })
})
