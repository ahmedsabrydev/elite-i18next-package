import { LruCache } from '../cache/lru'
import { LOADER } from '../core/defaults'
import type { NamespaceResources } from '../core/types'

export class MemoryStore {
  readonly #cache = new LruCache<string, NamespaceResources>(LOADER.lruMaxEntries)

  key(lng: string, ns: string): string {
    return `${lng}:${ns}`
  }

  get(lng: string, ns: string): NamespaceResources | undefined {
    return this.#cache.get(this.key(lng, ns))
  }

  has(lng: string, ns: string): boolean {
    return this.#cache.has(this.key(lng, ns))
  }

  set(lng: string, ns: string, resources: NamespaceResources): void {
    this.#cache.set(this.key(lng, ns), resources)
  }

  entries(): number {
    return this.#cache.size()
  }
}
