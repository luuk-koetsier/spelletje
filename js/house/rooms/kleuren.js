/* Kleuren: een atelier. Een schildersezel met een half af schilderij (regenboog en zon), verfpotten
   met druppels, spetters op de vloer, een werktafel met een pot vol kwasten, een krukje met een
   palet en tekeningen die met plakband op de muur hangen. De bewoner is een witte kat met een kwast. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { roomBuilder, mat, along } from './build.js';

// Een spetter: een rond plasje met een paar losse druppeltjes eromheen (plat op de vloer).
function splat(b, col, x, z, r, seed) {
  b.toy(new THREE.CylinderGeometry(r, r, 0.004, 10), col, mat(x, 0.004, z, 0, seed, 0, 1, 1, 0.8));
  for (let i = 0; i < 3; i++) {
    const a = seed * 2.3 + i * 2.1, d = r * (1.35 + 0.25 * i);
    b.toy(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.004, 6), col, mat(x + Math.cos(a) * d, 0.004, z + Math.sin(a) * d));
  }
}

// Een palet: een ovaal plankje met een duimgat, plat (y omhoog), het gat links.
function paletteShape() {
  const s = new THREE.Shape();
  s.absellipse(0, 0, 0.15, 0.11, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absellipse(-0.08, 0.02, 0.022, 0.018, 0, Math.PI * 2, true);
  s.holes.push(hole);
  return s;
}

export function furnish(slot, kit) {
  const { PAL } = kit, A = PAL.room.kleuren;
  const b = roomBuilder(slot, kit);
  const W = slot.size.x / 2, ZB = -slot.size.z / 2;
  const PAINT = [PAL.coral, PAL.yellow, PAL.blue, PAL.green, A];
  b.resident({ fur: '#FFFFFF', belly: '#FFE6EF', pose: 'play', accessory: 'brush' }, { x: -0.64, z: 0.2, ry: 0.4 });

  // schildersezel, iets naar de kat gedraaid
  const EX = 0.22, EZ = -0.42, er = 0.18;
  const E = (m) => new THREE.Matrix4().multiplyMatrices(mat(EX, 0, EZ, 0, er), m);
  const leg = (a, c, r = 0.022) => { const [m] = along(a, c); b.toy(new THREE.CylinderGeometry(r, r, 1, 6), PAL.wood, E(m)); };
  leg([-0.3, 0, 0.14], [-0.1, 1.32, 0.02]);
  leg([0.3, 0, 0.14], [0.1, 1.32, 0.02]);
  leg([0, 0, -0.36], [0, 1.26, -0.02], 0.018);
  b.toy(new RoundedBoxGeometry(0.8, 0.045, 0.11, 1, 0.015), PAL.woodD, E(mat(0, 0.56, 0.12)));        // richel
  b.toy(new RoundedBoxGeometry(0.22, 0.035, 0.05, 1, 0.012), PAL.woodD, E(mat(0, 1.2, 0.05)));        // klemmetje
  // het doek, iets achterover, met een regenboog, een zonnetje en gras
  const C = (m) => E(new THREE.Matrix4().multiplyMatrices(mat(0, 0.88, 0.1, -0.1), m));
  b.soft(new RoundedBoxGeometry(0.74, 0.6, 0.03, 1, 0.012), '#FFFFFF', C(mat()));
  [PAL.coral, PAL.yellow, PAL.sky].forEach((col, i) =>
    b.soft(new THREE.TorusGeometry(0.2 - i * 0.045, 0.022, 3, 14, Math.PI), col, C(mat(-0.06, -0.12, 0.018, 0, 0, 0, 1, 1, 0.3))));
  b.soft(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 12), PAL.yellow, C(mat(0.22, 0.16, 0.018, Math.PI / 2)));
  b.soft(new RoundedBoxGeometry(0.66, 0.08, 0.008, 1, 0.003), PAL.green, C(mat(0, -0.245, 0.017)));
  b.blob(EX, EZ - 0.05, 0.42, 0.3);
  // verftubes op de richel
  [PAL.coral, PAL.blue, A].forEach((col, i) => {
    b.toy(new THREE.CapsuleGeometry(0.018, 0.07, 2, 6), col, E(mat(-0.22 + i * 0.1, 0.6, 0.12, 0, 0, Math.PI / 2 + 0.1 * i)));
  });

  // verfpotten voor de ezel, elk met een druppel langs de rand
  [[-0.06, 0.12], [0.1, 0.2], [0.27, 0.16], [0.43, 0.06]].forEach(([x, z], i) => {
    const col = PAINT[i];
    b.toy(new THREE.CylinderGeometry(0.065, 0.06, 0.1, 12), '#FFFFFF', mat(x, 0.05, z));
    b.toy(new THREE.CylinderGeometry(0.056, 0.056, 0.01, 12), col, mat(x, 0.098, z));
    b.toy(new THREE.CapsuleGeometry(0.012, 0.04, 2, 5), col, mat(x + 0.045, 0.075, z + 0.045));
    b.blob(x, z, 0.1);
  });
  // spetters op de vloer
  splat(b, PAL.coral, -0.2, 0.42, 0.06, 0.4);
  splat(b, PAL.blue, 0.2, 0.52, 0.05, 1.7);
  splat(b, PAL.yellow, 0.55, 0.42, 0.055, 2.9);
  splat(b, A, -0.32, -0.12, 0.045, 4.1);
  splat(b, PAL.green, 0.62, -0.08, 0.04, 5.3);

  // werktafel langs de rechterwand, met een pot vol kwasten en twee potten water en verf
  const TX = W - 0.27, TZ = 0.14, TS = 0.27, top = 1.0 * TS;
  if (b.model('fur-table-medium-long', { x: TX, z: TZ, ry: Math.PI / 2, s: TS })) {
    b.blob(TX, TZ, 0.3, 0.44);
    const JX = TX - 0.02, JZ = TZ - 0.18;
    b.model('res-jar-a-small', { x: JX, y: top, z: JZ, s: 0.3 });
    [[-0.035, 0.035, PAL.coral], [0.03, 0.02, PAL.yellow], [0, -0.035, PAL.blue]].forEach(([dx, dz, col]) => {
      const p0 = [JX + dx * 0.4, top + 0.04, JZ + dz * 0.4], p1 = [JX + dx * 2.6, top + 0.3, JZ + dz * 2.6];
      const [m] = along(p0, p1);
      b.toy(new THREE.CylinderGeometry(0.009, 0.009, 1, 5), PAL.wood, m);
      const [mt] = along(p1, [p1[0] + dx * 0.9, p1[1] + 0.07, p1[2] + dz * 0.9]);
      b.toy(new THREE.ConeGeometry(0.016, 1, 6), col, mt);
    });
    b.model('res-jar-c-small', { x: TX + 0.02, y: top, z: TZ + 0.1, s: 0.26 });
    b.model('res-jar-b-small', { x: TX - 0.05, y: top, z: TZ + 0.3, s: 0.24 });
  }

  // krukje met een palet erop
  const SX = -0.18, SZ = -0.3, SS = 0.42;
  const stool = b.model('res-chair-stool', { x: SX, z: SZ, s: SS });
  if (stool) b.blob(SX, SZ, 0.18);
  const py = stool ? 0.5 * SS + 0.004 : 0.004;
  const pal = new THREE.ExtrudeGeometry(paletteShape(), { depth: 0.012, bevelEnabled: false, curveSegments: 6 });
  pal.rotateX(-Math.PI / 2);
  b.toy(pal, PAL.wood, mat(SX, py, SZ, 0, 0.5));
  PAINT.forEach((col, i) => {
    const a = 0.5 + i * 0.75;
    const lx = Math.cos(a) * 0.08 + 0.02, lz = Math.sin(a) * 0.055;
    const c = Math.cos(-0.5), s = Math.sin(-0.5);
    b.toy(new THREE.SphereGeometry(0.02, 6, 4), col, mat(SX + lx * c - lz * s, py + 0.014, SZ + lx * s + lz * c, 0, 0, 0, 1, 0.45, 1));
  });

  // tekeningen met plakband op de achterwand, links boven de kat
  [[-0.78, 1.16, 0.08, PAL.coral], [-0.48, 1.22, -0.06, PAL.blue], [-0.62, 0.86, 0.04, PAL.green]].forEach(([x, y, r, col], i) => {
    const P = (m) => new THREE.Matrix4().multiplyMatrices(mat(x, y, ZB + 0.012, 0, 0, r), m);
    b.soft(new THREE.BoxGeometry(0.22, 0.26, 0.006), '#FFFFFF', P(mat()));
    if (i === 0) b.soft(new THREE.CylinderGeometry(0.055, 0.055, 0.004, 10), col, P(mat(0, 0.03, 0.005, Math.PI / 2)));
    if (i === 1) b.soft(new THREE.BoxGeometry(0.12, 0.08, 0.004), col, P(mat(0, -0.02, 0.005)));
    if (i === 2) b.soft(new THREE.ConeGeometry(0.06, 0.1, 3).rotateX(Math.PI / 2), col, P(mat(0, 0.0, 0.005, 0, 0, 0, 1, 1, 0.05)));
    b.soft(new THREE.BoxGeometry(0.08, 0.025, 0.004), '#FFF3B0', P(mat(0, 0.13, 0.006, 0, 0, 0.2)));   // plakband
  });

  b.finish();
}
