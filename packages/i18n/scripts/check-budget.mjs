import { readFileSync, readdirSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const BUDGETS = { namespace: 16 * 1024, shell: 12 * 1024, kernel: 12 * 1024 }
const failures = []

function gzipBytes(path) {
  return gzipSync(readFileSync(path)).byteLength
}

const catalogsDir = join(root, 'catalogs')
for (const lng of readdirSync(catalogsDir)) {
  const dir = join(catalogsDir, lng)
  if (!statSync(dir).isDirectory()) continue
  let shell = 0
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue
    const bytes = gzipBytes(join(dir, file))
    if (file === 'common.json' || file === 'errors.json') shell += bytes
    if (bytes > BUDGETS.namespace) failures.push(`${lng}/${file} ${bytes}B > ${BUDGETS.namespace}B`)
  }
  if (shell > BUDGETS.shell) failures.push(`${lng} shell ${shell}B > ${BUDGETS.shell}B`)
}

const distIndex = join(root, 'dist', 'index.js')
try {
  const bytes = gzipBytes(distIndex)
  if (bytes > BUDGETS.kernel) failures.push(`dist/index.js ${bytes}B > ${BUDGETS.kernel}B`)
} catch {
  failures.push('dist/index.js missing — run build first')
}

if (failures.length) {
  console.error('Budget failures:\n' + failures.map((f) => `  - ${f}`).join('\n'))
  process.exit(1)
}
console.log('Budgets OK')
