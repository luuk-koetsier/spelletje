/* De acht kamers van het huis en de koppeling van kamer aan plek en inrichter.
   De volgorde bepaalt de plek in het huis: van boven naar beneden, van links naar rechts,
   met de voordeur in het midden onderaan. */
import { PAL } from '../style.js';
import { furnish as memory } from './memory.js';
import { furnish as puzzel } from './puzzel.js';
import { furnish as vormen } from './vormen.js';
import { furnish as tellen } from './tellen.js';
import { furnish as kleuren } from './kleuren.js';
import { furnish as verkleden } from './verkleden.js';
import { furnish as speel } from './speel.js';
import { furnish as stickers } from './stickers.js';

export const ROOMS = [
  { name: 'Memory',     id: 'memory',    icon: 'memory',  color: PAL.room.memory },
  { name: 'Puzzel',     id: 'puzzel',    icon: 'puzzle',  color: PAL.room.puzzel },
  { name: 'Vormen',     id: 'vormen',    icon: 'shapes',  color: PAL.room.vormen },
  { name: 'Tellen',     id: 'tellen',    icon: 'count',   color: PAL.room.tellen },
  { name: 'Kleuren',    id: 'kleuren',   icon: 'palette', color: PAL.room.kleuren },
  { name: 'Verkleden',  id: 'verkleden', icon: 'dressup', color: PAL.room.verkleden },
  { name: 'Speelkamer', id: 'speel',     icon: 'play',    color: PAL.room.speel },
  { name: 'Stickers',   id: 'stickers',  icon: 'sticker', color: PAL.room.stickers },
];

// Eén inrichter per kamer-id, uit rooms/<id>.js. Elke inrichter zet ook de bewoner-kat neer.
const FURNISHERS = { memory, puzzel, vormen, tellen, kleuren, verkleden, speel, stickers };

// Richt elke plek in met de inrichter van die kamer, als die bestaat.
// Een inrichter die faalt, breekt de andere kamers en het huis niet.
export function furnishRooms(slots, kit) {
  for (const slot of slots) {
    const f = FURNISHERS[slot.id];
    if (!f) continue;
    try { f(slot, kit); }
    catch (e) { console.warn('kamer ' + slot.id + ' niet ingericht:', e); }
  }
}
