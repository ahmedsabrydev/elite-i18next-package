import { createI18nServer } from '@faang/i18n/next'
import { runtime } from '../../i18n'

export default async function Home({ params }: { params: Promise<{ lng: string }> }) {
  const { lng } = await params
  const { getT } = createI18nServer(runtime)
  const t = await getT(lng, 'common')
  return (
    <main>
      <h1>{t('app.name')}</h1>
      <p>{t('app.tagline')}</p>
    </main>
  )
}
