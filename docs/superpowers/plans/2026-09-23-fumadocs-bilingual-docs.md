# FumaDocs Bilingual Documentation Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/docs`, a FumaDocs site that documents every file, function, utility, and package of `@faang/i18n` in English and Arabic with full RTL parity.

**Architecture:** A Next.js 16 + FumaDocs workspace app under `apps/docs`. Content lives in mirrored `content/docs/en` and `content/docs/ar` trees rendered through FumaDocs' built-in `defineI18n` / `createI18nMiddleware` and Macro API (`defineDocs`). Key exported types are rendered from source via the `fumadocs-typescript` `AutoTypeTable` server component. Two node scripts (`check-parity.mjs`, `check-file-map.mjs`) and a post-build `check-rtl.mjs` make parity, coverage, and RTL mechanically enforced in CI.

**Tech Stack:** Next.js 16.3.5 (Turbopack), React 19.3.0, FumaDocs 16.15.13 (`fumadocs-core`, `fumadocs-ui`), `fumadocs-mdx` 15.4.3, `fumadocs-typescript` 5.4.1, Tailwind CSS 4, TypeScript 7.0.2, Node >= 22.

## Global Constraints

- Package name `@apps/docs`, `"private": true`; docs app lives at `apps/docs` with `app/`, `lib/`, `components/`, `content/`, `scripts/` at the app root (no `src/`).
- Node >= 22; pnpm workspace; Turborepo; do not edit `pnpm-workspace.yaml` (already globs `apps/*`).
- Docs must NOT depend on `@faang/i18n` at runtime; contact with the package is only reading source files (type tables) and `git ls-files` (file map).
- Docs content is NOT routed through i18next; FumaDocs' built-in i18n renders it. `i18next.config.ts` must ignore `apps/docs/**`.
- Locales: `en` (default) + `ar`. Every page path must exist in both trees.
- All content is MDX. Frontmatter requires a localized `title`; section/landing pages also require `description`.
- Identifiers, file paths, type names, commands, and code stay English/LTR in both locales.
- Arabic prose is real technical prose; terminology follows `appendix/glossary.mdx`; no stubs/transliteration.
- Commits: Conventional Commits, one task = one commit. Never commit secrets. Do not use `rm`/destructive commands.
- Verification per content task: `node scripts/check-parity.mjs` then `pnpm --filter @apps/docs build`.

### Content Standard (page rubric)

Every `packages/**` page uses this heading structure (Arabic headings mirror the meaning):

```
## Purpose
## When to Use It
## Usage
## API
## Parameters and Returns
## Behavior and Edge Cases
## Failure Modes
## Budget Notes
## Related
```

- `## API` contains hand-written signatures and, for pages with an auto type table, an
  `<AutoTypeTable path="../../packages/i18n/src/<file>" name="<Type>" />`.
- Every heading must have real content. No heading may be left as a placeholder.
- Concept/guide/app pages use prose-appropriate headings but always end with `## Related`.
- `AutoTypeTable` `path` is relative to `apps/docs` cwd, e.g.
  `../../packages/i18n/src/core/types.ts`.

### Page inventory (identical paths under `content/docs/en` and `content/docs/ar`)

| Path (under `content/docs/<lang>/`) | EN title | AR title |
|---|---|---|
| `index.mdx` | Introduction | مقدمة |
| `getting-started/installation.mdx` | Installation | التثبيت |
| `getting-started/quick-start.mdx` | Quick Start | البدء السريع |
| `getting-started/core-concepts.mdx` | Core Concepts | المفاهيم الأساسية |
| `architecture/overview.mdx` | Architecture Overview | نظرة عامة على المعمارية |
| `architecture/zero-flicker.mdx` | Zero-Flicker SSR | العرض من الخادم دون وميض |
| `architecture/catalog-protocol.mdx` | Catalog Protocol | بروتوكول الكتالوج |
| `architecture/i18next-model.mdx` | The i18next Model | نموذج i18next |
| `architecture/observability.mdx` | Observability | المراقبة |
| `architecture/security-and-failure.mdx` | Security and Failure Modes | الأمان وأنماط الفشل |
| `packages/kernel/create-i18n.mdx` | createI18n() | الدالة createI18n() |
| `packages/kernel/resolve-config.mdx` | resolveConfig() | الدالة resolveConfig() |
| `packages/kernel/defaults.mdx` | Defaults and Constants | القيم الافتراضية والثوابت |
| `packages/kernel/types.mdx` | Core Types | الأنواع الأساسية |
| `packages/kernel/locale-protocol.mdx` | Locale Protocol | بروتوكول تحديد اللغة |
| `packages/cache/lru.mdx` | LruCache | ذاكرة LRU المؤقتة |
| `packages/loader/memory.mdx` | MemoryStore | مخزن الذاكرة |
| `packages/loader/persistent.mdx` | PersistentStore | المخزن الدائم |
| `packages/loader/inflight.mdx` | InflightLoader | مُحمّل الطلبات المتزامنة |
| `packages/loader/backend.mdx` | namespaceChunkLoader and TieredBackend | محمّل الحِزم والواجهة الخلفية |
| `packages/react/provider.mdx` | I18nProvider | المزوّد I18nProvider |
| `packages/react/hooks.mdx` | Hooks: useT, useLocale, useI18nRuntime | الخطافات |
| `packages/react/trans.mdx` | Trans | المكوّن Trans |
| `packages/react/context.mdx` | Context and Types | السياق والأنواع |
| `packages/next/middleware.mdx` | i18nMiddleware | الوسيط i18nMiddleware |
| `packages/next/server.mdx` | Server Helpers | مساعدات الخادم |
| `packages/next/html.mdx` | getHtmlAttributes | سمات HTML |
| `packages/vite/plugin.mdx` | i18nVitePlugin | إضافة Vite |
| `packages/vite/routes.mdx` | Route Helpers | مساعدات المسارات |
| `packages/store/zustand.mdx` | Zustand | متجر Zustand |
| `packages/store/redux.mdx` | Redux Toolkit | متجر Redux |
| `packages/stubs/index.mdx` | Native, Node and Electron Stubs | هياكل المنصات الأخرى |
| `packages/tooling/catalogs-and-budgets.mdx` | Catalogs and Budgets | الكتالوجات والميزانيات |
| `packages/tooling/i18next-cli.mdx` | i18next-cli | أداة i18next-cli |
| `guides/add-a-namespace.mdx` | Add a Namespace | إضافة مساحة أسماء |
| `guides/add-a-locale.mdx` | Add a Locale | إضافة لغة |
| `guides/typed-keys.mdx` | Type-Safe Keys | مفاتيح آمنة الأنواع |
| `guides/testing.mdx` | Testing | الاختبار |
| `guides/performance-budgets.mdx` | Performance and Budgets | الأداء والميزانيات |
| `guides/migrate-from-i18next.mdx` | Migrate from Raw i18next | الترحيل من i18next المباشر |
| `apps/next-web.mdx` | Next.js Contract App | تطبيق Next.js المرجعي |
| `apps/vite-web.mdx` | Vite Contract App | تطبيق Vite المرجعي |
| `appendix/api-index.mdx` | API Index | فهرس الواجهات البرمجية |
| `appendix/file-map.mdx` | File Map | خريطة الملفات |
| `appendix/glossary.mdx` | Glossary | المصطلحات |
| `appendix/troubleshooting.mdx` | Troubleshooting | حل المشكلات |

