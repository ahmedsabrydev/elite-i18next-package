# React Native i18n Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `@faang/i18n/native` from a throwing stub to a real v1.1 runtime and build a cross-platform Expo app (`apps/mobile`) that showcases the package on iOS and Android with en/ar + RTL, plus updated docs.

**Architecture:** The kernel `createI18n` is reused unchanged. A new `src/native/` module provides dependency-injection ports (storage, localization, RTL, AppState) and `createNativeI18n`, whose backend caches catalogs through injected storage (Approach A). The shared React adapter gains one optional `onLocaleChange` seam so the same `I18nProvider` drives both URL-based web and state-based native locale changes. `apps/mobile` wires the real Expo/React Native modules into those ports.

**Tech Stack:** TypeScript 7.0.2, pnpm + Turborepo, i18next 26.4.2, react-i18next 17.0.14, React 19, Expo SDK 57, React Native 0.86.3, React Navigation 7, Vitest, jest-expo, @testing-library/react-native.

## Global Constraints

- Node `>=22`; pnpm workspaces (`packages/*`, `apps/*`); Turborepo.
- TypeScript `7.0.2`; `tsconfig.base.json` options apply (strict, `verbatimModuleSyntax`, `noEmit`, `moduleResolution: Bundler`).
- Locales are exactly `en` + `ar`; `ar` is RTL. All user-facing strings exist in both locales; the package parity test enforces en⊆ar for every checked namespace.
- i18next `26.4.2`, react-i18next `17.0.14`; i18next-cli extraction config `i18next.config.ts` (input already includes `apps/*/src/**`; output `packages/i18n/catalogs/{{language}}/{{namespace}}.json`).
- Expo SDK 57 pinned native versions: `react@19.2.3`, `react-dom@19.2.3`, `react-native@0.86.3`, `react-native-web@~0.21.0`, `@react-native-async-storage/async-storage@2.2.0`, `expo-localization@~57.0.2`, `expo-splash-screen@~57.0.9`, `expo-status-bar@~57.0.1`, `react-native-screens@~4.26.0`, `react-native-safe-area-context@~5.7.0`, `jest-expo@~57.0.5`. Reconcile with `expo install --fix`.
- `apps/mobile` uses Expo CNG: `ios/` and `android/` are generated and **gitignored**.
- Approach A persistence: native caches inside `config.backend.load`; kernel unchanged; only the memory tier emits `ns.cache_hit`.
- Delete `packages/i18n/src/stubs/native.ts` (approved). `stubs/node.ts` and `stubs/electron.ts` remain.
- TDD: write the failing test, watch it fail, implement, watch it pass, commit.
- Conventional Commits; every commit ends with `Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>`.
- No comments unless required by a language; shell comments (in docs) go on their own line above the command; no emojis.

---

### Task 1: React adapter `onLocaleChange` DI seam

**Files:**
- Modify: `packages/i18n/src/react/context.ts`
- Modify: `packages/i18n/src/react/provider.tsx`
- Modify: `packages/i18n/src/react/hooks.ts`
- Test: `packages/i18n/src/__tests__/react/change-locale.test.tsx` (create)

**Interfaces:**
- Consumes: existing `I18nContextValue`, `I18nProviderProps`, `useLocale`.
- Produces: `I18nContextValue.onLocaleChange?: (lng: string) => void`; `I18nProviderProps.onLocaleChange?: (lng: string) => void`. `useLocale().changeLocale(lng)` calls `onLocaleChange` when present, otherwise keeps the URL path.

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/src/__tests__/react/change-locale.test.tsx`:

```tsx
import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../../core/create-i18n'
import { I18nProvider, useLocale } from '../../react'

function runtime() {
  return createI18n({
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    catalogs: { public: 'catalogs' },
    backend: { load: async () => ({}) },
  })
}

describe('useLocale().changeLocale DI seam', () => {
  it('prefers onLocaleChange over the URL path', () => {
    const onLocaleChange = vi.fn()
    const navigate = vi.fn()
    window.history.replaceState({}, '', '/en/settings')
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }) => (
        <I18nProvider
          runtime={runtime()}
          locale="en"
          navigate={navigate}
          onLocaleChange={onLocaleChange}
        >
          {children}
        </I18nProvider>
      ),
    })
    act(() => result.current.changeLocale('ar'))
    expect(onLocaleChange).toHaveBeenCalledWith('ar')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('falls back to the URL path when onLocaleChange is absent', () => {
    const navigate = vi.fn()
    window.history.replaceState({}, '', '/en/settings')
    const { result } = renderHook(() => useLocale(), {
      wrapper: ({ children }) => (
        <I18nProvider runtime={runtime()} locale="en" navigate={navigate}>
          {children}
        </I18nProvider>
      ),
    })
    act(() => result.current.changeLocale('ar'))
    expect(navigate).toHaveBeenCalledWith('/ar/settings')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @faang/i18n exec vitest run src/__tests__/react/change-locale.test.tsx`
Expected: FAIL — TypeScript/`onLocaleChange` prop does not exist.

- [ ] **Step 3: Add the seam to context, provider, and hooks**

In `packages/i18n/src/react/context.ts`, change `I18nContextValue`:

```ts
export type I18nContextValue = {
  runtime: I18nRuntime
  locale: string
  snapshot: LocaleSnapshot
  navigate?: (href: string) => void
  onLocaleChange?: (lng: string) => void
}
```

In `packages/i18n/src/react/provider.tsx`, add the prop and thread it through:

```tsx
export type I18nProviderProps = {
  runtime: I18nRuntime
  locale: string
  navigate?: (href: string) => void
  onLocaleChange?: (lng: string) => void
  children: ReactNode
}

export function I18nProvider({ runtime, locale, navigate, onLocaleChange, children }: I18nProviderProps) {
  const snapshot = useMemo<LocaleSnapshot>(
    () => ({
      lng: locale,
      dir: dirFor(locale),
      isRtl: dirFor(locale) === 'rtl',
      status: runtime.has(locale as never, runtime.config.defaultNS) ? 'hydrated' : 'loading-ns',
    }),
    [locale, runtime],
  )

  const value = useMemo(
    () => ({ runtime, locale, snapshot, navigate, onLocaleChange }),
    [runtime, locale, snapshot, navigate, onLocaleChange],
  )
```

In `packages/i18n/src/react/hooks.ts`, use the seam first:

```ts
export function useLocale(): LocaleSnapshot & {
  changeLocale: (lng: string) => void
} {
  const { snapshot, navigate, onLocaleChange, runtime } = useI18nContext()

  const changeLocale = useMemo(
    () => (lng: string) => {
      if (onLocaleChange) {
        onLocaleChange(lng)
        return
      }
      if (typeof window === 'undefined') return
      const { pathname, search, hash } = window.location
      const pattern = new RegExp(`^/(${runtime.config.locales.map(escapeRegExp).join('|')})(?=/|$)`)
      const next = pathname.replace(pattern, `/${lng}`)
      const href = `${next === pathname ? `/${lng}${pathname}` : next}${search}${hash}`
      if (navigate) navigate(href)
      else window.location.assign(href)
    },
    [navigate, onLocaleChange, runtime],
  )

  return { ...snapshot, changeLocale }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm --filter @faang/i18n exec vitest run src/__tests__/react/change-locale.test.tsx src/__tests__/react/provider.test.tsx`
Expected: PASS (both files, including the pre-existing provider tests).

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/src/react/context.ts packages/i18n/src/react/provider.tsx packages/i18n/src/react/hooks.ts packages/i18n/src/__tests__/react/change-locale.test.tsx
git commit -m "feat(react): add onLocaleChange DI seam to provider

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 2: `@faang/i18n/native` v1.1 runtime

**Files:**
- Create: `packages/i18n/src/native/ports.ts`
- Create: `packages/i18n/src/native/types.ts`
- Create: `packages/i18n/src/native/create-native-i18n.ts`
- Create: `packages/i18n/src/native/index.ts`
- Create: `packages/i18n/src/__tests__/native/create-native-i18n.test.ts`
- Modify: `packages/i18n/tsup.config.ts`
- Modify: `packages/i18n/package.json`
- Delete: `packages/i18n/src/stubs/native.ts` (approved)

**Interfaces:**
- Consumes: `createI18n`, `dirFor`, `resolveLocale`, `emit`, `DefaultLocale`, `I18nEvent`, `NamespaceResources`, `I18nRuntime`.
- Produces: `NativeStorage`, `NativeLocalization`, `NativeRtl`, `AppStatePort`; `CreateNativeI18nConfig`, `NativeController`, `NativeI18n`; `createNativeI18n(config): NativeI18n`. Public subpath stays `@faang/i18n/native`.

- [ ] **Step 1: Write the failing test**

Create `packages/i18n/src/__tests__/native/create-native-i18n.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createNativeI18n } from '../../native'
import type { AppStatePort, NativeStorage } from '../../native'

const catalogs = {
  'en:common': { hello: 'Hello' },
  'ar:common': { hello: 'مرحبا' },
}

function storage(): NativeStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    async getItem(key) {
      return map.get(key) ?? null
    },
    async setItem(key, value) {
      map.set(key, value)
    },
  }
}

function base(overrides: Record<string, unknown> = {}) {
  return createNativeI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    catalogs,
    storage: storage(),
    ...overrides,
  })
}

