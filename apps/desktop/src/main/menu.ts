export type Locale = 'en' | 'ar'

export type Translate = (key: string, options?: Record<string, unknown>) => string

export interface MenuTemplateItem {
  label?: string
  type?: 'separator'
  role?: string
  accelerator?: string
  click?: () => void
  submenu?: MenuTemplateItem[]
}

export interface AppMenuHandlers {
  onLocale(lng: Locale): void
  onAbout(): void
}

export function buildAppMenuTemplate(t: Translate, handlers: AppMenuHandlers): MenuTemplateItem[] {
  return [
    {
      label: t('desktop.menu.file'),
      submenu: [
        { label: t('desktop.menu.about'), click: handlers.onAbout },
        { type: 'separator' },
        { label: t('desktop.menu.quit'), role: 'quit' },
      ],
    },
    {
      label: t('desktop.menu.language'),
      submenu: [
        { label: t('language.en'), click: () => handlers.onLocale('en') },
        { label: t('language.ar'), click: () => handlers.onLocale('ar') },
      ],
    },
    { label: t('desktop.menu.view'), role: 'viewMenu' },
    { label: t('desktop.menu.help'), role: 'help' },
  ]
}

export function buildTrayMenuTemplate(
  t: Translate,
  handlers: { onShow(): void; onQuit(): void },
): MenuTemplateItem[] {
  return [
    { label: t('desktop.tray.show'), click: handlers.onShow },
    { type: 'separator' },
    { label: t('desktop.tray.quit'), click: handlers.onQuit },
  ]
}
