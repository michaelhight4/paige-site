// Kilumen overworld: the "living world" layer. Pure canvas, pixel-crisp, cheap. Everything here is drawn by the
// renderer through three hooks (see renderer.draw):
//   under(ctx, v)  after ground/decoration/decals, before characters  -> fish shadows + ripples (on water)
//   over(ctx, v)   after characters + overlay tiles, before fog        -> chimney smoke, butterflies, wind motes,
//                                                                         bird ground shadows, then CLOUD SHADOWS
//   top(ctx, v)    after fog, before debug/fade                         -> birds (sky), fireflies (emissive)
// Cloud shadows: the clouds themselves are never drawn. A tileable noise mask (2 native px cells, a solid core +
// 50% and 25% ordered-dither rims, no gradients) is built once per coverage, coloured with the CURRENT grade's
// shadow colour (grades.json shadow.dst, so it never needs a hand tint), and blitted (<= 4 drawImage calls, NEAREST,
// whole native px) at a stepped alpha. Offset = global wind x total game minutes + a per-map seed, so it is
// deterministic from map id + game time and never pops on a warp. Outdoor maps only (progression.INDOOR_OR_CAVE).
// New sprites are drawn here at 1x from palette.hex colours and graded like characters with gradeImage(sheet, grade, 'lut')
// (sprite grade: no light colours, so smoke/butterfly highlights never glow); firefly glow stays ungraded (emissive). All motion shares WIND.
import { TILE, Col } from './constants.js?v=v0.2.99-alpha';
import { cameraFor } from './camera.js?v=v0.2.99-alpha';
import { INDOOR_OR_CAVE, isIndoor } from './clock.js?v=v0.2.99-alpha';

/** Interiors + caves: one list, defined in clock.js (same rule as tools/progression.py INDOOR_OR_CAVE). */
export { INDOOR_OR_CAVE };
export const isIndoorOrCave = isIndoor;

/** One global wind (unit vector, screen space: +x east, +y south) shared by every effect. Blowing ENE->slightly S. */
export const WIND = Object.freeze({ x: 0.944, y: 0.331 });
export const CLOUD_PX_PER_GAME_MIN = 8;   // 1 game min = 1 real s at timescale 1 -> 8 native px/s
export const NIGHT_CLOUD_LEVEL = 0.375;  // Night FX v1 (nightClouds on): thin night clouds, 3/8 of the day shadow
export const CLOUD_ALPHA_DAY = 56;        // of 255 (brief: 40-70); dawn/dusk ~0.6 of this, night 0
export const CLOUD_CELL = 2;              // native px per mask cell (crisp ordered dither)
export const CLOUD_MASK = 768;            // mask cells per side -> period 1536 native px (24 tiles)
export const CLOUD_CHUNK = 32;            // cells per blit chunk; only chunks holding shadow are drawn

/** Weather presets. No weather system exists yet: `fair` is the default; a future system calls life.setWeather(). */
export const WEATHER = Object.freeze({
  clear: { coverage: 0 },
  fair: { coverage: 0.24 },
  cloudy: { coverage: 0.42 },
  overcast: { coverage: 0.62 },
  rain: { coverage: 0.7, wet: true }, // wet: fish dive, no butterflies/birds/motes (README 14.2 "hide while raining")
});

/** 0..1 cloud-shadow strength for a minute of the day (before quantising). */
export function cloudLevel(minOfDay) {
  const h = (((minOfDay % 1440) + 1440) % 1440) / 60;
  if (h < 5 || h >= 20) return 0;
  if (h < 6) return 0.6 * (h - 5);
  if (h < 8) return 0.6;
  if (h < 8.5) return 0.6 + 0.4 * ((h - 8) / 0.5);
  if (h < 17) return 1;
  if (h < 17.5) return 1 - 0.4 * ((h - 17) / 0.5);
  if (h < 19) return 0.6;
  return 0.6 * (20 - h);
}
/** Alpha 0..255, quantised to eighths (grades.json: stepped changes only, never a smooth blend). */
export const cloudAlphaFor = (minOfDay, base = CLOUD_ALPHA_DAY) => Math.round((Math.round(cloudLevel(minOfDay) * 8) / 8) * base);

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const hashStr = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;
const mod = (a, n) => ((a % n) + n) % n;

/** Tileable fbm value noise, W x H samples (W, H divisible by every lattice count). Pure (testable in Node). */
export function periodicFbm(W, H, seed, octaves = [[4, 4, 1], [8, 8, 0.5], [16, 16, 0.27], [32, 32, 0.14], [64, 64, 0.07]]) {
  const out = new Float32Array(W * H), rand = mulberry32(seed);
  const sm = (t) => t * t * (3 - 2 * t);
  for (const [nx, ny, amp] of octaves) {
    const lat = new Float32Array(nx * ny);
    for (let i = 0; i < lat.length; i++) lat[i] = rand();
    const cx = W / nx, cy = H / ny;
    for (let y = 0; y < H; y++) {
      const fy = y / cy, iy = Math.floor(fy), ty = sm(fy - iy), y0 = (iy % ny) * nx, y1 = ((iy + 1) % ny) * nx;
      for (let x = 0; x < W; x++) {
        const fx = x / cx, ix = Math.floor(fx), tx = sm(fx - ix), x0 = ix % nx, x1 = (ix + 1) % nx;
        const a = lat[y0 + x0] + (lat[y0 + x1] - lat[y0 + x0]) * tx, b = lat[y1 + x0] + (lat[y1 + x1] - lat[y1 + x0]) * tx;
        out[y * W + x] += amp * (a + (b - a) * ty);
      }
    }
  }
  return out;
}

