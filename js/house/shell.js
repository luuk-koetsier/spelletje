/* De huisvorm: een groot kattenhuis van speelgoedplastic.
   Een rond lijf met acht kamers en de voordeur in het midden onderaan, een kop met twee oren
   en een vriendelijk gezichtje bovenop, pootjes op de sokkel, een staart achterlangs en een
   glijbaan langs de zijkant die de drie verdiepingen verbindt.
   Alles is in code opgebouwd en per materiaal samengevoegd tot een handvol draw calls.
   Kleuren zitten in vertex-kleuren, zodat veel onderdelen één materiaal kunnen delen. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, shade } from './style.js';
import { drawIcon } from './icons.js';
import { ROOMS } from './rooms/index.js';

// ── maten (wereldeenheden) ──
const CW = 2.2, CH = 2.05, P = 0.24;     // kamer: binnenbreedte en -hoogte; dikte van wanden en vloeren
const COLS = 3, ROWS = 3;
const Y0 = 0.55;                         // vloer van de onderste verdieping (de sokkel ligt eronder)
const ZB = -1.0, ZF = 0.9;               // achterwand en voorkant van de kamers
const ZBACK = ZB - 0.4;                  // achterkant van het lijf (dikke rug, ruim achter het behang)
const FRONT = 1.2;                       // voorkant van de gevel
const LINTEL = 0.28;                     // de gevel bedekt de bovenste strook van elke kamer; daar hangt het bordje
const GROUND = -0.2;                     // hoogte van het gras
const INNER_W = COLS * CW + (COLS - 1) * P;
const colX = i => -INNER_W / 2 + CW / 2 + i * (CW + P);
const floorY = j => Y0 + j * (CH + P);
const TOP_Y = floorY(ROWS - 1) + CH;     // plafond van de bovenste verdieping
const BODY_W = 4.2, BODY_TOP = 7.7;    // halve breedte en bovenkant van het lijf
const HEAD_Y = 7.85, HEAD_RX = 4.45, HEAD_RY = 2.6; // evenaar en stralen van de kop
const DOOR_W = 0.66, DOOR_SPRING = 0.95; // halve breedte van de deuropening en hoogte waar de boog begint

const COL = {
  frame: PAL.pink, body: PAL.lilac, head: PAL.lilac, base: PAL.lilacD,
  ear: PAL.lilac, earIn: PAL.pinkEar, paw: '#FFF7FB', muzzle: '#FFF7FB',
  eye: '#3A2F45', nose: PAL.pinkD, cheek: '#F7A8C8', whisker: '#FFFFFF',
  inner: PAL.cream, trim: '#FFFFFF', slide: PAL.butter, pole: '#FFFFFF', hat: PAL.pinkD,
  door: PAL.wood, doorD: PAL.woodD, glass: '#CFEFF6', knob: PAL.yellow, mat: PAL.coral,
};

// ── hulpjes voor geometrie ──
const Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
}
// Maak een geometrie klaar om samen te voegen: zonder index, met vertex-kleur, optioneel verplaatst.
// keepUV laat de uv-coördinaten staan (voor onderdelen met een textuur).
function prep(geo, hex, m, keepUV = false) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(keepUV && k === 'uv')) g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  const c = new THREE.Color(hex ?? '#ffffff'), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.clearGroups();
  return g;
}
function merged(list, material, { cast = true, receive = true, name = '' } = {}) {
  const m = new THREE.Mesh(mergeGeometries(list, false), material);
  m.name = name;
  m.castShadow = cast; m.receiveShadow = receive;
  for (const g of list) g.dispose();
  return m;
}
function roundRect(path, x0, y0, x1, y1, r) {
  path.moveTo(x0 + r, y0); path.lineTo(x1 - r, y0); path.quadraticCurveTo(x1, y0, x1, y0 + r);
  path.lineTo(x1, y1 - r); path.quadraticCurveTo(x1, y1, x1 - r, y1);
  path.lineTo(x0 + r, y1); path.quadraticCurveTo(x0, y1, x0, y1 - r);
  path.lineTo(x0, y0 + r); path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}
// Alleen de zijkanten van een extrusie (zonder voor- en achterdeksel).
function extrudeSides(shape, depth, segs) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: segs });
  const side = g.groups.find(x => x.materialIndex === 1);
  const out = new THREE.BufferGeometry();
  for (const k of ['position', 'normal']) {
    const a = g.attributes[k];
    out.setAttribute(k, new THREE.BufferAttribute(a.array.slice(side.start * 3, (side.start + side.count) * 3), 3));
  }
  g.dispose();
  return out;
}

// ── vormen ──
// Het lijf: een mollige, afgeronde vorm met licht bolle zijkanten.
function bodyShape() {
  const s = new THREE.Shape(), w = BODY_W, b = 0.3, r = 1.25, bulge = 0.5;
  s.moveTo(-w + r, b); s.lineTo(w - r, b); s.quadraticCurveTo(w, b, w, b + r);
  s.quadraticCurveTo(w + bulge, 4.3, w, BODY_TOP); s.lineTo(-w, BODY_TOP);
  s.quadraticCurveTo(-w - bulge, 4.3, -w, b + r); s.quadraticCurveTo(-w, b, -w + r, b);
  return s;
}
// Halve breedte van het lijf op hoogte y (voor spullen die tegen de zijkant staan).
let bodySide = null;
function bodyXAt(y) {
  if (!bodySide) bodySide = bodyShape().getPoints(24).filter(p => p.x > 0 && p.y < BODY_TOP - 1e-3).sort((a, b) => a.y - b.y);
  const pts = bodySide;
  if (y <= pts[0].y) return pts[0].x;
  for (let i = 1; i < pts.length; i++) if (y <= pts[i].y) {
    const a = pts[i - 1], b = pts[i], t = (y - a.y) / Math.max(1e-6, b.y - a.y);
    return a.x + (b.x - a.x) * t;
  }
  return pts[pts.length - 1].x;
}
// Achterkant van het lijf als nette strook-driehoeken (geen lange splinters zoals bij een ShapeGeometry).
function backGeometry(z) {
  const pos = [], ys = [];
  for (let y = 0.3; y < BODY_TOP; y += 0.25) ys.push(y);
  ys.push(BODY_TOP);
  const N = 10;
  for (let k = 0; k < ys.length - 1; k++) {
    const y0 = ys[k], y1 = ys[k + 1], a = bodyXAt(y0), b = bodyXAt(y1);
    for (let i = 0; i < N; i++) {
      const xa0 = a - 2 * a * i / N, xa1 = a - 2 * a * (i + 1) / N, xb0 = b - 2 * b * i / N, xb1 = b - 2 * b * (i + 1) / N;
      pos.push(xa0, y0, z, xa1, y0, z, xb0, y1, z, xa1, y0, z, xb1, y1, z, xb0, y1, z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
// De kop: een ronde koepel met bolle wangen, die over de bovenkant van het lijf valt.
function headShape() {
  const s = new THREE.Shape(), rx = HEAD_RX, y = HEAD_Y, lo = y - 0.4;
  s.moveTo(-rx + 0.55, lo); s.lineTo(rx - 0.55, lo); s.quadraticCurveTo(rx, lo, rx, y);
  s.absellipse(0, y, rx, HEAD_RY, 0, Math.PI, false);
  s.quadraticCurveTo(-rx, lo, -rx + 0.55, lo);
  return s;
}
function earShape(k = 1) {
  const s = new THREE.Shape();
  s.moveTo(-0.85 * k, 0); s.lineTo(0.85 * k, 0); s.lineTo(0.2 * k, 1.42 * k);
  s.quadraticCurveTo(0, 1.72 * k, -0.2 * k, 1.42 * k); s.lineTo(-0.85 * k, 0);
  return s;
}
function doorPath(path, w, spring, bottom) {
  path.moveTo(-w, bottom); path.lineTo(w, bottom); path.lineTo(w, spring);
  path.absarc(0, spring, w, 0, Math.PI, false); path.lineTo(-w, bottom);
  return path;
}

// Glijbaan: een U-profiel langs een kromme, met dikte.
function slideGeometry(curve, steps, R, th) {
  const M = 8, ring = [];
  for (let a = 0; a <= M; a++) { const t = a / M * Math.PI; ring.push([Math.cos(t) * (R - th), -Math.sin(t) * (R - th)]); }
  for (let a = M; a >= 0; a--) { const t = a / M * Math.PI; ring.push([Math.cos(t) * R, -Math.sin(t) * R]); }
  const n = ring.length, pos = [], idx = [], up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps, p = curve.getPointAt(u), T = curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(T, up).normalize();
    const nrm = new THREE.Vector3().crossVectors(side, T).normalize();
    for (const [sx, sy] of ring) pos.push(p.x + side.x * sx + nrm.x * sy, p.y + side.y * sx + nrm.y * sy, p.z + side.z * sx + nrm.z * sy);
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < n; j++) {
    const a = i * n + j, b = i * n + (j + 1) % n, c = (i + 1) * n + (j + 1) % n, d = (i + 1) * n + j;
    idx.push(a, d, b, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Controle van de draairichting: de onderkant van het profiel moet naar beneden wijzen.
  const mid = Math.floor(steps / 2) * n + Math.floor(M * 1.5) + 1; // een punt op de buitenboog, onderaan
  if (g.attributes.normal.getY(mid) > 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
  return g;
}

// ── texturen ──
function mix(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Behang: één atlas met per kamer een rustig patroon in de accentkleur, met een lambrisering onderaan.
const ATLAS = 1024, TILES = 3, TILE = Math.floor(ATLAS / TILES);
function wallpaperAtlas() {
  const cv = document.createElement('canvas'); cv.width = cv.height = ATLAS;
  const c = cv.getContext('2d');
  ROOMS.forEach((room, k) => {
    const x0 = (k % TILES) * TILE, y0 = Math.floor(k / TILES) * TILE, s = TILE;
    const bg = mix(room.color, '#ffffff', 0.8), fg = mix(room.color, '#ffffff', 0.55), r = rng(k * 97 + 13);
    c.save(); c.beginPath(); c.rect(x0, y0, s, s); c.clip(); c.translate(x0, y0);
    c.fillStyle = bg; c.fillRect(0, 0, s, s);
    c.fillStyle = fg; c.strokeStyle = fg; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
    const grid = (step, fn) => { for (let y = step / 2, row = 0; y < s; y += step, row++) for (let x = (row % 2 ? step : step / 2); x < s + step; x += step) fn(x - (row % 2 ? step / 2 : 0), y, row); };
    if (room.id === 'memory') grid(42, (x, y) => { c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill(); });
    else if (room.id === 'puzzel') grid(46, (x, y) => { c.beginPath(); c.moveTo(x, y - 8); c.lineTo(x + 8, y); c.lineTo(x, y + 8); c.lineTo(x - 8, y); c.closePath(); c.fill(); });
    else if (room.id === 'vormen') grid(48, (x, y, row) => {
      const k2 = Math.round(x / 48 + row) % 3; c.beginPath();
      if (k2 === 0) c.arc(x, y, 7, 0, 7); else if (k2 === 1) { c.moveTo(x, y - 8); c.lineTo(x + 8, y + 6); c.lineTo(x - 8, y + 6); c.closePath(); } else c.rect(x - 6, y - 6, 12, 12);
      c.fill(); });
    else if (room.id === 'tellen') { for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(r() * s, r() * s * 0.8, 5 + r() * 10, 0, 7); c.stroke(); } }
    else if (room.id === 'kleuren') { for (let i = 0; i < 16; i++) { const x = r() * s, y = r() * s * 0.8; for (let j = 0; j < 4; j++) { c.beginPath(); c.arc(x + (r() - 0.5) * 18, y + (r() - 0.5) * 18, 4 + r() * 7, 0, 7); c.fill(); } } }
    else if (room.id === 'verkleden') { for (let x = 0; x < s; x += 44) c.fillRect(x + 6, 0, 16, s); }
    else if (room.id === 'speel') { for (let y = 30; y < s; y += 52) { c.beginPath(); for (let x = -20; x <= s + 20; x += 26) c.lineTo(x, y + ((x / 26) % 2 ? 10 : -10)); c.stroke(); } }
    else if (room.id === 'stickers') grid(52, (x, y, row) => {
      c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? 4 : 9; c.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } c.closePath(); c.fill(); });
    // lambrisering met een witte lijst
    const dado = s * 0.8;
    c.fillStyle = mix(room.color, '#ffffff', 0.62); c.fillRect(0, dado, s, s - dado);
    c.fillStyle = 'rgba(255,255,255,0.35)'; for (let x = 10; x < s; x += 34) c.fillRect(x, dado + 10, 3, s - dado - 10);
    c.fillStyle = '#ffffff'; c.fillRect(0, dado - 4, s, 8);
    c.restore();
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function tileUV(k, u, v) { // u,v in 0..1 binnen het vak van kamer k
  const pad = 3, x0 = (k % TILES) * TILE + pad, y0 = Math.floor(k / TILES) * TILE + pad, s = TILE - pad * 2;
  return [(x0 + u * s) / ATLAS, 1 - (y0 + (1 - v) * s) / ATLAS];
}
function remapUV(geo, fn) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) { const [u, v] = fn(uv.getX(i), uv.getY(i)); uv.setXY(i, u, v); }
  return geo;
}

// Vloer: warme houten planken, licht genoeg om per kamer te tinten.
function floorTexture() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const c = cv.getContext('2d'), r = rng(7);
  const plank = S / 4;
  for (let i = 0; i < 4; i++) {
    const y = i * plank, off = (i % 2) * S / 2;
    c.fillStyle = mix('#F6E3CC', '#FFFFFF', r() * 0.35); c.fillRect(0, y, S, plank);
    c.fillStyle = 'rgba(160,110,80,0.10)';
    for (let k = 0; k < 6; k++) c.fillRect(r() * S, y + 6 + r() * (plank - 12), 30 + r() * 50, 2);
    c.fillStyle = 'rgba(150,100,70,0.35)'; c.fillRect(0, y, S, 3);
    c.fillRect((off + S * 0.25) % S, y, 3, plank); c.fillRect((off + S * 0.75) % S, y, 3, plank);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

// Bordjes: één atlas met per kamer een rond bordje in de accentkleur met het witte kamericoon.
const BADGE = 128;
function drawBadges(cv) {
  const c = cv.getContext('2d');
  c.clearRect(0, 0, cv.width, cv.height);
  ROOMS.forEach((room, k) => {
    const cx = (k % 4) * BADGE + BADGE / 2, cy = Math.floor(k / 4) * BADGE + BADGE / 2;
    c.fillStyle = room.color; c.fillRect(cx - BADGE / 2, cy - BADGE / 2, BADGE, BADGE);
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 5; c.beginPath(); c.arc(cx, cy, BADGE * 0.42, 0, 7); c.stroke();
    drawIcon(c, room.icon, cx, cy, BADGE * 0.52, shade(room.color, -0.12));
  });
}

// ── bouwen ──
export function buildShell(scene) {
  const group = new THREE.Group();
  group.name = 'shell';
  const toyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0 });
  const softMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
  const toyParts = [], innerParts = [], wallParts = [], floorParts = [], badgeParts = [], doorParts = [];

  // Gevel: het lijf met openingen voor de acht kamers en de voordeur.
  const cells = [];
  for (let j = ROWS - 1; j >= 0; j--) for (let i = 0; i < COLS; i++) if (!(i === 1 && j === 0)) cells.push({ i, j });
  const front = bodyShape();
  const BEV = 0.07;
  for (const { i, j } of cells) {
    const x = colX(i), y = floorY(j);
    front.holes.push(roundRect(new THREE.Path(), x - CW / 2, y - BEV, x + CW / 2, y + CH - LINTEL + BEV, 0.3));
  }
  front.holes.push(doorPath(new THREE.Path(), DOOR_W + BEV, Y0 + DOOR_SPRING, Y0 - BEV));
  {
    const depth = FRONT - ZF - 2 * BEV;
    const g = new THREE.ExtrudeGeometry(front, { depth, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 2, curveSegments: 7 });
    toyParts.push(prep(g, COL.frame, mat(0, 0, ZF + BEV)));
  }
  // Witte lijsten rond de kamers en de deur.
  {
    const TR = 0.11, opts = { depth: 0.03, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 5 };
    for (const { i, j } of cells) {
      const x = colX(i), y = floorY(j);
      const sh = roundRect(new THREE.Shape(), x - CW / 2 - TR, y - TR, x + CW / 2 + TR, y + CH - LINTEL + TR, 0.38);
      sh.holes.push(roundRect(new THREE.Path(), x - CW / 2 + 0.02, y + 0.02, x + CW / 2 - 0.02, y + CH - LINTEL - 0.02, 0.27));
      toyParts.push(prep(new THREE.ExtrudeGeometry(sh, opts), COL.trim, mat(0, 0, FRONT - 0.01)));
    }
    const dsh = doorPath(new THREE.Shape(), DOOR_W + TR, Y0 + DOOR_SPRING, Y0 - 0.02);
    dsh.holes.push(doorPath(new THREE.Path(), DOOR_W - 0.02, Y0 + DOOR_SPRING, Y0));
    toyParts.push(prep(new THREE.ExtrudeGeometry(dsh, opts), COL.trim, mat(0, 0, FRONT - 0.01)));
  }
  // Lijf: zijkanten en achterkant.
  toyParts.push(prep(extrudeSides(bodyShape(), ZF + 0.05 - (ZBACK), 20), COL.body, mat(0, 0, ZBACK)));
  toyParts.push(prep(backGeometry(ZBACK), COL.body));
  // Een groot roze hart op de rug.
  {
    const h = new THREE.Shape();
    h.moveTo(0, -0.9); h.bezierCurveTo(-0.3, -0.55, -1.1, -0.2, -1.1, 0.35); h.bezierCurveTo(-1.1, 0.85, -0.45, 1.05, 0, 0.6);
    h.bezierCurveTo(0.45, 1.05, 1.1, 0.85, 1.1, 0.35); h.bezierCurveTo(1.1, -0.2, 0.3, -0.55, 0, -0.9);
    const g = new THREE.ExtrudeGeometry(h, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3, curveSegments: 16 });
    toyParts.push(prep(g, COL.frame, mat(0, 4.4, ZBACK - 0.04, 0, Math.PI, 0)));
  }
  // Kop: koepel met wangen, iets breder dan het lijf, zodat hij als een dakrand overhangt.
  {
    const depth = FRONT - ZBACK + 0.2 - 0.3;
    const g = new THREE.ExtrudeGeometry(headShape(), { depth, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 3, curveSegments: 28 });
    toyParts.push(prep(g, COL.head, mat(0, 0, ZBACK - 0.2 + 0.15)));
  }
  // Oren met roze binnenkant.
  for (const sgn of [-1, 1]) {
    const earM = mat(sgn * 2.5, HEAD_Y + 1.55, 0.45, 0, 0, -sgn * 0.3);
    const outer = new THREE.ExtrudeGeometry(earShape(), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.12, bevelSegments: 2, curveSegments: 6 });
    toyParts.push(prep(outer, COL.ear, earM.clone().multiply(mat(0, 0, -0.15))));
    const inner = new THREE.ExtrudeGeometry(earShape(0.6), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 8 });
    toyParts.push(prep(inner, COL.earIn, earM.clone().multiply(mat(0, 0.18, 0.3))));
  }
  // Gezichtje in de gevel van de kop.
  {
    const sph = () => new THREE.SphereGeometry(1, 16, 10);
    const fz = FRONT + 0.02, ey = HEAD_Y + 0.9, ex = 1.35;
    for (const sgn of [-1, 1]) {
      toyParts.push(prep(sph(), COL.eye, mat(sgn * ex, ey, fz, 0, 0, 0, 0.38, 0.46, 0.14)));
      toyParts.push(prep(sph(), '#ffffff', mat(sgn * ex + 0.12, ey + 0.17, fz + 0.12, 0, 0, 0, 0.12, 0.12, 0.05)));
      toyParts.push(prep(sph(), '#ffffff', mat(sgn * ex - 0.11, ey - 0.18, fz + 0.12, 0, 0, 0, 0.055, 0.055, 0.03)));
      toyParts.push(prep(sph(), COL.cheek, mat(sgn * 2.4, HEAD_Y + 0.28, fz - 0.01, 0, 0, 0, 0.44, 0.3, 0.06)));
      toyParts.push(prep(new THREE.TorusGeometry(0.17, 0.04, 8, 16, Math.PI), COL.eye, mat(sgn * 0.17, HEAD_Y + 0.42, fz + 0.09, 0, 0, Math.PI)));
      for (const [dy, rz] of [[0.48, 0.1], [0.24, -0.06]]) {
        toyParts.push(prep(new THREE.CapsuleGeometry(0.035, 1.4, 3, 6), COL.whisker, mat(sgn * 3.9, HEAD_Y + dy, fz + 0.04, 0, 0, Math.PI / 2 - sgn * rz)));
      }
    }
    toyParts.push(prep(sph(), COL.muzzle, mat(0, HEAD_Y + 0.38, fz - 0.02, 0, 0, 0, 0.78, 0.44, 0.08)));
    toyParts.push(prep(sph(), COL.nose, mat(0, HEAD_Y + 0.6, fz + 0.06, 0, 0, 0, 0.24, 0.16, 0.09)));
  }
  // Sokkel met twee voorpootjes naast de deur.
  toyParts.push(prep(new RoundedBoxGeometry(BODY_W * 2 + 1.1, 0.5, FRONT + 0.5 - ZBACK + 0.2, 4, 0.2), COL.base, mat(0, 0.05, (FRONT + 0.5 + ZBACK - 0.2) / 2)));
  for (const sgn of [-1, 1]) {
    const px = sgn * 1.78;
    toyParts.push(prep(new THREE.SphereGeometry(1, 16, 10), COL.paw, mat(px, 0.36, 1.5, 0, 0, 0, 0.56, 0.3, 0.52)));
    for (const dx of [-0.3, 0, 0.3]) toyParts.push(prep(new THREE.SphereGeometry(1, 10, 6), COL.paw, mat(px + dx, 0.4, 1.92, 0, 0, 0, 0.16, 0.13, 0.13)));
  }
  // Staart: krult achter het huis omhoog en piept aan de linkerkant naar buiten.
  {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.4, 0.9, -1.2), new THREE.Vector3(-3.3, 0.9, -2.0), new THREE.Vector3(-4.3, 2.2, -2.1),
      new THREE.Vector3(-4.55, 4.0, -1.8), new THREE.Vector3(-4.0, 5.5, -1.7), new THREE.Vector3(-3.2, 5.7, -1.8)]);
    toyParts.push(prep(new THREE.TubeGeometry(curve, 40, 0.3, 10, false), COL.body));
    toyParts.push(prep(new THREE.SphereGeometry(0.36, 16, 12), PAL.pink, mat(-3.2, 5.7, -1.8)));
  }
  // Glijbaan: start op een platformpje achter op de zijkant bij de bovenste verdieping, loopt langs
  // de zijwand naar voren (langs alle drie verdiepingen) en komt voor het huis op het gras uit.
  // Hij blijft dicht tegen het lijf, zodat het huis staand op een telefoon groot in beeld kan.
  const top = floorY(ROWS - 1) + 0.12, wallX = bodyXAt(top), SZ0 = -1.2;
  const along = (y, z) => new THREE.Vector3(bodyXAt(y) + 0.3, y, z);
  {
    const curve = new THREE.CatmullRomCurve3([
      along(top + 0.05, SZ0), along(4.2, -0.2), along(3.1, 0.75),
      new THREE.Vector3(4.72, 2.0, 1.75), new THREE.Vector3(4.76, 1.0, 2.6),
      new THREE.Vector3(4.8, 0.35, 3.25), new THREE.Vector3(4.82, 0.15, 3.75)]);
    toyParts.push(prep(slideGeometry(curve, 80, 0.3, 0.07), COL.slide));
    // pootjes onder het vrije stuk
    for (const [z, y] of [[1.75, 2.0], [2.6, 1.0]]) {
      const h = y - 0.3 - GROUND;
      toyParts.push(prep(new THREE.CylinderGeometry(0.06, 0.07, h, 10), COL.pole, mat(z === 1.75 ? 4.72 : 4.76, GROUND + h / 2, z)));
    }
    toyParts.push(prep(new RoundedBoxGeometry(0.75, 0.14, 0.8, 3, 0.06), COL.frame, mat(wallX + 0.3, top - 0.25, SZ0 - 0.05)));
    // zijdeurtje naar het platform
    toyParts.push(prep(new RoundedBoxGeometry(0.14, 1.0, 0.62, 3, 0.06), COL.hat, mat(bodyXAt(top + 0.4) + 0.02, top + 0.4, SZ0 + 0.05)));
    toyParts.push(prep(new THREE.SphereGeometry(0.05, 10, 8), PAL.butter, mat(bodyXAt(top + 0.4) + 0.11, top + 0.35, SZ0 + 0.22)));
  }

  // Binnenkant: vloeren, plafonds en tussenwanden.
  const zc = (ZB + ZF) / 2, zd = ZF - ZB + 0.06, zcIn = zc + 0.03;
  for (let j = 0; j <= ROWS; j++) {
    const y = j < ROWS ? floorY(j) - P / 2 : TOP_Y + P / 2;
    innerParts.push(prep(new THREE.BoxGeometry(INNER_W + 2 * P, P, zd), COL.inner, mat(0, y, zcIn)));
  }
  for (const x of [-(INNER_W / 2 + P / 2), -(CW / 2 + P / 2), CW / 2 + P / 2, INNER_W / 2 + P / 2]) {
    innerParts.push(prep(new THREE.BoxGeometry(P, TOP_Y - Y0 + 2 * P, zd), COL.inner, mat(x, (Y0 + TOP_Y) / 2, zcIn)));
  }
  // Achter de voordeur: een donker halletje.
  toyParts.push(prep(new THREE.PlaneGeometry(1.6, 1.9), COL.doorD, mat(0, Y0 + 0.95, ZF + 0.02)));

  // Kamers: behang, vloer, plinten, bordje en tikvlak.
  const wallTex = wallpaperAtlas(), floorTex = floorTexture();
  const badgeCv = document.createElement('canvas'); badgeCv.width = BADGE * 4; badgeCv.height = BADGE * 2;
  drawBadges(badgeCv);
  const badgeTex = new THREE.CanvasTexture(badgeCv); badgeTex.colorSpace = THREE.SRGBColorSpace; badgeTex.anisotropy = 4;
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const slots = [];
  const D = ZF - ZB;
  cells.forEach(({ i, j }, k) => {
    const room = ROOMS[k], x = colX(i), y = floorY(j);
    // behang op de achterwand en de twee zijwanden (uit hetzelfde vak van de atlas)
    wallParts.push(prep(remapUV(new THREE.PlaneGeometry(CW, CH), (u, v) => tileUV(k, u, v)), '#ffffff', mat(x, y + CH / 2, ZB + 0.003), true));
    for (const sgn of [-1, 1]) {
      const f = D / CW;
      wallParts.push(prep(remapUV(new THREE.PlaneGeometry(D, CH), (u, v) => tileUV(k, (sgn < 0 ? u : 1 - u) * f, v)), '#ffffff',
        mat(x + sgn * (CW / 2 - 0.003), y + CH / 2, zc, 0, -sgn * Math.PI / 2, 0), true));
    }
    // vloer met planken, per kamer licht getint
    const fl = new THREE.PlaneGeometry(CW, D);
    remapUV(fl, (u, v) => [(x - CW / 2 + u * CW) / 1.4, (ZB + v * D) / 1.4]);
    floorParts.push(prep(fl, mix(room.color, '#ffffff', 0.78), mat(x, y + 0.003, zc, -Math.PI / 2, 0, 0), true));
    // plinten
    toyParts.push(prep(new THREE.BoxGeometry(CW, 0.13, 0.06), COL.trim, mat(x, y + 0.065, ZB + 0.03)));
    for (const sgn of [-1, 1]) toyParts.push(prep(new THREE.BoxGeometry(0.06, 0.13, D), COL.trim, mat(x + sgn * (CW / 2 - 0.03), y + 0.065, zc)));
    // bordje met het kamericoon op de gevel, boven de kamer
    const by = y + CH - LINTEL + 0.1, bz = FRONT + 0.09;
    toyParts.push(prep(new THREE.CylinderGeometry(0.41, 0.41, 0.1, 24), '#ffffff', mat(x, by, bz, Math.PI / 2, 0, 0)));
    const bu = (k % 4) * 0.25, bv = 1 - Math.floor(k / 4) * 0.5;
    badgeParts.push(prep(remapUV(new THREE.CircleGeometry(0.35, 24), (u, v) => [bu + u * 0.25, bv - 0.5 + v * 0.5]), '#ffffff', mat(x, by, bz + 0.056), true));
    // onzichtbaar tikvlak: een dunne plaat in de kameropening (van de kamerrand tot de voorkant
    // van de gevel). Een diepe doos zou bij een gedraaid huis voor de buurkamer komen te liggen.
    const hit = new THREE.Mesh(new THREE.BoxGeometry(CW + P, CH + P, FRONT - ZF), hitMat);
    hit.position.set(x, y + CH / 2, (ZF + FRONT) / 2);
    hit.visible = false;
    hit.userData.room = room;
    group.add(hit);
    slots.push({ id: room.id, center: new THREE.Vector3(x, y + CH / 2, zc), size: new THREE.Vector3(CW, CH, D), floorY: y, hit });
  });

  group.add(merged(toyParts, toyMat, { name: 'shell-toy' }));
  group.add(merged(innerParts, softMat, { cast: false, name: 'shell-inner' }));
  group.add(merged(wallParts, new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.92 }), { cast: false, name: 'shell-wallpaper' }));
  group.add(merged(floorParts, new THREE.MeshStandardMaterial({ map: floorTex, vertexColors: true, roughness: 0.7 }), { cast: false, name: 'shell-floor' }));
  group.add(merged(badgeParts, new THREE.MeshStandardMaterial({ map: badgeTex, emissiveMap: badgeTex, emissive: '#ffffff', emissiveIntensity: 0.25, roughness: 0.4 }), { cast: false, name: 'shell-badges' }));
  // Het icoon '123' gebruikt het lettertype van de site: opnieuw tekenen zodra dat geladen is.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { drawBadges(badgeCv); badgeTex.needsUpdate = true; }).catch(() => {});

  // Voordeur: een eigen groep, zodat hij kan stuiteren.
  const door = new THREE.Group();
  door.position.set(0, Y0, ZF + 0.12);
  door.userData.isDoor = true; door.userData.baseY = Y0;
  {
    const leaf = new THREE.ExtrudeGeometry(doorPath(new THREE.Shape(), DOOR_W - 0.04, DOOR_SPRING, 0.02), { depth: 0.06, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 16 });
    doorParts.push(prep(leaf, COL.door));
    doorParts.push(prep(new THREE.TorusGeometry(0.22, 0.05, 10, 24), '#ffffff', mat(0, 1.12, 0.12)));
    doorParts.push(prep(new THREE.CircleGeometry(0.22, 24), COL.glass, mat(0, 1.12, 0.11)));
    doorParts.push(prep(new THREE.SphereGeometry(0.07, 14, 10), COL.knob, mat(0.38, 0.72, 0.14)));
    for (const dy of [0.32, 0.55]) doorParts.push(prep(new RoundedBoxGeometry(0.8, 0.05, 0.03, 2, 0.012), COL.doorD, mat(0, dy, 0.11)));
  }
  door.add(merged(doorParts, toyMat));
  group.add(door);
  // deurmat
  group.add(merged([prep(new RoundedBoxGeometry(1.3, 0.05, 0.5, 3, 0.04), COL.mat, mat(0, 0.32, 1.45))], softMat, { cast: false }));
  const doorHit = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W * 2 + 0.2, DOOR_SPRING + DOOR_W + 0.2, 0.8), hitMat);
  doorHit.position.set(0, Y0 + (DOOR_SPRING + DOOR_W) / 2, FRONT - 0.1);
  doorHit.visible = false;
  doorHit.userData.doorHit = true;
  group.add(doorHit);

  // Ankerpunten voor verrassingen en tuinspullen (wereldcoördinaten; buiten op grashoogte).
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const anchors = {
    door: v(0, Y0 + 0.75, FRONT + 0.05),
    doorbell: v(DOOR_W + 0.3, Y0 + 0.95, FRONT + 0.02),
    clock: v(0, HEAD_Y + 1.9, FRONT + 0.02),
    birdhouse: v(0, HEAD_Y + HEAD_RY + 0.15, 0.1),
    flowerpot: v(-0.95, 0.3, 1.42),
    mauwtje: v(2.0, GROUND, 2.45),
    mailbox: v(1.9, GROUND, 5.7),
    doghouse: v(-4.8, GROUND, 3.2),
    wateringcan: v(3.0, GROUND, 4.4),
    ball: v(-2.3, GROUND, 4.6),
    slide: v(4.82, GROUND, 4.0),
  };

  scene.add(group);
  return { group, slots, door, doorHit, anchors };
}
