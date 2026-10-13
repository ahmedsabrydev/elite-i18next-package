import type { NamespaceResources } from '@faang/i18n'
import arCommon from '@faang/i18n/catalogs/ar/common.json'
import arErrors from '@faang/i18n/catalogs/ar/errors.json'
import arHome from '@faang/i18n/catalogs/ar/home.json'
import arProfile from '@faang/i18n/catalogs/ar/profile.json'
import arSettings from '@faang/i18n/catalogs/ar/settings.json'
import arValidation from '@faang/i18n/catalogs/ar/validation.json'
import enCommon from '@faang/i18n/catalogs/en/common.json'
import enErrors from '@faang/i18n/catalogs/en/errors.json'
import enHome from '@faang/i18n/catalogs/en/home.json'
import enProfile from '@faang/i18n/catalogs/en/profile.json'
import enSettings from '@faang/i18n/catalogs/en/settings.json'
import enValidation from '@faang/i18n/catalogs/en/validation.json'

export const catalogs: Record<string, NamespaceResources> = {
  'en:common': enCommon,
  'en:errors': enErrors,
  'en:home': enHome,
  'en:profile': enProfile,
  'en:settings': enSettings,
  'en:validation': enValidation,
  'ar:common': arCommon,
  'ar:errors': arErrors,
  'ar:home': arHome,
  'ar:profile': arProfile,
  'ar:settings': arSettings,
  'ar:validation': arValidation,
}
