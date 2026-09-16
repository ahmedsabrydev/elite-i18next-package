import { LOADER } from '../core/defaults'

type InflightOptions = {
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
}

export class TimeoutError extends Error {
  constructor(key: string, ms: number) {
    super(`i18n load timeout for "${key}" after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

export class InflightLoader {
  readonly #inflight = new Map<string, Promise<unknown>>()
  readonly #timeoutMs: number
  readonly #retries: number
  readonly #retryDelayMs: number

  constructor(options: InflightOptions = {}) {
    this.#timeoutMs = options.timeoutMs ?? LOADER.timeoutMs
    this.#retries = options.retries ?? LOADER.retries
    this.#retryDelayMs = options.retryDelayMs ?? LOADER.retryDelayMs
  }

  run<T>(key: string, task: () => Promise<T>): Promise<T> {
    const existing = this.#inflight.get(key)
    if (existing) return existing as Promise<T>

    const promise = this.#withRetry(key, task).finally(() => {
      this.#inflight.delete(key)
    })
    this.#inflight.set(key, promise)
    return promise
  }

  size(): number {
    return this.#inflight.size
  }

  async #withRetry<T>(key: string, task: () => Promise<T>): Promise<T> {
    let lastError: unknown
    for (let attempt = 0; attempt <= this.#retries; attempt += 1) {
      try {
        return await this.#withTimeout(key, task)
      } catch (error) {
        lastError = error
        if (attempt < this.#retries) {
          await new Promise((resolve) => setTimeout(resolve, this.#retryDelayMs))
        }
      }
    }
    throw lastError
  }

  #withTimeout<T>(key: string, task: () => Promise<T>): Promise<T> {
    if (this.#timeoutMs <= 0) return task()
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError(key, this.#timeoutMs)), this.#timeoutMs)
    })
    return Promise.race([task(), timeout]).finally(() => {
      if (timer) clearTimeout(timer)
    }) as Promise<T>
  }
}
