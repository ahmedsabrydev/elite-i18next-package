import { describe, expect, it, vi } from 'vitest'
import { TieredBackend } from '../../loader/backend'
import { MemoryStore } from '../../loader/memory'
import { PersistentStore } from '../../loader/persistent'
import { InflightLoader } from '../../loader/inflight'
import type { ResolvedConfig } from '../../core/types'

const config: ResolvedConfig<'en' | 'ar'> = {
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  fallbackLng: 'en',
  defaultNS: 'common',
  catalogs: { public: 'catalogs' },
  numberingSystem: 'latn',
}

function makeBackend(overrides: Partial<ConstructorParameters<typeof TieredBackend>[0]> = {}) {
  const memory = new MemoryStore()
  return {
    memory,
    backend: new TieredBackend({
      config,
      memory,
      persistent: new PersistentStore(),
      inflight: new InflightLoader({ timeoutMs: 1000 }),
      loader: async (lng, ns) => ({ hello: `${lng}:${ns}` }),
      ...overrides,
    }),
  }
}

describe('TieredBackend', () => {
  it('loads through the loader on a cold cache', async () => {
    const { backend } = makeBackend()
    await expect(backend.load('en', 'common')).resolves.toEqual({ hello: 'en:common' })
  })

  it('serves from memory on the second call without hitting the loader', async () => {
    const loader = vi.fn(async (lng: string, ns: string) => ({ hello: `${lng}:${ns}` }))
    const { backend } = makeBackend({ loader })
    await backend.load('en', 'common')
    await backend.load('en', 'common')
    expect(loader).toHaveBeenCalledOnce()
  })

  it('has() reflects memory only', async () => {
    const { backend } = makeBackend()
    expect(backend.has('en', 'common')).toBe(false)
    await backend.load('en', 'common')
    expect(backend.has('en', 'common')).toBe(true)
  })

  it('prefetch warms memory without throwing', async () => {
    const { backend, memory } = makeBackend()
    backend.prefetch('ar', 'errors')
    await vi.waitFor(() => {
      expect(memory.has('ar', 'errors')).toBe(true)
    })
  })

  it('returns undefined instead of throwing when the loader fails', async () => {
    const { backend } = makeBackend({
      loader: async () => {
        throw new Error('network down')
      },
    })
    await expect(backend.load('en', 'common')).resolves.toBeUndefined()
  })

  it('emits ns.load with bytes on success', async () => {
    const onEvent = vi.fn()
    const memory = new MemoryStore()
    const backend = new TieredBackend({
      config: { ...config, onEvent },
      memory,
      persistent: new PersistentStore(),
      inflight: new InflightLoader({ timeoutMs: 1000 }),
      loader: async () => ({ hello: 'world' }),
    })
    await backend.load('en', 'common')
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'ns.load', lng: 'en', ns: 'common' }))
  })

  it('emits ns.timeout when the loader times out', async () => {
    const onEvent = vi.fn()
    const backend = new TieredBackend({
      config: { ...config, onEvent },
      memory: new MemoryStore(),
      persistent: new PersistentStore(),
      inflight: new InflightLoader({ timeoutMs: 10, retries: 0 }),
      loader: () => new Promise((resolve) => setTimeout(() => resolve({ late: true }), 100)),
    })
    await backend.load('en', 'common')
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'ns.timeout', ns: 'common' }))
  })

  it('tracks in-flight count', async () => {
    const { backend } = makeBackend({
      loader: () => new Promise((resolve) => setTimeout(() => resolve({}), 20)),
    })
    const p = backend.load('en', 'common')
    expect(backend.inflightCount()).toBeGreaterThan(0)
    await p
  })
})