### File structure (created/modified by this plan)

```
apps/docs/
  package.json
  next.config.mjs
  postcss.config.mjs
  tsconfig.json
  next-env.d.ts                 # generated by next build
  proxy.ts
  README.md
  lib/{i18n.ts,dir.ts,source.ts,layout.shared.tsx}
  components/mdx.tsx
  app/global.css
  app/[lang]/layout.tsx
  app/[lang]/[[...slug]]/page.tsx
  app/api/search/route.ts
  scripts/{check-parity.mjs,check-file-map.mjs,check-rtl.mjs}
  content/docs/en/**  (46 pages + meta.json)
  content/docs/ar/**  (46 pages + meta.json)
i18next.config.ts                 # MODIFY: ignore apps/docs/**
.github/workflows/ci.yml          # unchanged (pnpm verify already runs docs via turbo)
```

---

### Task 1: Scaffold the docs app and get `/en` and `/ar` building

**Files:**
- Create: `apps/docs/package.json`
- Create: `apps/docs/next.config.mjs`
- Create: `apps/docs/postcss.config.mjs`
- Create: `apps/docs/tsconfig.json`
- Create: `apps/docs/proxy.ts`
- Create: `apps/docs/lib/i18n.ts`
- Create: `apps/docs/lib/dir.ts`
- Create: `apps/docs/lib/source.ts`
- Create: `apps/docs/lib/layout.shared.tsx`
- Create: `apps/docs/components/mdx.tsx`
- Create: `apps/docs/app/global.css`
- Create: `apps/docs/app/[lang]/layout.tsx`
- Create: `apps/docs/app/[lang]/[[...slug]]/page.tsx`
- Create: `apps/docs/app/api/search/route.ts`
- Create: `apps/docs/content/docs/en/index.mdx`
- Create: `apps/docs/content/docs/en/meta.json`
- Create: `apps/docs/content/docs/ar/index.mdx`
- Create: `apps/docs/content/docs/ar/meta.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `i18n` (`lib/i18n.ts`), `source` (`lib/source.ts`), `translations` and `baseOptions(locale)` (`lib/layout.shared.tsx`), `dirFor(lang)` (`lib/dir.ts`), `getMDXComponents(components?)` (`components/mdx.tsx`). Later tasks import these exact names.

- [ ] **Step 1: Create `apps/docs/package.json`**

```json
{
  "name": "@apps/docs",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev -p 4000",
    "build": "next build",
    "start": "next start -p 4000",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "fumadocs-core": "16.15.13",
    "fumadocs-mdx": "15.4.3",
    "fumadocs-typescript": "5.4.1",
    "fumadocs-ui": "16.15.13",
    "next": "16.3.5",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.1.0",
    "@types/mdx": "^2.0.13",
    "@types/node": "22.10.2",
    "@types/react": "19.2.2",
    "@types/react-dom": "19.2.2",
    "tailwindcss": "^4.1.0",
    "typescript": "7.0.2"
  }
}
```

- [ ] **Step 2: Create config files**

`apps/docs/next.config.mjs`:

```js
import { createMDX } from 'fumadocs-mdx/next';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
};

const withMDX = createMDX();

export default withMDX(config);
```

`apps/docs/postcss.config.mjs`:

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

`apps/docs/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "allowJs": true,
    "incremental": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `apps/docs/proxy.ts`**

```ts
import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '@/lib/i18n';

export default createI18nMiddleware(i18n);

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 4: Create `lib/i18n.ts`, `lib/dir.ts`, `lib/source.ts`**

`apps/docs/lib/i18n.ts`:

```ts
import { defineI18n } from 'fumadocs-core/i18n';

export const i18n = defineI18n({
  defaultLanguage: 'en',
  languages: ['en', 'ar'],
  parser: 'dir',
});
```

`apps/docs/lib/dir.ts`:

```ts
export function dirFor(lang: string): 'ltr' | 'rtl' {
  return lang === 'ar' ? 'rtl' : 'ltr';
}
```

`apps/docs/lib/source.ts`:

```ts
import { defineDocs } from 'fumadocs-mdx/macro';
import { loader } from 'fumadocs-core/source';
import { i18n } from '@/lib/i18n';

const docs = defineDocs({ dir: 'content/docs' });

export const source = loader({
  baseUrl: '/',
  i18n,
  source: docs.toFumadocsSource(),
});
```

- [ ] **Step 5: Create `lib/layout.shared.tsx` (hand-authored Arabic UI labels)**

```tsx
import { i18n } from '@/lib/i18n';
import { uiTranslations } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .add({
    en: { displayName: 'English' },
    ar: {
      displayName: 'العربية',
      search: 'بحث',
      searchNoResult: 'لا توجد نتائج',
      toc: 'في هذه الصفحة',
      lastUpdate: 'آخر تحديث',
      previousPage: 'السابق',
      nextPage: 'التالي',
      chooseLanguage: 'اختر اللغة',
      editOnGithub: 'عدّل على GitHub',
      toggleTheme: 'تبديل المظهر',
    },
  });

export function baseOptions(locale: string): BaseLayoutProps {
  return {
    nav: { title: locale === 'ar' ? 'أفانغ i18n' : '@faang/i18n' },
    githubUrl: 'https://github.com/ahmedsabrydev/elite-i18next-package',
  };
}
```

> Note: if `fumadocs-ui/i18n` does not export `uiTranslations` under this version, keep
> `i18n.translations().add({...})` and copy the English defaults from the installed package's
> `dist` before building. Verify in Step 8; adjust keys until the build and typecheck pass.

- [ ] **Step 6: Create `components/mdx.tsx`**

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

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
```

- [ ] **Step 7: Create `app/global.css`, `app/[lang]/layout.tsx`, `app/[lang]/[[...slug]]/page.tsx`, `app/api/search/route.ts`**

`apps/docs/app/global.css`:

