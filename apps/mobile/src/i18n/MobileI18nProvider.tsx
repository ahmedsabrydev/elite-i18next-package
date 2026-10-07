import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ActivityIndicator, View } from 'react-native'
import { I18nProvider } from '@faang/i18n/react'
import { createNativeI18n } from '@faang/i18n/native'
import { catalogs } from './catalogs'
import { APP_NAMESPACES } from './namespaces'
import { appState, localization, rtl, storage } from './native-adapter'

const { runtime, controller } = createNativeI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  fallbackLng: 'en',
  catalogs,
  storage,
  localization,
  rtl,
  appState,
})

type SystemMode = {
  systemMode: boolean
  setSystemMode: (on: boolean) => void
}

const SystemModeContext = createContext<SystemMode | null>(null)

export function useSystemMode(): SystemMode {
  const value = useContext(SystemModeContext)
  if (!value) throw new Error('useSystemMode must be used within a <MobileI18nProvider>')
  return value
}

async function loadAppNamespaces(lng: string) {
  await Promise.all(APP_NAMESPACES.map((ns) => runtime.loadNamespace(lng as 'en', ns)))
}

export function MobileI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string | null>(null)
  const [systemMode, setSystemMode] = useState(true)

  useEffect(() => {
    let active = true
    void controller.getInitialLocale().then(async (lng) => {
      controller.applyDirection(lng)
      await loadAppNamespaces(lng)
      if (active) setLocale(lng)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!systemMode) return
    return controller.subscribeSystemLocale((lng) => {
      void loadAppNamespaces(lng).then(() => setLocale(lng))
    })
  }, [systemMode])

  const onLocaleChange = useMemo(
    () => (lng: string) => {
      setSystemMode(false)
      void controller
        .setLocale(lng as 'en')
        .then(() => loadAppNamespaces(lng))
        .then(() => setLocale(lng))
    },
    [],
  )

  const systemModeValue = useMemo(
    () => ({ systemMode, setSystemMode }),
    [systemMode],
  )

  if (!locale) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <SystemModeContext.Provider value={systemModeValue}>
      <I18nProvider runtime={runtime} locale={locale} onLocaleChange={onLocaleChange}>
        {children}
      </I18nProvider>
    </SystemModeContext.Provider>
  )
}
