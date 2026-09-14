export class LruCache<K, V> {
  readonly #capacity: number
  readonly #map = new Map<K, V>()

  constructor(capacity: number) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError(`LruCache capacity must be an integer >= 1, received ${capacity}`)
    }
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
      const oldest = this.#map.keys().next()
      if (oldest.done) break
      this.#map.delete(oldest.value)
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
