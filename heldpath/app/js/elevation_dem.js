/**
 * Cached Terrarium DEM lookups from AWS Terrain Tiles (Tilezen/Mapzen).
 * Licence: show DEM_CREDIT_SHORT and link DEM_ATTRIBUTION_URL.
 */
import { DEM_CREDIT_SHORT, DEM_ATTRIBUTION_URL, terrariumToMeters } from "./elevation.js";
import { samplePath } from "./low_signal.js";

export { DEM_CREDIT_SHORT, DEM_ATTRIBUTION_URL };

export const DEM_TILE_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
export const DEM_ZOOM = 12;
export const DEM_UA = "Heldpath/1.0 (https://paigegames.net/heldpath; elevation)";

const DB_NAME = "heldpath-dem";
const STORE = "tiles";
const mem = new Map();

export function tileXyz(lat, lon, z = DEM_ZOOM) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { z, x: Math.min(n - 1, Math.max(0, x)), y: Math.min(n - 1, Math.max(0, y)) };
}

export function demTileUrl(z, x, y) {
  return DEM_TILE_URL.replace("{z}", z).replace("{x}", x).replace("{y}", y);
}

function demDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { resolve(null); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedTile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (mem.has(key)) return mem.get(key);
  try {
    const db = await demDb();
    if (!db) return null;
    const rec = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (rec && rec.data) mem.set(key, rec.data);
    return rec && rec.data ? rec.data : null;
  } catch {
    return null;
  }
}

export async function putCachedTile(z, x, y, buffer) {
  const key = `${z}/${x}/${y}`;
  mem.set(key, buffer);
  try {
    const db = await demDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put({ data: buffer, storedAt: Date.now() }, key);
    });
    db.close();
  } catch { /* ignore cache write */ }
}

async function fetchTile(z, x, y, fetchFn = fetch) {
  const cached = await getCachedTile(z, x, y);
  if (cached) return cached;
  const res = await fetchFn(demTileUrl(z, x, y), { headers: { "User-Agent": DEM_UA } });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  if (buf && buf.byteLength) await putCachedTile(z, x, y, buf);
  return buf;
}

/** Decode one pixel. In Node or tests, a custom decoder can be injected. */
let pixelDecoder = null;
export function setDemPixelDecoder(fn) {
  pixelDecoder = typeof fn === "function" ? fn : null;
}

async function defaultDecodePixel(buffer, px, py) {
  if (pixelDecoder) return pixelDecoder(buffer, px, py);
  if (typeof createImageBitmap !== "function" || typeof OffscreenCanvas === "undefined") return null;
  const blob = new Blob([buffer], { type: "image/png" });
  const bmp = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bmp, 0, 0);
  const x = Math.min(bmp.width - 1, Math.max(0, Math.floor(px)));
  const y = Math.min(bmp.height - 1, Math.max(0, Math.floor(py)));
  const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
  bmp.close();
  return terrariumToMeters(r, g, b);
}

export function pixelFraction(lat, lon, z = DEM_ZOOM) {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  return { fx: (x - Math.floor(x)) * 256, fy: (y - Math.floor(y)) * 256 };
}

export async function lookupDem(lat, lon, { z = DEM_ZOOM, fetchFn } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const { z: zz, x, y } = tileXyz(lat, lon, z);
  try {
    const buf = await fetchTile(zz, x, y, fetchFn);
    if (!buf) return null;
    const { fx, fy } = pixelFraction(lat, lon, z);
    const meters = await defaultDecodePixel(buf, fx, fy);
    return meters == null || !Number.isFinite(meters) ? null : Math.round(meters * 10) / 10;
  } catch {
    return null;
  }
}

let lookupImpl = lookupDem;
export function setDemLookup(fn) {
  lookupImpl = typeof fn === "function" ? fn : lookupDem;
}

export async function samplePathDem(path, { stepM = 40, fetchFn } = {}) {
  const samples = samplePath(path, stepM);
  const out = [];
  for (const p of samples) {
    const ele = await lookupImpl(p.lat, p.lon, { fetchFn });
    out.push({ lat: p.lat, lon: p.lon, ele });
  }
  return out;
}

export function tilesForBbox(bbox, z = DEM_ZOOM) {
  if (!bbox) return [];
  const a = tileXyz(bbox.south, bbox.west, z);
  const b = tileXyz(bbox.north, bbox.east, z);
  const tiles = [];
  for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
    for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
      tiles.push({ z, x, y });
    }
  }
  return tiles;
}

/** Prefetch terrain tiles for a downloaded map area so climb still works offline. */
export async function prefetchDemForBbox(bbox, { fetchFn, onProgress } = {}) {
  const tiles = tilesForBbox(bbox);
  let done = 0;
  for (const t of tiles) {
    try { await fetchTile(t.z, t.x, t.y, fetchFn); } catch { /* keep going */ }
    done += 1;
    if (onProgress) onProgress({ done, total: tiles.length });
  }
  return { ok: true, tileCount: tiles.length, done };
}
