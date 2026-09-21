import { I18nProvider, useT } from '@faang/i18n/react'
import { matchLocaleFromPath } from '@faang/i18n/vite'
import { useLocation } from 'react-router'
import { runtime } from '../i18n'

export function Home() {
  const location = useLocation()
  const { locale } = matchLocaleFromPath(
    location.pathname,
    runtime.config.locales,
    runtime.config.defaultLocale,
  )
  return (
    <I18nProvider runtime={runtime} locale={locale} navigate={(href) => (window.location.href = href)}>
      <Content />
    </I18nProvider>
  )
}

function Content() {
  const t = useT('common')
  return (
    <main>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
    </main>
  )
}
