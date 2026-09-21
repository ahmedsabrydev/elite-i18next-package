import type { DefaultLocale, NamespaceResources, ResolvedConfig } from '../core/types'
import { emit } from '../obs/events'
import { InflightLoader, TimeoutError } from './inflight'
import { MemoryStore } from './memory'
import { PersistentStore } from './persistent'

export type NamespaceLoader = (
  lng: string,
  ns: string,
) => Promise<NamespaceResources | undefined>

export type TieredBackendOptions<L extends string = DefaultLocale> = {
  config: ResolvedConfig<L>
  memory?: MemoryStore
  persistent?: PersistentStore
  inflight?: InflightLoader
  loader?: NamespaceLoader
  fetcher?: typeof fetch
}

export function namespaceChunkLoader<L extends string = DefaultLocale>(
  config: ResolvedConfig<L>,
): NamespaceLoader {
  const { public: publicPath, shared } = config.catalogs
  return async (lng, ns) => {
    const candidates = shared
      ? [`${shared}/${lng}/${ns}.json`, `${publicPath}/${lng}/${ns}.json`]
      : [`${publicPath}/${lng}/${ns}.json`]
    for (const specifier of candidates) {
      const loaded = await importJson(specifier)
      if (loaded) return loaded
    }
    if (!config.publicPath) return undefined
    try {
      const response = await fetch(`${config.publicPath}/${lng}/${ns}.json`)
      if (!response.ok) return undefined
      return (await response.json()) as NamespaceResources
    } catch {
      return undefined
    }
  }
}

async function importJson(
  specifier: string,
): Promise<NamespaceResources | undefined> {
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const nodeModule = (await import('node:module')) as unknown as {
        createRequire: (path: string | URL) => ((id: string) => unknown) & {
          resolve: (id: string) => string
        }
      }
      const require = nodeModule.createRequire(import.meta.url)
      return require(
        /* turbopackIgnore: true */ require.resolve(specifier),
      ) as NamespaceResources
    } catch {
      // Not resolvable as a Node module; fall through to a dynamic import.
    }
  }
  try {
    const mod = (await import(
      /* @vite-ignore */ /* webpackIgnore: true */ /* turbopackIgnore: true */
      specifier
    )) as {
      default?: NamespaceResources
    } & NamespaceResources
    return (mod.default ?? mod) as NamespaceResources
  } catch {
    return undefined
  }
}

export class TieredBackend<L extends string = DefaultLocale> {
  readonly #config: ResolvedConfig<L>
  readonly #memory: MemoryStore
  readonly #persistent: PersistentStore
  readonly #inflight: InflightLoader
  readonly #loader: NamespaceLoader

  constructor(options: TieredBackendOptions<L>) {
    this.#config = options.config
    this.#memory = options.memory ?? new MemoryStore()
    this.#persistent = options.persistent ?? new PersistentStore()
    this.#inflight = options.inflight ?? new InflightLoader()
    this.#loader = options.loader ?? namespaceChunkLoader(options.config)
  }

  has(lng: string, ns: string): boolean {
    return this.#memory.has(lng, ns)
  }

  inflightCount(): number {
    return this.#inflight.size()
  }

  async load(lng: string, ns: string): Promise<NamespaceResources | undefined> {
    const cached = this.#memory.get(lng, ns)
    if (cached) {
      emit(this.#config.onEvent, { type: 'ns.cache_hit', lng, ns })
      return cached
    }

    const startedAt = Date.now()
    const key = `${lng}:${ns}`
    try {
      const resources = await this.#inflight.run(
        key,
        async () => {
          const fromIdb = await this.#persistent.get(lng, ns)
          if (fromIdb) return fromIdb
          const loaded = await this.#loader(lng, ns)
          if (loaded) await this.#persistent.set(lng, ns, loaded)
          return loaded
        },
        { lng, ns },
      )
      if (!resources) return undefined
      this.#memory.set(lng, ns, resources)
      let bytes: number | undefined
      try {
        bytes = JSON.stringify(resources).length
      } catch {
        bytes = undefined
      }
      emit(this.#config.onEvent, {
        type: 'ns.load',
        lng,
        ns,
        ms: Date.now() - startedAt,
        bytes,
      })
      return resources
    } catch (error) {
      if (error instanceof TimeoutError) {
        emit(this.#config.onEvent, {
          type: 'ns.timeout',
          lng: error.lng ?? lng,
          ns: error.ns ?? ns,
          ms: error.ms,
        })
      }
      return undefined
    }
  }

  prefetch(lng: string, ns: string): void {
    void this.load(lng, ns)
  }
}
