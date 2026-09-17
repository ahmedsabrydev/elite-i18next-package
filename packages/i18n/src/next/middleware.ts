import { resolveLocale } from '../core/locale'
import type { I18nRuntime } from '../core/types'

export type I18nRequest = {
  pathname: string
  search?: string
  acceptLanguage?: string
  cookie?: string
}

export type I18nRedirect = {
  redirectTo: string
  locale: string
  setCookie: boolean
}

const DEFAULT_COOKIE = 'i18n_lng'

function parseAcceptLanguage(header: string | undefined): string | undefined {
  if (!header) return undefined
  const first = header.split(',')[0]?.trim()
  if (!first) return undefined
  return first.split(';')[0]?.trim()
}

export function i18nMiddleware(
  runtime: I18nRuntime,
  options: { cookieName?: string } = {},
): (request: I18nRequest) => I18nRedirect | undefined {
  const { locales, defaultLocale } = runtime.config
  return (request) => {
    const segments = request.pathname.split('/').filter(Boolean)
    const first = segments[0]
    const hasLocale = first !== undefined && locales.some((lng) => lng.toLowerCase() === first.toLowerCase())
    if (hasLocale) return undefined

    const cookieLng = resolveLocale(request.cookie, locales, defaultLocale)
    const headerLng = resolveLocale(parseAcceptLanguage(request.acceptLanguage), locales, defaultLocale)
    const cookieIsValid = Boolean(request.cookie) && cookieLng === request.cookie
    const chosen = cookieIsValid ? cookieLng : headerLng
    const locale = resolveLocale(chosen, locales, defaultLocale)

    const redirectTo = `/${locale}${request.pathname}${request.search ?? ''}`
    return { redirectTo, locale, setCookie: !cookieIsValid }
  }
}

export function localeStaticParams(runtime: I18nRuntime): { lng: string }[] {
  return runtime.config.locales.map((lng) => ({ lng }))
}

export { DEFAULT_COOKIE }
