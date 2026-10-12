import { contextBridge, ipcRenderer } from 'electron'

export const CHANNELS = {
  getLocale: 'i18n:get-locale',
  setLocale: 'i18n:set-locale',
  localeChanged: 'i18n:locale-changed',
} as const

const api = {
  getLocale: (): Promise<string> => ipcRenderer.invoke(CHANNELS.getLocale),
  setLocale: (lng: string): Promise<void> => ipcRenderer.invoke(CHANNELS.setLocale, lng),
  onLocaleChange: (cb: (lng: string) => void): (() => void) => {
    const listener = (_event: unknown, lng: string): void => cb(lng)
    ipcRenderer.on(CHANNELS.localeChanged, listener)
    return () => ipcRenderer.removeListener(CHANNELS.localeChanged, listener)
  },
}

contextBridge.exposeInMainWorld('desktopI18n', api)

export type DesktopI18nApi = typeof api