```css
@import 'tailwindcss';
@import 'fumadocs-ui/css/neutral.css';
@import 'fumadocs-ui/css/preset.css';

/* Keep code LTR even in RTL locales */
[dir='rtl'] pre,
[dir='rtl'] code {
  direction: ltr;
  text-align: left;
}
```

`apps/docs/app/[lang]/layout.tsx`:

```tsx
import '@/app/global.css';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { i18nProvider } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';
import { source } from '@/lib/source';
import { dirFor } from '@/lib/dir';
import { baseOptions, translations } from '@/lib/layout.shared';

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  if (!i18n.languages.includes(lang as (typeof i18n.languages)[number])) notFound();

  return (
    <html lang={lang} dir={dirFor(lang)} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider i18n={i18nProvider(translations, lang)}>
          <DocsLayout {...baseOptions(lang)} tree={source.getPageTree(lang)}>
            {children}
          </DocsLayout>
        </RootProvider>
      </body>
    </html>
  );
}
```

`apps/docs/app/[lang]/[[...slug]]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import { source } from '@/lib/source';
import { getMDXComponents } from '@/components/mdx';

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ lang: string; slug?: string[] }>;
}): Promise<Metadata> {
  const { lang, slug } = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}

export default async function Page(props: {
  params: Promise<{ lang: string; slug?: string[] }>;
}) {
  const { lang, slug } = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();
  const MDX = page.data.body;
  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}
```

`apps/docs/app/api/search/route.ts`:

```ts
import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const { GET } = createFromSource(source, {
  language: 'english',
});
```

- [ ] **Step 8: Create the two index pages and root meta.json, then install and build**

`apps/docs/content/docs/en/index.mdx`:

```mdx
---
title: Introduction
description: A headless, typed, i18next-native internationalization package for React-centric product suites.
---

## What this is

`@faang/i18n` is a curated kernel, a catalog protocol, and thin runtime ports on top of i18next.
Use the sidebar to read the architecture, the package modules, and the guides.

## Start here

- [Installation](/getting-started/installation)
- [Quick Start](/getting-started/quick-start)
- [Core Concepts](/getting-started/core-concepts)
```

`apps/docs/content/docs/ar/index.mdx`:

```mdx
---
title: مقدمة
description: حزمة تدويل بلا واجهة، مكتوبة الأنواع، وأصلية في i18next لتطبيقات React.
---

## ما هذه الحزمة

`@faang/i18n` هي نواة مركّزة وبروتوكول كتالوج ومنافذ تشغيل رقيقة فوق i18next.
استخدم الشريط الجانبي لقراءة المعمارية ووحدات الحزمة والأدلة.

## ابدأ من هنا

- [التثبيت](/getting-started/installation)
- [البدء السريع](/getting-started/quick-start)
- [المفاهيم الأساسية](/getting-started/core-concepts)
```

`apps/docs/content/docs/en/meta.json`:

```json
{ "pages": ["getting-started", "architecture", "packages", "guides", "apps", "appendix"] }
```

`apps/docs/content/docs/ar/meta.json`:

```json
{ "pages": ["getting-started", "architecture", "packages", "guides", "apps", "appendix"] }
```

Install from the repo root (auto-confirms, foreground because later steps depend on it):

```bash
pnpm install
```

- [ ] **Step 9: Run the build and confirm both locales are generated**

Run: `pnpm --filter @apps/docs build`
Expected: build succeeds; output includes routes for `/en` and `/ar`. `check-rtl.mjs` is added in
Task 2, which also wires it into this `build` script.

- [ ] **Step 10: Commit**

```bash
git add apps/docs
git commit -m "feat(docs): scaffold FumaDocs bilingual app with en/ar routing"
```

---

### Task 2: Parity and RTL verification scripts

**Files:**
- Create: `apps/docs/scripts/check-parity.mjs`
- Create: `apps/docs/scripts/check-rtl.mjs`
- Modify: `apps/docs/package.json` (add `prebuild`, `test`, and RTL-checking `build`)

**Interfaces:**
- Consumes: `content/docs/{en,ar}` trees; Next build output under `apps/docs/.next/server/app`.
- Produces: `check-parity.mjs` (exit 0/1, run by `test` and `prebuild`), `check-rtl.mjs` (exit 0/1, run by `build`).

- [ ] **Step 1: Write `scripts/check-parity.mjs`**

```js
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const docsDir = join(root, 'content', 'docs');
const locales = ['en', 'ar'];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function relFiles(locale) {
  return walk(join(docsDir, locale))
    .map((f) => relative(join(docsDir, locale), f))
    .filter((f) => f.endsWith('.mdx'))
    .sort();
}

const errors = [];
const sets = Object.fromEntries(locales.map((l) => [l, relFiles(l)]));

for (const locale of locales) {
  for (const file of sets[locale]) {
    const text = readFileSync(join(docsDir, locale, file), 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) {
      errors.push(`${locale}/${file}: missing frontmatter block`);
      continue;
    }
    if (!/^title:\s*\S+/m.test(fm[1])) errors.push(`${locale}/${file}: missing title`);
    const isSection =
      file === 'index.mdx' || file.endsWith('/index.mdx') || file.split('/').length === 1;
    if (isSection && !/^description:\s*\S+/m.test(fm[1])) {
      errors.push(`${locale}/${file}: section page missing description`);
    }
  }
}

const [a, b] = locales;
const onlyA = sets[a].filter((f) => !sets[b].includes(f));
const onlyB = sets[b].filter((f) => !sets[a].includes(f));
for (const f of onlyA) errors.push(`en-only page (missing ar): ${f}`);
for (const f of onlyB) errors.push(`ar-only page (missing en): ${f}`);

if (errors.length > 0) {
  console.error('parity check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log(`parity check passed (${sets.en.length} en / ${sets.ar.length} ar pages)`);
```

- [ ] **Step 2: Write `scripts/check-rtl.mjs`**

```js
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const arPath = join(root, '.next', 'server', 'app', 'ar.html');
const enPath = join(root, '.next', 'server', 'app', 'en.html');

const errors = [];

if (!existsSync(arPath) || !existsSync(enPath)) {
  console.error(
    `RTL check failed: expected prerendered HTML at ${arPath} and ${enPath}. ` +
      'Confirm the /en and /ar routes are statically generated.',
  );
  process.exit(1);
}

const ar = readFileSync(arPath, 'utf8');
const en = readFileSync(enPath, 'utf8');

if (!/<html[^>]*\blang="ar"/.test(ar)) errors.push('ar.html missing lang="ar"');
if (!/<html[^>]*\bdir="rtl"/.test(ar)) errors.push('ar.html missing dir="rtl"');
if (!/<html[^>]*\bdir="ltr"/.test(en)) errors.push('en.html missing dir="ltr"');
if (!/<pre[^>]*\bdir="ltr"/.test(ar)) {
  console.error('note: no <pre dir="ltr"> found in ar.html; code-block direction is CSS-applied');
}

if (errors.length > 0) {
  console.error('RTL check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('RTL check passed (ar: lang=ar dir=rtl, en: dir=ltr)');
```

