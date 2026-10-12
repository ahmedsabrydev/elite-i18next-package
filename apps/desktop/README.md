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
