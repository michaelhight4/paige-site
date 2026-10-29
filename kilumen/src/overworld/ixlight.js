// Interiors v2 (Oct 28, 2026, DEV, behind ?ix2=1): plane lighting for redrawn interior furniture.
// Each redrawn sheet cell has a normal map (tiles_1x/interior_v2_n.png, built from a top/front/side plane-id map by
// tools/interiors_v2/draw_house.py). Per map and per outdoor phase we light those normals ONCE on the CPU (window light
// that follows the phase, a soft top-left key, warm/cool point lights for TV/stove at night), quantise the result to
// a few stepped levels (pixel-art look, no gradients) and cache it as two map-sized native canvases (lower = ground +
// decoration, upper = overlay tiles). Per frame it is 2 drawImage calls clipped to the view, like the depth pass.
// Toggle: ?ixlight=0 falls back to the baked shading only. No per-frame lighting maths, so phones stay cheap.
import { TILE } from './constants.js?v=v0.2.55-alpha';
import { loadImage } from './assets.js?v=v0.2.55-alpha';

const N_URL_RE = /tiles_\dx\/interior\.png$/;
const PHASE_LIGHT = { // window light by OUTDOOR phase: colour, strength
  dawn: { c: [214, 206, 236], s: 0.8 }, day: { c: [252, 246, 232], s: 1.0 }, dusk: { c: [196, 186, 230], s: 0.7 }, night: { c: [122, 194, 232], s: 0.35 },
};
const POINTS = { tv: { c: [122, 194, 232], s: 0.7, night: true }, home_kitchen_stove_1_0: { c: [252, 214, 104], s: 0.6, night: true }, home_radio: { c: [252, 214, 104], s: 0.25, night: true } };
const KEY = norm([-0.45, -0.55, 0.7]);
function norm(v) { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); }

// Oct 29, 2026: interiors v2 are ON by default. Kill switches: ?ix2=0 (old interiors), ?ixlight=0 (no plane lighting / night shade).
// alpha.js strips the query before the game boots, so it records the opt-outs in globals first.
export function ixFlags(search = (globalThis.location && globalThis.location.search) || '') {
  const q = new URLSearchParams(search);
  const on = !globalThis.KILUMEN_IX2_OFF && q.get('ix2') !== '0';
  return { ix2: on, light: on && !globalThis.KILUMEN_IXLIGHT_OFF && q.get('ixlight') !== '0' };
}

// ---- Indoor night shade (Oct 29, 2026). Interiors used to stay on the 'day' grade all night. With ix2 on, each indoor map gets a
// cached native-res shade per phase: a cool dark fill, punched open (stepped rings, 4x4 Bayer dither at the edges = pixel look) around
// lamps / stove / TV / windows, then a dithered coloured glow (warm lamps, blue TV, pale moon at windows). Public buildings (heal, lab,
// shop, office, hall, station) keep their lights on, so they only dim slightly. Drawn after characters + overlay (renderer 'night').
const SHADE = { night: 0.46, dusk: 0.2, dawn: 0.16 }, PUBLIC_K = 0.35, PUBLIC_RE = /^(heal_|lab_|mart_|station_|hall_|shop_|office_)|_hall_int$|^(shop|office|station|heal_centre)_int$/;
const B4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const SRC = [ // [name test, colour, radius px, glow strength]
  [/tv_back|(^|_)tv($|_)|crt/, [70, 146, 206], 112, 0.9], [/stove|fireplace|forge|oven/, [252, 196, 96], 100, 0.45],
  [/lamp|lantern|candle|side3|radio|heal_machine|crystal_display|specimen|server/, [252, 214, 140], 110, 0.4],
  [/heal_machine|counter_heal|terminal|(^|_)pc($|_)|desk_pc|crystal_polisher|timetable|club_dj_desk|club_stage_back|club_counter_case|cooler/, [150, 210, 236], 96, 0.35],
  [/^window|_window|window_|wall_upper_win/, [168, 196, 248], 84, 0.34, true]]; // v0.2.41: windows = cool moonlight (Gary: pools read warm), floor stays dim