- [ ] **Step 3: Verify the checker fails when a page is missing**

Temporarily create a stray file `apps/docs/content/docs/en/getting-started/__tmp.mdx` with a
frontmatter title and no `ar` twin, then run `pnpm --filter @apps/docs test`.
Expected: FAIL with `en-only page (missing ar): getting-started/__tmp.mdx`.

- [ ] **Step 4: Remove the stray file and verify the checker passes**

Delete the temporary file (via the editor, not a destructive shell command), then:

Run: `pnpm --filter @apps/docs test`
Expected: `parity check passed (...)` and exit 0.

- [ ] **Step 5: Wire the scripts into `apps/docs/package.json`**

Replace the `scripts` block with:

```json
"scripts": {
  "dev": "next dev -p 4000",
  "prebuild": "node scripts/check-parity.mjs",
  "build": "next build && node scripts/check-rtl.mjs",
  "start": "next start -p 4000",
  "test": "node scripts/check-parity.mjs",
  "typecheck": "tsc --noEmit"
},
```

- [ ] **Step 6: Verify RTL check passes after a build**

Run: `pnpm --filter @apps/docs build`
Expected: `... RTL check passed ...`. If the HTML path differs, inspect `apps/docs/.next/server/app`
and update `check-rtl.mjs` to the actual prerendered path.

- [ ] **Step 7: Commit**

```bash
git add apps/docs/scripts apps/docs/package.json
git commit -m "test(docs): enforce en/ar parity and RTL output"
```

---

### Task 3: Workspace and toolchain integration

**Files:**
- Modify: `i18next.config.ts`
- Create: `apps/docs/README.md`

**Interfaces:**
- Consumes: root `turbo.json`, root `package.json` (unchanged).
- Produces: docs excluded from the package extract gate; docs participates in `pnpm verify`.

- [ ] **Step 1: Exclude docs from i18next extraction**

In `i18next.config.ts`, add `'apps/docs/**'` to `extract.ignore`:

```ts
    ignore: ['**/__tests__/**', '**/*.test.{ts,tsx}', '**/*.test-d.ts', 'apps/docs/**'],
```

- [ ] **Step 2: Write `apps/docs/README.md`**

```md
# @apps/docs

Bilingual (English/Arabic) FumaDocs site documenting the `@faang/i18n` monorepo.

## Commands

- `pnpm --filter @apps/docs dev` — start the docs dev server on port 4000
- `pnpm --filter @apps/docs build` — build, then verify RTL output
- `pnpm --filter @apps/docs test` — verify en/ar content parity
- `pnpm --filter @apps/docs typecheck` — typecheck

## Content

Pages live in `content/docs/en` and `content/docs/ar`. Both trees must stay identical in
structure; `scripts/check-parity.mjs` enforces this. Auto type tables read from
`packages/i18n/src` relative to this directory.
```

- [ ] **Step 3: Verify the extract gate stays clean**

Run: `pnpm i18n:extract --ci --dry-run`
Expected: exit 0, no changes attributed to docs content.

- [ ] **Step 4: Verify the whole pipeline recognizes docs**

Run: `pnpm typecheck && pnpm test`
Expected: both pass; turbo lists `@apps/docs` among executed packages.

- [ ] **Step 5: Commit**

```bash
git add i18next.config.ts apps/docs/README.md
git commit -m "chore(docs): wire docs app into the workspace pipeline"
```

---

### Task 4: Content — introduction and Getting Started

**Files:**
- Create: `content/docs/{en,ar}/getting-started/installation.mdx`
- Create: `content/docs/{en,ar}/getting-started/quick-start.mdx`
- Create: `content/docs/{en,ar}/getting-started/core-concepts.mdx`
- Create: `content/docs/{en,ar}/getting-started/meta.json`

**Interfaces:**
- Consumes: `createI18n`, subpath exports of `@faang/i18n` (source: `packages/i18n/src/index.ts`, `packages/i18n/package.json`).
- Produces: the first three navigation pages in both locales.

- [ ] **Step 1: Create both `getting-started/meta.json` files**

`content/docs/en/getting-started/meta.json`:

```json
{ "title": "Getting Started", "pages": ["installation", "quick-start", "core-concepts"] }
```

`content/docs/ar/getting-started/meta.json`:

```json
{ "title": "البدء", "pages": ["installation", "quick-start", "core-concepts"] }
```

- [ ] **Step 2: Write the English pages**

Use real content (read `packages/i18n/package.json` for the exact subpath exports and
`packages/i18n/src/index.ts` for the exported names):

`content/docs/en/getting-started/installation.mdx`:

```mdx
---
title: Installation
description: Install @faang/i18n and its peer dependencies, then choose your runtime transport.
---

## Requirements

Node.js 22 or later, and one of the supported peer dependencies for the runtime you use.

## Install

_Add the exact `pnpm add @faang/i18n i18next` command and the optional peers for React, Vite, Next.js, Zustand, and Redux Toolkit, copied from the peerDependencies block of `packages/i18n/package.json`._

## Subpath Exports

_Add a table of every entry in the `exports` map of `packages/i18n/package.json` with the runtime it targets._

## Related

- [Quick Start](/getting-started/quick-start)
```

`content/docs/en/getting-started/quick-start.mdx`:

```mdx
---
title: Quick Start
description: Create a runtime, load a namespace, and render a translated string.
---

## Create a Runtime

_Show a minimal `createI18n({...})` call with `locales`, `defaultLocale`, and `catalogs`, then a `loadNamespace` and `getT` call, taken from the public API in `packages/i18n/src/core/create-i18n.ts`._

## Render in React

_Show `I18nProvider` and `useT` from `packages/i18n/src/react/index.ts`._

## Next Steps

- [Core Concepts](/getting-started/core-concepts)
- [The React Adapter](/packages/react/hooks)

## Related

- [Installation](/getting-started/installation)
```

`content/docs/en/getting-started/core-concepts.mdx`:

