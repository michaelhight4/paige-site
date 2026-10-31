// Kilumen overworld: canvas renderer. Crisp pixels only: smoothing off, integer zoom, integer offsets.
// Order (README 3 / tileset.json draw_order): ground -> decoration -> characters + overlay tiles flagged
// `ysort` (tall-grass fronts/tips), sorted by tile row with the character first on a tie, so the blades of its
// own cell cover its legs but blades in the row above never cover its head -> remaining overlay (canopies,
// roofs) always above characters -> living-world `over` (smoke, butterflies, motes, bird shadows, cloud shadows)
// -> fog -> living-world `top` (birds, fireflies) -> debug -> fade. Living `under` (fish) runs after the decals.
// Depth pass (depth.js, Oct 22 2026): its cached static layer (object contact shadows + indoor wall-base shading) runs
// right after ground/decoration, before the decals; the character contact shadows run after living `under`, just
// before the first character. Both are under every character and over the floor.
import { TILE, HUMAN_W, HUMAN_H } from './constants.js?v=v0.2.104-alpha';
import { waterClass, familyOf, edgeMask, variantTile } from './water_depth.js?v=v0.2.104-alpha'; // one consistent deep water look

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
  draw(v, { ui = true } = {}) {
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
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.tile(v, m.tile(layer, x, y), x, y, undefined, layer === 'ground');
    v.r9fx?.decorationFx?.(ctx, v); // decoration_fx: Wellspire lab tank particle overlays (src/region9/tank_overlays.js), before characters; Ondravel (r9fx.draw) above
    v.ixlight?.draw(ctx, v, 'lower'); // Interiors v2: cached plane lighting on redrawn furniture + floor light spill
    v.depth?.drawStatic(ctx, v); // depth pass: contact shadows under furniture/decoration + wall-base shading (cached per map)
    v.nightfx?.drawWindows(ctx, v); // Night FX: lit window glass (dusk on, some dark late; under characters)
    // decals "under characters" (footprints: tileset animation type 'fade', frame picked by age)
    for (const d of v.decals || []) if (d.x >= x0 && d.x <= x1 && d.y >= y0 && d.y <= y1) this.tile(v, d.id, d.x, d.y, d.frame);
    v.life?.under(ctx, v); // living world: fish shadows + ripples on water, under characters
    v.r9fx?.under?.(ctx, v); // Wellspire v3 lab (src/region9/lab_fx.js): floors, props, Ondravel's tank, under characters
    for (const a of v.actors) a._swim = onWater(v, a); // Gary (Oct 30 2026): anyone on a water cell (swimmers, the player) is drawn swimming
    v.depth?.drawActors(ctx, v, v.actors.filter((a) => !a._swim)); // depth pass: contact shadows under every character (before any character); none on water

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
    // pet depth (Wellspire fixes, Oct 30 2026): the follower sorts by its feet like the player, so a flat overlay tile in a
    // row above its feet (shelf goods, counter tops, lamp heads) must not cover its head; redraw it over those tiles only
    for (const a of actors) {
      if (!a.follower || a._swim) continue;
      const fy = Math.round(a.py / TILE), c0 = Math.floor(a.px / TILE), c1 = Math.ceil(a.px / TILE), up = Math.ceil((a.h || TILE) / TILE);
      let hit = false;
      for (let y = fy - up; y < fy && !hit; y++) for (let x = c0; x <= c1; x++) { const id = m.tile('overlay', x, y); if (id && !v.tileset.byId.get(id)?.ysort) { hit = true; break; } }
      if (hit) this.actor(v, a);
    }
    v.ixlight?.draw(ctx, v, 'upper'); // Interiors v2: same lighting on overlay-row furniture tops
    for (const o of v.overlays || []) this.tile(v, o.id, o.x, o.y); // engine overlays on occupied cells (bin flies)
    v.tells?.(ctx, v); // puzzle tells (progression/puzzle_tells.js): static arrows / pairs / channel colours / pillars, shimmer, ripple
    v.life?.over(ctx, v); // living world: smoke, butterflies, motes, bird shadows, then cloud shadows (shade sprites too)
    v.ixlight?.draw(ctx, v, 'night'); // Interiors v2: indoor night shade + lamp/TV/stove pools (interiors used to stay on the day grade)
    v.nightfx?.drawLights(ctx, v); // Night FX: warm lamp/window pools, additive on a cached low-res buffer (+ flame flicker)
    if (m.layers.fog) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.tile(v, m.tile('fog', x, y), x, y);
    v.mood?.draw(ctx, v); v.r9fx?.draw(ctx, v); // r9fx: Wellspire's towering Ondravel + summit clouds / light / flash (src/region9/summit_fx.js). cinematic mood (mood.js): area tint, sun rays, vignette, ambient particles; under birds/firefly glow/markers
    v.life?.top(ctx, v); // living world: birds in the sky, firefly glow (emissive)
    if (ui) this.drawUi(v, { x0, y0, x1, y1 });
  }

  /** On-canvas UI above the world: quest markers, debug overlay, fade. Kept apart so the RTX look grades the world only. */
  drawUi(v, rng) {
    const { ctx } = this, W = this.canvas.width, H = this.canvas.height;
    if (!v.map || !v.tileset) return;
    if (!rng) { const z = v.zoom, m = v.map, cam = v.cam; rng = { x0: Math.max(0, Math.floor(cam.x / TILE)), y0: Math.max(0, Math.floor(cam.y / TILE)),
      x1: Math.min(m.width - 1, Math.floor((cam.x + W / z - 1) / TILE)), y1: Math.min(m.height - 1, Math.floor((cam.y + H / z - 1) / TILE)) }; }
    const { x0, y0, x1, y1 } = rng;
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
  tile(v, id, x, y, frame, ground = false) {
    if (!id) return;
    id = v.swap?.get(id) ?? id;
    let ts = v.tileset, t = ts.byId.get(id);
    if (!t) return;
    const idx = frame ?? tileFrame(t, v.ms, v.rustles?.get(x + ',' + y));
    let img, S = ts.size;
    const graded = v.grade && !v.grade.identity && v.tileset1x && v.gradeImage;
    const wc = ground && this.waterDepth !== false && v.waterDepth !== false ? waterClass(v.map, x, y) : 0; // water_depth.js: 2 = water (one deep look)
    if (graded) {
      ts = v.tileset1x; t = ts.byId.get(id) || t;
      img = wc ? ts.images.get(t.sheet) : v.gradeImage(ts.images.get(t.sheet), v.grade, 'map', v.emissive?.get(t.sheet)); S = ts.size; // lit only inside the emissive mask
    } else img = ts.images.get(t.sheet);
    if (!img) return;
    const D = TILE * v.zoom;
    if (wc) { // recolour the native cell first, then grade it like any tile (binary alpha, palette colours)
      let c = variantTile(img, (idx % ts.columns) * S, Math.floor(idx / ts.columns) * S, S, familyOf(t.name), wc, edgeMask(v.map, x, y, wc));
      if (c && graded) c = v.gradeImage(c, v.grade, 'map');
      if (c) { this.ctx.drawImage(c, 0, 0, S, S, (x * TILE - v.cam.x) * v.zoom, (y * TILE - v.cam.y) * v.zoom, D, D); return; }
      if (graded) img = v.gradeImage(img, v.grade, 'map', v.emissive?.get(t.sheet));
    }
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
    if (a.ride) return this.rider(v, a, sx, groundY, w, h, k); // Tideglide: Cal rides the lead Kilu, never swims
    if (a._swim) return this.swimmer(v, a, sx, groundY, w, h, k); // the pet swims too (Gary, Oct 30 2026)
    if (a.sq) { // creature motion (creature_idle.js): scale about the feet centre, whole art px only
      const q = a.sq, dw = Math.round(w * q.sx) * z, dh = Math.round(h * q.sy) * z;
      ctx.drawImage(a.img, a.col * w * k, a.row * h * k, w * k, h * k, sx + (TILE * z - dw) / 2, groundY - dh - Math.round(q.lift) * z, dw, dh);
      return;
    }
    ctx.drawImage(a.img, a.col * w * k, a.row * h * k, w * k, h * k,
      sx + ((TILE - w) / 2) * z, groundY - (h + (a.lift || 0)) * z, w * z, h * z);
  }

  /** Riding on water (Tideglide, Gary Oct 30 2026): the mount (lead Kilu, 64 or 96 px cells) is drawn swimming - cut at its
   *  waterline with the ripple ring - and Cal is drawn whole on its back, bobbing with it. No mount: Cal on the ring alone. */
  rider(v, a, sx, groundY, w, h, k) {
    const ctx = this.ctx, z = v.zoom, cx = Math.round(a.px / TILE), cy = Math.round(a.py / TILE);
    const bob = Math.round(Math.sin((v.ms || 0) / 520 + cx * 1.7 + cy * 0.9) * 1.5);
    let seat = groundY - (SWIM.CLINE - 6) * z + bob * z; // no mount: feet just above the ring
    const m = a.mount;
    if (m?.img) {
      const mw = m.w, msx = (m.px - v.cam.x) * z;
      this.swimmer(v, m, msx, groundY, mw, m.h, m.sheetScale || 1);
      const vis = Math.max(8, m.h - SWIM.CLINE - artTop(m.img, m.col, m.row, mw, m.sheetScale || 1)); // the mount's art above the water
      seat = groundY - SWIM.CLINE * z + bob * z - Math.round(Math.min(vis * (a.row === 0 || a.row === 3 ? 0.45 : 0.55), a.row === 0 || a.row === 3 ? 18 : 22)) * z; // on its back (tall heads/horns don't lift the seat)
      ctx.drawImage(a.img, a.col * w * k, a.row * h * k, w * k, h * k, sx + ((TILE - w) / 2) * z, seat - h * z, w * z, h * z);
      return;
    }
    this.swimmer(v, { ...a, img: null }, sx, groundY, w, h, k);
    ctx.drawImage(a.img, a.col * w * k, a.row * h * k, w * k, h * k, sx + ((TILE - w) / 2) * z, seat - h * z, w * z, h * z);
  }

  /** Swimming character: the body is cropped at the waterline (legs and hips under water), a gentle bob, a foam ring
   *  around the waterline and a darker translucent body band just under the surface. Whole art px only. */
  swimmer(v, a, sx, groundY, w, h, k) {
    const ctx = this.ctx, z = v.zoom, cx = Math.round(a.px / TILE), cy = Math.round(a.py / TILE), dx = sx + ((TILE - w) / 2) * z;
    if (a.swimSheet) {
      // Character models' swim sheet (4 stroke cols x down/left/right/up): body already cut at the waterline (cell y=66 =
      // SWIM.LINE above the feet), bob and ripple ring baked in, so it draws whole like a walk frame
      const col = Math.floor((v.ms || 0) / 180 + cx + cy) % 4;
      ctx.drawImage(a.img, col * w * k, a.row * h * k, w * k, h * k, dx, groundY - h * z, w * z, h * z);
      return;
    }
    // fallback until a sheet exists: walk sheet cut at the waterline (head, shoulders, arms), solid-pixel rings, no alpha
    const ph = (v.ms || 0) / 520 + cx * 1.7 + cy * 0.9, bob = Math.round(Math.sin(ph) * 1.5);
    const creature = h < HUMAN_H || !!a.follower, line = creature ? SWIM.CLINE : SWIM.LINE, crop = creature ? SWIM.CLINE : SWIM.CROP;
    const water = groundY - line * z + bob * z;               // waterline (screen px), y=66 in a human cell / y=44 in a creature cell
    const vis = h - crop, top = water - vis * z;
    if (a.img) ctx.drawImage(a.img, a.col * w * k, a.row * h * k, w * k, vis * k, dx, top, w * z, vis * z);
    // Gary's swim reference (Oct 30 2026): thin white ripple rings spreading out from the waist, plus a few water glints
    const mx = sx + (TILE / 2) * z, t = (v.ms || 0) / 1000 + cx * 0.37 + cy * 0.21;
    const ring = (rx, ry) => {
      ctx.fillStyle = SWIM.FOAM;
      let px0 = null;
      for (let ax = -rx; ax <= rx; ax++) {                     // 1-art-px ellipse outline, no gaps
        const ay = Math.round(ry * Math.sqrt(Math.max(0, 1 - (ax * ax) / (rx * rx))));
        const from = px0 == null ? ay : Math.min(ay, px0), to = px0 == null ? ay : Math.max(ay, px0);
        for (let yy = from; yy <= to; yy++) { ctx.fillRect(mx + ax * z, water + yy * z, z, z); ctx.fillRect(mx + ax * z, water - yy * z, z, z); }
        px0 = ay;
      }
    };
    ring(SWIM.RX - 4, SWIM.RY - 1);                      // hugging ring at the waist
    for (let n = 0; n < SWIM.RINGS; n++) {                     // spreading rings, fading as they grow
      const f = ((t / SWIM.PERIOD) + n / SWIM.RINGS) % 1;
      if (f < 0.75) ring(Math.round(SWIM.RX - 2 + f * SWIM.SPREAD), Math.round(SWIM.RY + f * SWIM.SPREAD * 0.3)); // fades by vanishing, not alpha
    }
    ctx.fillStyle = SWIM.FOAM;                                  // glints
    for (let g = 0; g < 3; g++) { const a2 = g * 2.1 + Math.floor(t * 2) * 0.7; if ((Math.floor(t * 3) + g) % 3) continue;
      ctx.fillRect(mx + Math.round(Math.cos(a2) * (SWIM.RX + 6)) * z, water + Math.round(Math.sin(a2) * (SWIM.RY + 3)) * z, z, z); }
  }
}

