# Electron i18n Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `@faang/i18n/electron` from a stub to a real v1.3 runtime and add an `electron-vite` desktop app (`apps/desktop`) that showcases the package with live en/ar switching across native surfaces.

**Architecture:** The package exposes `createElectronI18n(config: CreateElectronI18nConfig)` returning `{ runtime, controller }`, reusing the kernel `createI18n` and taking dependency-injection ports (`ElectronStorage`, `ElectronLocale`, `ElectronSurfaces`, `ElectronMessenger`) so it never imports `electron`. The app's main process supplies real ports (`electron-store`, `app.getLocale()`, `Menu`/`Tray`/`dialog`, `ipcMain`); the renderer is a React + Vite app that reuses `@faang/i18n/react` and talks to main over a context-isolated preload bridge.

**Tech Stack:** TypeScript, i18next 26.4.2, tsup, vitest; Electron 44.7.0, electron-vite 5.0.0, Vite 7.3.7, `@vitejs/plugin-react` 5.2.0, electron-store 11.0.2, electron-builder 26.15.3, React 19.3.0.

## Global Constraints

- Node `>=22`; pnpm workspace; Turborepo. TypeScript root `7.0.2`; package `i18next 26.4.2`, `react 19.3.0`, `react-i18next 17.0.14`.
- The package `@faang/i18n` is ESM-only (`"type": "module"`, `exports` with `import` only) and must import **no** `electron` / `electron-store`.
- `apps/desktop` uses `"type": "module"`; Electron preload runs with `sandbox: false`, `contextIsolation: true`, `nodeIntegration: false`.
- Install Electron without the binary: export `ELECTRON_SKIP_BINARY_DOWNLOAD=1` before `pnpm install`.
- i18n locales are exactly `['en', 'ar']`; the catalog parity test enforces en/ar key equality; extract input includes `apps/*/src/**`.
- Verification uses bundles + unit tests + a browser preview of the renderer. Do **not** launch Electron; do **not** run `electron-builder`.
- Conventional Commits; every commit appends `Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>`.
- Do not delete files without explicit user confirmation (the stub deletion is pre-approved by this plan's spec).

---

### Task 1: `@faang/i18n/electron` runtime

**Files:**
- Create: `packages/i18n/src/electron/ports.ts`
- Create: `packages/i18n/src/electron/types.ts`
- Create: `packages/i18n/src/electron/create-electron-i18n.ts`
- Create: `packages/i18n/src/electron/index.ts`
- Create: `packages/i18n/src/__tests__/electron/create-electron-i18n.test.ts`
- Modify: `packages/i18n/tsup.config.ts`
- Modify: `packages/i18n/package.json`
- Delete: `packages/i18n/src/stubs/electron.ts` (pre-approved)

**Interfaces:**
- Consumes: kernel `createI18n` (`packages/i18n/src/core/create-i18n.ts`), `dirFor`/`resolveLocale` (`packages/i18n/src/core/locale.ts`), `emit` (`packages/i18n/src/obs/events.ts`), types `DefaultLocale`, `Dir`, `I18nEvent`, `I18nRuntime`, `Namespace`, `NamespaceResources` (`packages/i18n/src/core/types.ts`).
- Produces: `createElectronI18n`, `CreateElectronI18nConfig`, `ElectronController`, `ElectronI18n`, `ElectronStorage`, `ElectronLocale`, `ElectronSurfaces`, `ElectronMessenger` from `@faang/i18n/electron`.

- [ ] **Step 1: Write the ports**

Create `packages/i18n/src/electron/ports.ts`:

```ts
import type { TFunction } from 'i18next'
import type { DefaultLocale } from '../core/types'

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
```

- [ ] **Step 2: Write the types**

Create `packages/i18n/src/electron/types.ts`:

```ts
import type {
  DefaultLocale,
  Dir,
  I18nEvent,
  I18nRuntime,
  Namespace,
  NamespaceResources,
} from '../core/types'
import type { ElectronLocale, ElectronMessenger, ElectronStorage, ElectronSurfaces } from './ports'

export interface CreateElectronI18nConfig<L extends string = DefaultLocale> {
  locales: readonly L[]
  defaultLocale: L
  fallbackLng?: L
  defaultNS?: Namespace
  catalogs: Record<string, NamespaceResources>
  storage: ElectronStorage
  locale?: ElectronLocale
  surfaces?: ElectronSurfaces<L>
  messenger?: ElectronMessenger<L>
  onEvent?: (event: I18nEvent) => void
  storageKey?: string
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
```

- [ ] **Step 3: Write the failing test**

Create `packages/i18n/src/__tests__/electron/create-electron-i18n.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { createElectronI18n } from '../../electron'
import type { ElectronStorage } from '../../electron'

const catalogs = {
  'en:common': { hello: 'Hello' },
  'ar:common': { hello: 'مرحبا' },
}

function storage(): ElectronStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    async get(key) {
      return map.get(key) ?? null
    },
    async set(key, value) {
      map.set(key, value)
    },
  }
}

function base(overrides: Record<string, unknown> = {}) {
  return createElectronI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    catalogs,
    storage: storage(),
    ...overrides,
  })
}

describe('createElectronI18n', () => {
  it('prefers the stored locale', async () => {
    const store = storage()
    await store.set('faang-i18n:locale', 'ar')
    const { controller } = base({ storage: store })
    await expect(controller.getInitialLocale()).resolves.toBe('ar')
  })

  it('falls back to the system locale', async () => {
    const { controller } = base({ locale: { getSystemLocale: () => 'ar-SA' } })
    await expect(controller.getInitialLocale()).resolves.toBe('ar')
  })

  it('falls back to the default locale when nothing is available', async () => {
    const { controller } = base()
    await expect(controller.getInitialLocale()).resolves.toBe('en')
  })

  it('ignores an unsupported stored locale', async () => {
    const store = storage()
    await store.set('faang-i18n:locale', 'fr')
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

  it('persists the locale, applies surfaces, broadcasts, and emits locale.switch', async () => {
    const store = storage()
    const order: string[] = []
    const onEvent = vi.fn()
    const surfaces = {
      setApplicationMenu: vi.fn(() => order.push('menu')),
      setTrayMenu: vi.fn(() => order.push('tray')),
      setWindowTitle: vi.fn(() => order.push('title')),
      showMessageBox: vi.fn(),
    }
    const messenger = { broadcast: vi.fn(), onLocaleSelected: vi.fn() }
    const { controller } = base({ storage: store, surfaces, messenger, onEvent })
    await controller.setLocale('ar')
    expect(store.map.get('faang-i18n:locale')).toBe('ar')
    expect(order).toEqual(['menu', 'tray', 'title'])
    expect(messenger.broadcast).toHaveBeenCalledWith('ar')
    expect(onEvent).toHaveBeenCalledWith({ type: 'locale.switch', from: 'en', to: 'ar' })
  })

  it('applies direction from the locale', () => {
    const { controller } = base()
    expect(controller.applyDirection('en')).toBe('ltr')
    expect(controller.applyDirection('ar')).toBe('rtl')
  })

  it('notifies system locale changes through the locale port', () => {
    let listener: ((lng: string) => void) | undefined
    const locale = {
      getSystemLocale: () => 'en-US',
      subscribeSystemLocale: (cb: (lng: string) => void) => {
        listener = cb
        return vi.fn()
      },
    }
    const onSystem = vi.fn()
    const { controller } = base({ locale })
    const off = controller.subscribeSystemLocale(onSystem)
    listener?.('ar-EG')
    expect(onSystem).toHaveBeenCalledWith('ar')
    off()
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm --filter @faang/i18n exec vitest run src/__tests__/electron/create-electron-i18n.test.ts`
Expected: FAIL — cannot resolve `../../electron`.

- [ ] **Step 5: Implement the runtime**

Create `packages/i18n/src/electron/create-electron-i18n.ts`:

```ts
import { createI18n } from '../core/create-i18n'
import { dirFor, resolveLocale } from '../core/locale'
import { emit } from '../obs/events'
import type { DefaultLocale, Dir, NamespaceResources } from '../core/types'
import type { CreateElectronI18nConfig, ElectronI18n } from './types'

const LOCALE_KEY = 'faang-i18n:locale'
const NS_CACHE_PREFIX = 'faang-i18n:ns'

export function createElectronI18n<L extends string = DefaultLocale>(
  config: CreateElectronI18nConfig<L>,
): ElectronI18n<L> {
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

  const fromSystem = (): L | undefined => {
    const tag = config.locale?.getSystemLocale()
    if (!tag) return undefined
    const resolved = resolveLocale(tag, config.locales, config.defaultLocale)
    return isKnown(resolved) ? resolved : undefined
  }

  const applySurfaces = (lng: L): void => {
    if (!config.surfaces) return
    const t = runtime.getT(lng, runtime.config.defaultNS)
    config.surfaces.setApplicationMenu(lng, t)
    config.surfaces.setTrayMenu(lng, t)
    config.surfaces.setWindowTitle(lng, t)
  }

  const getStoredLocale = async (): Promise<L | undefined> => {
    const stored = await safeGet(config.storage, localeKey)
    return stored && isKnown(stored) ? stored : undefined
  }

  const getInitialLocale = async (): Promise<L> => {
    const stored = await getStoredLocale()
    if (stored) return stored
    return fromSystem() ?? config.defaultLocale
  }

  const setLocale = async (lng: L): Promise<void> => {
    const from = runtime.instance.resolvedLanguage ?? config.defaultLocale
    await safeSet(config.storage, localeKey, lng)
    await runtime.loadNamespace(lng, runtime.config.defaultNS)
    applySurfaces(lng)
    config.messenger?.broadcast(lng)
    emit(config.onEvent, { type: 'locale.switch', from, to: lng })
  }

  const applyDirection = (lng: L): Dir => dirFor(lng)

  const subscribeSystemLocale = (cb: (lng: L) => void): (() => void) => {
    const subscribe = config.locale?.subscribeSystemLocale
    if (!subscribe) return () => {}
    return subscribe((tag) => {
      const resolved = resolveLocale(tag, config.locales, config.defaultLocale)
      if (isKnown(resolved)) cb(resolved)
    })
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

async function safeGet(storage: { get(key: string): Promise<string | null> }, key: string) {
  try {
    return await storage.get(key)
  } catch {
    return null
  }
}

async function safeSet(
  storage: { set(key: string, value: string): Promise<void> },
  key: string,
  value: string,
): Promise<void> {
  try {
    await storage.set(key, value)
  } catch {
    // Persistence is best-effort; the in-memory cache still serves the namespace.
  }
}
```

Create `packages/i18n/src/electron/index.ts`:

```ts
export { createElectronI18n } from './create-electron-i18n'
export type { CreateElectronI18nConfig, ElectronController, ElectronI18n } from './types'
export type {
  ElectronLocale,
  ElectronMessenger,
  ElectronStorage,
  ElectronSurfaces,
} from './ports'
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @faang/i18n exec vitest run src/__tests__/electron/create-electron-i18n.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 7: Repoint packaging and remove the stub**

In `packages/i18n/tsup.config.ts`, replace the entry `'stubs/electron': 'src/stubs/electron.ts',` with `'electron/index': 'src/electron/index.ts',`.

In `packages/i18n/package.json`, change the `./electron` export to:

```json
    "./electron": {
      "types": "./dist/electron/index.d.ts",
      "import": "./dist/electron/index.js"
    },
```

Then delete `packages/i18n/src/stubs/electron.ts` (pre-approved by the spec).

- [ ] **Step 8: Verify build, typecheck, and full package tests**

Run: `pnpm --filter @faang/i18n build && pnpm --filter @faang/i18n typecheck && pnpm --filter @faang/i18n test`
Expected: build emits `dist/electron/index.js` + `.d.ts`; typecheck clean; vitest passes all suites.

- [ ] **Step 9: Commit**

```bash
git add packages/i18n/src/electron packages/i18n/src/__tests__/electron packages/i18n/tsup.config.ts packages/i18n/package.json
git rm packages/i18n/src/stubs/electron.ts
git commit -m "feat(electron): implement v1.3 createElectronI18n runtime

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 2: `apps/desktop` scaffold and configs

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/tsconfig.node.json`
- Create: `apps/desktop/tsconfig.web.json`
- Create: `apps/desktop/electron.vite.config.ts`
- Create: `apps/desktop/vite.renderer.config.ts`
- Create: `apps/desktop/vitest.config.ts`
- Create: `apps/desktop/vitest.setup.ts`
- Create: `apps/desktop/electron-builder.yml`
- Create: `apps/desktop/.gitignore`
- Create: `apps/desktop/src/main/index.ts` (minimal placeholder)
- Create: `apps/desktop/src/preload/index.ts`
- Create: `apps/desktop/src/preload/index.d.ts`
- Create: `apps/desktop/src/renderer/index.html`
- Create: `apps/desktop/src/renderer/src/main.tsx`
- Create: `apps/desktop/src/renderer/src/App.tsx` (placeholder)
- Create: `apps/desktop/README.md`
- Modify: `turbo.json` (add `out/**` to build outputs)

**Interfaces:**
- Consumes: `@faang/i18n/electron` (Task 1).
- Produces: the app workspace, build/preview/typecheck/test scripts, and the `window.desktopI18n` bridge contract used by Task 4.

- [ ] **Step 1: Create the package manifest**

Create `apps/desktop/package.json`:

```json
{
  "name": "@apps/desktop",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./out/main/index.mjs",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "renderer:dev": "vite --config vite.renderer.config.ts",
    "renderer:build": "vite build --config vite.renderer.config.ts",
    "typecheck": "tsc -p tsconfig.node.json --noEmit && tsc -p tsconfig.web.json --noEmit",
    "test": "vitest run",
    "dist": "electron-vite build && electron-builder"
  },
  "dependencies": {
    "@faang/i18n": "workspace:*",
    "electron-store": "11.0.2",
    "i18next": "26.4.2",
    "react": "19.3.0",
    "react-dom": "19.3.0",
    "react-i18next": "17.0.14"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.3.3",
    "@types/react": "19.2.2",
    "@types/react-dom": "19.2.2",
    "@vitejs/plugin-react": "5.2.0",
    "electron": "44.7.0",
    "electron-builder": "26.15.3",
    "electron-vite": "5.0.0",
    "happy-dom": "15.11.7",
    "typescript": "7.0.2",
    "vite": "7.3.7",
    "vitest": "5.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies (binary skipped)**

Run:

```bash
cd /workspace && ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --filter @apps/desktop...
```

Expected: lockfile updated, `apps/desktop/node_modules` populated, no Electron binary download.

- [ ] **Step 3: Create the TypeScript configs**

Create `apps/desktop/tsconfig.node.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023"],
    "types": ["node"]
  },
  "include": ["src/main", "src/preload", "electron.vite.config.ts", "vite.renderer.config.ts"]
}
```

Create `apps/desktop/tsconfig.web.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src/renderer", "src/preload/index.d.ts", "vitest.config.ts", "vitest.setup.ts"]
}
```

Create `apps/desktop/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "files": [],
  "references": [{ "path": "./tsconfig.node.json" }, { "path": "./tsconfig.web.json" }]
}
```

- [ ] **Step 4: Create the build and test configs**

Create `apps/desktop/vite.renderer.config.ts`:

```ts
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(import.meta.dirname, 'src/renderer'),
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: ['.monkeycode-ai.live'],
  },
  build: {
    outDir: resolve(import.meta.dirname, 'out/renderer'),
    emptyOutDir: true,
  },
})
```

Create `apps/desktop/electron.vite.config.ts`:

```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import renderer from './vite.renderer.config'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer,
})
```

Create `apps/desktop/vitest.config.ts`:

```ts
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

Create `apps/desktop/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Create the packaging config, gitignore, and turbo output**

Create `apps/desktop/electron-builder.yml`:

```yaml
appId: com.faang.i18n.desktop
productName: i18n Showcase
directories:
  output: release
files:
  - out/**
  - package.json
win:
  target: nsis
mac:
  target: dmg
  category: public.app-category.developer-tools
linux:
  target: AppImage
  category: Development
```

Create `apps/desktop/.gitignore`:

```
out
release
```

In root `turbo.json`, change the `build` outputs to:

```json
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", "out/**"] },
```

- [ ] **Step 6: Create the main/preload/renderer skeleton**

Create `apps/desktop/src/main/index.ts`:

```ts
import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'

const dir = import.meta.dirname

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1024,
    height: 720,
    show: false,
    webPreferences: {
      preload: join(dir, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  window.on('ready-to-show', () => window.show())
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(dir, '../renderer/index.html'))
}

void app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

Create `apps/desktop/src/preload/index.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron'

export const CHANNELS = {
  getLocale: 'i18n:get-locale',
  setLocale: 'i18n:set-locale',
  localeChanged: 'i18n:locale-changed',
} as const

const api = {
  getLocale: (): Promise<string> => ipcRenderer.invoke(CHANNELS.getLocale),
  setLocale: (lng: string): Promise<void> => ipcRenderer.invoke(CHANNELS.setLocale, lng),
  onLocaleChange: (cb: (lng: string) => void): (() => void) => {
    const listener = (_event: unknown, lng: string): void => cb(lng)
    ipcRenderer.on(CHANNELS.localeChanged, listener)
    return () => ipcRenderer.removeListener(CHANNELS.localeChanged, listener)
  },
}

contextBridge.exposeInMainWorld('desktopI18n', api)

export type DesktopI18nApi = typeof api
```

Create `apps/desktop/src/preload/index.d.ts`:

```ts
import type { DesktopI18nApi } from './index'

declare global {
  interface Window {
    desktopI18n?: DesktopI18nApi
  }
}

export {}
```

Create `apps/desktop/src/renderer/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>i18n Showcase</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `apps/desktop/src/renderer/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const container = document.getElementById('root')
if (!container) throw new Error('Root element #root not found')

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Create `apps/desktop/src/renderer/src/App.tsx`:

```tsx
export default function App() {
  return <h1>i18n Showcase</h1>
}
```

Create `apps/desktop/README.md`:

```markdown
# @apps/desktop

Electron desktop app showcasing `@faang/i18n` on the main process and the renderer.

## Commands

Install dependencies and build the package first.

```bash
ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install
pnpm --filter @faang/i18n build
```

Run and build.

```bash
pnpm --filter @apps/desktop dev
pnpm --filter @apps/desktop build
pnpm --filter @apps/desktop renderer:dev
pnpm --filter @apps/desktop typecheck
pnpm --filter @apps/desktop test
```

The `renderer:dev` script serves the renderer in a plain browser (no Electron) for preview.
```

- [ ] **Step 7: Verify typecheck and build**

Run: `pnpm --filter @apps/desktop typecheck && pnpm --filter @apps/desktop build`
Expected: both pass. Confirm emitted files with `ls apps/desktop/out/main apps/desktop/out/preload apps/desktop/out/renderer`. If the preload filename is `index.js` rather than `index.mjs`, update the preload path in `src/main/index.ts` to match.

- [ ] **Step 8: Commit**

```bash
git add apps/desktop turbo.json pnpm-lock.yaml
git commit -m "feat(desktop): scaffold electron-vite app with preload bridge

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 3: Main-process i18n wiring + catalog keys

**Files:**
- Create: `apps/desktop/src/main/ipc.ts`
- Create: `apps/desktop/src/main/menu.ts`
- Create: `apps/desktop/src/main/catalogs.ts`
- Create: `apps/desktop/src/main/ports.ts`
- Create: `apps/desktop/src/main/__tests__/menu.test.ts`
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `packages/i18n/catalogs/en/common.json`
- Modify: `packages/i18n/catalogs/ar/common.json`

**Interfaces:**
- Consumes: `createElectronI18n` and ports from `@faang/i18n/electron` (Task 1); `CHANNELS` from `src/preload/index.ts` (Task 2).
- Produces: `CHANNELS` (`src/main/ipc.ts`), `buildAppMenuTemplate(t, handlers)` and `buildTrayMenuTemplate(t, handlers)` (`src/main/menu.ts`), `createStorage`/`systemLocale`/`createSurfaces`/`createMessenger` (`src/main/ports.ts`).

- [ ] **Step 1: Add the `desktop.*` catalog keys**

In `packages/i18n/catalogs/en/common.json`, add a `desktop` block (keys sorted alphabetically; place it after `app` and before `empty`):

```json
  "desktop": {
    "dialog": {
      "detail": "Locale: {{lng}}",
      "message": "Bilingual i18n showcase on Electron",
      "title": "About this demo"
    },
    "menu": {
      "about": "About",
      "file": "File",
      "help": "Help",
      "language": "Language",
      "quit": "Quit",
      "view": "View"
    },
    "tray": {
      "quit": "Quit",
      "show": "Show window"
    },
    "windowTitle": "{{name}} · i18n Showcase"
  },
```

In `packages/i18n/catalogs/ar/common.json`, add the matching block (same position):

```json
  "desktop": {
    "dialog": {
      "detail": "اللغة: {{lng}}",
      "message": "عرض i18n ثنائي اللغة على Electron",
      "title": "حول هذا العرض"
    },
    "menu": {
      "about": "حول",
      "file": "ملف",
      "help": "مساعدة",
      "language": "اللغة",
      "quit": "خروج",
      "view": "عرض"
    },
    "tray": {
      "quit": "خروج",
      "show": "إظهار النافذة"
    },
    "windowTitle": "{{name}} · عرض i18n"
  },
```

- [ ] **Step 2: Write the failing menu test**

Create `apps/desktop/src/main/__tests__/menu.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import type { TFunction } from 'i18next'
import { buildAppMenuTemplate, buildTrayMenuTemplate } from '../menu'

const t = ((key: string) => key) as unknown as TFunction

describe('menu templates', () => {
  it('labels the application menu and wires the language handlers', () => {
    const onLocale = vi.fn()
    const onAbout = vi.fn()
    const template = buildAppMenuTemplate(t, { onLocale, onAbout })
    const labels = template.map((item) => item.label)
    expect(labels).toContain('desktop.menu.file')
    expect(labels).toContain('desktop.menu.language')

    const language = template.find((item) => item.label === 'desktop.menu.language')
    const arabic = language?.submenu?.find((item) => item.label === 'language.ar')
    arabic?.click?.()
    expect(onLocale).toHaveBeenCalledWith('ar')

    const file = template.find((item) => item.label === 'desktop.menu.file')
    file?.submenu?.[0]?.click?.()
    expect(onAbout).toHaveBeenCalled()
  })

  it('labels the tray menu and wires the handlers', () => {
    const onShow = vi.fn()
    const onQuit = vi.fn()
    const template = buildTrayMenuTemplate(t, { onShow, onQuit })
    expect(template[0]?.label).toBe('desktop.tray.show')
    template[0]?.click?.()
    expect(onShow).toHaveBeenCalled()
    template[2]?.click?.()
    expect(onQuit).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @apps/desktop exec vitest run src/main/__tests__/menu.test.ts`
Expected: FAIL — cannot resolve `../menu`.

- [ ] **Step 4: Create the IPC channel constants**

Create `apps/desktop/src/main/ipc.ts`:

```ts
export const CHANNELS = {
  getLocale: 'i18n:get-locale',
  setLocale: 'i18n:set-locale',
  localeChanged: 'i18n:locale-changed',
} as const
```

- [ ] **Step 5: Implement the menu templates**

Create `apps/desktop/src/main/menu.ts`:

```ts
import type { TFunction } from 'i18next'

export type Locale = 'en' | 'ar'

export interface MenuTemplateItem {
  label?: string
  type?: 'separator'
  role?: string
  accelerator?: string
  click?: () => void
  submenu?: MenuTemplateItem[]
}

export interface AppMenuHandlers {
  onLocale(lng: Locale): void
  onAbout(): void
}

export function buildAppMenuTemplate(t: TFunction, handlers: AppMenuHandlers): MenuTemplateItem[] {
  return [
    {
      label: t('desktop.menu.file'),
      submenu: [
        { label: t('desktop.menu.about'), click: handlers.onAbout },
        { type: 'separator' },
        { label: t('desktop.menu.quit'), role: 'quit' },
      ],
    },
    {
      label: t('desktop.menu.language'),
      submenu: [
        { label: t('language.en'), click: () => handlers.onLocale('en') },
        { label: t('language.ar'), click: () => handlers.onLocale('ar') },
      ],
    },
    { label: t('desktop.menu.view'), role: 'viewMenu' },
    { label: t('desktop.menu.help'), role: 'help' },
  ]
}

export function buildTrayMenuTemplate(
  t: TFunction,
  handlers: { onShow(): void; onQuit(): void },
): MenuTemplateItem[] {
  return [
    { label: t('desktop.tray.show'), click: handlers.onShow },
    { type: 'separator' },
    { label: t('desktop.tray.quit'), click: handlers.onQuit },
  ]
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm --filter @apps/desktop exec vitest run src/main/__tests__/menu.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 7: Create the main-side catalogs**

Create `apps/desktop/src/main/catalogs.ts` (main imports the same bundled JSON as the renderer):

```ts
import type { NamespaceResources } from '@faang/i18n'
import arCommon from '@faang/i18n/catalogs/ar/common.json'
import enCommon from '@faang/i18n/catalogs/en/common.json'

export const catalogs: Record<string, NamespaceResources> = {
  'en:common': enCommon,
  'ar:common': arCommon,
}
```

- [ ] **Step 8: Implement the real ports**

Create `apps/desktop/src/main/ports.ts`:

```ts
import { app, BrowserWindow, Menu, Tray, dialog, ipcMain } from 'electron'
import Store from 'electron-store'
import type { TFunction } from 'i18next'
import type {
  ElectronLocale,
  ElectronMessenger,
  ElectronStorage,
  ElectronSurfaces,
} from '@faang/i18n/electron'
import { CHANNELS } from './ipc'
import { buildAppMenuTemplate, buildTrayMenuTemplate } from './menu'

export function createStorage(): ElectronStorage {
  const store = new Store<Record<string, string>>()
  return {
    async get(key) {
      return store.get(key) ?? null
    },
    async set(key, value) {
      store.set(key, value)
    },
  }
}

export const systemLocale: ElectronLocale = {
  getSystemLocale: () => app.getLocale(),
}

export interface SurfaceDeps {
  getWindow(): BrowserWindow | null
  getTray(): Tray | null
  onLocale(lng: string): void
  onAbout(t: TFunction): void
}

export function createSurfaces(deps: SurfaceDeps): ElectronSurfaces {
  return {
    setWindowTitle(_lng, t) {
      deps.getWindow()?.setTitle(t('desktop.windowTitle', { name: t('app.name') }))
    },
    setApplicationMenu(_lng, t) {
      const template = buildAppMenuTemplate(t, {
        onLocale: (lng) => deps.onLocale(lng),
        onAbout: () => deps.onAbout(t),
      })
      Menu.setApplicationMenu(Menu.buildFromTemplate(template as Electron.MenuItemConstructorOptions[]))
    },
    setTrayMenu(_lng, t) {
      const tray = deps.getTray()
      if (!tray) return
      tray.setToolTip(t('app.name'))
      tray.setContextMenu(
        Menu.buildFromTemplate(
          buildTrayMenuTemplate(t, {
            onShow: () => deps.getWindow()?.show(),
            onQuit: () => app.quit(),
          }) as Electron.MenuItemConstructorOptions[],
        ),
      )
    },
    showMessageBox(lng, t) {
      void dialog.showMessageBox({
        type: 'info',
        title: t('desktop.dialog.title'),
        message: t('desktop.dialog.message'),
        detail: t('desktop.dialog.detail', { lng }),
      })
    },
  }
}

export function createMessenger(): ElectronMessenger {
  return {
    broadcast(lng) {
      for (const win of BrowserWindow.getAllWindows()) {
        win.webContents.send(CHANNELS.localeChanged, lng)
      }
    },
    onLocaleSelected(cb) {
      ipcMain.handle(CHANNELS.setLocale, (_event, lng: string) => cb(lng))
      return () => ipcMain.removeHandler(CHANNELS.setLocale)
    },
  }
}
```

- [ ] **Step 9: Rewrite the main entry to wire the runtime**

Replace `apps/desktop/src/main/index.ts`:

```ts
import { app, BrowserWindow, Tray, ipcMain, nativeImage } from 'electron'
import { join } from 'node:path'
import { createElectronI18n } from '@faang/i18n/electron'
import { catalogs } from './catalogs'
import { CHANNELS } from './ipc'
import { createMessenger, createStorage, createSurfaces, systemLocale } from './ports'

const dir = import.meta.dirname

let window: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): BrowserWindow {
  window = new BrowserWindow({
    width: 1024,
    height: 720,
    show: false,
    webPreferences: {
      preload: join(dir, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })
  window.on('ready-to-show', () => window?.show())
  window.on('closed', () => {
    window = null
  })
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void window.loadFile(join(dir, '../renderer/index.html'))
  return window
}

function createTray(): void {
  tray = new Tray(nativeImage.createEmpty())
  tray.setToolTip('i18n Showcase')
}

void app.whenReady().then(async () => {
  let setLocale: (lng: string) => Promise<void> = async () => {}

  const { controller } = createElectronI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    fallbackLng: 'en',
    catalogs,
    storage: createStorage(),
    locale: systemLocale,
    surfaces: createSurfaces({
      getWindow: () => window,
      getTray: () => tray,
      onLocale: (lng) => void setLocale(lng),
      onAbout: (t) => {
        void import('electron').then(({ dialog }) =>
          dialog.showMessageBox({
            type: 'info',
            title: t('desktop.dialog.title'),
            message: t('desktop.dialog.message'),
            detail: t('desktop.dialog.detail', { lng: t('language.label') }),
          }),
        )
      },
    }),
    messenger: createMessenger(),
  })

  setLocale = controller.setLocale as (lng: string) => Promise<void>

  ipcMain.handle(CHANNELS.getLocale, async () => (await controller.getStoredLocale()) ?? 'en')

  const initial = await controller.getInitialLocale()
  createWindow()
  createTray()
  await controller.setLocale(initial)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 10: Verify typecheck and tests**

Run: `pnpm --filter @apps/desktop typecheck && pnpm --filter @apps/desktop test`
Expected: typecheck clean; vitest passes the menu tests.

- [ ] **Step 11: Verify extraction and parity**

Run: `pnpm i18n:extract --ci --dry-run && pnpm --filter @faang/i18n test`
Expected: extraction reports no changes; catalog parity passes (en/ar `desktop.*` keys equal).

- [ ] **Step 12: Commit**

```bash
git add apps/desktop/src/main packages/i18n/catalogs/en/common.json packages/i18n/catalogs/ar/common.json
git commit -m "feat(desktop): wire main-process runtime, menu, tray, and IPC

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 4: Renderer i18n bridge and provider

**Files:**
- Create: `apps/desktop/src/renderer/src/i18n/namespaces.ts`
- Create: `apps/desktop/src/renderer/src/i18n/catalogs.ts`
- Create: `apps/desktop/src/renderer/src/i18n/bridge.ts`
- Create: `apps/desktop/src/renderer/src/i18n/DesktopI18nProvider.tsx`
- Create: `apps/desktop/src/renderer/src/test-utils/renderWithRuntime.tsx`
- Create: `apps/desktop/src/renderer/src/__tests__/provider.test.tsx`

**Interfaces:**
- Consumes: `createI18n` from `@faang/i18n`; `I18nProvider`, `useLocale`, `useT` from `@faang/i18n/react`; the `window.desktopI18n` contract (Task 2).
- Produces: `getBridge()`, `DesktopBridge`, `DesktopI18nProvider`, `APP_NAMESPACES`, `catalogs`, `renderWithRuntime(ui, locale)`.

- [ ] **Step 1: Create the namespaces and catalogs maps**

Create `apps/desktop/src/renderer/src/i18n/namespaces.ts`:

```ts
export const APP_NAMESPACES = ['common', 'errors', 'home', 'settings', 'profile', 'validation'] as const
```

Create `apps/desktop/src/renderer/src/i18n/catalogs.ts`:

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

- [ ] **Step 2: Write the failing provider test**

Create `apps/desktop/src/renderer/src/__tests__/provider.test.tsx`:

```tsx
import { act, render, screen, waitFor } from '@testing-library/react'
import { Text } from 'react'
import { useLocale, useT } from '@faang/i18n/react'
import { DesktopI18nProvider } from '../i18n/DesktopI18nProvider'

function Probe() {
  const t = useT('home')
  const { lng, dir, changeLocale } = useLocale()
  return (
    <div>
      <span data-testid="title">{t('title')}</span>
      <span data-testid="meta">{`${lng}:${dir}`}</span>
      <button data-testid="to-ar" onClick={() => changeLocale('ar')}>
        ar
      </button>
    </div>
  )
}

describe('DesktopI18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete (window as { desktopI18n?: unknown }).desktopI18n
  })

  it('boots in en and switches to ar with RTL', async () => {
    render(
      <DesktopI18nProvider>
        <Probe />
      </DesktopI18nProvider>,
    )
    await waitFor(() =>
      expect(screen.getByTestId('title')).toHaveTextContent('Welcome to the i18n showcase'),
    )
    expect(screen.getByTestId('meta')).toHaveTextContent('en:ltr')
    act(() => {
      screen.getByTestId('to-ar').click()
    })
    await waitFor(() => expect(screen.getByTestId('meta')).toHaveTextContent('ar:rtl'))
    expect(screen.getByTestId('title')).toHaveTextContent('مرحبًا بك في عرض i18n')
  })
})
```

Note: `useT` returns a `TFunction` whose result is a string; render it inside a `<span>` via `{t('title')}` — the test uses `<Text>` import? Remove the `Text` import; plain JSX text is fine. (The `import { Text } from 'react'` line is intentionally absent — do not add it.)

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @apps/desktop exec vitest run src/renderer/src/__tests__/provider.test.tsx`
Expected: FAIL — cannot resolve `../i18n/DesktopI18nProvider`.

- [ ] **Step 4: Implement the bridge**

Create `apps/desktop/src/renderer/src/i18n/bridge.ts`:

```ts
export interface DesktopBridge {
  getLocale(): Promise<string>
  setLocale(lng: string): Promise<void>
  onLocaleChange(cb: (lng: string) => void): () => void
}

const LOCALE_KEY = 'faang-i18n:locale'

function browserFallback(): DesktopBridge {
  const listeners = new Set<(lng: string) => void>()
  return {
    async getLocale() {
      const stored = globalThis.localStorage?.getItem(LOCALE_KEY)
      if (stored) return stored
      return (navigator.language || 'en').split('-')[0] || 'en'
    },
    async setLocale(lng) {
      globalThis.localStorage?.setItem(LOCALE_KEY, lng)
      for (const listener of listeners) listener(lng)
    },
    onLocaleChange(cb) {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
  }
}

export function getBridge(): DesktopBridge {
  const global = globalThis as { desktopI18n?: DesktopBridge }
  return global.desktopI18n ?? browserFallback()
}
```

- [ ] **Step 5: Implement the provider**

Create `apps/desktop/src/renderer/src/i18n/DesktopI18nProvider.tsx`:

```tsx
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { createI18n } from '@faang/i18n'
import { I18nProvider } from '@faang/i18n/react'
import { catalogs } from './catalogs'
import { APP_NAMESPACES } from './namespaces'
import { getBridge } from './bridge'

const bridge = getBridge()

const runtime = createI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  fallbackLng: 'en',
  catalogs: { public: '@faang/i18n/catalogs' },
  backend: { load: async (lng, ns) => catalogs[`${lng}:${ns}`] },
})

async function loadAll(lng: string): Promise<void> {
  await Promise.all(APP_NAMESPACES.map((ns) => runtime.loadNamespace(lng as 'en', ns)))
}

function applyDom(lng: string): void {
  const { dir } = runtime.getHtmlAttributes(lng)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng
    document.documentElement.dir = dir
  }
}

export function DesktopI18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void bridge.getLocale().then(async (lng) => {
      await loadAll(lng)
      if (active) setLocale(lng)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return bridge.onLocaleChange((lng) => {
      void loadAll(lng).then(() => setLocale(lng))
    })
  }, [])

  useEffect(() => {
    if (locale) applyDom(locale)
  }, [locale])

  const onLocaleChange = useMemo(
    () => (lng: string) => {
      void bridge.setLocale(lng).then(() => loadAll(lng)).then(() => setLocale(lng))
    },
    [],
  )

  if (!locale) {
    return <p role="status">Loading…</p>
  }

  return (
    <I18nProvider runtime={runtime} locale={locale} onLocaleChange={onLocaleChange}>
      {children}
    </I18nProvider>
  )
}
```

- [ ] **Step 6: Create the test helper**

Create `apps/desktop/src/renderer/src/test-utils/renderWithRuntime.tsx`:

```tsx
import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { createI18n } from '@faang/i18n'
import { I18nProvider } from '@faang/i18n/react'
import { catalogs } from '../i18n/catalogs'
import { APP_NAMESPACES } from '../i18n/namespaces'

export function makeRuntime() {
  return createI18n({
    locales: ['en', 'ar'] as const,
    defaultLocale: 'en',
    catalogs: { public: 'catalogs' },
    backend: { load: async (lng, ns) => catalogs[`${lng}:${ns}`] },
  })
}

export async function renderWithRuntime(ui: ReactElement, locale: 'en' | 'ar' = 'en') {
  const runtime = makeRuntime()
  await Promise.all(APP_NAMESPACES.map((ns) => runtime.loadNamespace(locale, ns)))
  return render(
    <I18nProvider runtime={runtime} locale={locale}>
      {ui}
    </I18nProvider>,
  )
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `pnpm --filter @apps/desktop exec vitest run src/renderer/src/__tests__/provider.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/src/renderer/src/i18n apps/desktop/src/renderer/src/test-utils apps/desktop/src/renderer/src/__tests__
git commit -m "feat(desktop): add renderer i18n bridge and provider

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 5: Renderer UI

**Files:**
- Create: `apps/desktop/src/renderer/src/theme.ts`
- Create: `apps/desktop/src/renderer/src/components/Screen.tsx`
- Create: `apps/desktop/src/renderer/src/components/Card.tsx`
- Create: `apps/desktop/src/renderer/src/components/AppButton.tsx`
- Create: `apps/desktop/src/renderer/src/components/LanguageSwitcher.tsx`
- Create: `apps/desktop/src/renderer/src/screens/Home.tsx`
- Create: `apps/desktop/src/renderer/src/screens/Settings.tsx`
- Create: `apps/desktop/src/renderer/src/screens/Profile.tsx`
- Create: `apps/desktop/src/renderer/src/__tests__/screens.test.tsx`
- Modify: `apps/desktop/src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: `useLocale`, `useT` (Task 4 provider); `renderWithRuntime` (Task 4).
- Produces: `Screen`, `Card`, `AppButton`, `LanguageSwitcher`, `Home`, `Settings`, `Profile`, and the tabbed `App`.

- [ ] **Step 1: Create the theme and shared components**

Create `apps/desktop/src/renderer/src/theme.ts`:

```ts
export const colors = {
  background: '#f5f6fb',
  surface: '#ffffff',
  border: '#e3e6ef',
  text: '#111827',
  muted: '#6b7280',
  primary: '#4f46e5',
  primaryContrast: '#ffffff',
  primaryMuted: '#eef2ff',
  danger: '#dc2626',
  success: '#15803d',
} as const

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const
export const radius = { sm: 8, md: 12, lg: 18, pill: 999 } as const
```

Create `apps/desktop/src/renderer/src/components/Screen.tsx`:

```tsx
import type { ReactNode } from 'react'
import { spacing } from '../theme'

export function Screen({ children }: { children: ReactNode }) {
  return (
    <main
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: spacing.xl,
        display: 'grid',
        gap: spacing.lg,
      }}
    >
      {children}
    </main>
  )
}
```

Create `apps/desktop/src/renderer/src/components/Card.tsx`:

```tsx
import type { ReactNode } from 'react'
import { colors, radius, spacing } from '../theme'

export function Card({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        display: 'grid',
        gap: spacing.sm,
      }}
    >
      {children}
    </section>
  )
}
```

Create `apps/desktop/src/renderer/src/components/AppButton.tsx`:

```tsx
import { colors, radius, spacing } from '../theme'

export function AppButton({
  label,
  onClick,
  variant = 'primary',
  testID,
}: {
  label: string
  onClick: () => void
  variant?: 'primary' | 'secondary'
  testID?: string
}) {
  const isPrimary = variant === 'primary'
  return (
    <button
      type="button"
      data-testid={testID}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        borderRadius: radius.md,
        padding: `${spacing.md}px ${spacing.lg}px`,
        fontSize: 16,
        fontWeight: 600,
        color: isPrimary ? colors.primaryContrast : colors.primary,
        background: isPrimary ? colors.primary : colors.primaryMuted,
        border: isPrimary ? 'none' : `1px solid ${colors.primary}`,
      }}
    >
      {label}
    </button>
  )
}
```

Create `apps/desktop/src/renderer/src/components/LanguageSwitcher.tsx`:

```tsx
import { useLocale, useT } from '@faang/i18n/react'
import { colors, radius, spacing } from '../theme'

export function LanguageSwitcher() {
  const { lng, changeLocale } = useLocale()
  const t = useT('common')
  const options: Array<{ code: 'en' | 'ar'; label: string }> = [
    { code: 'en', label: t('language.en') },
    { code: 'ar', label: t('language.ar') },
  ]
  return (
    <div
      style={{
        display: 'inline-flex',
        gap: 3,
        padding: 3,
        borderRadius: radius.pill,
        background: colors.primaryMuted,
      }}
    >
      {options.map((option) => {
        const active = lng === option.code
        return (
          <button
            key={option.code}
            type="button"
            data-testid={`lang-${option.code}`}
            aria-pressed={active}
            onClick={() => changeLocale(option.code)}
            style={{
              cursor: 'pointer',
              border: 'none',
              borderRadius: radius.pill,
              padding: `${spacing.sm}px ${spacing.lg}px`,
              fontSize: 15,
              fontWeight: 600,
              color: active ? colors.text : colors.primary,
              background: active ? colors.surface : 'transparent',
            }}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create the screens**

Create `apps/desktop/src/renderer/src/screens/Home.tsx`:

```tsx
import { useLocale, useT } from '@faang/i18n/react'
import { Card } from '../components/Card'
import { AppButton } from '../components/AppButton'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { colors, spacing } from '../theme'

export function Home({ onNavigate }: { onNavigate: (tab: 'settings' | 'profile') => void }) {
  const t = useT('home')
  const tc = useT('common')
  const { lng, dir } = useLocale()
  return (
    <>
      <Card>
        <strong style={{ color: colors.primary, fontSize: 28 }}>{tc('app.name')}</strong>
        <span style={{ color: colors.muted }}>{tc('app.tagline')}</span>
      </Card>
      <Card>
        <h2 style={{ margin: 0 }}>{t('title')}</h2>
        <p style={{ margin: 0, color: colors.muted }}>{t('subtitle')}</p>
        <p style={{ margin: 0, color: colors.muted }}>{t('greeting', { name: tc('app.name') })}</p>
        <p style={{ margin: 0, color: colors.muted }}>{t('items', { count: 3 })}</p>
      </Card>
      <Card>
        <h3 style={{ margin: 0 }}>{t('currentLanguage')}</h3>
        <span style={{ color: colors.muted }}>{`${tc('language.label')}: ${lng} (${dir})`}</span>
        <LanguageSwitcher />
      </Card>
      <div style={{ display: 'flex', gap: spacing.md }}>
        <AppButton testID="go-settings" label={t('openSettings')} onClick={() => onNavigate('settings')} />
        <AppButton
          testID="go-profile"
          variant="secondary"
          label={t('openProfile')}
          onClick={() => onNavigate('profile')}
        />
      </div>
    </>
  )
}
```

Create `apps/desktop/src/renderer/src/screens/Settings.tsx`:

```tsx
import { useLocale, useT } from '@faang/i18n/react'
import { Card } from '../components/Card'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { colors } from '../theme'

export function Settings() {
  const t = useT('settings')
  const tc = useT('common')
  const { lng, dir } = useLocale()
  return (
    <>
      <Card>
        <h2 style={{ margin: 0 }}>{t('title')}</h2>
        <h3 style={{ margin: 0 }}>{t('language')}</h3>
        <LanguageSwitcher />
        <span style={{ color: colors.muted }}>{`${tc('language.label')}: ${lng} (${dir})`}</span>
      </Card>
      <Card>
        <h3 style={{ margin: 0 }}>{t('direction')}</h3>
        <span style={{ color: colors.muted }}>{tc('language.label')}</span>
        <p style={{ margin: 0, color: colors.muted }}>{t('restartNote')}</p>
      </Card>
    </>
  )
}
```

Create `apps/desktop/src/renderer/src/screens/Profile.tsx`:

```tsx
import { useState } from 'react'
import { useT } from '@faang/i18n/react'
import { Card } from '../components/Card'
import { AppButton } from '../components/AppButton'
import { colors, spacing } from '../theme'

export function Profile() {
  const t = useT('profile')
  const tc = useT('common')
  const tv = useT('validation')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onSave() {
    if (!name.trim()) {
      setSaved(false)
      setError(tv('required', { field: t('name') }))
      return
    }
    if (!email.includes('@')) {
      setSaved(false)
      setError(tv('email'))
      return
    }
    setError(null)
    setSaved(true)
  }

  return (
    <Card>
      <h2 style={{ margin: 0 }}>{t('title')}</h2>
      <label htmlFor="name">{t('name')}</label>
      <input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="email">{t('email')}</label>
      <input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error ? <span style={{ color: colors.danger }}>{error}</span> : null}
      {saved ? <span style={{ color: colors.success }}>{t('saved')}</span> : null}
      <div style={{ marginTop: spacing.sm }}>
        <AppButton testID="save-profile" label={tc('actions.save')} onClick={onSave} />
      </div>
    </Card>
  )
}
```

- [ ] **Step 3: Rewrite the app shell**

Replace `apps/desktop/src/renderer/src/App.tsx`:

```tsx
import { useState } from 'react'
import { useT } from '@faang/i18n/react'
import { DesktopI18nProvider } from './i18n/DesktopI18nProvider'
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { Screen } from './components/Screen'
import { Home } from './screens/Home'
import { Settings } from './screens/Settings'
import { Profile } from './screens/Profile'
import { colors, spacing } from './theme'

type Tab = 'home' | 'settings' | 'profile'

function Shell() {
  const t = useT('common')
  const [tab, setTab] = useState<Tab>('home')
  const tabs: Tab[] = ['home', 'settings', 'profile']
  return (
    <div style={{ minHeight: '100vh', background: colors.background }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.lg,
          padding: `${spacing.md}px ${spacing.xl}px`,
          background: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <strong>{t('app.name')}</strong>
        <nav style={{ display: 'flex', gap: spacing.sm }}>
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              data-testid={`tab-${item}`}
              onClick={() => setTab(item)}
              style={{
                cursor: 'pointer',
                border: 'none',
                borderRadius: 8,
                padding: `${spacing.sm}px ${spacing.md}px`,
                fontWeight: 600,
                color: tab === item ? colors.primaryContrast : colors.text,
                background: tab === item ? colors.primary : 'transparent',
              }}
            >
              {t(`nav.${item}`)}
            </button>
          ))}
        </nav>
        <LanguageSwitcher />
      </header>
      <Screen>
        {tab === 'home' ? <Home onNavigate={setTab} /> : null}
        {tab === 'settings' ? <Settings /> : null}
        {tab === 'profile' ? <Profile /> : null}
      </Screen>
    </div>
  )
}

export default function App() {
  return (
    <DesktopI18nProvider>
      <Shell />
    </DesktopI18nProvider>
  )
}
```

- [ ] **Step 4: Write the failing screens test**

Create `apps/desktop/src/renderer/src/__tests__/screens.test.tsx`:

```tsx
import { screen, waitFor } from '@testing-library/react'
import { Home } from '../screens/Home'
import { Profile } from '../screens/Profile'
import { renderWithRuntime } from '../test-utils/renderWithRuntime'

describe('screens', () => {
  it('renders Home in Arabic', async () => {
    await renderWithRuntime(<Home onNavigate={() => {}} />, 'ar')
    await waitFor(() => expect(screen.getByText('مرحبًا بك في عرض i18n')).toBeTruthy())
  })

  it('shows a validation message when the Profile form is empty', async () => {
    await renderWithRuntime(<Profile />, 'en')
    screen.getByTestId('save-profile').click()
    expect(screen.getByText('Name is required')).toBeTruthy()
  })
})
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @apps/desktop exec vitest run`
Expected: PASS — menu, provider, and screens suites all green.

- [ ] **Step 6: Verify typecheck**

Run: `pnpm --filter @apps/desktop typecheck`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop/src/renderer/src
git commit -m "feat(desktop): add renderer UI with language switcher and tabs

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 6: Docs sync (en + ar)

**Files:**
- Create: `apps/docs/content/docs/en/packages/electron/create-electron-i18n.mdx`
- Create: `apps/docs/content/docs/ar/packages/electron/create-electron-i18n.mdx`
- Create: `apps/docs/content/docs/en/packages/electron/meta.json`
- Create: `apps/docs/content/docs/ar/packages/electron/meta.json`
- Modify: `apps/docs/content/docs/en/packages/meta.json`
- Modify: `apps/docs/content/docs/ar/packages/meta.json`
- Modify: `apps/docs/content/docs/en/packages/stubs/index.mdx`
- Modify: `apps/docs/content/docs/ar/packages/stubs/index.mdx`
- Modify: `apps/docs/content/docs/en/appendix/api-index.mdx`
- Modify: `apps/docs/content/docs/ar/appendix/api-index.mdx`
- Modify: `apps/docs/content/docs/en/appendix/file-map.mdx`
- Modify: `apps/docs/content/docs/ar/appendix/file-map.mdx`

**Interfaces:**
- Consumes: the implemented `@faang/i18n/electron` surface (Task 1) and the `apps/desktop` file layout (Tasks 2–5).
- Produces: en/ar parity at 48 pages per locale with a complete file map.

- [ ] **Step 1: Add the package page (en)**

Create `apps/docs/content/docs/en/packages/electron/create-electron-i18n.mdx`:

```mdx
---
title: createElectronI18n()
description: The Electron runtime — OS-locale detection, electron-store caching, native menu/tray/window surfaces, and an IPC messenger.
---

## Purpose

`createElectronI18n` is the v1.3 Electron entry point. It reuses the kernel `createI18n`, injects the
OS locale from the main process, caches namespaces through `electron-store`, applies the active locale
to the native surfaces (application menu, tray menu, window title), and broadcasts changes to renderer
windows. All Electron APIs arrive as dependency-injection ports, so the runtime itself imports no
`electron` module and stays unit-testable.

## When to Use It

Use it in the Electron **main process**. The app supplies the ports from `electron-store`, `app`,
`Menu`/`Tray`/`dialog`, and `ipcMain`; the returned `runtime` is only needed when the main process
renders text directly (for example the menu labels via `t`).

## Usage

```ts
import { app, BrowserWindow, Menu, Tray, dialog, ipcMain } from 'electron'
import Store from 'electron-store'
import { createElectronI18n } from '@faang/i18n/electron'

const store = new Store<Record<string, string>>()

const { controller } = createElectronI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  catalogs: { 'en:common': enCommon, 'ar:common': arCommon },
  storage: {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => store.set(key, value),
  },
  locale: { getSystemLocale: () => app.getLocale() },
  surfaces: {
    setWindowTitle: (_lng, t) => BrowserWindow.getAllWindows()[0]?.setTitle(t('app.name')),
    setApplicationMenu: (_lng, t) => Menu.setApplicationMenu(Menu.buildFromTemplate(/* … */ [])),
    setTrayMenu: (_lng, t) => tray.setContextMenu(Menu.buildFromTemplate(/* … */ [])),
    showMessageBox: (lng, t) =>
      dialog.showMessageBox({ message: t('desktop.dialog.message'), detail: t('desktop.dialog.detail', { lng }) }),
  },
  messenger: {
    broadcast: (lng) => {
      for (const win of BrowserWindow.getAllWindows()) win.webContents.send('i18n:locale-changed', lng)
    },
    onLocaleSelected: (cb) => {
      ipcMain.handle('i18n:set-locale', (_event, lng: string) => cb(lng))
      return () => ipcMain.removeHandler('i18n:set-locale')
    },
  },
})

