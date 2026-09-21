import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const pkgRoot = join(import.meta.dirname, '../../..')
const distIndex = join(pkgRoot, 'dist/index.js')
const catalogsDir = join(pkgRoot, 'catalogs')

function runKernel(body: string): string {
  const script = `
import { createI18n } from ${JSON.stringify(pathToFileURL(distIndex).href)};
const runtime = createI18n({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  catalogs: { public: ${JSON.stringify(catalogsDir)}, shared: ${JSON.stringify(catalogsDir)} },
});
${body}
`
  return execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
  })
}

describe('namespaceChunkLoader (node esm transport)', () => {
  it('loads catalog JSON with no explicit backend loader', () => {
    if (!existsSync(distIndex)) return

    const output = runKernel(`
await runtime.loadNamespace('en', 'common');
process.stdout.write(runtime.instance.t('app.name'));
`)

    expect(output).toBe('Acme')
  })

  it('resolves the requested locale, not the fallback', () => {
    if (!existsSync(distIndex)) return

    const output = runKernel(`
await runtime.loadNamespace('ar', 'common');
process.stdout.write(runtime.getT('ar', 'common')('app.name'));
`)

    expect(output).toBe('أكمي')
  })

  it('returns the key when a namespace cannot be resolved', () => {
    if (!existsSync(distIndex)) return

    const output = runKernel(`
await runtime.loadNamespace('en', 'missing');
process.stdout.write(runtime.instance.t('nope'));
`)

    expect(output).toBe('nope')
  })
})
