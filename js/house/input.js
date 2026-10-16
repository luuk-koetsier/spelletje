/* Aanwijzen en tikken in het 3D-huis.
   Een tik telt alleen als die korter is dan 450 ms en minder dan 7 px beweegt; alles daarboven is
   draaien (dat doet OrbitControls) en activeert niets.
   Volgorde bij een tik: verrassing, kat, deur, kamer. Een verrassing gaat altijd voor, ook als er
   iets anders dichterbij ligt; een tik op een verrassing opent dus nooit een kamer. Voor de rest
   telt wat het dichtst bij ligt, met één uitzondering: een bewoner-kat gaat voor zijn eigen kamer
   (zijn tikvlak ligt achter de kameropening). Een kat van een andere kamer telt dan niet, zodat een
   schuin gedraaid huis nooit de buurkamer of zijn kat raakt. */
import * as THREE from 'three';

const TAP_MS = 450, TAP_PX = 7;

/* targets: { rooms: Mesh[], door: Mesh, surprises: Surprise[], cats: Group[] } (lijsten mogen later groeien).
   handlers: { openRoom(room), door(), surprise(s), cat(group) }.
   opts (optioneel): { paused(): bool, onStart() (bij elke pointerdown), onHover(object|null), tip: HTMLElement }. */
export function attachInput(canvas, camera, controls, targets, handlers, opts = {}) {
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const tip = opts.tip || document.getElementById('tip');
  const paused = opts.paused || (() => false);
  let px0 = 0, py0 = 0, pt0 = 0, moved = false, hovered = null;

  const surpriseOf = new Map();
  const hitList = () => {
    surpriseOf.clear();
    for (const s of targets.surprises) surpriseOf.set(s.hit, s);
    return [...surpriseOf.keys(), ...targets.cats.map(c => c.userData.hit), ...(targets.door ? [targets.door] : []), ...targets.rooms];
  };

  // Wat ligt er onder dit schermpunt? Geeft { kind, target, object } of null.
  function pick(clientX, clientY) {
    ndc.x = (clientX / innerWidth) * 2 - 1; ndc.y = -(clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(hitList(), false);
    const sh = hits.find(h => surpriseOf.has(h.object));
    if (sh) return { kind: 'surprise', target: surpriseOf.get(sh.object), object: sh.object };
    const first = hits[0];
    if (!first) return null;
    const u = first.object.userData;
    if (u.room) {
      const c = hits.find(h => h.object.userData.catRoom === u.room.id);
      if (c) return { kind: 'cat', target: c.object.userData.catHit, object: c.object };
      return { kind: 'room', target: u.room, object: first.object };
    }
    if (u.catHit) return { kind: 'cat', target: u.catHit, object: first.object };
    if (u.doorHit) return { kind: 'door', target: null, object: first.object };
    return null;
  }

  function showTip(text, e) {
    tip.textContent = text; tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.style.opacity = '1';
  }

  canvas.addEventListener('pointerdown', e => {
    px0 = e.clientX; py0 = e.clientY; pt0 = performance.now(); moved = false;
    controls.autoRotate = false;   // automatisch draaien stopt zodra iemand het huis aanraakt
    if (opts.onStart) opts.onStart();
  });
  canvas.addEventListener('pointermove', e => {
    if (paused()) return;
    if (e.buttons && Math.hypot(e.clientX - px0, e.clientY - py0) > TAP_PX) moved = true;
    const p = pick(e.clientX, e.clientY), obj = p ? p.object : null;
    if (obj !== hovered) { hovered = obj; if (opts.onHover) opts.onHover(obj); }
    if (!p) { tip.style.opacity = '0'; canvas.style.cursor = 'grab'; return; }
    canvas.style.cursor = 'pointer';
    if (p.kind === 'room') showTip(p.target.name, e);
    else if (p.kind === 'door') showTip('Welkom!', e);
    else tip.style.opacity = '0';
  });
  canvas.addEventListener('pointerup', e => {
    if (paused()) return;
    if (moved || performance.now() - pt0 >= TAP_MS) return;
    const p = pick(e.clientX, e.clientY);
    if (!p) return;
    if (p.kind === 'surprise') handlers.surprise(p.target);
    else if (p.kind === 'cat') handlers.cat(p.target);
    else if (p.kind === 'door') handlers.door();
    else if (p.kind === 'room') handlers.openRoom(p.target);
  });
  canvas.addEventListener('pointerleave', () => {
    tip.style.opacity = '0';
    if (hovered) { hovered = null; if (opts.onHover) opts.onHover(null); }
  });
}
