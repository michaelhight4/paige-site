// Kilumen overworld: night FX v1 (Oct 23, 2026). Gary: "need light from windows and lamps at night", "give it a moonlight
// feel at night", "can add cloud moves too". Three switches (CONFIG.nightFx; dev ?nightfx=0|1, ?moonlight=, ?nightlights=,
// ?clouds=0|1; per-device numbers in src/platform/<id>.json "nightFx"). v0.2.3 (Oct 23, 2026, Gary: "Yes, turn on the glow and
// add crystal glow too"): the alpha build honours CONFIG + profile like dev (URL flags still ignored there, KeyN stays dev-only);
// when all three are off nothing here runs (no fetch, no draw, no grade change).
//  1. moonlight: a coder-side grade VARIANT (like lighting.js litGreens). Outdoor maps at night: every palette colour goes
//     through moonTarget() (cool blue-silver luminance ramp, a little of the colour kept) and is snapped to the nearest
//     kilumen.hex colour, so the moon map is ON the 64-colour palette (tests/nightfx.test.mjs checks it). Off-palette
//     pixels and sprites use a LUT built the same way (16^3, same 64x64 layout as lut_<grade>.png). Emissive-mask
//     pixels keep World Design's lit night grade (lamp heads, club sign stay warm). Moon rim: an opaque tile pixel whose
//     up-left neighbour (towards the moon) is transparent inside the same 64 px cell gets one brighter moon step.
//     Dusk (v1.1): World Design's dusk grade as is (palette-true, time_of_day rules); lights still come on from 17:00.
//     ?duskmoon=1 / profile nightFx.duskMoon opts into WD dusk blended DUSK_MOON_MIX towards the moon, palette-snapped.
//  2. nightLights: lit windows (warm recolour of the window GLASS inside anchor rects; placement from
//     nightfx_anchors.json + the map's own building/lamp tiles, never from colour alone) and soft round warm pools
//     (lamps, lanterns, braziers, crystals, window spill) on a low-res light buffer (profile lightCell native px per
//     cell), Bayer-dithered into LEVELS steps, drawn 'lighter' nearest-neighbour. The buffer is rebuilt only when the
//     map / lit set / level changes; flame lights flicker per frame as small cached stamps (off under reduced motion).
//  3. clouds: living.js cloud shadows get a thin night layer (NIGHT_CLOUD_LEVEL) that dims the moonlight, and are
//     paused (static) under reduced motion. Interiors / caves: nothing (clock.js isIndoor).
import { TILE } from './constants.js?v=v0.2.87-alpha';
import { isIndoor } from './clock.js?v=v0.2.87-alpha';
import { mulberry32, hashStr } from './living.js?v=v0.2.87-alpha';

export const NIGHTFX_KEYS = Object.freeze(['nightLights', 'moonlight', 'clouds']);
export const DUSK_MOON_MIX = 0.3;
export { NIGHT_CLOUD_LEVEL } from './living.js?v=v0.2.87-alpha'; // thin moonlit clouds (3/8 of the day shadow), defined next to the cloud code
export const LEVELS = 6;                // light buffer intensity steps (0 = no light)

// ---------------------------------------------------------------------------------------------------------------------
// switches
/**
 * Resolve the three switches + device numbers. Order: CONFIG.nightFx[key] (dev defaults) -> profile.nightFx.<key> === false turns one off on that device ->
 * ?nightfx=0|1 sets all three -> ?moonlight= / ?nightlights= / ?clouds= set one (last word). Alpha build: CONFIG + profile
 * only (URL ignored, alpha strips flags anyway).
 * @param {{config?: object, profile?: object, query?: URLSearchParams|string, alpha?: boolean}} o
 */
