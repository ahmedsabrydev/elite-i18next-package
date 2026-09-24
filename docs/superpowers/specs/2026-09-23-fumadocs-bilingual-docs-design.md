# Bilingual FAANG-Level Documentation App (FumaDocs) — Design Spec

Date: 2026-09-23
Status: approved (design dialogue); awaiting user review of this document
Deliverable: `apps/docs` — a first-class workspace app documenting the whole monorepo in English and Arabic
Docs engine: [FumaDocs](https://www.fumadocs.dev/) built-in i18n
Depends on: `docs/superpowers/specs/2026-09-13-headless-i18n-monorepo-design.md` (locked v1 package design)

## 1. Problem

v1 of `@faang/i18n` is complete: kernel (`createI18n`), loader, cache, React/Next/Vite adapters,
store adapters, tooling (catalogs, budgets, i18next-cli), and two contract apps (`apps/next-web`,
`apps/vite-web`). What is missing is documentation that a senior/staff engineer can read to
understand — and safely operate — the entire system.

The requirement, verbatim in spirit:

> Build a FAANG-level documentation site that explains **every single file, function, utility, and
> package** we built, in full detail, with **both Arabic and English** multi-language support.

This is a documentation product, not a README dump. It must be:

- **Exhaustive** — every tracked file is accounted for; every exported function and type is documented.
- **Accurate** — signatures and type shapes are derived from the actual source, not retyped by hand.
- **Bilingual with real parity** — every page has a genuine Arabic counterpart with real technical
  prose and correct RTL rendering, not a stub and not machine output.
- **First-class in the workspace** — it builds, typechecks, and is gated by CI like any other app.
- **Staleness-proof** — parity and file coverage are mechanically enforced.

The docs site is the outward face of the package: the place a new engineer lands to understand how
zero-flicker SSR, the catalog protocol, budgets, and the runtime ports fit together.

## 2. Decisions (locked)

| Decision | Choice |
|---|---|
| Docs engine | FumaDocs (framework mode) on Next.js App Router |
| Docs i18n engine | FumaDocs built-in i18n (`defineI18n`, `createI18nMiddleware`, `content/docs/{en,ar}`) |
| Does docs dogfood `@faang/i18n` to render itself? | **No.** Hand-write FumaDocs UI translations. `@faang/i18n` is documented, not used to run the site |
| Locale set | `en` (LTR) + `ar` (RTL) |
| Locales delivery | `parser: 'dir'` → content lives in `content/docs/en` and `content/docs/ar` |
| Coverage model | Module reference (deep page per module) **plus** a file-map appendix enumerating every file |
| API reference strategy | Hybrid: hand-written prose + signatures, with `fumadocs-typescript` auto type tables for key exported types |
| Arabic parity | Full parity on 100% of pages; real translated prose; shared glossary; code/identifiers stay English |
| IA | Layer-first "book" (Approach A) |
| Workspace integration | First-class workspace app: own `build`/`typecheck`/`test` tasks, covered by turbo + CI, excluded from the package's i18next-cli extract globs |
| Audience | New maintainers + senior/staff engineers evaluating or operating the system |

Rejected:

- Diátaxis-first IA (tutorials are thin here; the system is small and layer-oriented).
- Adapter-first IA (buries the kernel, which is the actual intellectual core).
- A single "API" dump page (does not meet "explain everything in detail").
- Relying on an unverified third-party Arabic UI pack — Arabic chrome strings are hand-authored.
- Hand-copying type shapes into prose (guaranteed drift) or full auto-generation of prose (unreadable).
- Adding docs to the `@faang/i18n` extraction gate (docs strings are not package catalog strings).

## 3. Goals and non-goals

### Goals

- Every tracked file is described with its purpose on a single canonical `appendix/file-map` page,
  mechanically verified against `git ls-files`.
- Every module gets one deep page with a fixed rubric: Purpose → Usage → Signatures →
  Parameters/Returns → Behavior & edge cases → Failure modes → Related.
- High-churn exported types are rendered from source via `fumadocs-typescript`, so they cannot drift.
- `/en/**` and `/ar/**` are structurally identical trees; a checker fails CI on any missing twin.
- Arabic pages render `dir="rtl"` with correct technical prose; code blocks remain `dir="ltr"`.
- `pnpm verify` at the repo root covers the docs app end-to-end.
- The site is locally previewable via the `deploy-website` skill.

### Non-goals (v1)

- Versioned documentation (e.g. `/v1/...`).
- Publishing to the public showcase (`publish-website`) — local preview only.
- Locales beyond `en`/`ar`.
- Searching source code on the docs site.
- Auto-generating prose from source; prose is authored by hand.
- Translating the docs *content* through `@faang/i18n`/i18next — that pipeline is intentionally not
  involved (avoids conflating the documented system with the site's rendering).

## 4. Architecture

### 4.1 Stack

- Next.js `16.3.5` (Turbopack), React `19.3.0`, React DOM `19.3.0` — matches `apps/next-web`.
- `fumadocs-core` `16.15.13`, `fumadocs-ui` `16.15.13`, `fumadocs-mdx` `15.4.3`,
  `fumadocs-typescript` `5.4.1`.
- Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/postcss`, `postcss.config.mjs`, `app/global.css`).
- `lucide-react` for FumaDocs icon options.
- Package name: `@apps/docs` (private, `"private": true`).

### 4.2 File tree

```
apps/docs/
  package.json
  next.config.mjs
  postcss.config.mjs
  tsconfig.json
  proxy.ts                    # createI18nMiddleware (Next 16 proxy convention)
  README.md                   # how to run the docs app
  scripts/
    check-parity.mjs          # en/ar twin + frontmatter check
    check-file-map.mjs        # appendix file-map covers every tracked file
  lib/
    i18n.ts                   # defineI18n
    layout.shared.tsx         # baseOptions(locale) + Arabic UI translations
    source.ts                 # loader()
    dir.ts                    # dirFor(lang): en->ltr, ar->rtl
  app/
    global.css                # Tailwind v4 + fumadocs-ui theme + RTL overrides
    api/search/route.ts       # fumadocs-core search (i18n-aware)
    [lang]/
      layout.tsx              # ROOT layout: <html lang dir>, body, RootProvider, DocsLayout
      [[...slug]]/page.tsx    # renders MDX, MDX components, generateStaticParams
  components/
    mdx-components.tsx        # defaultComponents + AutoTypeTable/TypeTable
  content/docs/en/...         # ~30 .mdx pages + meta.json
  content/docs/ar/...         # mirrored ~30 .mdx pages + meta.json
```

### 4.3 i18n configuration

`lib/i18n.ts`:

```ts
import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'ar'],
  parser: 'dir',
});
```

`proxy.ts` exports the i18n middleware with the standard FumaDocs matcher
(`/((?!api|_next/static|_next/image|favicon.ico).*)`) so static assets and the search route are not
locale-rewritten.

`lib/layout.shared.tsx`:

- `baseOptions(locale)` returns the shared `DocsLayout` props (nav title, links, GitHub url, `i18n`).
- `translations` is built from `i18n.translations().extend(uiTranslations()).add({ ar: { ... } })`.
  The `ar` block is hand-authored (`displayName: 'العربية'`, "Search", "On this page", "Edit on
  GitHub", table-of-contents/heading labels, etc.).
- `en` UI strings come from the default pack; `displayName: 'English'`.

`app/[lang]/layout.tsx` (the root layout — there is no `app/layout.tsx`, since every route lives
under `[lang]`):

- Resolves `lang` from params, validates against `i18n.languages` (404 otherwise).
- Renders `<html lang={lang} dir={dirFor(lang)}>`.
- Wraps children in `<RootProvider i18n={i18nProvider(translations, lang)}>` with `DocsLayout`
  configured from `baseOptions(lang)` and the `loader()` page tree for that locale.

`lib/source.ts` uses `loader({ i18n, ... })` from `fumadocs-core/source` bound to the MDX collection.
Because `parser: 'dir'` derives slugs from `content/docs/{lang}`, per-locale resolution is explicit:
`source.getPage(slug, lang)`, `source.getPageTree(lang)`, `source.getPages(lang)`, and
`source.generateParams()` (which includes the locale).

### 4.4 RTL handling

- `dirFor(lang)` maps `ar -> rtl`, `en -> ltr`; the value is set on `<html>`.
- `app/global.css` adds a small, documented RTL section:
  - `[dir='rtl'] pre, [dir='rtl'] code { direction: ltr; text-align: left; }` so code stays LTR.
  - Logical-property fixes for any FumaDocs chrome that hard-codes left/right (sidebar gutters,
    TOC rail, search dialog) using `:dir()` / `[dir='rtl']` selectors.
- FumaDocs UI v16 is assumed to largely use logical utilities; the CSS section is the documented
  mitigation for the rest. RTL is verified, not assumed (see §7).

### 4.5 Search

- `app/api/search/route.ts` uses FumaDocs' default search server bound to `source`, configured with
  `i18n`. Each locale indexes its own page tree so Arabic queries hit Arabic pages.
- The search dialog is provided by `RootProvider` with the `i18nProvider` locale; Arabic placeholder
  and labels come from the hand-authored `ar` translation block.

## 5. Content model

### 5.1 IA (Approach A — layer-first book)

Per locale:

```
getting-started/  index, installation, quick-start, core-concepts
architecture/     overview, zero-flicker, catalog-protocol, i18next-model,
                  observability, security-and-failure
