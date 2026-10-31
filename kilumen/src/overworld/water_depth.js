// Water look + class (Gary, Oct 30 2026 11:10 AM CT: "remove shallow water"). Every water cell (Col.WATER 3 / DEEP_WATER 11)
// is DEEP: ride-only (Tideglide), and fishable from land when faced (fishing/logic.js facedWater). The earlier shallow
// band / fade / light palette row are gone; all water draws in one consistent deep colour via an exact palette remap
// (palette.png colours only, binary alpha) on the native tile before the time-of-day grade. The tiles' own soft shore
// edges are kept; no hard lines. Pure + cached per map (water cells never change at runtime).
import { Col } from './constants.js?v=v0.2.102-alpha';

export const DEEP = 2; // (SHALLOW = 1 retired Oct 30 2026)
const isW = (c) => c === Col.WATER || c === Col.DEEP_WATER;

/** Per-map class grid: Uint8Array w*h, 0 land, 2 water (all deep). Cached on the map object. */
export function waterClasses(map) {
  if (!map?.code || !map.width) return null;
  if (map._waterCls) return map._waterCls;
  const w = map.width, h = map.height, g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isW(map.code(x, y))) g[y * w + x] = DEEP;
  try { Object.defineProperty(map, '_waterCls', { value: g, enumerable: false, configurable: true }); } catch { /* frozen map */ }
  return g;
}
export function waterClass(map, x, y) {
  const g = waterClasses(map); if (!g || x < 0 || y < 0 || x >= map.width || y >= map.height) return 0;
  return g[y * map.width + x];
}
/** Fishable = any water cell (faced from land). */
export const isFishable = (map, x, y) => waterClass(map, x, y) === DEEP;

// colour remaps by water family (exact RGB, palette.png colours)
const P = (o) => new Map(Object.entries(o).map(([k, v]) => [parseInt(k.slice(1), 16), parseInt(v.slice(1), 16)]));
export const REMAP = {
  sea: { // water / water_1 / water_2 / water>* transitions; one deep colour
    [DEEP]: P({ '#4692ce': '#2c64a8', '#4a70ba': '#30488c', '#2c64a8': '#1e4078', '#7ac2e8': '#4a70ba', '#c6ecfa': '#7ac2e8' }),
  },
  cave: { // cave_water*: same idea, one step dimmer
    [DEEP]: P({ '#30488c': '#1e4078', '#2c64a8': '#30488c', '#1e4078': '#1a1226', '#7ac2e8': '#4a70ba', '#4692ce': '#2c64a8' }),
  },
  bog: { // x_bog* (Mirefen): murky lighter -> darker
    [DEEP]: P({ '#244e34': '#18382c', '#18382c': '#1a1226' }),
  },
};
export function familyOf(name = '') { return /^cave_water/.test(name) ? 'cave' : /^x_bog/.test(name) ? 'bog' : /^(water|x_water|x_sea)/.test(name) ? 'sea' : 'sea'; }

/** Edge mask: retired with the shallow band (always 0); kept so callers stay simple. */
export function edgeMask() { return 0; }

/** Pure pixel pass on RGBA data (S x S): exact deep-colour remap. */
export function recolour(a, S, fam, cls) {
  const R = REMAP[fam]?.[cls]; if (!R) return a;
  for (let i = 0; i < a.length; i += 4) {
    if (!a[i + 3]) continue;
    const k = (a[i] << 16) | (a[i + 1] << 8) | a[i + 2], o = R.get(k);
    if (o !== undefined) { a[i] = o >> 16; a[i + 1] = (o >> 8) & 255; a[i + 2] = o & 255; }
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
