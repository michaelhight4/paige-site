// Kilumen overworld: canvas renderer. Crisp pixels only: smoothing off, integer zoom, integer offsets.
// Order (README 3 / tileset.json draw_order): ground -> decoration -> characters + overlay tiles flagged
// `ysort` (tall-grass fronts/tips), sorted by tile row with the character first on a tie, so the blades of its
// own cell cover its legs but blades in the row above never cover its head -> remaining overlay (canopies,
// roofs) always above characters -> living-world `over` (smoke, butterflies, motes, bird shadows, cloud shadows)
// -> fog -> living-world `top` (birds, fireflies) -> debug -> fade. Living `under` (fish) runs after the decals.
// Depth pass (depth.js, Oct 22 2026): its cached static layer (object contact shadows + indoor wall-base shading) runs
// right after ground/decoration, before the decals; the character contact shadows run after living `under`, just
// before the first character. Both are under every character and over the floor.
import { TILE, HUMAN_W, HUMAN_H } from './constants.js?v=v0.2.94-alpha';

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
    ctx.fillStyle = '#000'; // blank background: anything outside the map stays black (centre camera, Oct 23, 2026)
    ctx.fillRect(0, 0, W, H);
    if (!v.map || !v.tileset) return;
    v.wind?.frame(v); // world wind (wind.js): per-frame strength / on-off, draw-time only
    const m = v.map, cam = v.cam;
    if (v.outside === 'edge') this.edgeFill(v, W, H); // mobile display.outsideMap without the centre camera: fill around short maps
    const x0 = Math.max(0, Math.floor(cam.x / TILE)), y0 = Math.max(0, Math.floor(cam.y / TILE));
    const x1 = Math.min(m.width - 1, Math.floor((cam.x + W / z - 1) / TILE));
    const y1 = Math.min(m.height - 1, Math.floor((cam.y + H / z - 1) / TILE));

    for (const layer of ['ground', 'decoration'])
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.tile(v, m.tile(layer, x, y), x, y);
    v.ixlight?.draw(ctx, v, 'lower'); // Interiors v2: cached plane lighting on redrawn furniture + floor light spill
    v.depth?.drawStatic(ctx, v); // depth pass: contact shadows under furniture/decoration + wall-base shading (cached per map)
    v.nightfx?.drawWindows(ctx, v); // Night FX: lit window glass (dusk on, some dark late; under characters)
    // decals "under characters" (footprints: tileset animation type 'fade', frame picked by age)
    for (const d of v.decals || []) if (d.x >= x0 && d.x <= x1 && d.y >= y0 && d.y <= y1) this.tile(v, d.id, d.x, d.y, d.frame);
    v.life?.under(ctx, v); // living world: fish shadows + ripples on water, under characters
    v.depth?.drawActors(ctx, v, v.actors); // depth pass: contact shadows under every character (before any character)

    const actors = [...v.actors].sort((a, b) => a.feet - b.feet || (a.order || 0) - (b.order || 0));
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
    v.ixlight?.draw(ctx, v, 'upper'); // Interiors v2: same lighting on overlay-row furniture tops
    for (const o of v.overlays || []) this.tile(v, o.id, o.x, o.y); // engine overlays on occupied cells (bin flies)
    v.tells?.(ctx, v); // puzzle tells (progression/puzzle_tells.js): static arrows / pairs / channel colours / pillars, shimmer, ripple
    v.life?.over(ctx, v); // living world: smoke, butterflies, motes, bird shadows, then cloud shadows (shade sprites too)
    v.ixlight?.draw(ctx, v, 'night'); // Interiors v2: indoor night shade + lamp/TV/stove pools (interiors used to stay on the day grade)
    v.nightfx?.drawLights(ctx, v); // Night FX: warm lamp/window pools, additive on a cached low-res buffer (+ flame flicker)
    if (m.layers.fog) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.tile(v, m.tile('fog', x, y), x, y);
    v.mood?.draw(ctx, v); // cinematic mood (mood.js): area tint, sun rays, vignette, ambient particles; under birds/firefly glow/markers
    v.life?.top(ctx, v); // living world: birds in the sky, firefly glow (emissive)
    v.markers?.(ctx, v); // golden spinning arrows: starter cases, quest items (marker.js; above the world, under the fade)

    if (v.debug && v.drawDebug) v.drawDebug(ctx, v, { x0, y0, x1, y1 });
    if (v.fade > 0) {
      ctx.globalAlpha = Math.min(1, v.fade);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Mobile full screen pass (Oct 23, 2026): cells of the view that fall outside the map (a map narrower or shorter than the
   * screen, centred by the camera) get the map's nearest edge ground tile (clamped row/column, so walls and floor run on
   * outward) and a flat shade (v.edgeShade) so the real room still reads. Same integer zoom and whole-px cells as tile().
   * pc never sets v.outside.
   */
  edgeFill(v, W, H) {
    const m = v.map, cam = v.cam, z = v.zoom;
    const vx0 = Math.floor(cam.x / TILE), vy0 = Math.floor(cam.y / TILE);
    const vx1 = Math.floor((cam.x + W / z - 1) / TILE), vy1 = Math.floor((cam.y + H / z - 1) / TILE);
    if (vx0 >= 0 && vy0 >= 0 && vx1 < m.width && vy1 < m.height) return;
    const cl = (n, hi) => Math.max(0, Math.min(hi - 1, n));
    for (let y = vy0; y <= vy1; y++) for (let x = vx0; x <= vx1; x++) {
      if (x >= 0 && y >= 0 && x < m.width && y < m.height) continue;
      this.tile(v, m.tile('ground', cl(x, m.width), cl(y, m.height)), x, y); // edge tile drawn at the outside cell (same grade path)
    }
    const ctx = this.ctx, mx = -cam.x * z, my = -cam.y * z, mw = m.width * TILE * z, mh = m.height * TILE * z;
    ctx.fillStyle = v.edgeShade || 'rgba(26,18,38,0.55)';
    if (my > 0) ctx.fillRect(0, 0, W, my);
    if (my + mh < H) ctx.fillRect(0, my + mh, W, H - my - mh);
    const top = Math.max(0, my), bot = Math.min(H, my + mh);
    if (mx > 0) ctx.fillRect(0, top, mx, bot - top);
    if (mx + mw < W) ctx.fillRect(mx + mw, top, W - mx - mw, bot - top);
  }

  /**
   * One tile. v.swap maps ids for stateful tiles (windows follow the outdoor phase). With a non-identity grade
   * the native (1x) sheet is palette-graded once (cached) and scaled by the integer zoom; at day the pre-scaled
   * sheet for this zoom is blitted 1:1. Both paths are nearest-neighbour on whole-pixel cells: no seams.
   */
  tile(v, id, x, y, frame) {
    if (!id) return;
    id = v.swap?.get(id) ?? id;
    let ts = v.tileset, t = ts.byId.get(id);
    if (!t) return;
    const idx = frame ?? tileFrame(t, v.ms, v.rustles?.get(x + ',' + y));
    let img, S = ts.size;
    if (v.grade && !v.grade.identity && v.tileset1x && v.gradeImage) {
      ts = v.tileset1x; t = ts.byId.get(id) || t;
      img = v.gradeImage(ts.images.get(t.sheet), v.grade, 'map', v.emissive?.get(t.sheet)); S = ts.size; // lit only inside the emissive mask
    } else img = ts.images.get(t.sheet);
    if (!img) return;
    const D = TILE * v.zoom;
    const wk = frame == null && v.wind ? v.wind.kind(id) : 0;
    if (wk) {
      const rs = wk === 2 ? v.rustles?.get(x + ',' + y) : null;
      if (v.wind.draw(this.ctx, img, (idx % ts.columns) * S, Math.floor(idx / ts.columns) * S, S,
        (x * TILE - v.cam.x) * v.zoom, (y * TILE - v.cam.y) * v.zoom, D, v.zoom, wk, x, y, rs == null ? null : v.ms - rs)) return;
    }
    this.ctx.drawImage(img, (idx % ts.columns) * S, Math.floor(idx / ts.columns) * S, S, S,
      (x * TILE - v.cam.x) * v.zoom, (y * TILE - v.cam.y) * v.zoom, D, D);
  }

  /**
   * Actor: humans 64x96, creatures 64x64 (a.w / a.h, native px), feet at the bottom-centre of the tile; `lift`
   * raises it for a ledge hop. a.sheetScale = 1, 2 or 3 (pre-scaled nearest sheet; graded sprites use 1x).
   */
  actor(v, a) {
    const ctx = this.ctx, z = v.zoom, w = a.w || HUMAN_W, h = a.h || HUMAN_H;
    const sx = (a.px - v.cam.x) * z, groundY = (a.py + TILE - v.cam.y) * z;
    if (a.lift > 0) { // pixel shadow on the ground under a hopping actor
      ctx.fillStyle = SHADOW;
      for (const [sw, dy] of [[20, -4], [28, -3], [28, -2], [20, -1]])
        ctx.fillRect(sx + ((TILE - sw) / 2) * z, groundY + dy * z, sw * z, z);
    }
    if (!a.img) return;
    const k = a.sheetScale;
    if (a.sq) { // creature motion (creature_idle.js): scale about the feet centre, whole art px only
      const q = a.sq, dw = Math.round(w * q.sx) * z, dh = Math.round(h * q.sy) * z;
      ctx.drawImage(a.img, a.col * w * k, a.row * h * k, w * k, h * k, sx + (TILE * z - dw) / 2, groundY - dh - Math.round(q.lift) * z, dw, dh);
      return;
    }
    ctx.drawImage(a.img, a.col * w * k, a.row * h * k, w * k, h * k,
      sx + ((TILE - w) / 2) * z, groundY - (h + (a.lift || 0)) * z, w * z, h * z);
  }
}