describe('createNativeI18n', () => {
  it('prefers the stored locale', async () => {
    const store = storage()
    await store.setItem('faang-i18n:locale', 'ar')
    const { controller } = base({ storage: store })
    await expect(controller.getInitialLocale()).resolves.toBe('ar')
  })

  it('falls back to the device locale', async () => {
    const { controller } = base({
      localization: { getLocales: () => [{ languageTag: 'ar-EG' }] },
    })
    await expect(controller.getInitialLocale()).resolves.toBe('ar')
  })

  it('falls back to the default locale when nothing is available', async () => {
    const { controller } = base()
    await expect(controller.getInitialLocale()).resolves.toBe('en')
  })

  it('ignores an unsupported stored locale', async () => {
    const store = storage()
    await store.setItem('faang-i18n:locale', 'fr')
    const { controller } = base({ storage: store })
    await expect(controller.getInitialLocale()).resolves.toBe('en')
  })

  it('caches loaded namespaces through storage', async () => {
    const store = storage()
    const first = base({ storage: store })
    await first.runtime.loadNamespace('en', 'common')
    expect(store.map.get('faang-i18n:ns:en:common')).toBe(JSON.stringify(catalogs['en:common']))

    const second = base({ storage: store })
    await second.runtime.loadNamespace('en', 'common')
    expect(second.runtime.getT('en', 'common')('hello')).toBe('Hello')
  })

  it('persists the locale, applies RTL, and emits locale.switch', async () => {
    const store = storage()
    const allowRTL = vi.fn()
    const forceRTL = vi.fn()
    const onEvent = vi.fn()
    const { controller } = base({
      storage: store,
      rtl: { allowRTL, forceRTL },
      onEvent,
    })
    await controller.setLocale('ar')
    expect(store.map.get('faang-i18n:locale')).toBe('ar')
    expect(allowRTL).toHaveBeenCalledWith(true)
    expect(forceRTL).toHaveBeenCalledWith(true)
    expect(onEvent).toHaveBeenCalledWith({ type: 'locale.switch', from: 'en', to: 'ar' })
  })

  it('notifies system locale changes through the AppState port', () => {
    let listener: ((state: string) => void) | undefined
    const appState: AppStatePort = {
      addEventListener: (_type, cb) => {
        listener = cb
        return { remove: vi.fn() }
      },
    }
    let tag = 'en-US'
    const localization = { getLocales: () => [{ languageTag: tag }] }
    const onSystem = vi.fn()
    const { controller } = base({ appState, localization })
    const off = controller.subscribeSystemLocale(onSystem)
    tag = 'ar-SA'
    listener?.('active')
    expect(onSystem).toHaveBeenCalledWith('ar')
    off()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @faang/i18n exec vitest run src/__tests__/native/create-native-i18n.test.ts`
Expected: FAIL — cannot resolve `../../native`.

- [ ] **Step 3: Create the ports**

Create `packages/i18n/src/native/ports.ts`:

```ts
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
```

- [ ] **Step 4: Create the types**

Create `packages/i18n/src/native/types.ts`:

```ts
import type {
  DefaultLocale,
  I18nEvent,
  I18nRuntime,
  Namespace,
  NamespaceResources,
} from '../core/types'
import type { AppStatePort, NativeLocalization, NativeRtl, NativeStorage } from './ports'

export interface CreateNativeI18nConfig<L extends string = DefaultLocale> {
  locales: readonly L[]
  defaultLocale: L
  fallbackLng?: L
  defaultNS?: Namespace
  catalogs: Record<string, NamespaceResources>
  storage: NativeStorage
  localization?: NativeLocalization
  rtl?: NativeRtl
  appState?: AppStatePort
  onEvent?: (event: I18nEvent) => void
  storageKey?: string
}

export interface NativeController<L extends string> {
  getStoredLocale(): Promise<L | undefined>
  getInitialLocale(): Promise<L>
  setLocale(lng: L): Promise<void>
  applyDirection(lng: L): void
  subscribeSystemLocale(cb: (lng: L) => void): () => void
}

export interface NativeI18n<L extends string> {
  runtime: I18nRuntime<L>
  controller: NativeController<L>
}
```

- [ ] **Step 5: Create the implementation**

Create `packages/i18n/src/native/create-native-i18n.ts`:

```ts
import { createI18n } from '../core/create-i18n'
import { dirFor, resolveLocale } from '../core/locale'
import { emit } from '../obs/events'
import type { DefaultLocale, NamespaceResources } from '../core/types'
import type { CreateNativeI18nConfig, NativeI18n } from './types'

const LOCALE_KEY = 'faang-i18n:locale'
const NS_CACHE_PREFIX = 'faang-i18n:ns'

export function createNativeI18n<L extends string = DefaultLocale>(
  config: CreateNativeI18nConfig<L>,
): NativeI18n<L> {
  const localeKey = config.storageKey ?? LOCALE_KEY

  const runtime = createI18n<L>({
    locales: config.locales,
    defaultLocale: config.defaultLocale,
    fallbackLng: config.fallbackLng,
    defaultNS: config.defaultNS,
    catalogs: { public: '@faang/i18n/catalogs' },
    onEvent: config.onEvent,
    backend: {
      load: async (lng, ns) => {
        const cacheKey = `${NS_CACHE_PREFIX}:${lng}:${ns}`
        const cached = await safeGet(config.storage, cacheKey)
        if (cached) {
          try {
            return JSON.parse(cached) as NamespaceResources
          } catch {
            // Corrupt cache entry; fall through to the bundled catalog.
          }
        }
        const source = config.catalogs[`${lng}:${ns}`]
        if (source) await safeSet(config.storage, cacheKey, JSON.stringify(source))
        return source
      },
    },
  })

  const isKnown = (lng: string): lng is L => config.locales.includes(lng as L)

  const fromDevice = (): L | undefined => {
    for (const entry of config.localization?.getLocales() ?? []) {
      const tag = entry.languageTag ?? entry.languageCode
      if (!tag) continue
      const resolved = resolveLocale(tag, config.locales, config.defaultLocale)
      if (isKnown(resolved)) return resolved
    }
    return undefined
  }

  const applyDirection = (lng: L): void => {
    if (!config.rtl) return
    config.rtl.allowRTL(true)
    config.rtl.forceRTL(dirFor(lng) === 'rtl')
  }

  const getStoredLocale = async (): Promise<L | undefined> => {
    const stored = await safeGet(config.storage, localeKey)
    return stored && isKnown(stored) ? stored : undefined
  }

  const getInitialLocale = async (): Promise<L> => {
    const stored = await getStoredLocale()
    if (stored) return stored
    return fromDevice() ?? config.defaultLocale
  }

  const setLocale = async (lng: L): Promise<void> => {
    const from = runtime.instance.resolvedLanguage ?? config.defaultLocale
    await safeSet(config.storage, localeKey, lng)
    applyDirection(lng)
    await runtime.loadNamespace(lng, runtime.config.defaultNS)
    emit(config.onEvent, { type: 'locale.switch', from, to: lng })
  }

  const subscribeSystemLocale = (cb: (lng: L) => void): (() => void) => {
    if (!config.appState) return () => {}
    const sub = config.appState.addEventListener('change', () => {
      const next = fromDevice()
      if (next) cb(next)
    })
    return () => sub.remove()
  }

  return {
    runtime,
    controller: {
      getStoredLocale,
      getInitialLocale,
      setLocale,
      applyDirection,
      subscribeSystemLocale,
    },
  }
}

async function safeGet(storage: { getItem(key: string): Promise<string | null> }, key: string) {
  try {
    return await storage.getItem(key)
  } catch {
    return null
  }
}

async function safeSet(
  storage: { setItem(key: string, value: string): Promise<void> },
  key: string,
  value: string,
): Promise<void> {
  try {
    await storage.setItem(key, value)
  } catch {
    // Persistence is best-effort; the in-memory cache still serves the namespace.
  }
}
```

- [ ] **Step 6: Create the public entry**

Create `packages/i18n/src/native/index.ts`:

```ts
export { createNativeI18n } from './create-native-i18n'
export type { CreateNativeI18nConfig, NativeController, NativeI18n } from './types'
export type { AppStatePort, NativeLocalization, NativeRtl, NativeStorage } from './ports'
```

- [ ] **Step 7: Repoint packaging and remove the stub**

In `packages/i18n/tsup.config.ts`, replace the `'stubs/native'` line with:

```ts
    'native/index': 'src/native/index.ts',
```

In `packages/i18n/package.json`, change the `./native` export:

```json
    "./native": {
      "types": "./dist/native/index.d.ts",
      "import": "./dist/native/index.js"
    },
```

Then remove the stub:

```bash
git rm packages/i18n/src/stubs/native.ts
```

- [ ] **Step 8: Run the tests and the package build**

Run: `pnpm --filter @faang/i18n exec vitest run src/__tests__/native/create-native-i18n.test.ts`
Expected: PASS (7 tests).

Run: `pnpm --filter @faang/i18n build`
Expected: build succeeds; `dist/native/index.js` and `dist/native/index.d.ts` exist.

- [ ] **Step 9: Commit**

```bash
git add packages/i18n/src/native packages/i18n/src/__tests__/native packages/i18n/tsup.config.ts packages/i18n/package.json
git add -u packages/i18n/src/stubs/native.ts
git commit -m "feat(native): implement v1.1 createNativeI18n runtime

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 3: `apps/mobile` Expo scaffold

**Files:**
- Create: `apps/mobile/package.json`
- Create: `apps/mobile/app.json`
- Create: `apps/mobile/babel.config.js`
- Create: `apps/mobile/metro.config.js`
- Create: `apps/mobile/jest.config.js`
- Create: `apps/mobile/jest.setup.ts`
- Create: `apps/mobile/tsconfig.json`
- Create: `apps/mobile/index.ts`
- Create: `apps/mobile/src/App.tsx`
- Create: `apps/mobile/src/__tests__/App.test.tsx`
- Create: `apps/mobile/README.md`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `@faang/i18n` (workspace).
- Produces: app package `@apps/mobile` with `start`, `web`, `typecheck`, `test`, `prebuild` scripts; `App` default export; working jest-expo + TypeScript.

- [ ] **Step 1: Create the app package.json**

Create `apps/mobile/package.json`:

```json
{
  "name": "@apps/mobile",
  "version": "0.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "web": "expo start --web --port 8081",
    "prebuild": "expo prebuild --no-install",
    "typecheck": "tsc --noEmit",
    "test": "jest"
  },
  "dependencies": {
    "@faang/i18n": "workspace:*",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-navigation/native": "^7.5.0",
    "@react-navigation/native-stack": "^7.20.0",
    "expo": "~57.0.26",
    "expo-localization": "~57.0.2",
    "expo-splash-screen": "~57.0.9",
    "expo-status-bar": "~57.0.1",
    "i18next": "26.4.2",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-i18next": "17.0.14",
    "react-native": "0.86.3",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0",
    "react-native-web": "~0.21.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.2",
    "@testing-library/react-native": "14.0.1",
    "@types/jest": "^29.5.14",
    "@types/react": "19.2.2",
    "babel-preset-expo": "~57.0.13",
    "jest": "^29.7.0",
    "jest-expo": "~57.0.5",
    "typescript": "7.0.2"
  }
}
```

- [ ] **Step 2: Create Expo, Metro, Babel, jest, and tsconfig files**

Create `apps/mobile/app.json`:

```json
{
  "expo": {
    "name": "i18n Showcase",
    "slug": "faang-i18n-showcase",
    "version": "0.1.0",
    "orientation": "portrait",
    "scheme": "faangi18n",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": { "supportsTablet": true, "bundleIdentifier": "com.faang.i18nshowcase" },
    "android": { "package": "com.faang.i18nshowcase" },
    "web": { "bundler": "metro", "output": "single" },
    "plugins": ["expo-localization"]
  }
}
```

Create `apps/mobile/babel.config.js`:

```js
module.exports = function (api) {
  api.cache(true)
  return { presets: ['babel-preset-expo'] }
}
```

Create `apps/mobile/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
config.resolver.disableHierarchicalLookup = true

module.exports = config
```

Create `apps/mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@faang/i18n))',
  ],
}
```

Create `apps/mobile/jest.setup.ts`:

```ts
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US', languageCode: 'en' }],
}))
```

Create `apps/mobile/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["react", "jest"],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src", "index.ts"]
}
```

- [ ] **Step 3: Create the entry, a minimal App, and a smoke test**

Create `apps/mobile/index.ts`:

```ts
import { registerRootComponent } from 'expo'
import App from './src/App'

registerRootComponent(App)
```

Create `apps/mobile/src/App.tsx`:

```tsx
import { StatusBar } from 'expo-status-bar'
import { Text, View } from 'react-native'

export default function App() {
  return (
    <View>
      <Text>i18n showcase</Text>
      <StatusBar style="auto" />
    </View>
  )
}
```

Create `apps/mobile/src/__tests__/App.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native'
import App from '../App'

describe('App', () => {
  it('renders the shell', () => {
    render(<App />)
    expect(screen.getByText('i18n showcase')).toBeTruthy()
  })
})
```

Create `apps/mobile/README.md`:

```markdown
# @apps/mobile

Cross-platform Expo app that showcases `@faang/i18n` on iOS and Android with en/ar and RTL.

## Commands

Install dependencies from the repo root, then build the package.

```bash
pnpm install
pnpm --filter @faang/i18n build
```

Run the app.

```bash
# Metro dev server for iOS/Android devices or simulators
pnpm --filter @apps/mobile start

# Browser preview used by the sandbox
pnpm --filter @apps/mobile web

# Tests and typecheck
pnpm --filter @apps/mobile test
pnpm --filter @apps/mobile typecheck
```

Generate native projects (kept out of git via Expo CNG).

```bash
pnpm --filter @apps/mobile prebuild
```
```

- [ ] **Step 4: Update .gitignore**

Append to `.gitignore`:

```
apps/mobile/.expo
apps/mobile/ios
apps/mobile/android
apps/mobile/web-build
apps/mobile/expo-env.d.ts
```

- [ ] **Step 5: Install dependencies**

Run: `pnpm install`
Expected: install succeeds; `@apps/mobile` is linked.

- [ ] **Step 6: Reconcile Expo-pinned versions**

Run: `pnpm --filter @apps/mobile exec expo install --fix`
Expected: SDK-correct versions for the native packages (no errors). If it reports no changes, continue.

- [ ] **Step 7: Run the smoke test and typecheck**

Run: `pnpm --filter @apps/mobile test`
Expected: 1 test passes.

Run: `pnpm --filter @faang/i18n build && pnpm --filter @apps/mobile typecheck`
Expected: no type errors.

- [ ] **Step 8: Commit**

```bash
git add apps/mobile .gitignore pnpm-lock.yaml
git commit -m "feat(mobile): scaffold Expo app with jest and typecheck

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 4: Mobile catalogs (en + ar) and parity

**Files:**
- Create: `packages/i18n/catalogs/en/home.json`
- Create: `packages/i18n/catalogs/en/settings.json`
- Create: `packages/i18n/catalogs/en/profile.json`
- Create: `packages/i18n/catalogs/ar/home.json`
- Create: `packages/i18n/catalogs/ar/settings.json`
- Create: `packages/i18n/catalogs/ar/profile.json`
- Modify: `packages/i18n/src/__tests__/catalogs/parity.test.ts`

**Interfaces:**
- Consumes: `NS_ID_PATTERN`, `BUDGETS`, `SUPPORTED_LOCALES`.
- Produces: namespaces `home`, `settings`, `profile` in both locales, covered by the parity/budget tests. `common` and `validation` are reused and unchanged.

- [ ] **Step 1: Extend the parity test and watch it fail**

In `packages/i18n/src/__tests__/catalogs/parity.test.ts`, change the namespace list (line 8):

```ts
const SHARED_NAMESPACES = [
  'auth',
  'common',
  'datetime',
  'errors',
  'validation',
  'home',
  'profile',
  'settings',
] as const
```

Run: `pnpm --filter @faang/i18n exec vitest run src/__tests__/catalogs/parity.test.ts`
Expected: FAIL — `en/home.json missing`.

- [ ] **Step 2: Create the English catalogs**

Create `packages/i18n/catalogs/en/home.json`:

```json
{
  "title": "Welcome to the i18n showcase",
  "subtitle": "This app demonstrates @faang/i18n on iOS and Android.",
  "greeting": "Hello, {{name}}",
  "items_one": "You have {{count}} item",
  "items_other": "You have {{count}} items"
}
```

Create `packages/i18n/catalogs/en/settings.json`:

```json
{
  "title": "Settings",
  "language": "Language",
  "followSystem": "Follow system language",
  "direction": "Direction",
  "restartNote": "Native right-to-left layout may require an app restart."
}
```

Create `packages/i18n/catalogs/en/profile.json`:

```json
{
  "title": "Profile",
  "name": "Name",
  "email": "Email",
  "save": "Save",
  "saved": "Profile saved"
}
```

- [ ] **Step 3: Create the Arabic catalogs**

Create `packages/i18n/catalogs/ar/home.json`:

```json
{
  "title": "مرحبًا بك في عرض i18n",
  "subtitle": "يوضح هذا التطبيق @faang/i18n على iOS وAndroid.",
  "greeting": "مرحبًا يا {{name}}",
  "items_one": "لديك عنصر واحد",
  "items_other": "لديك {{count}} عناصر"
}
```

Create `packages/i18n/catalogs/ar/settings.json`:

```json
{
  "title": "الإعدادات",
  "language": "اللغة",
  "followSystem": "اتّباع لغة النظام",
  "direction": "الاتجاه",
  "restartNote": "قد يتطلب التخطيط الأصلي من اليمين إلى اليسار إعادة تشغيل التطبيق."
}
```

Create `packages/i18n/catalogs/ar/profile.json`:

```json
{
  "title": "الملف الشخصي",
  "name": "الاسم",
  "email": "البريد الإلكتروني",
  "save": "حفظ",
  "saved": "تم حفظ الملف الشخصي"
}
```

- [ ] **Step 4: Run parity and budget checks**

Run: `pnpm --filter @faang/i18n exec vitest run src/__tests__/catalogs/parity.test.ts`
Expected: PASS.

Run: `pnpm --filter @faang/i18n build && pnpm --filter @faang/i18n budget`
Expected: `Budgets OK`.

- [ ] **Step 5: Commit**

```bash
git add packages/i18n/catalogs packages/i18n/src/__tests__/catalogs/parity.test.ts
git commit -m "feat(mobile): add home, settings, and profile catalogs

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 5: Mobile native adapter, provider, and screens

**Files:**
- Create: `apps/mobile/src/i18n/namespaces.ts`
- Create: `apps/mobile/src/i18n/catalogs.ts`
- Create: `apps/mobile/src/i18n/native-adapter.ts`
- Create: `apps/mobile/src/i18n/MobileI18nProvider.tsx`
- Create: `apps/mobile/src/components/Screen.tsx`
- Create: `apps/mobile/src/screens/Home.tsx`
- Create: `apps/mobile/src/screens/Settings.tsx`
- Create: `apps/mobile/src/screens/Profile.tsx`
- Create: `apps/mobile/src/test-utils/renderWithRuntime.tsx`
- Modify: `apps/mobile/src/__tests__/App.test.tsx`
- Create: `apps/mobile/src/__tests__/screens.test.tsx`
- Modify: `apps/mobile/src/App.tsx`

**Interfaces:**
- Consumes: `createNativeI18n` and types from `@faang/i18n/native`; `I18nProvider`, `useT`, `useLocale` from `@faang/i18n/react`; `createI18n` from `@faang/i18n`.
- Produces: `MobileI18nProvider` (props `{ children }`) and `useSystemMode(): { systemMode: boolean; setSystemMode: (v: boolean) => void }`; screens `Home`, `Settings`, `Profile`; `renderWithRuntime(ui, locale)` test helper.

- [ ] **Step 1: Write the failing provider and screen tests**

Replace `apps/mobile/src/__tests__/App.test.tsx` with the provider integration test:

```tsx
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react-native'
import { Text } from 'react-native'
import { useLocale, useT } from '@faang/i18n/react'
import { MobileI18nProvider } from '../i18n/MobileI18nProvider'

function Probe() {
  const t = useT('home')
  const { lng, dir, changeLocale } = useLocale()
  return (
    <>
      <Text testID="title">{t('title')}</Text>
      <Text testID="meta">{`${lng}:${dir}`}</Text>
      <Text testID="to-ar" onPress={() => changeLocale('ar')}>
        ar
      </Text>
    </>
  )
}

describe('MobileI18nProvider', () => {
  it('boots in en and switches to ar with RTL', async () => {
    render(
      <MobileI18nProvider>
        <Probe />
      </MobileI18nProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('title')).toHaveTextContent('Welcome to the i18n showcase'))
    expect(screen.getByTestId('meta')).toHaveTextContent('en:ltr')
    await act(async () => {
      fireEvent.press(screen.getByTestId('to-ar'))
    })
    await waitFor(() => expect(screen.getByTestId('meta')).toHaveTextContent('ar:rtl'))
    expect(screen.getByTestId('title')).toHaveTextContent('مرحبًا بك في عرض i18n')
  })
})
```

Create `apps/mobile/src/test-utils/renderWithRuntime.tsx`:

```tsx
import type { ReactElement } from 'react'
import { render } from '@testing-library/react-native'
import { createI18n } from '@faang/i18n'
import { I18nProvider } from '@faang/i18n/react'
import { catalogs } from '../i18n/catalogs'

export function makeRuntime() {
  return createI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    catalogs: { public: 'catalogs' },
    backend: { load: async (lng, ns) => catalogs[`${lng}:${ns}`] },
  })
}

export function renderWithRuntime(ui: ReactElement, locale = 'en') {
  const runtime = makeRuntime()
  return render(
    <I18nProvider runtime={runtime} locale={locale}>
      {ui}
    </I18nProvider>,
  )
}
```

Create `apps/mobile/src/__tests__/screens.test.tsx`:

```tsx
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { Home } from '../screens/Home'
import { Profile } from '../screens/Profile'
import { renderWithRuntime } from '../test-utils/renderWithRuntime'

describe('screens', () => {
  it('renders Home in Arabic', async () => {
    renderWithRuntime(<Home />, 'ar')
    await waitFor(() => expect(screen.getByText('مرحبًا بك في عرض i18n')).toBeTruthy())
  })

  it('shows a validation message when the Profile form is empty', () => {
    renderWithRuntime(<Profile />, 'en')
    fireEvent.press(screen.getByText('Save'))
    expect(screen.getByText('Name is required')).toBeTruthy()
  })
})
```

Note: `Profile` renders its own save control; the test relies on `useT` loading the `profile`/`validation` namespaces synchronously through the injected runtime.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm --filter @apps/mobile test`
Expected: FAIL — cannot resolve `../i18n/MobileI18nProvider`, `../screens/Home`, etc.

- [ ] **Step 3: Create namespaces, catalogs map, and the native adapter**

Create `apps/mobile/src/i18n/namespaces.ts`:

```ts
export const APP_NAMESPACES = ['common', 'errors', 'home', 'settings', 'profile', 'validation'] as const
```

Create `apps/mobile/src/i18n/catalogs.ts`:

```ts
import type { NamespaceResources } from '@faang/i18n'
import arCommon from '@faang/i18n/catalogs/ar/common.json'
import arErrors from '@faang/i18n/catalogs/ar/errors.json'
import arHome from '@faang/i18n/catalogs/ar/home.json'
import arProfile from '@faang/i18n/catalogs/ar/profile.json'
import arSettings from '@faang/i18n/catalogs/ar/settings.json'
import arValidation from '@faang/i18n/catalogs/ar/validation.json'
import enCommon from '@faang/i18n/catalogs/en/common.json'
import enErrors from '@faang/i18n/catalogs/en/errors.json'
import enHome from '@faang/i18n/catalogs/en/home.json'
import enProfile from '@faang/i18n/catalogs/en/profile.json'
import enSettings from '@faang/i18n/catalogs/en/settings.json'
import enValidation from '@faang/i18n/catalogs/en/validation.json'

export const catalogs: Record<string, NamespaceResources> = {
  'en:common': enCommon,
  'en:errors': enErrors,
  'en:home': enHome,
  'en:profile': enProfile,
  'en:settings': enSettings,
  'en:validation': enValidation,
  'ar:common': arCommon,
  'ar:errors': arErrors,
  'ar:home': arHome,
  'ar:profile': arProfile,
  'ar:settings': arSettings,
  'ar:validation': arValidation,
}
```

Create `apps/mobile/src/i18n/native-adapter.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import { AppState, I18nManager } from 'react-native'
import type {
  AppStatePort,
  NativeLocalization,
  NativeRtl,
  NativeStorage,
} from '@faang/i18n/native'

export const storage: NativeStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
}

export const localization: NativeLocalization = {
  getLocales: () =>
    Localization.getLocales().map((entry) => ({
      languageTag: entry.languageTag,
      languageCode: entry.languageCode ?? undefined,
    })),
}

export const rtl: NativeRtl = {
  allowRTL: (allow) => I18nManager.allowRTL(allow),
  forceRTL: (force) => I18nManager.forceRTL(force),
}

export const appState: AppStatePort = {
  addEventListener: (_type, listener) => {
    const sub = AppState.addEventListener('change', listener)
    return { remove: () => sub.remove() }
  },
}
```

- [ ] **Step 4: Create the provider**

Create `apps/mobile/src/i18n/MobileI18nProvider.tsx`:

```tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ActivityIndicator, View } from 'react-native'
import { I18nProvider } from '@faang/i18n/react'
import { createNativeI18n } from '@faang/i18n/native'
import { catalogs } from './catalogs'
import { APP_NAMESPACES } from './namespaces'
import { appState, localization, rtl, storage } from './native-adapter'

const { runtime, controller } = createNativeI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  fallbackLng: 'en',
  catalogs,
  storage,
  localization,
  rtl,
  appState,
})

