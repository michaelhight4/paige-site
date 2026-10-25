// Kilumen overworld: tileset loading (README section 6). The 1x/2x/3x JSON files share ids and indices;
// we load the set that matches the integer zoom so tiles blit 1:1 at 1080p (2x) and 1440p (3x).
import { loadImage, loadJson, resolveUrl } from './assets.js?v=v0.2.13-alpha';

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
export async function loadTileset(url) {
  const ts = await loadJson(url);
  const idx = indexTileset(ts);
  const sheetPaths = new Set(ts.tiles.map((t) => t.sheet));
  idx.images = new Map();
  await Promise.all([...sheetPaths].map(async (p) => idx.images.set(p, await loadImage(resolveUrl(p, url)))));
  idx.url = url;
  return idx;
}
