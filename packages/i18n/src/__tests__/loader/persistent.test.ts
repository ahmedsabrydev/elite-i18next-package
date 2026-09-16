import { afterEach, describe, expect, it } from 'vitest'
import { PersistentStore } from '../../loader/persistent'

type FakeOptions = {
  blockOpen?: boolean
  errorOnOpen?: boolean
  errorOnGet?: boolean
  abortOnGet?: boolean
  errorOnSet?: boolean
  abortOnSet?: boolean
  errorOnClear?: boolean
  abortOnClear?: boolean
}

function createFakeIndexedDB(options: FakeOptions = {}) {
  const stores = new Set<string>()
  const data = new Map<string, unknown>()

  const request = () => ({
    onsuccess: null as (() => void) | null,
    onerror: null as (() => void) | null,
    onupgradeneeded: null as (() => void) | null,
    onblocked: null as (() => void) | null,
    result: undefined as unknown,
  })

  const makeDb = () => ({
    objectStoreNames: { contains: (name: string) => stores.has(name) },
    createObjectStore: (name: string) => {
      stores.add(name)
    },
    transaction: (_name: string, _mode: string) => {
      const tx = {
        oncomplete: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onabort: null as (() => void) | null,
        op: null as string | null,
        objectStore: () => ({
          get: (key: string) => {
            tx.op = 'get'
            const req = request()
            if (options.errorOnGet) {
              queueMicrotask(() => req.onerror?.())
            } else if (!options.abortOnGet) {
              queueMicrotask(() => {
                req.result = data.get(key)
                req.onsuccess?.()
              })
            }
            return req
          },
          put: (value: { id: string }) => {
            tx.op = 'put'
            data.set(value.id, value)
            return request()
          },
          clear: () => {
            tx.op = 'clear'
            data.clear()
            return request()
          },
        }),
      }
      queueMicrotask(() => {
        const op = tx.op
        if (op === 'get') {
          if (options.abortOnGet) tx.onabort?.()
          return
        }
        const failed = (op === 'put' && options.errorOnSet) || (op === 'clear' && options.errorOnClear)
        const aborted = (op === 'put' && options.abortOnSet) || (op === 'clear' && options.abortOnClear)
        if (failed) tx.onerror?.()
        else if (aborted) tx.onabort?.()
        else tx.oncomplete?.()
      })
      return tx
    },
  })

  return {
    open: () => {
      const req = request()
      queueMicrotask(() => {
        if (options.blockOpen) {
          req.onblocked?.()
          return
        }
        if (options.errorOnOpen) {
          req.onerror?.()
          return
        }
        req.result = makeDb()
        req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    },
  }
}

async function withFakeIndexedDB<T>(options: FakeOptions, run: () => Promise<T>): Promise<T> {
  const fake = createFakeIndexedDB(options)
  ;(globalThis as { indexedDB?: unknown }).indexedDB = fake as unknown as IDBFactory
  try {
    return await run()
  } finally {
    delete (globalThis as { indexedDB?: unknown }).indexedDB
  }
}

afterEach(() => {
  delete (globalThis as { indexedDB?: unknown }).indexedDB
})

describe('PersistentStore without indexedDB', () => {
  it('get resolves undefined', async () => {
    const store = new PersistentStore()
    await expect(store.get('en', 'common')).resolves.toBeUndefined()
  })

  it('set resolves without throwing', async () => {
    const store = new PersistentStore()
    await expect(store.set('en', 'common', { save: 'Save' })).resolves.toBeUndefined()
  })

  it('clear resolves without throwing', async () => {
    const store = new PersistentStore()
    await expect(store.clear()).resolves.toBeUndefined()
  })
})

describe('PersistentStore with indexedDB', () => {
  it('stores and retrieves resources', async () => {
    await withFakeIndexedDB({}, async () => {
      const store = new PersistentStore()
      await store.set('en', 'common', { save: 'Save' })
      await expect(store.get('en', 'common')).resolves.toEqual({ save: 'Save' })
    })
  })

  it('returns resources when the requested hash matches', async () => {
    await withFakeIndexedDB({}, async () => {
      const store = new PersistentStore()
      await store.set('en', 'common', { save: 'Save' }, 'v1')
      await expect(store.get('en', 'common', 'v1')).resolves.toEqual({ save: 'Save' })
    })
  })

  it('returns undefined when the requested hash is stale', async () => {
    await withFakeIndexedDB({}, async () => {
      const store = new PersistentStore()
      await store.set('en', 'common', { save: 'Save' }, 'v1')
      await expect(store.get('en', 'common', 'v2')).resolves.toBeUndefined()
    })
  })

  it('ignores the stored hash when no hash is requested', async () => {
    await withFakeIndexedDB({}, async () => {
      const store = new PersistentStore()
      await store.set('en', 'common', { save: 'Save' }, 'v1')
      await expect(store.get('en', 'common')).resolves.toEqual({ save: 'Save' })
    })
  })

  it('resolves undefined when open is blocked', async () => {
    await withFakeIndexedDB({ blockOpen: true }, async () => {
      const store = new PersistentStore()
      await expect(store.get('en', 'common')).resolves.toBeUndefined()
    })
  })

  it('resolves set when the transaction aborts', async () => {
    await withFakeIndexedDB({ abortOnSet: true }, async () => {
      const store = new PersistentStore()
      await expect(store.set('en', 'common', { save: 'Save' })).resolves.toBeUndefined()
    })
  })

  it('resolves clear when the transaction aborts', async () => {
    await withFakeIndexedDB({ abortOnClear: true }, async () => {
      const store = new PersistentStore()
      await expect(store.clear()).resolves.toBeUndefined()
    })
  })

  it('resolves undefined for get when open errors', async () => {
    await withFakeIndexedDB({ errorOnOpen: true }, async () => {
      const store = new PersistentStore()
      await expect(store.get('en', 'common')).resolves.toBeUndefined()
    })
  })

  it('resolves set when open errors', async () => {
    await withFakeIndexedDB({ errorOnOpen: true }, async () => {
      const store = new PersistentStore()
      await expect(store.set('en', 'common', { save: 'Save' })).resolves.toBeUndefined()
    })
  })

  it('resolves clear when open errors', async () => {
    await withFakeIndexedDB({ errorOnOpen: true }, async () => {
      const store = new PersistentStore()
      await expect(store.clear()).resolves.toBeUndefined()
    })
  })

  it('resolves undefined when the get request errors', async () => {
    await withFakeIndexedDB({ errorOnGet: true }, async () => {
      const store = new PersistentStore()
      await store.set('en', 'common', { save: 'Save' })
      await expect(store.get('en', 'common')).resolves.toBeUndefined()
    })
  })

  it('resolves undefined when the get transaction aborts', async () => {
    await withFakeIndexedDB({ abortOnGet: true }, async () => {
      const store = new PersistentStore()
      await expect(store.get('en', 'common')).resolves.toBeUndefined()
    })
  })

  it('resolves set when the transaction errors', async () => {
    await withFakeIndexedDB({ errorOnSet: true }, async () => {
      const store = new PersistentStore()
      await expect(store.set('en', 'common', { save: 'Save' })).resolves.toBeUndefined()
    })
  })

  it('resolves clear when the transaction errors', async () => {
    await withFakeIndexedDB({ errorOnClear: true }, async () => {
      const store = new PersistentStore()
      await expect(store.clear()).resolves.toBeUndefined()
    })
  })
})
