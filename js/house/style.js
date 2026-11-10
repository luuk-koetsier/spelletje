/* Stijl van het 3D-huis: één pastelpalet en gedeelde materialen.
   Basis roze en lila, per kamer één accentkleur. */
import * as THREE from '../../vendor/three/build/three.module.js';

export const PAL = {
  // basis
  pink: '#F493BC', pinkD: '#DE6F9F', pinkEar: '#FFB8D4',
  lilac: '#C6A8F0', lilacD: '#9C7BDB',
  cream: '#FBEAF1', creamD: '#EFD6E4', wall: '#FFF5F8',
  mint: '#A8E2CC', sky: '#A9D6F2', butter: '#FFE08A', peach: '#FFC3A0',
  wood: '#DDA978', woodD: '#B5845A',
  // zachte accenten voor spulletjes, bloemen en ballonnen
  coral: '#FF8E8E', orange: '#FFAD66', blue: '#7FB2EE', green: '#92D07C',
  yellow: '#FFD45C', purple: '#B190EC',
  // tuin en lucht
  grass: '#A6DA86', grassD: '#84C26B', dirt: '#EAD8B6', path: '#F7ECDA',
  sky1: '#BFE3F5', sky2: '#F6EAF4', skyTop: '#9FD2EE',
  ink: '#3B3A38',
  // één accent per kamer
  room: {
    memory: '#4CC3A6', puzzel: '#FFA14D', vormen: '#FF7D78', tellen: '#6AA8EC',
    kleuren: '#A27CEB', verkleden: '#EE7BBE', speel: '#86C761', stickers: '#FFC23F',
  },
};

const toyCache = new Map();
const softCache = new Map();

// Glanzend speelgoedplastic. gloss 0..1 (standaard 0.5 geeft roughness 0.35).
export function toy(hex, { gloss = 0.5 } = {}) {
  const key = String(hex).toLowerCase() + '|' + gloss;
  let m = toyCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.6 - 0.5 * gloss, metalness: 0 });
    toyCache.set(key, m);
  }
  return m;
}

// Stof en mat: vloerkleden, touw, vacht, gras.
export function soft(hex) {
  const key = String(hex).toLowerCase();
  let m = softCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.9, metalness: 0 });
    softCache.set(key, m);
  }
  return m;
}

// Zacht schaduwvlekje: plat vlak met één gedeelde radiale gradiënttextuur.
let blobTex = null;
const blobGeo = new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2);
const blobMats = new Map();
function blobTexture() {
  if (blobTex) return blobTex;
  const S = 128, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  // Grijswaarden: alphaMap leest het groene kanaal.
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.45, '#a6a6a6');
  g.addColorStop(1, '#000000');
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  blobTex = new THREE.CanvasTexture(cv);
  return blobTex;
}
export function blobShadow(radius, opacity = 0.4) {
  let mat = blobMats.get(opacity);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({
      color: '#6B4A6E', alphaMap: blobTexture(), transparent: true, opacity,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    blobMats.set(opacity, mat);
  }
  const m = new THREE.Mesh(blobGeo, mat);
  m.scale.set(radius, 1, radius);
  m.renderOrder = 1;
  return m;
}

// Kleur lichter (amt > 0) of donkerder (amt < 0) maken via de lichtheid. Geeft '#rrggbb'.
export function shade(hex, amt) {
  const c = new THREE.Color(hex), hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt)));
  return '#' + c.getHexString();
}
