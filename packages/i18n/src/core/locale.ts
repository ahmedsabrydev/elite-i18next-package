import { RTL_LOCALES, SUPPORTED_LOCALES } from './defaults'
import type { DefaultLocale, Dir } from './types'

const SAFE_LNG = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/

export function resolveLocale(
  input: string | null | undefined,
  allowed: readonly string[] = SUPPORTED_LOCALES,
  fallback: string = 'en',
): string {
  if (!input || !SAFE_LNG.test(input)) return fallback
  const base = input.toLowerCase().split('-')[0] ?? ''
  const match = allowed.find((lng) => lng.toLowerCase() === base)
  return match ?? fallback
}

export function dirFor(lng: string): Dir {
  const base = lng.toLowerCase().split('-')[0] ?? ''
  return RTL_LOCALES.has(base) ? 'rtl' : 'ltr'
}

export function assertSupportedLocale<L extends string>(
  lng: string,
  allowed: readonly L[],
): lng is L {
  return allowed.includes(lng as L)
}

export type { DefaultLocale }
