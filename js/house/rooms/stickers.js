/* Stickers: een slaapkamertje. Een bed, een nachtkastje met een gloeiend
   maantje als nachtlampje (met een warm lampje), een muur vol stickers, een groot open plakboek
   op een kleed met losse stickervellen en een boek, en sloffen voor het bed.
   De bewoner is een grijze kat met een slaapmuts, opgerold op het bed. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { roomBuilder, mat } from './build.js';

function starShape(R, r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r : R;
    if (i === 0) s.moveTo(Math.cos(a) * d, Math.sin(a) * d); else s.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  s.closePath();
  return s;
}
function heartShape(r) {
  const h = new THREE.Shape();
  h.moveTo(0, -0.9 * r);
  h.bezierCurveTo(-1.1 * r, -0.1 * r, -0.9 * r, 0.9 * r, 0, 0.35 * r);
  h.bezierCurveTo(0.9 * r, 0.9 * r, 1.1 * r, -0.1 * r, 0, -0.9 * r);
  return h;
}
function circleShape(r) { const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2, false); return s; }
function moonShape(r) {
  const s = new THREE.Shape();
  s.absarc(0, 0, r, Math.PI * 0.35, Math.PI * 1.65, false);
  s.absarc(r * 0.42, 0, r * 0.78, Math.PI * 1.45, Math.PI * 0.55, true);
  return s;
}
const flat = (shape, depth = 0.004) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 4 });

export function furnish(slot, kit) {
  const { PAL } = kit, A = PAL.room.stickers;
  const b = roomBuilder(slot, kit);
  const W = slot.size.x / 2, ZB = -slot.size.z / 2;

  // Een sticker: de vorm in kleur op een iets grotere witte rand. m plaatst hem (vlak in xy, voorkant +z).
  const SHAPES = {
    star: (k) => starShape(k, k * 0.45), heart: (k) => heartShape(k), dot: (k) => circleShape(k * 0.8), moon: (k) => moonShape(k * 0.85),
  };
  const sticker = (kind, k, col, m) => {
    b.soft(flat(SHAPES[kind](k * 1.22)), '#FFFFFF', m);
    b.toy(flat(SHAPES[kind](k)), col, new THREE.Matrix4().multiplyMatrices(m, mat(0, 0, 0.003)));
  };

  // bed langs de achterwand met het hoofdeinde links; de kat ligt opgerold bij het kussen
  const BS = 0.45, BL = 3.0 * BS, BX = -W + 0.03 + BL / 2, BZ = ZB + 0.04 + 0.8 * BS;
  const bed = b.model('fur-bed-single-a', { x: BX, z: BZ, ry: Math.PI / 2, s: BS });
  if (bed) b.blob(BX, BZ, BL / 2 + 0.05, 0.42);
  b.resident({ fur: '#A9B1BE', belly: '#F1F3F6', pose: 'loaf', accessory: 'nightcap' },
    { x: BX - 0.22 * BL, y: bed ? 0.5 * BS : 0, z: BZ + 0.04, ry: 0.25 });
  // sloffen voor het bed
  for (const dx of [0, 0.1]) {
    b.soft(new THREE.CapsuleGeometry(0.035, 0.08, 2, 8), PAL.pinkEar, mat(BX + 0.2 + dx, 0.03, BZ + 0.56, Math.PI / 2, 0, 0, 1, 1, 0.6));
    b.soft(new THREE.SphereGeometry(0.022, 6, 4), '#FFFFFF', mat(BX + 0.2 + dx, 0.055, BZ + 0.61));
  }
  b.blob(BX + 0.25, BZ + 0.56, 0.13, 0.1);

  // nachtkastje met een gloeiend maantje en sterretje (het nachtlampje)
  const NX = BX + BL / 2 + 0.22, NZ = ZB + 0.2, NH = 0.3;
  b.toy(new RoundedBoxGeometry(0.28, NH, 0.24, 2, 0.03), A, mat(NX, NH / 2, NZ));
  b.toy(new RoundedBoxGeometry(0.22, 0.09, 0.01, 1, 0.004), '#FFFFFF', mat(NX, NH * 0.62, NZ + 0.12));
  b.toy(new THREE.SphereGeometry(0.018, 6, 4), PAL.pinkD, mat(NX, NH * 0.62, NZ + 0.13));
  b.blob(NX, NZ, 0.2, 0.16);
  b.toy(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 12), '#FFFFFF', mat(NX, NH + 0.015, NZ));
  b.glow(flat(moonShape(0.085), 0.035), mat(NX - 0.01, NH + 0.115, NZ - 0.018));
  b.glow(flat(starShape(0.035, 0.016), 0.02), mat(NX + 0.075, NH + 0.16, NZ - 0.01));
  b.toy(new THREE.CylinderGeometry(0.006, 0.006, 0.09, 5), '#FFFFFF', mat(NX + 0.075, NH + 0.075, NZ));
  // warm licht van het nachtlampje (één van de twee lampen in het huis, zonder schaduw)
  const light = new THREE.PointLight('#FFD58A', 0.9, 1.6, 2);
  light.position.set(NX, NH + 0.3, NZ + 0.2);
  light.castShadow = false;
  b.group.add(light);

  // muur vol stickers boven het bed
  const KINDS = ['star', 'heart', 'dot', 'star', 'moon', 'heart', 'dot', 'star', 'heart', 'star', 'dot', 'moon', 'heart', 'star', 'dot', 'heart'];
  const COLS = [PAL.yellow, PAL.coral, PAL.blue, PAL.purple, A, PAL.pink, PAL.green, PAL.orange, PAL.lilac, PAL.sky, PAL.coral, PAL.yellow, PAL.blue, PAL.pink, PAL.purple, PAL.green];
  const sz = ZB + 0.006;
  let n = 0;
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) {
    const i = n++, j = (i * 7) % 5;
    const x = -W + 0.2 + col * 0.33 + (row % 2) * 0.15 + (j - 2) * 0.02, y = 0.68 + row * 0.25 + ((i * 3) % 4 - 1.5) * 0.025;
    if (x > W - 0.1 || (x > NX - 0.2 && y < 0.75)) continue;                // niet achter het nachtlampje
    sticker(KINDS[i % KINDS.length], 0.07 + (j % 3) * 0.014, COLS[i % COLS.length], mat(x, y, sz, 0, 0, ((i * 5) % 7 - 3) * 0.12));
  }
  // en een paar op de rechterwand
  [[0.05, 0.85, 'star', PAL.purple], [-0.3, 1.05, 'heart', PAL.coral], [0.3, 1.15, 'dot', PAL.green]].forEach(([z, y, kind, col], i) =>
    sticker(kind, 0.06, col, mat(W - 0.006, y, z, 0, -Math.PI / 2, (i - 1) * 0.3)));

  // kleed met een groot open plakboek, losse stickervellen en een boek
  const PX = 0.32, PZ = 0.36, pr = 0.22;
  b.model('fur-rug-oval-b', { x: PX, z: PZ, s: 0.32, cast: false });
  const P = (m) => new THREE.Matrix4().multiplyMatrices(mat(PX, 0.032, PZ, 0, pr), m);
  b.toy(new RoundedBoxGeometry(0.66, 0.022, 0.44, 1, 0.01), A, P(mat(0, 0.011, 0)));
  for (const s of [-1, 1]) b.soft(new RoundedBoxGeometry(0.3, 0.018, 0.4, 1, 0.006), '#FFFFFF', P(mat(s * 0.158, 0.03, 0, 0, 0, -s * 0.06)));
  const page = (kind, k, col, x, z, r) => sticker(kind, k, col, P(mat(x, 0.042 + Math.abs(x) * 0.06, z, -Math.PI / 2, 0, r)));
  page('star', 0.045, PAL.coral, -0.22, -0.08, 0.2);
  page('heart', 0.04, PAL.purple, -0.1, 0.06, -0.3);
  page('dot', 0.045, PAL.blue, -0.2, 0.1, 0);
  page('moon', 0.05, PAL.yellow, 0.12, -0.08, 0.4);
  page('star', 0.04, PAL.green, 0.22, 0.05, -0.2);
  // stickervellen: dunne gekleurde blaadjes met rijtjes stippen
  [[PAL.sky, 0.0], [PAL.pinkEar, 0.35]].forEach(([col, r], i) => {
    const V = (m) => new THREE.Matrix4().multiplyMatrices(mat(PX - 0.5 + i * 0.07, 0.03 + i * 0.006, PZ + 0.12 - i * 0.05, 0, r), m);
    b.soft(new THREE.BoxGeometry(0.16, 0.004, 0.2), col, V(mat()));
    for (let k = 0; k < 6; k++) b.toy(new THREE.CylinderGeometry(0.018, 0.018, 0.004, 8), [PAL.yellow, PAL.coral, '#FFFFFF'][k % 3], V(mat(-0.04 + (k % 2) * 0.08, 0.004, -0.06 + Math.floor(k / 2) * 0.06)));
  });
  b.model('fur-book-single', { x: PX + 0.42, y: 0.045, z: PZ - 0.2, rz: Math.PI / 2, ry: 0.5, s: 0.36 });

  b.finish();
}