export function resolveNightFx({ config = {}, profile = {}, query = '', alpha = false } = {}) {
  const q = typeof query === 'string' ? new URLSearchParams(query) : query || new URLSearchParams();
  const p = profile || {};
  const out = { alpha: !!alpha, lightCell: p.lightCell ?? 4, flicker: p.flicker !== false, windowsGoDark: p.windowsGoDark ?? 0.4, duskMoon: p.duskMoon === true, warmPass: p.warmPass !== false };
  for (const k of NIGHTFX_KEYS) out[k] = !!config[k] && p[k] !== false;
  if (alpha) return out;
  const b = (k) => (q.has(k) ? q.get(k) !== '0' : undefined);
  const all = b('nightfx');
  if (all != null) for (const k of NIGHTFX_KEYS) out[k] = all;
  for (const [k, qk] of [['moonlight', 'moonlight'], ['nightLights', 'nightlights'], ['clouds', 'clouds']]) { const v = b(qk); if (v != null) out[k] = v; }
  if (q.has('lightcell') && +q.get('lightcell') >= 1) out.lightCell = Math.round(+q.get('lightcell'));
  if (q.has('flicker')) out.flicker = q.get('flicker') !== '0';
  if (q.has('warmpass')) out.warmPass = q.get('warmpass') !== '0'; // v1.1: false = additive pools only (cheaper phone setting)
  if (q.has('duskmoon')) out.duskMoon = q.get('duskmoon') !== '0'; // v1.1: dusk keeps WD's dusk grade unless ?duskmoon=1
  return out;
}
export const anyOn = (s) => !!s && NIGHTFX_KEYS.some((k) => s[k]);

