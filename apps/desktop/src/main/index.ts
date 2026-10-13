import { app, BrowserWindow, Tray, ipcMain, nativeImage } from 'electron'
import { join } from 'node:path'
import { createElectronI18n } from '@faang/i18n/electron'
import { catalogs } from './catalogs'
import { CHANNELS } from './ipc'
import { createMessenger, createStorage, createSurfaces, systemLocale } from './ports'

const dir = import.meta.dirname

let window: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): BrowserWindow {
  window = new BrowserWindow({
    width: 1024,
    height: 720,
    show: false,
    webPreferences: {
      preload: join(dir, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  window.on('ready-to-show', () => window?.show())
  window.on('closed', () => {
    window = null
  })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(dir, '../renderer/index.html'))
  return window
}

function createTray(): void {
  tray = new Tray(nativeImage.createEmpty())
  tray.setToolTip('i18n Showcase')
}

void app.whenReady().then(async () => {
  let setLocale: (lng: string) => Promise<void> = async () => {}

  const { controller } = createElectronI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    fallbackLng: 'en',
    catalogs,
    storage: createStorage(),
    locale: systemLocale,
    surfaces: createSurfaces({
      getWindow: () => window,
      getTray: () => tray,
      onLocale: (lng) => void setLocale(lng),
      onAbout: (t) => {
        void import('electron').then(({ dialog }) =>
          dialog.showMessageBox({
            type: 'info',
            title: t('desktop.dialog.title'),
            message: t('desktop.dialog.message'),
            detail: t('desktop.dialog.detail', { lng: t('language.label') }),
          }),
        )
      },
    }),
    messenger: createMessenger(),
  })

  setLocale = controller.setLocale as (lng: string) => Promise<void>

  ipcMain.handle(CHANNELS.getLocale, async () => (await controller.getStoredLocale()) ?? 'en')

  const initial = await controller.getInitialLocale()
  createWindow()
  createTray()
  await controller.setLocale(initial)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