const initial = await controller.getInitialLocale()
```

## API

### `createElectronI18n(config)`

<AutoTypeTable path="../../packages/i18n/src/electron/types.ts" name="CreateElectronI18nConfig" />

Returns `ElectronI18n`:

<AutoTypeTable path="../../packages/i18n/src/electron/types.ts" name="ElectronI18n" />

### Ports

<AutoTypeTable path="../../packages/i18n/src/electron/ports.ts" name="ElectronStorage" />

<AutoTypeTable path="../../packages/i18n/src/electron/ports.ts" name="ElectronLocale" />

<AutoTypeTable path="../../packages/i18n/src/electron/ports.ts" name="ElectronSurfaces" />

<AutoTypeTable path="../../packages/i18n/src/electron/ports.ts" name="ElectronMessenger" />

### Controller

<AutoTypeTable path="../../packages/i18n/src/electron/types.ts" name="ElectronController" />

## Parameters and Returns

- `locales` / `defaultLocale` / `fallbackLng` / `defaultNS` mirror the kernel config.
- `catalogs` is a map keyed `` `${lng}:${ns}` `` of bundled resources.
- `storage` is the only required port; `locale`, `surfaces`, and `messenger` are optional.
- `storageKey` overrides the locale key (default `faang-i18n:locale`).
- Returns `{ runtime, controller }`, where `runtime` is a full `I18nRuntime`.

## Behavior and Edge Cases

- `getInitialLocale` prefers the stored locale, then `locale.getSystemLocale()` normalized through the
  kernel `resolveLocale`, then `defaultLocale`. Unsupported stored or system locales are ignored.
- `setLocale` persists the choice, loads the default namespace, applies `setApplicationMenu`,
  `setTrayMenu`, and `setWindowTitle` (each receiving the active `t`), broadcasts through the
  messenger, and emits `{ type: 'locale.switch', from, to }`.
- Caching (Approach A) happens inside `config.backend.load`: storage is read first, then the bundled
  catalog, then storage is written through. The kernel `PersistentStore` remains a no-op because
  `indexedDB` is absent in Electron's main process.
- `subscribeSystemLocale` delegates to the optional locale port subscription.

## Failure Modes

- A corrupt cache entry falls through to the bundled catalog.
- Storage port failures are swallowed; the in-memory cache still serves namespaces.

## Budget Notes

The Electron runtime ships on its own subpath and is not counted against the kernel gzip budget.

## Related

- [I18nProvider](/packages/react/provider)
- [Hooks](/packages/react/hooks)
- [Platform Stubs](/packages/stubs)
```