type SystemMode = {
  systemMode: boolean
  setSystemMode: (on: boolean) => void
}

const SystemModeContext = createContext<SystemMode | null>(null)

export function useSystemMode(): SystemMode {
  const value = useContext(SystemModeContext)
  if (!value) throw new Error('useSystemMode must be used within a <MobileI18nProvider>')
  return value
}

async function loadAppNamespaces(lng: string) {
  await Promise.all(APP_NAMESPACES.map((ns) => runtime.loadNamespace(lng as 'en', ns)))
}

export function MobileI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string | null>(null)
  const [systemMode, setSystemMode] = useState(true)

  useEffect(() => {
    let active = true
    void controller.getInitialLocale().then(async (lng) => {
      controller.applyDirection(lng)
      await loadAppNamespaces(lng)
      if (active) setLocale(lng)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!systemMode) return
    return controller.subscribeSystemLocale((lng) => {
      void loadAppNamespaces(lng).then(() => setLocale(lng))
    })
  }, [systemMode])

  const onLocaleChange = useMemo(
    () => (lng: string) => {
      setSystemMode(false)
      void controller.setLocale(lng as 'en').then(() => loadAppNamespaces(lng))
      setLocale(lng)
    },
    [],
  )

  const systemModeValue = useMemo(
    () => ({ systemMode, setSystemMode }),
    [systemMode],
  )

  if (!locale) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <SystemModeContext.Provider value={systemModeValue}>
      <I18nProvider runtime={runtime} locale={locale} onLocaleChange={onLocaleChange}>
        {children}
      </I18nProvider>
    </SystemModeContext.Provider>
  )
}
```

- [ ] **Step 5: Create the components and screens**

Create `apps/mobile/src/components/Screen.tsx`:

```tsx
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet } from 'react-native'

