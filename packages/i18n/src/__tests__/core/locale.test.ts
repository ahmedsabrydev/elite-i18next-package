import { describe, expect, it } from 'vitest'
import { dirFor, resolveLocale } from '../../core/locale'
import { SUPPORTED_LOCALES } from '../../core/defaults'

describe('resolveLocale', () => {
  it('keeps an allowed locale', () => {
    expect(resolveLocale('ar', SUPPORTED_LOCALES, 'en')).toBe('ar')
  })

  it('maps region tags to the base language', () => {
    expect(resolveLocale('en-US', SUPPORTED_LOCALES, 'en')).toBe('en')
    expect(resolveLocale('ar-EG', SUPPORTED_LOCALES, 'en')).toBe('ar')
  })

  it('returns fallback for unknown languages', () => {
    expect(resolveLocale('fr', SUPPORTED_LOCALES, 'en')).toBe('en')
  })

  it('returns fallback for null, undefined and empty', () => {
    expect(resolveLocale(null, SUPPORTED_LOCALES, 'en')).toBe('en')
    expect(resolveLocale(undefined, SUPPORTED_LOCALES, 'en')).toBe('en')
    expect(resolveLocale('', SUPPORTED_LOCALES, 'en')).toBe('en')
  })

  it('rejects path traversal and injection payloads', () => {
    expect(resolveLocale('../en', SUPPORTED_LOCALES, 'en')).toBe('en')
    expect(resolveLocale('%00ar', SUPPORTED_LOCALES, 'en')).toBe('en')
    expect(resolveLocale('ar/../fr', SUPPORTED_LOCALES, 'en')).toBe('en')
  })

  it('is case-insensitive on the language part', () => {
    expect(resolveLocale('AR', SUPPORTED_LOCALES, 'en')).toBe('ar')
    expect(resolveLocale('Ar-eg', SUPPORTED_LOCALES, 'en')).toBe('ar')
  })
})

describe('dirFor', () => {
  it('is rtl for ar and ltr otherwise', () => {
    expect(dirFor('ar')).toBe('rtl')
    expect(dirFor('en')).toBe('ltr')
    expect(dirFor('fr')).toBe('ltr')
  })
})
