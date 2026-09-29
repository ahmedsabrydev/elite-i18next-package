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
