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
