# Electron i18n Showcase — Design

- **Status:** Approved (pending written-spec review)
- **Date:** 2026-10-12
- **Topic:** `@faang/i18n/electron` v1.3 runtime + `apps/desktop` Electron app + docs sync
- **Branch:** `260914-feat-headless-i18n-v1`

## Summary

Build a cross-platform Electron desktop app at `apps/desktop` that showcases `@faang/i18n`, and
promote `@faang/i18n/electron` from a throwing stub to a real v1.3 runtime. The Electron main process
owns the OS locale, `electron-store` persistence, and the native surfaces (window title, application
menu, tray menu, dialogs); it broadcasts the active locale over a secure IPC bridge. The renderer is a
React + Vite app that reuses the shared `@faang/i18n/react` adapter and the `onLocaleChange` seam added
for the native work, so `changeLocale` flows through IPC instead of the URL. Documentation is updated in
the same effort so the docs never describe `electron` as a stub.

## Decisions (from brainstorming)

| # | Question | Decision |
|---|---|---|
| Q1 | Deliverable | Real `@faang/i18n/electron` runtime **and** a demo desktop app |
| Q2 | Renderer stack | React + Vite renderer using `@faang/i18n/react` |
| Q3 | Toolchain | `electron-vite` (single config: main, preload, renderer) |
| Q4 | Verification / DoD | Production bundle + unit tests + browser preview of the renderer; no GUI launch |
| Q5 | Desktop surfaces | Full integration: OS locale, `electron-store`, app menu, tray, dialogs, window title, IPC live-update |
| Q6 | Runtime architecture | Dependency-injection ports; the package imports **no** `electron` |
| Q7 | Packaging | Ship an `electron-builder` config and `dist` scripts, but do not build installers |

## Goals

- `@faang/i18n/electron` v1.3: real `createElectronI18n` reusing the kernel `createI18n`, with
  OS-locale detection, `electron-store`-backed namespace caching, native-surface application, and an
  IPC messenger — all through injected ports so the runtime is testable without Electron.
- `apps/desktop`: an `electron-vite` project (main + preload + React renderer) with full en/ar support
  and RTL, a native menu and tray that switch with the locale, and a secure context-isolated bridge.
- The renderer's UI is the same Home/Settings/Profile showcase, driven by `@faang/i18n/react` and the
  `onLocaleChange` seam (no URL routing).
- All tests, typecheck, i18n extraction, parity, and budgets stay green; `pnpm verify` passes.
- Docs describe the real Electron runtime (en + ar).

## Non-Goals

- No signed installers or `.exe`/`.dmg`/`.AppImage` produced in this sandbox.
- No implementation of `@faang/i18n/node` (v1.2) — it stays a stub.
- No changes to the existing web/native/docs apps or the docs rendering engine.
- No GUI launch in the sandbox (no display); the renderer is verified in a plain browser.
- No auto-update or code-signing configuration.

## Architecture

```
apps/desktop  (electron-vite)
  ├─ src/main/index.ts          BrowserWindow + app lifecycle + runtime wiring
  ├─ src/main/ports.ts          real ports: electron-store, app.getLocale, Menu/Tray/dialog, ipcMain
  ├─ src/main/menu.ts           Menu + Tray templates built from the active t()
  ├─ src/main/ipc.ts            channel names + ipcMain handlers
  ├─ src/preload/index.ts       contextBridge → window.desktopI18n
  └─ src/renderer/              React + Vite UI (Home/Settings/Profile)
        └─ src/i18n/bridge.ts   desktop bridge + browser fallback adapter

@faang/i18n/electron  (new)
  ├─ ports.ts               ElectronStorage | ElectronLocale | ElectronSurfaces | ElectronMessenger
  ├─ create-electron-i18n.ts  reuses core createI18n; caches via ElectronStorage; applies surfaces
  └─ types.ts               CreateElectronI18nConfig, ElectronI18n, ElectronController

@faang/i18n/react  (unchanged)
  └─ onLocaleChange seam (already present) consumed by the renderer
```

