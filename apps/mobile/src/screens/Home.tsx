import { StyleSheet, Text } from 'react-native'
import { useLocale, useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'

export function Home() {
  const t = useT('home')
  const tc = useT('common')
  const { lng, dir } = useLocale()
  return (
    <Screen>
      <Text style={styles.title}>{t('title')}</Text>
      <Text>{t('subtitle')}</Text>
      <Text>{t('greeting', { name: tc('app.name') })}</Text>
      <Text>{t('items', { count: 3 })}</Text>
      <Text>{`${tc('language.label')}: ${lng} (${dir})`}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700' },
})
