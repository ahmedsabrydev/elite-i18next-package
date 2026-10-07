import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { useLocale, useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'
import { useSystemMode } from '../i18n/MobileI18nProvider'

export function Settings() {
  const t = useT('settings')
  const tc = useT('common')
  const { changeLocale, lng, dir } = useLocale()
  const { systemMode, setSystemMode } = useSystemMode()
  return (
    <Screen>
      <Text style={styles.title}>{t('title')}</Text>
      <Text>{`${tc('language.label')}: ${lng} (${dir})`}</Text>
      <Pressable onPress={() => changeLocale('en')}>
        <Text>{tc('language.en')}</Text>
      </Pressable>
      <Pressable onPress={() => changeLocale('ar')}>
        <Text>{tc('language.ar')}</Text>
      </Pressable>
      <View style={styles.row}>
        <Text>{t('followSystem')}</Text>
        <Switch value={systemMode} onValueChange={setSystemMode} />
      </View>
      <Text>{t('restartNote')}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
