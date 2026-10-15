/* Modellen laden (GLB) met cache en foutafhandeling.
   loadModel geeft bij een fout null en logt een waarschuwing, maar gooit nooit.
   Met ?failmodels=1 geeft loadModel altijd null (om te testen dat het huis dan heel blijft). */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

const BASE = new URL('../../assets/models/', import.meta.url).href;
const FAIL = new URLSearchParams(location.search).get('failmodels') === '1';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const cache = new Map();   // naam -> Promise<Group|null>
const done = new Map();    // naam -> Group|null (na laden)
const textures = new Map(); // atlasnaam -> Texture (gedeeld)

export const stats = { failmodels: FAIL, loaded: 0, failed: 0 };

export function loadModel(name) {
  if (cache.has(name)) return cache.get(name);
  let p;
  if (FAIL) {
    p = Promise.resolve(null);
  } else {
    p = loader.loadAsync(BASE + name + '.glb').then(
      g => {
        const root = g.scene;
        root.name = name;
        root.traverse(o => {
          if (!o.isMesh) return;
          o.castShadow = true; o.receiveShadow = true;
          // Alle modellen uit een pakket delen één kleurenatlas. Elke GLB heeft er een eigen
          // kopie van; door ze op naam te delen staat elke atlas maar één keer in het GPU-geheugen.
          for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
            const t = m && m.map;
            if (!t || !t.name) continue;
            const have = textures.get(t.name);
            if (have) { if (have !== t) { m.map = have; t.dispose(); } }
            else textures.set(t.name, t);
          }
        });
        return root;
      },
      e => { console.warn('model niet geladen: ' + name, e && e.message ? e.message : e); return null; }
    ).catch(e => { console.warn('model niet geladen: ' + name, e); return null; });
  }
  p = p.then(g => { done.set(name, g); if (g) stats.loaded++; else if (!FAIL) stats.failed++; return g; });
  cache.set(name, p);
  return p;
}

// Een losse kopie van een al geladen model (geometrie en materialen worden gedeeld).
export function cloneModel(name) {
  const g = done.get(name);
  return g ? skeletonClone(g) : null;
}

export async function preload(names) {
  await Promise.all(names.map(n => loadModel(n)));
}

// Geselecteerde modellen (KayKit, CC0, zie assets/CREDITS.md), per kamer of plek.
// Stap B laadt ze allemaal vooraf; het plaatsen gebeurt in de inrichters per kamer.
export const MODEL_SETS = {
  memory:    ['fur-table-low', 'fur-pillow-a', 'fur-pillow-b', 'fur-cabinet-medium-decorated', 'fur-book-set', 'fur-rug-oval-a'],
  puzzel:    ['fur-rug-rectangle-stripes-a', 'fur-shelf-b-large', 'fur-armchair-pillows', 'res-crate', 'res-crate-lid', 'pro-box-b', 'pro-box-c'],
  vormen:    ['fur-table-medium', 'fur-chair-a', 'fur-chair-c', 'fur-pictureframe-large-b', 'fur-cabinet-small'],
  tellen:    ['fur-couch-pillows', 'fur-cabinet-medium', 'fur-rug-rectangle-a', 'fur-lamp-standing', 'fur-cactus-small-a'],
  kleuren:   ['res-jar-a-small', 'res-jar-b-small', 'res-jar-c-small', 'res-jar-d-small', 'res-chair-stool', 'fur-pictureframe-standing-a', 'fur-table-medium-long', 'fur-shelf-a-small'],
  verkleden: ['fur-pictureframe-large-a', 'fur-shelf-a-big', 'fur-cabinet-small-decorated', 'fur-chair-stool', 'fur-armchair', 'fur-pictureframe-standing-b'],
  speel:     ['pro-barrel-a', 'pro-barrel-b', 'pro-target'],
  stickers:  ['fur-bed-single-a', 'fur-lamp-table', 'fur-book-single', 'fur-pictureframe-small-a', 'fur-pictureframe-small-b', 'fur-pictureframe-small-c', 'fur-rug-oval-b', 'fur-shelf-b-small-decorated'],
  tuin:      ['city-bush', 'city-bench'],
};
export const MODELS = [...new Set(Object.values(MODEL_SETS).flat())];
