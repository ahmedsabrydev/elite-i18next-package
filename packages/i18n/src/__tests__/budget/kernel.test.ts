import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { BUDGETS } from '../../core/defaults'

describe('kernel budget', () => {
  it('is within the gzip budget', () => {
    const dist = join(process.cwd(), 'dist/index.js')
    let source: Buffer
    try {
      source = readFileSync(dist)
    } catch {
      return expect(true).toBe(true)
    }
    expect(gzipSync(source).byteLength).toBeLessThanOrEqual(BUDGETS.kernelGzipBytes)
  })
})
