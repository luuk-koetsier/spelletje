// Test: stickers in het stickerboek liggen los op de plank, zijn te pakken en blijven zichtbaar tijdens slepen naar het blad.
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-proxy-server'] });
const p = await b.newPage({ viewport: { width: 1024, height: 768 }, hasTouch: true });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://127.0.0.1:8765/index.html?q=low', { waitUntil: 'commit' });
await p.waitForFunction(() => window.KH && !document.getElementById('load'), null, { timeout: 120000 });
await p.evaluate(() => localStorage.setItem('kh_stickers', JSON.stringify({ earned: 6, pos: {} })));
await p.evaluate(() => KH.launchGame('stickers'));
await p.waitForSelector('#sticker-shelf .sticker');
let ok = true; const fail = m => { console.log('FAIL: ' + m); ok = false; };

// 1. Plank: stickers liggen niet op elkaar en staan binnen de plank.
const r = await p.evaluate(() => {
  const shelf = document.getElementById('sticker-shelf').getBoundingClientRect();
  const rs = [...document.querySelectorAll('#sticker-shelf .sticker')].map(e => e.getBoundingClientRect());
  return { shelf: { l: shelf.left, t: shelf.top, r: shelf.right, b: shelf.bottom }, rs: rs.map(q => ({ l: q.left, t: q.top, r: q.right, b: q.bottom, w: q.width, h: q.height })) };
});
const overlap = (a, c) => a.l < c.r - 2 && c.l < a.r - 2 && a.t < c.b - 2 && c.t < a.b - 2;
for (let i = 0; i < r.rs.length; i++) for (let j = i + 1; j < r.rs.length; j++) if (overlap(r.rs[i], r.rs[j])) fail(`sticker ${i} en ${j} liggen op elkaar`);
for (const [i, q] of r.rs.entries()) {
  if (q.l < r.shelf.l || q.r > r.shelf.r + 1 || q.t < r.shelf.t) fail(`sticker ${i} staat buiten de plank`);
  if (q.w < 44 || q.h < 44) fail(`sticker ${i} is te klein om te pakken (${Math.round(q.w)}x${Math.round(q.h)})`);
}
// 2. Niet als tekst selecteerbaar.
const sel = await p.evaluate(() => getComputedStyle(document.querySelector('#sticker-shelf .sticker')).webkitUserSelect || getComputedStyle(document.querySelector('#sticker-shelf .sticker')).userSelect);
if (sel !== 'none') fail(`sticker is selecteerbaar (user-select: ${sel})`);

// 3. Slepen van plank naar blad: halverwege zichtbaar, daarna op het blad en bewaard.
const st = r.rs[2]; const sx = st.l + st.w / 2, sy = st.t + st.h / 2;
const page = await p.evaluate(() => { const q = document.getElementById('book-page').getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
const mx = (sx + page.x) / 2, my = (sy + page.y) / 2;
const opPunt = await p.evaluate(([x, y]) => { window.__sleep = document.elementFromPoint(x, y)?.closest('.sticker') || null; return !!window.__sleep; }, [sx, sy]);
if (!opPunt) { fail('geen sticker te pakken op de plank'); await b.close(); console.log('STICKERBOEK FAIL'); process.exit(1); }
await p.mouse.move(sx, sy); await p.mouse.down();
await p.mouse.move(mx, my, { steps: 5 });
const zicht = await p.evaluate(() => { const el = window.__sleep; const q = el.getBoundingClientRect(); const top = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return top === el || el.contains(top); });
if (!zicht) fail('sticker is onzichtbaar tijdens het slepen');
await p.mouse.move(page.x, page.y, { steps: 5 }); await p.mouse.up();
const na = await p.evaluate(() => ({ opBlad: window.__sleep.parentElement.id, pos: JSON.parse(localStorage.getItem('kh_stickers')).pos }));
if (na.opBlad !== 'book-page') fail(`sticker staat na loslaten in #${na.opBlad}, niet op het blad`);
if (Object.keys(na.pos).length !== 1) fail('plek op het blad is niet bewaard');

if (errs.length) fail('paginafouten: ' + errs.join(' | '));
await b.close();
console.log(ok ? 'STICKERBOEK OK' : 'STICKERBOEK FAIL'); process.exit(ok ? 0 : 1);
