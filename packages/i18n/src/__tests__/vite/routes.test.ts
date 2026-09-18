import { describe, expect, it } from 'vitest'
import { localePrefix, matchLocaleFromPath } from '../../vite/routes'

describe('localePrefix', () => {
  it('prefixes a rooted path', () => {
    expect(localePrefix('ar', '/settings')).toBe('/ar/settings')
  })

  it('normalizes a missing leading slash', () => {
    expect(localePrefix('en', 'settings')).toBe('/en/settings')
  })

  it('avoids a double slash', () => {
    expect(localePrefix('en', '/')).toBe('/en/')
  })
})

describe('matchLocaleFromPath', () => {
  it('extracts a supported locale', () => {
    expect(matchLocaleFromPath('/ar/settings', ['en', 'ar'], 'en')).toEqual({ locale: 'ar', rest: '/settings' })
  })

  it('returns the default when the first segment is not a locale', () => {
    expect(matchLocaleFromPath('/settings', ['en', 'ar'], 'en')).toEqual({ locale: 'en', rest: '/settings' })
  })

  it('rejects unsupported locales without leaking them as locale', () => {
    expect(matchLocaleFromPath('/fr/settings', ['en', 'ar'], 'en')).toEqual({ locale: 'en', rest: '/fr/settings' })
  })

  it('maps a region tag in the URL to the base locale', () => {
    expect(matchLocaleFromPath('/ar-eg/settings', ['en', 'ar'], 'en')).toEqual({ locale: 'ar', rest: '/settings' })
  })

  it('handles the bare locale root', () => {
    expect(matchLocaleFromPath('/ar', ['en', 'ar'], 'en')).toEqual({ locale: 'ar', rest: '' })
  })
})