Data flow: main boots → `controller.getInitialLocale()` (stored → `app.getLocale()` → default) →
creates the window → applies native surfaces for that locale. The renderer mounts, calls
`desktopI18n.getLocale()`, then mounts `I18nProvider`. A user change flows: renderer `changeLocale` →
`onLocaleChange` → IPC `i18n:set-locale` → main `controller.setLocale` (persist → apply menu/tray/title
→ broadcast) → all windows receive `i18n:locale-changed` → React state updates. The main-process
runtime and the renderer runtime both reuse the kernel; the persisted locale in `electron-store` is the
single source of truth.

## 1. Package — `@faang/i18n/electron`

### Public surface

```ts
export interface ElectronStorage {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}

export interface ElectronLocale {
  getSystemLocale(): string
  subscribeSystemLocale?(cb: (lng: string) => void): () => void
}

export interface ElectronSurfaces<L extends string = DefaultLocale> {
  setWindowTitle(lng: L, t: TFunction): void
  setApplicationMenu(lng: L, t: TFunction): void
  setTrayMenu(lng: L, t: TFunction): void
  showMessageBox(lng: L, t: TFunction): void
}

export interface ElectronMessenger<L extends string = DefaultLocale> {
  broadcast(lng: L): void
  onLocaleSelected(cb: (lng: string) => void): () => void
}

export interface CreateElectronI18nConfig<L extends string = DefaultLocale> {
  locales: readonly L[]
  defaultLocale: L
  fallbackLng?: L
  defaultNS?: Namespace
  catalogs: Record<string, NamespaceResources> // keyed `${lng}:${ns}`
  storage: ElectronStorage
  locale?: ElectronLocale
  surfaces?: ElectronSurfaces<L>
  messenger?: ElectronMessenger<L>
  onEvent?: (event: I18nEvent) => void
  storageKey?: string // default 'faang-i18n:locale'
}

export interface ElectronController<L extends string> {
  getStoredLocale(): Promise<L | undefined>
  getInitialLocale(): Promise<L>
  setLocale(lng: L): Promise<void>
  applyDirection(lng: L): Dir
  subscribeSystemLocale(cb: (lng: L) => void): () => void
}

export interface ElectronI18n<L extends string> {
  runtime: I18nRuntime<L>
  controller: ElectronController<L>
}

export function createElectronI18n<L extends string = DefaultLocale>(
  config: CreateElectronI18nConfig<L>,
): ElectronI18n<L>
```

### Behavior

- `createElectronI18n` calls kernel `createI18n({ locales, defaultLocale, fallbackLng, defaultNS,
  catalogs: { public: '@faang/i18n/catalogs' }, onEvent, backend: { load } })`.
- **Persistence (Approach A, same as native):** `load(lng, ns)` reads `storage` under
  `faang-i18n:ns:${lng}:${ns}`, falls back to `config.catalogs['${lng}:${ns}']`, and writes through.
  The kernel `PersistentStore` stays a no-op.
- `getInitialLocale`: stored locale (validated) → `locale.getSystemLocale()` normalized via the kernel
  `resolveLocale(..., locales, defaultLocale)` → `defaultLocale`.
- `setLocale(lng)`: persist to storage, then call `surfaces.setApplicationMenu`, `setTrayMenu`,
  `setWindowTitle` with `(lng, runtime.getT(lng, defaultNS))`, then `messenger.broadcast(lng)`, then
  emit `{ type: 'locale.switch', from, to }` through `onEvent`.
- `applyDirection` returns `dirFor(lng)`; the renderer applies `document.dir` from it (Electron has no
  `I18nManager`).
- `subscribeSystemLocale` delegates to `locale.subscribeSystemLocale` when present, else a no-op.
- The app wires `messenger.onLocaleSelected((lng) => controller.setLocale(lng))`, so IPC requests
  funnel through the same path.
- All ports except `storage` are optional, and the module imports **no** `electron`/`electron-store`,
  so it is testable in Node/vitest with fakes.

### Packaging

- New source under `packages/i18n/src/electron/`; `tsup.config.ts` entry `'electron/index'`.
- `package.json` export `./electron` re-points to `dist/electron/index.{js,d.ts}`.
- `createElectronI18n` remains absent from the root entry (import the subpath explicitly).
- `stubs/electron.ts` is removed; `stubs/node.ts` remains.

## 2. App — `apps/desktop`

### Project

