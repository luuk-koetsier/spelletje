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

// Geselecteerde modellen (KayKit, CC0, zie assets/CREDITS.md), per kamer: alleen wat de inrichter
// in rooms/<id>.js echt neerzet. Stap B laadt ze allemaal vooraf; het plaatsen gebeurt in de inrichters.
// (De speelkamer en de tuin zijn helemaal in code gebouwd.) De smoke-test controleert dat elk bestand
// in assets/models hier gebruikt wordt.
export const MODEL_SETS = {
  memory:    ['fur-rug-oval-a', 'fur-table-low', 'fur-pillow-a', 'fur-pillow-b', 'fur-cabinet-medium-decorated'],
  puzzel:    ['fur-rug-rectangle-stripes-a', 'res-crate', 'res-crate-lid', 'fur-shelf-b-large', 'pro-box-b', 'pro-box-c'],
  vormen:    ['fur-table-medium', 'fur-chair-a', 'fur-chair-c', 'fur-cabinet-small'],
  tellen:    ['fur-couch-pillows', 'fur-cabinet-medium'],
  kleuren:   ['fur-table-medium-long', 'res-jar-a-small', 'res-jar-b-small', 'res-jar-c-small', 'res-chair-stool'],
  verkleden: ['fur-chair-stool', 'fur-shelf-a-big'],
  stickers:  ['fur-bed-single-a', 'fur-rug-oval-b', 'fur-book-single'],
};
export const MODELS = [...new Set(Object.values(MODEL_SETS).flat())];