export function isPublicInterior(name) { return PUBLIC_RE.test(name || ''); }
function buildShade(v, phase, indoorFn) {
  const m = v.map, a0 = SHADE[phase] || 0; if (!a0 || !indoorFn(m.name) || /^greystone/.test(m.name)) return null;
  const a = isPublicInterior(m.name) ? a0 * PUBLIC_K : a0, W = m.width * TILE, H = m.height * TILE, byId = v.tileset.byId, lights = [];
  for (const L of ['decoration', 'overlay', 'ground']) for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    const t = byId.get(m.tile(L, x, y)); if (!t || !t.name) continue;
    for (const [re, c, r, g, cool] of SRC) if (re.test(t.name)) { if (!lights.some((l) => Math.abs(l.x - x * TILE) < 40 && Math.abs(l.y - (y + (cool ? 1.2 : 0)) * TILE) < 40)) lights.push({ x: x * TILE + 32, y: y * TILE + (cool ? 112 : 40), c, r, g, cool }); break; }
  }
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d'), img = cx.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let lit = 0, best = null, bl = 0;
    for (const l of lights) { const f = 1 - Math.hypot(x - l.x, (y - l.y) * 1.25) / l.r; if (f > 0) { lit = Math.max(lit, f); if (f * l.g > bl) { bl = f * l.g; best = l; } } }
    const th = B4[y & 3][x & 3] / 16; let step = lit > 0.66 ? 1 : lit > 0.33 ? (th < 0.75 ? 0.75 : 0.5) : lit > 0 ? (th < 0.35 ? 0.4 : 0) : 0; // stepped + dithered pools
    if (best && best.cool) step = Math.min(step, 0.45); // moonlight never opens the shade to the warm day floor: it tints it cool instead
    const k = (y * W + x) * 4, sa = a * (1 - step);
    if (best && bl > th * 0.9 && step >= 0.4) { // coloured glow pixel (dithered)
      const ga = Math.min(0.7, bl) * (phase === 'night' ? 1 : 0.5);
      d[k] = best.c[0]; d[k + 1] = best.c[1]; d[k + 2] = best.c[2]; d[k + 3] = Math.round(Math.max(ga, sa) * 255 * 0.6); continue;
    }
    d[k] = 18; d[k + 1] = 14; d[k + 2] = 42; d[k + 3] = Math.round(sa * 255);
  }
  cx.putImageData(img, 0, 0); return cv;
}

const WALL_RE = /wall|iwall/, NOT_FLOOR_RE = /wall|stairs|window|door/;
export function edgeCells(map, byId) { // floor cells directly under a wall cell, with nothing standing on them
  const out = [], name = (L, x, y) => byId.get(map.tile(L, x, y))?.name || '';
  for (let y = 1; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const above = name('ground', x, y - 1), here = name('ground', x, y);
    if (!WALL_RE.test(above) || !here || NOT_FLOOR_RE.test(here)) continue;
    if (map.tile('decoration', x, y) || map.tile('overlay', x, y) || map.tile('decoration', x, y - 1)) continue;
    out.push([x, y]);
  }
  return out;
}
function buildEdges(v) {
  const cells = edgeCells(v.map, v.tileset.byId); if (!cells.length) return null;
  const cv = new OffscreenCanvas(v.map.width * TILE, v.map.height * TILE), c = cv.getContext('2d');
  for (const [x, y] of cells) {
    const X = x * TILE, Y = y * TILE;
    c.fillStyle = 'rgba(25,18,16,0.85)'; c.fillRect(X, Y, TILE, 2);
    c.fillStyle = 'rgba(26,18,38,0.38)'; c.fillRect(X, Y + 2, TILE, 4);
    c.fillStyle = 'rgba(26,18,38,0.38)';
    for (let yy = 6; yy < 12; yy++) for (let xx = (yy & 1); xx < TILE; xx += 2 + (yy > 8 ? 2 : 0)) c.fillRect(X + xx, Y + yy, 1, 1);
  }
  return cv;
}

