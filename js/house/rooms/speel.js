/* Speelkamer: een mini-circus. Gestreept tentdoek op de achterwand met vlaggetjes erboven, een
   piste met grote circusballen, een xylofoon, een draaimolentje dat langzaam ronddraait en een
   circuston. De bewoner is een bruine kat met een kroontje, bovenop de circuston. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { roomBuilder, mat, vc, toyVC } from './build.js';

// Een circusbal: bol met twee gekleurde banden.
function ball(b, x, z, r, col, band) {
  b.toy(new THREE.SphereGeometry(r, 12, 8), col, mat(x, r, z, 0.4, 0.3, 0.2));
  b.toy(new THREE.TorusGeometry(r * 0.99, r * 0.12, 3, 16), band, mat(x, r, z, 0.4 + Math.PI / 2, 0.3, 0.2));
  b.toy(new THREE.TorusGeometry(r * 0.99, r * 0.08, 3, 16), '#FFFFFF', mat(x, r, z, 0.4, 0.3, 0.2 + Math.PI / 2));
  b.blob(x, z, r * 1.1);
}

// Het draaimolentje als één losse mesh (oorsprong in het midden van de voet), zodat het kan draaien.
function carousel(PAL, A) {
  const p = [];
  p.push(vc(new THREE.CylinderGeometry(0.3, 0.31, 0.06, 16), A, mat(0, 0.03, 0)));
  p.push(vc(new THREE.CylinderGeometry(0.27, 0.27, 0.012, 16), '#FFFFFF', mat(0, 0.064, 0)));
  for (let i = 0; i < 5; i++)                                         // gestreepte middenpaal
    p.push(vc(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 8), i % 2 ? '#FFFFFF' : PAL.coral, mat(0, 0.13 + i * 0.14, 0)));
  p.push(vc(new THREE.ConeGeometry(0.36, 0.22, 16, 1), PAL.coral, mat(0, 0.9, 0)));
  for (let i = 0; i < 12; i++) {                                     // geschulpte rand
    const a = i / 12 * Math.PI * 2;
    p.push(vc(new THREE.SphereGeometry(0.045, 6, 4), i % 2 ? '#FFFFFF' : PAL.butter, mat(Math.cos(a) * 0.34, 0.79, Math.sin(a) * 0.34, 0, 0, 0, 1, 0.8, 1)));
  }
  p.push(vc(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 5), '#FFFFFF', mat(0, 1.07, 0)));
  p.push(vc(new THREE.ConeGeometry(0.035, 0.08, 3), PAL.yellow, mat(0.035, 1.11, 0, 0, 0, -Math.PI / 2, 1, 1, 0.2)));
  // vier ritjes: een paaltje met een rond speelgoedbeestje erop
  [PAL.yellow, PAL.sky, PAL.lilac, PAL.mint].forEach((col, i) => {
    const a = i / 4 * Math.PI * 2 + 0.4, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2, h = 0.3 + (i % 2) * 0.06;
    p.push(vc(new THREE.CylinderGeometry(0.008, 0.008, 0.72, 5), PAL.butter, mat(x, 0.43, z)));
    const R = (m) => new THREE.Matrix4().multiplyMatrices(mat(x, h, z, 0, -a), m);  // neus langs de rijrichting
    p.push(vc(new THREE.CapsuleGeometry(0.04, 0.08, 2, 8), col, R(mat(0, 0, 0, Math.PI / 2))));
    p.push(vc(new THREE.SphereGeometry(0.038, 8, 6), col, R(mat(0, 0.05, 0.075))));
    for (const s of [-1, 1]) p.push(vc(new THREE.ConeGeometry(0.014, 0.03, 4), col, R(mat(s * 0.02, 0.09, 0.07))));
  });
  return mergeGeometries(p, false);
}

export function furnish(slot, kit) {
  const { PAL } = kit, A = PAL.room.speel;
  const b = roomBuilder(slot, kit);
  const W = slot.size.x / 2, ZB = -slot.size.z / 2;
  const CREAM = '#FFF4E4';

  // circuston met de kat erop
  const TX = -0.64, TZ = 0.16, TR = 0.2, TH = 0.22;
  b.toy(new THREE.CylinderGeometry(TR, TR, TH, 18), A, mat(TX, TH / 2, TZ));
  for (const y of [0.02, TH - 0.02]) b.toy(new THREE.TorusGeometry(TR, 0.02, 4, 18), '#FFFFFF', mat(TX, y, TZ, Math.PI / 2));
  for (let i = 0; i < 5; i++) {
    const a = Math.PI * (0.15 + 0.7 * i / 4);
    b.toy(new THREE.SphereGeometry(0.022, 6, 4), PAL.yellow, mat(TX + Math.cos(a) * TR, TH / 2, TZ + Math.sin(a) * TR, 0, 0, 0, 1, 1, 0.5));
  }
  b.blob(TX, TZ, TR + 0.1);
  b.resident({ fur: '#B98A64', belly: '#F5E4CF', pose: 'play', accessory: 'crown' }, { x: TX, y: TH, z: TZ + 0.02, ry: 0.35 });

  // gestreept tentdoek op de achterwand, met een geschulpte rand en vlaggetjes erboven
  const N = 11, sw = 2 * W / N, TOP = 1.5;
  for (let i = 0; i < N; i++) {
    const x = -W + sw * (i + 0.5), col = i % 2 ? CREAM : PAL.coral;
    b.soft(new THREE.BoxGeometry(sw, TOP, 0.012), col, mat(x, TOP / 2, ZB + 0.012));
    b.soft(new THREE.CylinderGeometry(sw / 2, sw / 2, 0.012, 10, 1, false, Math.PI / 2, Math.PI), col, mat(x, TOP, ZB + 0.012, Math.PI / 2));
  }
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = -W + 0.12 + t * (2 * W - 0.24), y = 1.42 - Math.sin(t * Math.PI) * 0.08;
    b.toy(new THREE.ConeGeometry(0.055, 0.12, 3), [PAL.yellow, A, PAL.sky][i % 3], mat(x, y - 0.06, ZB + 0.04, Math.PI, 0, 0, 1, 1, 0.25));
  }

  // piste met twee circusballen
  const RX = 0.12, RZ = 0.2, RR = 0.44;
  b.toy(new THREE.CylinderGeometry(RR, RR, 0.08, 22, 1, true), PAL.coral, mat(RX, 0.04, RZ));
  b.toy(new THREE.TorusGeometry(RR, 0.025, 3, 22), '#FFFFFF', mat(RX, 0.08, RZ, Math.PI / 2));
  b.soft(new THREE.CylinderGeometry(RR - 0.01, RR - 0.01, 0.01, 22), PAL.butter, mat(RX, 0.006, RZ));
  ball(b, RX - 0.1, RZ - 0.08, 0.15, PAL.blue, PAL.yellow);
  ball(b, RX + 0.18, RZ + 0.12, 0.09, PAL.pink, A);

  // xylofoon rechts vooraan, met twee stokjes
  const XX = W - 0.32, XZ = 0.62, xr = -0.35;
  const X = (m) => new THREE.Matrix4().multiplyMatrices(mat(XX, 0, XZ, 0, xr), m);
  for (const z of [-0.07, 0.07]) b.toy(new RoundedBoxGeometry(0.44, 0.04, 0.03, 1, 0.012), PAL.wood, X(mat(0, 0.02, z * (1 + 0))));
  [PAL.coral, PAL.orange, PAL.yellow, PAL.green, PAL.blue, PAL.purple].forEach((col, i) => {
    const L = 0.2 - i * 0.018;
    b.toy(new RoundedBoxGeometry(0.05, 0.018, L, 1, 0.007), col, X(mat(-0.16 + i * 0.064, 0.05, 0)));
  });
  for (const [dx, dz, r] of [[-0.05, 0.16, 0.3], [0.1, 0.17, -0.2]]) {
    b.toy(new THREE.CylinderGeometry(0.006, 0.006, 0.18, 5), PAL.wood, X(mat(dx, 0.01, dz, 0, r, Math.PI / 2)));
    b.toy(new THREE.SphereGeometry(0.018, 8, 6), PAL.pinkD, X(mat(dx + Math.cos(r) * 0.09, 0.012, dz - Math.sin(r) * 0.09)));
  }
  b.blob(XX, XZ, 0.26, 0.16);

  // draaimolentje achter rechts, draait langzaam
  const MX = 0.6, MZ = -0.5;
  const go = new THREE.Mesh(carousel(PAL, A), toyVC);
  go.position.set(MX, 0, MZ);
  go.scale.setScalar(1.15);
  go.castShadow = true; go.receiveShadow = true; go.name = 'speel-carousel';
  b.group.add(go);
  b.blob(MX, MZ, 0.48);
  // Draaien bij elk beeld; zolang het huis gepauzeerd is wordt er niet getekend en staat het stil.
  go.onBeforeRender = () => { go.rotation.y = performance.now() / 1000 * 0.35; };

  b.finish();
}
