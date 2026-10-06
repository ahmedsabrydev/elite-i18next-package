import { render, screen } from '@testing-library/react-native'
import App from '../App'

describe('App', () => {
  it('renders the shell', async () => {
    await render(<App />)
    expect(screen.getByText('i18n showcase')).toBeTruthy()
  })
})
