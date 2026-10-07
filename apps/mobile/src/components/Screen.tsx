import type { ReactNode } from 'react'
import { ScrollView, StyleSheet } from 'react-native'

export function Screen({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 12 },
})
