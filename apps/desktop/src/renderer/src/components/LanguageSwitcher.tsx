import { useLocale, useT } from '@faang/i18n/react'
import { colors, radius, spacing } from '../theme'

export function LanguageSwitcher() {
  const { lng, changeLocale } = useLocale()
  const t = useT('common')
  const options: Array<{ code: 'en' | 'ar'; label: string }> = [
    { code: 'en', label: t('language.en') },
    { code: 'ar', label: t('language.ar') },
  ]
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 3,
        padding: 3,
        borderRadius: radius.pill,
        background: colors.primaryMuted,
      }}
    >
      {options.map((option) => {
        const active = lng === option.code
        return (
          <button
            key={option.code}
            type="button"
            data-testid={`lang-${option.code}`}
            aria-pressed={active}
            onClick={() => changeLocale(option.code)}
            style={{
              cursor: 'pointer',
              border: 'none',
              borderRadius: radius.pill,
              padding: `${spacing.sm}px ${spacing.lg}px`,
              fontSize: 15,
              fontWeight: 600,
              color: active ? colors.text : colors.primary,
              background: active ? colors.surface : 'transparent',
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