- `electron-vite` project, package name `@apps/desktop`, `"type": "module"`, TypeScript.
- Depends on `@faang/i18n` (workspace), `electron-store`, `i18next`, `react`, `react-dom`,
  `react-i18next`.
- Dev deps: `electron` (installed with `ELECTRON_SKIP_BINARY_DOWNLOAD=1` — types only),
  `electron-vite`, `vite`, `@vitejs/plugin-react`, `electron-builder`, `vitest`, `happy-dom`,
  `@testing-library/react`, `@testing-library/jest-dom`, `typescript`.
- Scripts: `dev` (`electron-vite dev`), `build` (`electron-vite build`), `typecheck`
  (`tsc --noEmit`), `test` (`vitest run`), `renderer:dev` (browser preview of the renderer),
  `dist` (`electron-vite build && electron-builder`, not run in sandbox).
- `electron.vite.config.ts` defines the main/preload/renderer targets and reuses the renderer Vite
  options (React plugin, `server.host: true`, `allowedHosts: ['.monkeycode-ai.live']`) so the browser
  preview and the Electron renderer never drift.
- `electron-builder.yml` configures `win`/`mac`/`linux` targets and app id; not executed here.
- `.gitignore` covers `out/` and `release/`.

### Main process

- `src/main/index.ts`: `app.whenReady` → build the runtime with real ports → `getInitialLocale` →
  create `BrowserWindow` (`contextIsolation: true`, `nodeIntegration: false`, preload) → set the
  window title + application menu + tray → wire `messenger.onLocaleSelected`.
- `src/main/ports.ts`:
  - `storage` from `electron-store`.
  - `locale.getSystemLocale` from `app.getLocale()`.
  - `surfaces.setApplicationMenu`/`setTrayMenu`/`setWindowTitle`/`showMessageBox` using `Menu`,
    `Tray`, `BrowserWindow.setTitle`, `dialog.showMessageBox`.
  - `messenger.broadcast` iterates `BrowserWindow.getAllWindows()` and sends `i18n:locale-changed`;
    `messenger.onLocaleSelected` registers an `ipcMain.handle('i18n:set-locale', ...)`.
- `src/main/menu.ts`: builds `Menu` and `Tray` templates purely from the passed `t` function (keys from
  the `common` namespace), keeping the templates unit-testable with a fake `t`.

### Preload

- `src/preload/index.ts` exposes, via `contextBridge.exposeInMainWorld('desktopI18n', ...)`:
  - `getLocale(): Promise<string>` → `ipcRenderer.invoke('i18n:get-locale')`
  - `setLocale(lng): Promise<void>` → `ipcRenderer.invoke('i18n:set-locale', lng)`
  - `onLocaleChange(cb): () => void` → subscribes/unsubscribes `i18n:locale-changed`
- `src/preload/index.d.ts` augments `Window` with `desktopI18n`.

### Renderer

- `src/renderer/index.html` + `src/renderer/src/main.tsx` mount `<App />`.
- `src/renderer/src/i18n/bridge.ts`: returns `window.desktopI18n` when present, else a
  browser fallback (localStorage persistence, `navigator.language`/`'en'`, no IPC) so the UI runs in a
  plain browser for preview.
- `DesktopI18nProvider` mirrors `MobileI18nProvider`: resolves the initial locale through the bridge
  behind a splash, mounts the shared `I18nProvider` with `onLocaleChange` → `bridge.setLocale`, and
  subscribes to `bridge.onLocaleChange` to update state. Applies `document.dir`/`lang` on change.
- Screens/components reuse the same structure as the mobile showcase: `theme.ts`,
  `components/{Screen,Card,AppButton,LanguageSwitcher}.tsx`, `screens/{Home,Settings,Profile}.tsx`,
  catalogs map, and namespace list.

### Styling & RTL

- DOM CSS with logical properties; `document.dir` is set from the active locale so RTL flips
  immediately without a reload.

## 3. i18n data

- Reuse the existing shared namespaces: `common`, `errors`, `home`, `settings`, `profile`,
  `validation`. New desktop-only strings (menu/tray/dialog labels) are added to `common` under a
  `desktop.*` subtree if needed, with full Arabic translations.
