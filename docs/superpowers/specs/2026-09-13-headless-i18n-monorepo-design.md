# Headless i18n Monorepo Package — Design Spec

Date: 2026-09-13
Status: approved (design dialogue); awaiting user review of this document
Package working name: `@faang/i18n` (renameable; API is the contract)

## 1. Problem

Build one headless, typed, i18next-native i18n package once, then reuse it across a React-centric product suite:

- Next.js App Router
- React + Vite, with React Router 7 or TanStack Router
- React Native / iOS (post-v1)
- Node.js + Express (post-v1)
- Electron (post-v1)

Constraints that are non-negotiable:

- No flash, no flicker, no layout shift on first paint or locale switch
- Tiny JS: tree-shaken subpath exports; unused runtimes never enter the graph
- 2G-safe: shell first, namespaces as network units, parallel loads, cache, prefetch caps
- Type-safe keys (TypeScript 7.x, React 19.x, latest i18next + i18next-cli)
- Developer chooses Zustand, Redux Toolkit, or Context for locale metadata

This is not a new i18n engine. i18next is the engine. This package is a curated kernel, a catalog protocol, and thin runtime ports.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Catalog ownership | Hybrid: package owns shared namespaces; apps own product namespaces |
| Locale source of truth (web) | URL prefix (`/en`, `/ar`). Cookie/header only redirect. Native store later for RN/Electron |
| Loading | Shell inline/SSR + route-lazy namespaces. Prefetch on hover/idle. SWR cache |
| Day-1 locales | `en` + `ar` (LTR + RTL). More locales are config, not architecture |
| Topology | One package, subpath exports |
| Keys | Nested JSON + `t(key, { defaultValue })` in source |
| v1 scope | Core + React + Next App Router + Vite. RN / Express / Electron later, same API |
| Kernel | i18next-native + thin ports. No hexagonal rewrite. No Paraglide-style compiler |
| Formatters | `Intl` only. No moment/dayjs in the kernel |
| Arabic digits | Latin (`latn`) by default in SaaS dashboards; `arab` numbering opt-in |
| Locale state | URL owns locale on web. Store is a mirror of `{ lng, dir, status }` only. Strings stay in i18next |

Rejected:

- App-owned-only catalogs (duplication across the suite)
- Package-owned product copy (clients diverge)
- Cookie-painted first HTML (flicker / weak SEO)
- Full locale in the JS bundle (kills 2G and RN)
- Compiler-first catalogs (fights i18next-cli, TMS, OTA, Express)
- Natural-language keys as the system default
- Shipping all six runtimes in v1

## 3. Goals and non-goals

### Goals

- One `createI18n(config)` for every app. Apps do not call raw `i18next.init` unless they opt out.
- First byte / first frame already has the correct `lang`, `dir`, and shell copy.
- Namespace = one JSON file = one HTTP or `import()` chunk.
- O(1) locale resolve and cache lookup. O(k) network for k namespaces a route needs, parallel, never O(all locales x all ns).
- i18next-cli is the extract/types/lint/status toolchain. We wrap it; we do not reimplement SWC analysis.
- Unused subpaths (`/next`, `/zustand`, `/native`) are tree-shaken out.

### Non-goals (v1)

- Locize or any TMS as a required backend (interface allows HTTP later)
- ICU MessageFormat runtime
- A UI component kit
- Screenshot visual regression farm
- Real-device 2G lab
- Vue / Svelte / Angular
- Shipping `/native`, `/node`, `/electron` implementations (exports may exist as typed stubs that throw a clear "not in v1" error)

## 4. Package shape

Single package `@faang/i18n`, `sideEffects: false`, Node-native ESM + DTS.

```
@faang/i18n            core: createI18n, protocol, types, backend, detector
@faang/i18n/react      I18nProvider, useT, Trans, useLocale
@faang/i18n/next       App Router: middleware, RSC t(), html attrs, route ns
@faang/i18n/vite       Vite plugin + locale-prefix helpers for RR7 / TanStack
@faang/i18n/cli        thin wrapper around i18next-cli
@faang/i18n/catalogs   shared JSON (common, errors, auth, validation, datetime)
@faang/i18n/zustand    LocaleSnapshot store adapter (thin)
@faang/i18n/redux      LocaleSnapshot RTK slice (thin)
@faang/i18n/native     stub in v1
@faang/i18n/node       stub in v1
@faang/i18n/electron   stub in v1
```

