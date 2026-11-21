/**
 * Walk graphs for downloaded map areas, stored on the phone so routing
 * works offline outside the bundled Florence extract.
 */
import { getTile, putTile, listAreas } from "./map_storage.js";
import { parseGraph, setActiveGraph, getActiveGraph, setActiveBikeGraph, getActiveBikeGraph, loadBundledGraph, inGraphBounds } from "./routing.js";
import {
  buildWalkGraphFromTiles,
  buildBikeGraphFromTiles,
  pointsInGraphBounds,
  somePointsInGraphBounds,
  OSM_ATTRIBUTION,
} from "./walk_graph_build.js";
import {
  FLORENCE_BOUNDS,
  inBounds,
  tileRange,
  tilesInRange,
  countTilesInRange,
  resolveOfmTemplate,
  tileUrl,
  OFM_USER_AGENT,
  OFM_MAXZOOM,
} from "./map_tiles.js";
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

function isBikeRecord(rec) {
  return !!rec && (rec.profile === "bike" || /:bike$/.test(String(rec.id || "")));
}

export async function buildGraphForArea(area, { onProgress, kind } = {}) {
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
  const bike = kind === "bike";
  const raw = (bike ? buildBikeGraphFromTiles : buildWalkGraphFromTiles)(loaded, {
    name: (area.name || "Downloaded area") + (bike ? " ride" : " walk"),
    source: "downloaded-area:" + area.id,
  });
  raw.id = bike ? area.id + ":bike" : area.id;
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

export async function ensureGraphForArea(area, { kind } = {}) {
  if (!area || !area.id) return null;
  const id = kind === "bike" ? area.id + ":bike" : area.id;
  const existing = await loadAreaGraph(id);
  if (existing && existing.nodes && existing.edges) return existing;
  const built = await buildGraphForArea(area, { kind });
  return built.ok ? built.graph : null;
}

/** Build and store a ride graph for a downloaded area, beside its walk graph. */
export async function ensureBikeGraphForArea(area) {
  return ensureGraphForArea(area, { kind: "bike" });
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


export const ON_DEMAND_MAX_TILES = 48;

/** Degrees of padding so an auto-loop of `targetMeters` fits in the graph. */
export function padDegForLoop(targetMeters) {
  const target = Math.max(200, Number(targetMeters) || 0);
  const baseR = target / (2 * Math.PI);
  const reachM = baseR * 1.8 + 500;
  return Math.max(0.008, reachM / 111000);
}

export function graphCoversLoop(graph, center, targetMeters) {
  if (!graph || !center) return false;
  const pad = padDegForLoop(targetMeters);
  const west = center.lon - pad, south = center.lat - pad;
  const east = center.lon + pad, north = center.lat + pad;
  return Number(graph.west) <= west && Number(graph.south) <= south
    && Number(graph.east) >= east && Number(graph.north) >= north;
}

function padBoundsFromPoints(pts, padDeg = 0.004) {
  let west = 180, south = 90, east = -180, north = -90;
  for (const p of pts || []) {
    if (!p) continue;
    if (p.lon < west) west = p.lon;
    if (p.lon > east) east = p.lon;
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
  }
  return { west: west - padDeg, south: south - padDeg, east: east + padDeg, north: north + padDeg };
}

async function loadOfmTile(z, x, y) {
  try {
    const cached = await getTile(z, x, y);
    if (cached && cached.byteLength) return cached;
  } catch { /* continue */ }
  if (typeof navigator !== "undefined" && navigator.onLine === false) return null;
  try {
    const tmpl = await resolveOfmTemplate();
    const res = await fetch(tileUrl(tmpl, z, x, y), { headers: { "User-Agent": OFM_USER_AGENT } });
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    if (data && data.byteLength) {
      try { await putTile(z, x, y, data); } catch { /* quota */ }
      return data;
    }
  } catch { /* offline or blocked */ }
  return null;
}

/**
 * Build a walk graph (plus open-area polygons) from OpenFreeMap / cached
 * tiles covering the pin bounds, so routing works outside Florence.
 */
export async function buildGraphForBounds(bounds, { onProgress, maxTiles = ON_DEMAND_MAX_TILES, kind } = {}) {
  if (!bounds) return { ok: false, reason: "no-bounds" };
  let z = OFM_MAXZOOM;
  let range = tileRange(bounds, z);
  while (countTilesInRange(range) > maxTiles && z > 11) {
    z -= 1;
    range = tileRange(bounds, z);
  }
  if (countTilesInRange(range) > maxTiles) return { ok: false, reason: "too-many-tiles" };
  const tiles = tilesInRange(range);
  const loaded = [];
  let done = 0;
  for (const t of tiles) {
    const data = await loadOfmTile(t.z, t.x, t.y);
    if (data && data.byteLength) loaded.push({ z: t.z, x: t.x, y: t.y, data });
    done += 1;
    if (onProgress) onProgress({ done, total: tiles.length });
  }
  if (!loaded.length) return { ok: false, reason: "no-tile-data" };
  const bike = kind === "bike";
  const raw = (bike ? buildBikeGraphFromTiles : buildWalkGraphFromTiles)(loaded, {
    name: bike ? "On-demand ride" : "On-demand walk",
    source: "ofm-bounds",
  });
  const baseId = `ondemand:${bounds.west.toFixed(3)},${bounds.south.toFixed(3)},${bounds.east.toFixed(3)},${bounds.north.toFixed(3)},z${z}`;
  raw.id = bike ? baseId + ":bike" : baseId;
  raw.west = bounds.west;
  raw.south = bounds.south;
  raw.east = bounds.east;
  raw.north = bounds.north;
  raw.builtAt = new Date().toISOString();
  raw.attribution = OSM_ATTRIBUTION;
  try { await saveAreaGraph(raw); } catch { /* memory still holds it after parse */ }
  return { ok: true, graph: raw };
}

/**
 * Choose a walk graph that covers the points: a downloaded area first,
 * then the bundled Florence extract if the points are in Florence,
 * then an on-demand OpenFreeMap graph for the pin bounds.
 * Returns a parsed routing graph, or null when nothing covers them.
 */
export async function selectWalkGraph(points, opts = {}) {
  const pts = pointsFrom(points);
  const records = await listAreaGraphs();
  const parsedAreas = records.filter((r) => !isBikeRecord(r)).map(asRoutable).filter(Boolean);
  const bundled = asRoutable(await getBundledGraph());
  if (pts.length) {
    const allHit = parsedAreas.find((g) => pointsInGraphBounds(g, pts))
      || (bundled && pointsInGraphBounds(bundled, pts) ? bundled : null);
    if (allHit) return allHit;
    // On-demand graph from OFM / cached tiles when no packed graph covers every pin.
    if (!opts.lockWalkGraph) {
      if (opts.onStatus) opts.onStatus("finding");
      try {
        const built = await buildGraphForBounds(opts.bounds || padBoundsFromPoints(pts, opts.padDeg));
        const g = asRoutable(built.ok ? built.graph : null);
        if (g && pointsInGraphBounds(g, pts)) return g;
        if (g && somePointsInGraphBounds(g, pts)) {
          // Prefer a full cover; keep this as a fallback after someHit search.
          parsedAreas.unshift(g);
        }
      } catch { /* leave unroutable if tiles cannot be fetched */ }
      if (opts.onStatus) opts.onStatus("idle");
    }
    const someHit = parsedAreas.find((g) => somePointsInGraphBounds(g, pts));
    if (someHit) return someHit;
    if (bundled && somePointsInGraphBounds(bundled, pts)) return bundled;
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
  return bundled;
}

export async function ensureWalkGraph(points, opts = {}) {
  const graph = await selectWalkGraph(points, opts);
  setActiveGraph(graph);
  return graph;
}

export function graphCoversPoints(graph, points) {
  return pointsInGraphBounds(graph, pointsFrom(points));
}

/**
 * Load or build a walk graph large enough for an auto-loop around `center`.
 */
/** The ride version of ensureLoopGraph: a bike graph big enough for a loop. */
export async function ensureBikeLoopGraph(center, targetMeters, opts = {}) {
  if (!center) return null;
  const existing = opts.graph || getActiveBikeGraph();
  if (graphCoversLoop(existing, center, targetMeters)) return existing;
  const pad = padDegForLoop(targetMeters);
  const bounds = {
    west: center.lon - pad,
    south: center.lat - pad,
    east: center.lon + pad,
    north: center.lat + pad,
  };
  const built = await buildGraphForBounds(bounds, { ...opts, kind: "bike" });
  const g = asRoutable(built.ok ? built.graph : null);
  if (g) {
    setActiveBikeGraph(g);
    return g;
  }
  return ensureBikeGraph(center, { ...opts, bounds, padDeg: pad });
}

export async function ensureLoopGraph(center, targetMeters, opts = {}) {
  if (!center) return null;
  const existing = opts.graph || getActiveGraph();
  if (graphCoversLoop(existing, center, targetMeters)) return existing;
  const pad = padDegForLoop(targetMeters);
  const bounds = {
    west: center.lon - pad,
    south: center.lat - pad,
    east: center.lon + pad,
    north: center.lat + pad,
  };
  const built = await buildGraphForBounds(bounds, opts);
  const g = asRoutable(built.ok ? built.graph : null);
  if (g) {
    setActiveGraph(g);
    return g;
  }
  return ensureWalkGraph(center, { ...opts, bounds, padDeg: pad });
}

function padBoundsForBike(pts, padDeg = 0.006) {
  return padBoundsFromPoints(pts, padDeg);
}

/** Choose or build a bike graph from the same downloaded tiles. */
export async function selectBikeGraph(points, opts = {}) {
  const pts = pointsFrom(points);
  const records = await listAreaGraphs();
  const parsedAreas = records.filter(isBikeRecord).map(asRoutable).filter(Boolean);
  if (pts.length) {
    const allHit = parsedAreas.find((g) => pointsInGraphBounds(g, pts));
    if (allHit) return allHit;
    if (!opts.lockWalkGraph) {
      if (opts.onStatus) opts.onStatus("finding");
      try {
        const built = await buildGraphForBounds(
          opts.bounds || padBoundsForBike(pts, opts.padDeg),
          { kind: "bike" }
        );
        const g = asRoutable(built.ok ? built.graph : null);
        if (g && pointsInGraphBounds(g, pts)) return g;
        if (g && somePointsInGraphBounds(g, pts)) parsedAreas.unshift(g);
      } catch { /* leave unroutable if tiles cannot be fetched */ }
      if (opts.onStatus) opts.onStatus("idle");
    }
    const someHit = parsedAreas.find((g) => somePointsInGraphBounds(g, pts));
    if (someHit) return someHit;
    try {
      const areas = await listAreas();
      for (const area of areas) {
        const covers = pts.some((p) => p && inBounds(p.lat, p.lon, [area.west, area.south, area.east, area.north]));
        if (!covers) continue;
        const built = await ensureBikeGraphForArea(area);
        const g = asRoutable(built);
        if (g) return g;
      }
    } catch { /* no downloaded areas */ }
    return null;
  }
  return parsedAreas[0] || null;
}

export async function ensureBikeGraph(points, opts = {}) {
  const graph = await selectBikeGraph(points, opts);
  setActiveBikeGraph(graph);
  return graph;
}

export function bikeGraphCoversPoints(graph, points) {
  return pointsInGraphBounds(graph, pointsFrom(points));
}

export { OSM_ATTRIBUTION, FLORENCE_BOUNDS, inGraphBounds };
