import { geodesicMeters } from "./geodesic.js";

/**
 * Open walkable areas (pitches, parks, grass, tracks…) and unwalkable
 * barriers (water, buildings, motorways, rail). When both pins of a leg
 * sit in the same open area and the straight line does not cross a
 * barrier, the leg is a normal straight crossing — no warning.
 */

export const OPEN_KIND = new Set([
  "pitch", "park", "grass", "recreation_ground", "playground",
  "track", "stadium", "sports_centre", "sports_hall", "dog_park",
  "meadow", "garden", "village_green", "common", "heath",
  "open_space", "recreation", "golf_course", "cemetery",
]);

export const OPEN_LEISURE = new Set([
  "pitch", "park", "playground", "track", "stadium", "sports_centre",
  "dog_park", "garden", "recreation_ground", "golf_course",
]);

export const OPEN_LANDUSE = new Set([
  "grass", "meadow", "recreation_ground", "village_green", "common",
  "greenfield", "os",
]);

export const BARRIER_KIND = new Set([
  "water", "river", "reservoir", "basin", "dock", "swimming_pool",
  "building", "building_part",
  "rail",
  "motorway", "motorway_link", "trunk", "trunk_link",
]);

export function isOpenWalkableProps(props = {}) {
  const kind = String(props["pmap:kind"] || props.kind || props.class || "").toLowerCase();
  const detail = String(props["pmap:kind_detail"] || props.subclass || "").toLowerCase();
  const leisure = String(props.leisure || "").toLowerCase();
  const landuse = String(props.landuse || "").toLowerCase();
  const sport = String(props.sport || "").toLowerCase();
  if (OPEN_KIND.has(kind) || OPEN_KIND.has(detail) || OPEN_LEISURE.has(leisure) || OPEN_LANDUSE.has(landuse)) {
    return true;
  }
  if (leisure === "pitch" || sport === "soccer" || sport === "football" || sport === "athletics") return true;
  return false;
}

export function isBarrierProps(props = {}) {
  const kind = String(props["pmap:kind"] || props.kind || props.class || "").toLowerCase();
  const detail = String(props["pmap:kind_detail"] || props.subclass || "").toLowerCase();
  const natural = String(props.natural || "").toLowerCase();
  const waterway = String(props.waterway || "").toLowerCase();
  const water = String(props.water || "").toLowerCase();
  const railway = String(props.railway || "").toLowerCase();
  const highway = String(props.highway || "").toLowerCase();
  if (BARRIER_KIND.has(kind) || BARRIER_KIND.has(detail)) return true;
  if (natural === "water" || water || waterway === "river" || waterway === "canal" || waterway === "riverbank") return true;
  if (railway === "rail" || railway === "light_rail" || railway === "subway" || kind === "rail") return true;
  if (highway === "motorway" || highway === "motorway_link" || highway === "trunk" || highway === "trunk_link") return true;
  return false;
}

export function barrierKind(props = {}) {
  const kind = String(props["pmap:kind"] || props.kind || "").toLowerCase();
  const highway = String(props.highway || "").toLowerCase();
  if (kind === "building" || kind === "building_part") return "building";
  if (kind === "rail" || props.railway) return "rail";
  if (highway === "motorway" || highway === "motorway_link" || highway === "trunk" || highway === "trunk_link" || kind === "motorway" || kind === "trunk") return "highway";
  return "water";
}

export function pointInRing(point, ring) {
  if (!point || !ring || ring.length < 3) return false;
  const x = point.lon;
  const y = point.lat;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lon, yi = ring[i].lat;
    const xj = ring[j].lon, yj = ring[j].lat;
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-18) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function orient(a, b, c) {
  const v = (b.lon - a.lon) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lon - a.lon);
  if (Math.abs(v) < 1e-18) return 0;
  return v > 0 ? 1 : -1;
}

function onSeg(a, b, c) {
  return Math.min(a.lon, b.lon) - 1e-12 <= c.lon && c.lon <= Math.max(a.lon, b.lon) + 1e-12
    && Math.min(a.lat, b.lat) - 1e-12 <= c.lat && c.lat <= Math.max(a.lat, b.lat) + 1e-12;
}

export function segmentsCross(a, b, c, d) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSeg(a, b, c)) return true;
  if (o2 === 0 && onSeg(a, b, d)) return true;
  if (o3 === 0 && onSeg(c, d, a)) return true;
  if (o4 === 0 && onSeg(c, d, b)) return true;
  return false;
}

export function segmentCrossesRing(a, b, ring) {
  if (!ring || ring.length < 2) return false;
  for (let i = 0; i < ring.length - 1; i++) {
    if (segmentsCross(a, b, ring[i], ring[i + 1])) return true;
  }
  if (ring.length >= 3) {
    const last = ring[ring.length - 1];
    const first = ring[0];
    if (last.lat !== first.lat || last.lon !== first.lon) {
      if (segmentsCross(a, b, last, first)) return true;
    }
  }
  // Midpoint inside a barrier (segment fully crosses a lake, etc.).
  const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
  if (pointInRing(mid, ring) && !pointInRing(a, ring) && !pointInRing(b, ring)) return true;
  return false;
}

