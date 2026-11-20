/**
 * Tile math, download planning and OpenFreeMap helpers.
 * Offline area downloads honour OpenFreeMap's published limits:
 * at most 3,000 tiles or 50 MB per download, and at most 4 parallel requests.
 * https://openfreemap.org/  (commercial use and offline area downloads allowed)
 */

export const OFM_TILEJSON_URL = "https://tiles.openfreemap.org/planet";
export const OFM_MAX_TILES = 3000;
export const OFM_MAX_BYTES = 50 * 1024 * 1024;
export const OFM_PARALLEL = 4;
export const OFM_USER_AGENT = "Heldpath/1.0 (https://paigegames.net/heldpath)";
export const OFM_MAXZOOM = 14;
export const DEFAULT_AVG_TILE_BYTES = 80 * 1024;
export const WORLD_MAXZOOM = 6;

export const FLORENCE_BOUNDS = [11.221144, 43.745121, 11.287543, 43.789306]; // w,s,e,n

export function inBounds(lat, lon, bounds = FLORENCE_BOUNDS) {
  return lon >= bounds[0] && lat >= bounds[1] && lon <= bounds[2] && lat <= bounds[3];
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function lonLatToTile(lon, lat, z) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { z, x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) };
}

export function tileRange(bbox, z) {
  const nw = lonLatToTile(bbox.west, bbox.north, z);
  const se = lonLatToTile(bbox.east, bbox.south, z);
  return {
    z,
    x0: Math.min(nw.x, se.x),
    x1: Math.max(nw.x, se.x),
    y0: Math.min(nw.y, se.y),
    y1: Math.max(nw.y, se.y),
  };
}

export function tilesInRange(range) {
  const tiles = [];
  for (let x = range.x0; x <= range.x1; x++) {
    for (let y = range.y0; y <= range.y1; y++) {
      tiles.push({ z: range.z, x, y });
    }
  }
  return tiles;
}

export function countTilesInRange(range) {
  return (range.x1 - range.x0 + 1) * (range.y1 - range.y0 + 1);
}

export function tilesInPyramid(bbox, minZoom, maxZoom) {
  const tiles = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    tiles.push(...tilesInRange(tileRange(bbox, z)));
  }
  return tiles;
}

export function countTilesInPyramid(bbox, minZoom, maxZoom) {
  let n = 0;
  for (let z = minZoom; z <= maxZoom; z++) n += countTilesInRange(tileRange(bbox, z));
  return n;
}

/**
 * Pick the highest max zoom whose full pyramid from minZoom stays within
 * OpenFreeMap's per-download caps.
 */
export function planDownload(bbox, opt = {}) {
  const minZoom = opt.minZoom == null ? 0 : opt.minZoom;
  const capZoom = opt.capZoom == null ? OFM_MAXZOOM : opt.capZoom;
  const maxTiles = opt.maxTiles == null ? OFM_MAX_TILES : opt.maxTiles;
  const maxBytes = opt.maxBytes == null ? OFM_MAX_BYTES : opt.maxBytes;
  const avgBytes = opt.avgBytes == null ? DEFAULT_AVG_TILE_BYTES : opt.avgBytes;
  let maxZoom = minZoom;
  let tileCount = countTilesInPyramid(bbox, minZoom, minZoom);
  for (let z = minZoom; z <= capZoom; z++) {
    const c = countTilesInPyramid(bbox, minZoom, z);
    if (c > maxTiles || c * avgBytes > maxBytes) break;
    maxZoom = z;
    tileCount = c;
  }
  const estimateBytes = tileCount * avgBytes;
  const smallest = countTilesInPyramid(bbox, minZoom, minZoom);
  const tooLarge = smallest > maxTiles || smallest * avgBytes > maxBytes;
  return {
    minZoom,
    maxZoom,
    tileCount,
    estimateBytes,
    tooLarge,
    maxTiles,
    maxBytes,
  };
}

export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  const mb = n / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function formatStorageLine(estimate, available) {
  const left = available == null ? "Available storage unknown" : `${formatBytes(available)} available on this device`;
  return `About ${formatBytes(estimate)} to download. ${left}.`;
}

export function normalizeBbox(b) {
  const west = Math.min(b.west, b.east);
  const east = Math.max(b.west, b.east);
  const south = Math.min(b.south, b.north);
  const north = Math.max(b.south, b.north);
  return {
    west: clamp(west, -180, 180),
    east: clamp(east, -180, 180),
    south: clamp(south, -85.0511, 85.0511),
    north: clamp(north, -85.0511, 85.0511),
  };
}

export function bboxFromFrame(map, frameEl, rootEl) {
  if (!map || !frameEl) return null;
  const fr = frameEl.getBoundingClientRect();
  const mapCanvas = map.getCanvas();
  const mr = mapCanvas.getBoundingClientRect();
  const left = fr.left - mr.left;
  const top = fr.top - mr.top;
  const right = fr.right - mr.left;
  const bottom = fr.bottom - mr.top;
  const sw = map.unproject([left, bottom]);
  const ne = map.unproject([right, top]);
  return normalizeBbox({ west: sw.lng, south: sw.lat, east: ne.lng, north: ne.lat });
}

export function areaOverlaps(a, b) {
  return a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south;
}

let cachedTileTemplate = null;
let cachedTileTemplateAt = 0;

export async function resolveOfmTemplate(fetchFn = fetch) {
  const now = Date.now();
  if (cachedTileTemplate && now - cachedTileTemplateAt < 24 * 60 * 60 * 1000) {
    return cachedTileTemplate;
  }
  const res = await fetchFn(OFM_TILEJSON_URL, {
    headers: { "User-Agent": OFM_USER_AGENT },
  });
  if (!res.ok) throw new Error("OpenFreeMap tile JSON " + res.status);
  const json = await res.json();
  const tmpl = json && json.tiles && json.tiles[0];
  if (!tmpl) throw new Error("OpenFreeMap tile JSON missing tiles");
  cachedTileTemplate = tmpl;
  cachedTileTemplateAt = now;
  return tmpl;
}

export function tileUrl(template, z, x, y) {
  return template
    .replace("{z}", String(z))
    .replace("{x}", String(x))
    .replace("{y}", String(y));
}

/** Reset cached TileJSON (tests). */
export function resetOfmTemplateCache() {
  cachedTileTemplate = null;
  cachedTileTemplateAt = 0;
}

export async function mapPool(items, limit, fn, onProgress) {
  let i = 0;
  let done = 0;
  let bytes = 0;
  let stop = false;
  async function worker() {
    while (!stop) {
      const idx = i++;
      if (idx >= items.length) return;
      const n = await fn(items[idx], idx);
      const add = typeof n === "number" ? n : 0;
      bytes += add;
      done += 1;
      if (onProgress) onProgress({ done, total: items.length, bytes });
      if (bytes > OFM_MAX_BYTES || done >= OFM_MAX_TILES) stop = true;
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, worker));
  return { done, bytes, stoppedEarly: stop && done < items.length };
}