Importing `/next` must not pull Metro, Express, Electron, Zustand, or Redux.

### Bundle budgets (gzip, measured in CI)

| Unit | Max |
|---|---|
| Kernel JS on top of `i18next` | 8–12 KB |
| Shell catalogs per locale (`common` + `errors`) | 8–12 KB |
| Any single namespace | 16 KB |
| Any single namespace (soft min) | 1.5 KB (split/merge guidance, not a CI fail) |
| Types / manifest | ~1 KB |

`i18next` + `react-i18next` are peer dependencies. They are not re-bundled.

### Runtime graph

```
createI18n(config)
  -> language detector (URL | cookie | header | storage)
  -> backend: shell inline + lazy import/HTTP
  -> cache: memory Map -> IndexedDB (web) / AsyncStorage (later)
  -> formatter: Intl
  -> react-i18next (web) | i18next (node, later)
```

## 5. Namespace protocol

Namespaces are the unit of network, cache, tree-shake, and types.

### Layers

| Layer | Owner | When loaded | Budget (gzip, per locale) |
|---|---|---|---|
| `shell` | this package | blocking, before first paint / in SSR HTML | 8–12 KB total |
| `shared` | this package | first use of that feature | 4–8 KB each |
| `app` | consuming app | with the route or feature chunk | 6–16 KB each |
| `lazy` | either | idle / hover / interaction | 4–12 KB each |

### v1 package namespaces

- `common` — buttons, chrome, empty states (shell)
- `errors` — HTTP / generic failures (shell)
- `auth` — login / signup / session (shared; lazy until auth surface)
- `validation` — form / zod messages (shared; with the form surface)
- `datetime` — relative time copy (shared; on first format use)

Apps add `dashboard`, `billing`, `settings`, `onboarding`, and so on, same file shape.

### Hard rules

- One namespace = one JSON file = one chunk. Never a mega `translation.json`.
- Split a namespace when gzip exceeds 16 KB (`dashboard` -> `dashboard` + `dashboardCharts`). Namespace ids are `[a-z][a-zA-Z0-9]*` — no `.` or `:` in the id (those are separators).
- Merge when under 1.5 KB and always co-loaded.
- Default NS: `common`.
- Fallback chain: requested lng -> `fallbackLng` (`en`) -> `defaultValue` -> key.
- Day-1 supported locales: `['en', 'ar']`. `nonExplicitSupportedLngs: true` so `en-US` maps to `en`, `ar-EG` to `ar`. No `ar-SA` dialect file in v1. Adding a locale later is a config + catalog change; `createI18n` is generic over the locale union the app passes in.
- JSON is nested objects. Leaf key segments and namespace ids must not contain `.` or `:`. The call site uses `keySeparator: '.'` and `nsSeparator: ':'`: `t('login.submit', { ns: 'auth', defaultValue: 'Sign in' })` or `useT('auth')` then `t('login.submit')`. `t('auth:login.submit')` is allowed and equivalent.
- Missing key in production: never throw. Return `defaultValue` or key. Report once, sampled.
- Never paint English chrome on an `/ar` URL if `ar` shell is cached or SSR-inlined.

### Load graph

```
boot:
  detect lng from URL                 O(1)
  apply html lang + dir               sync, before paint
  load shell[lng]                     inline or 1 request
route enter:
  load route ns list                  Promise.all, cached
  suspense only the route slot, never chrome
hover / idle:
  prefetch next route ns              max 2 concurrent
```

Cache key: `i18n:{lng}:{ns}:{contenthash}`.

## 6. Zero-flicker contract

Flicker is lang/dir/copy arriving after first paint. It is forbidden.

Forbidden sequence:

1. HTML paints `en` LTR
2. JS hydrates, detects `ar`
3. Text swaps and layout flips RTL

### Bootstrap order (web)

1. Resolve `lng` from the URL prefix (`/en` | `/ar`). Cookie and `Accept-Language` are used only to 307-redirect onto a prefixed URL, never to paint the wrong locale.
2. Write `<html lang dir>` in the same response as body copy.
3. Inline or SSR-embed `shell[lng]` in the HTML. No extra RTT before first text.
4. Hydrate with the same `lng` and the same shell resources (`initialI18nStore` / react-i18next SSR).
5. Lazy namespaces may suspense inside a route slot. Chrome never waits on them.

