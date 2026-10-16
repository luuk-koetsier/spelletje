/* Puzzel: een hobbyzolder. Schuine balken in de hoeken, een half gelegde puzzel op een gestreept
   kleed met losse stukjes ernaast, een kist vol stukjes met het deksel ertegenaan, en een plank
   met dozen. De bewoner is een zandkleurige kat met een sjaal. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { roomBuilder, mat } from './build.js';

// Een puzzelstukje van 1 bij 1 (plus nopjes): nop rechts en boven, gat links en onder.
// Zo passen naburige stukjes in elkaar.
function pieceShape(u) {
  const s = new THREE.Shape(), r = 0.16 * u, h = u / 2;
  s.moveTo(-h, -h);
  s.lineTo(-r, -h); s.absarc(0, -h, r, Math.PI, 0, true); s.lineTo(h, -h);   // onder: gat
  s.lineTo(h, -r); s.absarc(h, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(h, h); // rechts: nop
  s.lineTo(r, h); s.absarc(0, h, r, 0, Math.PI, false); s.lineTo(-h, h);      // boven: nop
  s.lineTo(-h, r); s.absarc(-h, 0, r, Math.PI / 2, -Math.PI / 2, true); s.lineTo(-h, -h); // links: gat
  return s;
}

export function furnish(slot, kit) {
  const { PAL } = kit, A = PAL.room.puzzel;
  const b = roomBuilder(slot, kit);
  const W = slot.size.x / 2, H = slot.size.y, ZB = -slot.size.z / 2;
  b.resident({ fur: '#F2C98A', belly: '#FFF4E0', pose: 'sit', accessory: 'scarf' }, { x: -0.68, z: 0.26, ry: 0.4 });

  // zolderbalken: stijlen in de achterhoeken, schuine schoren en een balk langs het plafond
  const wood = PAL.woodD;
  for (const sg of [-1, 1]) {
    b.toy(new RoundedBoxGeometry(0.12, H, 0.12, 1, 0.035), wood, mat(sg * (W - 0.07), H / 2, ZB + 0.07));
    b.toy(new RoundedBoxGeometry(0.1, 0.8, 0.09, 1, 0.03), wood, mat(sg * (W - 0.33), H - 0.42, ZB + 0.06, 0, 0, sg * 0.8));
  }
  b.toy(new RoundedBoxGeometry(2 * W - 0.1, 0.12, 0.12, 1, 0.035), wood, mat(0, H - 0.07, ZB + 0.07));

  // gestreept kleed met een half gelegde puzzel (4 bij 3, zeven stukjes liggen al)
  b.model('fur-rug-rectangle-stripes-a', { x: 0.3, z: 0.24, s: 0.42, cast: false });
  const U = 0.15, PX = 0.32, PZ = 0.26, PY = 0.045;
  const piece = new THREE.ExtrudeGeometry(pieceShape(U), { depth: 0.022, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 3 });
  piece.rotateX(-Math.PI / 2);
  // het plaatje: blauwe lucht met een zonnetje boven, groene heuvels onder
  const pic = [
    [PAL.sky, PAL.sky, PAL.yellow, PAL.sky],
    [PAL.sky, PAL.pink, PAL.sky, PAL.sky],
    [PAL.green, PAL.green, PAL.grassD, PAL.green],
  ];
  const placed = new Set(['0,0', '0,1', '1,0', '1,1', '2,0', '2,1', '2,2']);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    if (!placed.has(row + ',' + col)) continue;
    b.toy(piece.clone(), pic[row][col], mat(PX + (col - 1.5) * U, PY, PZ + (row - 1) * U));
  }
  // losse stukjes ernaast
  b.toy(piece.clone(), PAL.yellow, mat(PX + 0.42, PY, PZ + 0.22, 0, 0.6));
  b.toy(piece.clone(), PAL.sky, mat(PX - 0.36, PY, PZ + 0.3, 0, -0.4));
  b.toy(piece.clone(), PAL.green, mat(PX + 0.46, PY, PZ - 0.18, 0, 2.1));

  // kist vol stukjes, met het deksel ertegenaan
  const CX = -0.12, CZ = -0.62, CS = 0.24;
  if (b.model('res-crate', { x: CX, z: CZ, s: CS })) {
    b.blob(CX, CZ, 0.3, 0.3);
    const pc = [PAL.coral, A, PAL.blue, PAL.purple, PAL.green];
    pc.forEach((c, i) => {
      const a = i / pc.length * Math.PI * 2;
      b.toy(piece.clone(), c, mat(CX + Math.cos(a) * 0.09, 0.15 + (i % 2) * 0.03, CZ + Math.sin(a) * 0.08, 0.5 * Math.sin(a * 2), a, 0.45 * Math.cos(a)));
    });
  }
  b.model('res-crate-lid', { x: CX + 0.3, y: 0.02, z: CZ + 0.02, rz: 1.2, ry: 0.15, s: CS, cast: false });

  // plank met dozen tegen de achterwand
  const SX = 0.5, SY = 1.0;
  b.model('fur-shelf-b-large', { x: SX, y: SY, z: ZB, s: 0.42, cast: false });
  b.model('pro-box-b', { x: SX - 0.2, y: SY + 0.02, z: ZB + 0.11, ry: 0.15, s: 0.4, cast: false });
  b.model('pro-box-c', { x: SX + 0.16, y: SY + 0.02, z: ZB + 0.11, ry: -0.1, s: 0.32, cast: false });

  b.finish();
}