- `pnpm i18n:extract` writes the new keys to `packages/i18n/catalogs/{en,ar}/*.json`; the catalog
  parity test enforces en/ar key equality. New keys must stay within the gzip budget.

## 4. Testing

- **Package (vitest, node):** `src/__tests__/electron/create-electron-i18n.test.ts` with fake ports —
  initial-locale precedence (stored → system → default), invalid stored/system fallback, persistence
  write-through, `setApplicationMenu`/`setTrayMenu`/`setWindowTitle` invoked with `(lng, t)`,
  `messenger.broadcast` called with the new locale, `locale.switch` event emitted, and
  `subscribeSystemLocale` firing. No `electron` import.
- **App (vitest + happy-dom):** renderer `App.test.tsx` boots through a fake bridge, switches en→ar
  (asserting `dir` and translated text), and `screens.test.tsx` renders Home/Profile; a main-process
  `menu.test.ts` asserts the Menu/Tray templates use the injected `t`.
- Parity, extraction `--ci --dry-run`, and budget scripts remain green.

## 5. Docs

- New `packages/electron/create-electron-i18n.mdx` (en + ar) following the package content rubric, with
  `AutoTypeTable` for `CreateElectronI18nConfig`, the four port types, and `ElectronController`.
- Add `packages/electron/meta.json`; register `electron` in `packages/meta.json`.
- Amend `packages/stubs/index.mdx` (en + ar): remove `electron`, keep `node`, update the prose and
  table.
- Update `appendix/api-index.mdx` and `appendix/file-map.mdx` (en + ar) for the new package files and
  the `apps/desktop` section.
- Parity goes 47 → 48 pages per locale; the build and RTL checks stay green.

## 6. Build, verification, DoD

- `pnpm verify` (root) passes: typecheck, test, `i18n:extract --ci --dry-run`, `i18n:status`,
  `i18n:lint`, build, budget — now including `@apps/desktop` typecheck/test/build and the
  `@faang/i18n` electron tests.
- `electron-vite build` emits `out/main`, `out/preload`, and `out/renderer` bundles.
- Live browser preview of the renderer via the `deploy-website` skill.
- Docs build green with parity 48×2.
- `electron-builder.yml` is present and referenced by the `dist` script but is **not** run.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Electron binary download is heavy / blocked in the sandbox | Install with `ELECTRON_SKIP_BINARY_DOWNLOAD=1`; only types are needed (no GUI launch). |
| `electron-vite`/`electron` version and Node 22 ESM compatibility | Pin a current stable pair; keep main/preload ESM-friendly; verify `electron-vite build`. |
| Renderer assumes the preload bridge and breaks in a plain browser | Provide the localStorage fallback adapter in `bridge.ts`; the Vite preview exercises it. |
| `i18next-cli` extraction pulls renderer keys unexpectedly | Extract input already includes `apps/*/src/**`; add `desktop.*` keys to `common` in both locales. |
| Menu/Tray templates need a real `Menu` to test | Build templates from an injected `t`/label function; test with a fake `t`. |
| Docs parity/file-map regressions | Update stubs page, api-index, file-map, and meta in the same commit; run `pnpm verify`. |

## File Inventory (new / changed)

New:
- `packages/i18n/src/electron/{index.ts,types.ts,ports.ts,create-electron-i18n.ts}`
- `packages/i18n/src/__tests__/electron/create-electron-i18n.test.ts`
- `apps/desktop/**` (main, preload, renderer, config, tests; excludes `out/`, `release/`)
- `apps/docs/content/docs/{en,ar}/packages/electron/{create-electron-i18n.mdx,meta.json}`

Changed:
- `packages/i18n/package.json` (`./electron` export)
- `packages/i18n/tsup.config.ts` (`electron/index` entry)
- `packages/i18n/src/stubs/electron.ts` (removed)
- `packages/i18n/catalogs/{en,ar}/*.json` (extracted desktop keys)
- `apps/docs/content/docs/{en,ar}/packages/{meta.json,stubs/index.mdx}`
- `apps/docs/content/docs/{en,ar}/appendix/{api-index,file-map}.mdx`
- root `.gitignore`, `pnpm-lock.yaml`

## Open Questions

None. Deferred (unchanged): `node` (v1.2) and `electron` auto-update/signing.
