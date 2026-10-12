import type { TFunction } from 'i18next'
import type { DefaultLocale } from '../core/types'

export interface ElectronStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}

export interface ElectronLocale {
  getSystemLocale(): string
  subscribeSystemLocale?(cb: (lng: string) => void): () => void
}

export interface ElectronSurfaces<L extends string = DefaultLocale> {
  setWindowTitle(lng: L, t: TFunction): void
  setApplicationMenu(lng: L, t: TFunction): void
  setTrayMenu(lng: L, t: TFunction): void
  showMessageBox(lng: L, t: TFunction): void
}

export interface ElectronMessenger<L extends string = DefaultLocale> {
  broadcast(lng: L): void
  onLocaleSelected(cb: (lng: string) => void): () => void
}
