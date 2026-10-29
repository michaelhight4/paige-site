// Kilumen overworld: depth pass (Oct 22, 2026). Soft contact shadows under solid furniture / decoration objects and
// under every character, plus wall-base shading indoors (a darker strip on floor cells under wall cells, darker inner
// corners). Drawn by the renderer after ground/decoration (and decals) and before characters. Data: depth.json.
//  - Colour: the CURRENT time-of-day grade's shadow colour (grade.shadowDst), the same one the cloud shadows and
//    the kit's translucent SHADOW pixels use, so it fits every time of day. Alpha comes from depth.json (0-255).
//  - Pixel-crisp: shapes live on a 2 native px grid: a flat core plus a 2 px checker-dither rim (no gradients).
//  - Static part (objects + walls) is cached per map at native (1x) size: built once per map/tile change, recoloured
//    in place (source-in) when the grade colour changes, blitted per frame as one nearest-neighbour drawImage.
//    The casters' own opaque pixels are cut out of it, so the shadow only shows on the floor around the object.
//  - Lights are untouched: no EMISSIVE / LUT work here; indoor/outdoor comes from clock.js INDOOR_OR_CAVE (isIndoor).
// Pure helpers (exported) run in Node for tests; DepthPass needs a canvas (browser).
import { TILE } from './constants.js?v=v0.2.88-alpha';
import { isIndoor } from './clock.js?v=v0.2.88-alpha';

export const DEPTH_SETTINGS_KEY = 'kilumen_alpha_depth.v1';
export const DEFAULT_SHADOW_RGB = [26, 18, 38]; // the kit's SHADOW colour (day grade shadow.dst)

const CHUNK = 16; // native px per occupancy block of the static layer (blits cover only these, merged into rects)

const PROFILE_DEFAULTS = {
  shadows: true, alpha: 80, offset: [4, 2], pad: 2, height: 10, min_height: 6, rim: 2, dither: true, above: 0.5,
  band: 8, rect_min_w: 112, layers: ['decoration'], solid_only: true, solid: ['block', 'boulder', 'gate'],
  cast: [], skip: [], merge_h: [], tweaks: [],
  actors: { enabled: true, alpha: 80, w: 30, h: 8, creature_w: 26, creature_h: 6, offset: [2, 1], feet: 3 },
  wall_base: { enabled: false, alpha: 64, px: 6, rim: 2, side_left_px: 4, side_right_px: 2, corner_px: 12, corner_alpha: 48, walls: [] },
};

const even = (n) => 2 * Math.round(n / 2);
const rx = (list) => (list || []).map((s) => new RegExp(s));

/** Merge one depth.json profile with the defaults and compile its patterns. */
export function compileProfile(p = {}) {
  const o = { ...PROFILE_DEFAULTS, ...p };
  o.actors = { ...PROFILE_DEFAULTS.actors, ...(p.actors || {}) };
  o.wall_base = { ...PROFILE_DEFAULTS.wall_base, ...(p.wall_base || {}) };
  o._cast = rx(o.cast); o._skip = rx(o.skip); o._merge = rx(o.merge_h); o._walls = rx(o.wall_base.walls);
  o._solid = new Set(o.solid);
  o._tweaks = (o.tweaks || []).map((t) => ({ ...t, _re: new RegExp(t.match) }));
  return o;
}

/** Scale every alpha of a compiled profile (casters, actors, wall base, corners) by k; 0-255, whole numbers. */
export function scaleAlphas(prof, k) {
  if (k === 1) return prof;
  const f = (a) => Math.max(0, Math.min(255, Math.round(a * k)));
  return { ...prof, alpha: f(prof.alpha), actors: { ...prof.actors, alpha: f(prof.actors.alpha) },
    wall_base: { ...prof.wall_base, alpha: f(prof.wall_base.alpha), corner_alpha: f(prof.wall_base.corner_alpha) } };
}

