/* Verkleden: een kleedkamer met een podium. Een rond podium met lampjes langs de rand en
   gordijntjes erachter, een kaptafel met een spiegel vol lampjes (met een warm lampje ervoor),
   een krukje, een kledingrek met jurkjes, een hoedenplank en een paar schoentjes.
   De bewoner is een roze kat met een hoge hoed, op het podium. */
import * as THREE from '../../../vendor/three/build/three.module.js';
import { RoundedBoxGeometry } from '../../../vendor/three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { roomBuilder, mat, along } from './build.js';

export function furnish(slot, kit) {
  const { PAL } = kit, A = PAL.room.verkleden;
  const b = roomBuilder(slot, kit);
  const W = slot.size.x / 2, ZB = -slot.size.z / 2;

  // podium met een sterretje en lampjes langs de voorrand, de kat staat erop
  const PX = -0.56, PZ = 0.02, PR = 0.44, PH = 0.12;
  b.toy(new THREE.CylinderGeometry(PR, PR + 0.02, PH, 20), A, mat(PX, PH / 2, PZ));
  b.toy(new THREE.CylinderGeometry(PR - 0.03, PR - 0.03, 0.012, 20), '#FFFFFF', mat(PX, PH + 0.004, PZ));
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.08 + 0.84 * i / 8);
    b.glow(new THREE.SphereGeometry(0.022, 6, 4), mat(PX + Math.cos(a) * (PR + 0.012), PH * 0.55, PZ + Math.sin(a) * (PR + 0.012)));
  }
  b.blob(PX, PZ, PR + 0.12);
  b.resident({ fur: '#F7B6CF', belly: '#FFF0F6', pose: 'sit', accessory: 'hat' }, { x: PX, y: PH + 0.01, z: PZ + 0.04, ry: 0.3 });

  // gordijntjes achter het podium: een gestrikte plooi links en rechts en een geschulpte rand erboven
  const CZ = ZB + 0.08, CY = 1.38, CL = -W + 0.02, CR = -0.06;
  for (const [x0, sg] of [[CL + 0.04, 1], [CR - 0.04, -1]]) {
    for (let k = 0; k < 4; k++) {
      const x = x0 + sg * k * 0.07;
      const [m] = along([x, CY, CZ + 0.02 * k], [x + sg * 0.05, 0.02, CZ + 0.03 * k]);
      b.soft(new THREE.CylinderGeometry(0.05, 0.065, 1, 7), k % 2 ? PAL.pinkD : A, m);
    }
    b.toy(new THREE.TorusGeometry(0.075, 0.018, 5, 12), PAL.butter, mat(x0 + sg * 0.08, 0.62, CZ + 0.06, Math.PI / 2, 0, 0, 1.2, 1, 1));
  }
  b.toy(new RoundedBoxGeometry(CR - CL + 0.08, 0.05, 0.06, 1, 0.02), PAL.butter, mat((CL + CR) / 2, CY + 0.03, CZ));
  for (let i = 0; i < 7; i++)
    b.soft(new THREE.SphereGeometry(0.075, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI), A,
      mat(CL + 0.07 + i * (CR - CL - 0.14) / 6, CY, CZ + 0.03, 0, 0, 0, 1, 0.9, 0.5));

  // kaptafel met een spiegel vol lampjes
  const DX = 0.3, DZ = ZB + 0.2, DY = 0.44;
  b.toy(new RoundedBoxGeometry(0.62, 0.05, 0.3, 1, 0.02), '#FFFFFF', mat(DX, DY, DZ));
  b.toy(new RoundedBoxGeometry(0.6, 0.1, 0.27, 1, 0.02), A, mat(DX, DY - 0.07, DZ));
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    b.toy(new THREE.CylinderGeometry(0.018, 0.014, DY - 0.1, 6), '#FFFFFF', mat(DX + sx * 0.27, (DY - 0.1) / 2, DZ + sz * 0.1));
  b.toy(new THREE.SphereGeometry(0.018, 6, 4), PAL.butter, mat(DX, DY - 0.07, DZ + 0.14));
  b.blob(DX, DZ, 0.38, 0.2);
  // spullen op de kaptafel: parfumflesje, lippenstift, poederdoos
  b.toy(new THREE.SphereGeometry(0.04, 10, 6), PAL.lilac, mat(DX - 0.18, DY + 0.06, DZ + 0.03, 0, 0, 0, 1, 1.2, 1));
  b.toy(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6), PAL.butter, mat(DX - 0.18, DY + 0.12, DZ + 0.03));
  b.toy(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), '#FFFFFF', mat(DX + 0.16, DY + 0.055, DZ + 0.04));
  b.toy(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), PAL.coral, mat(DX + 0.16, DY + 0.1, DZ + 0.04));
  b.toy(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 12), PAL.pinkEar, mat(DX + 0.04, DY + 0.035, DZ + 0.05));
  // spiegel: witte lijst, glas met twee glansstrepen, lampjes rondom
  const MY = 1.06, MW = 0.46, MH = 0.5, mz = ZB + 0.025;
  b.toy(new RoundedBoxGeometry(MW + 0.08, MH + 0.08, 0.04, 1, 0.02), '#FFFFFF', mat(DX, MY, mz));
  b.toy(new RoundedBoxGeometry(MW, MH, 0.01, 1, 0.004), '#D6E8F5', mat(DX, MY, mz + 0.022));
  for (const [dx, w] of [[-0.06, 0.05], [0.04, 0.025]])
    b.toy(new THREE.BoxGeometry(w, MH * 0.7, 0.004), '#FFFFFF', mat(DX + dx, MY + 0.02, mz + 0.03, 0, 0, -0.5));
  const bulbs = [];
  for (let i = 0; i < 4; i++) { const t = (i + 0.5) / 4 - 0.5; bulbs.push([t * MW, MH / 2 + 0.04], [t * MW, -MH / 2 - 0.04]); }
  for (let i = 0; i < 3; i++) { const t = (i + 0.5) / 3 - 0.5; bulbs.push([-MW / 2 - 0.04, t * MH], [MW / 2 + 0.04, t * MH]); }
  for (const [x, y] of bulbs) b.glow(new THREE.SphereGeometry(0.026, 6, 4), mat(DX + x, MY + y, mz + 0.03));
  // warm licht van de spiegellampjes (één van de twee lampen in het huis, zonder schaduw)
  const light = new THREE.PointLight('#FFD8A0', 1.1, 1.7, 2);
  light.position.set(DX, MY, mz + 0.35);
  light.castShadow = false;
  b.group.add(light);
  // krukje voor de kaptafel
  if (b.model('fur-chair-stool', { x: DX + 0.02, z: DZ + 0.36, s: 0.34 })) b.blob(DX + 0.02, DZ + 0.36, 0.15);

  // kledingrek schuin bij de rechterwand, met drie jurkjes op hangertjes
  const RX = W - 0.4, RZ = 0.22, RL = 0.38, RY = 0.98, rr = -0.95;
  const R = (m) => new THREE.Matrix4().multiplyMatrices(mat(RX, 0, RZ, 0, rr), m);
  for (const x of [-RL, RL]) {
    b.toy(new THREE.CylinderGeometry(0.018, 0.018, RY, 6), '#FFFFFF', R(mat(x, RY / 2, 0)));
    b.toy(new RoundedBoxGeometry(0.06, 0.03, 0.22, 1, 0.012), '#FFFFFF', R(mat(x, 0.015, 0)));
  }
  b.toy(new THREE.CylinderGeometry(0.016, 0.016, 2 * RL + 0.04, 6), PAL.butter, R(mat(0, RY, 0, 0, 0, Math.PI / 2)));
  [[-0.22, PAL.lilac], [0.02, PAL.butter], [0.24, PAL.sky]].forEach(([x, col], i) => {
    const D = (m) => R(new THREE.Matrix4().multiplyMatrices(mat(x, RY, 0, 0, 0, 0, 1, 1, 0.55), m));
    b.toy(new THREE.TorusGeometry(0.025, 0.006, 4, 8, Math.PI * 1.3), '#FFFFFF', R(mat(x, RY + 0.02, 0)));
    b.toy(new THREE.CylinderGeometry(0.007, 0.007, 0.2, 5), '#FFFFFF', R(mat(x, RY - 0.05, 0, 0, 0, Math.PI / 2)));
    b.soft(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8), col, D(mat(0, -0.12, 0)));                 // lijfje
    b.soft(new THREE.ConeGeometry(0.15 + (i % 2) * 0.02, 0.3, 10, 1, true), col, D(mat(0, -0.3, 0)));  // rokje
    b.soft(new THREE.TorusGeometry(0.065, 0.012, 4, 10), '#FFFFFF', D(mat(0, -0.18, 0, Math.PI / 2)));  // ceintuurtje
  });
  b.blob(RX, RZ, 0.46, 0.22);

  // hoedenplank aan de rechterwand boven het rek, met een strohoed, een tovenaarshoed en een baret
  const HY = 1.24, HZ = -0.3;
  if (b.model('fur-shelf-a-big', { x: W, y: HY, z: HZ, ry: -Math.PI / 2, s: 0.34, cast: false })) {
    const hx = W - 0.1, hy = HY + 0.035;
    b.toy(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 14), PAL.butter, mat(hx, hy, HZ - 0.22));
    b.toy(new THREE.SphereGeometry(0.065, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), PAL.butter, mat(hx, hy, HZ - 0.22));
    b.toy(new THREE.CylinderGeometry(0.067, 0.067, 0.02, 12), PAL.coral, mat(hx, hy + 0.012, HZ - 0.22));
    b.toy(new THREE.ConeGeometry(0.075, 0.24, 10), PAL.purple, mat(hx, hy + 0.12, HZ, 0, 0, 0.12));
    b.toy(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 12), PAL.purple, mat(hx, hy + 0.005, HZ));
    b.toy(new THREE.SphereGeometry(0.022, 6, 4), PAL.yellow, mat(hx - 0.07, hy + 0.1, HZ));
    b.toy(new THREE.SphereGeometry(0.08, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), PAL.mint, mat(hx, hy, HZ + 0.22, 0, 0, 0, 1, 0.55, 1));
    b.toy(new THREE.SphereGeometry(0.016, 6, 4), PAL.mint, mat(hx, hy + 0.046, HZ + 0.22));
  }

  // schoentjes voor het podium
  for (const [dx, r] of [[0, 0.3], [0.09, 0.5]]) {
    b.toy(new THREE.CapsuleGeometry(0.03, 0.07, 2, 6), PAL.pinkD, mat(PX + 0.36 + dx, 0.03, PZ + 0.62, Math.PI / 2, 0, r, 1, 1, 0.75));
    b.toy(new THREE.SphereGeometry(0.018, 6, 4), PAL.butter, mat(PX + 0.36 + dx + Math.sin(r) * 0.04, 0.05, PZ + 0.62 + Math.cos(r) * 0.04));
  }
  b.blob(PX + 0.4, PZ + 0.62, 0.1, 0.08);

  b.finish();
}