packages/
  kernel/         create-i18n, resolve-config, defaults, types, locale-protocol
  cache/          lru
  loader/         memory, persistent, inflight, backend
  react/          provider, hooks, trans, context
  next/           middleware, server, html
  vite/           plugin, routes
  store/          zustand, redux
  stubs/          index
  tooling/        catalogs-and-budgets, i18next-cli
guides/           add-namespace, add-locale, typed-keys, testing,
                  performance-budgets, migrate-from-i18next
apps/             next-web, vite-web
appendix/         file-map, api-index, glossary, troubleshooting
```

Total: ~30 pages per locale (mirrored exactly). `meta.json` per directory controls ordering and
section titles in both locales.

### 5.2 Page template (module pages)

Each `packages/**` page follows the same rubric, reviewed for substance:

1. **Purpose** — what problem the module solves, in one paragraph.
2. **When to use it** — vs the alternatives (e.g. memory vs persistent cache tiers).
3. **Usage** — a minimal, runnable example.
4. **Signature(s)** — hand-written for readability; auto type table for exported types.
5. **Parameters / Returns** — tables (name, type, default, description).
6. **Behavior & edge cases** — ordering, concurrency, fallbacks, RTL/digit behavior where relevant.
7. **Failure modes** — what errors surface, what is swallowed, observable events.
8. **Budget / performance notes** — gzip budget impact where applicable.
9. **Related** — cross-links to neighboring modules and guides.

Concept/guide pages use prose structure appropriate to their kind but must still be complete and
cross-linked; they end with a "Related" block.

### 5.3 API reference (hybrid)

- The `AutoTypeTable` **React Server Component** (`fumadocs-typescript/ui`), not the remark plugin,
  is registered in `components/mdx.tsx` with a generator built by `createGenerator(...)` and a
  filesystem cache at `.next/fumadocs-typescript`. This needs no `source.config.ts` and keeps the
  Macro API (`defineDocs` in `lib/source.ts`) as the single content source:

  ```tsx
  import defaultComponents from 'fumadocs-ui/mdx';
  import type { MDXComponents } from 'mdx/types';
  import { createGenerator, createFileSystemGeneratorCache } from 'fumadocs-typescript';
  import { AutoTypeTable, type AutoTypeTableProps } from 'fumadocs-typescript/ui';

  const generator = createGenerator({
    cache: createFileSystemGeneratorCache('.next/fumadocs-typescript'),
  });

  export function getMDXComponents(components?: MDXComponents) {
    return {
      ...defaultComponents,
      AutoTypeTable: (props: Partial<AutoTypeTableProps>) => (
        <AutoTypeTable {...props} generator={generator} />
      ),
      ...components,
    } satisfies MDXComponents;
  }
  ```

- Type tables are used for the high-churn exported types: `CreateI18nConfig`, `ResolvedConfig`,
  `I18nRuntime`, `I18nEvent`, `NamespaceLoader`, `LocaleSnapshot`, `I18nRedirect`, `I18nManifest`,
  `LocaleState`.
- **Path convention:** `path` is relative to the app's `cwd` (turbo runs scripts with cwd =
  `apps/docs`), e.g. `../../packages/i18n/src/core/types.ts`. The convention and one worked example
  are documented in `appendix/api-index.mdx` so future pages stay consistent.
- Pages using `AutoTypeTable` must be statically generated (they are, via
  `generateStaticParams`), since the component reads the filesystem at build time.
- Fields hidden from public docs use tsdoc `@internal` in source (no doc-only forks of the types).

### 5.4 File-map appendix

- `appendix/file-map.mdx` enumerates every tracked file with a one-line purpose, grouped by
  workspace/area (root config, `packages/i18n/src/**`, tests, `catalogs/**`, `apps/next-web`,
  `apps/vite-web`, `apps/docs`, tooling/scripts).
- `scripts/check-file-map.mjs` compares the set of paths listed in the page against `git ls-files`
  (with an explicit allowlist for files intentionally omitted, e.g. lockfile, generated output) and
  fails on any missing or unknown entry.

### 5.5 Bilingual content standard

- `en` and `ar` trees have identical file paths and identical `meta.json` structure.
- Arabic pages contain real technical prose, not transliteration or stubs. Shared terminology follows
  `appendix/glossary.mdx` (e.g. "namespace" → "مساحة أسماء", "catalog" → "كتالوج", "flicker" →
  "وميض", "budget" → "ميزانية الحجم"). Glossary is itself bilingual.
- Identifiers, file paths, type names, commands, and code stay English and LTR in both locales.
- Frontmatter requires `title` (localized) in every page; `description` is required on section
  index pages.

## 6. Workspace & CI integration

- `pnpm-workspace.yaml` already globs `apps/*`; `apps/docs` is picked up with no change.
- `apps/docs/package.json` exposes:
  - `dev` — `next dev`
  - `build` — `next build`
  - `start` — `next start`
  - `typecheck` — `tsc --noEmit` (or `next typegen` + `tsc`, matching `apps/next-web`)
  - `test` — `node scripts/check-parity.mjs && node scripts/check-file-map.mjs`
- `turbo.json` needs no new task definitions; docs participates in the existing `build`,
  `typecheck`, `test`, and `lint` tasks.
- Root `i18next.config.ts`: add `apps/docs/**` to `extract.ignore` so docs prose is never treated as
  a package catalog source and the `extract --ci` gate stays green.
- `pnpm verify` at the root therefore typechecks, tests, and builds the docs app along with the
  rest of the monorepo.
- Docs must not add entries to `packages/i18n` budgets or manifests.

## 7. Verification

1. **Parity (`scripts/check-parity.mjs`)** — every `content/docs/en/**` page has an `ar` twin and
   vice versa (comparing paths and `meta.json` keys); every page has a non-empty `title`
   frontmatter; section index pages have `description`. Non-zero exit on any violation.
2. **File map (`scripts/check-file-map.mjs`)** — the file-map appendix covers every tracked file
   (allowlist for intentional omissions). Non-zero exit on missing/extra.
3. **Build** — `next build` must statically generate every `/en/**` and `/ar/**` route present in
   the content tree; a route present in one locale but not the other fails the build.
4. **RTL smoke** — a checker (script or part of parity) asserts the rendered `/ar` output contains
   `dir="rtl"` on `<html>` and that at least one code block carries `dir="ltr"`.
5. **Typecheck** — `tsc --noEmit` clean, including `proxy.ts`, `components/mdx.tsx`, and MDX component typings.
6. **Extract gate** — `pnpm i18n:types` / `extract --ci` remains clean after the ignore update.
7. **Local preview** — served via the `deploy-website` skill against `next dev`/`next start`.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| FumaDocs UI RTL gaps in chrome (sidebar/TOC/search) | Targeted `[dir='rtl']` CSS overrides in `global.css`; RTL verified by the smoke check; overrides are the documented escape hatch |
| Verbose monorepo-relative `auto-type-table` paths drift or get mis-typed | Centralize type tables in canonical API pages; document the path convention with a worked example; typecheck catches bad MDX component props where possible |
| Docs build becomes the slowest/flakiest `pnpm verify` step | Keep content static (fully static generation), no runtime data fetching; the build is a normal Next static export of MDX |
| Arabic quality degrades into literal translation | Glossary is authoritative; each page is reviewed against it; page rubric forces concrete prose |
| File map goes stale as code changes | `check-file-map.mjs` runs in `pnpm test`, so a new file fails CI until documented |
| Content tree grows beyond the ~30-page target and balloons scope | The inventory in §5.1 is the committed scope for v1; additions are a follow-up |

## 9. Acceptance criteria

- `apps/docs` exists as a workspace package and is built, typechecked, and tested by `pnpm verify`.
- `next build` emits all `/en/**` and `/ar/**` routes; `/ar` HTML has `dir="rtl"`.
- The `en` and `ar` content trees are structurally identical and pass `check-parity.mjs`.
- Every tracked file appears in `appendix/file-map.mdx`; `check-file-map.mjs` passes.
- Key exported types are rendered via `auto-type-table` from `packages/i18n/src` (no hand-copied
  shapes for those types).
- No docs string enters the `@faang/i18n` extract gate; `extract --ci` stays clean.
- The site is previewable via the `deploy-website` skill.

## 10. Implementation notes

- Mirror the Next 16 conventions already proven in `apps/next-web` (proxy file, `[lang]` segment,
  `generateStaticParams`).
- `parser: 'dir'` means slugs never include the locale; the `[lang]` segment carries it.
- The `AutoTypeTable` generator cache lives under `.next/` (gitignored); type tables are therefore
  read at build time, so keep MDX pages statically generated.
- Arabic UI labels are authored, not imported from a third-party pack, so there is no dependency on
  an unverified translation bundle.
- Keep the docs app free of runtime dependencies on `@faang/i18n`; the only contact points are
  reading source for type tables and reading `git ls-files` for the file map.
