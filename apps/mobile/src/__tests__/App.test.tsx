import { render, screen, act, fireEvent, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocale, useT } from '@faang/i18n/react'
import { MobileI18nProvider } from '../i18n/MobileI18nProvider'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

function Probe() {
  const t = useT('home')
  const { lng, dir, changeLocale } = useLocale()
  return (
    <>
      <Text testID="title">{t('title')}</Text>
      <Text testID="meta">{`${lng}:${dir}`}</Text>
      <Text testID="to-ar" onPress={() => changeLocale('ar')}>
        ar
      </Text>
    </>
  )
}

function SwitcherProbe() {
  const { lng, dir } = useLocale()
  return (
    <>
      <LanguageSwitcher />
      <Text testID="meta">{`${lng}:${dir}`}</Text>
    </>
  )
}

describe('MobileI18nProvider', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  it('boots in en and switches to ar with RTL', async () => {
    await render(
      <MobileI18nProvider>
        <Probe />
      </MobileI18nProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('Welcome to the i18n showcase'))
    expect(screen.getByTestId('meta')).toHaveTextContent('en:ltr')
    await act(async () => {
      fireEvent.press(screen.getByTestId('to-ar'))
    })
    await waitFor(() => expect(screen.getByTestId('meta')).toHaveTextContent('ar:rtl'))
    expect(screen.getByTestId('title')).toHaveTextContent('مرحبًا بك في عرض i18n')
  })

  it('switches locale from the visible switcher', async () => {
    await render(
      <MobileI18nProvider>
        <SwitcherProbe />
      </MobileI18nProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('meta')).toHaveTextContent('en:ltr'))
    await act(async () => {
      fireEvent.press(screen.getByTestId('lang-ar'))
    })
    await waitFor(() => expect(screen.getByTestId('meta')).toHaveTextContent('ar:rtl'))
  })
})