export function Screen({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
}

const styles = StyleSheet.create({
  content: { padding: 24, gap: 12 },
})
```

Create `apps/mobile/src/screens/Home.tsx`:

```tsx
import { StyleSheet, Text } from 'react-native'
import { useLocale, useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'

export function Home() {
  const t = useT('home')
  const tc = useT('common')
  const { lng, dir } = useLocale()
  return (
    <Screen>
      <Text style={styles.title}>{t('title')}</Text>
      <Text>{t('subtitle')}</Text>
      <Text>{t('greeting', { name: tc('app.name') })}</Text>
      <Text>{t('items', { count: 3 })}</Text>
      <Text>{`${tc('language.label')}: ${lng} (${dir})`}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700' },
})
```

Create `apps/mobile/src/screens/Settings.tsx`:

```tsx
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native'
import { useLocale, useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'
import { useSystemMode } from '../i18n/MobileI18nProvider'

export function Settings() {
  const t = useT('settings')
  const tc = useT('common')
  const { changeLocale, lng, dir } = useLocale()
  const { systemMode, setSystemMode } = useSystemMode()
  return (
    <Screen>
      <Text style={styles.title}>{t('title')}</Text>
      <Text>{`${tc('language.label')}: ${lng} (${dir})`}</Text>
      <Pressable onPress={() => changeLocale('en')}>
        <Text>{tc('language.en')}</Text>
      </Pressable>
      <Pressable onPress={() => changeLocale('ar')}>
        <Text>{tc('language.ar')}</Text>
      </Pressable>
      <View style={styles.row}>
        <Text>{t('followSystem')}</Text>
        <Switch value={systemMode} onValueChange={setSystemMode} />
      </View>
      <Text>{t('restartNote')}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
```

Create `apps/mobile/src/screens/Profile.tsx`:

```tsx
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'
import { useT } from '@faang/i18n/react'
import { Screen } from '../components/Screen'

export function Profile() {
  const t = useT('profile')
  const tv = useT('validation')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onSave() {
    if (!name.trim()) {
      setSaved(false)
      setError(tv('required', { field: t('name') }))
      return
    }
    setError(null)
    setSaved(true)
  }

  return (
    <Screen>
      <Text style={styles.title}>{t('title')}</Text>
      <Text>{t('name')}</Text>
      <TextInput value={name} onChangeText={setName} accessibilityLabel={t('name')} />
      <Pressable onPress={onSave}>
        <Text>{t('save')}</Text>
      </Pressable>
      {error ? <Text>{error}</Text> : null}
      {saved ? <Text>{t('saved')}</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700' },
})
```

- [ ] **Step 6: Wire navigation in App and update the smoke test**

Replace `apps/mobile/src/App.tsx`:

```tsx
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useT } from '@faang/i18n/react'
import { MobileI18nProvider } from './i18n/MobileI18nProvider'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Profile } from './screens/Profile'

const Stack = createNativeStackNavigator()

function Navigator() {
  const tc = useT('common')
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} options={{ title: tc('nav.home') }} />
      <Stack.Screen name="Settings" component={Settings} options={{ title: tc('nav.settings') }} />
      <Stack.Screen name="Profile" component={Profile} options={{ title: tc('profile.title') }} />
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileI18nProvider>
        <NavigationContainer>
          <Navigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </MobileI18nProvider>
    </SafeAreaProvider>
  )
}
```

- [ ] **Step 7: Run the app tests and typecheck**

Run: `pnpm --filter @faang/i18n build && pnpm --filter @apps/mobile test`
Expected: provider test + screen tests pass.

Run: `pnpm --filter @apps/mobile typecheck`
Expected: no type errors.

- [ ] **Step 8: Verify extraction stays clean**

Run: `pnpm i18n:extract`
Expected: no unexpected new keys beyond the ones already authored (review `git status packages/i18n/catalogs`). If extras appear, add their Arabic translations and rerun.

Run: `pnpm i18n:extract --ci --dry-run && pnpm i18n:status && pnpm i18n:lint`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add apps/mobile packages/i18n/catalogs
git commit -m "feat(mobile): wire native i18n provider and screens

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 6: Docs sync for the native runtime

**Files:**
- Create: `apps/docs/content/docs/en/packages/native/create-native-i18n.mdx`
- Create: `apps/docs/content/docs/ar/packages/native/create-native-i18n.mdx`
- Create: `apps/docs/content/docs/en/packages/native/meta.json`
- Create: `apps/docs/content/docs/ar/packages/native/meta.json`
- Modify: `apps/docs/content/docs/en/packages/meta.json`
- Modify: `apps/docs/content/docs/ar/packages/meta.json`
- Modify: `apps/docs/content/docs/en/packages/stubs/index.mdx`
- Modify: `apps/docs/content/docs/ar/packages/stubs/index.mdx`
- Modify: `apps/docs/content/docs/en/appendix/api-index.mdx`
- Modify: `apps/docs/content/docs/ar/appendix/api-index.mdx`
- Modify: `apps/docs/content/docs/en/appendix/file-map.mdx`
- Modify: `apps/docs/content/docs/ar/appendix/file-map.mdx`

**Interfaces:**
- Consumes: the parity checker (`check-parity.mjs`), the file-map checker (`check-file-map.mjs`), FumaDocs `AutoTypeTable`.
- Produces: en+ar module page for `createNativeI18n`; stubs page describing only node/electron; corrected api-index and file-map. Parity becomes 47 pages per locale.

- [ ] **Step 1: Register the native section**

Change `apps/docs/content/docs/en/packages/meta.json`:

```json
{ "title": "Packages", "pages": ["kernel", "cache", "loader", "react", "next", "vite", "native", "store", "stubs", "tooling"] }
```

Change `apps/docs/content/docs/ar/packages/meta.json`:

```json
{ "title": "الحزم", "pages": ["kernel", "cache", "loader", "react", "next", "vite", "native", "store", "stubs", "tooling"] }
```

Create `apps/docs/content/docs/en/packages/native/meta.json`:

```json
{ "title": "Native", "pages": ["create-native-i18n"] }
```

Create `apps/docs/content/docs/ar/packages/native/meta.json`:

```json
{ "title": "الأصلي", "pages": ["create-native-i18n"] }
```

- [ ] **Step 2: Write the English native page**

Create `apps/docs/content/docs/en/packages/native/create-native-i18n.mdx`:

````mdx
---
title: createNativeI18n()
description: The React Native runtime — device-locale detection, AsyncStorage caching, and RTL via I18nManager.
---

## Purpose

`createNativeI18n` is the v1.1 React Native entry point. It reuses the kernel `createI18n`, injects the
device locale, caches namespaces through `AsyncStorage`, and applies text direction with
`I18nManager`. All platform APIs arrive as dependency-injection ports, so the runtime itself imports
no React Native module and stays unit-testable.

## When to Use It

Use it in an Expo or bare React Native app. The app supplies the ports from
`@react-native-async-storage/async-storage`, `expo-localization`, and `react-native`, then passes the
returned `runtime` to the shared [`I18nProvider`](/packages/react/provider).

## Usage

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import { AppState, I18nManager } from 'react-native'
import { createNativeI18n } from '@faang/i18n/native'

const { runtime, controller } = createNativeI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  catalogs: {
    'en:common': enCommon,
    'ar:common': arCommon,
  },
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
  },
  localization: {
    getLocales: () => Localization.getLocales().map((l) => ({ languageTag: l.languageTag })),
  },
  rtl: {
    allowRTL: (allow) => I18nManager.allowRTL(allow),
    forceRTL: (force) => I18nManager.forceRTL(force),
  },
  appState: {
    addEventListener: (_type, cb) => {
      const sub = AppState.addEventListener('change', cb)
      return { remove: () => sub.remove() }
    },
  },
})

const initial = await controller.getInitialLocale()
```

## API

### `createNativeI18n(config)`

<AutoTypeTable path="../../packages/i18n/src/native/types.ts" name="CreateNativeI18nConfig" />

Returns `NativeI18n`:

<AutoTypeTable path="../../packages/i18n/src/native/types.ts" name="NativeI18n" />

### Ports

<AutoTypeTable path="../../packages/i18n/src/native/ports.ts" name="NativeStorage" />

<AutoTypeTable path="../../packages/i18n/src/native/ports.ts" name="NativeLocalization" />

<AutoTypeTable path="../../packages/i18n/src/native/ports.ts" name="NativeRtl" />

<AutoTypeTable path="../../packages/i18n/src/native/ports.ts" name="AppStatePort" />

### Controller

<AutoTypeTable path="../../packages/i18n/src/native/types.ts" name="NativeController" />

## Parameters and Returns

- `locales` / `defaultLocale` / `fallbackLng` / `defaultNS` mirror the kernel config.
- `catalogs` is a map keyed `` `${lng}:${ns}` `` of bundled resources.
- `storage` is the only required port; `localization`, `rtl`, and `appState` are optional.
- `storageKey` overrides the locale key (default `faang-i18n:locale`).
- Returns `{ runtime, controller }`, where `runtime` is a full [`I18nRuntime`](/packages/kernel/types).

## Behavior and Edge Cases

- `getInitialLocale` prefers the stored locale, then the first device locale normalized through the
  kernel `resolveLocale`, then `defaultLocale`. Unsupported stored or device locales are ignored.
- `setLocale` persists the choice, calls `allowRTL(true)` and `forceRTL(dir === 'rtl')`, loads the
  default namespace, and emits `{ type: 'locale.switch', from, to }`.
- Caching (Approach A) happens inside `config.backend.load`: storage is read first, then the bundled
  catalog, then storage is written through. The kernel `PersistentStore` remains a no-op because
  `indexedDB` is absent on React Native.
- `subscribeSystemLocale` listens to `AppState` changes and reports the new device locale.

## Failure Modes

- A corrupt cache entry falls through to the bundled catalog.
- Storage or RTL port failures are swallowed; the in-memory cache still serves namespaces.

## Budget Notes

The native runtime ships on its own subpath and is not counted against the kernel gzip budget.

## Related

- [I18nProvider](/packages/react/provider)
- [Hooks](/packages/react/hooks)
- [Platform Stubs](/packages/stubs)
````

- [ ] **Step 3: Write the Arabic native page**

Create `apps/docs/content/docs/ar/packages/native/create-native-i18n.mdx` with the same structure and the
following translated prose (code blocks and tables are identical):

````mdx
---
title: createNativeI18n()
description: زمن تشغيل React Native — كشف لغة الجهاز، وتخزين مؤقت عبر AsyncStorage، واتجاه RTL بواسطة I18nManager.
---

## الغرض

`createNativeI18n` هي نقطة دخول React Native في الإصدار 1.1. تعيد استخدام نواة `createI18n`، وتحقن
لغة الجهاز، وتخزّن مساحات الأسماء مؤقتًا عبر `AsyncStorage`، وتطبّق اتجاه النص بواسطة `I18nManager`.
تصل كل واجهات المنصة كمنافذ حقن تبعية، لذا لا يستورد زمن التشغيل أي وحدة React Native ويبقى قابلًا
للاختبار وحده.

## متى تستخدمها

استخدمها في تطبيق Expo أو React Native. يوفّر التطبيق المنافذ من
`@react-native-async-storage/async-storage` و`expo-localization` و`react-native`، ثم يمرّر `runtime`
الناتج إلى [`I18nProvider`](/packages/react/provider) المشترك.

## الاستخدام

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Localization from 'expo-localization'
import { AppState, I18nManager } from 'react-native'
import { createNativeI18n } from '@faang/i18n/native'

const { runtime, controller } = createNativeI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  catalogs: {
    'en:common': enCommon,
    'ar:common': arCommon,
  },
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    setItem: (key, value) => AsyncStorage.setItem(key, value),
  },
})

