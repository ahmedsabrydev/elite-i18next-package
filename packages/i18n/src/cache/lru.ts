export class LruCache<K, V> {
  readonly #capacity: number
  readonly #map = new Map<K, V>()

  constructor(capacity: number) {
    this.#capacity = capacity
  }

  get(key: K): V | undefined {
    if (!this.#map.has(key)) return undefined
    const value = this.#map.get(key) as V
    this.#map.delete(key)
    this.#map.set(key, value)
    return value
  }

  has(key: K): boolean {
    return this.#map.has(key)
  }

  set(key: K, value: V): void {
    if (this.#map.has(key)) this.#map.delete(key)
    this.#map.set(key, value)
    while (this.#map.size > this.#capacity) {
      const oldest = this.#map.keys().next().value
      if (oldest === undefined) break
      this.#map.delete(oldest)
    }
  }

  delete(key: K): boolean {
    return this.#map.delete(key)
  }

  size(): number {
    return this.#map.size
  }

  keys(): K[] {
    return [...this.#map.keys()]
  }
}
