import type { NamespaceResources } from '../core/types'

const DB_NAME = 'faang-i18n'
const STORE_NAME = 'namespaces'
const DB_VERSION = 1

type CachedRecord = {
  id: string
  lng: string
  ns: string
  hash?: string
  resources: NamespaceResources
}

export class PersistentStore {
  #dbPromise: Promise<IDBDatabase | undefined> | undefined

  #open(): Promise<IDBDatabase | undefined> {
    if (this.#dbPromise) return this.#dbPromise
    this.#dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(undefined)
        return
      }
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = () => {
          const db = request.result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => resolve(undefined)
        request.onblocked = () => resolve(undefined)
      } catch {
        resolve(undefined)
      }
    })
    return this.#dbPromise
  }

  async get(
    lng: string,
    ns: string,
    hash?: string,
  ): Promise<NamespaceResources | undefined> {
    const db = await this.#open()
    if (!db) return undefined
    return new Promise((resolve) => {
      let settled = false
      const settle = (value: NamespaceResources | undefined) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(`${lng}:${ns}`)
        req.onsuccess = () => {
          const record = req.result as CachedRecord | undefined
          if (record && hash !== undefined && record.hash !== hash) {
            settle(undefined)
            return
          }
          settle(record?.resources)
        }
        req.onerror = () => settle(undefined)
        tx.onerror = () => settle(undefined)
        tx.onabort = () => settle(undefined)
      } catch {
        settle(undefined)
      }
    })
  }

  async set(lng: string, ns: string, resources: NamespaceResources, hash?: string): Promise<void> {
    const db = await this.#open()
    if (!db) return
    await new Promise<void>((resolve) => {
      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        resolve()
      }
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put({ id: `${lng}:${ns}`, lng, ns, hash, resources })
        tx.oncomplete = settle
        tx.onerror = settle
        tx.onabort = settle
      } catch {
        settle()
      }
    })
  }

  async clear(): Promise<void> {
    const db = await this.#open()
    if (!db) return
    await new Promise<void>((resolve) => {
      let settled = false
      const settle = () => {
        if (settled) return
        settled = true
        resolve()
      }
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).clear()
        tx.oncomplete = settle
        tx.onerror = settle
        tx.onabort = settle
      } catch {
        settle()
      }
    })
  }
}
