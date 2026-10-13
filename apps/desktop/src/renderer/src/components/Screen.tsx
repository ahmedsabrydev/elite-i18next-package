import type { ReactNode } from 'react'
import { spacing } from '../theme'

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: spacing.xl,
        display: 'grid',
        gap: spacing.lg,
      }}
    >
      {children}
    </main>
  )
}