const initial = await controller.getInitialLocale()
```

## واجهة البرمجة

### `createNativeI18n(config)`

<AutoTypeTable path="../../packages/i18n/src/native/types.ts" name="CreateNativeI18nConfig" />

تُعيد `NativeI18n`:

<AutoTypeTable path="../../packages/i18n/src/native/types.ts" name="NativeI18n" />

### المنافذ

<AutoTypeTable path="../../packages/i18n/src/native/ports.ts" name="NativeStorage" />

<AutoTypeTable path="../../packages/i18n/src/native/ports.ts" name="NativeLocalization" />

<AutoTypeTable path="../../packages/i18n/src/native/ports.ts" name="NativeRtl" />

<AutoTypeTable path="../../packages/i18n/src/native/ports.ts" name="AppStatePort" />

### المتحكم

<AutoTypeTable path="../../packages/i18n/src/native/types.ts" name="NativeController" />

## المعاملات والقيم المعادة

- `locales` و`defaultLocale` و`fallbackLng` و`defaultNS` تطابق إعداد النواة.
- `catalogs` خريطة مفتاحها `` `${lng}:${ns}` `` للموارد المضمّنة.
- `storage` هو المنفذ الوحيد المطلوب، و`localization` و`rtl` و`appState` اختيارية.
- `storageKey` يبدّل مفتاح اللغة (الافتراضي `faang-i18n:locale`).
- تُعيد `{ runtime, controller }` حيث `runtime` هو [`I18nRuntime`](/packages/kernel/types) كامل.

## السلوك والحالات الحدّية

- `getInitialLocale` تفضّل اللغة المخزّنة، ثم أول لغة جهاز تُطبَّع عبر `resolveLocale`، ثم
  `defaultLocale`. وتُتجاهل اللغات المخزّنة أو لغات الجهاز غير المدعومة.
- `setLocale` تحفظ الاختيار، وتستدعي `allowRTL(true)` و`forceRTL(dir === 'rtl')`، وتحمّل مساحة
  الأسماء الافتراضية، وتُصدر `{ type: 'locale.switch', from, to }`.
- التخزين المؤقت (النهج A) يحدث داخل `config.backend.load`: تُقرأ الذاكرة أولًا، ثم الكتالوج
  المضمّن، ثم تُكتب الذاكرة. وتبقى `PersistentStore` في النواة بلا أثر لأن `indexedDB` غائب في
  React Native.
- `subscribeSystemLocale` تراقب تغيّرات `AppState` وتبلّغ بلغة الجهاز الجديدة.

## أنماط الفشل

- مدخل ذاكرة تالف يتراجع إلى الكتالوج المضمّن.
- تُبتلع أخطاء منافذ التخزين أو الاتجاه؛ وتبقى الذاكرة الدافئة تخدم مساحات الأسماء.

## ملاحظات الميزانية

يُشحن زمن التشغيل الأصلي على مسار فرعي خاص ولا يُحسب ضمن ميزانية gzip للنواة.

## ذو صلة

- [I18nProvider](/packages/react/provider)
- [الخطافات](/packages/react/hooks)
- [هياكل المنصات](/packages/stubs)
````

- [ ] **Step 4: Update the stubs pages (both locales)**

In `apps/docs/content/docs/en/packages/stubs/index.mdx`, set the description and remove `native`:

```mdx
---
title: Platform Stubs
description: createNodeI18n and createElectronI18n — reserved entry points that throw until later milestones.
---
```

Replace the intro paragraph, usage block, and API table so only `node` and `electron` remain:

````mdx
## Purpose

`packages/i18n/src/stubs/` reserves two platform entry points for runtimes the release does not
implement: Node servers (`node`) and Electron (`electron`). Each exports a single factory that throws
a clear, milestone-tagged error.

## When to Use It

You should not use them. They exist so that:

- the subpaths `@faang/i18n/node` and `@faang/i18n/electron` resolve in the package exports map, and
- code that reaches for an unimplemented runtime fails loudly at the call site instead of importing
  `undefined` and crashing somewhere unrelated.

## Usage

```ts
import { createNodeI18n } from '@faang/i18n/node'

