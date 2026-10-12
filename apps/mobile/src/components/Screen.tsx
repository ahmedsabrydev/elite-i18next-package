import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { colors, spacing } from '../theme'

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.inner}>{children}</View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 640, gap: spacing.lg },
})
