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
