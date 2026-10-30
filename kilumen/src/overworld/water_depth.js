// Shallow vs deep water (Gary, Oct 30 2026: "rework shallower water to look different than deeper water so players know
// which one can be fished in"). Gameplay rule (fishing/logic.js facedWater): a water cell (Col.WATER 3 / DEEP_WATER 11)
// is SHALLOW, and fishable, when any of its 8 neighbours is not water (shore, pier, rock, cliff); every other water cell
// is DEEP: open water you can only cross with Tideglide, no casting. Cells off the map count as water, so a sea that runs
// off the edge stays deep. Pure + cached per map (water cells never change at runtime).
// Look: the ground tile of every water cell is palette-swapped per cell (exact colour remap, palette.png colours only,
// binary alpha, no haze) - shallow = teal / lighter, deep = darker navy - and deep cells next to the shallows get a soft stepped,
// dithered mid-tone band (no hard line). The swap runs on the native tile before the
// time-of-day grade, so night/dusk grade it like any tile. Works for every tileset scale (1x/2x/3x) and all maps.
import { Col } from './constants.js?v=v0.2.95-alpha';

export const SHALLOW = 1, DEEP = 2;
const isW = (c) => c === Col.WATER || c === Col.DEEP_WATER;

/** Per-map class grid: Uint8Array w*h, 0 land, 1 shallow, 2 deep. Cached on the map object. */
export function waterClasses(map) {
  if (!map?.code || !map.width) return null;
  if (map._waterCls) return map._waterCls;
  const w = map.width, h = map.height, g = new Uint8Array(w * h);
  const wet = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? true : isW(map.code(x, y));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!isW(map.code(x, y))) continue;
    let deep = true;
    for (let dy = -1; dy <= 1 && deep; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && !wet(x + dx, y + dy)) { deep = false; break; }
    g[y * w + x] = deep ? DEEP : SHALLOW;
  }
  try { Object.defineProperty(map, '_waterCls', { value: g, enumerable: false, configurable: true }); } catch { /* frozen map */ }
  return g;
}
export function waterClass(map, x, y) {
  const g = waterClasses(map); if (!g || x < 0 || y < 0 || x >= map.width || y >= map.height) return 0;
  return g[y * map.width + x];
}
/** Fishable = shallow water (the faced cell). */
export const isFishable = (map, x, y) => waterClass(map, x, y) === SHALLOW;

// colour remaps by water family (exact RGB, palette.png colours)
const P = (o) => new Map(Object.entries(o).map(([k, v]) => [parseInt(k.slice(1), 16), parseInt(v.slice(1), 16)]));
export const REMAP = {
  sea: { // water / water_1 / water_2 / water>* transitions
    [SHALLOW]: P({ '#4692ce': '#3e9c92', '#4a70ba': '#246e6c', '#2c64a8': '#246e6c', '#7ac2e8': '#70cab8' }),
    [DEEP]: P({ '#4692ce': '#2c64a8', '#4a70ba': '#30488c', '#2c64a8': '#1e4078', '#7ac2e8': '#4a70ba', '#c6ecfa': '#7ac2e8' }),
  },
  cave: { // cave_water*
    [SHALLOW]: P({ '#30488c': '#246e6c', '#2c64a8': '#3e9c92', '#4a70ba': '#3e9c92', '#7ac2e8': '#70cab8', '#4692ce': '#3e9c92' }),
    [DEEP]: P({ '#30488c': '#1e4078', '#2c64a8': '#30488c', '#1e4078': '#1a1226', '#7ac2e8': '#4a70ba', '#4692ce': '#2c64a8' }),
  },
  bog: { // x_bog* (Mirefen)
    [SHALLOW]: P({ '#18382c': '#246e6c', '#244e34': '#3e9c92' }),
    [DEEP]: P({ '#244e34': '#18382c', '#18382c': '#1a1226' }),
  },
};
// Soft shallow->deep transition (Gary, Oct 30 2026: no hard line): deep cells bordering shallow water get a stepped,
// checker-dithered band of palette mid-tones on their base water colours: step 1 (next to the shallows) teal/light blue,
// step 2 light blue/deep base. Ripples and foam stay. No line on the shallow side.
const P2 = (...h) => h.map((x) => parseInt(x.slice(1), 16));
const BAND = {
  sea: { base: new Set(P2('#2c64a8', '#30488c', '#1e4078')), steps: [P2('#3e9c92', '#4692ce'), P2('#4692ce', '#2c64a8')] },
  cave: { base: new Set(P2('#1e4078', '#30488c', '#1a1226')), steps: [P2('#246e6c', '#2c64a8'), P2('#2c64a8', '#1e4078')] },
  bog: { base: new Set(P2('#18382c', '#1a1226')), steps: [P2('#3e9c92', '#246e6c'), P2('#246e6c', '#18382c')] },
};
export function familyOf(name = '') { return /^cave_water/.test(name) ? 'cave' : /^x_bog/.test(name) ? 'bog' : /^(water|x_water|x_sea)/.test(name) ? 'sea' : 'sea'; }

