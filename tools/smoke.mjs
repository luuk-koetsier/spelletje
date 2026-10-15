import { open, waitReady } from './common.mjs';

const IDS = ['memory', 'puzzel', 'vormen', 'tellen', 'kleuren', 'verkleden', 'speel', 'stickers'];
let browser;

async function fail(msg) {
  console.error('SMOKE FAIL: ' + msg);
  if (browser) await browser.close().catch(() => {});
  process.exit(1);
}
const check = (ok, msg) => { if (!ok) throw new Error(msg); };

try {
  const o = await open({ width: 1280, height: 800 });
  browser = o.browser;
  const { page, errors } = o;

  try { await waitReady(page, 60000); }
  catch { await fail('__house.ready niet binnen 60 s' + (errors.length ? ' (' + errors[0] + ')' : '')); }

  const events = () => page.evaluate(() => window.__house.events.slice());
  const reset = () => page.evaluate(() => { window.__house.events.length = 0; document.getElementById('modal').classList.remove('open'); });

  // Prestatie: voorlopig alleen loggen (budget 150 calls / 150.000 driehoeken, hard vanaf Taak 11).
  const info = await page.evaluate(() => { window.__house.frame(); return window.__house.info(); });
  console.log('info: calls=' + info.calls + ' triangles=' + info.triangles + ' tier=' + info.tier);
  if (info.calls > 150) console.log('LET OP: calls ' + info.calls + ' > 150');
  if (info.triangles > 150000) console.log('LET OP: triangles ' + info.triangles + ' > 150000');

  // ?q=low geeft de lage stand, en quality.js levert die ook.
  const q = await page.evaluate(async () => {
    try { const m = await import('/js/house/quality.js'); return { init: m.initialTier(), tier: window.__house.info().tier }; }
    catch (e) { return { err: e.message }; }
  });
  check(!q.err, 'quality.js laden mislukt: ' + q.err);
  check(q.init === 'low' && q.tier === 'low', '?q=low gaf tier ' + JSON.stringify(q));

  // Governor: 3 s aan 40 ms per beeld geeft low, daarna 3 s aan 10 ms blijft low.
  const gov = await page.evaluate(async () => {
    const m = await import('/js/house/quality.js');
    const fake = { pr: 2, setPixelRatio(v) { this.pr = v; }, shadowMap: { enabled: true } };
    const changes = [];
    const g = m.createGovernor(fake, t => changes.push(t), 'high');
    const start = g.tier;
    for (let i = 0; i < 75; i++) g.tick(0.04);
    const afterSlow = g.tier;
    for (let i = 0; i < 300; i++) g.tick(0.01);
    return { start, afterSlow, afterFast: g.tier, changes, pr: fake.pr, shadow: fake.shadowMap.enabled };
  });
  check(gov.start === 'high', 'governor begint niet op high: ' + JSON.stringify(gov));
  check(gov.afterSlow === 'low', 'governor schakelt niet naar low bij 25 fps: ' + JSON.stringify(gov));
  check(gov.afterFast === 'low', 'governor schakelt terug naar high: ' + JSON.stringify(gov));
  check(JSON.stringify(gov.changes) === '["low"]', 'governor onChange klopt niet: ' + JSON.stringify(gov));
  check(gov.pr === 1 && gov.shadow === false, 'governor zet low niet goed op de renderer: ' + JSON.stringify(gov));

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

  // Tik op alle kamers op de huidige maat.
  async function tapAll(label) {
    const rs = await page.evaluate(() => window.__house.rooms());
    check(rs.length === 8, label + ': rooms().length is ' + rs.length);
    for (const r of rs) {
      await reset();
      await page.evaluate(([x, y]) => window.__house.tap(x, y), [r.x, r.y]);
      const ev = await events();
      check(ev.length === 1 && ev[0] === 'open:' + r.id, label + ': tik op ' + r.id + ' gaf ' + JSON.stringify(ev));
    }
  }

  // Draaien van een iPad: naar 844x390 en terug, de tikvlakken kloppen nog.
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(300);
  await tapAll('liggend 844x390');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  await tapAll('terug 1280x800');

  // Terug uit een spel: pause en resume, daarna werkt een kamertik nog.
  await page.evaluate(() => { window.__hub3d.pause(); window.__hub3d.resume(); });
  await page.waitForTimeout(300);
  await tapAll('na pause/resume');
  const sz = await page.evaluate(() => { const c = document.getElementById('scene'); return { w: c.clientWidth, h: c.clientHeight }; });
  check(sz.w === 1280 && sz.h === 800, 'canvasmaat na resume is ' + JSON.stringify(sz));

  check(errors.length === 0, errors[0]);
  console.log('SMOKE OK');
  await browser.close();
} catch (e) {
  await fail(e.message);
}