/**
 * Cloud mask levels per cell: 0 none, 1 = 25% dither rim, 2 = 50% dither rim, 3 = solid core.
 * `coverage` = fraction of cells touched (rims included). Pure.
 */
export function cloudLevels(noise, coverage) {
  const out = new Uint8Array(noise.length);
  if (coverage <= 0) return out;
  const sample = [];
  for (let i = 0; i < noise.length; i += 5) sample.push(noise[i]);
  const s = Float32Array.from(sample).sort(), q = (f) => s[Math.min(s.length - 1, Math.max(0, Math.floor((1 - f) * s.length)))];
  const t3 = q(coverage * 0.7), t2 = q(coverage * 0.86), t1 = q(coverage);
  for (let i = 0; i < noise.length; i++) { const n = noise[i]; out[i] = n > t3 ? 3 : n > t2 ? 2 : n > t1 ? 1 : 0; }
  return out;
}
/** Ordered dither: is cell (x, y) at level L filled? */
export const ditherOn = (L, x, y) => L === 3 || (L === 2 && ((x + y) & 1) === 0) || (L === 1 && (x & 1) === 0 && (y & 1) === 0);

// ---- tiny sprites (1x, palette.hex colours) -------------------------------------------------------------------
const C = {
  '.': null, B: '2c1a12', K: '3e3a48', D: '29252b', S: 'ccc6c2', s: 'a8a0a4', H: 'ecdec4',
  L: '78ba48', l: '52983a', p: 'f8eabe', y: 'fcd668', g: 'a6d460', X: 'SHADOW',
};
const BUTTERFLY = [ // wings: [W, E] colours
  ['fcd668', 'e29d40'], ['f6a0ba', 'd2608c'], ['c6ecfa', '7ac2e8'], ['fcf6e8', 'ccc6c2'],
];
const ART = { // 1 art pixel = 1 native px, the same pixel density as the tiles and characters
  bfly_open: ['.EE...EE.', 'EWWE.EWWE', 'EWWWBWWWE', '.EWWBWWE.', '..EWBWE..', '.EWW.WWE.', '..EE.EE..'],
  bfly_shut: ['.........', '..EE.EE..', '..EWBWE..', '...WBW...', '..EWBWE..', '...E.E...', '.........'],
  bird_up: ['K...........K', '.KK...D...KK.', '...KKKKKKK...', '......K......', '.............'],
  bird_mid: ['.............', '......D......', '.KKKKKKKKKKK.', 'K....KKK....K', '......K......'],
  bird_down: ['.............', '......D......', '....KKKKK....', '..KK..K..KK..', 'KK.........KK'],
  puff1: ['.H.', 'HSs', '.s.'],
  puff2: ['.HS.', 'HSSs', 'SSSs', '.ss.'],
  puff3: ['..HH..', '.HSSS.', 'HSSSSs', 'SSSSSs', '.SSss.', '..ss..'],
  puff4: ['..HHS...', '.HSSSSs.', 'HSSSSSSs', 'SSSSSSSs', 'SSSSSSss', '.SSSsss.', '..sss...'],
  pollen: ['Hp', 'pp'], seed: ['p.p', '.p.', '.y.'],
  leaf_a: ['.L', 'Ll', 'l.'], leaf_b: ['Ll.', '.lL'],
};
const GLOW = { ff_dim: ['.g.', 'gyg', '.g.'], ff_on: ['...g...', '.g.y.g.', '..ypy..', 'gypppyg', '..ypy..', '.g.y.g.', '...g...'] };

function makeSheet(defs, extra = {}) {
  const rects = {}; let x = 0, H = 0;
  const items = Object.entries(defs);
  for (const [, rows] of items) { x += rows[0].length + 1; H = Math.max(H, rows.length); }
  const c = document.createElement('canvas'); c.width = x; c.height = H;
  const g = c.getContext('2d'); x = 0;
  for (const [name, rows] of items) {
    const key = { ...C, ...(extra[name] || {}) };
    rows.forEach((row, yy) => [...row].forEach((ch, xx) => {
      const col = key[ch];
      if (!col) return;
      g.fillStyle = col === 'SHADOW' ? 'rgba(26,18,38,0.376)' : '#' + col; // SHADOW = the kit's alpha-96 colour
      g.fillRect(x + xx, yy, 1, 1);
    }));
    rects[name] = { x, y: 0, w: rows[0].length, h: rows.length };
    x += rows[0].length + 1;
  }
  // the SHADOW fill must land as exactly (26,18,38,96) for gradeImage's shadow swap: fix any rounding
  const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 0; i < a.length; i += 4) if (a[i + 3] && a[i + 3] < 255) { a[i] = 26; a[i + 1] = 18; a[i + 2] = 38; a[i + 3] = 96; }
  g.putImageData(d, 0, 0);
  return { canvas: c, rects };
}

