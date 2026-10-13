import { useState } from 'react'
import { useT } from '@faang/i18n/react'
import { Card } from '../components/Card'
import { AppButton } from '../components/AppButton'
import { colors, spacing } from '../theme'

export function Profile() {
  const t = useT('profile')
  const tc = useT('common')
  const tv = useT('validation')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
    <Card>
      <h2 style={{ margin: 0 }}>{t('title')}</h2>
      <label htmlFor="name">{t('name')}</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="email">{t('email')}</label>
      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error ? <span style={{ color: colors.danger }}>{error}</span> : null}
      {saved ? <span style={{ color: colors.success }}>{t('saved')}</span> : null}
      <div style={{ marginTop: spacing.sm }}>
        <AppButton testID="save-profile" label={tc('actions.save')} onClick={onSave} />
      </div>
    </Card>
  )
}
