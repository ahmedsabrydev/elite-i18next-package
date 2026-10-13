import type { ReactNode } from 'react'
import { colors, radius, spacing } from '../theme'

export function Card({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        display: 'grid',
        gap: spacing.sm,
      }}
    >
      {children}
    </section>
  )
}
