import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Home } from '../screens/Home'
import { Profile } from '../screens/Profile'
import { renderWithRuntime } from '../test-utils/renderWithRuntime'

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}))

describe('screens', () => {
  it('renders Home in Arabic', async () => {
    await renderWithRuntime(<Home />, 'ar')
    await waitFor(() => expect(screen.getByText('مرحبًا بك في عرض i18n')).toBeTruthy())
  })

  it('shows a validation message when the Profile form is empty', async () => {
    await renderWithRuntime(<Profile />, 'en')
    fireEvent.press(screen.getByText('Save'))
    expect(screen.getByText('Name is required')).toBeTruthy()
  })
})
