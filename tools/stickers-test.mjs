// Test: verkleden en speelkamer geven een sticker (een keer per bezoek).
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-proxy-server'] });
const p = await b.newPage({ viewport: { width: 1024, height: 768 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8765/index.html?q=low', { waitUntil: 'commit' });
await p.waitForFunction(() => window.KH, null, { timeout: 60000 });
await p.evaluate(() => localStorage.setItem('kh_stickers', JSON.stringify({ earned: 0, pos: {} })));
const earned = () => p.evaluate(() => JSON.parse(localStorage.getItem('kh_stickers')).earned);
let ok = true;
const check = (naam, got, want) => { console.log(`${naam}: ${got} (verwacht ${want})`); if (got !== want) ok = false; };

await p.evaluate(() => KH.launchGame('verkleden'));
const dress = p.locator('#dress-panel .dress-btn');
for (let i = 0; i < 3; i++) await dress.nth(i).click();
await p.waitForTimeout(1600); check('verkleden na 3 soorten', await earned(), 0);
await dress.nth(3).click(); await p.waitForTimeout(1600); check('verkleden na 4 soorten', await earned(), 1);
for (let i = 4; i < 7; i++) await dress.nth(i).click();
await p.waitForTimeout(1600); check('verkleden na 7 soorten (geen tweede)', await earned(), 1);

await p.evaluate(() => KH.backToHouse()); await p.evaluate(() => KH.launchGame('speel'));
const cellen = p.locator('.busy-cell');
for (let i = 0; i < 4; i++) await cellen.nth(i).dispatchEvent('pointerdown');
await p.waitForTimeout(1300); check('speelkamer na 4 speeltjes', await earned(), 1);
await cellen.nth(4).dispatchEvent('pointerdown'); await p.waitForTimeout(1300); check('speelkamer na 5 speeltjes', await earned(), 2);
for (let i = 5; i < 9; i++) await cellen.nth(i).dispatchEvent('pointerdown');
await p.waitForTimeout(1300); check('speelkamer na 9 speeltjes (geen tweede)', await earned(), 2);

if (errs.length) { console.log('paginafouten:', errs); ok = false; }
await b.close();
console.log(ok ? 'STICKERS OK' : 'STICKERS FAIL'); process.exit(ok ? 0 : 1);
