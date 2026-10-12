import { useState } from 'react'
import { StyleSheet, Text, TextInput } from 'react-native'
import { useLocale, useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'
import { Card } from '../components/Card'
import { AppButton } from '../components/AppButton'
import { colors, spacing, textAlign } from '../theme'

export function Profile() {
  const t = useT('profile')
  const tc = useT('common')
  const tv = useT('validation')
  const { dir } = useLocale()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const align = { textAlign: textAlign(dir) }

  function onSave() {
    if (!name.trim()) {
      setSaved(false)
      setError(tv('required', { field: t('name') }))
      return
    }
    if (!email.includes('@')) {
      setSaved(false)
      setError(tv('email'))
      return
    }
    setError(null)
    setSaved(true)
  }

  return (
    <Screen>
      <Card>
        <Text style={[styles.title, align]}>{t('title')}</Text>
        <Text style={[styles.label, align]}>{t('name')}</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          accessibilityLabel={t('name')}
        />
        <Text style={[styles.label, align]}>{t('email')}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          accessibilityLabel={t('email')}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {saved ? <Text style={styles.success}>{t('saved')}</Text> : null}
        <AppButton testID="save-profile" label={tc('actions.save')} onPress={onSave} />
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', marginTop: spacing.sm },
  input: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  error: { color: colors.danger, fontSize: 14 },
  success: { color: colors.success, fontSize: 14 },
})
