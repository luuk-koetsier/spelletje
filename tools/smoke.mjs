import { open, waitReady } from './common.mjs';

const IDS = ['memory', 'puzzel', 'vormen', 'tellen', 'kleuren', 'verkleden', 'speel', 'stickers'];
const FURNISHED = IDS;
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

  // De kamers worden in stap B ingericht (met hun bewoner-kat), dus daar eerst op wachten.
  await page.waitForFunction(() => window.__house.stageB === 'done', null, { timeout: 60000, polling: 250 })
    .catch(() => { throw new Error('stap B (modellen en inrichting) niet klaar binnen 60 s'); });
  const events = () => page.evaluate(() => window.__house.events.slice());
  const reset = () => page.evaluate(() => { window.__house.events.length = 0; document.getElementById('modal').classList.remove('open'); });

  // Prestatie: voorlopig alleen loggen (budget 150 calls / 150.000 driehoeken, hard vanaf Taak 11).
  const info = await page.evaluate(() => { window.__house.frame(); return window.__house.info(); });
  console.log('info: calls=' + info.calls + ' triangles=' + info.triangles + ' tier=' + info.tier);
  if (info.calls > 150) console.log('LET OP: calls ' + info.calls + ' > 150');
  if (info.triangles > 150000) console.log('LET OP: triangles ' + info.triangles + ' > 150000');

  // Per ingerichte kamer hooguit 12 draw calls: meten door de kamer te verbergen.
  for (const id of FURNISHED) {
    const k = await page.evaluate((id) => {
      const H = window.__house;
      if (!H.hideRoom) return { err: '__house.hideRoom ontbreekt' };
      H.frame(); const a = H.info();
      H.hideRoom(id, true); H.frame(); const b = H.info();
      H.hideRoom(id, false); H.frame();
      return { calls: a.calls - b.calls, triangles: a.triangles - b.triangles };
    }, id);
    check(!k.err, k.err);
    console.log('kamer ' + id + ': calls=' + k.calls + ' triangles=' + k.triangles);
    check(k.calls >= 6, 'kamer ' + id + ' lijkt niet ingericht (' + k.calls + ' calls)');
    check(k.calls <= 12, 'kamer ' + id + ' kost ' + k.calls + ' draw calls, verwacht hooguit 12');
  }

  // Lampen: hooguit twee PointLights in het hele huis, en hooguit één lamp met schaduw.
  const li = await page.evaluate(() => window.__house.lights ? window.__house.lights() : null);
  check(li, '__house.lights ontbreekt');
  console.log('lampen: ' + li.point + ' PointLights, ' + li.shadow + ' met schaduw');
  check(li.point <= 2, li.point + ' PointLights, verwacht hooguit 2');
  check(li.shadow <= 1, li.shadow + ' lampen met schaduw, verwacht hooguit 1');

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

  // Katten: elf in één stijl (acht bewoners, Mauwtje en twee tuinkatten).
  const cats = await page.evaluate(() => window.__house.cats && window.__house.cats());
  check(Array.isArray(cats), '__house.cats() ontbreekt');
  check(cats.length === 11, 'aantal objecten met userData.catId is ' + cats.length + ', verwacht 11');
  const catIds = cats.map(c => c.id).sort();
  check(JSON.stringify(catIds) === JSON.stringify([...IDS, 'mauwtje', 'tuin1', 'tuin2'].sort()), 'kat-ids kloppen niet: ' + catIds.join(','));
  const mauw = cats.find(c => c.id === 'mauwtje');
  const doorBox = await page.evaluate(() => window.__house.doorBox());
  console.log('mauwtje: bovenkant ' + mauw.top.toFixed(2) + ', deur: bovenkant ' + doorBox.top.toFixed(2));
  check(mauw.top < doorBox.top, 'Mauwtje (bovenkant ' + mauw.top.toFixed(2) + ') is niet lager dan de deur (' + doorBox.top.toFixed(2) + ')');
  for (const c of cats.filter(c => c.room)) {
    const k = c.height / c.roomH;
    check(k > 0.25 && k < 0.55, 'bewoner ' + c.id + ' is ' + k.toFixed(2) + ' keer de kamerhoogte');
  }
  console.log('bewoners: ' + cats.filter(c => c.room).map(c => c.id + '=' + (c.height / c.roomH).toFixed(2)).join(' '));
  // Een tik op elke kat geeft een sprongetje en logt cat:<id> (Mauwtje: surprise:mauwtje), ook in een kamer.
  for (const c of cats) {
    check(c.x >= 0 && c.x <= 1280 && c.y >= 0 && c.y <= 800, 'kat ' + c.id + ' valt buiten beeld: ' + JSON.stringify(c));
    await reset();
    await page.evaluate(([x, y]) => window.__house.tap(x, y), [c.x, c.y]);
    const ev = await events();
    const want = c.id === 'mauwtje' ? 'surprise:mauwtje' : 'cat:' + c.id;
    check(ev.length === 1 && ev[0] === want, 'tik op kat ' + c.id + ' gaf ' + JSON.stringify(ev));
  }
  // Het sprongetje: na een tik komt Mauwtje los van de grond en daarna staat hij weer.
  // (Headless rendert traag, dus wachten op de toestand in plaats van op een vaste tijd.)
  await reset();
  await page.evaluate(([x, y]) => window.__house.tap(x, y), [mauw.x, mauw.y]);
  const jumpOf = () => window.__house.cats().find(c => c.id === 'mauwtje').jumpY;
  // SwiftShader haalt hier soms maar één beeld per seconde (of minder), dus ruim wachten.
  await page.waitForFunction(`(${jumpOf})() > 0.05`, null, { timeout: 15000, polling: 'raf' })
    .catch(() => { throw new Error('Mauwtje springt niet na een tik'); });
  await page.waitForFunction(`(${jumpOf})() === 0`, null, { timeout: 8000, polling: 100 })
    .catch(() => { throw new Error('Mauwtje landt niet na het sprongetje'); });
  // Slepen vanaf een kat activeert niets.
  await reset();
  await page.evaluate(([x, y]) => window.__house.drag(x, y, x + 120, y), [mauw.x, mauw.y]);
  check((await events()).length === 0, 'slepen vanaf Mauwtje logde iets');
  // Camera terug naar de startstand, zodat de tests hierna dezelfde kijkhoek hebben als voorheen.
  await page.evaluate(() => document.getElementById('homeBtn').click());
  await page.waitForTimeout(1500);

  // Slepen (120 px) vanaf een kamermidden activeert niets.
  await reset();
  const r0 = rooms[0];
  await page.evaluate(([x, y]) => window.__house.drag(x, y, x + 120, y), [r0.x, r0.y]);
  const sev = await events();
  check(sev.length === 0, 'slepen logde ' + JSON.stringify(sev));

  // Na een kort sleepje (38 px, het huis draait dan zo'n 17 graden bij tot ongeveer 30 graden schuin)
  // opent een tik op een kamer die kamer en niet de buurkamer. Getikt wordt op het midden van de
  // kameropening (k=0) en dieper in de kamer (k=0.7, wat je door de opening ziet). Staat de eigen
  // bewoner-kat precies daar, dan is cat:<id> ook goed; een andere kamer nooit.
  for (const dx of [38, -38]) {
    await page.evaluate(() => window.__house.home());
    const az0 = (await page.evaluate(() => window.__house.info())).azimuth;
    const c = await page.evaluate(() => ({ x: innerWidth / 2, y: innerHeight * 0.85 }));
    await page.evaluate(([x, y, dx]) => window.__house.drag(x, y, x + dx, y), [c.x, c.y, dx]);
    await page.evaluate(() => window.__house.settle());
    const az1 = (await page.evaluate(() => window.__house.info())).azimuth;
    check(Math.abs(az1 - az0) >= 12, 'sleepje ' + dx + ' px draaide maar ' + (az1 - az0) + ' graden');
    for (const k of [0, 0.7]) {
      const fr = await page.evaluate((k) => window.__house.fronts(k), k);
      check(fr.length === 8, 'fronts().length is ' + fr.length);
      for (const r of fr) {
        await reset();
        await page.evaluate(([x, y]) => window.__house.tap(x, y), [r.x, r.y]);
        const ev = await events();
        check(ev.length === 1 && (ev[0] === 'open:' + r.id || ev[0] === 'cat:' + r.id),
          'na sleepje ' + dx + ' px (azimut ' + az1 + '): tik op kamer ' + r.id + ' (k=' + k + ') gaf ' + JSON.stringify(ev));
      }
    }
    console.log('sleepje ' + dx + ' px: azimut ' + az0 + ' -> ' + az1 + ' graden, alle kamertikken goed');
  }
  await page.evaluate(() => window.__house.home());

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

  // Stap B: alle kamermodellen geladen, zonder fouten.
  await page.waitForFunction(() => window.__house.stageB === 'done', null, { timeout: 60000, polling: 250 })
    .catch(() => { throw new Error('stap B (modellen) niet klaar binnen 60 s'); });
  const am = await page.evaluate(() => window.__house.assets());
  console.log('modellen: ' + am.loaded + ' geladen, ' + am.failed + ' mislukt');
  check(am.failed === 0, 'modellen mislukt: ' + JSON.stringify(am));
  check(am.loaded === am.wanted && am.wanted > 0, 'niet alle modellen geladen: ' + JSON.stringify(am));

  check(errors.length === 0, errors[0]);
  await browser.close();

  // Staand op een telefoon (390x844 en 360x780): het hele huis past, elk kamertikvlak is minstens
  // 70x70 px, en de voordeur is via de ankerpunten van de huisvorm aan te tikken.
  async function phone(W, H) {
    const MIN = 70, tag = 'telefoon ' + W + 'x' + H;
    const ph = await open({ width: W, height: H });
    browser = ph.browser;
    const pp = ph.page;
    try { await waitReady(pp, 60000); }
    catch { await fail(tag + ': __house.ready niet binnen 60 s' + (ph.errors.length ? ' (' + ph.errors[0] + ')' : '')); }
    await pp.waitForFunction(() => window.__house.stageB === 'done', null, { timeout: 60000, polling: 250 })
      .catch(() => { throw new Error(tag + ': stap B niet klaar binnen 60 s'); });
    const hb = await pp.evaluate(() => window.__house.bounds());
    console.log(tag + ': huis op scherm ' + JSON.stringify(hb) + ', vult ' + Math.round((hb.y1 - hb.y0) / H * 100) + '% van de hoogte');
    check(hb.x0 >= 0 && hb.y0 >= 0 && hb.x1 <= W && hb.y1 <= H, tag + ': het huis past niet in beeld: ' + JSON.stringify(hb));
    const prs = await pp.evaluate(() => window.__house.rooms());
    check(prs.length === 8, tag + ': rooms().length is ' + prs.length);
    for (const r of prs) {
      check(r.x >= 0 && r.x <= W && r.y >= 0 && r.y <= H, tag + ': kamer ' + r.id + ' valt buiten beeld: ' + JSON.stringify(r));
      check(r.w >= MIN && r.h >= MIN, tag + ': tikvlak ' + r.id + ' is ' + r.w + 'x' + r.h + ' px, verwacht minstens ' + MIN + 'x' + MIN);
      await pp.evaluate(() => { window.__house.events.length = 0; document.getElementById('modal').classList.remove('open'); });
      await pp.evaluate(([x, y]) => window.__house.tap(x, y), [r.x, r.y]);
      const ev = await pp.evaluate(() => window.__house.events.slice());
      check(ev.length === 1 && ev[0] === 'open:' + r.id, tag + ': tik op ' + r.id + ' gaf ' + JSON.stringify(ev));
    }
    console.log(tag + ': kleinste tikvlak ' + Math.min(...prs.map(r => r.w)) + 'x' + Math.min(...prs.map(r => r.h)) + ' px');
    const an = await pp.evaluate(() => window.__house.anchors && window.__house.anchors());
    check(an && an.door, tag + ': __house.anchors().door ontbreekt');
    for (const k of ['doorbell', 'clock', 'birdhouse', 'mailbox', 'flowerpot', 'mauwtje', 'doghouse', 'wateringcan', 'ball'])
      check(an[k], tag + ': anker ' + k + ' ontbreekt');
    // Elke kat staat in beeld en reageert op een tik.
    const pcs = await pp.evaluate(() => window.__house.cats());
    check(pcs.length === 11, tag + ': aantal katten is ' + pcs.length);
    for (const c of pcs) {
      check(c.x >= 0 && c.x <= W && c.y >= 0 && c.y <= H, tag + ': kat ' + c.id + ' valt buiten beeld: ' + JSON.stringify(c));
      await pp.evaluate(() => { window.__house.events.length = 0; document.getElementById('modal').classList.remove('open'); });
      await pp.evaluate(([x, y]) => window.__house.tap(x, y), [c.x, c.y]);
      const ev = await pp.evaluate(() => window.__house.events.slice());
      const want = c.id === 'mauwtje' ? 'surprise:mauwtje' : 'cat:' + c.id;
      check(ev.length === 1 && ev[0] === want, tag + ': tik op kat ' + c.id + ' gaf ' + JSON.stringify(ev));
    }
    await pp.evaluate(() => { window.__house.events.length = 0; });
    await pp.evaluate(([x, y]) => window.__house.tap(x, y), [an.door.x, an.door.y]);
    const pdev = await pp.evaluate(() => window.__house.events.slice());
    check(pdev.length === 1 && pdev[0] === 'door', tag + ': tik op de deur (anker) gaf ' + JSON.stringify(pdev));
    check(ph.errors.length === 0, tag + ': ' + ph.errors[0]);
    await browser.close();
  }
  await phone(390, 844);
  await phone(360, 780);

  // Draaien van liggend naar staand: de camera komt weer op passende afstand en het hele huis
  // staat in beeld. Dit loopt door dezelfde code als zonder testmodus (geen sprong naar camEnd).
  {
    const rt = await open({ width: 844, height: 390 });
    browser = rt.browser;
    const rp = rt.page;
    try { await waitReady(rp, 60000); }
    catch { await fail('draaien: __house.ready niet binnen 60 s'); }
    await rp.setViewportSize({ width: 390, height: 844 });
    await rp.waitForTimeout(800);
    const rb = await rp.evaluate(() => { window.__house.frame(); return window.__house.bounds(); });
    console.log('draaien 844x390 -> 390x844: huis op scherm ' + JSON.stringify(rb));
    check(rb.x0 >= 0 && rb.y0 >= 0 && rb.x1 <= 390 && rb.y1 <= 844, 'draaien: het huis past na liggend naar staand niet in beeld: ' + JSON.stringify(rb));
    check(rt.errors.length === 0, 'draaien: ' + rt.errors[0]);
    await browser.close();
  }

  // Modellen die niet laden (?failmodels=1) breken het huis niet.
  {
    const f = await open({ width: 1280, height: 800 }, 'debug=1&q=low&failmodels=1');
    browser = f.browser;
    const fp = f.page;
    try { await waitReady(fp, 60000); }
    catch { await fail('failmodels: __house.ready niet binnen 60 s' + (f.errors.length ? ' (' + f.errors[0] + ')' : '')); }
    await fp.waitForFunction(() => window.__house.stageB === 'done', null, { timeout: 60000, polling: 250 })
      .catch(() => { throw new Error('failmodels: stap B niet afgerond'); });
    const fa = await fp.evaluate(() => window.__house.assets && window.__house.assets());
    check(fa && fa.failmodels === true && fa.loaded === 0, 'failmodels: vlag werkt niet: ' + JSON.stringify(fa));
    const frs = await fp.evaluate(() => window.__house.rooms());
    check(frs.length === 8, 'failmodels: rooms().length is ' + frs.length);
    for (const r of frs) {
      await fp.evaluate(() => { window.__house.events.length = 0; document.getElementById('modal').classList.remove('open'); });
      await fp.evaluate(([x, y]) => window.__house.tap(x, y), [r.x, r.y]);
      const ev = await fp.evaluate(() => window.__house.events.slice());
      check(ev.length === 1 && ev[0] === 'open:' + r.id, 'failmodels: tik op ' + r.id + ' gaf ' + JSON.stringify(ev));
    }
    const fcats = await fp.evaluate(() => window.__house.cats());
    check(fcats.length === 11, 'failmodels: aantal katten is ' + fcats.length + ', verwacht 11');
    check(f.errors.length === 0, 'failmodels: ' + f.errors[0]);
    await browser.close();
  }

  console.log('SMOKE OK');
} catch (e) {
  await fail(e.message);
}
