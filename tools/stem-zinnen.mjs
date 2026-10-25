// Verzamelt alle zinnen die het spel kan uitspreken en schrijft ze naar stem/zinnen.json.
// Gebruik: node tools/stem-zinnen.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const surprises = readFileSync(join(ROOT, 'js/house/surprises.js'), 'utf8');
const NAAM = html.match(/const NAAM = "([^"]+)"/)[1];

// Haal het letterlijke blok na `const X =` op (tot de bijbehorende sluithaak) en evalueer het.
function blok(src, naam) {
  const i = src.indexOf(`const ${naam} =`);
  if (i < 0) throw new Error(`${naam} niet gevonden`);
  let j = src.indexOf('=', i) + 1;
  while (/\s/.test(src[j])) j++;
  const open = src[j], dicht = open === '[' ? ']' : '}';
  let diepte = 0, k = j, str = null;
  for (; k < src.length; k++) {
    const c = src[k];
    if (str) { if (c === '\\') { k++; continue; } if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === open) diepte++;
    else if (c === dicht && --diepte === 0) break;
  }
  return vm.runInNewContext('(' + src.slice(j, k + 1) + ')', { NAAM });
}

const zinnen = new Set();
const voeg = t => { t = String(t).trim(); if (t) zinnen.add(t); };

blok(html, 'AANMOEDIGINGEN').forEach(voeg);
blok(html, 'PROBEER_NOG').forEach(voeg);
blok(html, 'KAT_REACTIES').forEach(r => r.zeg.forEach(voeg));
for (const groep of Object.values(blok(html, 'DRESS_LABELS')))
  for (const [waarde, label] of Object.entries(groep)) if (waarde !== 'geen') voeg(label.replace(/^\S+\s/, ''));
for (const d of blok(html, 'TEL_DINGEN')) voeg(`${NAAM}, hoeveel ${d.naam} zie je?`);
for (const lijst of Object.values(blok(surprises, 'LINES'))) lijst.forEach(t => voeg(t.replace(/\{NAAM\}/g, NAAM)));

// Letterlijke tekst op regels met speak(...): alleen ${NAAM} mag erin voorkomen.
const literal = /`((?:[^`\\]|\\.)*)`|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g;
for (const regel of html.split('\n')) {
  if (!/\bspeak\(/.test(regel) || /function speak/.test(regel) || /SpeechSynthesisUtterance/.test(regel)) continue;
  for (const m of regel.matchAll(literal)) {
    const t = m[1] ?? m[2] ?? m[3];
    if (/\$\{(?!NAAM\})/.test(t)) continue;           // dynamisch (los hierboven verzameld)
    if (!/[A-Za-z]{2}/.test(t) || /^[a-z-]+$/.test(t)) continue;   // code-woorden als "geen" of "nl-NL"
    voeg(t.replace(/\$\{NAAM\}/g, NAAM));
  }
}

const lijst = [...zinnen].sort((a, b) => a.localeCompare(b, 'nl'));
writeFileSync(join(ROOT, 'stem/zinnen.json'), JSON.stringify(lijst, null, 1) + '\n');
console.log(`${lijst.length} zinnen, ${lijst.join('').length} tekens -> stem/zinnen.json`);
