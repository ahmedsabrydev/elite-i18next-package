import { describe, expect, it } from 'vitest'
import { getHtmlAttributes } from '@faang/i18n/next'

describe('zero-flicker html attributes', () => {
  it('sets dir before paint for ar', () => {
    expect(getHtmlAttributes('ar')).toEqual({ lang: 'ar', dir: 'rtl' })
  })

  it('sets dir before paint for en', () => {
    expect(getHtmlAttributes('en')).toEqual({ lang: 'en', dir: 'ltr' })
  })
})