// ---------------------------------------------------------------------------------------------------------------------
// moonlight colour (pure)
const hexInt = (h) => parseInt(String(h).replace('#', ''), 16);
const rgbOf = (n) => [n >> 16, (n >> 8) & 255, n & 255];
const intOf = ([r, g, b]) => (r << 16) | (g << 8) | b;
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const luma = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// moonlight ramp (luminance in -> colour): deep indigo shadows, blue mids, silver-cyan highlights
const RAMP = [[0, [22, 16, 40]], [0.22, [36, 40, 82]], [0.42, [44, 72, 140]], [0.62, [76, 112, 180]], [0.8, [140, 164, 200]], [1, [206, 228, 244]]];
function ramp(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) {
    const [t0, a] = RAMP[i - 1], [t1, b] = RAMP[i], f = (t - t0) / (t1 - t0);
    return a.map((v, j) => v + (b[j] - v) * f);
  }
  return RAMP[RAMP.length - 1][1];
}
export const MOON = Object.freeze({
  tiles: { lift: 0.06, gain: 0.82, gamma: 1.05, chroma: 0.12 }, // low chroma: snapping keeps grass/stone coherent (0.3 left tan cobbles + green patches)
  sprites: { lift: 0.1, gain: 0.8, gamma: 1, chroma: 0.45 }, // characters keep more of their colour (readable faces / outfits)
});
/** Continuous moonlit colour for a day colour [r,g,b] (before palette snapping). */
export function moonTarget(rgb, o = MOON.tiles) {
  const L = luma(rgb), t = o.lift + o.gain * Math.pow(L, o.gamma), base = ramp(t), grey = L * 255;
  return base.map((v, i) => clamp(v + (rgb[i] - grey) * o.chroma));
}
/** Nearest palette colour (weighted RGB, redmean). pal = int[] */
export function nearestPal(rgb, pal) {
  let best = pal[0], bd = Infinity;
  for (const c of pal) {
    const r = c >> 16, g = (c >> 8) & 255, b = c & 255, rm = (rgb[0] + r) / 2;
    const dr = rgb[0] - r, dg = rgb[1] - g, db = rgb[2] - b;
    const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
export const parsePalette = (text) => String(text).split(/\s+/).map((s) => s.trim().replace('#', '')).filter((s) => /^[0-9a-f]{6}$/i.test(s)).map(hexInt);
/** Palette colour -> moon colour (both on the palette). */
export function buildMoonMap(pal, o = MOON.tiles) {
  const m = new Map();
  for (const c of pal) m.set(c, nearestPal(moonTarget(rgbOf(c), o), pal));
  return m;
}
/** One brighter moon step for the rim: the nearest palette colour to the colour lifted halfway to silver, never darker. */
export function buildRimMap(moonMap, pal) {
  const out = new Map(), silver = [204, 198, 194];
  for (const v of new Set(moonMap.values())) {
    const c = rgbOf(v), t = c.map((x, i) => x + (silver[i] - x) * 0.45);
    let r = nearestPal(t, pal);
    if (luma(rgbOf(r)) <= luma(c)) r = v;
    out.set(v, r);
  }
  return out;
}
/** 16^3 LUT (64x64 RGBA, blue slice k at tile (k%4, k//4), step 17) whose every entry is f(colour). */
export function buildLut(f) {
  const a = new Uint8ClampedArray(64 * 64 * 4);
  for (let b4 = 0; b4 < 16; b4++) for (let g4 = 0; g4 < 16; g4++) for (let r4 = 0; r4 < 16; r4++) {
    const o = f([r4 * 17, g4 * 17, b4 * 17]), px = (b4 % 4) * 16 + r4, py = Math.floor(b4 / 4) * 16 + g4, i = (py * 64 + px) * 4;
    a[i] = o >> 16; a[i + 1] = (o >> 8) & 255; a[i + 2] = o & 255; a[i + 3] = 255;
  }
  return a;
}
function lutAt(lut, [r, g, b]) {
  const r4 = Math.round(r / 17), g4 = Math.round(g / 17), b4 = Math.round(b / 17);
  const i = ((Math.floor(b4 / 4) * 16 + g4) * 64 + (b4 % 4) * 16 + r4) * 4;
  return (lut[i] << 16) | (lut[i + 1] << 8) | lut[i + 2];
}
const mix = (a, b, t) => intOf(rgbOf(a).map((v, i) => Math.round(v + (rgbOf(b)[i] - v) * t)));

const moonVariants = new WeakMap(); // base grade -> {night|dusk variant}
/**
 * Moonlit copy of a prepared grade (palette.js prepareGrade). kind 'night': map/LUTs = moon (palette-snapped), litMap /
 * litLut / shadows = World Design's. kind 'dusk': WD dusk blended DUSK_MOON_MIX towards the moon. The copy has its own
 * image cache and a `moon` block the renderer uses for the rim.
 */
export function moonGrade(base, pal, kind = 'night') {
  if (!base || !pal?.length) return base;
  let per = moonVariants.get(base);
  if (!per) moonVariants.set(base, (per = {}));
  if (per[kind]) return per[kind];
  const tileMap = buildMoonMap(pal, MOON.tiles), sprMap = buildMoonMap(pal, MOON.sprites);
  const tileF = (c) => nearestPal(moonTarget(c, MOON.tiles), pal), sprF = (c) => nearestPal(moonTarget(c, MOON.sprites), pal);
  let map, lut, spriteLut;
  if (kind === 'night') {
    map = tileMap; lut = buildLut(tileF); spriteLut = buildLut(sprF);
  } else {
    const t = DUSK_MOON_MIX;
    // v1.1 (Oct 23, 2026): the dusk blend is snapped back onto the 64-colour palette (GAME_QUALITY_CHECKLIST palette lock;
    // grades.json: swapped images, never a free per-pixel blend). The mix only picks WHICH palette colour.
    const snap = (n) => nearestPal(rgbOf(n), pal);
    map = new Map(); for (const c of pal) map.set(c, snap(mix(base.map.get(c) ?? c, tileMap.get(c), t)));
    lut = buildLut((c) => snap(mix(base.lut ? lutAt(base.lut, c) : intOf(c), tileF(c), t)));
    spriteLut = buildLut((c) => snap(mix(base.spriteLut ? lutAt(base.spriteLut, c) : base.lut ? lutAt(base.lut, c) : intOf(c), sprF(c), t)));
  }
  const g = {
    ...base, name: `${base.name}+moon${kind === 'dusk' ? '_dusk' : ''}`, identity: false, map, lut, spriteLut,
    litMap: base.litMap, litLut: base.litLut || base.lut, cache: new WeakMap(),
    moon: { kind, rim: kind === 'night' ? buildRimMap(tileMap, pal) : null },
  };
  per[kind] = g;
  return g;
}

// ---------------------------------------------------------------------------------------------------------------------
// light schedule (pure; minutes of the day)
const nightMin = (min) => { const m = ((min % 1440) + 1440) % 1440; return m < 720 ? m + 1440 : m; }; // 00:00 -> 1440
/** Seeded on/off minutes for one window: on between 17:00 and 19:30; `goDark` of them go dark 23:00-02:00, the rest at 06:00. */
export function windowSchedule(key, goDark = 0.4) {
  const r = mulberry32(hashStr('win|' + key));
  const on = 1020 + Math.floor(r() * 150), dark = r() < goDark;
  return { on, off: dark ? 1380 + Math.floor(r() * 180) : 1800 };
}
export const windowLit = (s, min) => { const m = nightMin(min); return m >= s.on && m < s.off; };
/** Lamp strength 0..1 (lamps light at 17:30, full by 18:30, off at 06:00). */
export function lampLevel(min) {
  const m = nightMin(min);
  if (m < 1050 || m >= 1800) return 0;
  if (m < 1110) return 0.5 + 0.5 * Math.floor(((m - 1050) / 60) * 4) / 4;
  if (m >= 1740) return 0.5;
  return 1;
}
/** Flame flicker multiplier in 1/8 steps (~8 Hz changes), 1 when reduced motion / off. */
export function flicker(seed, tick, on = true) {
  if (!on) return 1;
  const k = Math.floor(tick / 7), r = mulberry32((seed ^ Math.imul(k, 0x9e3779b1)) >>> 0)(), r2 = mulberry32((seed ^ Math.imul(k >> 2, 0x85ebca6b)) >>> 0)();
  return Math.round((0.72 + 0.16 * r + 0.12 * r2) * 8) / 8;
}
/** Crystal glow pulse multiplier: slow sine (~3.3 s at 60 fps) 0.76..1 in 1/16 steps (few cached stamps), 1 when reduced motion / off. */
export function glowPulse(seed, tick, on = true) {
  if (!on) return 1;
  return Math.round((0.88 + 0.12 * Math.sin(2 * Math.PI * (tick / 200 + (seed % 997) / 997))) * 16) / 16;
}

// ---------------------------------------------------------------------------------------------------------------------
// anchors (pure): map tiles + nightfx_anchors.json -> windows + lights in native world px
/**
 * @param {{width:number,height:number}} map
 * @param {(layer:string,x:number,y:number)=>string|null} nameAt tile name at a cell
 * @param {object} A nightfx_anchors.json
 */
export function findAnchors(map, nameAt, A) {
  const windows = [], lights = [], seen = new Set();
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) for (const layer of ['decoration', 'overlay']) {
    const n = nameAt(layer, x, y);
    if (!n) continue;
    const b = /^(\w+?)_0_0$/.exec(n), bd = b && A.buildings?.[b[1]];
    if (bd && !seen.has(n + x + ',' + y)) {
      seen.add(n + x + ',' + y);
      const ox = x * TILE, oy = y * TILE;
      (bd.windows || []).forEach(([wx, wy, ww, wh], i) => windows.push({ bldg: b[1], i, key: `${b[1]}@${x},${y}#${i}`, x: ox + wx, y: oy + wy, w: ww, h: wh, cx: x, cy: y }));
      for (const l of bd.lights || []) lights.push(light(A, l, ox + l.x, oy + l.y, `${b[1]}@${x},${y}:${l.x},${l.y}`));
    }
    const td = A.tiles?.[n];
    if (td) for (const l of td) lights.push(light(A, l, x * TILE + l.x, y * TILE + l.y, `${n}@${x},${y}:${l.x},${l.y}`));
  }
  return { windows, lights };
}
function light(A, l, x, y, key) {
  const k = A.kinds?.[l.kind] || {};
  return { key, kind: l.kind, x, y, r: l.r ?? k.r ?? 40, colour: l.colour ?? k.colour ?? 'e29d40', strength: l.strength ?? k.strength ?? 1, flame: !!(l.flame ?? k.flame), pulse: !!(l.pulse ?? k.pulse), alwaysOn: !!(l.alwaysOn ?? k.alwaysOn) };
}

// 4x4 Bayer matrix (0..15)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
/** Pool falloff 0..1 at distance d of radius r: soft round (smoothstep). */
export const pool = (d, r) => { if (d >= r) return 0; const t = 1 - d / r; return t * t * (3 - 2 * t); };
/** Quantise an intensity to 0..LEVELS with an ordered dither at cell (x, y). */
export const ditherLevel = (v, x, y) => { const s = Math.max(0, Math.min(1, v)) * LEVELS; const f = Math.floor(s); return Math.min(LEVELS, f + ((s - f) * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5 ? 1 : 0)); };

// ---------------------------------------------------------------------------------------------------------------------
// runtime (browser)
const WARM_GLASS_DEFAULT = { '1e4078': '9f4013', '30488c': 'e29d40', '2c64a8': 'eea23c', '4a70ba': 'fcd668', '7ac2e8': 'f8eabe' };

export class NightFx {
  /** @param {object} scene Overworld @param {object} sw resolveNightFx() result */
  constructor(scene, sw) {
    this.scene = scene; this.sw = sw || {}; this.A = null; this.pal = null;
    this.map = null; this.outdoor = false; this.windows = []; this.lights = []; this._buf = null; this._stamps = new Map();
    this._winImg = new Map(); this._rim = new WeakMap(); this.stats = { bufferBuilds: 0, lastBuildMs: 0 };
  }
  get on() { return anyOn(this.sw); }
  get reducedMotion() { return this.scene.life?.reducedMotion ?? false; }

  async load(config) {
    if (!this.on) return;
    const [A, pal] = await Promise.all([
      fetch(config.nightFxAnchors).then((r) => r.json()).catch((e) => { console.warn('nightfx anchors off:', e.message); return null; }),
      fetch(config.paletteHex).then((r) => r.text()).then(parsePalette).catch((e) => { console.warn('nightfx palette off:', e.message); return null; }),
    ]);
    this.A = A; this.pal = pal?.length ? pal : null;
    this.glass = new Map(Object.entries(A?.glass || WARM_GLASS_DEFAULT).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [hexInt(k), hexInt(v)]));
  }

  enter(map) {
    this.map = map; this.outdoor = !isIndoor(map.name); this._buf = null; this.windows = []; this.lights = [];
    if (!this.on || !this.outdoor || !this.A) return;
    const byId = map._byId, nameAt = (L, x, y) => byId?.get(map.tile(L, x, y))?.name || null;
    const a = findAnchors(map, nameAt, this.A);
    const goDark = this.sw.windowsGoDark;
    this.windows = a.windows.map((w) => ({ ...w, sched: windowSchedule(map.name + '|' + w.key, goDark) }));
    this.lights = a.lights.map((l) => ({ ...l, seed: hashStr(l.key) }));
    // window spill: a small warm pool on the wall around each window (follows that window's schedule)
    const sp = this.A.kinds?.window_spill;
    if (sp) for (const w of this.windows) this.lights.push({ key: 'spill:' + w.key, kind: 'window_spill', x: w.x + w.w / 2, y: w.y + w.h / 2 + (sp.dy || 0), r: sp.r, colour: sp.colour, strength: sp.strength, flame: false, win: w, seed: 0 });
  }

  /** Dev key N: all switches off / back to what they were (never in alpha). Loads the data on first switch-on. */
  toggle() {
    if (this.sw.alpha) return false;
    if (this.on) { this._saved = Object.fromEntries(NIGHTFX_KEYS.map((k) => [k, this.sw[k]])); for (const k of NIGHTFX_KEYS) this.sw[k] = false; }
    else { const back = anyOn(this._saved) ? this._saved : null; for (const k of NIGHTFX_KEYS) this.sw[k] = back ? back[k] : true; }
    if (this.scene.life) this.scene.life.nightClouds = !!this.sw.clouds;
    const reenter = () => { if (this.scene.map) this.enter(this.scene.map); };
    if (this.on && !this.A && this.scene.config) this.load(this.scene.config).then(reenter); else reenter();
    return this.on;
  }

  /** Grade for the map (overworld.mapGrade): the moon variant at night / blended at dusk, outdoor only. */
  grade(g, gradeName) {
    if (!this.sw.moonlight || !this.outdoor || !this.pal || !g) return g;
    if (gradeName === 'night') return moonGrade(g, this.pal, 'night');
    if (gradeName === 'dusk' && this.sw.duskMoon) return moonGrade(g, this.pal, 'dusk'); // v1.1: opt-in (snapped dusk blend greys the warm cobbles)
    return g;
  }

  /** gradeImage wrapper for the view: adds the moon rim to graded tile sheets (cached per graded canvas). */
  wrapGradeImage(gradeImage) {
    return (img, grade, mode = 'map', mask = null) => {
      const c = gradeImage(img, grade, mode, mask);
      if (mode !== 'map' || !grade?.moon?.rim || c === img) return c;
      let r = this._rim.get(c);
      if (!r) { r = rimCanvas(c, grade.moon.rim, mask); this._rim.set(c, r); }
      return r;
    };
  }

  minOfDay() { return this.scene.clock.min % 1440; }
  litWindows(min = this.minOfDay()) { return this.windows.filter((w) => windowLit(w.sched, min)); }

  /** Draw the lit window glass (after the static depth pass, under characters). */
  drawWindows(ctx, v) {
    if (!this.sw.nightLights || !this.outdoor || !this.windows.length) return;
    const min = this.minOfDay(), z = v.zoom, ts1 = v.tileset1x || v.tileset;
    for (const w of this.windows) {
      if (!windowLit(w.sched, min)) continue;
      const dx = (w.x - v.cam.x) * z, dy = (w.y - v.cam.y) * z;
      if (dx > ctx.canvas.width || dy > ctx.canvas.height || dx + w.w * z < 0 || dy + w.h * z < 0) continue;
      const img = this._windowImg(w, ts1);
      if (img) ctx.drawImage(img, 0, 0, w.w, w.h, dx, dy, w.w * z, w.h * z);
    }
  }

  _windowImg(w, ts) {
    const k = w.key;
    if (this._winImg.has(k)) return this._winImg.get(k);
    const c = document.createElement('canvas'); c.width = w.w; c.height = w.h;
    const g = c.getContext('2d', { willReadFrequently: true }); g.imageSmoothingEnabled = false;
    const bx = w.x - w.cx * TILE, by = w.y - w.cy * TILE; // rect inside the building, native px
    for (let ty = Math.floor(by / TILE); ty * TILE < by + w.h; ty++) for (let tx = Math.floor(bx / TILE); tx * TILE < bx + w.w; tx++) {
      // read the art from the map cells themselves (building tiles can be shared/renamed; the map is the truth)
      for (const L of ['decoration', 'overlay']) {
        const id = this.map?.layers?.[L] ? this.map.tile(L, w.cx + tx, w.cy + ty) : 0, t = id ? ts.byId.get(id) : null;
        const img = t && ts.images.get(t.sheet);
        if (!img) continue;
        const S = ts.size, sx = (t.index % ts.columns) * S, sy = Math.floor(t.index / ts.columns) * S;
        g.drawImage(img, sx, sy, S, S, tx * TILE - bx, ty * TILE - by, TILE, TILE);
      }
    }
    const d = g.getImageData(0, 0, w.w, w.h), a = d.data;
    let n = 0;
    for (let i = 0; i < a.length; i += 4) {
      const o = a[i + 3] ? this.glass.get((a[i] << 16) | (a[i + 1] << 8) | a[i + 2]) : undefined;
      if (o === undefined) { a[i + 3] = 0; continue; }
      a[i] = o >> 16; a[i + 1] = (o >> 8) & 255; a[i + 2] = o & 255; a[i + 3] = 255; n++;
    }
    g.putImageData(d, 0, 0);
    const out = n ? c : null;
    this._winImg.set(k, out);
    return out;
  }

  /** Static light key: map + lamp level + lit-window set + cell. Changes a few times per game night. */
  _bufKey(min) {
    const lv = lampLevel(min);
    let s = `${this.map.name}|${lv}|${this.sw.lightCell}|`;
    for (const w of this.windows) s += windowLit(w.sched, min) ? '1' : '0';
    return s;
  }

  _buildBuffer(min) {
    const t0 = performance.now(), cell = this.sw.lightCell, m = this.map, W = Math.ceil((m.width * TILE) / cell), H = Math.ceil((m.height * TILE) / cell);
    const lv = lampLevel(min), acc = new Float32Array(W * H * 3);
    for (const l of this.lights) {
      if ((l.flame || l.pulse) && this.sw.flicker) continue; // drawn per frame as a stamp
      const s = l.win ? (windowLit(l.win.sched, min) ? 1 : 0) : l.alwaysOn ? 1 : lv;
      if (!s) continue;
      addPool(acc, W, H, cell, l, s * l.strength);
    }
    const { c, mul, runs } = lightCanvases(acc, W, H, 0, 0);
    this.stats.bufferBuilds++; this.stats.lastBuildMs = +(performance.now() - t0).toFixed(2); this.stats.litRuns = runs.length;
    return { key: this._bufKey(min), c, mul, runs, W, H, cell };
  }

  /** Pools: cached static buffer + flickering flame stamps, additive, nearest. After clouds, before fog. */
  drawLights(ctx, v) {
    if (!this.sw.nightLights || !this.outdoor || !this.lights.length) return;
    const min = this.minOfDay(), lv = lampLevel(min);
    const anyWin = this.windows.some((w) => windowLit(w.sched, min));
    if (!lv && !anyWin && !this.lights.some((l) => l.alwaysOn)) return;
    const key = this._bufKey(min);
    if (!this._buf || this._buf.key !== key) this._buf = this._buildBuffer(min);
    const b = this._buf, z = v.zoom, cell = b.cell, cam = v.cam, cw = ctx.canvas.width, ch = ctx.canvas.height;
    const sx0 = Math.max(0, Math.floor(cam.x / cell)), sy0 = Math.max(0, Math.floor(cam.y / cell));
    const sx1 = Math.min(b.W, Math.ceil((cam.x + cw / z) / cell)), sy1 = Math.min(b.H, Math.ceil((cam.y + ch / z) / cell));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = false;
    if (sx1 > sx0 && sy1 > sy0) {
      // v1.1: only the lit chunk runs inside the view (same pixels as one full-view blit, far less fill on phones)
      const C = LIGHT_CHUNK, rects = [];
      for (const r of b.runs) {
        const ya = Math.max(sy0, r.y * C), yb = Math.min(sy1, (r.y + 1) * C), xa = Math.max(sx0, r.x0 * C), xb = Math.min(sx1, r.x1 * C);
        if (xb > xa && yb > ya) rects.push([xa, ya, xb - xa, yb - ya, (xa * cell - cam.x) * z, (ya * cell - cam.y) * z, (xb - xa) * cell * z, (yb - ya) * cell * z]);
      }
      ctx.globalCompositeOperation = 'multiply'; if (this.sw.warmPass) for (const a of rects) ctx.drawImage(b.mul, ...a); // warm the moonlit blue under the pool first
      ctx.globalCompositeOperation = 'lighter'; for (const a of rects) ctx.drawImage(b.c, ...a);   // then add the light
    }
    if (this.sw.flicker && lv) {
      const flick = !this.reducedMotion, tick = this.scene.tick;
      for (const l of this.lights) {
        if (!l.flame && !l.pulse) continue; // flames flicker, crystals pulse (both static under reduced motion)
        const R = l.r, x0 = l.x - R, y0 = l.y - R;
        if ((x0 + 2 * R - cam.x) * z < 0 || (y0 + 2 * R - cam.y) * z < 0 || (x0 - cam.x) * z > cw || (y0 - cam.y) * z > ch) continue;
        const f = (l.pulse ? glowPulse(l.seed, tick, flick) : flicker(l.seed, tick, flick)) * lv * l.strength;
        const st = this._stamp(l, f);
        // stamp cells are aligned to the world cell grid, so flames dither with the same pattern as the buffer
        const dx = (st.ox - cam.x) * z, dy = (st.oy - cam.y) * z, dw = st.c.width * cell * z, dh = st.c.height * cell * z;
        if (this.sw.warmPass) { ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(st.mul, dx, dy, dw, dh); }
        ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(st.c, dx, dy, dw, dh);
      }
    }
    ctx.restore();
  }

  _stamp(l, s) {
    const cell = this.sw.lightCell, k = `${l.key}|${s.toFixed(3)}|${cell}`;
    let st = this._stamps.get(k);
    if (st) return st;
    const cx0 = Math.floor((l.x - l.r) / cell), cy0 = Math.floor((l.y - l.r) / cell), n = Math.ceil((2 * l.r) / cell) + 2;
    const acc = new Float32Array(n * n * 3);
    addPool(acc, n, n, cell, { ...l, x: l.x - cx0 * cell, y: l.y - cy0 * cell }, s);
    const { c, mul } = lightCanvases(acc, n, n, cx0, cy0);
    st = { c, mul, ox: cx0 * cell, oy: cy0 * cell };
    if (this._stamps.size > 400) this._stamps.clear();
    this._stamps.set(k, st);
    return st;
  }

  state() {
    const min = this.scene.clock ? this.minOfDay() : 0;
    return {
      switches: { nightLights: !!this.sw.nightLights, moonlight: !!this.sw.moonlight, clouds: !!this.sw.clouds },
      alpha: !!this.sw.alpha, lightCell: this.sw.lightCell, outdoor: this.outdoor, loaded: !!this.A,
      windows: this.windows.length, litWindows: this.windows.filter((w) => windowLit(w.sched, min)).length,
      lights: this.lights.filter((l) => l.kind !== 'window_spill').length, flames: this.lights.filter((l) => l.flame).length,
      lampLevel: lampLevel(min), moonGrade: this.scene.mapGrade?.()?.name || null, ...this.stats,
    };
  }
}

