/* Memory: een spelletjeskamer. Een laag tafeltje met omgedraaide kaartjes (twee liggen open en
   vormen een paar), zitkussens, een kast met een stapel spellendozen ernaast en een grote
   dobbelsteen. De bewoner is een crèmekleurige kat met een strik. */
import * as THREE from '../../../vendor/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../../vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { roomBuilder, mat } from './build.js';

function heartShape(s) {
  const h = new THREE.Shape();
  h.moveTo(0, -0.9 * s);
  h.bezierCurveTo(-1.1 * s, -0.1 * s, -0.9 * s, 0.9 * s, 0, 0.35 * s);
  h.bezierCurveTo(0.9 * s, 0.9 * s, 1.1 * s, -0.1 * s, 0, -0.9 * s);
  return h;
}

export function furnish(slot, kit) {
  const { PAL } = kit, A = PAL.room.memory;
  const b = roomBuilder(slot, kit);
  b.resident({ fur: '#EADBC8', belly: '#FFF8EE', pose: 'sit', accessory: 'bow' }, { x: -0.62, z: 0.22, ry: 0.35 });

  // vloerkleed en laag tafeltje
  b.model('fur-rug-oval-a', { x: 0.32, z: 0.2, s: 0.42, cast: false });
  const TX = 0.34, TZ = 0.12, TS = 0.36;
  if (b.model('fur-table-low', { x: TX, z: TZ, s: TS })) b.blob(TX, TZ, 0.5, 0.32);
  const top = 0.5 * TS + 0.004;
  // memorykaartjes: 3 bij 2, vier omgedraaid (rug in de kamerkleur met een wit sterretje), twee open (hartjes)
  const back = (x, z, r) => {
    b.toy(new RoundedBoxGeometry(0.16, 0.018, 0.21, 1, 0.008), '#FFFFFF', mat(x, top + 0.009, z, 0, r));
    b.toy(new RoundedBoxGeometry(0.13, 0.01, 0.18, 1, 0.004), A, mat(x, top + 0.016, z, 0, r));
    b.toy(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 5), '#FFFFFF', mat(x, top + 0.022, z, 0, r));
  };
  const heart = new THREE.ExtrudeGeometry(heartShape(0.045), { depth: 0.004, bevelEnabled: false, curveSegments: 4 });
  heart.rotateX(-Math.PI / 2);
  const open = (x, z, r) => {
    b.toy(new RoundedBoxGeometry(0.16, 0.018, 0.21, 1, 0.008), '#FFFFFF', mat(x, top + 0.009, z, 0, r));
    b.toy(heart.clone(), PAL.coral, mat(x, top + 0.018, z, 0, r));
  };
  const cells = [[-0.22, -0.12], [0, -0.12], [0.22, -0.12], [-0.22, 0.13], [0, 0.13], [0.22, 0.13]];
  cells.forEach(([dx, dz], i) => {
    const r = ((i * 37) % 9 - 4) * 0.03, x = TX + dx, z = TZ + dz;
    if (i === 1 || i === 5) open(x, z, r); else back(x, z, r);
  });

  // zitkussens aan twee kanten van de tafel
  if (b.model('fur-pillow-a', { x: TX + 0.05, y: 0.06, z: TZ + 0.5, ry: 0.1, s: 0.6, cast: false })) b.blob(TX + 0.05, TZ + 0.5, 0.24, 0.18);
  if (b.model('fur-pillow-b', { x: TX + 0.68, y: 0.06, z: TZ - 0.02, ry: Math.PI / 2 + 0.15, s: 0.6, cast: false })) b.blob(TX + 0.68, TZ - 0.02, 0.18, 0.24);

  // kast tegen de achterwand, met een stapel spellendozen ernaast
  const KX = 0.2, KZ = -0.74;
  if (b.model('fur-cabinet-medium-decorated', { x: KX, z: KZ, s: 0.4 })) b.blob(KX, KZ + 0.05, 0.48, 0.24);
  const boxes = [[PAL.coral, 0.36, 0.25, 0.05], [PAL.yellow, 0.32, 0.23, -0.12], [PAL.purple, 0.34, 0.22, 0.1], [A, 0.28, 0.2, -0.05]];
  let y = 0;
  const BX = 0.84, BZ = -0.68;
  for (const [col, w, d, r] of boxes) {
    const h = 0.075;
    b.toy(new RoundedBoxGeometry(w, h, d, 1, 0.018), col, mat(BX, y + h / 2, BZ, 0, r));
    b.toy(new RoundedBoxGeometry(w + 0.012, 0.022, d + 0.012, 1, 0.008), '#FFFFFF', mat(BX, y + h - 0.012, BZ, 0, r)); // deksel
    y += h + 0.004;
  }
  b.blob(BX, BZ, 0.24, 0.18);

  // grote zachte dobbelsteen op de vloer
  const DX = 0.9, DZ = 0.64, DS = 0.17, dr = 0.5;
  b.toy(new RoundedBoxGeometry(DS, DS, DS, 2, 0.04), '#FFFFFF', mat(DX, DS / 2, DZ, 0, dr));
  const pip = new THREE.CylinderGeometry(0.017, 0.017, 0.01, 8);
  const pipAt = (lx, ly, lz, rx, rz) => {
    const m = new THREE.Matrix4().multiplyMatrices(mat(DX, DS / 2, DZ, 0, dr), mat(lx, ly, lz, rx, 0, rz));
    b.toy(pip.clone(), PAL.pinkD, m);
  };
  const f = DS / 2 + 0.001;
  pipAt(0, f, 0, 0, 0);                                                               // boven: 1
  for (const [u, v] of [[-0.04, -0.04], [0, 0], [0.04, 0.04]]) pipAt(u, v, f, Math.PI / 2, 0);  // voor: 3
  for (const [u, v] of [[-0.04, -0.04], [0.04, 0.04]]) pipAt(f, u, v, 0, Math.PI / 2);          // zij: 2
  b.blob(DX, DZ, 0.13);

  b.finish();
}
