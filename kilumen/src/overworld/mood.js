// Kilumen overworld: cinematic MOOD layers v1 (Oct 23, 2026; Gary approved the easy set at 11:31 AM CT, after the
// Sword x Staff TikTok). Four subtle layers, all data-driven from src/overworld/mood.json (per map, per area):
//   1. tint      a flat colour wash (source-over), scaled by the scene grade: night = 0, so the time-of-day grade/LUT
//                stays the only night look (checklist: one grade, never hand-tint for night).
//   2. vignette  darker screen edges: a native-res radial gradient. Tint + vignette are baked into ONE cached native-res
//                layer and blitted once per frame (no full-screen blend ops: those cost ~4 ms/frame in software raster).
//   3. particles dust motes by day, fireflies at dusk/night, leaves in woods, snow/embers only where the map fits.
//                Deterministic: seeded from map id + day, positions are a pure function of scene.tick (no per-frame
//                simulation, steppable for previews), world-anchored and wrapped round the camera. Off under reduced
//                motion and in rain. Firefly glow is emissive (never graded); night colours are the night-bright set.
//   4. sun rays  soft diagonal shafts through clear holes in living.js's cloud mask, so they drift WITH the cloud
//                shadows. Only when the map is mostly clouded (coverage >= preset minCoverage), outdoor, day/dawn/dusk;
//                strength = living.js cloudLevel stepped in 1/8 (fades with the clock, 0 at night, never indoors).
// Pixel-crisp: vignette + rays are drawn into a NATIVE-resolution layer (canvas / zoom) and blitted NEAREST at the
// integer zoom, particles are whole native px, so every zoom x zoom block stays one colour
// (tests/life_previews blockCheck). No blur, no getImageData, no per-frame gradient creation.
// NOT approved and never added here: blurred foreground framing, lens flares, fog, camera zooms.
// Draw order (renderer.draw): ... cloud shadows -> night lights -> fog -> MOOD -> living top (birds, firefly glow)
// -> markers -> debug -> fade. HUD/menus/dialogue are DOM, so they are never touched.
// Switches: ?mood=0|1 (URL, not saved), profile `mood` block (pc.json / mobile.json: particle scale + caps, per-layer
// vetoes). Reduced motion (?motion=reduce, prefers-reduced-motion, the UI motion toggle): no particles; tint,
// vignette and rays (which move only with the already-slowed clouds) stay.
import { TILE } from './constants.js?v=v0.2.89-alpha';
import { INDOOR_OR_CAVE } from './clock.js?v=v0.2.89-alpha';
import { WIND, cloudLevel, cloudLevels, periodicFbm, mulberry32, hashStr, CLOUD_MASK, CLOUD_CELL } from './living.js?v=v0.2.89-alpha';
import { reducedMotion as sceneReducedMotion } from './marker.js?v=v0.2.89-alpha';

export const MOOD_KEYS = ['tint', 'vignette', 'particles', 'rays'];
export const PHASES = ['dawn', 'day', 'dusk', 'night'];
export const PARTICLE_KINDS = ['motes', 'dust', 'fireflies', 'leaves', 'snow', 'embers'];
/** Caps (tests/mood.test.mjs checks mood.json against them): keep it subtle. */
export const CAPS = Object.freeze({ tint: 0.2, vignette: 0.45, rays: 0.2 });
/** Night-bright colours (checklist: tiny night particles need these or an INK outline). */
export const NIGHT_BRIGHT = ['fcd668', 'e8ce92', 'ecdec4', 'f8eabe', '603096', '8a4ace', 'b076ec', 'd6acff'];
export const REF_VIEW = 480 * 270; // density is "per 480x270 native px" (pc 1080p at zoom 4)
export const RAY_SUN = Object.freeze({ x: -0.5, y: -1 }); // shaft direction from the lit ground patch up to the sky
const SHADE = [26, 18, 38]; // grades.json shadow colour (1a1226)
const mod = (a, n) => ((a % n) + n) % n;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Profile defaults (a profile `mood` block overrides any of these). */
export const PROFILE_DEFAULTS = Object.freeze({ enabled: true, tint: true, vignette: true, particles: 1, maxParticles: 48, rays: true, maxRays: 5 });