/** Edge mask: bit 1 N, 2 E, 4 S, 8 W set where the 4-neighbour is water of the OTHER class. */
export function edgeMask(map, x, y, cls) {
  let m = 0; const o = cls === SHALLOW ? DEEP : SHALLOW;
  if (waterClass(map, x, y - 1) === o) m |= 1; if (waterClass(map, x + 1, y) === o) m |= 2;
  if (waterClass(map, x, y + 1) === o) m |= 4; if (waterClass(map, x - 1, y) === o) m |= 8;
  return m;
}

/** Pure pixel pass on RGBA data (S x S): remap + edge band. scale = native px size (S / 64). */
export function recolour(a, S, fam, cls, mask) {
  const R = REMAP[fam]?.[cls]; if (!R) return a;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const k = (a[i] << 16) | (a[i + 1] << 8) | a[i + 2], o = R.get(k);
    if (o !== undefined) { a[i] = o >> 16; a[i + 1] = (o >> 8) & 255; a[i + 2] = o & 255; }
  }
  if (mask && cls === DEEP) {
    const sc = Math.max(1, Math.round(S / 64)), B = BAND[fam] || BAND.sea, step = 4 * sc; // two 4 px steps (native)
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let d = S; if (mask & 1) d = Math.min(d, y); if (mask & 4) d = Math.min(d, S - 1 - y); if (mask & 8) d = Math.min(d, x); if (mask & 2) d = Math.min(d, S - 1 - x);
      const k = Math.floor(d / step); if (k > 1) continue;
      const i = (y * S + x) * 4; if (!a[i + 3]) continue;
      if (!B.base.has((a[i] << 16) | (a[i + 1] << 8) | a[i + 2])) continue;
      const col = B.steps[k][(Math.floor(x / sc) + Math.floor(y / sc)) & 1];
      a[i] = col >> 16; a[i + 1] = (col >> 8) & 255; a[i + 2] = col & 255;
    }
  }
  return a;
}

const cache = new WeakMap(); // sheet image -> Map(key -> canvas)
/** A recoloured S x S canvas of one sheet cell, cached. null when canvases are unavailable. */
export function variantTile(img, sx, sy, S, fam, cls, mask) {
  if (typeof document === 'undefined' && typeof OffscreenCanvas === 'undefined') return null;
  let m = cache.get(img); if (!m) cache.set(img, m = new Map());
  const key = sx + ',' + sy + ',' + S + fam + cls + ':' + mask;
  let c = m.get(key); if (c !== undefined) return c;
  try {
    c = typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: S, height: S }) : new OffscreenCanvas(S, S);
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false;
    x.drawImage(img, sx, sy, S, S, 0, 0, S, S);
    const d = x.getImageData(0, 0, S, S); recolour(d.data, S, fam, cls, mask); x.putImageData(d, 0, 0);
  } catch { c = null; }
  m.set(key, c); return c;
}
