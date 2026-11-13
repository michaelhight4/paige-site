// Interiors v2 (Oct 28, 2026, DEV, behind ?ix2=1): plane lighting for redrawn interior furniture.
// Each redrawn sheet cell has a normal map (tiles_1x/interior_v2_n.png, built from a top/front/side plane-id map by
// tools/interiors_v2/draw_house.py). Per map and per outdoor phase we light those normals ONCE on the CPU (window light
// that follows the phase, a soft top-left key, warm/cool point lights for TV/stove at night), quantise the result to
// a few stepped levels (pixel-art look, no gradients) and cache it as two map-sized native canvases (lower = ground +
// decoration, upper = overlay tiles). Per frame it is 2 drawImage calls clipped to the view, like the depth pass.
// Toggle: ?ixlight=0 falls back to the baked shading only. No per-frame lighting maths, so phones stay cheap.
import { TILE } from './constants.js';
import { loadImage } from './assets.js';

const N_URL_RE = /tiles_\dx\/interior\.png$/;
const PHASE_LIGHT = { // window light by OUTDOOR phase: colour, strength
  dawn: { c: [246, 160, 186], s: 0.8 }, day: { c: [252, 246, 232], s: 1.0 }, dusk: { c: [240, 136, 104], s: 0.75 }, night: { c: [122, 194, 232], s: 0.35 },
};
const POINTS = { tv: { c: [122, 194, 232], s: 0.7, night: true }, home_kitchen_stove_1_0: { c: [252, 214, 104], s: 0.6, night: true }, home_radio: { c: [252, 214, 104], s: 0.25, night: true } };
const KEY = norm([-0.45, -0.55, 0.7]);
function norm(v) { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); }

export function ixFlags(search = (globalThis.location && globalThis.location.search) || '') {
  const q = new URLSearchParams(search);
  const on = q.get('ix2') === '1' || !!globalThis.KILUMEN_IX2;
  return { ix2: on, light: on && q.get('ixlight') !== '0' };
}

export class IxLight {
  constructor(flags = ixFlags()) { this.flags = flags; this.cache = new Map(); this.nimg = null; }
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
  state() { return { ...this.flags, cached: [...this.cache.keys()] }; }
}
