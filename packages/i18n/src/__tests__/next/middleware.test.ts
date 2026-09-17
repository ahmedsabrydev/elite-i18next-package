import { describe, expect, it } from 'vitest'
import { i18nMiddleware, localeStaticParams } from '../../next/middleware'
import { createI18n } from '../../core/create-i18n'

const runtime = createI18n({ locales: ['en', 'ar'], defaultLocale: 'en', catalogs: { public: 'catalogs' } })

describe('i18nMiddleware', () => {
  const middleware = i18nMiddleware(runtime)

  it('redirects a locale-less path to the default locale', () => {
    const result = middleware({ pathname: '/settings', acceptLanguage: undefined, cookie: undefined })
    expect(result).toEqual({ redirectTo: '/en/settings', locale: 'en', setCookie: true })
  })

  it('uses the cookie locale', () => {
    const result = middleware({ pathname: '/settings', acceptLanguage: undefined, cookie: 'ar' })
    expect(result).toEqual({ redirectTo: '/ar/settings', locale: 'ar', setCookie: false })
  })

  it('uses Accept-Language when there is no cookie', () => {
    const result = middleware({ pathname: '/settings', acceptLanguage: 'ar-EG,ar;q=0.9', cookie: undefined })
    expect(result).toEqual({ redirectTo: '/ar/settings', locale: 'ar', setCookie: true })
  })

  it('does nothing when the path already has a supported locale', () => {
    expect(middleware({ pathname: '/ar/settings', acceptLanguage: 'en', cookie: undefined })).toBeUndefined()
    expect(middleware({ pathname: '/en/settings', acceptLanguage: 'ar', cookie: undefined })).toBeUndefined()
  })

  it('does not treat another modern locale as a locale prefix', () => {
    const result = middleware({ pathname: '/ar-eg/settings', acceptLanguage: undefined, cookie: undefined })
    expect(result?.redirectTo).toBe('/en/ar-eg/settings')
  })

  it('falls back to the default for an unsupported Accept-Language', () => {
    const result = middleware({ pathname: '/settings', acceptLanguage: 'fr-FR,fr;q=0.9', cookie: undefined })
    expect(result).toEqual({ redirectTo: '/en/settings', locale: 'en', setCookie: true })
  })

  it('ignores path traversal payloads', () => {
    const result = middleware({ pathname: '/settings', acceptLanguage: undefined, cookie: '../fr' })
    expect(result).toEqual({ redirectTo: '/en/settings', locale: 'en', setCookie: true })
  })

  it('preserves the search string', () => {
    const result = middleware({ pathname: '/settings', search: '?tab=billing', acceptLanguage: undefined, cookie: 'ar' })
    expect(result?.redirectTo).toBe('/ar/settings?tab=billing')
  })
})

describe('localeStaticParams', () => {
  it('returns one param per supported locale', () => {
    expect(localeStaticParams(runtime)).toEqual([{ lng: 'en' }, { lng: 'ar' }])
  })
})
