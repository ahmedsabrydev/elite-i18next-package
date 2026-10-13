import { colors, radius, spacing } from '../theme'

export function AppButton({
  label,
  onClick,
  variant = 'primary',
  testID,
}: {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  testID?: string
}) {
  const isPrimary = variant === 'primary'
  return (
    <button
      type="button"
      data-testid={testID}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: radius.md,
        padding: `${spacing.md}px ${spacing.lg}px`,
        fontSize: 16,
        fontWeight: 600,
        color: isPrimary ? colors.primaryContrast : colors.primary,
        background: isPrimary ? colors.primary : colors.primaryMuted,
        border: isPrimary ? 'none' : `1px solid ${colors.primary}`,
      }}
    >
      {label}
    </button>
  )
}
