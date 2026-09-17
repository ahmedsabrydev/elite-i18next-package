import { readFileSync, readdirSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BUDGETS, NS_ID_PATTERN, SUPPORTED_LOCALES } from '../../core/defaults'

const CATALOGS = join(import.meta.dirname, '../../../catalogs')
const SHARED_NAMESPACES = ['auth', 'common', 'datetime', 'errors', 'validation'] as const

function readNs(lng: string, ns: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(CATALOGS, lng, `${ns}.json`), 'utf8')) as Record<string, unknown>
}

function leafKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  )
}

describe('catalog protocol', () => {
  it('every shared namespace exists in every supported locale', () => {
    for (const lng of SUPPORTED_LOCALES) {
      const files = readdirSync(join(CATALOGS, lng)).filter((f) => f.endsWith('.json'))
      for (const ns of SHARED_NAMESPACES) {
        expect(files, `${lng}/${ns}.json missing`).toContain(`${ns}.json`)
      }
    }
  })

  it('namespace ids match the id pattern', () => {
    for (const lng of SUPPORTED_LOCALES) {
      for (const file of readdirSync(join(CATALOGS, lng))) {
        const ns = file.replace('.json', '')
        expect(NS_ID_PATTERN.test(ns), `bad ns id: ${ns}`).toBe(true)
      }
    }
  })

  it('ar is a superset of en for every shared namespace', () => {
    for (const ns of SHARED_NAMESPACES) {
      const en = leafKeys(readNs('en', ns))
      const ar = new Set(leafKeys(readNs('ar', ns)))
      for (const key of en) {
        expect(ar.has(key), `ar/${ns}.json missing en key "${key}"`).toBe(true)
      }
    }
  })

  it('ar plural forms cover the CLDR categories the language needs', () => {
    const ar = leafKeys(readNs('ar', 'datetime'))
    for (const category of ['zero', 'one', 'two', 'few', 'many', 'other']) {
      expect(
        ar.some((key) => key.endsWith(`_${category}`)),
        `ar/datetime.json missing a _${category} plural form`,
      ).toBe(true)
    }
  })

  it('no leaf key is an empty string', () => {
    for (const lng of SUPPORTED_LOCALES) {
      for (const ns of SHARED_NAMESPACES) {
        const json = readFileSync(join(CATALOGS, lng, `${ns}.json`), 'utf8')
        expect(json).not.toMatch(/:\s*""/)
      }
    }
  })

  it('shell catalogs fit the shell budget for every locale', () => {
    for (const lng of SUPPORTED_LOCALES) {
      const shell = SHARED_NAMESPACES.filter((ns) => ns === 'common' || ns === 'errors')
        .map((ns) => readFileSync(join(CATALOGS, lng, `${ns}.json`), 'utf8'))
        .join('')
      expect(gzipSync(shell).byteLength).toBeLessThanOrEqual(BUDGETS.shellCatalogsGzipBytes)
    }
  })

  it('no namespace exceeds the namespace budget', () => {
    for (const lng of SUPPORTED_LOCALES) {
      for (const ns of SHARED_NAMESPACES) {
        const bytes = gzipSync(readFileSync(join(CATALOGS, lng, `${ns}.json`))).byteLength
        expect(bytes, `${lng}/${ns}.json is ${bytes} bytes`).toBeLessThanOrEqual(BUDGETS.namespaceGzipBytes)
      }
    }
  })
})
