import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

export type I18nVitePluginOptions = {
  catalogsDir: string
  locales: readonly string[]
}

export type I18nManifest = {
  version: 1
  locales: Record<string, Record<string, { hash: string; bytes: number }>>
}

function scanCatalogs(options: I18nVitePluginOptions): I18nManifest {
  const next: I18nManifest = { version: 1, locales: {} }
  for (const lng of options.locales) {
    const dir = join(options.catalogsDir, lng)
    const entries: Record<string, { hash: string; bytes: number }> = {}
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.json')) continue
      const full = join(dir, file)
      if (!statSync(full).isFile()) continue
      const source = readFileSync(full)
      entries[file.replace('.json', '')] = {
        hash: createHash('sha256').update(source).digest('hex').slice(0, 12),
        bytes: source.byteLength,
      }
    }
    next.locales[lng] = entries
  }
  return next
}

export function i18nVitePlugin(options: I18nVitePluginOptions) {
  let manifest: I18nManifest = { version: 1, locales: {} }

  return {
    name: 'faang-i18n',

    buildStart(): void {
      manifest = scanCatalogs(options)
    },

    generateBundle(this: unknown): { fileName: string; source: string }[] {
      if (Object.keys(manifest.locales).length === 0) {
        manifest = scanCatalogs(options)
      }
      const assets = [
        {
          fileName: 'i18n-manifest.json',
          source: JSON.stringify(manifest),
        },
      ]
      const context = this as
        | { emitFile?: (asset: { type: 'asset'; fileName: string; source: string }) => void }
        | undefined
      if (typeof context?.emitFile === 'function') {
        for (const asset of assets) {
          context.emitFile({ type: 'asset', fileName: asset.fileName, source: asset.source })
        }
      }
      return assets
    },
  }
}