- [ ] **Step 2: Add the meta files and register the section**

Create `apps/docs/content/docs/en/packages/electron/meta.json`:

```json
{ "title": "Electron", "pages": ["create-electron-i18n"] }
```

Create `apps/docs/content/docs/ar/packages/electron/meta.json`:

```json
{ "title": "Electron", "pages": ["create-electron-i18n"] }
```

In `apps/docs/content/docs/en/packages/meta.json`, add `"electron"` after `"native"`:

```json
{ "title": "Packages", "pages": ["kernel", "cache", "loader", "react", "next", "vite", "native", "electron", "store", "stubs", "tooling"] }
```

Apply the same change to `apps/docs/content/docs/ar/packages/meta.json`.

- [ ] **Step 3: Add the Arabic package page**

Create `apps/docs/content/docs/ar/packages/electron/create-electron-i18n.mdx` with the same structure
and code, translated frontmatter and prose:

```mdx
---
title: createElectronI18n()
description: زمن تشغيل Electron — اكتشاف لغة النظام، والتخزين المؤقت عبر electron-store، وأسطح القائمة والدرج وعنوان النافذة، وموصل IPC.
---

## الغرض

`createElectronI18n` هو نقطة دخول Electron في الإصدار v1.3. يعيد استخدام `createI18n` من النواة، ويحقن
لغة النظام من العملية الرئيسية، ويخزّن مساحات الأسماء مؤقتًا عبر `electron-store`، ويطبّق اللغة النشطة
على الأسطح الأصلية (قائمة التطبيق، وقائمة الدرج، وعنوان النافذة)، ويبثّ التغييرات إلى نوافذ العارض.
تصل جميع واجهات Electron كمنافذ حقن تبعية، لذا لا يستورد زمن التشغيل وحدة `electron` ويظل قابلًا
للاختبار.

## متى تستخدمه

استخدمه في العملية الرئيسية لتطبيق Electron. يوفّر التطبيق المنافذ من `electron-store` و`app`
و`Menu`/`Tray`/`dialog` و`ipcMain`.

## الاستخدام

```ts
import { app, BrowserWindow, Menu, Tray, dialog, ipcMain } from 'electron'
import Store from 'electron-store'
import { createElectronI18n } from '@faang/i18n/electron'

