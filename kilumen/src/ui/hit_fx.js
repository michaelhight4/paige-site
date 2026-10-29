// Battle hit effects (FX prep, Oct 22, 2026). Shared by the default battle shell (src/ui/ui.js hit()) and ?battle=sd
// (src/battle/ui_sd.js fxAt()). Plays the transparent, effect-sized art/characters/pixel/effects/<el>/<anim>/<el>_<anim>_battle_2x.gif
// (live since Oct 22, 2026 after Gary approved the swap), using its sidecar <same name>.json:
//  - natural size + aspect: frame_w x frame_h (2x px) times k, k = display px per 2x px of the creature sprites
//    (sprites are *_128_2x.png too, so k = sprite layout width / sprite natural width)
//  - placed by anchor (impact_centre) on the target's impact point (centre of the sprite's opaque pixels);
//    a hit on the player's creature is mirrored around the anchor (x' = frame_w - anchor.x)
//  - removed after total_ms (the GIF has loop=0, so it is played ONCE by removing it); frame 0 is already the hit, so callers
//    start the shake + damage number in the same tick show() resolves
//  - each play gets its own blob: URL, so the GIF always starts at frame 0 (browsers share one animation clock per URL);
//    prepFx() decodes it ahead (during the lunge / travel) so the impact appears the moment the hit lands
//  - no JSON (e.g. the old full-scene live files, which have none), bad JSON or a failed GIF load -> nothing is shown
// Gates: HIT_EFFECTS_ENABLED / HIT_TRAVEL_FX_ENABLED in ./data.js (both true since Oct 22, 2026).
// Dev only: ?fxpreview=staging reads _transparent_staging/ instead (impacts + travel on, even with the flags off);
// ?fxel=<element> forces the effect element of every hit while effects are on (stills / clips); ?fxtravel=0 turns travel off.
import { ELEMENT_FX, HIT_EFFECTS_ENABLED, HIT_TRAVEL_FX_ENABLED } from './data.js?v=v0.2.78-alpha';

const FX_DIR = 'art/characters/pixel/effects/';
const STAGING = '_transparent_staging/';
// PLACEHOLDER projectile rule for the scripted default shell (its skills have no category): same element list as the
// engine's SPECIAL set in src/battle/data/skills.js. ?battle=sd uses the engine move's category ('Special') instead.
const RANGED_EL = new Set(['fire', 'water', 'light', 'angelic', 'dark', 'ghost', 'mystic', 'spirit', 'wind', 'bird', 'sea', 'magma']);

export function fxSettings(q) {
  const preview = q?.get?.('fxpreview') === 'staging';
  const force = (preview || HIT_EFFECTS_ENABLED) ? (q?.get?.('fxel') || '').toLowerCase().replace(/[^a-z]/g, '') : '';
  return {
    preview, on: HIT_EFFECTS_ENABLED || preview, travel: (HIT_TRAVEL_FX_ENABLED || preview) && q?.get?.('fxtravel') !== '0',
    base: FX_DIR + (preview ? STAGING : ''), force: force || null,
  };
}
export const fxFolder = (el) => ELEMENT_FX[el] || 'light';
/** path without extension: <base><el>/<anim>/<el>_<anim>_battle_2x (+ '.gif' / '.json') */
export const fxStem = (el, anim = 'impact', base = FX_DIR) => { const e = fxFolder(el); return `${base}${e}/${anim}/${e}_${anim}_battle_2x`; };
export const isRanged = ({ category, el } = {}) => (category ? category === 'Special' : RANGED_EL.has(el));

const okMeta = (m, anim) => m && m.frame_w > 0 && m.frame_h > 0 && m.total_ms > 0 && m.anchor && (anim === 'impact'
  ? Number.isFinite(m.anchor.x) && Number.isFinite(m.anchor.y)
  : Array.isArray(m.anchor.start) && Array.isArray(m.anchor.end));
const cache = new Map(); // stem -> Promise<{ meta, blob } | null>
const withTimeout = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(() => r(null), ms))]);

/** JSON + GIF for one effect, or null when either is missing / unusable (never throws) */
export function loadFx(el, anim, base) {
  if (typeof fetch !== 'function') return Promise.resolve(null);
  const stem = fxStem(el, anim, base);
  if (!cache.has(stem)) cache.set(stem, (async () => {
    try {
      const jr = await fetch(`${stem}.json`); if (!jr.ok) return null;
      const meta = await jr.json(); if (!okMeta(meta, anim)) return null;
      const gr = await fetch(`${stem}.gif`); if (!gr.ok) return null;
      const blob = await gr.blob(); if (!blob.size || (blob.type && !/gif/.test(blob.type))) return null;
      return { meta, blob, stem, anim };
    } catch { return null; }
  })());
  return withTimeout(cache.get(stem), 2500);
}

