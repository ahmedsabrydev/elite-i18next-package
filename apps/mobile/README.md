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
