import type { NamespaceResources } from '../core/types'

const DB_NAME = 'faang-i18n'
const STORE_NAME = 'namespaces'
const DB_VERSION = 1

type CachedRecord = {
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
      } catch {
        resolve(undefined)
      }
    })
    return this.#dbPromise
  }

  async get(lng: string, ns: string): Promise<NamespaceResources | undefined> {
    const db = await this.#open()
    if (!db) return undefined
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(`${lng}:${ns}`)
        req.onsuccess = () => {
          const record = req.result as CachedRecord | undefined
          resolve(record?.resources)
        }
        req.onerror = () => resolve(undefined)
      } catch {
        resolve(undefined)
      }
    })
  }

  async set(lng: string, ns: string, resources: NamespaceResources, hash?: string): Promise<void> {
    const db = await this.#open()
    if (!db) return
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put({ id: `${lng}:${ns}`, lng, ns, hash, resources })
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      } catch {
        resolve()
      }
    })
  }

  async clear(): Promise<void> {
    const db = await this.#open()
    if (!db) return
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).clear()
        tx.oncomplete = () => resolve()
        tx.onerror = () => resolve()
      } catch {
        resolve()
      }
    })
  }
}
