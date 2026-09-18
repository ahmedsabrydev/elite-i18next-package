import { create } from 'zustand'
import type { Dir } from '../core/types'
import { dirFor } from '../core/locale'

export type LocaleSnapshot = {
  lng: string
  dir: Dir
  isRtl: boolean
  status: 'hydrated' | 'switching' | 'loading-ns'
}

export type LocaleStore = LocaleSnapshot & {
  setLocale: (lng: string) => void
  setStatus: (status: LocaleSnapshot['status']) => void
}

export function createZustandLocaleStore(initial: { lng: string }) {
  return create<LocaleStore>((set) => ({
    lng: initial.lng,
    dir: dirFor(initial.lng),
    isRtl: dirFor(initial.lng) === 'rtl',
    status: 'hydrated',
    setLocale: (lng) => set({ lng, dir: dirFor(lng), isRtl: dirFor(lng) === 'rtl' }),
    setStatus: (status) => set({ status }),
  }))
}
