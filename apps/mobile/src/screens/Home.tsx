import { StyleSheet, Text, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useLocale, useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { AppButton } from '../components/AppButton'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { colors, spacing, textAlign } from '../theme'
import type { RootStackParamList } from '../navigation'

export function Home() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const t = useT('home')
  const tc = useT('common')
  const { lng, dir } = useLocale()
  const align = { textAlign: textAlign(dir) }

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={[styles.brand, align]}>{tc('app.name')}</Text>
        <Text style={[styles.tagline, align]}>{tc('app.tagline')}</Text>
      </View>

      <Card>
        <Text style={[styles.title, align]}>{t('title')}</Text>
        <Text style={[styles.body, align]}>{t('subtitle')}</Text>
        <Text style={[styles.body, align]}>{t('greeting', { name: tc('app.name') })}</Text>
        <Text style={[styles.body, align]}>{t('items', { count: 3 })}</Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, align]}>{t('currentLanguage')}</Text>
        <Text style={[styles.body, align]}>{`${tc('language.label')}: ${lng} (${dir})`}</Text>
        <LanguageSwitcher />
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, align]}>{t('aboutTitle')}</Text>
        <Text style={[styles.body, align]}>{t('aboutBody')}</Text>
      </Card>

      <View style={styles.actions}>
        <AppButton
          testID="go-settings"
          label={t('openSettings')}
          onPress={() => navigation.navigate('Settings')}
        />
        <AppButton
          testID="go-profile"
          variant="secondary"
          label={t('openProfile')}
          onPress={() => navigation.navigate('Profile')}
        />
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  hero: { gap: spacing.xs },
  brand: { color: colors.primary, fontSize: 28, fontWeight: '800' },
  tagline: { color: colors.muted, fontSize: 16 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  actions: { gap: spacing.md },
})
