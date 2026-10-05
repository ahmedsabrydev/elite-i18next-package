# React Native i18n Showcase — Design

- **Status:** Approved (pending written-spec review)
- **Date:** 2026-10-05
- **Topic:** `@faang/i18n/native` v1.1 runtime + `apps/mobile` cross-platform Expo app + docs sync
- **Branch:** `260914-feat-headless-i18n-v1`

## Summary

Build a single cross-platform React Native app at `apps/mobile` (Expo, CNG) that showcases the
`@faang/i18n` package on iOS and Android, and promote `@faang/i18n/native` from a throwing stub to a
real v1.1 runtime. The app uses the shared React adapter (`@faang/i18n/react`) for all UI and injects
a thin native platform adapter (dependency injection) for device-locale detection, AsyncStorage
persistence, and RTL via `I18nManager` + `AppState`. Documentation is updated in the same effort so
the docs never describe `native` as a stub.

## Decisions (from brainstorming)

| # | Decision |
|---|---|
| Q1 | "native-os" reinterpreted: a focused bilingual i18n showcase, not an OS launcher |
| Q2 | One cross-platform app `apps/mobile` with real `ios/` + `android/` projects (standard RN layout) |
| Q3 | Both surfaces: UI via `/react`; native integration via `/native` |
| Q4 | Toolchain: Expo + `expo prebuild` (Expo Web preview works in this sandbox) |
| Q5 | Content: Home → Settings → Profile |
| Q6 | Full v1.1 native runtime lives in the package |
| Q7 | DoD: preview + tests; `ios/`+`android/` generated but gitignored (Expo CNG) |
| Q8 | Update docs in the same effort |
| — | Persistence wiring: **Approach A** |

## Goals

- `@faang/i18n/native` v1.1: real `createNativeI18n` reusing the kernel `createI18n`, with
  device-locale detection, AsyncStorage-backed namespace caching, and an RTL/system-locale bridge.
- `apps/mobile`: Expo app, TypeScript, React Navigation (Home/Settings/Profile), full en/ar with RTL.
- Shared React adapter gains one small DI seam (`onLocaleChange`) so the same provider drives web
  (URL) and native (state) locale changes.
- All tests, typecheck, i18n extraction, parity, and budgets stay green; `pnpm verify` passes.
- Docs describe the real native runtime (en + ar).

## Non-Goals

