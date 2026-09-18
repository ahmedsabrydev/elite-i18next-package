import { resolveLocale } from '../core/locale'

export function localePrefix(lng: string, pathname: string): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `/${lng}${normalized}`
}

export function matchLocaleFromPath(
  pathname: string,
  locales: readonly string[],
  defaultLocale: string,
): { locale: string; rest: string } {
  const segments = pathname.split('/')
  const first = segments[1]
  if (!first) return { locale: defaultLocale, rest: pathname }

  const base = first.toLowerCase().split('-')[0] ?? first
  const match = locales.find((lng) => lng.toLowerCase() === base)
  if (!match) return { locale: defaultLocale, rest: pathname }

  const rest = `/${segments.slice(2).join('/')}`.replace(/\/+$/, '')
  return { locale: match, rest }
}

export function resolveLocaleOrNull(
  pathname: string,
  locales: readonly string[],
): string | null {
  const segments = pathname.split('/')
  const first = segments[1]
  if (!first) return null
  const base = first.toLowerCase().split('-')[0] ?? first
  return locales.find((lng) => lng.toLowerCase() === base) ?? null
}

export { resolveLocale }
