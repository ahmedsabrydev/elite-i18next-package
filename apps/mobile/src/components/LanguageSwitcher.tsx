import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocale, useT } from '@faang/i18n/react'
import { colors, radius, spacing } from '../theme'

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lng, changeLocale } = useLocale()
  const t = useT('common')
  const options = [
    { code: 'en', label: t('language.en') },
    { code: 'ar', label: t('language.ar') },
  ]

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {options.map((option) => {
        const active = lng === option.code
        return (
          <Pressable
            key={option.code}
            testID={`lang-${option.code}`}
            onPress={() => changeLocale(option.code)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            style={[
              styles.option,
              compact && styles.optionCompact,
              active && styles.optionActive,
            ]}
          >
            <Text
              style={[styles.label, compact && styles.labelCompact, active && styles.labelActive]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    padding: 3,
    gap: 3,
  },
  wrapCompact: { alignSelf: 'center' },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  optionCompact: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  optionActive: { backgroundColor: colors.surface },
  label: { color: colors.primary, fontSize: 15, fontWeight: '600' },
  labelCompact: { fontSize: 13 },
  labelActive: { color: colors.text },
})
