import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

const dir = import.meta.dirname

function createWindow(): void {
  const window = new BrowserWindow({
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
  window.on('ready-to-show', () => window.show())
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(dir, '../renderer/index.html'))
}

void app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
