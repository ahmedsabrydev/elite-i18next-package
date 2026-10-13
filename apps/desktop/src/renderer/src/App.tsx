import { useState } from 'react'
import { useT } from '@faang/i18n/react'
import { DesktopI18nProvider } from './i18n/DesktopI18nProvider'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { Screen } from './components/Screen'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Profile } from './screens/Profile'
import { colors, spacing } from './theme'

type Tab = 'home' | 'settings' | 'profile'

function Shell() {
  const t = useT('common')
  const [tab, setTab] = useState<Tab>('home')
  const tabs: Tab[] = ['home', 'settings', 'profile']
  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.lg,
          padding: `${spacing.md}px ${spacing.xl}px`,
          background: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <strong>{t('app.name')}</strong>
        <nav style={{ display: 'flex', gap: spacing.sm }}>
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              data-testid={`tab-${item}`}
              onClick={() => setTab(item)}
              style={{
                cursor: 'pointer',
                border: 'none',
                borderRadius: 8,
                padding: `${spacing.sm}px ${spacing.md}px`,
                fontWeight: 600,
                color: tab === item ? colors.primaryContrast : colors.text,
                background: tab === item ? colors.primary : 'transparent',
              }}
            >
              {t(`nav.${item}`)}
            </button>
          ))}
        </nav>
        <LanguageSwitcher />
      </header>
      <Screen>
        {tab === 'home' ? <Home onNavigate={setTab} /> : null}
        {tab === 'settings' ? <Settings /> : null}
        {tab === 'profile' ? <Profile /> : null}
      </Screen>
    </div>
  )
}

export default function App() {
  return (
    <DesktopI18nProvider>
      <Shell />
    </DesktopI18nProvider>
  )
}
