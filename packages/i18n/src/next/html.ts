import { dirFor } from '../core/locale'
import type { Dir } from '../core/types'

export function getHtmlAttributes(lng: string): { lang: string; dir: Dir } {
  return { lang: lng, dir: dirFor(lng) }
}