/** Add one warm pool to an RGB float accumulator of W x H cells (each `cell` native px). Light colour scaled to 0..255. */
/**
 * Accumulator -> two W x H canvases on the same dithered levels: `c` = additive light ('lighter'), `mul` = a warm
 * multiply (white outside the pool) that pulls blue out first so a pool reads warm gold, not white, on moonlit blue.
 * (ox, oy) = world cell of [0,0] so every pool/stamp shares one dither grid.
 */
export const WARM_MUL = 0.55; // how much blue a full pool removes (green 1/4 of that)
function lightCanvases(acc, W, H, ox, oy) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const mul = document.createElement('canvas'); mul.width = W; mul.height = H;
  const g = c.getContext('2d'), d = g.createImageData(W, H), a = d.data;
  const gm = mul.getContext('2d'), dm = gm.createImageData(W, H), m = dm.data;
  m.fill(255);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
    const r = acc[i * 3], gg = acc[i * 3 + 1], b = acc[i * 3 + 2], mx = Math.max(r, gg, b);
    if (mx <= 0) continue;
    const L = ditherLevel(mx / 255, x + ox, y + oy);
    if (!L) continue;
    const f = L / LEVELS, k = (f * 255) / mx;
    a[i * 4] = r * k; a[i * 4 + 1] = gg * k; a[i * 4 + 2] = b * k; a[i * 4 + 3] = 255;
    const w = Math.min(1, f * 2.5) * WARM_MUL * Math.max(0, (r - b) / r); // warm lights only (violet crystals keep their blue); saturates early
    m[i * 4 + 1] = 255 * (1 - w * 0.25); m[i * 4 + 2] = 255 * (1 - w);
  }
  g.putImageData(d, 0, 0); gm.putImageData(dm, 0, 0);
  return { c, mul, runs: litRuns(a, W, H) };
}
/**
 * v1.1 perf: horizontal runs of lit LIGHT_CHUNK x LIGHT_CHUNK cell blocks [{x0, x1, y}] (chunk units, x1 exclusive), so
 * drawLights composites only the blocks that hold light instead of the whole viewport twice (phone fill-rate).
 */
