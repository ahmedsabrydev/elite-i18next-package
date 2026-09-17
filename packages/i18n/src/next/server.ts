import type { TFunction } from 'i18next'
import type { I18nRuntime, Namespace } from '../core/types'

export function createI18nServer(runtime: I18nRuntime): {
  getT: (lng: string, ns?: Namespace) => Promise<TFunction>
} {
  return {
    async getT(lng: string, ns: Namespace = runtime.config.defaultNS) {
      await runtime.loadNamespace(lng as never, ns)
      return runtime.getT(lng as never, ns)
    },
  }
}

export function defineRouteI18n(options: {
  runtime: I18nRuntime
  ns: Namespace[]
}): { ns: Namespace[]; load: (lng: string) => Promise<void> } {
  const { runtime, ns } = options
  return {
    ns,
    async load(lng: string) {
      await Promise.all(ns.map((namespace) => runtime.loadNamespace(lng as never, namespace)))
    },
  }
}