/**
 * depth.json (whole file or its `depth` block) -> {enabled, debugKey, strength, indoor, outdoor} with compiled profiles.
 * Shadow strength (Gary's call, Oct 22, 2026): `strengths` maps a name to an alpha multiplier; `strength` picks one
 * (medium = 1 = the profile values as written). `strength` arg (?depthstrength=) overrides the file; unknown -> file.
 */
export function normalizeDepth(json, strength) {
  const d = json?.depth || json || {};
  const table = d.strengths || {};
  const name = strength != null && table[strength] != null ? strength : (table[d.strength] != null ? d.strength : null);
  const k = name ? Number(table[name]) || 1 : 1;
  return { enabled: d.enabled !== false, debugKey: d.debug_key || 'KeyJ', strength: name, strengthScale: k,
    indoor: scaleAlphas(compileProfile(d.indoor), k), outdoor: scaleAlphas(compileProfile(d.outdoor), k) };
}

/** Profile for a map: interiors + caves (clock.js INDOOR_OR_CAVE) use `indoor`, everything else `outdoor`. */
export function profileFor(cfg, mapName) { return isIndoor(mapName) ? cfg.indoor : cfg.outdoor; }

/** Does this tile cast a contact shadow under `prof`? (name pattern in cast, not in skip, solid if solid_only) */
export function isCaster(tile, prof) {
  if (!tile?.name) return false;
  const n = tile.name;
  if (!prof._cast.some((r) => r.test(n)) || prof._skip.some((r) => r.test(n))) return false;
  return !prof.solid_only || prof._solid.has(tile.collision);
}

export function isWallTile(tile, prof) { return !!tile?.name && prof._walls.some((r) => r.test(tile.name)); }

/** Per-pattern overrides (first matching tweak), merged over the profile. */
export function tweakFor(name, prof) {
  const t = prof._tweaks.find((tw) => tw._re.test(name));
  return t ? { ...prof, ...t } : prof;
}

/**
 * Shadow casters on a map, grouped into objects: multi-tile `<name>_<row>_<col>` tiles by instance origin, runs of
 * `merge_h` tiles on one row, everything else one object per cell. Returns [{name, cells:[[x,y],...]}].
 */
export function findObjects(map, byId, prof) {
  const objs = new Map(), merge = new Map();
  for (const layer of prof.layers) for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const t = byId.get(map.tile(layer, x, y));
    if (!isCaster(t, prof)) continue;
    const m = /^(.*)_(\d+)_(\d+)$/.exec(t.name);
    const mi = prof._merge.findIndex((r) => r.test(t.name));
    let key;
    if (m) key = `${layer}|${m[1]}|${x - +m[3]},${y - +m[2]}`;
    else if (mi >= 0) {
      const left = merge.get(`${x - 1},${y},${mi}`); // continue the run on this row
      key = left || `${layer}|merge${mi}|${x},${y}`;
      merge.set(`${x},${y},${mi}`, key);
    } else key = `${layer}|${t.name}|${x},${y}`;
    let o = objs.get(key);
    if (!o) objs.set(key, (o = { name: m ? m[1] : t.name, cells: [] }));
    o.cells.push([x, y, t]);
  }
  return [...objs.values()];
}

/**
 * Shape on the 2 px grid: `cw` x `ch` cells, `rimCells` of checker-dither rim. shape 'oval' (ellipse) or 'rect'
 * (corner cells trimmed). Returns {core: [[cy, cx0, cx1]], rim: [[cy, cx]]} relative to the top-left cell.
 */