/**
 * Switches: profile block + URL. ?mood=0 turns every layer off, ?mood=1 forces the layers on (profile vetoes still
 * win for single layers). Returns {on, tint, vignette, rays, particles (scale), maxParticles, maxRays}.
 */
export function resolveMood({ profile = {}, query = '' } = {}) {
  const q = typeof query === 'string' ? new URLSearchParams(query) : query;
  const p = { ...PROFILE_DEFAULTS, ...(profile || {}) };
  let on = p.enabled !== false;
  if (q?.has?.('mood')) on = q.get('mood') !== '0';
  return {
    on, tint: on && p.tint !== false, vignette: on && p.vignette !== false, rays: on && p.rays !== false,
    particles: on ? Math.max(0, +p.particles || 0) : 0, maxParticles: Math.max(0, p.maxParticles | 0), maxRays: Math.max(0, p.maxRays | 0),
  };
}

export const hexRgb = (h) => { const n = parseInt(String(h).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${+a.toFixed(4)})`;

function merge(base, over) {
  if (over === undefined) return base;
  if (over === false || over === null || Array.isArray(over) || typeof over !== 'object') return over;
  if (!base || typeof base !== 'object' || Array.isArray(base)) return { ...over };
  const out = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = merge(base[k], v);
  return out;
}

/** Which default family a map falls in: cave (greystone*), indoor (INDOOR_OR_CAVE), else outdoor. */
export function familyFor(mapName) {
  const n = mapName || '';
  if (/^greystone/.test(n)) return 'cave';
  return INDOOR_OR_CAVE.test(n) ? 'indoor' : 'outdoor';
}

/** Resolve the preset for a map (and the player's tile, for `areas`). Pure. */
export function resolvePreset(data, mapName, tile = null) {
  const m = data?.maps?.[mapName] || {};
  const fam = data?.defaults?.[m.extends] ? m.extends : familyFor(mapName);
  let p = merge(data?.defaults?.[fam] || {}, stripMeta(m));
  if (tile && Array.isArray(m.areas)) {
    const a = m.areas.find((r) => Array.isArray(r.rect) && tile.x >= r.rect[0] && tile.y >= r.rect[1] && tile.x < r.rect[0] + r.rect[2] && tile.y < r.rect[1] + r.rect[3]);
    if (a) p = merge(p, stripMeta(a));
    p.area = a?.id || null;
  }
  p.family = fam;
  return p;
}
function stripMeta(o) { const r = {}; for (const [k, v] of Object.entries(o || {})) if (!k.startsWith('_') && k !== 'extends' && k !== 'areas' && k !== 'rect' && k !== 'id') r[k] = v; return r; }

const phaseKey = (g) => { const k = String(g || 'day').split('+')[0]; return PHASES.includes(k) ? k : 'day'; };

/** Tint alpha for a grade name (scene.gradeName: indoors = 'day', Firefly club follows the clock, Mirefen darkness = night). */
export function tintAlpha(preset, gradeName) {
  const t = preset?.tint;
  if (!t || !(t.alpha > 0)) return 0;
  const k = t.phases?.[phaseKey(gradeName)] ?? (phaseKey(gradeName) === 'night' ? 0 : 1);
  return Math.min(CAPS.tint, t.alpha * clamp01(k));
}
export function vignetteAlpha(preset, gradeName) {
  const v = preset?.vignette;
  if (!v || !(v.alpha > 0)) return 0;
  return Math.min(CAPS.vignette, v.alpha * clamp01(v.phases?.[phaseKey(gradeName)] ?? 1));
}

/**
 * Ray strength 0..1: outdoor, not wet, rays preset, coverage >= minCoverage, day-ish. Stepped in 1/8 like the cloud
 * alpha (living.js cloudLevel: 0 before 05:00 and from 20:00, 0.6 at dawn/dusk, 1 by day).
 */
export function rayStrength(preset, { outdoor, wet, coverage, minOfDay, cloudsOn = true }) {
  const r = preset?.rays;
  if (!r || !outdoor || wet || !cloudsOn || !(coverage >= (r.minCoverage ?? 0.4))) return 0;
  return Math.round(cloudLevel(minOfDay) * 8) / 8;
}

/** Particle kinds active now (phase list, reduced motion, rain). */
export function activeParticles(preset, { phase, reduced, wet }) {
  if (reduced || wet) return [];
  return (preset?.particles || []).filter((p) => PARTICLE_KINDS.includes(p.kind) && (!Array.isArray(p.phases) || p.phases.includes(phase)));
}

/** Particle count for a view (native px): density per 480x270, view-area factor capped at 2, profile scale. */
export function particleCount(density, viewW, viewH, scale = 1) {
  return Math.max(0, Math.round((density || 0) * Math.min(2, (viewW * viewH) / REF_VIEW) * scale));
}

/** Kind look + motion (native px per tick). Night kinds use night-bright colours only. */
export const KIND = Object.freeze({
  motes: { colors: ['f8eabe', 'fcf6e8', 'ecdec4'], vx: WIND.x * 0.05, vy: WIND.y * 0.05 - 0.012, amp: 6, size: 1, alpha: [0.45, 0.85] },
  dust: { colors: ['ccc6c2', 'ecdec4'], vx: WIND.x * 0.02, vy: 0.008, amp: 4, size: 1, alpha: [0.25, 0.55] },
  fireflies: { colors: ['fcd668', 'f8eabe', 'e8ce92'], vx: WIND.x * 0.02, vy: -0.01, amp: 10, size: 1, alpha: [0.0, 1], glow: true },
  leaves: { colors: ['78ba48', '52983a', 'a6d460', 'e29d40'], vx: WIND.x * 0.32, vy: 0.22, amp: 10, size: 2, alpha: [1, 1], leaf: true },
  snow: { colors: ['ecdec4', 'f8eabe'], vx: WIND.x * 0.12, vy: 0.28, amp: 5, size: 1, alpha: [0.7, 1] },
  embers: { colors: ['fcd668', 'e8ce92'], vx: WIND.x * 0.06, vy: -0.22, amp: 5, size: 1, alpha: [0.3, 1] },
});

/** Seeded particle set for one kind (pure): u, v in [0,1) of the wrap box, phase, period, colour. */
export function makeParticles(kind, n, seed) {
  const r = mulberry32(seed ^ hashStr(kind)), K = KIND[kind], out = [];
  for (let i = 0; i < n; i++) {
    out.push({ u: r(), v: r(), ph: r() * 6.283, period: 120 + Math.floor(r() * 240), sp: 0.7 + r() * 0.6, c: K.colors[Math.floor(r() * K.colors.length)], blink: 180 + Math.floor(r() * 180), b0: Math.floor(r() * 400) });
  }
  return out;
}

/**
 * World position of a particle at tick t, wrapped into the box round the camera (pure). Box = view + margin on every
 * side, so a particle leaving one side comes back on the other and the set is world-anchored.
 */
export function particleAt(p, kind, t, cam, viewW, viewH, margin = 24) {
  const K = KIND[kind], bw = viewW + margin * 2, bh = viewH + margin * 2;
  const x = p.u * bw + K.vx * p.sp * t + Math.sin(t / p.period + p.ph) * K.amp;
  const y = p.v * bh + K.vy * p.sp * t + Math.cos(t / (p.period * 1.3) + p.ph) * K.amp * 0.6;
  const x0 = cam.x - margin, y0 = cam.y - margin;
  return { x: x0 + mod(x - x0, bw), y: y0 + mod(y - y0, bh) };
}

/** Smooth blink 0..1 (no flash: >= 3 s period, eased; photosensitivity rule). */
export function blink(p, t) {
  const c = ((t + p.b0) % p.blink) / p.blink; // 0..1
  return Math.max(0, Math.sin(c * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5);
}

/**
 * Ray anchors: clear holes in the cloud mask (pure). levels = living.js cloudLevels (N x N cells, 0..3). Coarse
 * blocks of B cells: a block is an anchor if it is clear (cloud share <= clearMax) while its ring (radius R blocks,
 * wrapped) is clouded (share >= ringMin); local best per (2R+1)^2 window. Returns [{x, y, s}] in mask native px.
 */
export function findRayAnchors(levels, N, { B = 16, R = 3, clearMax = 0.12, ringMin = 0.38, cell = CLOUD_CELL } = {}) {
  const NB = Math.floor(N / B), share = new Float32Array(NB * NB);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (levels[y * N + x] >= 2) share[Math.floor(y / B) % NB * NB + Math.floor(x / B) % NB]++;
  for (let i = 0; i < share.length; i++) share[i] /= B * B;
  const ring = new Float32Array(NB * NB);
  for (let by = 0; by < NB; by++) for (let bx = 0; bx < NB; bx++) {
    let s = 0, n = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { if (!dx && !dy) continue; s += share[mod(by + dy, NB) * NB + mod(bx + dx, NB)]; n++; }
    ring[by * NB + bx] = s / n;
  }
  const out = [];
  for (let by = 0; by < NB; by++) for (let bx = 0; bx < NB; bx++) {
    const i = by * NB + bx;
    if (share[i] > clearMax || ring[i] < ringMin) continue;
    let best = true;
    for (let dy = -R; dy <= R && best; dy++) for (let dx = -R; dx <= R; dx++) {
      const j = mod(by + dy, NB) * NB + mod(bx + dx, NB);
      if (j !== i && share[j] <= clearMax && (ring[j] > ring[i] || (ring[j] === ring[i] && j < i))) { best = false; break; }
    }
    if (best) out.push({ x: (bx + 0.5) * B * cell, y: (by + 0.5) * B * cell, s: ring[i] });
  }
  return out;
}

/** Visible anchors in world px for a cloud offset (pure): world w sits at mask (w + o) mod P. */
export function visibleAnchors(anchors, o, view, pad, P = CLOUD_MASK * CLOUD_CELL) {
  const out = [];
  for (const a of anchors) {
    const wx0 = a.x - o.x, wy0 = a.y - o.y;
    for (let kx = Math.floor((view.x - pad - wx0) / P); wx0 + kx * P < view.x + view.w + pad; kx++)
      for (let ky = Math.floor((view.y - pad - wy0) / P); wy0 + ky * P < view.y + view.h + pad; ky++) {
        const x = wx0 + kx * P, y = wy0 + ky * P;
        if (x >= view.x - pad && y >= view.y - pad) out.push({ x, y, s: a.s });
      }
  }
  // stable order: closest to the view centre first (the cap keeps the ones you look at)
  const cx = view.x + view.w / 2, cy = view.y + view.h / 2;
  return out.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
}

export class Mood {
  /**
   * @param {object} scene Overworld (clock, tick, phase, gradeName, life, map)
   * @param {object} opts {data (mood.json), switches (resolveMood), makeCanvas?}
   */
  constructor(scene, opts = {}) {
    this.scene = scene; this.data = opts.data || { defaults: {}, maps: {} };
    this.sw = opts.switches || resolveMood({});
    this.makeCanvas = opts.makeCanvas || ((w, h) => { const c = globalThis.document.createElement('canvas'); c.width = w; c.height = h; return c; });
    this._mapName = null; this._areaKey = null; this.preset = null;
    this._parts = new Map(); this._vig = null; this._ray = null; this._anchors = null; this._anchorCov = -1;
    this.last = { tint: 0, vignette: 0, rays: 0, raysDrawn: 0, particles: 0, ms: 0 };
  }

  get on() { return !!this.sw.on; }
  set(on) { this.sw = { ...this.sw, on: !!on, tint: !!on, vignette: !!on, rays: !!on, particles: on ? (this.sw.particles || 1) : 0 }; return this.sw.on; }

  _update(v) {
    const name = v.map?.name || '', tile = v.player ? { x: v.player.x, y: v.player.y } : null;
    const areas = this.data.maps?.[name]?.areas;
    let areaKey = '';
    if (Array.isArray(areas) && tile) { const a = areas.findIndex((r) => tile.x >= r.rect[0] && tile.y >= r.rect[1] && tile.x < r.rect[0] + r.rect[2] && tile.y < r.rect[1] + r.rect[3]); areaKey = String(a); }
    if (name !== this._mapName || areaKey !== this._areaKey) {
      this._mapName = name; this._areaKey = areaKey;
      this.preset = resolvePreset(this.data, name, tile);
      this._parts.clear();
    }
  }

  _particleSet(kind, n) {
    const day = this.scene.clock?.day || 0, key = `${kind}:${n}:${day}`;
    let s = this._parts.get(kind);
    if (!s || s.key !== key) { s = { key, list: makeParticles(kind, n, hashStr(this._mapName) ^ Math.imul(day + 1, 0x9e3779b1)) }; this._parts.set(kind, s); }
    return s.list;
  }

  /** The renderer hook: after fog, before living top / markers / debug / fade. */
  draw(ctx, v) {
    if (!this.on || !v?.map) { this.last = { tint: 0, vignette: 0, rays: 0, raysDrawn: 0, particles: 0, ms: 0 }; return; }
    const t0 = globalThis.performance?.now?.() ?? 0;
    this._update(v);
    const s = this.scene, P = this.preset, z = v.zoom, cw = ctx.canvas.width, ch = ctx.canvas.height;
    const Wn = Math.ceil(cw / z), Hn = Math.ceil(ch / z), grade = s.gradeName || 'day';
    const outdoor = P.family === 'outdoor', life = s.life || v.life, wet = !!life?.wet;
    const phase = outdoor ? (s.phase || 'day') : 'day';
    const ef = v.outside === 'edge', mw = v.map.width * TILE, mh = v.map.height * TILE;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // 1+2. tint wash + vignette: one cached native layer, one source-over blit
    const ta = this.sw.tint ? tintAlpha(P, grade) : 0, va = this.sw.vignette ? vignetteAlpha(P, grade) : 0;
    if (ta > 0 || va > 0) ctx.drawImage(this._base(Wn, Hn, P, ta, va), 0, 0, Wn, Hn, 0, 0, Wn * z, Hn * z);
    // 3. sun rays: one cached shaft sprite, blitted per visible cloud gap (whole native px)
    let rs = 0, drawn = 0;
    if (this.sw.rays && life) {
      rs = rayStrength(P, { outdoor: outdoor && !!life.outdoor, wet, coverage: life.coverage, minOfDay: s.clock?.min ?? 720, cloudsOn: !!life.settings?.clouds });
      if (rs > 0) drawn = this._drawRays(ctx, v, life, rs, Wn, Hn, ef, mw, mh);
    }
    // 4. particles (whole native px; fireflies last, ungraded emissive)
    let np = 0;
    const kinds = this.sw.particles > 0 ? activeParticles(P, { phase, reduced: sceneReducedMotion(s), wet }) : [];
    if (kinds.length) {
      let budget = this.sw.maxParticles;
      const tick = s.tick || 0, cam = v.cam;
      const inMap = (x, y) => ef || (x >= 0 && y >= 0 && x < mw && y < mh);
      for (const pk of kinds.sort((a, b) => (a.kind === 'fireflies') - (b.kind === 'fireflies'))) {
        const n = Math.min(budget, particleCount(pk.density, Wn, Hn, this.sw.particles));
        if (n <= 0) continue;
        budget -= n;
        const K = KIND[pk.kind], list = this._particleSet(pk.kind, n);
        for (const p of list) {
          const w = particleAt(p, pk.kind, tick, cam, Wn, Hn);
          const wx = Math.round(w.x), wy = Math.round(w.y);
          if (!inMap(wx, wy)) continue;
          const sx = (wx - cam.x) * z, sy = (wy - cam.y) * z;
          if (sx < -4 * z || sy < -4 * z || sx > cw + 4 * z || sy > ch + 4 * z) continue;
          const col = hexRgb(p.c);
          if (K.glow) {
            const a = blink(p, tick);
            if (a < 0.04) continue;
            ctx.fillStyle = rgba(col, 0.32 * a);
            ctx.fillRect(sx - z, sy, z * 3, z); ctx.fillRect(sx, sy - z, z, z * 3);
            ctx.fillStyle = rgba(col, Math.min(1, 0.4 + 0.6 * a)); ctx.fillRect(sx, sy, z, z);
          } else if (K.leaf) {
            const f = ((tick + p.b0) >> 4) & 1;
            ctx.fillStyle = '#' + p.c;
            if (f) { ctx.fillRect(sx, sy, 2 * z, z); ctx.fillRect(sx + z, sy + z, z, z); } else { ctx.fillRect(sx, sy, z, 2 * z); ctx.fillRect(sx + z, sy, z, z); }
          } else {
            const [a0, a1] = K.alpha, tw = 0.5 + 0.5 * Math.sin(tick / p.period * 2 + p.ph);
            ctx.fillStyle = rgba(col, a0 + (a1 - a0) * tw);
            ctx.fillRect(sx, sy, z * K.size, z * K.size);
          }
          np++;
        }
      }
    }
    ctx.restore();
    this.last = { tint: +ta.toFixed(3), vignette: +va.toFixed(3), rays: rs, raysDrawn: drawn, particles: np, ms: (globalThis.performance?.now?.() ?? 0) - t0 };
  }

  _base(Wn, Hn, P, ta, va) {
    const vg = P.vignette || {}, tc = P.tint?.color || '#f8eabe';
    const key = `${Wn}x${Hn}:${tc}:${ta.toFixed(3)}:${vg.color}:${vg.inner}:${va.toFixed(3)}`;
    if (this._vig?.key === key) return this._vig.c;
    const c = this._vig?.c && this._vig.c.width === Wn && this._vig.c.height === Hn ? this._vig.c : this.makeCanvas(Wn, Hn);
    const g = c.getContext('2d');
    g.clearRect(0, 0, Wn, Hn);
    if (ta > 0) { g.fillStyle = rgba(hexRgb(tc), ta); g.fillRect(0, 0, Wn, Hn); }
    if (va > 0) {
      const col = vg.color ? hexRgb(vg.color) : SHADE, R = Math.hypot(Wn / 2, Hn / 2), inner = clamp01(vg.inner ?? 0.5);
      const grad = g.createRadialGradient(Wn / 2, Hn / 2, R * inner, Wn / 2, Hn / 2, R);
      grad.addColorStop(0, rgba(col, 0)); grad.addColorStop(0.45, rgba(col, va * 0.3)); grad.addColorStop(0.8, rgba(col, va * 0.78)); grad.addColorStop(1, rgba(col, va));
      g.fillStyle = grad; g.fillRect(0, 0, Wn, Hn);
    }
    this._vig = { key, c };
    return c;
  }

  _rayAnchors(life) {
    const cov = life.coverage;
    if (this._anchors && this._anchorCov === cov) return this._anchors;
    life._noise ||= periodicFbm(CLOUD_MASK, CLOUD_MASK, 0x6b696c75); // the SAME sky living.js builds (and caches) for the cloud mask
    this._anchors = findRayAnchors(cloudLevels(life._noise, cov), CLOUD_MASK);
    this._anchorCov = cov;
    return this._anchors;
  }

  /** One shaft sprite (native px), cached by look; rebuilt only when the strength step / preset changes, never as clouds drift. */
  _raySprite(R, a) {
    const L = R.length || 220, Wd = R.width || 34, col = R.color || '#f8eabe';
    const key = `${a}:${col}:${L}:${Wd}`;
    if (this._ray?.key === key) return this._ray;
    const dl = Math.hypot(RAY_SUN.x, RAY_SUN.y), dx = RAY_SUN.x / dl, dy = RAY_SUN.y / dl, px = -dy, py = dx;
    const tx = dx * L, ty = dy * L, w0 = Wd / 2, w1 = Wd * 0.75;
    const ox = Math.floor(Math.min(0, tx) - w1 - 2), oy = Math.floor(Math.min(0, ty) - w1 - 2);
    const w = Math.ceil(Math.max(0, tx) + w1 + 2) - ox, h = Math.ceil(Math.max(0, ty) + w1 + 2) - oy;
    const c = this._ray?.c && this._ray.c.width === w && this._ray.c.height === h ? this._ray.c : this.makeCanvas(w, h);
    const g = c.getContext('2d'), rgb = hexRgb(col);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.setTransform(1, 0, 0, 1, -ox, -oy);
    const grad = g.createLinearGradient(0, 0, tx, ty);
    // stepped stops (pixel-art bands): bright just above the lit patch, fading to the sky
    [[0, 0.35], [0.12, 0.35], [0.12, 1], [0.38, 1], [0.38, 0.7], [0.62, 0.7], [0.62, 0.4], [0.84, 0.4], [0.84, 0.15], [1, 0]].forEach(([s, k]) => grad.addColorStop(s, rgba(rgb, a * k)));
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(-px * w0, -py * w0); g.lineTo(px * w0, py * w0);
    g.lineTo(tx + px * w1, ty + py * w1); g.lineTo(tx - px * w1, ty - py * w1); g.closePath(); g.fill();
    // the lit ground patch (soft, flat ellipse)
    g.fillStyle = rgba(rgb, a * 0.35); g.beginPath(); g.ellipse(0, 0, w0 * 1.1, w0 * 0.55, 0, 0, Math.PI * 2); g.fill();
    g.setTransform(1, 0, 0, 1, 0, 0);
    this._ray = { key, c, ox, oy, w, h, L };
    return this._ray;
  }

  _drawRays(ctx, v, life, strength, Wn, Hn, ef, mw, mh) {
    const R = this.preset.rays, z = v.zoom, cam = v.cam, o = life.cloudOffset();
    // alpha in 1/400 steps: the dawn/dusk fade rebuilds the small sprite a handful of times, not every frame
    const a = Math.round(Math.min(CAPS.rays, (R.alpha || 0.14) * strength) * 400) / 400;
    if (a <= 0) return 0;
    const S = this._raySprite(R, a);
    const list = visibleAnchors(this._rayAnchors(life), o, { x: cam.x, y: cam.y, w: Wn, h: Hn }, S.L).slice(0, this.sw.maxRays);
    if (!list.length) return 0;
    if (!ef) { ctx.save(); ctx.beginPath(); ctx.rect(-cam.x * z, -cam.y * z, mw * z, mh * z); ctx.clip(); }
    for (const an of list) {
      const x = Math.round(an.x - cam.x) + S.ox, y = Math.round(an.y - cam.y) + S.oy; // whole native px: zoom blocks stay solid
      ctx.drawImage(S.c, 0, 0, S.w, S.h, x * z, y * z, S.w * z, S.h * z);
    }
    if (!ef) ctx.restore();
    return list.length;
  }

  state() {
    return { on: this.on, map: this._mapName, family: this.preset?.family || null, area: this.preset?.area ?? null, switches: { ...this.sw }, ...this.last };
  }
}
