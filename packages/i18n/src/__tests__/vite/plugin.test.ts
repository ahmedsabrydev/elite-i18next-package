import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { i18nVitePlugin } from '../../vite/plugin'

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'i18n-'))
  for (const lng of ['en', 'ar']) {
    mkdirSync(join(dir, lng), { recursive: true })
    writeFileSync(join(dir, lng, 'common.json'), JSON.stringify({ hello: lng === 'en' ? 'Hello' : 'مرحبا' }))
  }
  return dir
}

describe('i18nVitePlugin', () => {
  it('has the expected plugin name', () => {
    expect(i18nVitePlugin({ catalogsDir: fixture(), locales: ['en', 'ar'] }).name).toBe('faang-i18n')
  })

  it('emits a manifest with hashes and byte sizes', async () => {
    const dir = fixture()
    const plugin = i18nVitePlugin({ catalogsDir: dir, locales: ['en', 'ar'] })
    const assets = await plugin.generateBundle()
    expect(assets).toBeDefined()
    const manifest = assets?.find((a) => a.fileName === 'i18n-manifest.json')
    expect(manifest).toBeDefined()
    const parsed = JSON.parse(manifest?.source ?? '{}')
    expect(parsed.locales.en.common).toEqual({ hash: expect.any(String), bytes: expect.any(Number) })
    expect(parsed.locales.ar.common).toEqual({ hash: expect.any(String), bytes: expect.any(Number) })
  })

  it('hands the manifest to the bundle context so it is written to disk', () => {
    const emitted: { type: string; fileName: string; source: string }[] = []
    const plugin = i18nVitePlugin({ catalogsDir: fixture(), locales: ['en', 'ar'] })
    plugin.generateBundle.call({
      emitFile: (asset: { type: string; fileName: string; source: string }) => emitted.push(asset),
    })
    const manifest = emitted.find((a) => a.fileName === 'i18n-manifest.json')
    expect(manifest).toBeDefined()
    expect(manifest?.type).toBe('asset')
  })
})
