export interface NativeStorage {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
}

export interface NativeLocalization {
  getLocales(): ReadonlyArray<{ languageTag: string; languageCode?: string }>
}

export interface NativeRtl {
  allowRTL(allow: boolean): void
  forceRTL(force: boolean): void
}

export interface AppStatePort {
  addEventListener(type: 'change', listener: (state: string) => void): { remove(): void }
}
