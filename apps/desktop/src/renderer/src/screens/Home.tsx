import { useLocale, useT } from '@faang/i18n/react'
import { Card } from '../components/Card'
import { AppButton } from '../components/AppButton'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { colors, spacing } from '../theme'

export function Home({ onNavigate }: { onNavigate: (tab: 'settings' | 'profile') => void }) {
  const t = useT('home')
  const tc = useT('common')
  const { lng, dir } = useLocale()
  return (
    <>
      <Card>
        <strong style={{ color: colors.primary, fontSize: 28 }}>{tc('app.name')}</strong>
        <span style={{ color: colors.muted }}>{tc('app.tagline')}</span>
      </Card>
      <Card>
        <h2 style={{ margin: 0 }}>{t('title')}</h2>
        <p style={{ margin: 0, color: colors.muted }}>{t('subtitle')}</p>
        <p style={{ margin: 0, color: colors.muted }}>{t('greeting', { name: tc('app.name') })}</p>
        <p style={{ margin: 0, color: colors.muted }}>{t('items', { count: 3 })}</p>
      </Card>
      <Card>
        <h3 style={{ margin: 0 }}>{t('currentLanguage')}</h3>
        <span style={{ color: colors.muted }}>{`${tc('language.label')}: ${lng} (${dir})`}</span>
        <LanguageSwitcher />
      </Card>
      <div style={{ display: 'flex', gap: spacing.md }}>
        <AppButton testID="go-settings" label={t('openSettings')} onClick={() => onNavigate('settings')} />
        <AppButton
          testID="go-profile"
          variant="secondary"
          label={t('openProfile')}
          onClick={() => onNavigate('profile')}
        />
      </div>
    </>
  )
}
