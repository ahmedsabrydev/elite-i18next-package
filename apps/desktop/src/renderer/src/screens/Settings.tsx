import { useLocale, useT } from '@faang/i18n/react'
import { Card } from '../components/Card'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { colors } from '../theme'

export function Settings() {
  const t = useT('settings')
  const tc = useT('common')
  const { lng, dir } = useLocale()
  return (
    <>
      <Card>
        <h2 style={{ margin: 0 }}>{t('title')}</h2>
        <h3 style={{ margin: 0 }}>{t('language')}</h3>
        <LanguageSwitcher />
        <span style={{ color: colors.muted }}>{`${tc('language.label')}: ${lng} (${dir})`}</span>
      </Card>
      <Card>
        <h3 style={{ margin: 0 }}>{t('direction')}</h3>
        <span style={{ color: colors.muted }}>{tc('language.label')}</span>
        <p style={{ margin: 0, color: colors.muted }}>{t('restartNote')}</p>
      </Card>
    </>
  )
}