export const LIGHT_CHUNK = 8;
export function litRuns(a, W, H, C = LIGHT_CHUNK) {
  const cw = Math.ceil(W / C), chh = Math.ceil(H / C), lit = new Uint8Array(cw * chh), runs = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3]) lit[((y / C) | 0) * cw + ((x / C) | 0)] = 1;
  for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) {
    if (!lit[y * cw + x]) continue;
    let e = x + 1; while (e < cw && lit[y * cw + e]) e++;
    runs.push({ x0: x, x1: e, y }); x = e;
  }
  return runs;
}
const POOL_GAIN = 0.55; // additive pool brightness at strength 1 (of the light colour)
function addPool(acc, W, H, cell, l, s) {
  const [cr, cg, cb] = rgbOf(hexInt(l.colour)), R = l.r;
  const x0 = Math.max(0, Math.floor((l.x - R) / cell)), x1 = Math.min(W - 1, Math.floor((l.x + R) / cell));
  const y0 = Math.max(0, Math.floor((l.y - R) / cell)), y1 = Math.min(H - 1, Math.floor((l.y + R) / cell));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = Math.hypot((x + 0.5) * cell - l.x, (y + 0.5) * cell - l.y), p = pool(d, R) * s;
    if (p <= 0) continue;
    const i = (y * W + x) * 3;
    acc[i] = Math.min(255, acc[i] + cr * p * POOL_GAIN); acc[i + 1] = Math.min(255, acc[i + 1] + cg * p * POOL_GAIN); acc[i + 2] = Math.min(255, acc[i + 2] + cb * p * POOL_GAIN);
  }
}