// centre of the opaque pixels of a sprite, as fractions of its box (cached per src); box centre if it can't be read
const bodyCache = new Map();
function bodyOf(img) {
  if (bodyCache.has(img.src)) return bodyCache.get(img.src);
  let b = { cx: 0.5, cy: 0.5, x0: 0.25, y0: 0.25, x1: 0.75, y1: 0.75 };
  try {
    const w = img.naturalWidth, h = img.naturalHeight; if (!w || !h) return b;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h).data; let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 >= 0) b = { cx: (x0 + x1 + 1) / 2 / w, cy: (y0 + y1 + 1) / 2 / h, x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
    bodyCache.set(img.src, b);
  } catch { /* tainted / not decoded: box centre */ }
  return b;
}

/** geometry of a creature sprite inside the effect container, in the container's own (untransformed) px */
export function spriteGeom(img, box) {
  const r = img.getBoundingClientRect(), br = box.getBoundingClientRect();
  const sx = br.width ? box.offsetWidth / br.width : 1, sy = br.height ? box.offsetHeight / br.height : 1;
  const left = (r.left - br.left) * sx, top = (r.top - br.top) * sy, w = r.width * sx, h = r.height * sy;
  const b = bodyOf(img);
  return { left, top, w, h, k: img.naturalWidth ? img.offsetWidth / img.naturalWidth : 1,
    at: (fx, fy) => ({ x: left + fx * w, y: top + fy * h }), body: b, cx: left + b.cx * w, cy: top + b.cy * h };
}

/** decode one play of an effect ahead of time (own blob: URL, so the GIF starts at frame 0 when it is attached). Lets the
 *  impact be ready while the lunge / travel plays, so it appears the moment the projectile lands. null-safe, never throws. */
export async function prepFx(fx) {
  if (!fx) return null;
  if (fx.img) return fx; // already prepared
  const url = URL.createObjectURL(fx.blob);
  const img = document.createElement('img'); img.className = 'b-fx'; img.alt = ''; img.draggable = false;
  img.dataset.fx = `${fx.meta.element || ''}/${fx.anim}`; img.src = url;
  try { if (await withTimeout(img.decode().then(() => true), 800) !== true) throw new Error('decode timeout'); }
  catch { URL.revokeObjectURL(url); return null; }
  return { ...fx, img, url };
}
// attach one (prepared) play; resolves when frame 0 is on screen, with done = removal after total_ms
async function mount(fx, box, css, transform) {
  const p = await prepFx(fx); if (!p) return null;
  const { img, url } = p;
  img.style.cssText = `${css};max-width:none;max-height:none;transform:${transform || 'none'};transform-origin:50% 50%`;
  box.appendChild(img);
  const done = new Promise((r) => setTimeout(() => { img.remove(); URL.revokeObjectURL(url); r(); }, p.meta.total_ms));
  return { img, done, ms: p.meta.total_ms };
}

/** impact on target sprite `tgt`; flip = the target is the player's creature (mirror around the anchor) */
export function showImpact(fx, box, tgt, flip) {
  if (!fx || !box || !tgt) return Promise.resolve(null);
  const m = fx.meta, g = spriteGeom(tgt, box), k = g.k;
  const ax = flip ? m.frame_w - m.anchor.x : m.anchor.x;
  const css = `left:${g.cx - ax * k}px;top:${g.cy - m.anchor.y * k}px;width:${m.frame_w * k}px;height:${m.frame_h * k}px`;
  return mount(fx, box, css, flip ? 'scaleX(-1)' : '');
}

/** travel from attacker `att` (mouth: upper body, toward the target) to target `tgt` centre. The JSON start/end are in
 *  frame px (pilot layout). Uniform scale only (no rotation / stretch of the pixel art): the frame is scaled by the
 *  sprite k, adjusted to the real attacker->target distance within 0.6x-1.6x, and placed so `end` lands on the target. */
export function showTravel(fx, box, att, tgt) {
  if (!fx || !box || !att || !tgt) return Promise.resolve(null);
  const m = fx.meta, A = spriteGeom(att, box), T = spriteGeom(tgt, box), [sx, sy] = m.anchor.start, [ex, ey] = m.anchor.end;
  const toward = T.cx >= A.cx ? 1 : -1, b = A.body;
  const mouth = A.at(b.cx + toward * (b.x1 - b.x0) * 0.25, b.y0 + (b.y1 - b.y0) * 0.3);
  const dFrame = Math.hypot(ex - sx, ey - sy) || 1, dScreen = Math.hypot(T.cx - mouth.x, T.cy - mouth.y);
  const k = A.k, s = Math.max(0.6 * k, Math.min(1.6 * k, dScreen / dFrame));
  // the art travels in the pilot direction; mirror it if this layout has the target on the other side
  const flip = Math.sign(ex - sx || 1) !== Math.sign(T.cx - mouth.x || 1);
  const exs = flip ? m.frame_w - ex : ex;
  const css = `left:${T.cx - exs * s}px;top:${T.cy - ey * s}px;width:${m.frame_w * s}px;height:${m.frame_h * s}px`;
  return mount(fx, box, css, flip ? 'scaleX(-1)' : '');
}