### Next.js App Router

- Middleware: if the path has no locale, 307 to `/{lng}/...` using cookie then `Accept-Language` then default. Matcher excludes `_next` and static assets.
- `generateStaticParams` for `en` and `ar`.
- Root layout is a Server Component. `getHtmlAttributes(lng)` sets `lang` and `dir`.
- Server `t()` for chrome and RSC. Client `useT` only on interactive islands.
- Client islands reuse the server instance payload. No second `i18next.init`.

### Vite + React Router 7 / TanStack Router

- Locale is a route prefix (`/$lng/...`), not a client store for first paint.
- SSR: same as Next — `lang`/`dir` + shell in the HTML template.
- CSR-only: the locale layout route is a blocking gateway. Mount nothing (or a dir-correct blank) until shell is in memory. Never mount English chrome first.

### Language switch

- Navigate to the sibling URL (`/en/settings` -> `/ar/settings`).
- Prefetch target locale shell on hover/focus of the switcher.
- Keep scroll. Swap `lng`/`dir` in one frame after target shell is cached.
- `i18n.changeLanguage()` is not the primary web API.

### Fonts

- Preload only the active script subset (`en`: latin, `ar`: arabic).
- `font-display: optional` or equivalent. Loading both subsets on `en` is a defect.

## 7. Loader, cache, network

Apps never construct `i18next-http-backend` themselves. One backend interface:

```ts
loadNamespace(lng: Locale, ns: Namespace): Promise<void>
prefetch(lng: Locale, ns: Namespace): void
has(lng: Locale, ns: Namespace): boolean
```

`loadNamespace` resolves when the resource is in the i18next store. Resource JSON is not part of the public return type.

### Transport order (first hit wins)

| Priority | Where | When |
|---|---|---|
| 0 | SSR / RSC payload | first paint |
| 1 | Memory `Map` | same session, O(1) |
| 2 | IndexedDB (web) | repeat visit, stale-while-revalidate |
| 3 | Dynamic `import()` of hashed JSON | same-origin, content-hashed |
| 4 | HTTP GET `/locales/{lng}/{ns}.{hash}.json` | CDN; same interface, optional `publicPath` |

v1 ships 0–3. Transport 4 is enabled when `publicPath` is set.

### Network rules

- Shell is never a post-paint request on SSR. CSR: one blocking request on the locale layout.
- Route namespaces: `Promise.all`. No waterfall.
- In-flight dedup: `{lng, ns}` shares one Promise.
- Timeout: 3s. Then `fallbackLng` + `defaultValue`. Never hang the route.
- Retry: one retry, 300ms delay. GET only.
- Prefetch: `requestIdleCallback` + link hover. Max 2 concurrent prefetches.
- JSON via brotli at the edge. `JSON.parse` only. No `eval`.

### Cache

- Key: `i18n:{lng}:{ns}:{hash}` from the build manifest.
- SWR: matching hash renders immediately. Hash mismatch swaps that namespace only.
- LRU, about 50 entries. Evict unused locales first. Always keep current + fallback.
- `catalogVersion` on the package busts hashes when the protocol changes.

### Tree-shake

- One file per `{lng, ns}`. Bundler emits one chunk per file.
- A namespace never imported by the app is not in the graph.
- Core does not import all locales. Manifest is `{ lng, ns, hash, bytes }[]`.

### Complexity

- Resolve locale: O(1)
- `has` / memory lookup: O(1)
- Load k namespaces: O(k) parallel network
- Memory index: O(loaded ns), not O(all locales x all ns)

## 8. Adapters (v1)

One `createI18n()` instance. Adapters bind it to a renderer. They do not own catalogs.

### `/react`

- `I18nProvider` — instance, `lng`, `dir`
- `useT(ns)` — bound `t` + `ready`; optional suspense if ns is not cached
- `Trans` — react-i18next `Trans` with generated types
- `useLocale()` — `{ lng, dir, isRtl, changeLocale }`
- `changeLocale` navigates to the sibling URL

### `/next`