```mdx
---
title: Core Concepts
description: Runtime, catalog, namespace, shell, and locale — the five ideas that explain the whole design.
---

## Runtime

_Define the runtime object produced by `createI18n`; cite the `I18nRuntime` type in `packages/i18n/src/core/types.ts`._

## Catalogs and Namespaces

_Explain the catalog protocol and the shell-versus-lazy namespace split; cite `SHARED_NAMESPACES` and `SHELL_NAMESPACES` in `packages/i18n/src/catalogs/index.ts`._

## Locale Resolution

_Explain the URL-first rule and the `{ lng, dir, status }` store mirror; cite `packages/i18n/src/react/context.ts`._

## Related

- [Architecture Overview](/architecture/overview)
```

- [ ] **Step 3: Write the Arabic pages**

Mirror each English page file-for-file with Arabic frontmatter titles
(التثبيت / البدء السريع / المفاهيم الأساسية), Arabic headings, and real technical prose that
covers the same sections. Keep code, identifiers, and file paths in English and LTR. Terminology
follows the glossary (add the terms here and reuse them in `appendix/glossary.mdx` in Task 13).

- [ ] **Step 4: Run the parity check**

Run: `pnpm --filter @apps/docs test`
Expected: `parity check passed (...)`.

- [ ] **Step 5: Build**

Run: `pnpm --filter @apps/docs build`
Expected: success; new routes appear under `/en/getting-started` and `/ar/getting-started`.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/content/docs
git commit -m "docs(content): add introduction and getting started in en and ar"
```

---

### Task 5: Content — Architecture

**Files:**
- Create: `content/docs/{en,ar}/architecture/{overview,zero-flicker,catalog-protocol,i18next-model,observability,security-and-failure}.mdx`
- Create: `content/docs/{en,ar}/architecture/meta.json`

**Interfaces:**
- Consumes: `packages/i18n/src/core/create-i18n.ts`, `packages/i18n/src/loader/backend.ts`, `packages/i18n/src/catalogs/index.ts`, `packages/i18n/src/obs/events.ts`, and `docs/superpowers/specs/2026-09-13-headless-i18n-monorepo-design.md`.
- Produces: six architecture pages per locale.

- [ ] **Step 1: Create both `architecture/meta.json` files**

EN:

```json
{ "title": "Architecture", "pages": ["overview", "zero-flicker", "catalog-protocol", "i18next-model", "observability", "security-and-failure"] }
```

AR:

```json
{ "title": "المعمارية", "pages": ["overview", "zero-flicker", "catalog-protocol", "i18next-model", "observability", "security-and-failure"] }
```

- [ ] **Step 2: Write each English page**

Titles: Architecture Overview, Zero-Flicker SSR, Catalog Protocol, The i18next Model,
Observability, Security and Failure Modes. Each page must explain the mechanism concretely and
cite the named source files. Required coverage per page:

- `overview.mdx` — the layer diagram (kernel, cache, loader, adapters, stores, tooling) and the
  request lifecycle from URL to rendered string.
- `zero-flicker.mdx` — shell inline/SSR, `dir` on first paint, why cookie-painted HTML is
  rejected; cite `packages/i18n/src/next/html.ts`.
- `catalog-protocol.mdx` — one JSON file per namespace, hash naming, shell vs lazy; cite
  `packages/i18n/catalogs/en/common.json` and `packages/i18n/scripts/check-budget.mjs`.
- `i18next-model.mdx` — nested keys, `defaultNS`, `keySeparator`, `nsSeparator`, `defaultValue`.
- `observability.mdx` — every `I18nEvent` variant and when it is emitted; cite
  `packages/i18n/src/obs/events.ts`.
- `security-and-failure.mdx` — timeout behavior, non-timeout failures, and the deliberate absence
  of a generic failure event.

Each page ends with `## Related` linking to adjacent architecture pages.

- [ ] **Step 3: Write the Arabic counterparts**

Mirror all six files with the Arabic titles from the inventory, real prose, and LTR code.

- [ ] **Step 4: Run parity and build**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`
Expected: both pass; six new routes per locale.

- [ ] **Step 5: Commit**

```bash
git add apps/docs/content/docs
git commit -m "docs(content): document architecture in en and ar"
```

---

### Task 6: Content — Kernel

**Files:**
- Create: `content/docs/{en,ar}/packages/kernel/{create-i18n,resolve-config,defaults,types,locale-protocol}.mdx`
- Create: `content/docs/{en,ar}/packages/kernel/meta.json`
- Create: `content/docs/{en,ar}/packages/meta.json`

**Interfaces:**
- Consumes: `packages/i18n/src/core/create-i18n.ts`, `packages/i18n/src/core/resolve-config.ts`, `packages/i18n/src/core/defaults.ts`, `packages/i18n/src/core/types.ts`, `packages/i18n/src/core/locale.ts`.
- Produces: five kernel pages per locale plus the `packages` section meta.

- [ ] **Step 1: Create `packages/meta.json` (both locales)**

EN:

```json
{ "title": "Packages", "pages": ["kernel", "cache", "loader", "react", "next", "vite", "store", "stubs", "tooling"] }
```

AR:

```json
{ "title": "الحزم", "pages": ["kernel", "cache", "loader", "react", "next", "vite", "store", "stubs", "tooling"] }
```

- [ ] **Step 2: Create `packages/kernel/meta.json` (both locales)**

EN:

```json
{ "title": "Kernel", "pages": ["create-i18n", "resolve-config", "defaults", "types", "locale-protocol"] }
```

AR:

```json
{ "title": "النواة", "pages": ["create-i18n", "resolve-config", "defaults", "types", "locale-protocol"] }
```

- [ ] **Step 3: Write the English pages using the Content Standard rubric**

- `create-i18n.mdx` — `createI18n(config)`; parameters table for every `CreateI18nConfig` field
  (`locales`, `defaultLocale`, `defaultNS`, `fallbackLng`, `catalogs`, `publicPath`,
  `numberingSystem`, `onEvent`, `backend`); return value is `I18nRuntime`. Include
  `<AutoTypeTable path="../../packages/i18n/src/core/types.ts" name="CreateI18nConfig" />`
  and `<AutoTypeTable path="../../packages/i18n/src/core/types.ts" name="I18nRuntime" />`.
- `resolve-config.mdx` — `resolveConfig(config)`; defaults applied; show the resolved shape with
  `<AutoTypeTable path="../../packages/i18n/src/core/types.ts" name="ResolvedConfig" />`.
- `defaults.mdx` — every constant (`SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `DEFAULT_NS`,
  `RTL_LOCALES`, `NS_ID_PATTERN`, `BUDGETS`, `LOADER`) with value and purpose.
- `types.mdx` — `Dir`, `DefaultLocale`, `Namespace`, `I18nEvent`, `I18nBackend`,
  `NamespaceResources`, `NamespaceLoader`; include auto tables for `I18nEvent` and `NamespaceLoader`.
