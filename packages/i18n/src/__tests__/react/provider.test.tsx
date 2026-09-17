import { render, screen, renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../../core/create-i18n'
import { I18nProvider, Trans, useLocale, useT } from '../../react'

function setup(locale = 'ar') {
  const runtime = createI18n({
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    catalogs: { public: 'catalogs' },
    backend: {
      load: async (lng, ns) => (lng === 'en' ? { hello: 'Hello', chrome: 'Chrome' } : { hello: 'مرحبا', chrome: 'واجهة' }),
    },
  })
  return { runtime, locale }
}

function Probe() {
  const t = useT('common')
  const { lng, dir, isRtl } = useLocale()
  return (
    <div>
      <span data-testid="lng">{lng}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="rtl">{String(isRtl)}</span>
      <span data-testid="text">{t('hello')}</span>
    </div>
  )
}

describe('I18nProvider', () => {
  it('exposes locale snapshot and translation for ar', async () => {
    const { runtime } = setup('ar')
    await runtime.loadNamespace('ar', 'common')
    render(
      <I18nProvider runtime={runtime} locale="ar">
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('lng').textContent).toBe('ar')
    expect(screen.getByTestId('dir').textContent).toBe('rtl')
    expect(screen.getByTestId('rtl').textContent).toBe('true')
    expect(screen.getByTestId('text').textContent).toBe('مرحبا')
  })

  it('changeLocale calls navigate with the sibling URL', async () => {
    const { runtime } = setup('en')
    const navigate = vi.fn()
    window.history.replaceState({}, '', '/en/settings')
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }) => (
        <I18nProvider runtime={runtime} locale="en" navigate={navigate}>
          {children}
        </I18nProvider>
      ),
    })
    act(() => result.current.changeLocale('ar'))
    expect(navigate).toHaveBeenCalledWith('/ar/settings')
  })

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useLocale())).toThrow(/I18nProvider/)
  })

  it('Trans renders the provider locale translation for ar', async () => {
    const { runtime } = setup('ar')
    await runtime.loadNamespace('ar', 'common')
    render(
      <I18nProvider runtime={runtime} locale="ar">
        <span data-testid="trans">
          <Trans i18nKey="hello" />
        </span>
      </I18nProvider>,
    )
    expect(screen.getByTestId('trans').textContent).toBe('مرحبا')
  })
})
