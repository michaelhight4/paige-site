// Kilumen overworld: canvas renderer. Crisp pixels only: smoothing off, integer zoom, integer offsets.
// Order (README 3 / tileset.json draw_order): ground -> decoration -> characters + overlay tiles flagged
// `ysort` (tall-grass fronts/tips), sorted by tile row with the character first on a tie, so the blades of its
// own cell cover its legs but blades in the row above never cover its head -> remaining overlay (canopies,
// roofs) always above characters -> debug -> fade.
import { TILE, HUMAN_W, HUMAN_H } from './constants.js';

export const SHADOW = 'rgba(26,18,38,0.376)'; // the kit's one translucent colour, rgba(26,18,38,96)

/** Pick the sheet frame for a tile at sim time `ms` (looping water, one-shot grass rustle). */
export function tileFrame(t, ms, rustleStart) {
  const a = t.animation;
  if (!a) return t.index;
  if (a.loop === false || a.type === 'rustle') {
    if (rustleStart == null) return a.idle_frame ?? t.index;
    const i = Math.floor((ms - rustleStart) / a.frame_ms);
    return i >= 0 && i < a.frames.length ? a.frames[i] : (a.idle_frame ?? t.index);
  }
  return a.frames[Math.floor(ms / a.frame_ms) % a.frames.length];
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resetContext();
  }

  /** Setting canvas.width/height resets context state, so this must run after every resize. */
  resetContext() {
    const c = this.ctx;
    c.imageSmoothingEnabled = false;
    c.imageSmoothingQuality = 'low';
  }

  /**
   * @param {object} v view: {map, tileset, zoom, cam:{x,y}, ms, rustles:Map, actors:[...], fade, debug, drawDebug}
   */
  draw(v) {
    const { ctx } = this, z = v.zoom, W = this.canvas.width, H = this.canvas.height;
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    if (!v.map || !v.tileset) return;
    const m = v.map, cam = v.cam;
    const x0 = Math.max(0, Math.floor(cam.x / TILE)), y0 = Math.max(0, Math.floor(cam.y / TILE));
    const x1 = Math.min(m.width - 1, Math.floor((cam.x + W / z - 1) / TILE));
    const y1 = Math.min(m.height - 1, Math.floor((cam.y + H / z - 1) / TILE));

    for (const layer of ['ground', 'decoration'])
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.tile(v, m.tile(layer, x, y), x, y);

    const actors = [...v.actors].sort((a, b) => a.feet - b.feet);
    let ai = 0;
    for (let y = y0; y <= y1; y++) {
      const rowKey = (y + 1) * TILE;
      while (ai < actors.length && actors[ai].feet <= rowKey) this.actor(v, actors[ai++]);
      for (let x = x0; x <= x1; x++) { const id = m.tile('overlay', x, y); if (id && v.tileset.byId.get(id)?.ysort) this.tile(v, id, x, y); }
    }
    while (ai < actors.length) this.actor(v, actors[ai++]);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const id = m.tile('overlay', x, y);
      if (id && !v.tileset.byId.get(id)?.ysort) this.tile(v, id, x, y);
    }

    if (v.debug && v.drawDebug) v.drawDebug(ctx, v, { x0, y0, x1, y1 });
    if (v.fade > 0) {
      ctx.globalAlpha = Math.min(1, v.fade);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  tile(v, id, x, y) {
    if (!id) return;
    const ts = v.tileset, t = ts.byId.get(id);
    if (!t) return;
    const img = ts.images.get(t.sheet);
    if (!img) return;
    const idx = tileFrame(t, v.ms, v.rustles?.get(x + ',' + y));
    const S = ts.size, D = TILE * v.zoom;
    this.ctx.drawImage(img, (idx % ts.columns) * S, Math.floor(idx / ts.columns) * S, S, S,
      (x * TILE - v.cam.x) * v.zoom, (y * TILE - v.cam.y) * v.zoom, D, D);
  }

  /** Human actor: 64x96 native, feet at bottom-centre of its tile; `lift` raises it for a ledge hop. */
  actor(v, a) {
    const ctx = this.ctx, z = v.zoom;
    const sx = (a.px - v.cam.x) * z, groundY = (a.py + TILE - v.cam.y) * z;
    if (a.lift > 0) { // pixel shadow on the ground under a hopping actor
      ctx.fillStyle = SHADOW;
      for (const [w, dy] of [[20, -4], [28, -3], [28, -2], [20, -1]])
        ctx.fillRect(sx + ((TILE - w) / 2) * z, groundY + dy * z, w * z, z);
    }
    if (!a.img) return;
    const k = a.sheetScale; // 1, 2 or 3: the sheet is pre-scaled nearest-neighbour
    ctx.drawImage(a.img, a.col * HUMAN_W * k, a.row * HUMAN_H * k, HUMAN_W * k, HUMAN_H * k,
      sx, groundY - (HUMAN_H + a.lift) * z, HUMAN_W * z, HUMAN_H * z);
  }
}