function buildSprites() {
  const defs = { ...ART }, extra = {};
  BUTTERFLY.forEach(([w, e], i) => {
    for (const f of ['open', 'shut']) { defs[`bfly${i}_${f}`] = ART[`bfly_${f}`]; extra[`bfly${i}_${f}`] = { W: w, E: e }; }
  });
  delete defs.bfly_open; delete defs.bfly_shut;
  for (const k of ['puff1', 'puff2', 'puff3', 'puff4']) // dithered "fading" copy: pixel art fades by dropping pixels
    defs[k + 'd'] = ART[k].map((row, yy) => [...row].map((ch, xx) => ((xx + yy) & 1 ? '.' : ch)).join(''));
  for (const k of ['bird_up', 'bird_mid', 'bird_down']) defs[k + '_sh'] = ART[k].map((r) => r.replace(/[KD]/g, 'X'));
  return { main: makeSheet(defs, extra), glow: makeSheet(GLOW) };
}

/** Chimney cap centre (native px from the building's top-left) per 5x5 building, measured from tiles_1x/building.png. */
/** No-smoke rule (WD r78 review, Oct 29 2026): chimney puffs are off. Flip to true only with Gary's OK. */
export const CHIMNEY_SMOKE = false;
export const CHIMNEYS = { house_player: 240, house_a: 80, house_b: 250, house_c: 74, shop: 266 };
const BIRD_FRAMES = ['bird_up', 'bird_mid', 'bird_down', 'bird_mid'];
const BIRD_SHADOW = { x: 14, y: 52 };
const SETTINGS_KEY = 'kilumen_alpha_settings.v1';

