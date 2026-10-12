import { StyleSheet, Switch, Text, View } from 'react-native'
import { useLocale, useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { useSystemMode } from '../i18n/MobileI18nProvider'
import { colors, spacing, textAlign } from '../theme'

export function Settings() {
  const t = useT('settings')
  const tc = useT('common')
  const { lng, dir } = useLocale()
  const { systemMode, setSystemMode } = useSystemMode()
  const align = { textAlign: textAlign(dir) }

  return (
    <Screen>
      <Card>
        <Text style={[styles.sectionTitle, align]}>{t('language')}</Text>
        <LanguageSwitcher />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('direction')}</Text>
          <Text style={styles.rowValue}>{`${lng} (${dir})`}</Text>
        </View>
        <Text style={[styles.body, align]}>{`${tc('language.label')}: ${lng}`}</Text>
      </Card>

      <Card>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('followSystem')}</Text>
          <Switch value={systemMode} onValueChange={setSystemMode} />
        </View>
        <Text style={[styles.body, align]}>{t('restartNote')}</Text>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  rowValue: { color: colors.muted, fontSize: 15 },
})
