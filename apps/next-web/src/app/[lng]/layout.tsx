import type { ReactNode } from 'react'
import { getHtmlAttributes, localeStaticParams, defineRouteI18n } from '@faang/i18n/next'
import { runtime } from '../../i18n'

export function generateStaticParams() {
  return localeStaticParams(runtime)
}

const shell = defineRouteI18n({ runtime, ns: ['common', 'errors'] })

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ lng: string }>
}) {
  const { lng } = await params
  await shell.load(lng)
  const { lang, dir } = getHtmlAttributes(lng)
  return (
    <html lang={lang} dir={dir}>
      <body data-shell-ready="true">{children}</body>
    </html>
  )
}