- `locale-protocol.mdx` — `resolveLocale`, `dirFor`, `assertSupportedLocale`; the URL-first policy,
  the RTL locale set, and how unsupported locales are rejected.

- [ ] **Step 4: Write the Arabic counterparts**

Mirror all five files with Arabic titles from the inventory and real prose.

- [ ] **Step 5: Run parity and build**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`
Expected: pass. Confirm the auto type tables render (no build error about the source path). If a
path fails, adjust it so it is correct relative to `apps/docs`.

- [ ] **Step 6: Commit**

```bash
git add apps/docs/content/docs
git commit -m "docs(content): document the kernel in en and ar"
```

---

### Task 7: Content — Cache and Loader

**Files:**
- Create: `content/docs/{en,ar}/packages/cache/{lru}.mdx`
- Create: `content/docs/{en,ar}/packages/cache/meta.json`
- Create: `content/docs/{en,ar}/packages/loader/{memory,persistent,inflight,backend}.mdx`
- Create: `content/docs/{en,ar}/packages/loader/meta.json`

**Interfaces:**
- Consumes: `packages/i18n/src/cache/lru.ts`, `packages/i18n/src/loader/{memory,persistent,inflight,backend}.ts`.
- Produces: five pages per locale.

- [ ] **Step 1: Create both `cache/meta.json` and both `loader/meta.json`**

EN cache: `{ "title": "Cache", "pages": ["lru"] }`
AR cache: `{ "title": "التخزين المؤقت", "pages": ["lru"] }`
EN loader: `{ "title": "Loader", "pages": ["memory", "persistent", "inflight", "backend"] }`
AR loader: `{ "title": "المُحمّل", "pages": ["memory", "persistent", "inflight", "backend"] }`

- [ ] **Step 2: Write the English pages**

- `lru.mdx` — `LruCache` API (`get`, `set`, capacity/eviction order).
- `memory.mdx` — `MemoryStore`: the warm tier; O(1) lookup; lifetime.
- `persistent.mdx` — `PersistentStore`: the durable tier; storage backend and serialization.
- `inflight.mdx` — `InflightLoader` deduplication and `TimeoutError`.
- `backend.mdx` — `namespaceChunkLoader`, `TieredBackend`, `NamespaceLoader`,
  `TieredBackendOptions`; include
  `<AutoTypeTable path="../../packages/i18n/src/loader/backend.ts" name="NamespaceLoader" />` and
  explain the memory → persistent → dynamic-import → fetch tier order and the `createRequire` Node
  transport with bundler annotations.

- [ ] **Step 3: Write the Arabic counterparts**

Mirror all five files with Arabic titles.

- [ ] **Step 4: Run parity and build, then commit**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`

```bash
git add apps/docs/content/docs
git commit -m "docs(content): document cache and loader in en and ar"
```

---

### Task 8: Content — React Adapter

**Files:**
- Create: `content/docs/{en,ar}/packages/react/{provider,hooks,trans,context}.mdx`
- Create: `content/docs/{en,ar}/packages/react/meta.json`

**Interfaces:**
- Consumes: `packages/i18n/src/react/{provider.tsx,hooks.ts,trans.tsx,context.ts}`.
- Produces: four pages per locale.

- [ ] **Step 1: Create both `react/meta.json` files**

EN: `{ "title": "React", "pages": ["provider", "hooks", "trans", "context"] }`
AR: `{ "title": "React", "pages": ["provider", "hooks", "trans", "context"] }`

- [ ] **Step 2: Write the English pages**

- `provider.mdx` — `I18nProvider`, `I18nProviderProps`; runtime wiring and `navigate`.
- `hooks.mdx` — `useT`, `useLocale`, `useI18nRuntime`; include
  `<AutoTypeTable path="../../packages/i18n/src/react/context.ts" name="LocaleSnapshot" />` and
  document `changeLocale` deriving its prefix from `config.locales` and preserving
  search/hash.
- `trans.mdx` — `Trans` and interpolation.
- `context.mdx` — `I18nContext`, `I18nContextValue`, `LocaleSnapshot`; the `{ lng, dir, status }`
  mirror and why strings never live in the store.

- [ ] **Step 3: Write the Arabic counterparts, then parity, build, and commit**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`

```bash
git add apps/docs/content/docs
git commit -m "docs(content): document the React adapter in en and ar"
```

---

### Task 9: Content — Next.js and Vite Adapters

**Files:**
- Create: `content/docs/{en,ar}/packages/next/{middleware,server,html}.mdx`
- Create: `content/docs/{en,ar}/packages/next/meta.json`
- Create: `content/docs/{en,ar}/packages/vite/{plugin,routes}.mdx`
- Create: `content/docs/{en,ar}/packages/vite/meta.json`

**Interfaces:**
- Consumes: `packages/i18n/src/next/{middleware.ts,server.ts,html.ts}`, `packages/i18n/src/vite/{plugin.ts,routes.ts}`.
- Produces: five pages per locale.

- [ ] **Step 1: Create both `next/meta.json` and both `vite/meta.json`**

EN next: `{ "title": "Next.js", "pages": ["middleware", "server", "html"] }`
AR next: `{ "title": "Next.js", "pages": ["middleware", "server", "html"] }`
EN vite: `{ "title": "Vite", "pages": ["plugin", "routes"] }`
AR vite: `{ "title": "Vite", "pages": ["plugin", "routes"] }`

- [ ] **Step 2: Write the English pages**

- `middleware.mdx` — `i18nMiddleware`, `localeStaticParams`, `DEFAULT_COOKIE`, `I18nRequest`,
  `I18nRedirect`; include
  `<AutoTypeTable path="../../packages/i18n/src/next/middleware.ts" name="I18nRedirect" />`.
- `server.mdx` — `createI18nServer`, `defineRouteI18n`.
- `html.mdx` — `getHtmlAttributes(lng)`; note it is standalone and returns `{ lang, dir }`.
- `plugin.mdx` — `i18nVitePlugin`, `I18nVitePluginOptions`, `I18nManifest`; include
  `<AutoTypeTable path="../../packages/i18n/src/vite/plugin.ts" name="I18nManifest" />` and explain
  that the manifest is emitted as an asset via `this.emitFile`.
- `routes.mdx` — `localePrefix`, `matchLocaleFromPath`, `resolveLocaleOrNull`; the re-exported
  `resolveLocale`.

- [ ] **Step 3: Write the Arabic counterparts, then parity, build, and commit**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`

```bash
git add apps/docs/content/docs
git commit -m "docs(content): document the Next.js and Vite adapters in en and ar"
```

---

### Task 10: Content — Store Adapters, Stubs, and Tooling

