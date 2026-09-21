import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { LocaleGuard } from '../locale-guard'

describe('LocaleGuard', () => {
  it('renders a dir-correct blank before the shell is loaded', () => {
    render(
      <MemoryRouter initialEntries={['/ar/settings']}>
        <LocaleGuard>
          <span>chrome</span>
        </LocaleGuard>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('locale-boot')).toBeTruthy()
    expect(screen.queryByText('chrome')).toBeNull()
  })

  it('renders children after the shell resolves', async () => {
    render(
      <MemoryRouter initialEntries={['/en/settings']}>
        <LocaleGuard>
          <span>chrome</span>
        </LocaleGuard>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('chrome')).toBeTruthy())
  })
})
