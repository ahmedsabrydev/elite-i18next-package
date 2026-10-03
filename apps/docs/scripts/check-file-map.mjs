import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Generated files and self-describing docs content are not part of the source map.
const allow = new Set(['pnpm-lock.yaml', 'apps/next-web/next-env.d.ts', 'apps/docs/next-env.d.ts']);
const excludedPrefixes = ['.superpowers/', 'docs/', 'apps/docs/content/'];

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: appRoot,
  encoding: 'utf8',
}).trim();

const tracked = execFileSync('git', ['ls-files'], { cwd: repoRoot, encoding: 'utf8' })
  .split('\n')
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((f) => !excludedPrefixes.some((p) => f.startsWith(p)))
  .filter((f) => !allow.has(f));

const page = readFileSync(resolve(appRoot, 'content/docs/en/appendix/file-map.mdx'), 'utf8');
const missing = tracked.filter((f) => !page.includes(f));

if (missing.length > 0) {
  console.error('file map is missing tracked files:\n' + missing.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`file map covers all ${tracked.length} tracked source files`);
