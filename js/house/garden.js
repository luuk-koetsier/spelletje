/* Tuin en lucht rond het kattenhuis.
   Rustig en laag: één grasvlak met een zachte textuur, een pad van stapstenen naar de deur,
   een laag hekje, een paar struiken, twee bomen en bloemen op schaal (lager dan een zittende kat).
   Op de ankerpunten van de huisvorm: het hondenhok met een hond, de brievenbus, de gieter,
   de voetbal en de bloempot bij de deur. De lucht is een zachte gradiënt met een paar wolken;
   ballonnen en een vlinder zijn de dingen in de lucht (flyers).
   Vaste onderdelen zijn per materiaal samengevoegd; gras en bloemen zijn InstancedMesh.
   Losse onderdelen die later bewegen (hond, klepje, gieter, bal, bloem, flyers) zijn eigen meshes. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, shade, blobShadow } from './style.js';

const GROUND = -0.2;   // hoogte van het gras (gelijk aan shell.js)
const R_GROUND = 13;   // straal van het grasvlak

// ── hulpjes ──
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function M(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
}
// Geometrie klaarmaken om samen te voegen: zonder index en uv, met één vertex-kleur.
function part(geo, hex, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function mesh(parts, material, { cast = true, receive = true, name = '' } = {}) {
  const m = new THREE.Mesh(mergeGeometries(parts, false), material);
  m.castShadow = cast; m.receiveShadow = receive; m.name = name;
  return m;
}
// Vaste toevalsreeks, zodat de tuin er elke keer hetzelfde uitziet.
function rng(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// ── materialen (kleur zit in de vertex-kleuren) ──
const toyV = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0 });
const softV = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
const wingV = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
const cloudMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, emissive: '#ffffff', emissiveIntensity: 0.28 });

const C = {
  white: '#FFFFFF', ink: PAL.ink, dark: '#5A4660',
  leaf: PAL.green, leafL: shade(PAL.green, 0.07), leafD: shade(PAL.green, -0.06),
  bush: PAL.grassD, bushL: shade(PAL.grassD, 0.06),
  trunk: PAL.woodD, stone: PAL.path, stoneD: shade(PAL.path, -0.05),
  dogWall: '#BFE0F7', dogRoof: PAL.coral, fur: '#E9C9A3', furD: '#B98A64', snout: '#FFF4E6',
  mailbox: PAL.blue, pot: '#F4A98C', soil: '#9A7457',
};

// Zachte grastextuur: één vlak met wat lichte en donkere vlekken, geen losse sprietjes.
function grassTexture() {
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d'), r = rng(7);
  c.fillStyle = PAL.grass; c.fillRect(0, 0, S, S);
  const blob = (x, y, rad, col, a) => {
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {   // naadloos herhalen
      const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x + ox, y + oy, rad, 0, 7); c.fill();
    }
  };
  for (let i = 0; i < 26; i++) blob(r() * S, r() * S, 24 + r() * 40, i % 2 ? '#BCE59F' : '#93CC74', 0.35);
  c.globalAlpha = 0.22;
  for (let i = 0; i < 900; i++) { c.fillStyle = i % 3 ? '#8CC56E' : '#C2E8A8'; c.fillRect(r() * S, r() * S, 2, 2); }
  c.globalAlpha = 1;
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.anisotropy = 4;
  return t;
}

// Zachte gradiëntlucht als achtergrond (geen geometrie, geen draw call).
function skyBackground(scene) {
  const cv = document.createElement('canvas');
  cv.width = 8; cv.height = 256;
  const c = cv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, PAL.skyTop); g.addColorStop(0.55, PAL.sky1); g.addColorStop(1, PAL.sky2);
  c.fillStyle = g; c.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  scene.background = t;
}

// ── losse bouwstenen (geven lijsten met geometrie terug) ──
function treeParts(x, z, s) {
  const out = [part(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 10), C.trunk, M(x, GROUND + 0.6 * s, z, 0, 0, 0, s))];
  for (const [dx, dy, dz, r, col] of [[0, 1.75, 0, 0.95, C.leaf], [0.58, 1.42, 0.22, 0.62, C.leafD], [-0.56, 1.5, -0.12, 0.58, C.leafD], [0.08, 2.3, 0.05, 0.56, C.leafL]])
    out.push(part(new THREE.SphereGeometry(r, 12, 8), col, M(x + dx * s, GROUND + dy * s, z + dz * s, 0, 0, 0, s)));
  return out;
}
function bushParts(x, z, s) {
  const out = [];
  for (const [dx, dz, r, col] of [[0, 0, 0.46, C.bush], [0.4, 0.1, 0.34, C.bushL], [-0.38, 0.12, 0.32, C.bushL]])
    out.push(part(new THREE.SphereGeometry(r, 10, 7), col, M(x + dx * s, GROUND + r * 0.55 * s, z + dz * s, 0, 0, 0, s, s * 0.85, s)));
  return out;
}

export function buildGarden(scene, anchors) {
  const group = new THREE.Group();
  group.name = 'garden';
  scene.add(group);
  skyBackground(scene);
  const blobs = [];   // [x, y, z, straal] voor één samengevoegd schaduwvlak

  // ── grasvlak met een zachte rand ──
  {
    const top = new THREE.Mesh(new THREE.CircleGeometry(R_GROUND, 56).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 0.95 }));
    top.position.y = GROUND; top.receiveShadow = true; top.name = 'garden-grass';
    group.add(top);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(R_GROUND, R_GROUND + 0.3, 0.6, 56, 1, true), new THREE.MeshStandardMaterial({ color: PAL.grassD, roughness: 0.95 }));
    rim.position.y = GROUND - 0.3; rim.name = 'garden-rim';
    group.add(rim);
  }

  // ── pad van stapstenen en een laag hekje (één mesh) ──
  {
    const parts = [];
    [[0, 2.3], [0.12, 3.35], [-0.1, 4.4], [0.08, 5.45], [0, 6.55]].forEach(([x, z], i) =>
      parts.push(part(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 16), i % 2 ? C.stoneD : C.stone, M(x, GROUND + 0.02, z, 0, i * 0.7, 0, 1, 1, 0.82))));
    // Hekje: een boog voor het huis (middelpunt (0, -1), straal 7.7), open bij het pad.
    const CZ = -1, RF = 7.7, GAP = 0.62, H = 0.42;
    const pts = [];
    for (let a = -50; a <= 50.01; a += 5) {
      const rad = THREE.MathUtils.degToRad(a), x = Math.sin(rad) * RF, z = CZ + Math.cos(rad) * RF;
      if (Math.abs(x) < GAP + 0.3) continue;   // ruimte voor de poortpaaltjes
      pts.push({ x, z, rad, gate: false });
    }
    // poortpaaltjes precies naast het pad
    for (const sgn of [-1, 1]) {
      const rad = Math.asin(sgn * GAP / RF);
      pts.push({ x: sgn * GAP, z: CZ + Math.cos(rad) * RF, rad, gate: true });
    }
    pts.sort((p, q) => p.x - q.x);
    for (const p of pts) {
      const h = p.gate ? H + 0.1 : H;
      parts.push(part(new RoundedBoxGeometry(0.11, h, 0.08, 1, 0.03), C.white, M(p.x, GROUND + h / 2, p.z, 0, p.rad, 0)));
      parts.push(part(new THREE.SphereGeometry(p.gate ? 0.075 : 0.055, 6, 4), PAL.pink, M(p.x, GROUND + h + 0.02, p.z)));
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      if (p.x < 0 && q.x > 0) continue;   // niet over het pad
      const dx = q.x - p.x, dz = q.z - p.z, len = Math.hypot(dx, dz), ry = -Math.atan2(dz, dx);
      for (const y of [0.13, 0.29]) parts.push(part(new THREE.BoxGeometry(len, 0.06, 0.04), C.white, M((p.x + q.x) / 2, GROUND + y, (p.z + q.z) / 2, 0, ry, 0)));
    }
    group.add(mesh(parts, toyV, { name: 'garden-path-fence' }));
  }

  // ── twee bomen achter het huis en een paar struiken (één mesh) ──
  {
    const parts = [];
    for (const [x, z, s] of [[-6.6, -2.4, 1], [7.0, -2.6, 0.95]]) { parts.push(...treeParts(x, z, s)); blobs.push([x, GROUND + 0.02, z, 1.4 * s]); }
    for (const [x, z, s] of [[-5.8, 1.5, 1.0], [6.0, 1.9, 0.95], [-3.1, 5.5, 0.7], [4.0, 5.3, 0.7]]) { parts.push(...bushParts(x, z, s)); blobs.push([x, GROUND + 0.02, z, 0.85 * s]); }
    group.add(mesh(parts, softV, { name: 'garden-plants' }));
  }

  // ── grasplukjes (InstancedMesh), alleen buiten het hekje en naast het huis ──
  {
    const tuft = mergeGeometries([
      part(new THREE.ConeGeometry(0.055, 0.24, 5), C.bush, M(0, 0.12, 0, 0, 0, 0.12)),
      part(new THREE.ConeGeometry(0.05, 0.2, 5), C.bushL, M(0.06, 0.1, 0.02, 0, 0, -0.35)),
      part(new THREE.ConeGeometry(0.05, 0.18, 5), C.bush, M(-0.05, 0.09, -0.03, 0.2, 0, 0.4)),
    ], false);
    const r = rng(11), d = new THREE.Object3D(), list = [];
    for (let tries = 0; list.length < 70 && tries < 2000; tries++) {
      const a = r() * Math.PI * 2, rad = 4.5 + r() * 8, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (Math.hypot(x, z + 1) < 8.4 && z > -1.6 && Math.abs(x) < 6.4) continue;   // binnen het hekje en voor het huis vrij
      if (Math.abs(x) < 5 && z < 1.6 && z > -2.2) continue;                       // onder het huis
      if (Math.abs(x) < 1.2 && z > 6) continue;                                    // het pad door de poort
      if (Math.hypot(x + 6.6, z + 2.4) < 1.3 || Math.hypot(x - 7, z + 2.6) < 1.3) continue;
      list.push([x, z, 0.8 + r() * 0.6, r() * 6]);
    }
    const im = new THREE.InstancedMesh(tuft, softV, list.length);
    list.forEach(([x, z, s, ry], i) => { d.position.set(x, GROUND, z); d.rotation.set(0, ry, 0); d.scale.setScalar(s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); });
    im.receiveShadow = true; im.name = 'garden-tufts';
    group.add(im);
  }

  // ── bloemen (InstancedMesh): steel met hartje, en blaadjes met een eigen kleur per bloem ──
  {
    const stem = mergeGeometries([
      part(new THREE.CylinderGeometry(0.016, 0.02, 0.26, 5), C.leafD, M(0, 0.13, 0)),
      part(new THREE.SphereGeometry(0.06, 6, 4), C.leaf, M(0.05, 0.07, 0, 0, 0, -0.7, 1, 0.45, 0.6)),
      part(new THREE.SphereGeometry(0.045, 6, 4), PAL.yellow, M(0, 0.29, 0, 0, 0, 0, 1, 0.7, 1)),
    ], false);
    const petalParts = [];
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2;
      petalParts.push(part(new THREE.SphereGeometry(0.055, 6, 3), C.white, M(Math.cos(a) * 0.07, 0.285, Math.sin(a) * 0.07, 0, -a, 0, 1, 0.5, 0.8))); }
    const petals = mergeGeometries(petalParts, false);
    const cols = [PAL.coral, PAL.pink, PAL.purple, PAL.butter, '#FFFFFF', PAL.peach];
    const spots = [];
    const r = rng(23);
    const cluster = (cx, cz, n, spread = 0.35) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + r(), rr = spread * (0.4 + r() * 0.6); spots.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]); } };
    cluster(-1.35, 6.05, 4); cluster(1.1, 6.2, 3, 0.28);         // bij de poort
    cluster(-4.0, 4.3, 3); cluster(-2.6, 5.95, 3, 0.3);          // bij de struik links
    cluster(4.55, 4.85, 3, 0.3); cluster(-5.0, 2.2, 3, 0.3);      // naast het huis
    cluster(-2.6, 7.5, 3); cluster(2.9, 7.4, 3); cluster(-5.6, 6.3, 2); cluster(5.9, 5.9, 2);   // buiten het hekje
    const stems = new THREE.InstancedMesh(stem, softV, spots.length), heads = new THREE.InstancedMesh(petals, toyV, spots.length);
    const d = new THREE.Object3D(), col = new THREE.Color();
    spots.forEach(([x, z], i) => {
      d.position.set(x, GROUND, z); d.rotation.set(0, r() * 6, 0); d.scale.setScalar(0.95 + r() * 0.3); d.updateMatrix();
      stems.setMatrixAt(i, d.matrix); heads.setMatrixAt(i, d.matrix); heads.setColorAt(i, col.set(cols[i % cols.length]));
    });
    stems.name = 'garden-flower-stems'; heads.name = 'garden-flower-heads';
    heads.castShadow = false;   // klein en laag: een schaduwvlek is niet te zien, en scheelt driehoeken in de schaduwpas
    group.add(stems, heads);
  }

  // ── hondenhok met een hond die naar buiten kijkt (op anchors.doghouse) ──
  const doghouse = new THREE.Group();
  doghouse.name = 'doghouse';
  let dog;
  {
    const p = [];
    p.push(part(new RoundedBoxGeometry(1.14, 0.08, 1.04, 2, 0.03), C.white, M(0, 0.04, 0)));
    p.push(part(new RoundedBoxGeometry(1.0, 0.72, 0.92, 2, 0.07), C.dogWall, M(0, 0.44, 0)));
    // puntgevel (driehoekig prisma) en twee dakschilden
    p.push(part(new THREE.CylinderGeometry(1, 1, 1, 3), C.dogWall, M(0, 0.92, 0, -Math.PI / 2, 0, 0, 0.56, 0.88, 0.24)));
    for (const sgn of [-1, 1]) p.push(part(new RoundedBoxGeometry(0.66, 0.08, 1.1, 2, 0.035), C.dogRoof, M(sgn * 0.262, 0.97, 0, 0, 0, -sgn * 0.6)));
    // donkere deuropening met een witte rand
    p.push(part(new THREE.CircleGeometry(0.2, 16, 0, Math.PI), C.dark, M(0, 0.5, 0.462)));
    p.push(part(new THREE.PlaneGeometry(0.4, 0.38), C.dark, M(0, 0.31, 0.462)));
    p.push(part(new THREE.TorusGeometry(0.2, 0.035, 6, 14, Math.PI), C.white, M(0, 0.5, 0.465)));
    for (const sgn of [-1, 1]) p.push(part(new THREE.BoxGeometry(0.07, 0.38, 0.05), C.white, M(sgn * 0.2, 0.31, 0.465)));
    // etensbakje
    p.push(part(new THREE.CylinderGeometry(0.13, 0.1, 0.07, 14), PAL.pink, M(0.42, 0.035, 0.7)));
    const body = mesh(p, toyV, { name: 'doghouse-body' });
    doghouse.add(body);
    // hond: kop met hangoren, snuitje, neus en oogjes
    const q = [];
    q.push(part(new THREE.SphereGeometry(0.19, 12, 8), C.fur, M(0, 0, 0)));
    q.push(part(new THREE.SphereGeometry(0.1, 12, 8), C.snout, M(0, -0.06, 0.14, 0, 0, 0, 1.2, 0.8, 1)));
    q.push(part(new THREE.SphereGeometry(0.038, 8, 6), C.ink, M(0, -0.02, 0.235)));
    for (const sgn of [-1, 1]) {
      q.push(part(new THREE.SphereGeometry(0.028, 8, 6), C.ink, M(sgn * 0.075, 0.05, 0.165)));
      q.push(part(new THREE.SphereGeometry(0.09, 10, 8), C.furD, M(sgn * 0.17, -0.02, 0, 0, 0, sgn * 0.3, 0.55, 1.35, 0.6)));
    }
    dog = mesh(q, toyV, { name: 'dog' });
    dog.position.set(0, 0.36, 0.4);
    dog.userData.baseZ = 0.4;
    doghouse.add(dog);
    doghouse.position.copy(anchors.doghouse);
    doghouse.rotation.y = 0.4;
    group.add(doghouse);
    blobs.push([anchors.doghouse.x, GROUND + 0.02, anchors.doghouse.z, 0.95]);
  }

  // ── brievenbus met een klepje (op anchors.mailbox) ──
  const mailbox = new THREE.Group();
  mailbox.name = 'mailbox';
  let lid;
  {
    const p = [];
    p.push(part(new RoundedBoxGeometry(0.1, 0.56, 0.1, 1, 0.03), C.trunk, M(0, 0.28, 0)));
    p.push(part(new RoundedBoxGeometry(0.36, 0.3, 0.5, 2, 0.08), C.mailbox, M(0, 0.7, 0)));
    p.push(part(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 6), C.white, M(0.2, 0.8, -0.08)));
    p.push(part(new RoundedBoxGeometry(0.03, 0.1, 0.14, 1, 0.012), PAL.coral, M(0.2, 0.9, -0.01)));
    mailbox.add(mesh(p, toyV, { name: 'mailbox-body' }));
    // Klepje aan de voorkant, scharnier aan de onderkant.
    const lg = mergeGeometries([
      part(new RoundedBoxGeometry(0.32, 0.26, 0.04, 1, 0.015), shade(C.mailbox, -0.06), M(0, 0.13, 0)),
      part(new THREE.SphereGeometry(0.025, 8, 6), PAL.yellow, M(0, 0.2, 0.025)),
    ], false);
    lid = new THREE.Mesh(lg, toyV);
    lid.name = 'mailbox-lid'; lid.castShadow = true;
    lid.position.set(0, 0.57, 0.255);
    mailbox.add(lid);
    mailbox.position.copy(anchors.mailbox);
    mailbox.rotation.y = 0.15;
    group.add(mailbox);
    blobs.push([anchors.mailbox.x, GROUND + 0.02, anchors.mailbox.z, 0.35]);
  }

  // ── gieter (op anchors.wateringcan) ──
  const wateringcan = new THREE.Group();
  wateringcan.name = 'wateringcan';
  {
    const p = [];
    p.push(part(new THREE.CylinderGeometry(0.16, 0.18, 0.26, 16), PAL.mint, M(0, 0.13, 0)));
    p.push(part(new THREE.TorusGeometry(0.16, 0.025, 6, 16), C.white, M(0, 0.26, 0, Math.PI / 2, 0, 0)));
    p.push(part(new THREE.TorusGeometry(0.11, 0.025, 6, 12, Math.PI), shade(PAL.mint, -0.12), M(-0.02, 0.26, 0)));
    p.push(part(new THREE.CylinderGeometry(0.025, 0.04, 0.32, 8), shade(PAL.mint, -0.12), M(0.25, 0.22, 0, 0, 0, -0.9)));
    p.push(part(new THREE.CylinderGeometry(0.065, 0.03, 0.06, 10), PAL.yellow, M(0.38, 0.33, 0, 0, 0, -0.9)));
    wateringcan.add(mesh(p, toyV, { name: 'wateringcan-body' }));
    wateringcan.position.copy(anchors.wateringcan);
    wateringcan.rotation.y = 0.5;
    group.add(wateringcan);
    blobs.push([anchors.wateringcan.x, GROUND + 0.02, anchors.wateringcan.z, 0.3]);
  }

  // ── voetbal (op anchors.ball): wit met roze vlakjes ──
  const ball = new THREE.Group();
  ball.name = 'ball';
  {
    const R = 0.2, g = new THREE.IcosahedronGeometry(R, 2);
    const pos = g.attributes.position, n = pos.count, col = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position, dirs = [];
    for (let i = 0; i < ico.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize(); if (!dirs.some(w => w.distanceTo(v) < 1e-3)) dirs.push(v); }
    const white = new THREE.Color(C.white), patch = new THREE.Color(PAL.pinkD), v = new THREE.Vector3(), cen = new THREE.Vector3();
    for (let f = 0; f < n; f += 3) {   // per driehoek één kleur: een vlakje als het midden dicht bij een hoekpunt van de icosaëder ligt
      cen.set(0, 0, 0);
      for (let k = 0; k < 3; k++) cen.add(v.fromBufferAttribute(pos, f + k));
      cen.normalize();
      const c = dirs.some(w => w.dot(cen) > 0.93) ? patch : white;
      for (let k = 0; k < 3; k++) { col.set([c.r, c.g, c.b], (f + k) * 3); v.fromBufferAttribute(pos, f + k).normalize(); nrm.set([v.x, v.y, v.z], (f + k) * 3); }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.deleteAttribute('uv');
    const m = new THREE.Mesh(g, toyV);
    m.name = 'ball-body'; m.castShadow = true; m.position.y = R;
    ball.add(m);
    ball.position.copy(anchors.ball);
    group.add(ball);
  }

  // ── bloempot bij de deur (op anchors.flowerpot) met een bloem die later open kan ──
  const flowerpot = new THREE.Group();
  flowerpot.name = 'flowerpot';
  let bloom;
  {
    const p = [];
    p.push(part(new THREE.CylinderGeometry(0.15, 0.11, 0.2, 14), C.pot, M(0, 0.1, 0)));
    p.push(part(new THREE.TorusGeometry(0.15, 0.028, 6, 14), shade(C.pot, 0.05), M(0, 0.2, 0, Math.PI / 2, 0, 0)));
    p.push(part(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14), C.soil, M(0, 0.19, 0)));
    p.push(part(new THREE.CylinderGeometry(0.014, 0.018, 0.24, 5), C.leafD, M(0, 0.31, 0)));
    for (const sgn of [-1, 1]) p.push(part(new THREE.SphereGeometry(0.07, 8, 6), C.leaf, M(sgn * 0.07, 0.27, 0, 0, 0, sgn * 0.6, 1, 0.4, 0.6)));
    flowerpot.add(mesh(p, toyV, { name: 'flowerpot-body' }));
    const bp = [part(new THREE.SphereGeometry(0.045, 10, 8), PAL.yellow, M(0, 0, 0, 0, 0, 0, 1, 0.75, 1))];
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2;
      bp.push(part(new THREE.SphereGeometry(0.055, 8, 6), PAL.coral, M(Math.cos(a) * 0.07, -0.005, Math.sin(a) * 0.07, 0, -a, 0, 1, 0.5, 0.8))); }
    bloom = mesh(bp, toyV, { name: 'flowerpot-bloom', receive: false });
    bloom.position.y = 0.44; bloom.rotation.x = 0.35;
    flowerpot.add(bloom);
    flowerpot.position.copy(anchors.flowerpot);
    group.add(flowerpot);
  }

  // ── wolken (InstancedMesh): dik en rond, hoog achter het huis ──
  const clouds = [];
  let cloudMesh;
  {
    const cp = [];
    for (const [dx, dy, r] of [[0, 0, 1.0], [1.05, -0.22, 0.75], [-1.05, -0.2, 0.72], [0.5, 0.42, 0.68], [-0.45, 0.35, 0.6]])
      cp.push(part(new THREE.SphereGeometry(r, 10, 6), dy > 0.3 ? '#FFFFFF' : '#F6F1FB', M(dx, dy, 0, 0, 0, 0, 1, 0.78, 0.8)));
    const cloudsSpec = [[-8.5, 11.4, -13, 1.0], [7.0, 12.2, -15, 1.1], [-1.5, 14.2, -19, 1.05], [14, 9.8, -12, 0.95]];
    cloudMesh = new THREE.InstancedMesh(mergeGeometries(cp, false), cloudMat, cloudsSpec.length);
    cloudMesh.name = 'garden-clouds'; cloudMesh.frustumCulled = false;
    for (const [x, y, z, s] of cloudsSpec) clouds.push({ x, y, z, s });
    group.add(cloudMesh);
  }

  // ── dingen in de lucht (flyers): twee ballonnen en een vlinder ──
  const flyers = [];
  function balloon(col, x, y, z, phase) {
    const p = [
      part(new THREE.SphereGeometry(0.32, 14, 10), col, M(0, 0, 0, 0, 0, 0, 1, 1.18, 1)),
      part(new THREE.ConeGeometry(0.06, 0.1, 8), col, M(0, -0.41, 0, Math.PI, 0, 0)),
      part(new THREE.CylinderGeometry(0.01, 0.01, 1.1, 4), C.white, M(0, -1.0, 0)),
      part(new THREE.SphereGeometry(0.07, 8, 6), '#FFFFFF', M(-0.12, 0.17, 0.22, 0, 0, 0, 1, 1.4, 0.6)),   // glimmertje
    ];
    const b = mesh(p, toyV, { name: 'flyer-balloon', receive: false });
    b.position.set(x, y, z);
    b.userData.flyer = 'ballon'; b.userData.base = new THREE.Vector3(x, y, z); b.userData.phase = phase;
    group.add(b); flyers.push(b);
    return b;
  }
  balloon(PAL.pink, -4.3, 11.2, -0.6, 0);
  balloon(PAL.butter, 4.6, 10.6, -1.0, 2.1);
  {
    const p = [part(new THREE.CapsuleGeometry(0.03, 0.16, 3, 6), C.ink, M(0, 0, 0, Math.PI / 2, 0, 0))];
    // Vleugels in een V: plat neerleggen, opzij schuiven en dan om de lijfas omhoog kantelen.
    for (const sgn of [-1, 1]) {
      p.push(part(new THREE.CircleGeometry(0.15, 10).scale(1, 1.3, 1).rotateX(-Math.PI / 2).translate(sgn * 0.15, 0, -0.03).rotateZ(sgn * 0.55), PAL.butter));
      p.push(part(new THREE.CircleGeometry(0.1, 8).rotateX(-Math.PI / 2).translate(sgn * 0.12, -0.002, 0.13).rotateZ(sgn * 0.55), PAL.orange));
    }
    const bf = mesh(p, wingV, { name: 'flyer-butterfly', cast: false, receive: false });
    bf.userData.flyer = 'vlinder';
    group.add(bf); flyers.push(bf);
  }
  const butterfly = flyers[flyers.length - 1];

  // ── alle schaduwvlekjes van de tuin in één mesh ──
  {
    const mat = blobShadow(1, 0.3).material;
    const geos = blobs.map(([x, y, z, r]) => new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2).applyMatrix4(M(x, y, z, 0, 0, 0, r, 1, r)));
    const m = new THREE.Mesh(mergeGeometries(geos, false), mat);
    m.renderOrder = 1; m.name = 'garden-blobs';
    group.add(m);
  }

  const d = new THREE.Object3D();
  function update(t) {
    // wolken drijven langzaam opzij en komen aan de andere kant terug
    clouds.forEach((c, i) => {
      const x = ((c.x + t * 0.25 + 32) % 64) - 32;
      d.position.set(x, c.y, c.z); d.rotation.set(0, 0, 0); d.scale.setScalar(c.s); d.updateMatrix();
      cloudMesh.setMatrixAt(i, d.matrix);
    });
    cloudMesh.instanceMatrix.needsUpdate = true;
    // ballonnen deinen zachtjes op en neer
    for (const b of flyers) {
      if (b.userData.flyer !== 'ballon') continue;
      const u = b.userData;
      b.position.set(u.base.x + Math.sin(t * 0.35 + u.phase) * 0.35, u.base.y + Math.sin(t * 1.1 + u.phase) * 0.18, u.base.z);
      b.rotation.z = Math.sin(t * 0.9 + u.phase) * 0.08;
    }
    // vlinder fladdert rondjes rechts naast het huis, naast de glijbaan (niet voor de kamers)
    const a = t * 0.6;
    butterfly.position.set(4.25 + Math.cos(a) * 0.55, 1.5 + Math.sin(t * 2.3) * 0.2, 3.3 + Math.sin(a) * 0.55);
    butterfly.rotation.y = -a;
    butterfly.scale.x = 0.35 + Math.abs(Math.sin(t * 9)) * 0.65;
  }
  update(0);

  return { update, flyers, group, parts: { doghouse, dog, mailbox, lid, wateringcan, ball, flowerpot, bloom } };
}
