import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const pkgRoot = join(import.meta.dirname, '../../..')
const distIndex = join(pkgRoot, 'dist/index.js')

describe('catalog transport via package subpath', () => {
  it('resolves the shared catalog by package specifier, as the Next app config does', () => {
    if (!existsSync(distIndex)) return

    const script = `
import { createI18n } from ${JSON.stringify(pathToFileURL(distIndex).href)};
const runtime = createI18n({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  catalogs: { public: 'catalogs', shared: '@faang/i18n/catalogs' },
});
await runtime.loadNamespace('en', 'common');
process.stdout.write(runtime.instance.t('app.tagline'));
`

    const output = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      cwd: pkgRoot,
    })

    expect(output).toBe('Ship faster')
  })
})