export function shapeCells(cw, ch, rimCells = 1, shape = 'oval') {
  const core = [], rim = [];
  const inside = (cx, cy, w, h, ox, oy) => {
    if (w <= 0 || h <= 0) return false;
    if (shape === 'rect') {
      const lx = cx - ox, ly = cy - oy;
      if (lx < 0 || ly < 0 || lx >= w || ly >= h) return false;
      return !((lx === 0 || lx === w - 1) && (ly === 0 || ly === h - 1)) || w < 3 || h < 3; // trim the 4 corner cells
    }
    const nx = (cx + 0.5 - ox - w / 2) / (w / 2), ny = (cy + 0.5 - oy - h / 2) / (h / 2);
    return nx * nx + ny * ny <= 1;
  };
  const r = Math.max(0, rimCells);
  for (let cy = 0; cy < ch; cy++) {
    let run = null;
    for (let cx = 0; cx <= cw; cx++) {
      const out = cx < cw && inside(cx, cy, cw, ch, 0, 0);
      const inCore = out && (r === 0 || inside(cx, cy, cw - 2 * r, ch - 2 * r, r, r));
      if (inCore) { if (!run) run = [cy, cx, cx]; else run[2] = cx; }
      else { if (run) { core.push(run); run = null; } if (out) rim.push([cy, cx]); }
    }
  }
  return { core, rim };
}

/** 2 px checker in absolute native coords (so neighbouring shapes dither in phase). */
export const ditherOn = (px, py) => (((px >> 1) + (py >> 1)) & 1) === 0;

/**
 * Bottom profile of an object from per-tile column bottoms: `bottomOf(tile)` -> Int16Array(64) of the lowest opaque
 * row per column (-1 = empty). Returns {base, x0, x1} in map native px (base = lowest opaque row; x0..x1 = the span
 * of columns that reach within `band` px of it), or null when the object is fully transparent.
 */
export function objectFoot(cells, bottomOf, band) {
  const bottoms = new Map();
  for (const [x, y, t] of cells) {
    const col = bottomOf(t);
    if (!col) continue;
    for (let c = 0; c < TILE; c++) if (col[c] >= 0) {
      const X = x * TILE + c, b = y * TILE + col[c];
      if (!(bottoms.get(X) >= b)) bottoms.set(X, b);
    }
  }
  if (!bottoms.size) return null;
  let base = -1;
  for (const b of bottoms.values()) if (b > base) base = b;
  let x0 = Infinity, x1 = -Infinity;
  for (const [X, b] of bottoms) if (b >= base - band) { if (X < x0) x0 = X; if (X > x1) x1 = X; }
  return { base, x0, x1 };
}

/**
 * Contact-shadow rectangle for an object foot (native px, even-aligned): oval for small objects, rounded rect for
 * wide ones (>= rect_min_w). `above` = fraction of the shadow above the base line; offset pushes it down/right.
 */
export function shadowBox(foot, p) {
  const w = even(foot.x1 - foot.x0 + 1 + 2 * p.pad);
  const h = Math.max(even(p.min_height), Math.min(even(p.height), even(w * 0.5)));
  const cx = (foot.x0 + foot.x1 + 1) / 2 + p.offset[0];
  const x = even(cx - w / 2), y = even(foot.base + 1 - h * p.above + p.offset[1]);
  return { x, y, w, h, shape: w >= p.rect_min_w ? 'rect' : 'oval' };
}

/** Wall-base pieces for a map: [{x, y, top, left, right, cornerL, cornerR}] for floor cells that touch a wall. */
export function wallBaseCells(map, byId, prof) {
  const wb = prof.wall_base;
  if (!wb?.enabled) return [];
  const wall = (x, y) => isWallTile(byId.get(map.tile('ground', x, y)), prof);
  const sideWall = (x, y) => !map.inBounds(x, y) || wall(x, y); // the void beside an interior reads as wall
  const out = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    if (!map.tile('ground', x, y) || wall(x, y)) continue;
    const top = map.inBounds(x, y - 1) && wall(x, y - 1);
    const left = wb.side_left_px > 0 && sideWall(x - 1, y), right = wb.side_right_px > 0 && sideWall(x + 1, y);
    if (!top && !left && !right) continue;
    out.push({ x, y, top, left, right, cornerL: top && sideWall(x - 1, y), cornerR: top && sideWall(x + 1, y) });
  }
  return out;
}

