import { describe, expect, it } from 'vitest'
import { getHtmlAttributes } from '../../next/html'

describe('getHtmlAttributes', () => {
  it('is rtl for ar', () => {
    expect(getHtmlAttributes('ar')).toEqual({ lang: 'ar', dir: 'rtl' })
  })

  it('is ltr for en', () => {
    expect(getHtmlAttributes('en')).toEqual({ lang: 'en', dir: 'ltr' })
  })
})
