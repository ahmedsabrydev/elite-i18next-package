import type { DesktopI18nApi } from './index'

declare global {
  interface Window {
    desktopI18n?: DesktopI18nApi
  }
}

export {}
