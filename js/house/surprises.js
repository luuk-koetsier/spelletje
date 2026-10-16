/* Tikbare verrassingen in en rond het kattenhuis.
   Tien verrassingen uit het oude 2D-huis komen terug als 3D-speelgoed: Mauwtje, de deurbel, de klok,
   de brievenbus, de bloempot, het vogelhuisje, de hond, de gieter, de voetbal en de dingen in de lucht.
   Elke verrassing krijgt een ruim, onzichtbaar tikvlak (minstens 1,6 keer zo groot als het object)
   en een korte, vrolijke reactie: een eenvoudige tween in de animatielus (updateSurprises), plus een
   geluidje en een zinnetje via window.KH (die zwijgen zelf als het geluid uit staat).
   De deurbel, de klok en het vogelhuisje worden hier gebouwd; de rest staat al in de tuin (garden.js),
   in de huisvorm (shell.js, de voordeur) of is een kat (cats.js, Mauwtje). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, shade } from './style.js';
import { reactCat } from './cats.js';

// De zinnetjes uit de oude handlers in scenes.hub ({NAAM} vult KH.say in).
const LINES = {
  mauwtje: ['Miauw! Hoi {NAAM}!', 'Ik ben Mauwtje! Kom je spelen?', 'Miauw! Wat fijn dat je er bent, {NAAM}!', 'Prrrr... kroel kroel!'],
  deurbel: ['Ding dong! Wie is daar?', 'Ding dong! Hoi {NAAM}!', 'Ding dong! Bezoek voor de katjes!'],
  klok: ['Koekoek! Koekoek!', 'Koekoek! Tijd om te spelen!'],
  brievenbus: ['Post voor {NAAM}!', 'Er zit een pakketje in!', 'Piep! Er woont een muisje in de brievenbus!', 'Een brief van de katjes!'],
  bloempot: ['Kijk, hij bloeit!', 'Wat een mooie bloem!', 'Die is voor jou, {NAAM}!'],
  vogelhuisje: ['Tsjilp tsjilp!', 'Er woont een vogeltje in!', 'Tsjilp! Goeiemorgen!'],
  hond: ['Woef woef!', 'Woef! Hoi {NAAM}!', 'Woef woef! Kom je spelen?', 'Waf! Ik pas op het huis!'],
  gieter: ['Kijk, de bloemetjes groeien!', 'Lekker water voor de bloemen!', 'Goed gegoten, {NAAM}!'],
};
// De geluidjes (namen in sfx in index.html). Mauwtje miauwt via reactCat.
const SOUND = {
  deurbel: 'bel', klok: 'koekoek', brievenbus: 'plop', bloempot: 'bloei', vogelhuisje: 'tsjilp',
  hond: 'blaf', gieter: 'gieten', voetbal: 'boing', lucht: 'plop',
};

// ── hulpjes (zelfde aanpak als garden.js: samengevoegde geometrie met vertex-kleuren) ──
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
function part(geo, hex, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const toyV = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0 });
function mesh(parts, name, { cast = true, visible = true } = {}) {
  const m = new THREE.Mesh(mergeGeometries(parts, false), toyV);
  m.name = name; m.castShadow = cast; m.receiveShadow = true; m.visible = visible;
  return m;
}
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });

// Omhullende doos van de zichtbare delen van een object, in de eigen ruimte van dat object.
function localBox(object) {
  object.updateMatrixWorld(true);
  const inv = object.matrixWorld.clone().invert(), box = new THREE.Box3(), b = new THREE.Box3(), m = new THREE.Matrix4();
  object.traverse(o => {
    if (!o.isMesh || !o.visible || o === object.userData.shadow) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(b.copy(o.geometry.boundingBox).applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld)));
  });
  return box;
}
// Onzichtbaar tikvlak: 1,65 keer de objectgrootte (net boven de eis van 1,6) en minstens `min` per as, als kind van het object,
// zodat het meebeweegt.
function hitBox(object, min) {
  const box = localBox(object), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const hs = new THREE.Vector3(Math.max(size.x * 1.65, min), Math.max(size.y * 1.65, min), Math.max(size.z * 1.65, min));
  const hit = new THREE.Mesh(new THREE.BoxGeometry(hs.x, hs.y, hs.z), hitMat);
  hit.position.copy(c); hit.visible = false;
  hit.userData.ratio = Math.min(hs.x / Math.max(size.x, 1e-6), hs.y / Math.max(size.y, 1e-6), hs.z / Math.max(size.z, 1e-6));
  object.add(hit);
  return hit;
}

// Eenvoudige tweens: een omhullende die opkomt, even blijft en weer gaat (0 bij k = 0 en k = 1).
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const env = (k, up, down) => smooth(k / up) * (1 - smooth((k - down) / (1 - down)));
const bump = k => Math.sin(Math.PI * clamp01(k));

function say(id) { const kh = window.KH; if (kh && kh.say && LINES[id]) kh.say(LINES[id]); }
function sfx(id) { const kh = window.KH; if (kh && kh.sfx && SOUND[id]) kh.sfx(SOUND[id]); }

const list = [];
// Registreer een verrassing. step(k) zet de beweging op voortgang k (0..1); step(1) is weer de ruststand.
function register(id, object, { dur, step, min = 0.5, start }) {
  const hit = hitBox(object, min);
  hit.userData.surprise = id;
  const s = {
    id, object, hit, dur, left: 0, ratio: hit.userData.ratio,
    get active() { return this.left > 0; },
    react() {
      this.left = this.dur;
      if (start) start();
      sfx(id); say(id);
    },
    step,
  };
  list.push(s);
  return s;
}

// ── nieuwe objecten: deurbel, klok en vogelhuisje ──
function buildDoorbell(at) {
  const g = new THREE.Group();
  g.name = 'surprise-doorbell';
  const base = mesh([
    part(new RoundedBoxGeometry(0.24, 0.32, 0.06, 2, 0.025), '#FFFFFF', M(0, 0, 0.03)),
    part(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 16), PAL.pinkD, M(0, 0.02, 0.07, Math.PI / 2, 0, 0)),
  ], 'doorbell-plate');
  const button = mesh([part(new THREE.SphereGeometry(0.055, 14, 10), PAL.yellow, M(0, 0, 0, 0, 0, 0, 1, 1, 0.6))], 'doorbell-button');
  button.position.set(0, 0.02, 0.09);
  g.add(base, button);
  g.position.copy(at);
  return { group: g, button };
}

function buildClock(at) {
  // Een koekoeksklokje van speelgoedhout op het voorhoofd van de kop.
  const g = new THREE.Group();
  g.name = 'surprise-clock';
  const wood = PAL.wood, roof = PAL.coral;
  const p = [
    part(new RoundedBoxGeometry(0.72, 0.62, 0.16, 3, 0.06), wood, M(0, 0, 0.08)),
    part(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 24), '#FFF7EC', M(0, -0.05, 0.17, Math.PI / 2, 0, 0)),
    part(new THREE.TorusGeometry(0.22, 0.03, 8, 24), '#FFFFFF', M(0, -0.05, 0.18)),
    part(new THREE.CircleGeometry(0.075, 16), '#5A4660', M(0, 0.22, 0.165)),   // deurtje van de koekoek
    part(new THREE.SphereGeometry(0.035, 8, 6), PAL.pinkD, M(0, -0.05, 0.2)),
  ];
  for (let i = 0; i < 12; i += 3) { const a = i / 12 * Math.PI * 2;
    p.push(part(new THREE.SphereGeometry(0.022, 6, 4), PAL.pinkD, M(Math.sin(a) * 0.17, -0.05 + Math.cos(a) * 0.17, 0.19))); }
  for (const sgn of [-1, 1]) p.push(part(new RoundedBoxGeometry(0.5, 0.07, 0.24, 2, 0.03), roof, M(sgn * 0.21, 0.4, 0.08, 0, 0, -sgn * 0.62)));
  p.push(part(new THREE.SphereGeometry(0.05, 10, 8), PAL.yellow, M(0, 0.56, 0.08)));
  // twee dennenappel-gewichtjes aan een touwtje
  for (const sgn of [-1, 1]) {
    p.push(part(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 4), '#FFFFFF', M(sgn * 0.13, -0.42, 0.1)));
    p.push(part(new THREE.CapsuleGeometry(0.035, 0.07, 3, 8), PAL.woodD, M(sgn * 0.13, -0.56, 0.1)));
  }
  g.add(mesh(p, 'clock-body'));
  const hand = (len, w, col) => {
    const m = mesh([part(new RoundedBoxGeometry(w, len, 0.015, 1, 0.006), col, M(0, len / 2 - 0.02, 0))], 'clock-hand', { cast: false });
    m.position.set(0, -0.05, 0.19);
    g.add(m);
    return m;
  };
  const minute = hand(0.17, 0.025, '#3A2F45'), hour = hand(0.12, 0.032, PAL.pinkD);
  minute.rotation.z = -Math.PI * 2 * (10 / 60); hour.rotation.z = -Math.PI * 2 * (10 / 12);   // tien over tien
  const bird = mesh([
    part(new THREE.SphereGeometry(0.06, 12, 8), PAL.butter, M(0, 0, 0)),
    part(new THREE.ConeGeometry(0.022, 0.06, 8), PAL.orange, M(0, -0.005, 0.07, Math.PI / 2, 0, 0)),
    part(new THREE.SphereGeometry(0.012, 6, 4), '#3A2F45', M(0.03, 0.025, 0.045)),
    part(new THREE.SphereGeometry(0.012, 6, 4), '#3A2F45', M(-0.03, 0.025, 0.045)),
  ], 'clock-bird', { cast: false, visible: false });
  bird.position.set(0, 0.22, 0.1);
  g.add(bird);
  g.position.copy(at);
  return { group: g, minute, hour, bird, m0: minute.rotation.z, h0: hour.rotation.z };
}

function buildBirdhouse(at) {
  // Een vogelhuisje bovenop de kop, tussen de oren, met de opening naar voren.
  const g = new THREE.Group();
  g.name = 'surprise-birdhouse';
  const p = [
    part(new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8), '#FFFFFF', M(0, 0.15, 0)),
    part(new RoundedBoxGeometry(0.62, 0.56, 0.52, 3, 0.07), PAL.mint, M(0, 0.58, 0)),
    part(new THREE.CircleGeometry(0.12, 18), '#5A4660', M(0, 0.62, 0.262)),
    part(new THREE.TorusGeometry(0.12, 0.025, 6, 18), '#FFFFFF', M(0, 0.62, 0.265)),
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 6), PAL.woodD, M(0, 0.44, 0.31, Math.PI / 2, 0, 0)),
  ];
  for (const sgn of [-1, 1]) p.push(part(new RoundedBoxGeometry(0.48, 0.07, 0.64, 2, 0.03), PAL.pinkD, M(sgn * 0.19, 0.96, 0, 0, 0, -sgn * 0.68)));
  p.push(part(new THREE.SphereGeometry(0.05, 10, 8), PAL.yellow, M(0, 1.14, 0)));
  g.add(mesh(p, 'birdhouse-body'));
  const bird = mesh([
    part(new THREE.SphereGeometry(0.1, 14, 10), PAL.blue, M(0, 0, 0)),
    part(new THREE.SphereGeometry(0.07, 10, 8), '#FFFFFF', M(0, -0.03, 0.05, 0, 0, 0, 1, 0.8, 0.7)),
    part(new THREE.ConeGeometry(0.03, 0.07, 8), PAL.orange, M(0, 0.0, 0.11, Math.PI / 2, 0, 0)),
    part(new THREE.SphereGeometry(0.016, 6, 4), '#3A2F45', M(0.045, 0.035, 0.075)),
    part(new THREE.SphereGeometry(0.016, 6, 4), '#3A2F45', M(-0.045, 0.035, 0.075)),
  ], 'birdhouse-bird', { cast: false, visible: false });
  bird.position.set(0, 0.6, 0.12);
  g.add(bird);
  g.position.copy(at);
  return { group: g, bird };
}

/* Alle verrassingen neerzetten en registreren. De tuin (garden.js), de voordeur (shell.js) en
   Mauwtje (cats.js) staan dan al in de scène; die worden hier op naam opgezocht. */
