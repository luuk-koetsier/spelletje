// Test de opgenomen stem: (1) alles wat het spel zegt staat in stem/zinnen.json,
// (2) met een opname speelt het spel die af, (3) zonder opname valt het terug op de computerstem.
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';
const zinnen = new Set(JSON.parse(readFileSync(new URL('../stem/zinnen.json', import.meta.url), 'utf8')));
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const b0 = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-proxy-server', '--autoplay-policy=no-user-gesture-required'] };
const b = await chromium.launch(existsSync(EXE) ? { ...b0, executablePath: EXE } : b0);
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
let ok = true; const fail = m => { console.log('FAIL: ' + m); ok = false; };
const STIL = Buffer.from('UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=', 'base64');
await p.route('**/stem/index.json', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ 'Goed zo, Sep!': 'proef.mp3' }) }));
await p.route('**/stem/proef.mp3', r => r.fulfill({ contentType: 'audio/wav', body: STIL }));
await p.goto('http://127.0.0.1:8765/index.html?debug=1&q=low', { waitUntil: 'commit' });
await p.waitForFunction(() => window.KH && window.__house && window.__house.ready && !document.getElementById('load'), null, { timeout: 120000 });
await p.waitForFunction(() => window.__house.surprises && window.__house.surprises().length >= 10, null, { timeout: 120000 });

// (2) en (3): afspelen met en zonder opname.
const r = await p.evaluate(async () => {
  let tts = 0; speechSynthesis.speak = () => { tts++; };
  speak('Goed zo, Sep!'); await new Promise(z => setTimeout(z, 300));
  const met = { src: stemAudio.src, tts };
  speak('Deze zin heeft geen opname.'); await new Promise(z => setTimeout(z, 100));
  return { met, zonderTts: tts - met.tts };
});
// (4) zin uit zinnen.json zonder mp3: via api/stem; geeft die een fout, dan de computerstem.
let apiStatus = 200;
await p.route('**/api/stem?*', r => apiStatus === 200 ? r.fulfill({ contentType: 'audio/wav', body: STIL }) : r.fulfill({ status: apiStatus, body: 'x' }));
const api = await p.evaluate(async () => {
  let tts = 0; speechSynthesis.speak = () => { tts++; };
  const zin = [...stemZinnen].find(z => !stemIndex[z]);
  speak(zin); await new Promise(z => setTimeout(z, 300));
  return { zin, src: stemAudio.src, tts };
});
if (!api.src.includes('/api/stem?zin=' + encodeURIComponent(api.zin))) fail(`api-stem niet gebruikt (src=${api.src})`);
if (api.tts !== 0) fail('computerstem sprak terwijl api-stem werkte');
apiStatus = 404;
const api2 = await p.evaluate(async () => {
  let tts = 0; speechSynthesis.speak = () => { tts++; };
  const zin = [...stemZinnen].filter(z => !stemIndex[z])[1];
  speak(zin); await new Promise(z => setTimeout(z, 500));
  return { tts, werkt: stemApiWerkt };
});
if (api2.tts !== 1) fail('bij een api-fout viel de computerstem niet in');
if (api2.werkt) fail('na een api-fout bleef het spel de api proberen');
await p.evaluate(() => { stemApiWerkt = true; });
if (!r.met.src.endsWith('/stem/proef.mp3')) fail(`opname niet afgespeeld (src=${r.met.src})`);
if (r.met.tts !== 0) fail('computerstem sprak terwijl er een opname was');
if (r.zonderTts !== 1) fail('zonder opname viel de computerstem niet in');
const uit = await p.evaluate(() => { soundOn = false; stemAudio.src = ''; speak('Goed zo, Sep!'); const s = stemAudio.src; soundOn = true; return s; });
if (uit.endsWith('proef.mp3')) fail('opname speelde terwijl het geluid uit stond');

// (1) Dekking: vang alles op wat het spel zegt.
await p.evaluate(() => { window.__gezegd = []; const orig = window.speak; window.speak = t => { window.__gezegd.push(String(t)); }; window.__origSpeak = orig; });
for (const s of await p.evaluate(() => window.__house.surprises())) { await p.evaluate(([x, y]) => window.__house.tap(x, y), [s.x, s.y]); await p.waitForTimeout(150); }
for (let i = 0; i < 6; i++) await p.evaluate(() => { moedigAan(); probeerNog(); awardSticker(); });
for (const id of ['memory', 'puzzel', 'vormen', 'tellen', 'kleuren', 'verkleden', 'speel', 'stickers']) {
  await p.evaluate(id => KH.launchGame(id), id); await p.waitForTimeout(400);
  if (id === 'verkleden') for (let i = 0; i < 25; i++) await p.evaluate(i => { const k = document.querySelectorAll('#dress-panel .dress-btn'); k[i % k.length].click(); }, i);
  await p.evaluate(() => KH.backToHouse());
}
const gezegd = [...new Set(await p.evaluate(() => window.__gezegd))];
const mist = gezegd.filter(t => !zinnen.has(t));
console.log(`${gezegd.length} verschillende zinnen gehoord tijdens de test`);
if (mist.length) fail('niet in stem/zinnen.json: ' + JSON.stringify(mist));

if (errs.length) fail('paginafouten: ' + errs.join(' | '));
await b.close();
console.log(ok ? 'STEM OK' : 'STEM FAIL'); process.exit(ok ? 0 : 1);
