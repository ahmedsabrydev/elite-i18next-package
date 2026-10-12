import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing } from '../theme'

type Variant = 'primary' | 'secondary'

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  testID,
}: {
  label: string
  onPress: () => void
  variant?: Variant
  testID?: string
}) {
  const isPrimary = variant === 'primary'
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        pressed && styles.pressed,
      ]}
    >
      <Text style={isPrimary ? styles.primaryLabel : styles.secondaryLabel}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryMuted, borderColor: colors.primary, borderWidth: 1 },
  pressed: { opacity: 0.75 },
  primaryLabel: { color: colors.primaryContrast, fontSize: 16, fontWeight: '600' },
  secondaryLabel: { color: colors.primary, fontSize: 16, fontWeight: '600' },
})
