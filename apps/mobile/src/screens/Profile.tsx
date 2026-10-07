import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'
import { useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'

export function Profile() {
  const t = useT('profile')
  const tv = useT('validation')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onSave() {
    if (!name.trim()) {
      setSaved(false)
      setError(tv('required', { field: t('name') }))
      return
    }
    setError(null)
    setSaved(true)
  }

  return (
    <Screen>
      <Text style={styles.title}>{t('title')}</Text>
      <Text>{t('name')}</Text>
      <TextInput value={name} onChangeText={setName} accessibilityLabel={t('name')} />
      <Pressable onPress={onSave}>
        <Text>{t('save')}</Text>
      </Pressable>
      {error ? <Text>{error}</Text> : null}
      {saved ? <Text>{t('saved')}</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700' },
})