const SWIM = Object.freeze({ LINE: 30, CROP: 44, CLINE: 20, RX: 20, RY: 5, RINGS: 2, PERIOD: 1.8, SPREAD: 10, FOAM: '#ffffff' }); // LINE 30 = cell y 66
/** Water collision codes (3 water, 11 deep / sea water). */
const _tops = new WeakMap();
/** First opaque art row (native px) in one sheet cell; cached. Lets the rider sit on any Kilu, 64 or 96 px cells. */
export function artTop(img, col, row, cell, k = 1) {
  let per = _tops.get(img); if (!per) _tops.set(img, (per = new Map()));
  const key = col + ',' + row; if (per.has(key)) return per.get(key);
  let top = Math.round(cell * 0.3);
  try {
    const c = document.createElement('canvas'), n = Math.round(cell * k); c.width = c.height = n;
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, col * n, row * n, n, n, 0, 0, n, n);
    const d = g.getImageData(0, 0, n, n).data;
    outer: for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > 40) { top = Math.floor(y / k); break outer; }
  } catch { /* tainted or no DOM: keep the estimate */ }
  per.set(key, top); return top;
}

export function onWater(v, a) {
  const m = v.map; if (!m?.code || a.px == null) return false;
  const c = m.code(Math.round(a.px / TILE), Math.round(a.py / TILE)); return c === 3 || c === 11;
}