createNodeI18n()
// Error: @faang/i18n/node is not implemented in v1. Track the v1.2 milestone.
```

## API

| Export | Subpath | Message | Milestone |
|---|---|---|---|
| `createNodeI18n` | `@faang/i18n/node` | `@faang/i18n/node is not implemented in v1...` | v1.2 |
| `createElectronI18n` | `@faang/i18n/electron` | `@faang/i18n/electron is not implemented in v1...` | v1.3 |

Each function has return type `never`: it always throws.

## Failure Modes

They always throw `Error` with the message above. There is no silent no-op mode.

## Related

- [createNativeI18n()](/packages/native/create-native-i18n)
- [i18next-cli and Scripts](/packages/tooling/i18next-cli)
````

Mirror the same edits in `apps/docs/content/docs/ar/packages/stubs/index.mdx` with Arabic prose and
the `/packages/native/create-native-i18n` link.

- [ ] **Step 5: Update the API index (both locales)**

In `apps/docs/content/docs/en/appendix/api-index.mdx`, replace the native stub row:

```mdx
| `@faang/i18n/native` | `createNativeI18n` | function | [createNativeI18n()](/packages/native/create-native-i18n) |
```

and add port/type rows beneath it:

```mdx
| `@faang/i18n/native` | `NativeI18n`, `NativeController`, `CreateNativeI18nConfig` | type | [createNativeI18n()](/packages/native/create-native-i18n) |
| `@faang/i18n/native` | `NativeStorage`, `NativeLocalization`, `NativeRtl`, `AppStatePort` | type | [createNativeI18n()](/packages/native/create-native-i18n) |
```

Mirror these rows in `apps/docs/content/docs/ar/appendix/api-index.mdx`.

- [ ] **Step 6: Update the file map (both locales)**

In `apps/docs/content/docs/en/appendix/file-map.mdx`:
- Remove the `packages/i18n/src/stubs/native.ts` bullet.
- Add bullets for `packages/i18n/src/native/{index,types,ports,create-native-i18n}.ts` and
  `packages/i18n/src/__tests__/native/create-native-i18n.test.ts` and
  `packages/i18n/src/__tests__/react/change-locale.test.tsx`.
- Add a `## App: apps/mobile` section listing every committed mobile file (`package.json`, `app.json`,
  `babel.config.js`, `metro.config.js`, `jest.config.js`, `jest.setup.ts`, `tsconfig.json`, `index.ts`,
  `README.md`, and every file under `apps/mobile/src/**`).