const store = new Store<Record<string, string>>()

const { controller } = createElectronI18n({
  locales: ['en', 'ar'] as const,
  defaultLocale: 'en',
  catalogs: { 'en:common': enCommon, 'ar:common': arCommon },
  storage: {
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => store.set(key, value),
  },
  locale: { getSystemLocale: () => app.getLocale() },
  surfaces: {
    setWindowTitle: (_lng, t) => BrowserWindow.getAllWindows()[0]?.setTitle(t('app.name')),
    setApplicationMenu: (_lng, t) => Menu.setApplicationMenu(Menu.buildFromTemplate([])),
    setTrayMenu: (_lng, t) => tray.setContextMenu(Menu.buildFromTemplate([])),
    showMessageBox: (lng, t) =>
      dialog.showMessageBox({ message: t('desktop.dialog.message'), detail: t('desktop.dialog.detail', { lng }) }),
  },
  messenger: {
    broadcast: (lng) => {
      for (const win of BrowserWindow.getAllWindows()) win.webContents.send('i18n:locale-changed', lng)
    },
    onLocaleSelected: (cb) => {
      ipcMain.handle('i18n:set-locale', (_event, lng: string) => cb(lng))
      return () => ipcMain.removeHandler('i18n:set-locale')
    },
  },
})

