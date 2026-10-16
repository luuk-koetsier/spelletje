/* Kwaliteitsstanden voor het 3D-huis.
   high: pixelratio min(2, devicePixelRatio), één zon met een PCF-schaduwkaart van 1024.
   low:  pixelratio 1, geen schaduwkaart, de zon werpt geen schaduw, de PointLights uit.
   De governor schakelt eenmalig omlaag naar low als het apparaat het niet bijhoudt,
   en schakelt nooit meer terug (geen geflikker tussen de standen).
   Opwarmen: de governor meet pas nadat arm() is aangeroepen (als het huis klaarstaat) en
   negeert daarna nog WARMUP_S seconden. Zo telt het compileren van de shaders in de eerste
   seconden niet mee en schakelt een goede telefoon niet voor altijd omlaag.
   ?q=low forceert low, ?q=high forceert high (de governor schakelt dan nooit omlaag; voor tests). */

const WINDOW_S = 3;     // meetvenster in seconden
const MIN_FPS = 28;     // onder dit gemiddelde gaat de stand omlaag
const MAX_DT = 0.5;     // één lange pauze (tab op de achtergrond) telt als een traag beeld, niet meer
export const WARMUP_S = 2;   // na arm() zo lang niet meten

const forced = () => new URLSearchParams(location.search).get('q');

function hasWebGL2() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
    return true;
  } catch { return false; }
}

export function initialTier() {
  const q = forced();
  if (q === 'low') return 'low';
  if (q === 'high') return 'high';
  if ((navigator.hardwareConcurrency || 4) <= 2) return 'low';
  if (!hasWebGL2()) return 'low';
  return 'high';
}

export function pixelRatioFor(tier) {
  return tier === 'low' ? 1 : Math.min(2, window.devicePixelRatio || 1);
}

// Zet de renderer in de gevraagde stand. De schaduwlamp en de PointLights regelt de aanroeper via onChange.
export function applyTier(renderer, tier) {
  renderer.setPixelRatio(pixelRatioFor(tier));
  renderer.shadowMap.enabled = tier === 'high';
}

// opts.locked: nooit omlaag schakelen (standaard bij ?q=high).
export function createGovernor(renderer, onChange, startTier = initialTier(), { locked = forced() === 'high' } = {}) {
  let time = 0, frames = 0, armed = false, warm = 0;
  const gov = {
    tier: startTier,
    get warming() { return !armed || warm > 0; },
    // Begin met meten, na een opwarmtijd van `sec` seconden. Opnieuw aanroepen start de opwarmtijd opnieuw.
    arm(sec = WARMUP_S) { armed = true; warm = sec; time = 0; frames = 0; },
    tick(dt) {
      if (gov.tier === 'low' || locked || !armed) return;
      if (!(dt > 0)) return;
      if (warm > 0) { warm -= dt; return; }
      time += Math.min(dt, MAX_DT); frames++;
      if (time < WINDOW_S - 1e-6) return;
      const fps = frames / time;
      time = 0; frames = 0;
      if (fps < MIN_FPS) {
        gov.tier = 'low';
        applyTier(renderer, 'low');
        if (onChange) onChange('low');
      }
    },
  };
  return gov;
}