export class IxLight {
  constructor(flags = ixFlags(), indoorFn = null) { this.flags = flags; this.cache = new Map(); this.nimg = null; this.indoor = indoorFn; this.shade = new Map(); }
  async load(tilesetUrl) {
    if (!this.flags.light || this.nimg) return;
    try { this.nimg = await loadImage(new URL('tiles_1x/interior_v2_n.png', tilesetUrl).href); } catch (e) { console.warn('ixlight: no normal sheet', e.message); this.flags.light = false; }
  }
  _build(v, phase) {
    const m = v.map, W = m.width * TILE, H = m.height * TILE, byId = v.tileset.byId;
    const tmp = new OffscreenCanvas(W, H), tc = tmp.getContext('2d', { willReadFrequently: true });
    const lights = [], P = PHASE_LIGHT[phase] || PHASE_LIGHT.day, night = phase === 'night' || phase === 'dusk';
    const out = {};
    for (const [key, layers] of [['lower', ['ground', 'decoration']], ['upper', ['overlay']]]) {
      tc.clearRect(0, 0, W, H); let any = false;
      for (const L of layers) for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
        const id = m.tile(L, x, y); const t = id && byId.get(id); if (!t) continue;
        if (key === 'lower' && /^window_.*_b$/.test(t.name)) lights.push({ x: x * TILE + 32, y: y * TILE + 56, z: 40, c: P.c, s: P.s, r: 200 });
        const pt = POINTS[t.name]; if (key === 'lower' && pt && (!pt.night || night)) lights.push({ x: x * TILE + 32, y: y * TILE + 24, z: 24, c: pt.c, s: pt.s, r: 110 });
        if (!N_URL_RE.test(t.sheet)) continue;
        const i = t.index; tc.drawImage(this.nimg, (i % 16) * TILE, Math.floor(i / 16) * TILE, TILE, TILE, x * TILE, y * TILE, TILE, TILE); any = true;
      }
      out[key] = any ? tc.getImageData(0, 0, W, H) : null;
    }
    const res = {};
    for (const key of ['lower', 'upper']) {
      const src = out[key]; if (!src) { res[key] = null; continue; }
      const d = src.data, o = new ImageData(W, H), od = o.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = (y * W + x) * 4; if (!d[k + 3]) continue;
        const n = [d[k] / 127.5 - 1, d[k + 1] / 127.5 - 1, d[k + 2] / 127.5 - 1];
        let val = 0.3 * Math.max(0, n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2]), best = 0, col = P.c;
        for (const l of lights) {
          const dx = l.x - x, dy = l.y - y, dz = l.z, dist = Math.hypot(dx, dy, dz);
          const lam = Math.max(0, (n[0] * dx + n[1] * dy + n[2] * dz) / dist), f = l.s * lam / (1 + (dist / l.r) ** 2);
          val += f; if (f > best) { best = f; col = l.c; }
        }
        const delta = val - 0.42;
        let a = 0, c = col;
        if (delta > 0.3) a = 0.24; else if (delta > 0.14) a = 0.12;
        else if (delta < -0.24) { a = 0.3; c = [26, 18, 38]; } else if (delta < -0.1) { a = 0.15; c = [26, 18, 38]; }
        if (!a) continue;
        od[k] = c[0]; od[k + 1] = c[1]; od[k + 2] = c[2]; od[k + 3] = Math.round(a * 255);
      }
      const cv = new OffscreenCanvas(W, H); cv.getContext('2d').putImageData(o, 0, 0); res[key] = cv;
    }
    return res;
  }
  draw(ctx, v, key) {
    if (key === 'night') return this.drawNight(ctx, v);
    if (key === 'lower') this.drawEdges(ctx, v);
    if (!this.flags.light || !this.nimg || !v.map || !v.tileset) return;
    const phase = v.phase || 'day', ck = v.map.name + '|' + phase;
    let e = this.cache.get(ck);
    if (!e) { e = this._build(v, phase); this.cache.clear(); this.cache.set(ck, e); }
    const c = e[key]; if (!c) return;
    const z = v.zoom, cam = v.cam;
    const x0 = Math.max(0, Math.floor(cam.x)), y0 = Math.max(0, Math.floor(cam.y));
    const x1 = Math.min(c.width, Math.ceil(cam.x + ctx.canvas.width / z)), y1 = Math.min(c.height, Math.ceil(cam.y + ctx.canvas.height / z));
    if (x1 > x0 && y1 > y0) ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0, (x0 - cam.x) * z, (y0 - cam.y) * z, (x1 - x0) * z, (y1 - y0) * z);
  }
  /** v0.2.41 interior standard on EVERY room (not just the starter house): a dark line + soft dithered shadow where the wall meets the
   *  floor, cached per map at native res. Only on floor cells with no furniture on them, so pieces against the wall keep their art. */
  drawEdges(ctx, v) {
    if (!this.flags.ix2 || !this.indoor || !v.map || !v.tileset || !this.indoor(v.map.name)) return;
    const m = v.map, ck = m.name;
    if (!this.edge || this.edge.k !== ck) this.edge = { k: ck, c: buildEdges(v) };
    const c = this.edge.c; if (!c) return;
    const z = v.zoom, cam = v.cam, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const x0 = Math.max(0, Math.floor(cam.x)), y0 = Math.max(0, Math.floor(cam.y));
    const x1 = Math.min(c.width, Math.ceil(cam.x + ctx.canvas.width / z)), y1 = Math.min(c.height, Math.ceil(cam.y + ctx.canvas.height / z));
    if (x1 > x0 && y1 > y0) ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0, (x0 - cam.x) * z, (y0 - cam.y) * z, (x1 - x0) * z, (y1 - y0) * z);
    ctx.imageSmoothingEnabled = sm;
  }
  state() { return { ...this.flags, cached: [...this.cache.keys()] }; }
  drawNight(ctx, v) {
    if (!this.flags.light || !this.indoor || !v.map || !v.tileset) return;
    const phase = v.phase || 'day', ck = v.map.name + '|' + phase;
    if (!this.shade.has(ck)) { this.shade.clear(); this.shade.set(ck, buildShade(v, phase, this.indoor)); }
    const c = this.shade.get(ck); if (!c) return;
    const z = v.zoom, cam = v.cam, sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    const x0 = Math.max(0, Math.floor(cam.x)), y0 = Math.max(0, Math.floor(cam.y));
    const x1 = Math.min(c.width, Math.ceil(cam.x + ctx.canvas.width / z)), y1 = Math.min(c.height, Math.ceil(cam.y + ctx.canvas.height / z));
    if (x1 > x0 && y1 > y0) ctx.drawImage(c, x0, y0, x1 - x0, y1 - y0, (x0 - cam.x) * z, (y0 - cam.y) * z, (x1 - x0) * z, (y1 - y0) * z);
    ctx.imageSmoothingEnabled = sm;
  }
}
