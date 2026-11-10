/* Tellen: een aquariumkamer. Een groot aquarium op een kastje, met zand, waterplantjes, een
   kasteeltje, rondzwemmende visjes en opstijgende bubbels. Verder een zitbank, een kleed en een
   staande lamp. De bewoner is een donkere kat met een duikbril. */
import * as THREE from '../../../vendor/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../../vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from '../../../vendor/three/examples/jsm/utils/BufferGeometryUtils.js';
import { roomBuilder, mat, vc, toyVC } from './build.js';

const FISH = ['#FFAD66', '#FFD45C', '#FF8EB4', '#FF8E8E', '#B190EC'];
const N_BUBBLES = 7;

// Eén visje (wit, de kleur komt per exemplaar), neus naar +x.
function fishGeo() {
  const g = mergeGeometries([
    vc(new THREE.SphereGeometry(0.065, 10, 8), '#FFFFFF', mat(0, 0, 0, 0, 0, 0, 1.25, 0.95, 0.7)),
    vc(new THREE.ConeGeometry(0.05, 0.075, 4), '#FFFFFF', mat(-0.095, 0, 0, 0, 0, -Math.PI / 2, 1, 1, 0.35)),
    vc(new THREE.ConeGeometry(0.028, 0.045, 4), '#FFFFFF', mat(-0.005, 0.062, 0, 0, 0, 0.5, 1, 1, 0.3)),
    ...[-1, 1].map(s => vc(new THREE.SphereGeometry(0.015, 6, 4), '#2E2433', mat(0.048, 0.015, s * 0.038))),
  ], false);
  return g;
}

