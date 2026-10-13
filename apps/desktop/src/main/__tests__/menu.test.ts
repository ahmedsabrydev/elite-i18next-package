import { describe, expect, it, vi } from 'vitest'
import { buildAppMenuTemplate, buildTrayMenuTemplate } from '../menu'
import type { Translate } from '../menu'

const t = ((key: string) => key) as unknown as Translate

describe('menu templates', () => {
  it('labels the application menu and wires the language handlers', () => {
    const onLocale = vi.fn()
    const onAbout = vi.fn()
    const template = buildAppMenuTemplate(t, { onLocale, onAbout })
    const labels = template.map((item) => item.label)
    expect(labels).toContain('desktop.menu.file')
    expect(labels).toContain('desktop.menu.language')

    const language = template.find((item) => item.label === 'desktop.menu.language')
    const arabic = language?.submenu?.find((item) => item.label === 'language.ar')
    arabic?.click?.()
    expect(onLocale).toHaveBeenCalledWith('ar')

    const file = template.find((item) => item.label === 'desktop.menu.file')
    file?.submenu?.[0]?.click?.()
    expect(onAbout).toHaveBeenCalled()
  })

  it('labels the tray menu and wires the handlers', () => {
    const onShow = vi.fn()
    const onQuit = vi.fn()
    const template = buildTrayMenuTemplate(t, { onShow, onQuit })
    expect(template[0]?.label).toBe('desktop.tray.show')
    template[0]?.click?.()
    expect(onShow).toHaveBeenCalled()
    template[2]?.click?.()
    expect(onQuit).toHaveBeenCalled()
  })
})