const initial = await controller.getInitialLocale()
```

## واجهة البرمجة

### `createElectronI18n(config)`

<AutoTypeTable path="../../packages/i18n/src/electron/types.ts" name="CreateElectronI18nConfig" />

يُعيد `ElectronI18n`:

<AutoTypeTable path="../../packages/i18n/src/electron/types.ts" name="ElectronI18n" />

### المنافذ

<AutoTypeTable path="../../packages/i18n/src/electron/ports.ts" name="ElectronStorage" />

<AutoTypeTable path="../../packages/i18n/src/electron/ports.ts" name="ElectronLocale" />

<AutoTypeTable path="../../packages/i18n/src/electron/ports.ts" name="ElectronSurfaces" />

<AutoTypeTable path="../../packages/i18n/src/electron/ports.ts" name="ElectronMessenger" />

### المتحكم

<AutoTypeTable path="../../packages/i18n/src/electron/types.ts" name="ElectronController" />

## المعاملات والقيم المعادة

- `locales` / `defaultLocale` / `fallbackLng` / `defaultNS` تطابق إعداد النواة.
- `catalogs` خريطة مفاتيحها `` `${lng}:${ns}` `` لموارد الحِزم.
- `storage` هو المنفذ الوحيد المطلوب؛ و`locale` و`surfaces` و`messenger` اختيارية.
- `storageKey` يتجاوز مفتاح اللغة (الافتراضي `faang-i18n:locale`).
- يُعيد `{ runtime, controller }`، حيث `runtime` هو `I18nRuntime` كامل.

## السلوك والحالات الحدّية

- `getInitialLocale` يفضّل اللغة المخزنة، ثم `locale.getSystemLocale()` بعد تطبيعها عبر
  `resolveLocale`، ثم `defaultLocale`. تُتجاهل اللغات غير المدعومة.
- `setLocale` يحفظ الاختيار، ويحمّل مساحة الأسماء الافتراضية، ويطبّق `setApplicationMenu`
  و`setTrayMenu` و`setWindowTitle`، ويبثّ عبر الموصل، ويُصدر `{ type: 'locale.switch', from, to }`.
- التخزين المؤقت (النهج A) يحدث داخل `config.backend.load`: تُقرأ مساحة التخزين أولًا ثم الحزمة
  المضمّنة ثم يُكتب خلالها.

## أنماط الفشل

- إدخال تخزين مؤقت تالف يتراجع إلى الحزمة المضمّنة.
- تُتجاهل أخطاء منفذ التخزين؛ وتظل الذاكرة المؤقتة تخدم مساحات الأسماء.

## ملاحظات الميزانية

يُشحن زمن تشغيل Electron في مسار فرعي خاص ولا يُحتسب ضمن ميزانية النواة.

## ذو صلة

- [I18nProvider](/packages/react/provider)
- [Hooks](/packages/react/hooks)
- [Platform Stubs](/packages/stubs)
```

