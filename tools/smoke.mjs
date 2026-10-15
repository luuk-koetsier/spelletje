import { open, waitReady } from './common.mjs';

const IDS = ['memory', 'puzzel', 'vormen', 'tellen', 'kleuren', 'verkleden', 'speel', 'stickers'];
let browser;

async function fail(msg) {
  console.error('SMOKE FAIL: ' + msg);
  if (browser) await browser.close().catch(() => {});
  process.exit(1);
}
const check = (ok, msg) => ok || fail(msg);

try {
  const o = await open({ width: 1280, height: 800 });
  browser = o.browser;
  const { page, errors } = o;

  try { await waitReady(page, 60000); }
  catch { await fail('__house.ready niet binnen 60 s' + (errors.length ? ' (' + errors[0] + ')' : '')); }

  const events = () => page.evaluate(() => window.__house.events.slice());
  const reset = () => page.evaluate(() => { window.__house.events.length = 0; document.getElementById('modal').classList.remove('open'); });

  const rooms = await page.evaluate(() => window.__house.rooms());
  check(rooms.length === 8, 'rooms().length is ' + rooms.length + ', verwacht 8');

  // Een tik op elk kamermidden opent die kamer.
  for (const r of rooms) {
    await reset();
    await page.evaluate(([x, y]) => window.__house.tap(x, y), [r.x, r.y]);
    const ev = await events();
    check(ev.length === 1 && ev[0] === 'open:' + r.id, 'tik op ' + r.id + ' gaf ' + JSON.stringify(ev));
  }
  const got = rooms.map(r => r.id).sort();
  check(JSON.stringify(got) === JSON.stringify([...IDS].sort()), 'kamer-ids kloppen niet: ' + got.join(','));

  // Een tik op de voordeur logt door.
  await reset();
  const d = await page.evaluate(() => window.__house.door());
  await page.evaluate(([x, y]) => window.__house.tap(x, y), [d.x, d.y]);
  const dev = await events();
  check(dev.length === 1 && dev[0] === 'door', 'tik op de voordeur gaf ' + JSON.stringify(dev));

  // Slepen (120 px) vanaf een kamermidden activeert niets.
  await reset();
  const r0 = rooms[0];
  await page.evaluate(([x, y]) => window.__house.drag(x, y, x + 120, y), [r0.x, r0.y]);
  const sev = await events();
  check(sev.length === 0, 'slepen logde ' + JSON.stringify(sev));

  check(errors.length === 0, errors[0]);
  console.log('SMOKE OK');
  await browser.close();
} catch (e) {
  await fail(e.message);
}
