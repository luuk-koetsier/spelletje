// Maakt voor elke zin in stem/zinnen.json een mp3 met de stem van Luuk (Fish Audio)
// en houdt stem/index.json bij (zin -> bestand). Bestaande opnames worden overgeslagen.
// Nodig: FISH_API_KEY en FISH_VOICE_ID als omgevingsvariabele, en api.fish.audio als toegestaan domein.
// Gebruik:
//   node tools/stem-maak.mjs              alle ontbrekende zinnen
//   node tools/stem-maak.mjs --proef 3    alleen de eerste 3 ontbrekende (om de stem te testen)
//   node tools/stem-maak.mjs --opnieuw "Goed zo, Sep!"   een zin opnieuw maken
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'stem');
const KEY = process.env.FISH_API_KEY, STEM = process.env.FISH_VOICE_ID;
const MODEL = process.env.FISH_MODEL || 's2.1-pro-free';
if (!KEY || !STEM) { console.error('FISH_API_KEY en FISH_VOICE_ID ontbreken in de omgeving.'); process.exit(1); }

const args = process.argv.slice(2);
const proef = args.includes('--proef') ? Number(args[args.indexOf('--proef') + 1] || 3) : Infinity;
const opnieuw = args.includes('--opnieuw') ? args[args.indexOf('--opnieuw') + 1] : null;

const zinnen = JSON.parse(readFileSync(join(DIR, 'zinnen.json'), 'utf8'));
const indexPad = join(DIR, 'index.json');
const index = existsSync(indexPad) ? JSON.parse(readFileSync(indexPad, 'utf8')) : {};
const bestand = t => createHash('sha1').update(t).digest('hex').slice(0, 12) + '.mp3';

if (opnieuw) { if (index[opnieuw]) { try { unlinkSync(join(DIR, index[opnieuw])); } catch {} delete index[opnieuw]; } }
const todo = zinnen.filter(t => !index[t] || !existsSync(join(DIR, index[t]))).slice(0, proef);
console.log(`${todo.length} zinnen te maken (model ${MODEL})`);

let gemaakt = 0;
for (const tekst of todo) {
  for (let poging = 1; poging <= 3; poging++) {
    const res = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', model: MODEL },
      body: JSON.stringify({ text: tekst, reference_id: STEM, format: 'mp3', mp3_bitrate: 64, normalize: true, latency: 'normal' }),
    });
    if (res.ok) {
      const f = bestand(tekst);
      writeFileSync(join(DIR, f), Buffer.from(await res.arrayBuffer()));
      index[tekst] = f; gemaakt++;
      writeFileSync(indexPad, JSON.stringify(index, null, 1) + '\n');
      console.log(`ok  ${f}  ${tekst}`);
      break;
    }
    const fout = `${res.status} ${(await res.text()).slice(0, 200)}`;
    if (poging === 3 || res.status === 401 || res.status === 402 || res.status === 403) { console.error(`FOUT bij "${tekst}": ${fout}`); process.exit(1); }
    await new Promise(r => setTimeout(r, 2000 * poging));
  }
}
console.log(`klaar: ${gemaakt} gemaakt, ${Object.keys(index).length} van ${zinnen.length} zinnen hebben een opname`);
