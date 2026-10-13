import { beforeEach, describe, expect, it } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { useLocale, useT } from '@faang/i18n/react'
import { DesktopI18nProvider } from '../i18n/DesktopI18nProvider'

function Probe() {
  const t = useT('home')
  const { lng, dir, changeLocale } = useLocale()
  return (
    <div>
      <span data-testid="title">{t('title')}</span>
      <span data-testid="meta">{`${lng}:${dir}`}</span>
      <button data-testid="to-ar" onClick={() => changeLocale('ar')}>
        ar
      </button>
    </div>
  )
}

describe('DesktopI18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete (window as { desktopI18n?: unknown }).desktopI18n
  })

  it('boots in en and switches to ar with RTL', async () => {
    render(
      <DesktopI18nProvider>
        <Probe />
      </DesktopI18nProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('title').textContent).toBe('Welcome to the i18n showcase'),
    )
    expect(screen.getByTestId('meta').textContent).toBe('en:ltr')
    act(() => {
      screen.getByTestId('to-ar').click()
    })
    await waitFor(() => expect(screen.getByTestId('meta').textContent).toBe('ar:rtl'))
    expect(screen.getByTestId('title').textContent).toBe('مرحبًا بك في عرض i18n')
  })
})
