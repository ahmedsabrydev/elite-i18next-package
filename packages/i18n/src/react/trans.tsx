import { Trans as ReactI18nTrans } from 'react-i18next'
import type { ComponentProps } from 'react'
import type { Namespace } from '../core/types'
import { useT } from './hooks'

export function Trans(props: ComponentProps<typeof ReactI18nTrans>) {
  const t = useT(props.ns as Namespace | undefined)
  return <ReactI18nTrans {...props} t={props.t ?? t} />
}