- Middleware helper: prefix locale, set cookie, skip assets
- `createI18nServer()` — RSC `getT(ns)`. No hooks
- `generateStaticParams` helper for `[lng]`
- `getHtmlAttributes(lng)` -> `{ lang, dir }`
- `defineRouteI18n({ ns: ['dashboard'] })` returns `{ ns, load(lng) }` where `load` is `Promise.all(ns.map(n => runtime.loadNamespace(lng, n)))`. Layouts/pages await `load` in the server component or route loader. It is not a compiler macro.
- Client islands import `/react` and hydrate from `initialI18nStore`

### `/vite`

- Plugin: hashed locale chunks + manifest
- Locale prefix helpers work for both React Router 7 and TanStack Router
- v1 contract app (`apps/vite-web`) uses React Router 7. TanStack Router is the same helpers plus a documented route-tree snippet, not a second contract app in v1
- Optional SSR injects shell + `lang`/`dir` into the template
- CSR: locale layout is the blocking gateway

### Target app bootstrap

```ts
import { createI18n } from '@faang/i18n'

export const i18n = createI18n({
  locales: ['en', 'ar'],
  defaultLocale: 'en',
  defaultNS: 'common',
  catalogs: {
    public: '/locales',
    shared: '@faang/i18n/catalogs',
  },
})
```

Store adapters are separate imports (`@faang/i18n/react` Context is default). Do not pass `store: 'zustand'` into `createI18n` — that would force the kernel to reference every adapter and break tree-shaking. Use `import { createZustandLocaleStore } from '@faang/i18n/zustand'` in the app that already has Zustand.

## 9. Locale state adapters

On the web, the URL is the source of truth. Stores are projections so components can subscribe without reading the whole i18next instance.

```ts
type LocaleSnapshot = {
  lng: 'en' | 'ar'
  dir: 'ltr' | 'rtl'
  isRtl: boolean
  status: 'hydrated' | 'switching' | 'loading-ns'
}
```

Rules:

- Selectors are O(1). Subscribe to `lng` / `dir` / `status`, never to catalogs.
- Web write path: `setLocale(lng)` -> navigate. Store updates after the URL commits.
- RN / Electron (later): store + native persistence is the source of truth.
- During switch: keep previous chrome mounted until target shell is cached, then swap in one frame.
- Translation strings never live in Zustand or Redux.

v1:

- Context adapter lives in `/react` and is the default. No extra import.
- Zustand and RTK adapters live in `/zustand` and `/redux`. They implement the same `LocaleSnapshot`. An app that does not import them pays 0 bytes.
- `createI18n` has no `store` field.

## 10. Types, CLI, extract

i18next-cli is the toolchain. This package ships `i18next.config` defaults and `pnpm i18n *` scripts.

### Config

```ts
import { defineConfig } from 'i18next-cli'

export default defineConfig({
  locales: ['en', 'ar'],
  extract: {
    input: ['src/**/*.{ts,tsx}'],
    output: 'locales/{{language}}/{{namespace}}.json',
    defaultNS: 'common',
    keySeparator: '.',
    nsSeparator: ':',
  },
})
```

### Loop

```
t('login.submit', { ns: 'auth', defaultValue: 'Sign in' })
  -> pnpm i18n extract
  -> pnpm i18n types
  -> pnpm i18n status      CI: missing ar keys fail
  -> pnpm i18n lint        CI: hardcoded JSX fails
```

Dev: `extract --watch --with-types`.
CI: `extract --ci --dry-run`, `types --ci`, `status`, `lint`.

### Type rules

- `t()` is typed per namespace. Unknown key is a compile error.
- Selector API is enabled: `t($ => $.login.submit)` where the binding has ns.
- Interpolation names in `t()` must match `{{name}}` in JSON (cli lint).
- Shared catalogs and app catalogs merge via module augmentation so both `common:save` and `billing:invoice.paid` autocomplete.

Key rename uses `i18next-cli rename-key`. No regex-across-JSON refactors.

## 11. RTL, formatting, interpolation

Arabic is `dir`, fonts, plurals, and interpolation order.

