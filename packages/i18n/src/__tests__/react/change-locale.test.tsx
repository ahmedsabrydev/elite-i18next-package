import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../../core/create-i18n'
import { I18nProvider, useLocale } from '../../react'

function runtime() {
  return createI18n({
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    catalogs: { public: 'catalogs' },
    backend: { load: async () => ({}) },
  })
}

describe('useLocale().changeLocale DI seam', () => {
  it('prefers onLocaleChange over the URL path', () => {
    const onLocaleChange = vi.fn()
    const navigate = vi.fn()
    window.history.replaceState({}, '', '/en/settings')
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }) => (
        <I18nProvider
          runtime={runtime()}
          locale="en"
          navigate={navigate}
          onLocaleChange={onLocaleChange}
        >
          {children}
        </I18nProvider>
      ),
    })
    act(() => result.current.changeLocale('ar'))
    expect(onLocaleChange).toHaveBeenCalledWith('ar')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('falls back to the URL path when onLocaleChange is absent', () => {
    const navigate = vi.fn()
    window.history.replaceState({}, '', '/en/settings')
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }) => (
        <I18nProvider runtime={runtime()} locale="en" navigate={navigate}>
          {children}
        </I18nProvider>
      ),
    })
    act(() => result.current.changeLocale('ar'))
    expect(navigate).toHaveBeenCalledWith('/ar/settings')
  })
})
