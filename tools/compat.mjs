// Controleert dat het spel draait op Safari 15 (iPad Air 2, iPadOS 15.8).
// 1. Geen kale 'three'-imports: Safari 15 kent geen import maps.
// 2. Geen syntax die nieuwer is dan Safari 15: esbuild mag niets hoeven om te zetten.
// 3. Geen color-mix() zonder terugval in de CSS.
// Gebruik: node tools/compat.mjs  (exit 0 = in orde)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transformSync } from 'esbuild';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
const walk = d => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } };
walk(join(ROOT, 'js')); walk(join(ROOT, 'vendor'));

const fouten = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  if (/(?:from\s*|import\s*\(?\s*)['"]three(?:\/[^'"]*)?['"]/.test(src)) fouten.push(`${f}: kale 'three'-import (Safari 15 kent geen import maps)`);
  const nu = transformSync(src, { format: 'esm', target: 'esnext', loader: 'js' }).code;
  const oud = transformSync(src, { format: 'esm', target: 'safari15', loader: 'js' }).code;
  if (nu !== oud) fouten.push(`${f}: bevat syntax die nieuwer is dan Safari 15`);
}
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
if (/<script[^>]+type=["']importmap["']/.test(html)) fouten.push('index.html: bevat een import map');
html.split('\n').forEach((r, i, rs) => {
  if (r.includes('color-mix(') && !/^\s*background:|^\s*color:/.test(rs[i - 1] || '')) fouten.push(`index.html:${i + 1}: color-mix() zonder terugvalregel erboven`);
});

if (fouten.length) { console.log('COMPAT FAIL\n' + fouten.join('\n')); process.exit(1); }
console.log(`COMPAT OK (${files.length} bestanden, Safari 15)`);