export function furnish(slot, kit) {
  const { PAL } = kit, A = PAL.room.tellen;
  const b = roomBuilder(slot, kit);
  const W = slot.size.x / 2, ZB = -slot.size.z / 2;
  b.resident({ fur: '#4E4856', belly: '#ECE6F0', pose: 'stand', accessory: 'goggles' }, { x: -0.62, z: 0.1, ry: 0.2 });
  // zitbank tegen de rechterwand, met zicht op het aquarium
  if (b.model('fur-couch-pillows', { x: W - 0.29, z: 0.12, ry: -Math.PI / 2, s: 0.34 })) b.blob(W - 0.3, 0.12, 0.3, 0.52);
  // rond kleed met een witte rand (als een bel), met een speelgoedbootje erop
  b.soft(new THREE.CylinderGeometry(0.62, 0.62, 0.02, 28), '#FFFFFF', mat(0.0, 0.01, 0.42, 0, 0, 0, 1, 1, 0.62));
  b.soft(new THREE.CylinderGeometry(0.55, 0.55, 0.022, 28), '#9CCBF2', mat(0.0, 0.012, 0.42, 0, 0, 0, 1, 1, 0.62));
  const BX = 0.1, BZ = 0.5, br = -0.5, boat = (geo, col, m) => b.toy(geo, col, new THREE.Matrix4().multiplyMatrices(mat(BX, 0.022, BZ, 0, br), m));
  boat(new RoundedBoxGeometry(0.26, 0.07, 0.11, 2, 0.03), PAL.coral, mat(0, 0.035, 0));
  boat(new THREE.CylinderGeometry(0.055, 0.055, 0.07, 3), PAL.coral, mat(0.13, 0.035, 0, 0, Math.PI / 6, 0, 1, 1, 0.9));
  boat(new RoundedBoxGeometry(0.24, 0.02, 0.09, 1, 0.008), '#FFFFFF', mat(0, 0.072, 0));
  boat(new THREE.CylinderGeometry(0.008, 0.008, 0.24, 6), PAL.wood, mat(0, 0.19, 0));
  const sail = new THREE.Shape(); sail.moveTo(0, 0); sail.lineTo(0.1, 0); sail.lineTo(0, 0.17); sail.closePath();
  boat(new THREE.ExtrudeGeometry(sail, { depth: 0.008, bevelEnabled: false }), PAL.butter, mat(0.008, 0.1, -0.004));
  b.blob(BX, BZ, 0.16, 0.1);

  // het aquarium op een kastje tegen de achterwand
  const AX = -0.04, AZ = ZB + 0.3, KS = 0.55;
  const standOk = b.model('fur-cabinet-medium', { x: AX, z: AZ, s: KS });
  if (standOk) b.blob(AX, AZ, 0.58, 0.3);
  const y0 = standOk ? KS * 1.0 : 0;            // bovenkant van het kastje
  const TW = 1.12, TH = 0.7, TD = 0.48, ty = y0 + 0.035;
  const g = b.group;
  // bak: voet en deksel in de kamerkleur, vier hoekstijltjes
  b.toy(new RoundedBoxGeometry(TW + 0.06, 0.07, TD + 0.06, 2, 0.03), A, mat(AX, ty, AZ));
  b.toy(new RoundedBoxGeometry(TW + 0.06, 0.06, TD + 0.06, 2, 0.028), A, mat(AX, ty + TH, AZ));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    b.toy(new RoundedBoxGeometry(0.04, TH, 0.04, 1, 0.015), '#FFFFFF', mat(AX + sx * TW / 2, ty + TH / 2, AZ + sz * TD / 2));
  // bodem: zand, steentjes, plantjes en een kasteeltje
  const sy = ty + 0.05;
  b.toy(new RoundedBoxGeometry(TW - 0.04, 0.06, TD - 0.04, 1, 0.02), PAL.butter, mat(AX, sy, AZ));
  for (const [dx, dz, r, c] of [[-0.36, 0.1, 0.035, '#C9C2D6'], [-0.3, 0.13, 0.025, PAL.pinkEar], [0.12, 0.12, 0.03, '#C9C2D6']])
    b.toy(new THREE.SphereGeometry(r, 8, 6), c, mat(AX + dx, sy + 0.03, AZ + dz, 0, 0, 0, 1.3, 0.8, 1));
  for (const [dx, dz, h, lean] of [[-0.4, -0.12, 0.34, 0.12], [-0.33, -0.08, 0.24, -0.2], [0.38, -0.1, 0.4, -0.1], [0.43, -0.02, 0.26, 0.25], [0.3, -0.13, 0.22, 0.3]])
    b.toy(new THREE.CapsuleGeometry(0.025, h, 2, 6), PAL.green, mat(AX + dx, sy + 0.02 + h / 2, AZ + dz, 0, 0, lean));
  b.toy(new THREE.CylinderGeometry(0.07, 0.08, 0.13, 8), PAL.lilac, mat(AX + 0.06, sy + 0.09, AZ - 0.08));
  b.toy(new THREE.ConeGeometry(0.08, 0.1, 8), PAL.pink, mat(AX + 0.06, sy + 0.21, AZ - 0.08));
  b.toy(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 8), '#3B3A38', mat(AX + 0.06, sy + 0.06, AZ - 0.08 + 0.072, Math.PI / 2));
  // water: één doorzichtig blok
  const water = new THREE.Mesh(new RoundedBoxGeometry(TW - 0.01, TH - 0.06, TD - 0.01, 1, 0.02),
    new THREE.MeshStandardMaterial({ color: '#9ED8F7', roughness: 0.08, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false }));
  water.position.set(AX, ty + TH / 2 - 0.005, AZ);
  water.renderOrder = 2;
  g.add(water);

  // visjes: één InstancedMesh, elk visje zwemt een eigen rondje door de bak
  const fishes = new THREE.InstancedMesh(fishGeo(), toyVC, FISH.length);
  FISH.forEach((c, i) => fishes.setColorAt(i, new THREE.Color(c)));
  fishes.frustumCulled = false;
  g.add(fishes);
  const swim = FISH.map((_, i) => ({ y: sy + 0.13 + (i % 3) * 0.12, ph: i * 1.3, w: 0.45 + (i % 2) * 0.2, ax: 0.36 - (i % 2) * 0.1, az: 0.11 }));
  // bubbels: kleine bolletjes die uit het kasteeltje omhoog komen
  const bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 8, 6),
    new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.1, transparent: true, opacity: 0.75 }), N_BUBBLES);
  bubbles.frustumCulled = false;
  g.add(bubbles);
  const D = new THREE.Object3D();
  const pose = (t) => {
    swim.forEach((s, i) => {
      const a = t * s.w + s.ph;
      D.position.set(AX + Math.cos(a) * s.ax, s.y + Math.sin(a * 2) * 0.015, AZ + 0.02 + Math.sin(a) * s.az);
      D.rotation.set(0, Math.atan2(-Math.cos(a) * s.az, -Math.sin(a) * s.ax), 0); // neus langs de baan
      D.scale.setScalar(1);
      D.updateMatrix(); fishes.setMatrixAt(i, D.matrix);
    });
    fishes.instanceMatrix.needsUpdate = true;
    const top = ty + TH - 0.08, bot = sy + 0.25;
    for (let i = 0; i < N_BUBBLES; i++) {
      const k = (t * 0.22 + i / N_BUBBLES) % 1;
      D.position.set(AX + 0.06 + Math.sin(t * 3 + i * 2) * 0.012, bot + k * (top - bot), AZ - 0.08 + Math.cos(i * 1.7) * 0.02);
      D.rotation.set(0, 0, 0);
      D.scale.setScalar(0.6 + 0.6 * k);
      D.updateMatrix(); bubbles.setMatrixAt(i, D.matrix);
    }
    bubbles.instanceMatrix.needsUpdate = true;
  };
  pose(0);
  // Beweging bij elk beeld; zolang het huis gepauzeerd is wordt er niet getekend en staat alles stil.
  fishes.onBeforeRender = () => pose(performance.now() / 1000);

  b.finish();
}