**Files:**
- Create: `content/docs/{en,ar}/packages/store/{zustand,redux}.mdx`
- Create: `content/docs/{en,ar}/packages/store/meta.json`
- Create: `content/docs/{en,ar}/packages/stubs/index.mdx`
- Create: `content/docs/{en,ar}/packages/stubs/meta.json`
- Create: `content/docs/{en,ar}/packages/tooling/{catalogs-and-budgets,i18next-cli}.mdx`
- Create: `content/docs/{en,ar}/packages/tooling/meta.json`

**Interfaces:**
- Consumes: `packages/i18n/src/store/{zustand.ts,redux.ts}`, `packages/i18n/src/stubs/*.ts`, `packages/i18n/src/catalogs/index.ts`, `packages/i18n/scripts/check-budget.mjs`, `packages/i18n/src/cli/index.ts`.
- Produces: five pages per locale.

- [ ] **Step 1: Create the three meta.json pairs**

EN store: `{ "title": "Store Adapters", "pages": ["zustand", "redux"] }`
AR store: `{ "title": "محوّلات المتجر", "pages": ["zustand", "redux"] }`
EN stubs: `{ "title": "Stubs", "pages": ["index"] }`
AR stubs: `{ "title": "هياكل المنصات", "pages": ["index"] }`
EN tooling: `{ "title": "Tooling", "pages": ["catalogs-and-budgets", "i18next-cli"] }`
AR tooling: `{ "title": "الأدوات", "pages": ["catalogs-and-budgets", "i18next-cli"] }`

- [ ] **Step 2: Write the English pages**

- `store/zustand.mdx` — `createZustandLocaleStore`, `LocaleStore`, `LocaleSnapshot`; include
  `<AutoTypeTable path="../../packages/i18n/src/store/zustand.ts" name="LocaleStore" />`.
- `store/redux.mdx` — `localeSlice`, `localeChanged`, `localeStatusChanged`, `selectLocale`,
  `selectDir`; include
  `<AutoTypeTable path="../../packages/i18n/src/store/redux.ts" name="LocaleState" />`.
- `stubs/index.mdx` — `createNativeI18n`, `createNodeI18n`, `createElectronI18n`; why they throw
  and the post-v1 plan.
- `tooling/catalogs-and-budgets.mdx` — `SHARED_NAMESPACES`, `SHELL_NAMESPACES`, the hash protocol,
  and `packages/i18n/scripts/check-budget.mjs` limits.
- `tooling/i18next-cli.mdx` — `CLI_PACKAGE`, `CLI_VERSION`, `CLI_COMMANDS` and the root scripts
  (`i18n:extract`, `i18n:types`, `i18n:status`, `i18n:lint`).