export class LivingWorld {
  /**
   * @param {object} scene Overworld
   * @param {object} opts {clouds?, life?, weather?, reducedMotion?} URL overrides (not saved)
   */
  constructor(scene, opts = {}) {
    this.scene = scene; this.opts = opts;
    this.settings = { clouds: true, life: true, wind: true }; // wind: Options 'Wind' toggle (wind.js)
    try { Object.assign(this.settings, JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY) || '{}')); } catch { /* private mode */ }
    if (opts.clouds != null) this.settings.clouds = !!opts.clouds;
    if (opts.life != null) this.settings.life = !!opts.life;
    this.weather = WEATHER[opts.weather] ? opts.weather : 'fair';
    this.coverage = opts.coverage ?? WEATHER[this.weather].coverage;
    this._mq = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this._mq?.addEventListener?.('change', () => this._resetEntities());
    this.map = null; this.outdoor = false; this.seedOff = { x: 0, y: 0 };
    this.fish = []; this.butterflies = []; this.fireflies = []; this.birds = []; this.puffs = []; this.motes = [];
    this.chimneys = []; this.flowerCells = []; this.glowCells = []; this.birdWait = 0;
    this._cloud = null;   // {coverage, levels, mask(canvas), coloured: Map<colourKey, canvas>}
    this._sprites = null;
  }

  get reducedMotion() { return this.opts.reducedMotion ?? !!this._mq?.matches; }
  get motion() { return this.reducedMotion ? 0.15 : 1; }
  get cloudsOn() { return this.settings.clouds && this.outdoor && this.coverage > 0; }
  get lifeOn() { return this.settings.life; }
  get wet() { return !!WEATHER[this.weather]?.wet; }

  // ---- settings ---------------------------------------------------------------------------------------------
  set(key, on, persist = true) {
    this.settings[key] = !!on;
    if (persist) try { globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch { /* ignore */ }
    if (key === 'life') this._resetEntities();
    return this.settings[key];
  }
  toggle(key) { return this.set(key, !this.settings[key]); }
  /** Weather hook for a future weather system: a WEATHER name, or {coverage, wet}. */
  setWeather(w) {
    if (typeof w === 'string' && WEATHER[w]) { this.weather = w; this.coverage = WEATHER[w].coverage; }
    else if (w && typeof w === 'object') { this.weather = w.wet ? 'rain' : 'custom'; this.coverage = Math.max(0, Math.min(0.9, +w.coverage || 0)); }
    if (this.wet) this.fish.forEach((f) => { f.hidden = true; });
    return this.weather;
  }

  // ---- map + clock ------------------------------------------------------------------------------------------
  /** Total game minutes (deterministic clock for the clouds). */
  get gameMin() { const c = this.scene.clock; return (c.day || 0) * 1440 + (c.min || 0); }
  get hourF() { return (this.scene.clock.min % 1440) / 60; }

  enter(map) {
    this.map = map; this.outdoor = !isIndoorOrCave(map.name);
    const h = hashStr(map.name), P = CLOUD_MASK * CLOUD_CELL;
    this.seedOff = { x: h % P, y: Math.floor(h / P) % P };
    this.rand = mulberry32(h ^ Math.imul((this.scene.clock.day || 0) + 1, 0x9e3779b1));
    this.chimneys = []; this.flowerCells = []; this.glowCells = [];
    const byId = map._byId;
    if (this.outdoor && byId) {
      const water = [];
      for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
        for (const layer of ['decoration', 'overlay']) {
          const name = byId.get(map.tile(layer, x, y))?.name || '';
          const m = /^(\w+?)_0_0$/.exec(name);
          if (CHIMNEY_SMOKE && m && CHIMNEYS[m[1]] != null) this.chimneys.push({ x: x * TILE + CHIMNEYS[m[1]], y: y * TILE + 1, t: 0 });
          if (/flower/.test(name)) this.flowerCells.push({ x, y });
          if (/reed/.test(name)) this.glowCells.push({ x, y });
        }
        if (map.encounter(x, y)) this.glowCells.push({ x, y });
        else if (map.code(x, y) === Col.WATER && water.length < 400) water.push({ x, y });
      }
      this.glowCells = [...this.flowerCells, ...this.flowerCells, ...this.glowCells]; // flowers weighted x2
      if (this.glowCells.length < 6) this.glowCells.push(...water.slice(0, 20));
    }
    this._resetEntities();
  }

  _resetEntities() {
    this.fish = []; this.butterflies = []; this.fireflies = []; this.birds = []; this.puffs = []; this.motes = [];
    for (const c of this.chimneys) c.t = Math.floor((this.rand?.() || 0) * 40);
    if (!this.map || !this.outdoor || !this.lifeOn) return;
    const r = this.rand, m = this.map;
    // fish (README 14.2: show 2-3 of the spots at a time)
    const spots = [...(m.json.ambient?.fish_spots || [])];
    const fid = m.tileByName?.(m.json.ambient?.fish_tile || 'fish_shadow')?.id, rid = m.tileByName?.(m.json.ambient?.ripple_tile || 'fish_ripple')?.id;
    if (fid && spots.length) {
      const n = Math.min(3, Math.max(1, Math.ceil(spots.length / 2)));
      for (let i = 0; i < n; i++) {
        const sp = spots.splice(Math.floor(r() * spots.length), 1)[0];
        this.fish.push({ id: fid, rid, spot: sp, x: sp.x * TILE, y: sp.y * TILE, tx: sp.x * TILE, ty: sp.y * TILE, dir: r() < 0.5 ? -1 : 1, wait: Math.floor(r() * 120), ph: Math.floor(r() * 4), ripple: null, hidden: this.wet });
      }
      this._freeSpots = spots;
    }
    const nb = Math.min(8, Math.ceil(this.flowerCells.length / 3));
    for (let i = 0; i < nb; i++) {
      const c = this.flowerCells[Math.floor(r() * this.flowerCells.length)];
      const hx = c.x * TILE + 32, hy = c.y * TILE + 30;
      this.butterflies.push({ hx, hy, x: hx + (r() - 0.5) * 40, y: hy - 10 - r() * 20, ang: r() * 6.283, v: r() * 3 | 0, flap: 0, ph: r() * 100, landed: false });
    }
    const nf = Math.min(20, Math.ceil(this.glowCells.length / 2));
    for (let i = 0; i < nf; i++) {
      const c = this.glowCells[Math.floor(r() * this.glowCells.length)];
      const hx = c.x * TILE + 8 + r() * 48, hy = c.y * TILE + 8 + r() * 40;
      this.fireflies.push({ hx, hy, x: hx, y: hy, ang: r() * 6.283, period: 150 + Math.floor(r() * 120), ph: Math.floor(r() * 300) });
    }
    this.birdWait = 240 + Math.floor(r() * 600);
  }

  // ---- simulation (60 Hz, from Overworld.step) ---------------------------------------------------------------
  tick() {
    if (!this.map || !this.outdoor || !this.lifeOn) return;
    const s = this.scene, t = s.tick, mo = this.motion, h = this.hourF, r = this.rand;
    const view = this._view();
    const gust = 1 + 0.6 * Math.max(0, Math.sin(t / 420)) * Math.max(0, Math.sin(t / 97));
    this._tickFish(mo, r);
    // butterflies: day (06:00-18:00) and not raining; otherwise they settle on their flower and hide
    const bflyActive = h >= 6 && h < 18 && !this.wet;
    for (const b of this.butterflies) {
      if (!bflyActive) { b.x += (b.hx - b.x) * 0.05; b.y += (b.hy - b.y) * 0.05; b.landed = Math.abs(b.hx - b.x) + Math.abs(b.hy - b.y) < 3; continue; }
      b.landed = false;
      b.ang += (r() - 0.5) * 0.5;
      const sp = 0.42 * (this.reducedMotion ? 0.4 : 1);
      b.x += Math.cos(b.ang) * sp + WIND.x * 0.06 * gust * mo; b.y += Math.sin(b.ang) * sp * 0.7 + WIND.y * 0.06 * gust * mo;
      const dx = b.hx - b.x, dy = b.hy - 18 - b.y;
      if (dx * dx + dy * dy > 48 * 48) { b.x += dx * 0.01; b.y += dy * 0.01; }
      if (++b.flap >= (this.reducedMotion ? 14 : 7)) b.flap = 0;
    }
    // fireflies: 19:00-05:00
    const ffActive = (h >= 19 || h < 5) && !this.wet;
    if (ffActive) for (const f of this.fireflies) {
      f.ang += (r() - 0.5) * 0.25;
      const sp = 0.12 * (this.reducedMotion ? 0.4 : 1);
      f.x += Math.cos(f.ang) * sp + WIND.x * 0.02 * mo; f.y += Math.sin(f.ang) * sp + WIND.y * 0.02 * mo;
      const dx = f.hx - f.x, dy = f.hy - f.y;
      if (dx * dx + dy * dy > 36 * 36) { f.x += dx * 0.01; f.y += dy * 0.01; }
    }
    // chimney smoke (all day; puffs rise, lean downwind, grow, then dither out)
    const every = this.reducedMotion ? 80 : 40;
    for (const c of this.chimneys) {
      if (++c.t < every) continue;
      c.t = Math.floor(r() * 10);
      if (this.puffs.length < 160) this.puffs.push({ x: c.x + (r() - 0.5) * 2, y: c.y, age: 0, life: 170 + Math.floor(r() * 60), vx: (r() - 0.5) * 0.04 });
    }
    for (const p of this.puffs) {
      const lift = (0.2 + 0.1 * (1 - p.age / p.life)) * (this.reducedMotion ? 0.5 : 1);
      p.x += WIND.x * 0.16 * gust * Math.min(1, p.age / 40) * Math.max(mo, 0.4) + p.vx; p.y += -lift + WIND.y * 0.05 * gust;
      p.age++;
    }
    this.puffs = this.puffs.filter((p) => p.age < p.life);
    // wind motes (pollen / seeds / leaves), day-ish only; off with reduced motion
    const motesOn = h >= 6 && h < 19.5 && !this.wet && !this.reducedMotion;
    const want = motesOn ? Math.round(18 * Math.min(2, (view.w * view.h) / (960 * 540))) : 0;
    while (this.motes.length < want) this.motes.push(this._newMote(view, this.motes.length < want / 3 && t % 2 === 0));
    for (const mt of this.motes) {
      const sp = mt.kind === 'leaf' ? 0.42 : 0.3;
      mt.x += WIND.x * sp * gust + Math.sin(mt.age / 23 + mt.ph) * 0.18;
      mt.y += WIND.y * sp * gust + Math.cos(mt.age / 31 + mt.ph) * 0.14 + (mt.kind === 'leaf' ? 0.04 : 0);
      mt.age++;
    }
    const mx = 80;
    this.motes = this.motes.filter((mt) => mt.age < mt.life && mt.x > view.x - mx && mt.x < view.x + view.w + mx && mt.y > view.y - mx && mt.y < view.y + view.h + mx).slice(0, want);
    // birds: a small flock every 15-45 s between 06:00 and 19:00 (not raining, not reduced motion)
    const birdsOn = h >= 6 && h < 19 && !this.wet && !this.reducedMotion;
    if (birdsOn && this.birds.length === 0 && --this.birdWait <= 0) { this.spawnBirds(1 + Math.floor(r() * 3)); this.birdWait = 900 + Math.floor(r() * 1800); }
    for (const b of this.birds) { b.x += b.vx; b.y += b.vy; b.age++; if (b.glide > 0) b.glide--; else if (r() < 0.004) b.glide = 40 + Math.floor(r() * 40); }
    const diag = Math.hypot(view.w, view.h);
    this.birds = this.birds.filter((b) => b.age < 120 || Math.hypot(b.x - (view.x + view.w / 2), b.y - (view.y + view.h / 2)) < diag);
  }

  _newMote(view, anywhere) {
    const r = this.rand, k = r(), kind = k < 0.55 ? 'pollen' : k < 0.75 ? 'seed' : 'leaf';
    let x, y;
    if (anywhere) { x = view.x + r() * view.w; y = view.y + r() * view.h; }
    else if (r() < WIND.x / (WIND.x + WIND.y)) { x = view.x - 20 - r() * 40; y = view.y + r() * view.h; } // upwind edges
    else { x = view.x + r() * view.w; y = view.y - 20 - r() * 40; }
    return { x, y, kind, age: 0, life: 300 + Math.floor(r() * 360), ph: r() * 6.283 };
  }

  /** Force a flock now (previews/tests). Spawns upwind of the view and crosses it downwind. */
  spawnBirds(n = 3) {
    const v = this._view(), r = this.rand || Math.random, cx = v.x + v.w / 2, cy = v.y + v.h / 2, back = Math.hypot(v.w, v.h) / 2 + 60;
    const side = (r() - 0.5) * v.h * 0.6, px = -WIND.y, py = WIND.x, sp = 1.7 + r() * 0.3;
    for (let i = 0; i < n; i++) {
      const lag = 24 * i, off = (i % 2 ? 1 : -1) * 18 * Math.ceil(i / 2);
      this.birds.push({ x: cx - WIND.x * (back + lag) + px * (side + off), y: cy - WIND.y * (back + lag) + py * (side + off),
        vx: WIND.x * sp + px * 0.08, vy: WIND.y * sp + py * 0.08, age: 0, ph: i * 3 + Math.floor(r() * 4), glide: 0 });
    }
    return this.birds.length;
  }

  _tickFish(mo, r) {
    const m = this.map, sp = 0.3 * (this.reducedMotion ? 0.5 : 1), ms = this.scene.ms;
    const isWater = (px, py) => { const c = m.code(Math.floor(px / TILE), Math.floor(py / TILE)); return c === Col.WATER || c === Col.DEEP_WATER; };
    // shadow bbox inside the 64px fish tile: x 17..53, y 22..42 -> every corner must be over water
    const fits = (x, y) => isWater(x + 18, y + 23) && isWater(x + 52, y + 23) && isWater(x + 18, y + 41) && isWater(x + 52, y + 41);
    for (const f of this.fish) {
      if (f.ripple && ms - f.ripple.t0 > 260) f.ripple = null;
      if (this.wet) { f.hidden = true; continue; }
      if (f.hidden) { // surfaced again at a (maybe different) spot
        if (--f.wait > 0) continue;
        const free = this._freeSpots || [];
        if (free.length) { const sp2 = free.splice(Math.floor(r() * free.length), 1)[0]; free.push(f.spot); f.spot = sp2; }
        f.x = f.tx = f.spot.x * TILE; f.y = f.ty = f.spot.y * TILE; f.hidden = false; f.wait = 60;
        f.ripple = { x: f.x, y: f.y, t0: ms };
        continue;
      }
      if (f.wait > 0) { f.wait--; continue; }
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
      if (d > 0.5) { const k = Math.min(sp, d) / d; f.x += dx * k; f.y += dy * k; continue; }
      f.wait = 60 + Math.floor(r() * 200);
      if (r() < 0.12) { f.ripple = { x: f.x, y: f.y, t0: ms }; f.hidden = true; f.wait = 180 + Math.floor(r() * 240); continue; } // dive
      for (let k = 0; k < 8; k++) {
        const tx = f.spot.x * TILE + Math.round((r() * 2 - 1) * TILE), ty = f.spot.y * TILE + Math.round((r() * 2 - 1) * TILE * 0.6);
        if (!fits(tx, ty)) continue;
        const nd = Math.sign(tx - f.x);
        if (nd && nd !== f.dir) { f.dir = nd; f.ripple = { x: f.x, y: f.y, t0: ms }; } // README: ripple when it turns
        f.tx = tx; f.ty = ty; break;
      }
    }
  }

  _view() {
    const s = this.scene, z = s.zoom || 2, W = (s.canvas?.width || 1920) / z, H = (s.canvas?.height || 1080) / z;
    const p = s.player?.pixel?.() || { px: 0, py: 0 }, c = cameraFor(p.px + TILE / 2, p.py + TILE / 2, this.map.width, this.map.height, W, H, s.opts?.platform?.profile?.camera, s._cam?.map === this.map ? s._cam : null, { indoor: !this.outdoor }); // same profile rules as Overworld.view (centre camera)
    return { x: c.x, y: c.y, w: W, h: H };
  }

  // ---- clouds -----------------------------------------------------------------------------------------------
  cloudAlpha() {
    if (!this.cloudsOn) return 0;
    if (!this.nightClouds) return cloudAlphaFor(this.scene.clock.min);
    // Night FX v1 (opt-in, overworld sets nightClouds): thin moonlit clouds keep drifting at night and dim the moonlight.
    const lv = Math.max(cloudLevel(this.scene.clock.min), NIGHT_CLOUD_LEVEL);
    return Math.round((Math.round(lv * 8) / 8) * CLOUD_ALPHA_DAY);
  }

  /** Mask offset in native px (whole px): wind x total game minutes + per-map seed. */
  cloudOffset() {
    const P = CLOUD_MASK * CLOUD_CELL, d = (this.nightClouds && this.reducedMotion ? 0 : this.gameMin * CLOUD_PX_PER_GAME_MIN * this.motion); // Night FX: paused under reduced motion
    return { x: mod(Math.floor(this.seedOff.x + WIND.x * d), P), y: mod(Math.floor(this.seedOff.y + WIND.y * d), P) };
  }

  _cloudImage(grade, alpha) {
    const N = CLOUD_MASK;
    if (!this._cloud || this._cloud.coverage !== this.coverage) {
      this._noise ||= periodicFbm(N, N, 0x6b696c75); // "kilu": one sky for every map (maps differ by offset)
      const lv = cloudLevels(this._noise, this.coverage);
      const c = document.createElement('canvas'); c.width = N; c.height = N;
      const g = c.getContext('2d'), d = g.createImageData(N, N), a = d.data;
      for (let y = 0, i = 0; y < N; y++) for (let x = 0; x < N; x++, i++) if (lv[i] >= 2) a[i * 4 + 3] = 255; // binary shapes: no see-through checker rims (QA wd_integ_fix)
      g.putImageData(d, 0, 0);
      // non-empty 32x32-cell chunks: per frame we only blit chunks that hold shadow (cheap at low coverage)
      const C = CLOUD_CHUNK, NC = N / C, full = new Uint8Array(NC * NC);
      for (let y = 0, i = 0; y < N; y++) for (let x = 0; x < N; x++, i++) if (lv[i]) full[((y / C) | 0) * NC + ((x / C) | 0)] = 1;
      this._cloud = { coverage: this.coverage, mask: c, coloured: new Map(), full, NC };
    }
    const [r, gg, b] = grade?.shadowDst || [26, 18, 38], key = `${r},${gg},${b},${alpha}`; // alpha baked in: plain source-over blits
    let img = this._cloud.coloured.get(key);
    if (!img) {
      img = document.createElement('canvas'); img.width = N; img.height = N;
      const g = img.getContext('2d');
      g.drawImage(this._cloud.mask, 0, 0);
      g.globalCompositeOperation = 'source-in';
      g.fillStyle = `rgba(${r},${gg},${b},${alpha / 255})`; g.fillRect(0, 0, N, N);
      this._cloud.coloured.set(key, img);
    }
    return img;
  }

  drawClouds(ctx, v) {
    const a = this.cloudAlpha();
    if (!a) return;
    const img = this._cloudImage(v.grade, a), z = v.zoom, cam = v.cam;
    const m = v.map, mw = m.width * TILE, mh = m.height * TILE, W = ctx.canvas.width / z, H = ctx.canvas.height / z;
    const ef = v.outside === 'edge'; // edge-filled off-map ground (centre camera / mobile): clouds run on over it, no seam at the map edge
    const vx0 = ef ? cam.x : Math.max(0, cam.x), vy0 = ef ? cam.y : Math.max(0, cam.y), vx1 = ef ? cam.x + W : Math.min(mw, cam.x + W), vy1 = ef ? cam.y + H : Math.min(mh, cam.y + H);
    if (vx1 <= vx0 || vy1 <= vy0) return;
    const o = this.cloudOffset(), C = CLOUD_CHUNK, CP = C * CLOUD_CELL, { full, NC } = this._cloud, CD = CP * z;
    ctx.save();
    if (!ef && (cam.x < 0 || cam.y < 0 || cam.x + W > mw || cam.y + H > mh)) { ctx.beginPath(); ctx.rect(-cam.x * z, -cam.y * z, mw * z, mh * z); ctx.clip(); }
    ctx.imageSmoothingEnabled = false;
    // world point w sits at mask coordinate (w + o) mod P; walk the chunks covering the visible map rect (whole px)
    for (let cy = Math.floor((vy0 + o.y) / CP); cy * CP - o.y < vy1; cy++) {
      const sy = mod(cy, NC), dy = (cy * CP - o.y - cam.y) * z;
      for (let cx = Math.floor((vx0 + o.x) / CP); cx * CP - o.x < vx1; cx++) {
        const sx = mod(cx, NC);
        if (full[sy * NC + sx]) ctx.drawImage(img, sx * C, sy * C, C, C, (cx * CP - o.x - cam.x) * z, dy, CD, CD);
      }
    }
    ctx.restore();
  }

  // ---- drawing ------------------------------------------------------------------------------------------------
  _sheets(v) {
    this._sprites ||= buildSprites();
    const grade = v.grade, main = grade && !grade.identity && v.gradeImage ? v.gradeImage(this._sprites.main.canvas, grade, 'lut') : this._sprites.main.canvas;
    return { main, glow: this._sprites.glow.canvas, rects: this._sprites.main.rects, grects: this._sprites.glow.rects };
  }

  _spr(ctx, v, img, rc, wx, wy) {
    const z = v.zoom;
    ctx.drawImage(img, rc.x, rc.y, rc.w, rc.h, (Math.round(wx) - v.cam.x) * z, (Math.round(wy) - v.cam.y) * z, rc.w * z, rc.h * z);
  }

  /** A tileset tile at native px (fish shadow / ripple), graded like Renderer.tile; flip = mirror horizontally. */
  _tileAt(ctx, v, id, idx, wx, wy, flip) {
    let ts = v.tileset, t = ts.byId.get(id), img, S = ts.size;
    if (!t) return;
    if (v.grade && !v.grade.identity && v.tileset1x && v.gradeImage) { ts = v.tileset1x; t = ts.byId.get(id) || t; img = v.gradeImage(ts.images.get(t.sheet), v.grade, 'map', v.emissive?.get(t.sheet)); S = ts.size; }
    else img = ts.images.get(t.sheet);
    if (!img) return;
    const z = v.zoom, D = TILE * z, dx = (Math.round(wx) - v.cam.x) * z, dy = (Math.round(wy) - v.cam.y) * z;
    const sx = (idx % ts.columns) * S, sy = Math.floor(idx / ts.columns) * S;
    if (!flip) { ctx.drawImage(img, sx, sy, S, S, dx, dy, D, D); return; }
    ctx.save(); ctx.scale(-1, 1); ctx.drawImage(img, sx, sy, S, S, -dx - D, dy, D, D); ctx.restore();
  }

  _visible(v, x, y, pad = 64) {
    const z = v.zoom, W = v.cw / z, H = v.ch / z;
    return x > v.cam.x - pad && x < v.cam.x + W + pad && y > v.cam.y - pad && y < v.cam.y + H + pad;
  }

  under(ctx, v) {
    if (!this.outdoor || !this.lifeOn) return;
    v.cw = ctx.canvas.width; v.ch = ctx.canvas.height;
    const ms = this.scene.ms, ts = v.tileset;
    for (const f of this.fish) {
      if (!f.hidden && this._visible(v, f.x, f.y)) {
        const t = ts.byId.get(f.id), fr = t?.animation?.frames || [t?.index];
        this._tileAt(ctx, v, f.id, fr[(Math.floor(ms / (t?.animation?.frame_ms || 200)) + f.ph) % fr.length], f.x, f.y, f.dir < 0);
      }
      if (f.ripple && f.rid) {
        const rt = ts.byId.get(f.rid), a = rt?.animation, i = Math.floor((ms - f.ripple.t0) / (a?.frame_ms || 120));
        if (a && i >= 0 && i < a.frames.length) this._tileAt(ctx, v, f.rid, a.frames[i], f.ripple.x, f.ripple.y, false);
      }
    }
  }

  over(ctx, v) {
    if (!this.outdoor) return;
    v.cw = ctx.canvas.width; v.ch = ctx.canvas.height;
    if (this.lifeOn) {
      const { main, rects } = this._sheets(v), t = this.scene.tick;
      for (const p of this.puffs) {
        if (!this._visible(v, p.x, p.y)) continue;
        const f = p.age / p.life, k = f < 0.12 ? 'puff1' : f < 0.35 ? 'puff2' : f < 0.62 ? 'puff3' : 'puff4', rc = rects[f > 0.8 ? k + 'd' : k];
        this._spr(ctx, v, main, rc, p.x - rc.w / 2, p.y - rc.h);
      }
      for (const b of this.butterflies) {
        if (b.landed || !this._visible(v, b.x, b.y)) continue;
        const rc = rects[`bfly${b.v}_${b.flap < (this.reducedMotion ? 7 : 4) ? 'open' : 'shut'}`];
        this._spr(ctx, v, main, rc, b.x - 4, b.y + Math.round(Math.sin((t + b.ph) / 9) * 2) - 3);
      }
      for (const mt of this.motes) {
        const rc = rects[mt.kind === 'leaf' ? ((mt.age >> 4) & 1 ? 'leaf_b' : 'leaf_a') : mt.kind];
        this._spr(ctx, v, main, rc, mt.x, mt.y);
      }
      for (const b of this.birds) { // ground shadow of the birds (the kit's shadow colour, graded)
        const fr = b.glide > 0 ? 'bird_mid' : BIRD_FRAMES[((t + b.ph) >> 3) & 3];
        this._spr(ctx, v, main, rects[fr + '_sh'], b.x + BIRD_SHADOW.x - 6, b.y + BIRD_SHADOW.y - 2);
      }
    }
    if (this.settings.clouds) this.drawClouds(ctx, v);
  }

  top(ctx, v) {
    if (!this.outdoor || !this.lifeOn) return;
    const { main, glow, rects, grects } = this._sheets(v), t = this.scene.tick;
    for (const b of this.birds) {
      const fr = b.glide > 0 ? 'bird_mid' : BIRD_FRAMES[((t + b.ph) >> 3) & 3];
      this._spr(ctx, v, main, rects[fr], b.x - 6, b.y - 2);
    }
    const h = this.hourF;
    if ((h >= 19 || h < 5) && !this.wet) for (const f of this.fireflies) {
      const c = (t + f.ph) % f.period, k = c < 10 || (c >= 80 && c < 92) ? 'ff_dim' : c < 80 ? 'ff_on' : null;
      if (!k || !this._visible(v, f.x, f.y)) continue;
      const rc = grects[k];
      this._spr(ctx, v, glow, rc, f.x - (rc.w >> 1), f.y - (rc.h >> 1)); // emissive: never graded (lights_rule)
    }
  }

  // ---- status -------------------------------------------------------------------------------------------------
  state() {
    return {
      outdoor: this.outdoor, clouds: this.settings.clouds, cloudsDrawn: this.cloudAlpha() > 0, life: this.settings.life,
      weather: this.weather, coverage: this.coverage, cloudAlpha: this.cloudAlpha(), cloudOffset: this.outdoor ? this.cloudOffset() : null,
      reducedMotion: this.reducedMotion, wind: WIND,
      counts: { fish: this.fish.filter((f) => !f.hidden).length, butterflies: this.butterflies.filter((b) => !b.landed).length,
        fireflies: (this.hourF >= 19 || this.hourF < 5) && !this.wet ? this.fireflies.length : 0, birds: this.birds.length,
        smoke: this.puffs.length, chimneys: this.chimneys.length, motes: this.motes.length },
    };
  }

  status() {
    if (!this.outdoor) return `life: indoor/cave (no clouds)  clouds ${this.settings.clouds ? 'on' : 'off'} [K]  life ${this.lifeOn ? 'on' : 'off'} [L]`;
    const s = this.state(), c = s.counts;
    return `clouds ${s.clouds ? 'on' : 'off'} [K] ${s.weather} cov ${s.coverage.toFixed(2)} a ${s.cloudAlpha}/255  life ${s.life ? 'on' : 'off'} [L]` +
      `  fish ${c.fish} bfly ${c.butterflies} ffly ${c.fireflies} birds ${c.birds} smoke ${c.smoke} motes ${c.motes}${s.reducedMotion ? '  reduced-motion' : ''}`;
  }
}