- `en` -> `ltr`, `ar` -> `rtl`. Unknown locale -> `ltr` + one warning, then map to default.
- Examples and any package chrome use CSS logical properties (`margin-inline-start`), never physical `left`/`right`.
- `interpolation.escapeValue: true` on every non-React surface. React still must not use user input as a key.
- `returnEmptyString: false`. Empty extract placeholders must not blank chrome.
- Plurals: CLDR. `en`: `one`/`other`. `ar`: `zero`/`one`/`two`/`few`/`many`/`other`. `status` fails CI if an Arabic form is missing.
- Context suffixes stay in the same namespace (`friend_male`).
- Dates: `Intl.DateTimeFormat`. Numbers/currency: `Intl.NumberFormat`. Relative: `Intl.RelativeTimeFormat` behind `datetime` ns. Lists: `Intl.ListFormat` when needed.
- v1 default numbering system is `latn` even for `ar`. Apps may pass `numberingSystem: 'arab'` per formatter.
- No moment, no dayjs, no ICU runtime in v1.
- Mixed LTR inside RTL: document Unicode isolates; do not require them as an API.

## 12. Failure, security, observability

### Failure matrix

| Failure | User sees | System does |
|---|---|---|
| Missing key | `defaultValue` or key | sampled `missing_key` event |
| Missing `ar` plural form | English for that key only | CI should have caught; runtime warn once |
| Namespace 404 or timeout | chrome stays; slot skeleton then fallbackLng | one retry; then degrade |
| Corrupt JSON | previous cache kept | drop that hash |
| Detector yields `fr` | map to `en` | no 404 loop |
| Hydration `lang`/`dir`/shell mismatch | forbidden | P0 bug |

### Security

- Locale from the URL is allowlisted: `en` | `ar` only. Anything else -> default locale. Prevents prefix cache-poison and open redirects.
- Catalogs are data. `JSON.parse` only.
- No TMS write keys in client bundles.
- Interpolation escaped on non-React surfaces.

### Observability

Optional, no vendor SDK in the kernel:

```ts
onEvent(event: {
  type: 'ns.load' | 'ns.cache_hit' | 'ns.timeout' | 'missing_key' | 'locale.switch'
  lng: string
  ns?: string
  ms?: number
  bytes?: number
  cached?: boolean
}): void
```

Apps wire this to OpenTelemetry or Sentry.

### CI budgets (tests, not documentation)

- shell gzip > 12 KB: fail
- any ns gzip > 16 KB: fail
- `status` not 100% for `ar` on extracted keys: fail
- hydration mismatch fixture: fail

## 13. Testing

| Layer | Asserts | Fails when |
|---|---|---|
| Unit | `createI18n`, allowlist, fallback, inflight dedup, LRU | wrong lng, double fetch |
| Contract | gzip budgets, file shape, manifest | shell or ns over budget |
| Types | `t('nope')` is a type error | key drift |
| RTL | `getHtmlAttributes('ar').dir === 'rtl'` | LTR leak |
| Adapter | Next middleware 307; Vite layout blocks on shell | cookie-painted HTML |
| Hydration | SSR `lang`/`dir`/shell === client | flicker |
| Extract CI | extract dry-run, status, lint | hardcoded strings, missing `ar` plurals |
| Perf | k ns = k parallel requests; cache hit = 0 network | waterfall |

Fixtures: `en`/`ar` catalogs, one missing key, one oversize namespace, one mixed bidi string. First paint on `/ar` must not contain English chrome.

## 14. Repository layout (pnpm + Turborepo)

```
/
  packages/i18n/          the library (this spec)
  apps/next-web/          v1 contract app: App Router
  apps/vite-web/          v1 contract app: Vite + one router
  locales/                not at repo root; catalogs live in packages/i18n/catalogs
                          and in each app's locales/
  docs/superpowers/       specs and later plans
```

Library internals (`packages/i18n`):

```
src/
  core/          createI18n, config types, allowlist
  backend/       memory, idb, import, http
  cache/         LRU + SWR
  detect/        url, cookie, header
  format/        Intl wrappers
  protocol/      namespace names, budgets, manifest types
  react/         provider, hooks
  next/          middleware, rsc, html attrs
  vite/          plugin, route helpers
  store/         context, zustand, redux
  catalogs/      en + ar JSON
  cli/           re-export i18next-cli wiring
```

Turborepo pipelines: `build`, `test`, `i18n:extract`, `i18n:status`, `i18n:lint`, `budget`.

Vite contract app must include `server.allowedHosts: ['.monkeycode-ai.live']` because this environment previews on that wildcard. That is an app config concern, not a kernel concern.

## 15. Public API (v1)