export function addSurprises(scene, anchors) {
  const garden = scene.getObjectByName('garden');
  const part_ = name => garden.getObjectByName(name);

  // Mauwtje: springt op, miauwt (reactCat) en zegt iets liefs.
  const mauwtje = scene.getObjectByName('cat-mauwtje');
  if (mauwtje) register('mauwtje', mauwtje, { dur: 0.5, min: 0.6, step() {}, start() { reactCat(mauwtje); } });

  // Deurbel: knopje gaat in, ding-dong, en de voordeur gaat even open (scharnier links).
  {
    const bell = buildDoorbell(anchors.doorbell);
    scene.add(bell.group);
    const door = scene.getObjectByName('house-door');
    const W = 0.62, base = door ? door.position.clone() : null;
    register('deurbel', bell.group, { dur: 1.8, min: 0.45, step(k) {
      bell.button.scale.z = 1 - 0.5 * bump(k / 0.15);
      bell.group.rotation.z = Math.sin(k * Math.PI * 6) * 0.08 * (1 - k);
      if (!door) return;
      const th = -1.0 * env(k, 0.25, 0.7);
      door.rotation.y = th;
      door.position.x = base.x - W + W * Math.cos(th);
      door.position.z = base.z - W * Math.sin(th);
    } });
  }

  // Klok: tikt (wiebelt), de wijzers draaien rond en de koekoek komt naar buiten.
  {
    const c = buildClock(anchors.clock);
    scene.add(c.group);
    register('klok', c.group, { dur: 2.0, min: 0.5, step(k) {
      const e = smooth(k);
      c.minute.rotation.z = c.m0 - e * Math.PI * 4;
      c.hour.rotation.z = c.h0 - e * Math.PI / 3;
      c.group.rotation.z = Math.sin(k * Math.PI * 10) * 0.05 * (1 - k);
      const out = env(k, 0.2, 0.8);
      c.bird.visible = out > 0.01;
      c.bird.position.z = 0.1 + out * 0.16;
      c.bird.rotation.x = -Math.sin(k * Math.PI * 4) * 0.25 * out;
      if (k >= 1) { c.minute.rotation.z = c.m0; c.hour.rotation.z = c.h0; }
    } });
  }

  // Brievenbus: het klepje gaat open en er vliegt een briefje uit.
  {
    const mailbox = part_('mailbox'), lid = part_('mailbox-lid');
    const letter = mesh([
      part(new RoundedBoxGeometry(0.26, 0.17, 0.025, 1, 0.01), '#FFFFFF', M()),
      part(new THREE.SphereGeometry(0.035, 8, 6), PAL.pinkD, M(0, 0, 0.015, 0, 0, 0, 1, 1, 0.4)),
    ], 'mailbox-letter', { cast: false, visible: false });
    register('brievenbus', mailbox, { dur: 1.6, min: 0.5, step(k) {
      lid.rotation.x = 1.3 * env(k, 0.15, 0.8);
      const q = clamp01((k - 0.12) / 0.75);
      letter.visible = q > 0 && q < 1;
      letter.position.set(0, 0.72 + q * 1.1, 0.25 + q * 0.35);
      letter.rotation.set(-0.3, q * Math.PI * 2, Math.sin(q * 9) * 0.3);
      letter.scale.setScalar(q < 0.75 ? 1 : 1 - (q - 0.75) / 0.25);
    } });
    mailbox.add(letter);   // na het tikvlak, zodat het briefje niet meetelt in de objectgrootte
  }

  // Bloempot: de bloem gaat open (groeit en draait een rondje) en wordt weer gewoon.
  {
    const pot = part_('flowerpot'), bloom = part_('flowerpot-bloom');
    register('bloempot', pot, { dur: 1.4, min: 0.45, step(k) {
      bloom.scale.setScalar(1 + 0.7 * bump(k));
      bloom.rotation.y = smooth(k) * Math.PI * 2;
    } });
  }

  // Vogelhuisje: het vogeltje kijkt naar buiten en zegt tsjilp.
  {
    const b = buildBirdhouse(anchors.birdhouse);
    scene.add(b.group);
    register('vogelhuisje', b.group, { dur: 1.8, min: 0.5, step(k) {
      const out = env(k, 0.2, 0.75);
      b.bird.visible = out > 0.01;
      b.bird.position.z = 0.12 + out * 0.18;
      b.bird.rotation.z = Math.sin(k * Math.PI * 6) * 0.3 * out;
      b.group.rotation.z = Math.sin(k * Math.PI * 8) * 0.04 * (1 - k);
    } });
  }

  // Hond: komt naar buiten kijken en kwispelt met zijn kop.
  {
    const doghouse = part_('doghouse'), dog = part_('dog');
    const z0 = dog.userData.baseZ ?? dog.position.z, y0 = dog.position.y;
    register('hond', doghouse, { dur: 1.4, min: 0.6, step(k) {
      const out = env(k, 0.2, 0.75);
      dog.position.z = z0 + out * 0.18;
      dog.position.y = y0 + Math.abs(Math.sin(k * Math.PI * 4)) * 0.05 * out;
      dog.rotation.z = Math.sin(k * Math.PI * 6) * 0.3 * out;
    } });
  }

  // Gieter: kantelt en giet, er vallen druppels en er groeien bloemetjes, die na een tijdje weer gaan.
  {
    const can = part_('wateringcan'), body = can.children[0];
    const drops = mesh([0, 1, 2].map(i => part(new THREE.SphereGeometry(0.025, 6, 4), '#9FD8F5', M(0.015 * (i % 2), -i * 0.06, 0.015 * (i - 1), 0, 0, 0, 1, 1.4, 1))),
      'wateringcan-drops', { cast: false, visible: false });
    const fp = [];
    [[0.62, 0.12], [0.75, -0.14], [0.52, -0.3]].forEach(([x, z], i) => {
      fp.push(part(new THREE.CylinderGeometry(0.012, 0.016, 0.2, 5), PAL.green, M(x, 0.1, z)));
      fp.push(part(new THREE.SphereGeometry(0.03, 8, 6), PAL.yellow, M(x, 0.21, z)));
      const col = [PAL.coral, PAL.purple, PAL.pink][i];
      for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2;
        fp.push(part(new THREE.SphereGeometry(0.035, 6, 4), col, M(x + Math.cos(a) * 0.05, 0.205, z + Math.sin(a) * 0.05, 0, -a, 0, 1, 0.5, 0.8))); }
    });
    const flowers = mesh(fp, 'wateringcan-flowers', { visible: false });
    const DUR = 6;
    register('gieter', can, { dur: DUR, min: 0.5, step(k) {
      const s = k * DUR;   // seconden sinds de tik
      // kantelen om de onderrand aan de kant van de tuit (px), zodat de gieter niet in het gras zakt
      const th = -0.45 * env(s / 2, 0.25, 0.75), px = 0.17;
      body.rotation.z = th;
      body.position.set(px - px * Math.cos(th), -px * Math.sin(th), 0);
      drops.visible = th < -0.3;
      drops.position.set(0.5, 0.17 - ((s * 2.2) % 1) * 0.05, 0);
      const grow = smooth((s - 0.6) / 1.2) * (1 - smooth((s - 5.2) / 0.8));
      flowers.visible = grow > 0.01;
      flowers.scale.set(1, Math.max(grow, 0.001), 1);
    } });
    can.add(drops, flowers);
  }

  // Voetbal: stuitert een stukje weg en rolt terug.
  {
    const ball = part_('ball'), body = ball.children[0];
    const base = ball.position.clone(), dir = new THREE.Vector3(-0.8, 0, 0.6).normalize(), R = 0.2;
    register('voetbal', ball, { dur: 1.8, min: 0.45, step(k) {
      const d = 0.9 * bump(k);
      ball.position.set(base.x + dir.x * d, base.y + Math.abs(Math.sin(k * Math.PI * 3)) * 0.4 * (1 - k), base.z + dir.z * d);
      body.rotation.set(d / R * dir.z, 0, -d / R * dir.x);
    } });
  }

  // Dingen in de lucht: een ballon maakt een sprongetje en een pirouette.
  // (garden.update zet elk beeld de deinende stand; deze tween komt daar bovenop.)
  for (const f of garden.children.filter(o => o.userData.flyer === 'ballon')) {
    register('lucht', f, { dur: 1.4, min: 0.6, step(k) {
      f.position.y += 0.7 * bump(k);
      f.rotation.y = smooth(k) * Math.PI * 2;
      f.scale.setScalar(1 + 0.15 * bump(k * 2));
    } });
  }

  return list;
}

// Elk beeld (na garden.update): lopende reacties een stapje verder zetten.
export function updateSurprises(dt) {
  for (const s of list) {
    if (s.left <= 0) continue;
    s.left = Math.max(0, s.left - dt);
    s.step(1 - s.left / s.dur);
  }
}
