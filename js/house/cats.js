/* Katten in één stijl: een mollige, glanzende speelgoedkat van vinyl.
   Eén basismodel (kop, oren, ogen, lijf en staart) dat voor alle katten wordt gedeeld.
   De vorm wordt per houding één keer opgebouwd; elke kat krijgt alleen een eigen
   kleurenlijst (vertex-kleuren) bij dezelfde posities en normalen. Alle katten delen
   één materiaal, zodat een kat met staart, accessoire en schaduwvlekje vier draw calls kost.
   Maat: een zittende kat is ongeveer 1 eenheid hoog (oren meegerekend); main.js schaalt. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, blobShadow } from './style.js';

// Delen van het model. Elke vertex hoort bij één deel; het deel bepaalt de kleur.
const FUR = 0, BELLY = 1, INNER = 2, EYE = 3, SHINE = 4, NOSE = 5, WHISKER = 6, BLUSH = 7;
const FIXED = { [INNER]: PAL.pinkEar, [EYE]: '#2E2433', [SHINE]: '#FFFFFF', [NOSE]: PAL.pinkD, [BLUSH]: '#FF9EC2' };

// Eén glanzend vinylmateriaal voor alle katten en hun accessoires.
const catMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0 });
const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const hitGeo = new THREE.SphereGeometry(0.5, 10, 8);

// ── hulpjes ──
const Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
}
// Eén onderdeel: zonder index, alleen positie en normaal, met het deel als label.
function part(geo, region, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  g.clearGroups();
  g.userData.region = region;
  return g;
}
const ball = (region, x, y, z, sx, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0, seg = 5) =>
  part(new THREE.SphereGeometry(1, seg + 4, seg), region, mat(x, y, z, rx, ry, rz, sx, sy, sz));
// Voeg onderdelen samen tot één basis: gedeelde posities en normalen, plus een deel per vertex.
function base(parts, xform) {
  if (xform) for (const p of parts) p.applyMatrix4(xform);
  const regions = [];
  for (const p of parts) { const n = p.attributes.position.count; for (let i = 0; i < n; i++) regions.push(p.userData.region); }
  const geo = mergeGeometries(parts, false);
  geo.computeBoundingSphere(); geo.computeBoundingBox();
  return { geo, regions: Uint8Array.from(regions) };
}

// ── de kop (voor alle houdingen gelijk), rond het middelpunt van de kop, gezicht naar +z ──
function earShape(k) {
  const s = new THREE.Shape();
  s.moveTo(-0.12 * k, 0);
  s.quadraticCurveTo(-0.11 * k, 0.12 * k, -0.035 * k, 0.19 * k);
  s.quadraticCurveTo(0, 0.225 * k, 0.035 * k, 0.19 * k);
  s.quadraticCurveTo(0.11 * k, 0.12 * k, 0.12 * k, 0);
  s.quadraticCurveTo(0, -0.03 * k, -0.12 * k, 0);
  return s;
}
function headParts() {
  const out = [];
  out.push(ball(FUR, 0, 0, 0, 0.33, 0.29, 0.29, 0, 0, 0, 11));                     // schedel
  for (const sg of [-1, 1]) {
    out.push(ball(BELLY, sg * 0.075, -0.1, 0.225, 0.1, 0.075, 0.07, 0, 0, 0, 6));             // snoetwangetjes
    out.push(ball(EYE, sg * 0.135, 0.025, 0.25, 0.062, 0.078, 0.035, 0, sg * 0.4, 0, 7));
    out.push(ball(SHINE, sg * 0.135 + 0.024, 0.055, 0.283, 0.021, 0.021, 0.012, 0, sg * 0.4, 0, 4));
    out.push(ball(SHINE, sg * 0.135 - 0.018, 0.0, 0.284, 0.01, 0.01, 0.006, 0, sg * 0.4, 0, 3));
    out.push(ball(BLUSH, sg * 0.215, -0.065, 0.2, 0.048, 0.028, 0.014, 0, sg * 0.75, 0, 4)); // blosjes
    // oren: afgeronde driehoek met een roze binnenkant
    const em = mat(sg * 0.185, 0.165, -0.03, -0.12, sg * -0.12, sg * -0.34);
    const ear = new THREE.ExtrudeGeometry(earShape(1), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.022, bevelSegments: 1, curveSegments: 3 });
    ear.translate(0, 0, -0.015);
    out.push(part(ear, FUR, em));
    const inner = new THREE.ExtrudeGeometry(earShape(0.62), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.012, bevelSegments: 1, curveSegments: 3 });
    inner.translate(0, 0.03, 0.03);
    out.push(part(inner, INNER, em));
    // snorharen: dunne platte streepjes
    for (const dy of [-0.045, -0.085]) {
      const w = new THREE.BoxGeometry(0.17, 0.011, 0.008);
      w.translate(sg * 0.085, 0, 0);
      out.push(part(w, WHISKER, mat(sg * 0.2, dy, 0.2, 0, sg * -0.45, sg * (dy > -0.06 ? 0.1 : -0.06))));
    }
  }
  out.push(ball(NOSE, 0, -0.055, 0.285, 0.04, 0.027, 0.024, 0, 0, 0, 6));         // neusje
  return out;
}

// ── houdingen: lijf, pootjes, plek van de kop, staart en ankers voor accessoires ──
const POSES = {
  sit: {
    head: mat(0, 0.6, 0.02),
    body: () => [
      ball(FUR, 0, 0.25, 0, 0.25, 0.25, 0.22, 0, 0, 0, 8),
      ball(BELLY, 0, 0.24, 0.13, 0.16, 0.18, 0.1),
      ...[-1, 1].flatMap(sg => [
        ball(FUR, sg * 0.165, 0.1, 0.02, 0.12, 0.105, 0.15),                        // achterpootjes
        ball(BELLY, sg * 0.095, 0.045, 0.2, 0.075, 0.055, 0.095, 0, 0, 0, 6),                    // voorpootjes
      ]),
    ],
    tail: { at: [0.1, 0.1, -0.18], pts: [[0, 0, 0], [0.16, 0.06, -0.08], [0.25, 0.28, -0.06], [0.19, 0.48, 0.02]] },
    neck: mat(0, 0.39, 0.02), paw: mat(0.12, 0.06, 0.27, 0.2, 0, -0.5), shadow: 0.4, hit: [0, 0.5, 0, 1],
  },
  play: {
    // zit en zwaait met één pootje, kopje een beetje scheef
    head: mat(-0.02, 0.6, 0.02, 0, 0, 0.16),
    body: () => [
      ball(FUR, 0, 0.25, 0, 0.25, 0.25, 0.22, 0, 0, 0, 8),
      ball(BELLY, 0, 0.24, 0.13, 0.16, 0.18, 0.1),
      ...[-1, 1].map(sg => ball(FUR, sg * 0.165, 0.1, 0.02, 0.12, 0.105, 0.15)),
      ball(BELLY, -0.095, 0.045, 0.2, 0.075, 0.055, 0.095, 0, 0, 0, 6),
      part(new THREE.CapsuleGeometry(0.055, 0.2, 3, 8), FUR, mat(0.2, 0.43, 0.12, 0.3, 0, -0.75)),
      ball(BELLY, 0.29, 0.53, 0.17, 0.068, 0.068, 0.06),
    ],
    tail: { at: [0.1, 0.1, -0.18], pts: [[0, 0, 0], [0.18, 0.1, -0.1], [0.24, 0.36, -0.08], [0.12, 0.52, 0]] },
    neck: mat(0, 0.39, 0.02), paw: mat(0.29, 0.53, 0.2, 0, 0, -0.35), shadow: 0.4, hit: [0, 0.5, 0, 1],
  },
  loaf: {
    // opgerold broodje: laag lijf, pootjes ingevouwen
    head: mat(0, 0.42, 0.2),
    body: () => [
      ball(FUR, 0, 0.19, -0.06, 0.3, 0.19, 0.34, 0, 0, 0, 8),
      ball(BELLY, 0, 0.17, 0.2, 0.17, 0.11, 0.08),
      ...[-1, 1].map(sg => ball(BELLY, sg * 0.1, 0.04, 0.3, 0.072, 0.045, 0.085)),
    ],
    tail: { at: [0.18, 0.06, -0.3], pts: [[0, 0, 0], [0.14, 0, 0.08], [0.17, 0, 0.3], [0.08, 0.01, 0.46]] },
    neck: mat(0, 0.24, 0.17), paw: mat(0.12, 0.05, 0.36, 1.2, 0, -0.3), shadow: 0.46, hit: [0, 0.38, 0.04, 1.05],
  },
  stand: {
    // staat op vier stevige pootjes, lijf opzij, kijkt naar voren
    head: mat(0.27, 0.64, 0.05),
    body: () => [
      ball(FUR, -0.04, 0.34, 0, 0.32, 0.2, 0.2, 0, 0, 0, 8),
      ball(BELLY, -0.04, 0.27, 0.01, 0.24, 0.13, 0.155),
      ...[[0.15, 0.11], [0.15, -0.11], [-0.22, 0.11], [-0.22, -0.11]].flatMap(([x, z]) => [
        part(new THREE.CapsuleGeometry(0.06, 0.16, 3, 8), FUR, mat(x, 0.15, z)),
        ball(BELLY, x + 0.01, 0.035, z + 0.02, 0.07, 0.045, 0.08, 0, 0, 0, 6),
      ]),
    ],
    tail: { at: [-0.33, 0.4, 0], pts: [[0, 0, 0], [-0.13, 0.1, 0], [-0.16, 0.32, 0.02], [-0.06, 0.46, 0.04]] },
    neck: mat(0.24, 0.43, 0.04, 0, 0, -0.3), paw: mat(0.17, 0.05, 0.2, 0.3, 0, -0.4), shadow: 0.5, hit: [0, 0.5, 0, 1.15],
  },
};

const bases = new Map();
function poseBase(pose) {
  if (bases.has(pose)) return bases.get(pose);
  const P = POSES[pose];
  const hp = headParts();
  for (const p of hp) p.applyMatrix4(P.head);
  const body = base([...P.body(), ...hp]);
  const curve = new THREE.CatmullRomCurve3(P.tail.pts.map(a => new THREE.Vector3(...a)));
  const end = curve.getPoint(1);
  const tail = base([
    part(new THREE.TubeGeometry(curve, 10, 0.045, 6, false), FUR),
    part(new THREE.SphereGeometry(0.045, 6, 4), FUR, mat(0, 0, 0)),          // rond begin
    ball(BELLY, end.x, end.y, end.z, 0.056),          // lichte puntje
  ]);
  const b = { body, tail };
  bases.set(pose, b);
  return b;
}

// Een kleurenlijst bij een basis. De posities en normalen worden gedeeld, alleen de kleur is eigen.
const colored = new Map();
function paint(b, key, cols) {
  const k = key + '|' + b.geo.uuid;
  if (colored.has(k)) return colored.get(k);
  const lin = {};
  for (const [r, hex] of Object.entries(cols)) lin[r] = new THREE.Color(hex);
  const n = b.regions.length, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const c = lin[b.regions[i]]; a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', b.geo.attributes.position);
  g.setAttribute('normal', b.geo.attributes.normal);
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.boundingSphere = b.geo.boundingSphere; g.boundingBox = b.geo.boundingBox;
  colored.set(k, g);
  return g;
}

// ── accessoires, in vertex-kleuren, per soort en houding één keer gebouwd ──
function vc(geo, hex, m) {
  const g = part(geo, 0, m);
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
const ACC = {
  // hoge hoed met strik, scheef op de kop (kleedkamer)
  hat: P => [
    vc(new THREE.CylinderGeometry(0.17, 0.17, 0.025, 24), '#6E58A8', mat(0, 0, 0)),
    vc(new THREE.CylinderGeometry(0.105, 0.115, 0.2, 20), '#6E58A8', mat(0, 0.1, 0)),
    vc(new THREE.CylinderGeometry(0.118, 0.118, 0.045, 20), PAL.pink, mat(0, 0.035, 0)),
    vc(new THREE.SphereGeometry(0.035, 10, 8), PAL.butter, mat(0.1, 0.04, 0.06)),
  ].map(g => g.applyMatrix4(mat(0.05, 0.27, -0.01, -0.12, 0, -0.22)).applyMatrix4(P.head)),
  // grote strik naast het oor
  bow: P => [
    ...[-1, 1].map(sg => vc(new THREE.SphereGeometry(1, 14, 10), PAL.coral, mat(sg * 0.065, 0, 0, 0, 0, sg * 0.35, 0.07, 0.048, 0.03))),
    vc(new THREE.SphereGeometry(0.03, 10, 8), '#FF6F86', mat(0, 0, 0.012)),
  ].map(g => g.applyMatrix4(mat(-0.17, 0.2, 0.11, -0.3, -0.35, 0.45)).applyMatrix4(P.head)),
  // ronde brilletje (klaslokaal)
  glasses: P => [
    ...[-1, 1].map(sg => vc(new THREE.TorusGeometry(0.078, 0.014, 8, 24), '#7A5CC2', mat(sg * 0.135, 0.025, 0.29, 0, sg * 0.35, 0))),
    vc(new THREE.CylinderGeometry(0.011, 0.011, 0.11, 6), '#7A5CC2', mat(0, 0.045, 0.3, 0, 0, Math.PI / 2)),
  ].map(g => g.applyMatrix4(P.head)),
  // duikbril met band rond de kop (aquariumkamer)
  goggles: P => [
    ...[-1, 1].map(sg => vc(new THREE.CylinderGeometry(0.074, 0.074, 0.02, 16).rotateX(Math.PI / 2), '#C8EEFF', mat(sg * 0.135, 0.03, 0.29, 0, sg * 0.35, 0))),
    ...[-1, 1].map(sg => vc(new THREE.TorusGeometry(0.078, 0.02, 6, 18), '#4FA3E0', mat(sg * 0.135, 0.03, 0.295, 0, sg * 0.35, 0))),
    vc(new THREE.TorusGeometry(0.3, 0.022, 6, 28), '#4FA3E0', mat(0, 0.04, 0, Math.PI / 2, 0, 0, 1.12, 1, 1)),
  ].map(g => g.applyMatrix4(P.head)),
  // gouden kroontje (circus)
  crown: P => [
    vc(new THREE.CylinderGeometry(0.11, 0.1, 0.07, 20), '#FFC83D', mat(0, 0.035, 0)),
    ...[0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2;
      return vc(new THREE.ConeGeometry(0.03, 0.08, 8), '#FFC83D', mat(Math.sin(a) * 0.095, 0.1, Math.cos(a) * 0.095)); }),
    ...[0, 1, 2, 3, 4].map(i => { const a = i / 5 * Math.PI * 2;
      return vc(new THREE.SphereGeometry(0.022, 8, 6), i % 2 ? PAL.pink : '#7FD3F0', mat(Math.sin(a) * 0.104, 0.035, Math.cos(a) * 0.104)); }),
  ].map(g => g.applyMatrix4(mat(0, 0.27, -0.02, -0.08, 0, 0.12)).applyMatrix4(P.head)),
  // gebreide sjaal met een slip
  scarf: P => [
    vc(new THREE.TorusGeometry(0.2, 0.055, 8, 22), '#FF8E8E', mat(0, 0, 0, Math.PI / 2, 0, 0, 1, 1, 0.9)),
    vc(new THREE.CapsuleGeometry(0.045, 0.13, 3, 8), '#FF8E8E', mat(0.1, -0.1, 0.2, 0.25, 0, 0.25)),
    vc(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), '#FFFFFF', mat(0.125, -0.2, 0.225, 0.25, 0, 0.25)),
  ].map(g => g.applyMatrix4(P.neck)),
  // slaapmuts met een pompon die opzij hangt (slaapkamertje)
  nightcap: P => [
    vc(new THREE.TorusGeometry(0.15, 0.035, 6, 20), '#FFFFFF', mat(0, 0, 0, Math.PI / 2)),
    vc(new THREE.ConeGeometry(0.15, 0.3, 14), '#8FB8F0', mat(0.06, 0.12, 0, 0, 0, -0.55)),
    vc(new THREE.SphereGeometry(0.045, 10, 8), '#FFFFFF', mat(0.15, 0.26, 0)),
  ].map(g => g.applyMatrix4(mat(0, 0.26, -0.02, -0.15, 0, 0.1)).applyMatrix4(P.head)),
  // penseel met paarse verf (atelier)
  brush: P => [
    vc(new THREE.CylinderGeometry(0.018, 0.022, 0.26, 8), PAL.wood, mat(0, 0.13, 0)),
    vc(new THREE.CylinderGeometry(0.026, 0.022, 0.05, 10), '#E8E3EC', mat(0, 0.28, 0)),
    vc(new THREE.SphereGeometry(1, 12, 8), PAL.room.kleuren, mat(0, 0.34, 0, 0, 0, 0, 0.034, 0.06, 0.034)),
  ].map(g => g.applyMatrix4(mat(0, -0.08, 0)).applyMatrix4(P.paw)),
};
const accCache = new Map();
function accessoryGeo(kind, pose) {
  const k = kind + '|' + pose;
  if (!accCache.has(k)) {
    const g = mergeGeometries(ACC[kind](POSES[pose]), false);
    g.computeBoundingSphere();
    accCache.set(k, g);
  }
  return accCache.get(k);
}

function whiskerFor(fur) {
  const hsl = {}; new THREE.Color(fur).getHSL(hsl);
  return hsl.l > 0.72 ? '#CDB8C6' : '#FFFFFF';
}

export const cats = [];

// Bouw een kat. Geeft een groep op de vloer (y = 0), gezicht naar +z.
export function makeCat({ id, fur, belly, pose = 'sit', accessory = 'none' }) {
  if (!POSES[pose]) pose = 'sit';
  const P = POSES[pose], b = poseBase(pose);
  const cols = { [FUR]: fur, [BELLY]: belly, [WHISKER]: whiskerFor(fur), ...FIXED };
  const key = fur + belly;
  const g = new THREE.Group();
  g.name = 'cat-' + id;
  const pivot = new THREE.Group();                 // veert en springt; de plaatsing blijft op g
  g.add(pivot);
  const body = new THREE.Mesh(paint(b.body, key, cols), catMat);
  body.name = 'cat-body';
  pivot.add(body);
  const tailPivot = new THREE.Group();
  tailPivot.position.set(...P.tail.at);
  tailPivot.add(new THREE.Mesh(paint(b.tail, key, cols), catMat));
  pivot.add(tailPivot);
  if (accessory && accessory !== 'none' && ACC[accessory]) {
    const acc = new THREE.Mesh(accessoryGeo(accessory, pose), catMat);
    acc.name = 'cat-' + accessory;
    pivot.add(acc);
  }
  const shadow = blobShadow(P.shadow, 0.45);
  shadow.position.y = 0.012;
  g.add(shadow);
  // Ruim, onzichtbaar tikvlak om de hele kat.
  const [hx, hy, hz, hs] = P.hit;
  const hit = new THREE.Mesh(hitGeo, hitMat);
  hit.position.set(hx, hy, hz); hit.scale.set(hs, 1, 1);
  hit.visible = false;
  hit.userData.catHit = g;
  g.add(hit);
  g.userData = { catId: id, pivot, tailPivot, shadow, shadowR: P.shadow, hit, phase: Math.random() * 7, jump: 0 };
  cats.push(g);
  return g;
}

// Sprongetje met squash en stretch (0,5 s) en een miauw.
export function reactCat(group) {
  const u = group && group.userData;
  if (!u || !u.pivot) return;
  u.jump = 0.5;
  if (window.KH && window.KH.sound && window.KH.meow) window.KH.meow();
}

const JUMP_H = 0.32;
// Rustige beweging: ademen, staart zwaaien, een beetje rondkijken; plus het sprongetje.
export function updateCats(dt, t) {
  for (const c of cats) {
    const u = c.userData, p = u.pivot;
    u.tailPivot.rotation.z = Math.sin(t * 2.1 + u.phase) * 0.22;
    u.tailPivot.rotation.y = Math.sin(t * 1.4 + u.phase) * 0.2;
    let y = 0, sy = 1 + Math.sin(t * 1.8 + u.phase) * 0.018;
    if (u.jump > 0) {
      u.jump = Math.max(0, u.jump - dt);
      const k = 1 - u.jump / 0.5;
      if (k < 0.18) sy = 1 - 0.22 * Math.sin(k / 0.18 * Math.PI / 2);                       // inveren
      else if (k < 0.72) { const q = (k - 0.18) / 0.54;                                      // sprong
        y = JUMP_H * Math.sin(q * Math.PI); sy = 1 + 0.14 * Math.cos(q * Math.PI) ** 2; }
      else sy = 1 - 0.16 * Math.sin((k - 0.72) / 0.28 * Math.PI);                            // landen
    }
    const sxz = 1 / Math.sqrt(sy);
    p.position.y = y;
    p.scale.set(sxz, sy, sxz);
    p.rotation.y = Math.sin(t * 0.45 + u.phase) * 0.12;
    const sh = u.shadowR * (1 - 0.35 * y / JUMP_H);
    u.shadow.scale.set(sh, 1, sh);
  }
}