/** Moon rim on a graded 1x tile sheet: opaque pixel with a transparent up-left neighbour (same 64 px cell) -> rim colour. */
function rimCanvas(src, rim, mask) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(src, 0, 0);
  const W = c.width, H = c.height, d = g.getImageData(0, 0, W, H), a = d.data, s = new Uint8ClampedArray(a);
  let md = null;
  if (mask) { const mc = document.createElement('canvas'); mc.width = mask.naturalWidth || mask.width; mc.height = mask.naturalHeight || mask.height; const mg = mc.getContext('2d', { willReadFrequently: true }); mg.drawImage(mask, 0, 0); md = { w: mc.width, a: mg.getImageData(0, 0, mc.width, mc.height).data }; }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (s[i + 3] < 255) continue;
    const lx = x % 64, ly = y % 64;
    const up = ly > 0 ? s[i - W * 4 + 3] : 255, left = lx > 0 ? s[i - 4 + 3] : 255;
    if (up >= 255 && left >= 255) continue;
    if (md && md.a[(y * md.w + x) * 4]) continue; // emissive pixels keep WD's lit colour
    const o = rim.get((s[i] << 16) | (s[i + 1] << 8) | s[i + 2]);
    if (o === undefined) continue;
    a[i] = o >> 16; a[i + 1] = (o >> 8) & 255; a[i + 2] = o & 255;
  }
  g.putImageData(d, 0, 0);
  return c;
}
