import { I18nProvider, useLocale, useT } from '@faang/i18n/react'
import { matchLocaleFromPath } from '@faang/i18n/vite'
import { useLocation } from 'react-router'
import { runtime } from '../i18n'

export function Settings() {
  const location = useLocation()
  const { locale } = matchLocaleFromPath(
    location.pathname,
    runtime.config.locales,
    runtime.config.defaultLocale,
  )
  return (
    <I18nProvider runtime={runtime} locale={locale} navigate={(href) => (window.location.href = href)}>
      <SettingsContent />
    </I18nProvider>
  )
}

function SettingsContent() {
  const t = useT('common')
  const { lng, isRtl, changeLocale } = useLocale()
  return (
    <main>
      <h1>{t('nav.settings')}</h1>
      <p data-testid="locale">{lng}</p>
      <p data-testid="rtl">{String(isRtl)}</p>
      <button type="button" onClick={() => changeLocale(lng === 'en' ? 'ar' : 'en')}>
        {t('language.label')}
      </button>
    </main>
  )
}