Mirror the same additions in `apps/docs/content/docs/ar/appendix/file-map.mdx` with Arabic descriptions.

- [ ] **Step 7: Run parity, file-map, and the docs build**

Run: `pnpm --filter @apps/docs test`
Expected: `parity check passed (47 en / 47 ar pages)` and `file map covers all <N> tracked source files`.

Run: `pnpm --filter @apps/docs build`
Expected: build succeeds; RTL check passes.

- [ ] **Step 8: Commit**

```bash
git add apps/docs
git commit -m "docs(content): document the native runtime in en and ar

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 7: Prebuild, web preview, and full verification

**Files:**
- Modify (only if needed): `turbo.json`, `apps/docs/scripts/check-file-map.mjs`
- Generated (untracked): `apps/mobile/ios/**`, `apps/mobile/android/**`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: proof that native projects generate; a live Expo Web preview; a green `pnpm verify`.

- [ ] **Step 1: Generate the native projects**

Run: `pnpm --filter @apps/mobile exec expo prebuild --no-install`
Expected: `ios/` and `android/` directories are created and remain untracked (`git status --porcelain` shows nothing for them).

- [ ] **Step 2: Run the full verification**

Run: `pnpm verify`
Expected: typecheck, test, `i18n:extract --ci --dry-run`, `i18n:status`, `i18n:lint`, build, and budget all pass, including `@apps/mobile` and `@faang/i18n` native tests.

- [ ] **Step 3: Preview the app in the browser**

Use the `deploy-website` skill to start `pnpm --filter @apps/mobile web` (port 8081) and request a preview link.
Expected: the Expo Web bundle loads; Home renders in English and switches to Arabic with RTL from Settings.

- [ ] **Step 4: Commit any remaining tracked changes (if the checks required config edits)**

```bash
git add turbo.json apps/docs/scripts/check-file-map.mjs pnpm-lock.yaml
git commit -m "chore(mobile): finalize prebuild and verification wiring

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

If there are no tracked changes, skip this commit.

---

## Self-Review Notes

- Spec coverage: `/native` runtime (Task 2), `/react` seam (Task 1), `apps/mobile` scaffold + screens (Tasks 3–5), catalogs/parity (Task 4), docs (Task 6), DoD/preview/prebuild (Task 7).
- Type consistency: `createNativeI18n`, `CreateNativeI18nConfig`, `NativeController`, `NativeI18n`, and the four ports are defined in Task 2 and consumed verbatim in Tasks 3–6; `onLocaleChange` is defined in Task 1 and consumed in Task 5.
- New namespaces `home`, `settings`, `profile` are authored and parity-checked in Task 4, then consumed in Task 5.