- [ ] **Step 4: Update the stubs pages**

In `apps/docs/content/docs/en/packages/stubs/index.mdx`, remove the `electron` row from the table and
all prose/example references to `createElectronI18n` and `@faang/i18n/electron`, leaving only `node`.
Run `pnpm --filter @apps/docs exec node scripts/check-parity.mjs` afterwards and apply the identical
removals to `apps/docs/content/docs/ar/packages/stubs/index.mdx`.

- [ ] **Step 5: Update the API index (both locales)**

In `apps/docs/content/docs/en/appendix/api-index.mdx`, add a row for `createElectronI18n` pointing to
the new page (`/packages/electron/create-electron-i18n`). Add the translated row in
`apps/docs/content/docs/ar/appendix/api-index.mdx`.

- [ ] **Step 6: Update the file map (both locales)**

In `apps/docs/content/docs/en/appendix/file-map.mdx`, add every new tracked file: the four
`packages/i18n/src/electron/*.ts` files, the electron test, each `apps/desktop/**` file, and the two
`apps/docs/content/docs/{en,ar}/packages/electron/*` files. Add the matching translated lines to
`apps/docs/content/docs/ar/appendix/file-map.mdx`.

- [ ] **Step 7: Verify docs parity, file map, and build**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`
Expected: `parity check passed (48 en / 48 ar pages)`; `file map covers all <N> tracked source files`;
RTL check passed.

- [ ] **Step 8: Commit**

```bash
git add apps/docs/content/docs
git commit -m "docs(content): document the Electron runtime in en and ar

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