function ringBBox(ring) {
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const p of ring) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lon < minLon) minLon = p.lon;
    if (p.lon > maxLon) maxLon = p.lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

function pointInArea(point, area) {
  if (!area || !point) return false;
  if (point.lon < area.minLon || point.lon > area.maxLon || point.lat < area.minLat || point.lat > area.maxLat) {
    return false;
  }
  return pointInRing(point, area.ring);
}

export function findOpenArea(areas, point) {
  if (!areas) return null;
  for (const area of areas) {
    if (pointInArea(point, area)) return area;
  }
  return null;
}

/** True if every sample along a–b sits in some open walkable polygon. */
export function segmentStaysOnOpenGround(areas, a, b) {
  if (!areas || !a || !b) return false;
  if (!findOpenArea(areas, a) || !findOpenArea(areas, b)) return false;
  const meters = geodesicMeters(a, b);
  const samples = Math.max(4, Math.ceil(meters / 8));
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const p = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
    if (!findOpenArea(areas, p)) return false;
  }
  return true;
}

const EARTH_LAT_M = 111320;

function setBit(bits, i) {
  bits[i >> 3] |= 1 << (i & 7);
}

function getBit(bits, i) {
  return (bits[i >> 3] & (1 << (i & 7))) !== 0;
}

function stampSegment(a, b, mark, toX, toY) {
  const x0 = toX(a.lon), y0 = toY(a.lat);
  const x1 = toX(b.lon), y1 = toY(b.lat);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;
  for (let n = 0; n < dx + dy + 2; n++) {
    mark(x, y);
    if (x === x1 && y === y1) break;
    const e2 = err * 2;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
}

function fillRing(ring, mark, toX, toY, cols, rows) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of ring) {
    const x = toX(p.lon), y = toY(p.lat);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  minX = Math.max(0, minX);
  minY = Math.max(0, minY);
  maxX = Math.min(cols - 1, maxX);
  maxY = Math.min(rows - 1, maxY);
  for (let y = minY; y <= maxY; y++) {
    const ys = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = toY(ring[i].lat), yj = toY(ring[j].lat);
      const xi = toX(ring[i].lon), xj = toX(ring[j].lon);
      if ((yi <= y && yj > y) || (yj <= y && yi > y)) {
        const x = Math.round(xi + ((y - yi) * (xj - xi)) / ((yj - yi) || 1e-9));
        ys.push(x);
      }
    }
    ys.sort((a, b) => a - b);
    for (let k = 0; k + 1 < ys.length; k += 2) {
      const x0 = Math.max(0, ys[k]);
      const x1 = Math.min(cols - 1, ys[k + 1]);
      for (let x = x0; x <= x1; x++) mark(x, y);
    }
  }
}

/**
 * Pack unwalkable polygons/lines into a compact occupancy grid so the
 * bundled walk graph stays small (buildings would otherwise dominate).
 */
export function rasterizeBarriers(barriers, bounds, cellM = 10) {
  const [minLon, minLat, maxLon, maxLat] = bounds;
  const midLat = (minLat + maxLat) / 2;
  const cellLat = cellM / EARTH_LAT_M;
  const cellLon = cellM / (EARTH_LAT_M * Math.max(0.2, Math.cos((midLat * Math.PI) / 180)));
  const cols = Math.max(1, Math.ceil((maxLon - minLon) / cellLon) + 1);
  const rows = Math.max(1, Math.ceil((maxLat - minLat) / cellLat) + 1);
  const bits = new Uint8Array(Math.ceil((rows * cols) / 8));
  const toX = (lon) => Math.floor((lon - minLon) / cellLon);
  const toY = (lat) => Math.floor((lat - minLat) / cellLat);
  const mark = (gx, gy) => {
    if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) return;
    setBit(bits, gy * cols + gx);
  };
  for (const bar of barriers || []) {
    const ring = bar && bar.ring;
    if (!ring || ring.length < 2) continue;
    const kind = bar.kind || "";
    const lineOnly = kind === "rail" || kind === "highway";
    for (let i = 0; i < ring.length - 1; i++) stampSegment(ring[i], ring[i + 1], mark, toX, toY);
    const last = ring[ring.length - 1], first = ring[0];
    if (!lineOnly && ring.length >= 3) {
      if (last.lat !== first.lat || last.lon !== first.lon) stampSegment(last, first, mark, toX, toY);
      fillRing(ring, mark, toX, toY, cols, rows);
    }
  }
  return { minLon, minLat, cellLon, cellLat, cols, rows, cellM, bits };
}

