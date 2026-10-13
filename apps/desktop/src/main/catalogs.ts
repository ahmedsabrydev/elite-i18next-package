import type { NamespaceResources } from '@faang/i18n'
import arCommon from '@faang/i18n/catalogs/ar/common.json'
import enCommon from '@faang/i18n/catalogs/en/common.json'

export const catalogs: Record<string, NamespaceResources> = {
  'en:common': enCommon,
  'ar:common': arCommon,
}
