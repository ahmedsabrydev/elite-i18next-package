import { describe, expect, it } from 'vitest'
import { createI18n } from '../../core/create-i18n'

function runtimeWith(load: (lng: string, ns: string) => Promise<Record<string, unknown>>) {
  return createI18n({
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    catalogs: { public: 'catalogs' },
    backend: { load },
  })
}

describe('prefetch warming', () => {
  it('hydrates the i18next instance even when the namespace was prefetched', async () => {
    const runtime = runtimeWith(async (lng) => ({ hello: lng === 'ar' ? 'مرحبا' : 'Hello' }))

    runtime.prefetch('ar', 'common')
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(runtime.has('ar', 'common')).toBe(true)

    await runtime.loadNamespace('ar', 'common')
    expect(runtime.getT('ar', 'common')('hello')).toBe('مرحبا')
  })
})
