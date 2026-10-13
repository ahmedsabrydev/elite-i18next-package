import { describe, expect, it } from 'vitest'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { Home } from '../screens/Home'
import { Profile } from '../screens/Profile'
import { renderWithRuntime } from '../test-utils/renderWithRuntime'

describe('screens', () => {
  it('renders Home in Arabic', async () => {
    await renderWithRuntime(<Home onNavigate={() => {}} />, 'ar')
    await waitFor(() => expect(screen.getByText('مرحبًا بك في عرض i18n')).toBeTruthy())
  })

  it('shows a validation message when the Profile form is empty', async () => {
    await renderWithRuntime(<Profile />, 'en')
    fireEvent.click(screen.getByTestId('save-profile'))
    expect(screen.getByText('Name is required')).toBeTruthy()
  })
})
