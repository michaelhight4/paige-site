/**
 * Walk graphs for downloaded map areas, stored on the phone so routing
 * works offline outside the bundled Florence extract.
 */
import { getTile, listAreas } from "./map_storage.js";
import { parseGraph, setActiveGraph, loadBundledGraph, inGraphBounds } from "./routing.js";
import {
  buildWalkGraphFromTiles,
  pointsInGraphBounds,
  somePointsInGraphBounds,
  OSM_ATTRIBUTION,
} from "./walk_graph_build.js";
import { FLORENCE_BOUNDS, inBounds } from "./map_tiles.js";

const DB_NAME = "heldpath-graphs";
const STORE = "graphs";

let bundledPromise = null;
const memory = new Map();

function graphDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAreaGraph(record) {
  if (!record || !record.id) return record;
  memory.set(record.id, record);
  try {
    const db = await graphDb();
    if (!db) return record;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(record);
    });
    db.close();
  } catch (err) {
    console.warn("save walk graph", err && err.message ? err.message : err);
  }
  return record;
}

export async function loadAreaGraph(id) {
  if (memory.has(id)) return memory.get(id);
  try {
    const db = await graphDb();
    if (!db) return null;
    const rec = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (rec) memory.set(id, rec);
    return rec || null;
  } catch {
    return null;
  }
}

export async function listAreaGraphs() {
  try {
    const db = await graphDb();
    if (!db) return [...memory.values()];
    const recs = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    for (const r of recs) memory.set(r.id, r);
    return recs;
  } catch {
    return [...memory.values()];
  }
}

export async function deleteAreaGraph(id) {
  memory.delete(id);
  try {
    const db = await graphDb();
    if (!db) return;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(id);
    });
    db.close();
  } catch { /* ignore */ }
}

function highestZoomKeys(area) {
  const keys = area && area.tileKeys ? area.tileKeys : [];
  const parsed = [];
  let maxZ = area && Number(area.maxZoom) ? Number(area.maxZoom) : 0;
  for (const k of keys) {
    const m = /^ofm\/(\d+)\/(\d+)\/(\d+)$/.exec(k);
    if (!m) continue;
    const z = Number(m[1]);
    const x = Number(m[2]);
    const y = Number(m[3]);
    if (z > maxZ) maxZ = z;
    parsed.push({ z, x, y });
  }
  return parsed.filter((t) => t.z === maxZ);
}

export async function buildGraphForArea(area, { onProgress } = {}) {
  if (!area || !area.id) return { ok: false, reason: "no-area" };
  const tiles = highestZoomKeys(area);
  if (!tiles.length) return { ok: false, reason: "no-tiles" };
  const loaded = [];
  let done = 0;
  for (const t of tiles) {
    try {
      const data = await getTile(t.z, t.x, t.y);
      if (data && data.byteLength) loaded.push({ z: t.z, x: t.x, y: t.y, data });
    } catch { /* skip missing tile */ }
    done += 1;
    if (onProgress) onProgress({ done, total: tiles.length });
  }
  if (!loaded.length) return { ok: false, reason: "no-tile-data" };
  const raw = buildWalkGraphFromTiles(loaded, {
    name: (area.name || "Downloaded area") + " walk",
    source: "downloaded-area:" + area.id,
  });
  raw.id = area.id;
  raw.areaId = area.id;
  raw.west = area.west;
  raw.south = area.south;
  raw.east = area.east;
  raw.north = area.north;
  raw.builtAt = new Date().toISOString();
  raw.attribution = OSM_ATTRIBUTION;
  await saveAreaGraph(raw);
  return { ok: true, graph: raw };
}

export async function ensureGraphForArea(area) {
  if (!area || !area.id) return null;
  const existing = await loadAreaGraph(area.id);
  if (existing && existing.nodes && existing.edges) return existing;
  const built = await buildGraphForArea(area);
  return built.ok ? built.graph : null;
}

async function getBundledGraph() {
  if (!bundledPromise) {
    bundledPromise = loadBundledGraph(undefined, { activate: false }).catch((err) => {
      console.warn("walk graph", err && err.message ? err.message : err);
      bundledPromise = null;
      return null;
    });
  }
  return bundledPromise;
}

function asRoutable(raw) {
  if (!raw) return null;
  if (raw.lon && raw.lat && raw.adj) return raw;
  try {
    return parseGraph(raw);
  } catch {
    return null;
  }
}

function pointsFrom(arg) {
  if (!arg) return [];
  if (Array.isArray(arg)) return arg;
  if (arg.lat != null && arg.lon != null) return [arg];
  return [];
}

/**
 * Choose a walk graph that covers the points: a downloaded area first,
 * then the bundled Florence extract if the points are in Florence.
 * Returns a parsed routing graph, or null when nothing covers them.
 */
export async function selectWalkGraph(points) {
  const pts = pointsFrom(points);
  const records = await listAreaGraphs();
  const parsedAreas = records.map(asRoutable).filter(Boolean);
  if (pts.length) {
    const allHit = parsedAreas.find((g) => pointsInGraphBounds(g, pts));
    if (allHit) return allHit;
    const someHit = parsedAreas.find((g) => somePointsInGraphBounds(g, pts));
    if (someHit) return someHit;
    const bundled = asRoutable(await getBundledGraph());
    if (bundled && somePointsInGraphBounds(bundled, pts)) return bundled;
    // If no area graph is cached yet, try building from saved areas.
    try {
      const areas = await listAreas();
      for (const area of areas) {
        const covers = pts.some((p) => p && inBounds(p.lat, p.lon, [area.west, area.south, area.east, area.north]));
        if (!covers) continue;
        const built = await ensureGraphForArea(area);
        const g = asRoutable(built);
        if (g && somePointsInGraphBounds(g, pts)) return g;
      }
    } catch { /* no downloaded areas */ }
    return null;
  }
  return asRoutable(await getBundledGraph());
}

export async function ensureWalkGraph(points) {
  const graph = await selectWalkGraph(points);
  setActiveGraph(graph);
  return graph;
}

export function graphCoversPoints(graph, points) {
  return pointsInGraphBounds(graph, pointsFrom(points));
}

export { OSM_ATTRIBUTION, FLORENCE_BOUNDS, inGraphBounds };