export function packBlocked(grid) {
  if (!grid) return null;
  const bits = grid.bits instanceof Uint8Array ? grid.bits : Uint8Array.from(grid.bits || []);
  let b64 = "";
  if (typeof Buffer !== "undefined") b64 = Buffer.from(bits).toString("base64");
  else {
    let bin = "";
    for (let i = 0; i < bits.length; i++) bin += String.fromCharCode(bits[i]);
    b64 = btoa(bin);
  }
  return {
    minLon: grid.minLon,
    minLat: grid.minLat,
    cellLon: grid.cellLon,
    cellLat: grid.cellLat,
    cols: grid.cols,
    rows: grid.rows,
    cellM: grid.cellM,
    bits: b64,
  };
}

export function unpackBlocked(raw) {
  if (!raw) return null;
  let bits;
  if (typeof raw.bits === "string") {
    if (typeof Buffer !== "undefined") bits = Uint8Array.from(Buffer.from(raw.bits, "base64"));
    else {
      const bin = atob(raw.bits);
      bits = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bits[i] = bin.charCodeAt(i);
    }
  } else {
    bits = Uint8Array.from(raw.bits || []);
  }
  return { ...raw, bits };
}

export function cellBlocked(grid, point) {
  if (!grid || !point) return false;
  const gx = Math.floor((point.lon - grid.minLon) / grid.cellLon);
  const gy = Math.floor((point.lat - grid.minLat) / grid.cellLat);
  if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) return false;
  return getBit(grid.bits, gy * grid.cols + gx);
}

/** True if the straight segment crosses a blocked cell, ignoring the endpoint cells. */
export function segmentCrossesBlocked(grid, a, b) {
  if (!grid || !a || !b) return false;
  const samples = Math.max(2, Math.ceil((Math.hypot(
    (a.lat - b.lat) / grid.cellLat,
    (a.lon - b.lon) / grid.cellLon
  )) * 2));
  const ax = Math.floor((a.lon - grid.minLon) / grid.cellLon);
  const ay = Math.floor((a.lat - grid.minLat) / grid.cellLat);
  const bx = Math.floor((b.lon - grid.minLon) / grid.cellLon);
  const by = Math.floor((b.lat - grid.minLat) / grid.cellLat);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const p = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
    const gx = Math.floor((p.lon - grid.minLon) / grid.cellLon);
    const gy = Math.floor((p.lat - grid.minLat) / grid.cellLat);
    if ((gx === ax && gy === ay) || (gx === bx && gy === by)) continue;
    if (gx < 0 || gy < 0 || gx >= grid.cols || gy >= grid.rows) continue;
    if (getBit(grid.bits, gy * grid.cols + gx)) return true;
  }
  return false;
}

export function segmentCrossesBarriers(graph, a, b) {
  if (!graph || !a || !b) return false;
  if (graph.blocked && segmentCrossesBlocked(graph.blocked, a, b)) return true;
  for (const bar of graph.barriers || []) {
    if (bar && bar.ring && segmentCrossesRing(a, b, bar.ring)) return true;
  }
  return false;
}

/**
 * True when a and b are in the same open walkable polygon and the
 * straight segment does not cross a barrier (water, building, highway, rail).
 */
export function openAreaLegAllowed(graph, a, b) {
  const areas = graph && graph.openAreas;
  if (!areas || !areas.length || !a || !b) return null;
  const aa = findOpenArea(areas, a);
  if (!aa) return null;
  const bb = findOpenArea(areas, b);
  if (!bb) return null;
  const same = aa === bb || sameRing(aa, bb);
  // Tile-split pitches (one field cut by a tile edge) and adjacent
  // open ground still count when the straight line stays on open land.
  if (!same && !segmentStaysOnOpenGround(areas, a, b)) return null;
  if (segmentCrossesBarriers(graph, a, b)) return null;
  return aa;
}

function sameRing(a, b) {
  if (!a || !b) return false;
  if (a.id != null && a.id === b.id) return true;
  if (a.ring === b.ring) return true;
  return false;
}

export function packRings(records, scale = 1e6) {
  return (records || []).map((r) => {
    const ring = [];
    for (const p of r.ring || []) {
      ring.push(Math.round(p.lon * scale), Math.round(p.lat * scale));
    }
    return { k: r.kind || "", r: ring };
  });
}

export function unpackRings(packed, scale = 1e6) {
  const out = [];
  for (let i = 0; i < (packed || []).length; i++) {
    const rec = packed[i];
    const src = rec && (rec.r || rec.ring || rec);
    if (!src || !src.length) continue;
    const ring = [];
    if (typeof src[0] === "number") {
      for (let j = 0; j + 1 < src.length; j += 2) {
        ring.push({ lon: src[j] / scale, lat: src[j + 1] / scale });
      }
    } else {
      for (const p of src) ring.push({ lat: p.lat, lon: p.lon });
    }
    if (ring.length >= 3) {
      const box = ringBBox(ring);
      out.push({ id: i, kind: (rec && rec.k) || rec.kind || "", ring, ...box });
    }
  }
  return out;
}