- [ ] **Step 3: Write the Arabic counterparts, then parity, build, and commit**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`

```bash
git add apps/docs/content/docs
git commit -m "docs(content): document stores, stubs, and tooling in en and ar"
```

---

### Task 11: Content — Guides

**Files:**
- Create: `content/docs/{en,ar}/guides/{add-a-namespace,add-a-locale,typed-keys,testing,performance-budgets,migrate-from-i18next}.mdx`
- Create: `content/docs/{en,ar}/guides/meta.json`

**Interfaces:**
- Consumes: `packages/i18n/catalogs/*`, `packages/i18n/src/@types/i18next.d.ts`, `packages/i18n/scripts/check-budget.mjs`, `i18next.config.ts`.
- Produces: six guide pages per locale.

- [ ] **Step 1: Create both `guides/meta.json` files**

EN: `{ "title": "Guides", "pages": ["add-a-namespace", "add-a-locale", "typed-keys", "testing", "performance-budgets", "migrate-from-i18next"] }`
AR: `{ "title": "الأدلة", "pages": ["add-a-namespace", "add-a-locale", "typed-keys", "testing", "performance-budgets", "migrate-from-i18next"] }`

- [ ] **Step 2: Write the English guides with runnable steps**

- `add-a-namespace.mdx` — create `catalogs/en/<ns>.json` and `catalogs/ar/<ns>.json`, run
  `pnpm i18n:extract`, register it, load it lazily.
- `add-a-locale.mdx` — add the locale to `createI18n` config, add catalog folders, add the FumaDocs
  locale note; RTL implications.
- `typed-keys.mdx` — how `packages/i18n/src/@types/i18next.d.ts` and `resources.d.ts` produce typed
  `t()`; how `i18next-cli types` regenerates them.
- `testing.mdx` — mirror the patterns in `packages/i18n/src/__tests__` (transport tests, prefetch
  tests, provider tests) and the contract apps' tests.
- `performance-budgets.mdx` — the exact budget values from `check-budget.mjs` and `BUDGETS`, and
  how to keep under them.
- `migrate-from-i18next.mdx` — mapping raw `i18next.init` usage to `createI18n` and the adapters.

Each guide includes concrete commands with expected output.

- [ ] **Step 3: Write the Arabic counterparts, then parity, build, and commit**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`

```bash
git add apps/docs/content/docs
git commit -m "docs(content): add guides in en and ar"
```

---

### Task 12: Content — Contract Apps

**Files:**
- Create: `content/docs/{en,ar}/apps/{next-web,vite-web}.mdx`
- Create: `content/docs/{en,ar}/apps/meta.json`

**Interfaces:**
- Consumes: `apps/next-web/**`, `apps/vite-web/**`.
- Produces: two pages per locale.

- [ ] **Step 1: Create both `apps/meta.json` files**

EN: `{ "title": "Contract Apps", "pages": ["next-web", "vite-web"] }`
AR: `{ "title": "التطبيقات المرجعية", "pages": ["next-web", "vite-web"] }`

- [ ] **Step 2: Write the English pages**

- `next-web.mdx` — walk `apps/next-web/src/proxy.ts`, `src/i18n.ts`,
  `src/app/[lng]/layout.tsx`, `src/app/[lng]/page.tsx`, and the server-locale test; explain what
  the app proves about the Next adapter.
- `vite-web.mdx` — walk `apps/vite-web/src/main.tsx`, `routes.tsx`, `locale-guard.tsx`,
  `i18n.ts`, `pages/*`, and the locale-guard test; explain the CSR zero-flicker guard.

- [ ] **Step 3: Write the Arabic counterparts, then parity, build, and commit**

Run: `pnpm --filter @apps/docs test && pnpm --filter @apps/docs build`

```bash
git add apps/docs/content/docs
git commit -m "docs(content): document the contract apps in en and ar"
```

---

### Task 13: Content — Appendix and the file-map checker

**Files:**
- Create: `content/docs/{en,ar}/appendix/{api-index,file-map,glossary,troubleshooting}.mdx`
- Create: `content/docs/{en,ar}/appendix/meta.json`
- Create: `apps/docs/scripts/check-file-map.mjs`
- Modify: `apps/docs/package.json` (`test` script)

**Interfaces:**
- Consumes: `git ls-files`; every type named in Global Constraints.
- Produces: `check-file-map.mjs` (exit 0/1) run as part of `test`.

- [ ] **Step 1: Create both `appendix/meta.json` files**

EN: `{ "title": "Appendix", "pages": ["api-index", "file-map", "glossary", "troubleshooting"] }`
AR: `{ "title": "الملاحق", "pages": ["api-index", "file-map", "glossary", "troubleshooting"] }`

- [ ] **Step 2: Write `appendix/api-index.mdx` (both locales)**

Document the `AutoTypeTable` relative-path convention with a worked example
(`../../packages/i18n/src/core/types.ts`), then an index of every public export grouped by subpath,
linking to the owning page.

- [ ] **Step 3: Write `appendix/glossary.mdx` (both locales)**

A bilingual term table covering at least: runtime, catalog, namespace, shell, lazy namespace,
locale, RTL, flicker, prefetch, tier, budget, manifest, hyperlink. Use the same Arabic terms chosen
in Task 4.

- [ ] **Step 4: Write `appendix/troubleshooting.mdx` (both locales)**

Common symptoms (missing keys, wrong direction, stale catalog, budget exceeded, extract drift) with
causes and fixes.

- [ ] **Step 5: Write `appendix/file-map.mdx` (both locales)**

List every tracked file grouped by area (root config, `packages/i18n/**`, tests, catalogs, apps,
tooling) with a one-line purpose. Seed it by running `git ls-files` and covering each path.

- [ ] **Step 6: Write `scripts/check-file-map.mjs`**

```js
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Generated files and self-describing docs content are not part of the source map.
const allow = new Set(['pnpm-lock.yaml', 'apps/next-web/next-env.d.ts', 'apps/docs/next-env.d.ts']);
const excludedPrefixes = ['.superpowers/', 'docs/', 'apps/docs/content/'];

const tracked = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => !excludedPrefixes.some((p) => f.startsWith(p)))
  .filter((f) => !allow.has(f));

const page = readFileSync('content/docs/en/appendix/file-map.mdx', 'utf8');
const missing = tracked.filter((f) => !page.includes(f));

if (missing.length > 0) {
  console.error('file map is missing tracked files:\n' + missing.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`file map covers all ${tracked.length} tracked source files`);
```

- [ ] **Step 7: Wire the checker into `test` and update the AR file-map page**

In `apps/docs/package.json`, change the `test` script to:

```json
"test": "node scripts/check-parity.mjs && node scripts/check-file-map.mjs"
```

Mirror every English file-map entry in `content/docs/ar/appendix/file-map.mdx` with Arabic
descriptions.

- [ ] **Step 8: Verify both checkers pass**

Run: `pnpm --filter @apps/docs test`
Expected: parity passes; `file map covers all N tracked files`. If files are missing, add them to
both file-map pages.

- [ ] **Step 9: Build, then commit**

Run: `pnpm --filter @apps/docs build`

```bash
git add apps/docs/content/docs apps/docs/scripts apps/docs/package.json
git commit -m "docs(content): add appendix and enforce file-map coverage"
```

---

### Task 14: Final wiring and full-repo verification

**Files:**
- Modify: `apps/docs/package.json` (only if `prebuild`/`build` still reference missing scripts)
- Verify: `.github/workflows/ci.yml` unchanged

**Interfaces:**
- Consumes: everything above.
- Produces: a green `pnpm verify` including docs.

- [ ] **Step 1: Confirm docs scripts are complete**

Ensure `apps/docs/package.json` has `prebuild`, `build` (`next build && node scripts/check-rtl.mjs`),
`test` (`check-parity.mjs && check-file-map.mjs`), `typecheck`, and `dev`.

- [ ] **Step 2: Run the full repository verification**

Run: `pnpm verify`
Expected: typecheck, tests, `extract --ci`, status, lint, build (including docs and its RTL check),
and budget all pass.

- [ ] **Step 3: Fix any regressions**

If the extract gate reports docs content, re-check the `apps/docs/**` ignore entry. If the budget
step fails, confirm docs added no catalog entries. Re-run `pnpm verify`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(docs): complete bilingual docs integration and verification"
```

---

### Task 15: Local preview

**Files:**
- No file changes unless a bug is found.

**Interfaces:**
- Consumes: the built docs app.
- Produces: a running preview URL.

- [ ] **Step 1: Start the docs dev server in the background**

Use the `deploy-website` skill (or the background terminal tool) to run
`pnpm --filter @apps/docs dev` and read its log to confirm it starts on port 4000.

- [ ] **Step 2: Verify the routes render**

Open `/en` and `/ar`; confirm the Arabic page renders right-to-left with LTR code blocks and the
auto type tables appear on kernel pages.

- [ ] **Step 3: Stop the background server**

Kill the background terminal by its ID (never `pkill`). No commit is required for this task.

---

## Self-Review

**Spec coverage:**

- App & stack (§4.1) → Task 1. File tree (§4.2) → Task 1. i18n config (§4.3) → Task 1. RTL (§4.4) → Tasks 1, 2. Search (§4.5) → Task 1. IA + inventory (§5.1) → Tasks 4–13. Page rubric (§5.2) → Global Constraints + content tasks. API reference (§5.3) → Tasks 1, 6, 7, 8, 9, 10, 13. File map (§5.4) → Task 13. Bilingual standard (§5.5) → Global Constraints + every content task. Workspace/CI (§6) → Tasks 1, 3, 14. Verification (§7) → Tasks 2, 13, 14. Risks (§8) → Tasks 1 (RTL CSS), 2 (fallback path), 13 (file-map gate). Acceptance criteria (§9) → Task 14. Implementation notes (§10) → Tasks 1, 3.

**Placeholder scan:** The only non-final text is inside task steps that instruct the implementer to
author prose from named source files (content tasks). Every such step names the exact source files
and required sections, so no heading is left unfilled; there are no `TBD`/`TODO` markers.

**Type consistency:** Interfaces use one name each: `i18n`, `source`, `translations`,
`baseOptions`, `dirFor`, `getMDXComponents`. Auto table type names match the exported types in
`packages/i18n/src` (`CreateI18nConfig`, `I18nRuntime`, `ResolvedConfig`, `I18nEvent`,
`NamespaceLoader`, `LocaleSnapshot`, `I18nRedirect`, `I18nManifest`, `LocaleState`, `LocaleStore`).
