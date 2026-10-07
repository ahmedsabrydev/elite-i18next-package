import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useT } from '@faang/i18n/react'
import { MobileI18nProvider } from './i18n/MobileI18nProvider'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Profile } from './screens/Profile'

const Stack = createNativeStackNavigator()

function Navigator() {
  const tc = useT('common')
  const tp = useT('profile')
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} options={{ title: tc('nav.home') }} />
      <Stack.Screen name="Settings" component={Settings} options={{ title: tc('nav.settings') }} />
      <Stack.Screen name="Profile" component={Profile} options={{ title: tp('title') }} />
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileI18nProvider>
        <NavigationContainer>
          <Navigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </MobileI18nProvider>
    </SafeAreaProvider>
  )
}