/** Cheap signature of the tiles the static layer depends on (props, gates and boulders swap tiles at run time). */
export function mapSignature(map, layers) {
  let h = 2166136261 >>> 0;
  for (const l of layers) {
    const g = map.layers[l];
    if (!g) continue;
    for (let y = 0; y < g.length; y++) { const row = g[y]; for (let x = 0; x < row.length; x++) h = Math.imul(h ^ row[x], 16777619); }
  }
  return h >>> 0;
}

/**
 * Occupancy grid (Uint8Array cw x ch, 1 = some shadow pixel in that block) -> non-overlapping [x0, y0, x1, y1] rects in
 * px: horizontal runs per block row, stacked downwards while the run below has the same extent. Clipped to W x H.
 */
export function occupancyRects(occ, cw, ch, block, W = cw * block, H = ch * block) {
  const out = [];
  let open = new Map();
  for (let cy = 0; cy <= ch; cy++) {
    const next = new Map();
    if (cy < ch) for (let cx = 0; cx < cw; cx++) {
      if (!occ[cy * cw + cx]) continue;
      let e = cx; while (e + 1 < cw && occ[cy * cw + e + 1]) e++;
      const k = `${cx},${e}`, r = open.get(k);
      if (r) { r[3] = Math.min(H, (cy + 1) * block); open.delete(k); next.set(k, r); }
      else next.set(k, [cx * block, cy * block, Math.min(W, (e + 1) * block), Math.min(H, (cy + 1) * block)]);
      cx = e;
    }
    for (const r of open.values()) out.push(r);
    open = next;
  }
  return out;
}

// ---- browser part ------------------------------------------------------------------------------------------------
const alphaCache = new WeakMap(); // sheet image -> {w, h, a: Uint8ClampedArray}
function sheetAlpha(img) {
  let s = alphaCache.get(img);
  if (!s) {
    const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
    s = { w: c.width, h: c.height, a: g.getImageData(0, 0, c.width, c.height).data };
    alphaCache.set(img, s);
  }
  return s;
}

function paintShape(g, X, Y, cw, ch, rimCells, shape, dither) {
  const { core, rim } = shapeCells(cw, ch, dither ? rimCells : 0, shape);
  for (const [cy, a, b] of core) g.fillRect(X + a * 2, Y + cy * 2, (b - a + 1) * 2, 2);
  for (const [cy, cx] of rim) { const px = X + cx * 2, py = Y + cy * 2; if (ditherOn(px, py)) g.fillRect(px, py, 2, 2); }
}

function newCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export class DepthPass {
  /** @param {object} cfg normalizeDepth() result; @param {object} opts {enabled?: URL override (not saved)} */
  constructor(cfg, opts = {}) {
    this.cfg = cfg || normalizeDepth({});
    let saved = null;
    try { saved = JSON.parse(globalThis.localStorage?.getItem(DEPTH_SETTINGS_KEY) || 'null'); } catch { /* private mode */ }
    this.enabled = opts.enabled ?? saved?.enabled ?? this.cfg.enabled;
    this.cache = new Map(); // map name -> {sig, profKey, canvas, colour, objects, walls, buildMs}
    this.actorSprites = new Map();
    this.stats = { buildMs: 0, objects: 0, walls: 0, frameMs: 0 };
  }

  get key() { return this.cfg.debugKey; }
  set(on, persist = true) {
    this.enabled = !!on;
    if (persist) try { globalThis.localStorage?.setItem(DEPTH_SETTINGS_KEY, JSON.stringify({ enabled: this.enabled })); } catch { /* ignore */ }
    return this.enabled;
  }
  toggle() { return this.set(!this.enabled); }

  colourOf(grade) { return [...(grade?.shadowDst || DEFAULT_SHADOW_RGB)].slice(0, 3); } // shadowDst may carry an alpha

  /** 1x tile source for alpha work: the 1x set when loaded, else the zoom set (nearest copies of 1x). */
  _src(v) { return v.tileset1x || v.tileset; }

  _bottomOf(v, memo) {
    const ts = this._src(v), S = ts.size, k = S / TILE;
    return (t) => {
      if (memo.has(t.id)) return memo.get(t.id);
      const img = ts.images.get((ts.byId.get(t.id) || t).sheet);
      let col = null;
      if (img) {
        const sa = sheetAlpha(img), tt = ts.byId.get(t.id) || t, sx = (tt.index % ts.columns) * S, sy = Math.floor(tt.index / ts.columns) * S;
        col = new Int16Array(TILE).fill(-1);
        for (let c = 0; c < TILE; c++) for (let r = TILE - 1; r >= 0; r--) {
          if (sa.a[((sy + r * k) * sa.w + sx + c * k) * 4 + 3] >= 128) { col[c] = r; break; }
        }
      }
      memo.set(t.id, col);
      return col;
    };
  }

  /** Build the static layer (native px, black + baked alpha) for the current map. */
  _build(v, prof) {
    const t0 = performance.now(), m = v.map, byId = v.tileset.byId, W = m.width * TILE, H = m.height * TILE;
    const memo = new Map(), bottomOf = this._bottomOf(v, memo);
    const objects = prof.shadows ? findObjects(m, byId, prof) : [];
    const walls = wallBaseCells(m, byId, prof);
    const out = newCanvas(W, H), g = out.getContext('2d');
    const layer = (alpha, paint) => {
      if (!alpha) return;
      const c = newCanvas(W, H), x = c.getContext('2d');
      x.fillStyle = '#000'; paint(x);
      g.globalAlpha = Math.min(1, alpha / 255); g.drawImage(c, 0, 0); g.globalAlpha = 1;
      c.width = c.height = 0;
    };
    const wb = prof.wall_base;
    if (walls.length) {
      const rimC = Math.max(0, Math.round((wb.rim || 0) / 2));
      layer(wb.alpha, (x) => {
        for (const w of walls) {
          const X = w.x * TILE, Y = w.y * TILE;
          x.save(); x.beginPath(); x.rect(X, Y, TILE, TILE); x.clip();
          if (w.top) {
            x.fillRect(X, Y, TILE, even(wb.px));
            for (let r = 0; r < rimC; r++) for (let px = X; px < X + TILE; px += 2) { const py = Y + even(wb.px) + r * 2; if (ditherOn(px, py)) x.fillRect(px, py, 2, 2); }
          }
          for (const [side, n] of [['left', wb.side_left_px], ['right', wb.side_right_px]]) {
            if (!w[side] || !n) continue;
            const sw = even(n), sx = side === 'left' ? X : X + TILE - sw;
            x.fillRect(sx, Y, sw, TILE);
            for (let r = 0; r < rimC; r++) for (let py = Y; py < Y + TILE; py += 2) { const px = side === 'left' ? X + sw + r * 2 : sx - 2 - r * 2; if (ditherOn(px, py)) x.fillRect(px, py, 2, 2); }
          }
          x.restore();
        }
      });
      layer(wb.corner_alpha, (x) => { // inner corners: a dithered quarter-oval tucked into the corner (clipped to the cell)
        const n = even(wb.corner_px), cc = n; // shape is 2n wide/high, centred on the corner point
        for (const w of walls) {
          const X = w.x * TILE, Y = w.y * TILE;
          x.save(); x.beginPath(); x.rect(X, Y, TILE, TILE); x.clip();
          if (w.cornerL) paintShape(x, X - cc, Y - cc, cc, cc, 1, 'oval', true);
          if (w.cornerR) paintShape(x, X + TILE - cc, Y - cc, cc, cc, 1, 'oval', true);
          x.restore();
        }
      });
    }
    const boxes = [];
    for (const o of objects) {
      const p = tweakFor(o.name, prof), foot = objectFoot(o.cells, bottomOf, p.band);
      if (foot) boxes.push(shadowBox(foot, p));
    }
    if (boxes.length) layer(prof.alpha, (x) => {
      const rimC = Math.max(0, Math.round(prof.rim / 2));
      for (const b of boxes) paintShape(x, b.x, b.y, b.w / 2, b.h / 2, rimC, b.shape, prof.dither);
    });
    // cut the casters' own pixels out: the shadow shows only on the floor around them
    const ts = this._src(v), S = ts.size;
    g.globalCompositeOperation = 'destination-out'; g.imageSmoothingEnabled = false;
    for (const o of objects) for (const [x, y, t] of o.cells) {
      const tt = ts.byId.get(t.id) || t, img = ts.images.get(tt.sheet);
      if (img) g.drawImage(img, (tt.index % ts.columns) * S, Math.floor(tt.index / ts.columns) * S, S, S, x * TILE, y * TILE, TILE, TILE);
    }
    g.globalCompositeOperation = 'source-over';
    // occupancy per CHUNK x CHUNK block, so the per-frame blit skips empty floor (fill cost, not CPU, dominates)
    const cw = Math.ceil(W / CHUNK), chn = Math.ceil(H / CHUNK), occ = new Uint8Array(cw * chn);
    if (boxes.length || walls.length) {
      const a = g.getImageData(0, 0, W, H).data;
      for (let y = 0; y < H; y++) { const row = y * W, cy = ((y / CHUNK) | 0) * cw; for (let x = 0; x < W; x++) if (a[(row + x) * 4 + 3]) { occ[cy + ((x / CHUNK) | 0)] = 1; x = (((x / CHUNK) | 0) + 1) * CHUNK - 1; } }
    }
    const buildMs = performance.now() - t0;
    this.stats.buildMs = Math.round(buildMs * 10) / 10; this.stats.objects = boxes.length; this.stats.walls = walls.length;
    return { canvas: out, colour: null, boxes, walls: walls.length, buildMs, rects: occupancyRects(occ, cw, chn, CHUNK, W, H) };
  }

  _entry(v, prof) {
    const m = v.map, sig = mapSignature(m, [...new Set(['ground', ...prof.layers])]), srcKey = this._src(v)?.url || '';
    let e = this.cache.get(m.name);
    if (!e || e.sig !== sig || e.prof !== prof || e.srcKey !== srcKey || e.map !== m) {
      if (e) e.canvas.width = e.canvas.height = 0;
      e = { ...this._build(v, prof), sig, prof, srcKey, map: m };
      this._builtMs = e.buildMs; // one-off; kept out of the per-frame timer
      this.cache.delete(m.name); this.cache.set(m.name, e);
      while (this.cache.size > 3) { const [k, old] = this.cache.entries().next().value; old.canvas.width = old.canvas.height = 0; this.cache.delete(k); }
    }
    const [r, gg, b] = this.colourOf(v.grade), ck = `${r},${gg},${b}`;
    if (e.colour !== ck) { // recolour in place: alpha is kept, colour becomes the grade's shadow colour
      const g = e.canvas.getContext('2d');
      g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgb(${r},${gg},${b})`; g.fillRect(0, 0, e.canvas.width, e.canvas.height);
      g.globalCompositeOperation = 'source-over'; e.colour = ck;
    }
    return e;
  }

  /** Static part (object contact shadows + wall base): one cropped, integer-zoomed blit. */
  drawStatic(ctx, v) {
    if (!this.enabled || !v.map || !v.tileset) return;
    const t0 = performance.now(), prof = profileFor(this.cfg, v.map.name);
    if (!prof.shadows && !prof.wall_base.enabled) return;
    const e = this._entry(v, prof), z = v.zoom, cam = v.cam, c = e.canvas;
    const vx0 = Math.max(0, Math.floor(cam.x)), vy0 = Math.max(0, Math.floor(cam.y));
    const vx1 = Math.min(c.width, Math.ceil(cam.x + ctx.canvas.width / z)), vy1 = Math.min(c.height, Math.ceil(cam.y + ctx.canvas.height / z));
    for (const r of e.rects) { // non-overlapping rects around the shadow pixels only (fill cost dominates, not CPU)
      const x0 = Math.max(vx0, r[0]), y0 = Math.max(vy0, r[1]), x1 = Math.min(vx1, r[2]), y1 = Math.min(vy1, r[3]);
      if (x1 > x0 && y1 > y0) ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0, (x0 - cam.x) * z, (y0 - cam.y) * z, (x1 - x0) * z, (y1 - y0) * z);
    }
    this._staticMs = performance.now() - t0 - (this._builtMs || 0); this._builtMs = 0; // CPU side of the pass (decals/life between the two calls not counted)
  }

  _actorSprite(w, h, rimC, rgb, alpha) {
    const key = `${w}x${h}|${rimC}|${rgb}|${alpha}`;
    let c = this.actorSprites.get(key);
    if (!c) {
      c = newCanvas(w, h); const g = c.getContext('2d');
      g.fillStyle = `rgba(${rgb},${alpha / 255})`;
      paintShape(g, 0, 0, w / 2, h / 2, rimC, 'oval', true);
      this.actorSprites.set(key, c);
      if (this.actorSprites.size > 32) this.actorSprites.delete(this.actorSprites.keys().next().value);
    }
    return c;
  }

  /** Per-frame contact shadows under characters (player, NPCs, follower). Hopping actors keep the renderer's hop shadow. */
  drawActors(ctx, v, actors) {
    if (!this.enabled || !v.map) { this.stats.frameMs = 0; return; }
    const t0 = performance.now(), prof = profileFor(this.cfg, v.map.name), A = prof.actors, z = v.zoom;
    if (A.enabled) {
      const rgb = this.colourOf(v.grade).join(','), rimC = Math.max(0, Math.round(prof.rim / 2));
      for (const a of actors) {
        if (a.lift > 0 || !a.img) continue;
        const creature = (a.h || 96) <= 64;
        const w = even(creature ? A.creature_w : A.w), h = even(creature ? A.creature_h : A.h);
        const img = this._actorSprite(w, h, prof.dither ? rimC : 0, rgb, A.alpha);
        const X = Math.round(a.px + TILE / 2 - w / 2 + A.offset[0]), Y = Math.round(a.py + TILE - A.feet - h / 2 + A.offset[1]);
        ctx.drawImage(img, 0, 0, w, h, (X - v.cam.x) * z, (Y - v.cam.y) * z, w * z, h * z);
      }
    }
    const ms = performance.now() - t0 + (this._staticMs || 0); this._staticMs = 0;
    this.stats.frameMs = this.stats.frameMs * 0.9 + ms * 0.1;
  }

  state(v) {
    const prof = v?.map ? profileFor(this.cfg, v.map.name) : null, e = v?.map ? this.cache.get(v.map.name) : null;
    return { enabled: this.enabled, profile: prof ? (prof === this.cfg.indoor ? 'indoor' : 'outdoor') : null, objects: e?.boxes.length ?? 0,
      walls: e?.walls ?? 0, buildMs: e ? Math.round(e.buildMs * 10) / 10 : null, frameMs: Math.round(this.stats.frameMs * 1000) / 1000, colour: e?.colour ?? null,
      strength: this.cfg.strength ?? null, alpha: prof ? prof.alpha : null };
  }

  status(v) {
    const s = this.state(v);
    return `depth ${s.enabled ? 'on' : 'off'} [J] ${s.profile || ''} obj ${s.objects} wall ${s.walls} build ${s.buildMs ?? '-'}ms frame ${s.frameMs.toFixed(3)}ms`;
  }
}