```ts
type Dir = 'ltr' | 'rtl'
type DefaultLocale = 'en' | 'ar'
type Namespace = 'common' | 'errors' | 'auth' | 'validation' | 'datetime' | (string & {})

type CreateI18nConfig<L extends string = DefaultLocale> = {
  locales: readonly L[]
  defaultLocale: L
  defaultNS?: Namespace
  fallbackLng?: L
  catalogs: {
    public: string
    shared?: string
  }
  publicPath?: string
  numberingSystem?: 'latn' | 'arab'
  onEvent?: (event: I18nEvent) => void
}

function createI18n<const L extends string = DefaultLocale>(
  config: CreateI18nConfig<L>,
): I18nRuntime<L>

type I18nRuntime<L extends string = DefaultLocale> = {
  instance: typeof i18next
  config: ResolvedConfig<L>
  loadNamespace: (lng: L, ns: Namespace) => Promise<void>
  prefetch: (lng: L, ns: Namespace) => void
  getHtmlAttributes: (lng: L) => { lang: L; dir: Dir }
}
```

`changeLocale` is not on the kernel. `/react` `useLocale().changeLocale` and `/next` / `/vite` helpers need a `navigate` function from the host router. The kernel only expose `getHtmlAttributes` and `loadNamespace`. This keeps Next, React Router, and TanStack from leaking into core.

React:

```ts
function I18nProvider(props: {
  children: React.ReactNode
  locale: string
  navigate?: (href: string) => void
}): JSX.Element
function useT(ns?: Namespace): TFunction
function useLocale(): LocaleSnapshot & { changeLocale: (lng: string) => void }
```

Next:

```ts
function createI18nServer(runtime: I18nRuntime): { getT: (ns?: Namespace) => Promise<TFunction> }
function i18nMiddleware(runtime: I18nRuntime): NextMiddleware
function localeStaticParams(runtime: I18nRuntime): { lng: string }[]
function defineRouteI18n(opts: { ns: Namespace[] }): {
  ns: Namespace[]
  load: (lng: string) => Promise<void>
}
```

No other public exports in v1. Plugin authors use the i18next instance via `runtime.instance`.

## 16. Complexity, network, performance summary

| Operation | Cost |
|---|---|
| Detect locale from URL | O(1) |
| Map region tag to supported lng | O(1) lookup |
| Memory cache get/set | O(1) |
| LRU evict | O(1) with Map + doubly linked list, or O(n) simple list with n <= 50 |
| Load k route namespaces | O(k) parallel requests, k typically 1–3 |
| Prefetch cap | 2 |
| First paint extra RTT (SSR) | 0 for shell |
| First paint extra RTT (CSR) | 1 for shell, then parallel route ns |
| JS cost of unused adapter | 0 (subpath not imported) |
| Worst 2G path | shell (~10 KB) + 1 route ns (~8 KB) + latin-or-arabic font subset |

## 17. v1 delivery order (implementation, after this spec is accepted)

1. `packages/i18n` core: types, `createI18n`, allowlist, fallback, memory backend, inflight dedup
2. Catalogs `en`/`ar` for `common` + `errors` (shell), then `auth` / `validation` / `datetime`
3. i18next-cli config, extract, types, status, lint, budget tests
4. `/react` provider + hooks
5. `/next` middleware, RSC, hydration fixture
6. `/vite` plugin + CSR blocking layout
7. Context store complete; Zustand + RTK thin adapters
8. Contract apps `apps/next-web` and `apps/vite-web` used as living tests
9. Typed stubs for `/native` `/node` `/electron`

Post-v1, in order: React Native (AsyncStorage detector, no URL), Express (`Accept-Language` + cookie, no flicker because no HTML paint), Electron (`electron-store`).

## 18. Risks

| Risk | Mitigation |
|---|---|
| Next App Router server/client i18next double init | one factory, `initialI18nStore`, hydration test |
| i18next-cli vs TS 7 types lag | pin cli; selector API behind our generated `i18next.d.ts` |
| Arabic plural forms ignored by authors | CI `status` fails the build |
| Namespace sprawl | budget CI + min/max guidance |
| CSR Vite still flickers | blocking locale layout; no chrome until shell ready |
| Store and URL diverge | web writes only go through navigation |

## 19. Out of scope until explicitly requested

- Locize sync commands in the happy path
- Inlang / Paraglide
- Natural-language keys mode
- Per-tenant catalog overrides (the protocol can host them later as extra namespaces)
- Pseudo-locale (`en-XA`) — useful, add as a dev-only locale in a later pass if requested