---

### Task 7: Final verification, production bundle, and browser preview

**Files:**
- Modify: `apps/desktop/README.md` (add a "Preview" note if missing)
- Modify: `.superpowers/sdd/progress.md` (ledger, gitignored)

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces: a green `pnpm verify`, emitted Electron bundles, and a live renderer preview URL.

- [ ] **Step 1: Run the full verification gate**

Run: `pnpm verify`
Expected: `EXIT=0` — typecheck, tests, `i18n:extract --ci --dry-run`, `i18n:status`, `i18n:lint`,
build, and budget all pass, including `@apps/desktop` typecheck/test/build and the electron tests.

- [ ] **Step 2: Build the Electron bundles**

Run: `pnpm --filter @apps/desktop build`
Expected: `out/main`, `out/preload`, and `out/renderer` are emitted. Confirm with
`ls apps/desktop/out`.

- [ ] **Step 3: Start the renderer browser preview**

Create a background terminal running the renderer, then request a preview for its port:

```bash
cd /workspace/apps/desktop && pnpm renderer:dev
```

Request the preview for port `5174`, then load it and confirm the Home screen renders in English, the
header switcher shows both locales, and clicking `ar` flips the UI to Arabic with `dir="rtl"`.

- [ ] **Step 4: Update the ledger**

