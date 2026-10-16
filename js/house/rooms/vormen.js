/* Vormen: een klaslokaaltje. Een schoolbord met vormen in krijt, twee schooltafeltjes met
   stoeltjes, een vormenstoof met losse blokjes en een kastje met een wereldbol. De bewoner is
   een lila juf-kat met een brilletje. */
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
// Een krijtlijn tussen twee punten op het bord (x, y), als dun staafje.
function chalkLine(b, col, x0, y0, x1, y1, z) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
  b.soft(new THREE.BoxGeometry(L + 0.016, 0.016, 0.006), col, mat((x0 + x1) / 2, (y0 + y1) / 2, z, 0, 0, Math.atan2(dy, dx)));
}

export function furnish(slot, kit) {
  const { PAL } = kit, A = PAL.room.vormen;
  const b = roomBuilder(slot, kit);
  const W = slot.size.x / 2, ZB = -slot.size.z / 2;
  b.resident({ fur: '#C9B2F2', belly: '#F7F1FF', pose: 'sit', accessory: 'glasses' }, { x: -0.66, z: 0.12, ry: 0.4 });

  // schoolbord: houten lijst, groen bord, krijtvormen en een krijtgootje
  const BX = 0.12, BY = 1.08, BW = 1.3, BH = 0.72, bz = ZB + 0.035;
  b.toy(new RoundedBoxGeometry(BW + 0.1, BH + 0.1, 0.05, 2, 0.025), PAL.wood, mat(BX, BY, bz));
  b.soft(new RoundedBoxGeometry(BW, BH, 0.02, 1, 0.01), '#4C7D69', mat(BX, BY, bz + 0.02));
  const cz = bz + 0.033;
  // cirkel (geel), driehoek (wit), vierkant (roze), ster (lichtblauw)
  b.soft(new THREE.TorusGeometry(0.11, 0.009, 4, 20), '#FFF0A8', mat(BX - 0.42, BY + 0.1, cz));
  const tri = [[-0.12, -0.1], [0.12, -0.1], [0, 0.12]].map(([x, y]) => [BX - 0.12 + x, BY + 0.1 + y]);
  for (let i = 0; i < 3; i++) chalkLine(b, '#FFFFFF', ...tri[i], ...tri[(i + 1) % 3], cz);
  const sq = [[-0.1, -0.1], [0.1, -0.1], [0.1, 0.1], [-0.1, 0.1]].map(([x, y]) => [BX + 0.18 + x, BY + 0.1 + y]);
  for (let i = 0; i < 4; i++) chalkLine(b, '#FFC2DA', ...sq[i], ...sq[(i + 1) % 4], cz);
  const st = starShape(0.12, 0.05).getPoints().map(p => [BX + 0.46 + p.x, BY + 0.1 + p.y]);
  for (let i = 0; i < 10; i++) chalkLine(b, '#BFE6FF', ...st[i], ...st[(i + 1) % 10], cz);
  // 1 2 3 onder de vormen, als stipjes
  for (let i = 0; i < 3; i++) for (let k = 0; k <= i; k++)
    b.soft(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 6), '#FFFFFF', mat(BX - 0.3 + i * 0.3 + (k - i / 2) * 0.05, BY - 0.2, cz, Math.PI / 2));
  b.toy(new RoundedBoxGeometry(BW * 0.8, 0.03, 0.08, 1, 0.012), PAL.wood, mat(BX, BY - BH / 2 - 0.04, bz + 0.04));
  b.toy(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 6), '#FFFFFF', mat(BX - 0.2, BY - BH / 2 - 0.016, bz + 0.05, 0, 0.3, Math.PI / 2));
  b.toy(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 6), '#FFC2DA', mat(BX - 0.08, BY - BH / 2 - 0.016, bz + 0.05, 0, -0.2, Math.PI / 2));

  // twee schooltafeltjes met stoeltjes ervoor (de leerlingen kijken naar het bord)
  for (const [x, chair] of [[-0.02, 'fur-chair-a'], [0.66, 'fur-chair-c']]) {
    const z = -0.06;
    if (b.model('fur-table-medium', { x, z, s: 0.25 })) {
      b.blob(x, z, 0.3, 0.3);
      // schriftje en potlood op het tafeltje
      b.toy(new RoundedBoxGeometry(0.16, 0.012, 0.12, 1, 0.005), x < 0.3 ? PAL.sky : PAL.butter, mat(x - 0.03, 0.256, z + 0.02, 0, 0.2));
      b.toy(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), A, mat(x + 0.08, 0.258, z + 0.03, Math.PI / 2, 0.9, 0));
    }
    if (b.model(chair, { x, z: z + 0.32, ry: Math.PI, s: 0.32 })) b.blob(x, z + 0.32, 0.14, 0.14);
  }

  // vormenstoof: een stevige kubus met gaten in het deksel, en losse vormblokjes ernaast
  const SX = 0.3, SZ = 0.66, SS = 0.24;
  b.toy(new RoundedBoxGeometry(SS, SS, SS, 2, 0.045), A, mat(SX, SS / 2, SZ, 0, -0.25));
  const lid = (geo, m) => b.toy(geo, '#7A4B57', new THREE.Matrix4().multiplyMatrices(mat(SX, SS + 0.001, SZ, 0, -0.25), m));
  lid(new THREE.CylinderGeometry(0.035, 0.035, 0.004, 12), mat(-0.055, 0, -0.055));
  lid(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 3), mat(0.055, 0, -0.055));
  lid(new THREE.BoxGeometry(0.065, 0.004, 0.065), mat(-0.055, 0, 0.055));
  lid(new THREE.CylinderGeometry(0.04, 0.04, 0.004, 5), mat(0.055, 0, 0.055));
  b.blob(SX, SZ, 0.2);
  const blk = new THREE.ExtrudeGeometry(starShape(0.06, 0.028), { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
  b.toy(blk, PAL.yellow, mat(SX + 0.26, 0.012, SZ + 0.08, -Math.PI / 2, 0, 0.4));
  b.toy(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 14), PAL.blue, mat(SX - 0.24, 0.03, SZ + 0.1));
  b.toy(new RoundedBoxGeometry(0.075, 0.075, 0.075, 1, 0.015), PAL.green, mat(SX + 0.2, 0.0375, SZ - 0.16, 0, 0.5));
  b.toy(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 3), PAL.purple, mat(SX + 0.4, 0.025, SZ - 0.06, 0, 0.3));

  // kastje in de hoek met een wereldbol
  const KX = W - 0.22, KZ = ZB + 0.24;
  if (b.model('fur-cabinet-small', { x: KX, z: KZ, s: 0.38 })) {
    b.blob(KX, KZ, 0.24, 0.24);
    const gy = 0.38;
    b.toy(new THREE.CylinderGeometry(0.06, 0.07, 0.025, 12), PAL.wood, mat(KX, gy + 0.012, KZ));
    b.toy(new THREE.CylinderGeometry(0.01, 0.01, 0.07, 6), PAL.wood, mat(KX, gy + 0.05, KZ));
    b.toy(new THREE.SphereGeometry(0.1, 14, 10), PAL.sky, mat(KX, gy + 0.17, KZ, 0, 0, 0.35));
    for (const [a, e, s] of [[0.3, 0.2, 0.05], [1.9, -0.25, 0.06], [3.6, 0.35, 0.04], [4.9, -0.1, 0.05]])
      b.toy(new THREE.SphereGeometry(s, 8, 6), PAL.green, mat(KX + Math.cos(a) * 0.075 * Math.cos(e), gy + 0.17 + Math.sin(e) * 0.08, KZ + Math.sin(a) * 0.075 * Math.cos(e), 0, 0, 0, 1, 1, 0.6));
    b.toy(new THREE.TorusGeometry(0.115, 0.007, 4, 18, Math.PI), PAL.wood, mat(KX, gy + 0.17, KZ, 0, Math.PI / 2, 0.35 - Math.PI / 2));
  }

  b.finish();
}
