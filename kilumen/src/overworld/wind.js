// Kilumen overworld: world wind (Oct 29 2026, Gary "a slight wind on the trees, a smaller motion on grass and flowers").
// Pure draw-time effect: tiles keep their cells, collision and map data never change. Every offset is a whole art pixel
// (native px * integer zoom), so nothing smears. Kinds (by tileset name, cached per tileset):
//   canopy  tree/pine tops (overlay): drawn in horizontal bands, top band shifted most, bottom band 0 = trunk base fixed
//           -> a pixel-snapped shear. Slow ~4 s cycle, 1-2 px.
//   tall    tall grass (+ ysort fronts): top half shifted 0-1 px, quicker ~1.6 s ripple; a cell the player just entered
//           shakes harder for ~0.5 s (rustle touch, on top of the tileset's rustle frames).
//   flower  flower patches: tiny 0/1 px bob.
//   grass   plain ground grass: only where a gust front is passing, the top rows are re-drawn 1 px over themselves
//           (no gap can open in the ground layer).
// Phase is offset by world position and gust waves travel across the map along living.js WIND.
// Weather: strength follows life.weather (stronger in rain/storm), 0 indoors / caves. Off with reduced motion, the Options 'Wind' toggle, or ?wind=0.
// Adapted idea (per-row pixel-snapped offset, height cutoff, world-position phase): "Wind with pixel snapping" by Stixxy,
// godotshaders.com (CC0 per godotshaders.com default licence) - see THIRD_PARTY_LICENSES.
import { WIND } from './living.js?v=v0.2.99-alpha';

export const WIND_STRENGTH = Object.freeze({ clear: 0.8, fair: 1, cloudy: 1.15, overcast: 1.3, custom: 1.2, rain: 1.6, storm: 2.2 });
const CANOPY = /^(tree_top|treed_top|snowpine_top|x_pine_snow(_small)?_\d+_0)$/, TALL = /^tall_grass/, FLOWER = /^flowers?_/, GRASS = /^grass_(dark_)?\d+$/;
const KIND = { canopy: 1, tall: 2, flower: 3, grass: 4 };

/** Tile kind for a tileset tile (0 = not foliage). */
export function windKind(t) {
  const n = t?.name || '';
  return CANOPY.test(n) ? KIND.canopy : TALL.test(n) ? KIND.tall : FLOWER.test(n) ? KIND.flower : GRASS.test(n) ? KIND.grass : 0;
}
export const killedByUrl = () => !!globalThis.KILUMEN_WIND_OFF;
/** Options 'Wind' toggle (life.settings.wind, default on, saved with clouds / life); ?wind=0 always wins. */
export const windEnabled = (life) => !killedByUrl() && life?.settings?.wind !== false;

/** Gust front 0..1 at world tile (x, y), time s: a soft band travelling along WIND every ~9 s. */
export function gustAt(x, y, s) {
  const d = x * WIND.x + y * WIND.y, P = 40; // band period in tiles along the wind
  const ph = (((d - s * 4.5) % P) + P) % P; // 4.5 tiles/s
  return ph < 6 ? Math.sin((ph / 6) * Math.PI) : 0;
}
/** Canopy top offset in native px (integer, -2..2) for tile (x, y). */
export function canopyOffset(x, y, s, k = 1) {
  const ph = x * 0.55 + y * 0.31, base = Math.sin((s / 4) * Math.PI * 2 + ph); // ~4 s cycle
  return Math.round(Math.max(-2, Math.min(2, (base * 1.1 + gustAt(x, y, s) * 1.2) * k)));
}
export function tallOffset(x, y, s, k = 1) {
  const ph = x * 0.9 + y * 0.6;
  return Math.round(Math.max(-1, Math.min(2, (Math.sin((s / 1.6) * Math.PI * 2 + ph) * 0.6 + gustAt(x, y, s) * 0.9) * k)));
}
export const flowerBob = (x, y, s, k = 1) => (Math.sin((s / 2.2) * Math.PI * 2 + x * 1.3 + y * 0.7) * k > 0.55 ? 1 : 0);

export class Wind {
  constructor({ reduced = () => false, life = null, lite = false } = {}) { this.reduced = reduced; this.lite = lite; // lite (phones): 2 canopy bands, no ground ripple
    this.life = life; this._kinds = null; this._ts = null; this.k = 1; this.s = 0; this.on = false; }
  /** Per frame: strength from weather, off indoors / reduced motion / ?wind=0. `phone` drops canopy to 2 bands. */
  frame(v) {
    const life = this.life || v.life;
    this.on = windEnabled(life) && !this.reduced() && !!life?.outdoor; // off -> kind() 0 -> plain draw (rest pose)
    this.k = WIND_STRENGTH[life?.weather] ?? 1; this.s = v.ms / 1000;
    if (this._ts !== v.tileset) { this._ts = v.tileset; this._kinds = new Map(); for (const [id, t] of v.tileset.byId) { const k = windKind(t); if (k) this._kinds.set(id, k); } }
    return this.on;
  }
  kind(id) { return this.on ? this._kinds?.get(id) || 0 : 0; }
  /**
   * Draw a foliage tile with its sway. src (sx, sy, S) in the sheet, dest (dx, dy, D) on screen; z = zoom.
   * Returns false when nothing moves (caller draws it plainly).
   */
  draw(ctx, img, sx, sy, S, dx, dy, D, z, kind, x, y, rustleAge) {
    const s = this.s, k = this.k;
    if (kind === KIND.canopy) {
      const o = canopyOffset(x, y, s, k);
      if (!o) return false;
      const B = this.lite ? 2 : 4, bs = S / B, bd = D / B; // 4 bands (2 on phones): offsets o .. 0 (bottom band meets the trunk)
      for (let b = 0; b < B; b++) { const ob = Math.round((o * (B - 1 - b)) / (B - 1)); ctx.drawImage(img, sx, sy + b * bs, S, bs, dx + ob * z, dy + b * bd, D, bd); }
      return true;
    }
    if (kind === KIND.tall) {
      let o = tallOffset(x, y, s, k);
      if (rustleAge != null && rustleAge >= 0 && rustleAge < 500) o = Math.round(Math.sin(rustleAge / 45) * 2 * (1 - rustleAge / 500)); // walk-through shake
      if (!o) return false;
      const h = S / 2, hd = D / 2;
      ctx.drawImage(img, sx, sy, S, h, dx + o * z, dy, D, hd);
      ctx.drawImage(img, sx, sy + h, S, h, dx, dy + hd, D, hd);
      return true;
    }
    if (kind === KIND.flower) {
      const o = flowerBob(x, y, s, k);
      if (!o) return false;
      ctx.drawImage(img, sx, sy, S, S, dx, dy - o * z, D, D);
      return true;
    }
    if (kind === KIND.grass) {
      if (this.lite) return false; // ground: plain draw, then a 1 px ripple of the top third only under a gust front
      ctx.drawImage(img, sx, sy, S, S, dx, dy, D, D);
      if (gustAt(x, y, s) * k > 0.75 && ((x * 7 + y * 3) & 3) === 0) ctx.drawImage(img, sx, sy, S, S / 3, dx + z, dy, D, D / 3);
      return true;
    }
    return false;
  }
}