Append a "Task complete" entry for each of Tasks 1–7 to `.superpowers/sdd/progress.md`, including the
preview URL and any deviations. (This file is gitignored.)

- [ ] **Step 5: Commit any remaining tracked changes**

```bash
git add -A
git commit -m "chore(desktop): finalize verification and preview wiring

Co-authored-by: monkeycode-ai <monkeycode-ai@chaitin.com>"
```

(Skip if there are no tracked changes.)

---

## Self-Review

- **Spec coverage:** package runtime + ports (Task 1), app scaffold/toolchain/packaging config (Task 2),
  main-process surfaces + IPC + catalog keys (Task 3), renderer bridge/provider (Task 4), renderer UI
  (Task 5), docs sync en/ar (Task 6), verification + bundle + preview (Task 7). Every spec section maps
  to a task.
- **Placeholder scan:** no TBD/TODO; every code step contains complete code; commands include expected
  output.
- **Type consistency:** `createElectronI18n`/`ElectronController`/`ElectronStorage`/`ElectronLocale`/
  `ElectronSurfaces`/`ElectronMessenger` names match between Task 1 and Tasks 3–4; `CHANNELS` keys
  (`getLocale`/`setLocale`/`localeChanged`) are identical in `src/main/ipc.ts` and
  `src/preload/index.ts`; `buildAppMenuTemplate`/`buildTrayMenuTemplate` signatures match between
  `menu.ts` and its test; `getBridge`/`DesktopBridge`/`DesktopI18nProvider` match between Task 4 and
  Task 5; catalog keys `desktop.*` and `language.*` are used consistently.
```
```
