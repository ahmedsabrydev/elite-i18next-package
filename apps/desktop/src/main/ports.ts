import { app, BrowserWindow, Menu, Tray, dialog, ipcMain } from 'electron'
import Store from 'electron-store'
import type {
  ElectronLocale,
  ElectronMessenger,
  ElectronStorage,
  ElectronSurfaces,
} from '@faang/i18n/electron'
import { CHANNELS } from './ipc'
import { buildAppMenuTemplate, buildTrayMenuTemplate } from './menu'
import type { Translate } from './menu'

export function createStorage(): ElectronStorage {
  const store = new Store<Record<string, string>>()
  return {
    async get(key) {
      return store.get(key) ?? null
    },
    async set(key, value) {
      store.set(key, value)
    },
  }
}

export const systemLocale: ElectronLocale = {
  getSystemLocale: () => app.getLocale(),
}

export interface SurfaceDeps {
  getWindow(): BrowserWindow | null
  getTray(): Tray | null
  onLocale(lng: string): void
  onAbout(t: Translate): void
}

export function createSurfaces(deps: SurfaceDeps): ElectronSurfaces {
  return {
    setWindowTitle(_lng, t) {
      deps.getWindow()?.setTitle(t('desktop.windowTitle', { name: t('app.name') }))
    },
    setApplicationMenu(_lng, t) {
      const template = buildAppMenuTemplate(t, {
        onLocale: (lng) => deps.onLocale(lng),
        onAbout: () => deps.onAbout(t),
      })
      Menu.setApplicationMenu(Menu.buildFromTemplate(template as Electron.MenuItemConstructorOptions[]))
    },
    setTrayMenu(_lng, t) {
      const tray = deps.getTray()
      if (!tray) return
      tray.setToolTip(t('app.name'))
      tray.setContextMenu(
        Menu.buildFromTemplate(
          buildTrayMenuTemplate(t, {
            onShow: () => deps.getWindow()?.show(),
            onQuit: () => app.quit(),
          }) as Electron.MenuItemConstructorOptions[],
        ),
      )
    },
    showMessageBox(lng, t) {
      void dialog.showMessageBox({
        type: 'info',
        title: t('desktop.dialog.title'),
        message: t('desktop.dialog.message'),
        detail: t('desktop.dialog.detail', { lng }),
      })
    },
  }
}

export function createMessenger(): ElectronMessenger {
  return {
    broadcast(lng) {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(CHANNELS.localeChanged, lng)
      }
    },
    onLocaleSelected(cb) {
      ipcMain.handle(CHANNELS.setLocale, (_event, lng: string) => cb(lng))
      return () => ipcMain.removeHandler(CHANNELS.setLocale)
    },
  }
}
