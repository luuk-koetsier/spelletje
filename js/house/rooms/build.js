/* Bouwstenen voor de kamerinrichters.
   Een kamer verzamelt eerst al haar spullen en voegt ze daarna per materiaal samen,
   zodat een hele kamer maar een handvol draw calls kost:
   - zelfgebouwde speelgoedonderdelen in vertex-kleuren (glanzend en mat),
   - KayKit-modellen per kleurenatlas (de modellen uit één pakket delen één atlas),
   - alle schaduwvlekjes samen.
   Alles staat in de kamergroep (slot.group), met de oorsprong midden op de kamervloer:
   x van -size.x/2 tot +size.x/2, z van -size.z/2 (achterwand) tot +size.z/2 (opening). */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
export function mat(x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
  return new THREE.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));
}

// Plaatsing voor een staafje (een geometrie langs de y-as, met hoogte 1) van punt a naar punt b.
// Geeft [matrix, lengte]; maak de geometrie met hoogte 1, de matrix rekt hem op tot de lengte.
const UP = new THREE.Vector3(0, 1, 0);
export function along(a, b) {
  const pa = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(pa), len = d.length();
  const m = new THREE.Matrix4().compose(pa.addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()), new THREE.Vector3(1, len, 1));
  return [m, len];
}

// Twee gedeelde materialen voor alle zelfgebouwde spullen: glanzend speelgoedplastic en mat (stof, krijtbord).
export const toyVC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0 });
export const softVC = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 });
// Warme lampjes: één gedeeld gloeiend materiaal (emissief), zodat alle lampjes van een kamer één draw call zijn.
export const glowMat = new THREE.MeshStandardMaterial({ color: '#FFF4D6', emissive: '#FFC870', emissiveIntensity: 1.15, roughness: 0.4, metalness: 0 });

// Een onderdeel zonder index, met alleen positie, normaal en één vertex-kleur.
export function vc(geo, hex, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  if (!g.attributes.normal) g.computeVertexNormals();
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.clearGroups();
  return g;
}

// Kopie van een (gecomprimeerde) modelgeometrie met gewone Float32-attributen, zodat
// geometrieën uit verschillende bestanden samen te voegen zijn. Het origineel blijft ongemoeid.
function plainGeo(src) {
  const g = new THREE.BufferGeometry();
  for (const k of ['position', 'normal', 'uv']) {
    const a = src.attributes[k];
    if (!a) continue;
    const n = a.count, s = a.itemSize, arr = new Float32Array(n * s);
    for (let i = 0; i < n; i++) {
      arr[i * s] = a.getX(i);
      if (s > 1) arr[i * s + 1] = a.getY(i);
      if (s > 2) arr[i * s + 2] = a.getZ(i);
    }
    g.setAttribute(k, new THREE.BufferAttribute(arr, s));
  }
  const n = src.attributes.position.count;
  if (src.index) g.setIndex(Array.from(src.index.array));
  else g.setIndex(Array.from({ length: n }, (_, i) => i));
  return g;
}

// Hoogte van een zittende kat uit cats.js (met oren); bewoners zijn 0,45 keer de kamerhoogte.
const SIT_H = 0.98;

export function roomBuilder(slot, kit) {
  const group = slot.group;
  const toyParts = [], softParts = [], glowParts = [], blobs = [];
  const atlases = new Map();          // atlasnaam -> { material, geos, cast }
  const blobProto = kit.blobShadow(1, 0.32);
  const b = {
    group, size: slot.size,
    // zelfgebouwde onderdelen (geometrie, kleur, plaatsing)
    toy(geo, hex, m) { toyParts.push(vc(geo, hex, m)); },
    soft(geo, hex, m) { softParts.push(vc(geo, hex, m)); },
    // gloeiend lampje (warm wit, emissief)
    glow(geo, m) { glowParts.push(vc(geo, '#FFFFFF', m)); },
    // schaduwvlekje op de vloer (ellips rx bij rz)
    blob(x, z, rx, rz = rx, y = 0.006) { blobs.push(mat(x, y, z, 0, 0, 0, rx, 1, rz)); },
    // Een KayKit-model op de kamervloer. Geeft false als het model er niet is (niet geladen).
    // Modellen in een kamer werpen standaard geen echte schaduw: de kamer staat grotendeels in de
    // schaduw van de gevel, en de schaduwvlekjes (blob) doen het werk. Dat scheelt de schaduwpas veel.
    model(name, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, cast = false } = {}) {
      const c = kit.cloneModel(name);
      if (!c) return false;
      c.position.set(x, y, z); c.rotation.set(rx, ry, rz); c.scale.setScalar(s);
      c.updateMatrixWorld(true);
      c.traverse(o => {
        if (!o.isMesh) return;
        const key = (o.material.map && o.material.map.name) || o.material.name || 'model';
        let a = atlases.get(key);
        if (!a) { a = { material: o.material, geos: [], cast: false }; atlases.set(key, a); }
        a.geos.push(plainGeo(o.geometry).applyMatrix4(o.matrixWorld));
        a.cast = a.cast || cast;
      });
      return true;
    },
    // De bewoner-kat van de kamer, met dezelfde maat als de andere bewoners.
    resident(spec, { x = 0, y = 0, z = 0, ry = 0 } = {}) {
      const c = kit.makeCat({ id: slot.id, room: slot.id, ...spec });
      c.position.set(x, y, z);
      c.scale.setScalar(slot.size.y * 0.45 / SIT_H);
      c.rotation.y = ry;
      group.add(c);
      return c;
    },
    // Voeg alles per materiaal samen en zet het in de kamer.
    finish() {
      const add = (geos, material, { cast = false, name = '' } = {}) => {
        if (!geos.length) return null;
        const m = new THREE.Mesh(mergeGeometries(geos, false), material);
        m.castShadow = cast; m.receiveShadow = true; m.name = name;
        group.add(m);
        return m;
      };
      for (const [key, a] of atlases) add(a.geos, a.material, { cast: a.cast, name: slot.id + '-model-' + key });
      add(toyParts, toyVC, { name: slot.id + '-toy' });
      add(softParts, softVC, { name: slot.id + '-soft' });
      const gl = add(glowParts, glowMat, { name: slot.id + '-glow' });
      if (gl) gl.receiveShadow = false;
      if (blobs.length) {
        const sh = add(blobs.map(m => blobProto.geometry.clone().applyMatrix4(m)), blobProto.material, { name: slot.id + '-blobs' });
        sh.receiveShadow = false; sh.renderOrder = 1;
      }
    },
  };
  return b;
}
