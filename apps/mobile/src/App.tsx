import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useT } from '@faang/i18n/react'
import { MobileI18nProvider } from './i18n/MobileI18nProvider'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Profile } from './screens/Profile'
import { colors } from './theme'
import type { RootStackParamList } from './navigation'

const Stack = createNativeStackNavigator<RootStackParamList>()

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
  },
}

function Navigator() {
  const t = useT('common')
  const tp = useT('profile')
  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => <LanguageSwitcher compact />,
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={Home} options={{ title: t('nav.home') }} />
      <Stack.Screen name="Settings" component={Settings} options={{ title: t('nav.settings') }} />
      <Stack.Screen name="Profile" component={Profile} options={{ title: tp('title') }} />
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileI18nProvider>
        <NavigationContainer theme={navigationTheme}>
          <Navigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </MobileI18nProvider>
    </SafeAreaProvider>
  )
}
