// Kilumen: golden spinning arrow, the reusable overworld marker (Oct 23, 2026; Gary 9:33 / 9:34 AM CT).
// Uses: the starter cases after scene_starter_intro (intro.js), and quest ITEMS needed by an active quest
// (quest_markers.js). Side-quest GIVER NPCs never get a marker.
// Pixel-crisp: an 11x11 sprite drawn in code (Kilumen palette, gold with a dark outline), scaled by whole art pixels.
// Spin = a horizontal scale wave in whole art-pixel columns (the darker back face shows past 90 degrees), plus a 1-2 px bob.
// Reduced motion: drawn still (no spin, no bob).
import { TILE } from './constants.js?v=v0.2.25-alpha';

const ART = [
  '..OOOOOOO..',
  '..OHHGGSO..',
  '..OHGGGSO..',
  '..OHGGGSO..',
  'OOOHGGGSOOO',
  'OHHHGGGGGSO',
  '.OHGGGGGSO.',
  '..OHGGGSO..',
  '...OHGSO...',
  '....OSO....',
  '.....O.....',
];
export const MARKER_W = ART[0].length, MARKER_H = ART.length;
const FRONT = { O: '#1a1226', H: '#fff1a8', G: '#ffc83d', S: '#c98a1a' };
const BACK = { O: '#1a1226', H: '#e8a92a', G: '#d99a22', S: '#9c6512' };
/** world px per art px (TILE 64 -> 4: the arrow is 44 world px, about 2/3 of a tile) */
export const MARKER_PX = 4;
/** Max arrows drawn per frame (phone frame-time cap; nearest to the player win). */
export const MARKER_CAP = 6;
const PERIOD_MS = 1400, BOB_MS = 1100;
/** world px kept between a pinned arrow and the top of the view */
const EDGE = 6;

let _faces = null;
function faces() {
  if (_faces || typeof document === 'undefined') return _faces;
  const mk = (pal) => {
    const c = document.createElement('canvas'); c.width = MARKER_W; c.height = MARKER_H;
    const g = c.getContext('2d');
    ART.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
    return c;
  };
  return (_faces = { front: mk(FRONT), back: mk(BACK) });
}

/** Spin + bob state at time ms (pure; tests). cols = visible art columns (1..11), back = back face, bob = art px up. */
export function markerPose(ms, reduced = false, phase = 0) {
  if (reduced) return { cols: MARKER_W, back: false, bob: 0 };
  const a = ((ms + phase) / PERIOD_MS) * Math.PI * 2, c = Math.cos(a);
  const cols = Math.max(1, Math.round(Math.abs(c) * MARKER_W));
  const bob = Math.round((Math.sin(((ms + phase) / BOB_MS) * Math.PI * 2) + 1) * 1); // 0..2 art px
  return { cols, back: c < 0, bob };
}

/** Is reduced motion on? (scene living-world rule: ?motion=reduce or prefers-reduced-motion, plus the UI's Menu motion toggle) */
export function reducedMotion(scene) {
  if (scene?.life?.reducedMotion) return true;
  try { return !!globalThis.document?.body?.classList.contains('ui-reduce'); } catch { return false; }
}

/**
 * Draw markers above tiles. spots = [{x, y, up?}] in tiles; `up` = extra tiles above the tile's top (tall props).
 * The arrow's tip sits a little above the top of tile (x, y - up). At most MARKER_CAP are drawn, nearest the player first.
 */
export function drawMarkers(ctx, v, spots, { reduced = false } = {}) {
  const f = faces();
  if (!f || !spots?.length) return 0;
  const z = v.zoom, P = MARKER_PX * z, W = ctx.canvas.width, H = ctx.canvas.height;
  let list = spots;
  if (list.length > MARKER_CAP && v.player) {
    const px = v.player.x, py = v.player.y;
    list = [...list].sort((a, b) => Math.abs(a.x - px) + Math.abs(a.y - py) - (Math.abs(b.x - px) + Math.abs(b.y - py))).slice(0, MARKER_CAP);
  }
  const prev = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  let n = 0;
  for (const s of list) {
    const { cols, back, bob } = markerPose(v.ms || 0, reduced, (s.x * 7 + s.y * 13) * 0); // in sync: they spin together
    const cx = Math.round(((s.x + 0.5) * TILE - v.cam.x) * z);
    const tipY = Math.round(((s.y - (s.up || 0)) * TILE - 6 - v.cam.y) * z);
    const dw = cols * P, dh = MARKER_H * P;
    const x = Math.round(cx - dw / 2);
    let y = Math.round(tipY - dh - bob * P);
    // tall props near the top of the view (the lab cases on arrival): keep the arrow on screen, pinned to the top
    // edge while its target tile is still in view, so "the lights spinning over them" are always visible
    const tileBottom = ((s.y + 1) * TILE - v.cam.y) * z;
    if (y < EDGE * z && tileBottom > 0) y = Math.round(EDGE * z + (2 - bob) * P);
    if (x > W || x + dw < 0 || y > H || y + dh < 0) continue;
    ctx.drawImage(back ? f.back : f.front, 0, 0, MARKER_W, MARKER_H, x, y, Math.round(dw), Math.round(dh));
    n++;
  }
  ctx.imageSmoothingEnabled = prev;
  return n;
}