- No `.ipa`/`.apk` build in this sandbox (no Xcode, no Android SDK/JDK/emulator).
- No implementation of `@faang/i18n/node` or `@faang/i18n/electron` (still stubs).
- No changes to existing web apps (`next-web`, `vite-web`) or the docs rendering engine.
- No new generic state-management store; the locked kernel decision ("`createI18n` has no `store`
  field") is preserved.

## Architecture

```
apps/mobile  (Expo, CNG)
  ├─ src/i18n/native-adapter.ts      DI: expo-localization, AsyncStorage, I18nManager, AppState
  ├─ src/i18n/MobileI18nProvider.tsx shared I18nProvider (@faang/i18n/react) + onLocaleChange
  ├─ src/screens/{Home,Settings,Profile}.tsx   useT / useLocale hooks only
  └─ src/i18n/controller.ts          initial-locale gate (splash) → provider

@faang/i18n/native  (new)
  ├─ ports.ts            NativeStorage | NativeLocalization | NativeRtl | AppStatePort
  ├─ create-native-i18n.ts  reuses core createI18n; backend caches via AsyncStorage (Approach A)
  └─ types.ts            CreateNativeI18nConfig, NativeI18n, NativeController

@faang/i18n/react  (tiny change)
  └─ onLocaleChange seam in I18nProvider + useLocale().changeLocale
```

Data flow: app boots → controller resolves initial locale (stored → device → default) behind a
splash → mounts `MobileI18nProvider` → shared hooks translate. `changeLocale` calls the injected
`onLocaleChange`, which updates React state, persists the locale, and applies RTL.

## 1. Package — `@faang/i18n/native`

### Public surface

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

export interface CreateNativeI18nConfig<L extends string = DefaultLocale> {
  locales: readonly L[]
  defaultLocale: L
  fallbackLng?: L
  defaultNS?: Namespace
  catalogs: Record<string, NamespaceResources> // keyed `${lng}:${ns}`
  storage: NativeStorage
  localization?: NativeLocalization
  rtl?: NativeRtl
  appState?: AppStatePort
  onEvent?: (event: I18nEvent) => void
  storageKey?: string // default 'faang-i18n:locale'
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

export function createNativeI18n<L extends string = DefaultLocale>(
  config: CreateNativeI18nConfig<L>,
): NativeI18n<L>
```

### Behavior

- `createNativeI18n` calls kernel `createI18n({ locales, defaultLocale, fallbackLng, defaultNS,
  catalogs: { public: '@faang/i18n/catalogs' }, onEvent, backend: { load } })`.
- **Persistence (Approach A):** `load(lng, ns)` reads `storage` under `${APP_NS_CACHE}:${lng}:${ns}`,
  falls back to `config.catalogs['${lng}:${ns}']`, and writes through to storage. The kernel's
  `PersistentStore` stays a no-op (no `indexedDB`), so the kernel is untouched and only the memory
  tier's `ns.cache_hit` fires.
- `getInitialLocale`: stored locale (validated against `locales`) → first `localization.getLocales()`
  language normalized via `resolveLocale(..., locales, defaultLocale)` → `defaultLocale`.
- `setLocale(lng)`: persist to `storage`, `rtl.allowRTL(true)` once, `rtl.forceRTL(dir === 'rtl')`,
  and emit `{ type: 'locale.switch', from, to }` through `onEvent`.
- `subscribeSystemLocale(cb)`: when `appState` is present, re-read device locale on `'change'` and
  invoke `cb` when it differs.
- Ports are optional except `storage`; the module imports **no** `react-native`, `expo-*`, or
  AsyncStorage, so it is testable in Node/vitest with fakes.
- RTL caveat (documented): `I18nManager.forceRTL` takes effect for native layout only after an app
  restart; the app also drives logical `start`/`end` styles from locale state so the switch is
  visible immediately.

### Packaging

- New source under `packages/i18n/src/native/`; `tsup.config.ts` entry `'native/index'`.
- `package.json` export `./native` re-points to `dist/native/index.{js,d.ts}`.
- `createNativeI18n` remains absent from the root entry (import the subpath explicitly), matching the
  existing convention.
- `stubs/native.ts` is removed; `stubs/node.ts` and `stubs/electron.ts` remain.

## 2. Package — `@faang/i18n/react` seam

- `I18nProviderProps` gains optional `onLocaleChange?: (lng: string) => void`.
- `useLocale().changeLocale(lng)` prefers `onLocaleChange` when provided; otherwise keeps the current
  `window.location` behavior. Web apps pass nothing → no behavior change.

## 3. App — `apps/mobile`

### Project

- Expo (latest stable SDK), TypeScript, `"type": "module"`, package name `@apps/mobile`.
- CNG: `ios/` and `android/` are generated by `expo prebuild` and **gitignored**.
- `metro.config.js` configured for the pnpm monorepo (`watchFolders` to repo root, `nodeModulesPaths`
  to app + root `node_modules`); package exports enabled so Metro resolves `@faang/i18n`.
- Depends on `@faang/i18n` (workspace), `@react-navigation/native`, `@react-navigation/native-stack`,
  `react-native-screens`, `react-native-safe-area-context`, `@react-native-async-storage/async-storage`,
  `expo-localization`, `expo-splash-screen`, `react-native-web`, `react-dom`.
- Scripts: `start` (`expo start`), `web` (`expo start --web --port 8081`), `typecheck` (`tsc --noEmit`),
  `test` (`jest`), `prebuild` (`expo prebuild --no-install`). Turbo picks up `typecheck`/`test`.

### Structure

```
apps/mobile/
  app.json | app.config.ts        Expo config (name, slug, plugins, web bundler metro)
  metro.config.js                 monorepo resolver
  babel.config.js                 babel-preset-expo
  tsconfig.json
  jest.config.js | jest.setup.ts  jest-expo preset
  src/
    App.tsx                       nav container + provider
    i18n/native-adapter.ts        real ports from Expo/RN modules
    i18n/controller.ts            initial-locale resolution + system-mode handling
    i18n/MobileI18nProvider.tsx   wraps shared I18nProvider with onLocaleChange
    screens/Home.tsx
    screens/Settings.tsx
    screens/Profile.tsx
    components/{Screen,Row,Button}.tsx
    theme.ts
```

### Screens

- **Home**: shell namespaces (`common`, `errors`); demonstrates typed keys, interpolation, and plural
  forms; shows current `lng`/`dir`.
- **Settings**: switch en/ar; a "Follow system" mode wired to `subscribeSystemLocale`; shows RTL state;
  notes that native RTL layout can require a restart.
- **Profile**: lazy-loads the `profile` namespace via `runtime.loadNamespace`; a small form whose error
  messages come from the `validation` namespace.

### Styling & RTL

- `StyleSheet` with logical `start`/`end`; visible direction taken from `useLocale().dir`, not only
  `I18nManager.isRTL`, so switching is immediate and works on web.

## 4. i18n data

- Namespaces: shared `common`, `errors`; lazy `home`, `settings`, `profile` (+ reuse `validation`).
- App strings live in `apps/mobile/src`; `pnpm i18n:extract` writes
  `packages/i18n/catalogs/{en,ar}/{home,settings,profile}.json` and updates existing ones.
- Full Arabic translations for every new key; the package catalog parity test enforces en/ar key
  equality. New lazy namespaces must stay within the existing gzip budget.
- `i18next.config.ts` already includes `apps/*/src/**` in extract input; no config change needed, but
  `apps/mobile/src` must be inside that glob (it is).

## 5. Testing

- **Package (vitest):** `src/__tests__/native/*.test.ts` with fake ports — initial-locale precedence
  (stored → device → default), invalid stored/device locale fallback, persistence write-through,
  `allowRTL`/`forceRTL` calls, `locale.switch` event, and `subscribeSystemLocale` firing on AppState
  change. No `react-native` import.
- **Package (vitest, jsdom):** `/react` test that `changeLocale` calls `onLocaleChange` when provided
  and falls back to the URL path otherwise.
- **App (jest-expo + @testing-library/react-native):** Home renders translated strings; switching
  locale in Settings updates rendered text and reported `dir`; Profile shows `validation` messages on
  submit.
- Parity/budget scripts remain green.

## 6. Docs

- New `packages/native/create-native-i18n.mdx` (en + ar) following the package content rubric, with
  `AutoTypeTable` for `CreateNativeI18nConfig`, the port types, and `NativeController`.
- Amend `packages/stubs/index.mdx` (en + ar): remove `native`, keep `node`/`electron`, update the API
  table and prose.
- Update `appendix/api-index.mdx` and `appendix/file-map.mdx` (en + ar) for the new files.
- Parity count goes 46 → 47 pages per locale; `check-file-map.mjs` must list all new tracked files;
  build and RTL checks stay green.
- If a `packages/native/meta.json` section is added, include both locales.

## 7. Build, verification, DoD

- `pnpm verify` (root) passes: typecheck, test, `i18n:extract --ci --dry-run`, `i18n:status`,
  `i18n:lint`, build, budget — now including `@apps/mobile` typecheck/test and `@faang/i18n` native
  tests.
- `expo prebuild --no-install` generates `ios/` and `android/` (proves native config); both remain
  untracked.
- Live **Expo Web** preview via the `deploy-website` skill (port 8081).
- Docs build green with parity 47×2.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Expo/RN pins a different React than the repo (19.3.0) | pnpm isolates per package; `/react` peer range `^19.0.0` accepts RN's React. Verify typecheck. |
| Metro cannot resolve workspace `@faang/i18n` | Explicit `watchFolders`/`nodeModulesPaths`; `@faang/i18n` built first via turbo `dependsOn: ["^build"]`. |
| `expo prebuild` needs network/templates and is heavy | Run once to verify; keep output gitignored; document the command. |
| AsyncStorage/expo-localization behavior differs on web | Their web implementations (localStorage/navigator.languages) back the preview; native paths validated by unit tests with fakes. |
| `I18nManager.forceRTL` requires restart | Drive visible direction from state; document the restart caveat. |
| `i18next-cli` extraction pulls browser-only globs | `apps/mobile/src` uses only `useT`/`useTranslation`; extraction config already scoped. |

## File Inventory (new / changed)

New:
- `packages/i18n/src/native/{index.ts,types.ts,ports.ts,create-native-i18n.ts}`
- `packages/i18n/src/__tests__/native/*.test.ts`
- `packages/i18n/src/__tests__/react/change-locale.test.tsx`
- `apps/mobile/**` (app source, config, tests; excludes generated `ios/`, `android/`, `.expo/`)
- `apps/docs/content/docs/{en,ar}/packages/native/*.mdx` (+ meta if sectioned)

Changed:
- `packages/i18n/package.json` (`./native` export)
- `packages/i18n/tsup.config.ts` (`native/index` entry)
- `packages/i18n/src/react/{provider.tsx,hooks.ts,context.ts}` (seam)
- `packages/i18n/src/stubs/native.ts` (removed)
- `packages/i18n/catalogs/{en,ar}/*.json` (extracted keys)
- `i18next.config.ts` (only if `apps/mobile` needs an explicit ignore for generated dirs)
- `apps/docs/content/docs/{en,ar}/packages/stubs/index.mdx`
- `apps/docs/content/docs/{en,ar}/appendix/{api-index,file-map}.mdx`
- `apps/docs/scripts/check-file-map.mjs` (allow generated mobile dirs if needed)
- `apps/docs/package.json` (test pipeline unchanged unless noted)
- root `.gitignore`, `pnpm-lock.yaml`, `turbo.json` (only if a task must be declared)

## Open Questions

None. Deferred (unchanged): `node`/`electron` stubs, native E2E tests on device, CI build of binaries.
