// Kilumen overworld: tileset loading (README section 6). The 1x/2x/3x JSON files share ids and indices;
// we load the set that matches the integer zoom so tiles blit 1:1 at 1080p (2x) and 1440p (3x).
import { loadImage, loadJson, resolveUrl } from './assets.js?v=v0.2.87-alpha';
import { ixFlags } from './ixlight.js?v=v0.2.87-alpha';

export const COLUMNS = 16;

/** File name of the tileset JSON for a zoom (1x set is scaled by the renderer for other zooms). */
export function tilesetFileForZoom(baseRef, zoom) {
  if (zoom === 2 || zoom === 3) return baseRef.replace(/tileset(_\dx)?\.json$/, `tileset_${zoom}x.json`);
  return baseRef.replace(/tileset(_\dx)?\.json$/, 'tileset.json');
}

/** Index tileset JSON (pure; also used by Node tests). */
export function indexTileset(ts) {
  const byId = new Map();
  for (const t of ts.tiles) byId.set(t.id, t);
  return { meta: ts, size: ts.tile_size, columns: ts.columns_per_sheet || COLUMNS, codes: ts.collision_codes, byId };
}

/** Load a tileset JSON plus every sheet image it references. */
/** Interiors v2 kit (on by default since Oct 29 2026; ?ix2=0 = off): append tileset_ix2.json tiles (ids 9001+), sheet path moved to this zoom's folder. */
export async function withIx2Kit(ts, url) {
  if (!ixFlags().ix2) return ts;
  try {
    const kit = await loadJson(resolveUrl('tileset_ix2.json', url));
    const z = (/tileset_(\d)x\.json$/.exec(url) || [0, '1'])[1];
    return { ...ts, tiles: [...ts.tiles, ...kit.tiles.map((t) => ({ ...t, sheet: t.sheet.replace(/^tiles_1x\//, `tiles_${z}x/`) }))] };
  } catch (e) { console.warn('ix2 kit not loaded', e.message); return ts; }
}

/** Furniture v2 animated props (TV, sink, stove, toast steam, fireplace, lab gear): frames live in the *_v3.png sheets.
 *  ix2 only; skipped under reduced motion (frame 0 = the still art). */
async function withFurnitureAnim(ts, url) {
  if (!ixFlags().ix2) return;
  if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof document !== 'undefined' && document.body?.classList.contains('ui-reduce')) return;
  try {
    const { anim } = await loadJson(resolveUrl('furniture_v3_anim.json', url));
    for (const t of ts.tiles) { const a = anim[t.id]; if (a && !t.animation) t.animation = { frames: a.frames, frame_ms: a.frame_ms, loop: true }; }
  } catch (e) { console.warn('furniture anim not loaded', e.message); }
}

export async function loadTileset(url) {
  const ts = await withIx2Kit(await loadJson(url), url);
  await withFurnitureAnim(ts, url);
  const idx = indexTileset(ts);
  const sheetPaths = new Set(ts.tiles.map((t) => t.sheet));
  idx.images = new Map();
  const ix2 = ixFlags().ix2; // Interiors v2: same ids/indices, redrawn cells come from the *_v2.png sheets
  // v0.2.41 full overhaul: every interior sheet has a same-index pass-3/4 redraw (*_v2.png), so all towns' rooms get it
  // furniture v2 (v0.2.59): redrawn house-style kit lives in *_v3.png (same ids); sheets without a v3 fall back to v2
  const V3 = /tiles_\dx\/(interior|i_furniture|i_brand|x_furniture_fix|ix2_kit)\.png$/;
  const file = (p) => (ix2 && /tiles_\dx\/(interior|i_wall|i_floor|i_furniture|i_brand|x_furniture_fix|ix2_kit)\.png$/.test(p) ? p.replace(/\.png$/, V3.test(p) ? '_v3.png' : '_v2.png') : p);
  await Promise.all([...sheetPaths].map(async (p) => idx.images.set(p, await loadImage(resolveUrl(file(p), url)))));
  idx.url = url;
  return idx;
}
