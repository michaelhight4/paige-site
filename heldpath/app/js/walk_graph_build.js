/**
 * Build a pedestrian walk graph from vector tiles (Protomaps "roads" or
 * OpenMapTiles / OpenFreeMap "transportation"). Derived from OpenStreetMap
 * (ODbL). Attribution: © OpenStreetMap contributors.
 */
import { VectorTile } from "@mapbox/vector-tile";
import Pbf from "pbf";
import { isOpenWalkableProps, isBarrierProps, barrierKind, packRings, rasterizeBarriers, packBlocked, pointInRing } from "./open_areas.js";
import { geodesicMeters } from "./geodesic.js";

export const GRAPH_VERSION = 1;
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const GRID_METERS = 2.5;
export const MIN_COMPONENT = 8;
export const SCALE = 1e6;

const EXCLUDE_PMAP_DETAIL = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "rest_area",
  "services",
  "platform",
  "no",
]);

const EXCLUDE_OMT_CLASS = new Set([
  "motorway",
  "motorway_link",
  "trunk",
  "trunk_link",
  "raceway",
  "ferry",
  "rail",
  "transit",
]);

const KEEP_OMT_CLASS = new Set([
  "path",
  "minor",
  "service",
  "track",
  "tertiary",
  "busway",
  "primary",
  "secondary",
]);

/** True when a road/path feature should be in the pedestrian graph. */
export function isWalkableWay(props = {}) {
  if (props["pmap:kind"] != null || props["pmap:kind_detail"] != null) {
    const kind = String(props["pmap:kind"] || "");
    const detail = String(props["pmap:kind_detail"] || "");
    if (kind === "highway") return false;
    if (EXCLUDE_PMAP_DETAIL.has(detail)) return false;
    if (kind === "other" && detail !== "living_street") return false;
    return kind === "path" || kind === "minor_road" || kind === "medium_road" || kind === "major_road" || kind === "other";
  }
  const cls = String(props.class || "");
  if (EXCLUDE_OMT_CLASS.has(cls)) return false;
  if (KEEP_OMT_CLASS.has(cls)) return true;
  return false;
}

export function tileToLonLat(tx, ty, z, extent, px, py) {
  const n = 2 ** z;
  const lon = ((tx + px / extent) / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (ty + py / extent)) / n)));
  return { lon, lat: (latRad * 180) / Math.PI };
}

function roadLayer(tile) {
  return (tile.layers && (tile.layers.roads || tile.layers.transportation)) || null;
}

function parseTileLines(z, x, y, data) {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  const tile = new VectorTile(new Pbf(buf));
  const layer = roadLayer(tile);
  if (!layer) return { lines: [], kept: 0, skipped: 0 };
  const extent = layer.extent || 4096;
  const lines = [];
  let kept = 0;
  let skipped = 0;
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i);
    if (f.type !== 2) continue;
    if (!isWalkableWay(f.properties || {})) {
      skipped += 1;
      continue;
    }
    kept += 1;
    const geom = f.loadGeometry();
    for (const ring of geom) {
      const pts = ring.map((p) => tileToLonLat(x, y, z, extent, p.x, p.y));
      if (pts.length >= 2) lines.push(pts);
    }
  }
  return { lines, kept, skipped };
}


function ringsFromFeature(z, x, y, extent, feature) {
  const geom = feature.loadGeometry();
  const rings = [];
  for (const ring of geom || []) {
    if (feature.type === 3 && ring.length >= 4) {
      rings.push(ring.map((p) => tileToLonLat(x, y, z, extent, p.x, p.y)));
    } else if (feature.type === 2 && ring.length >= 2) {
      // Rail / highway lines are treated as thin barriers by repeating the line
      // as a degenerate strip; crossing tests use the line segments.
      rings.push(ring.map((p) => tileToLonLat(x, y, z, extent, p.x, p.y)));
    }
  }
  return rings;
}

export function extractAreaPolygons(z, x, y, data) {
  const buf = data instanceof Uint8Array ? data : new Uint8Array(data);
  const tile = new VectorTile(new Pbf(buf));
  const open = [];
  const barriers = [];
  const consider = ["landuse", "natural", "park", "water", "buildings", "building", "transit", "roads"];
  for (const name of consider) {
    const layer = tile.layers && tile.layers[name];
    if (!layer) continue;
    const extent = layer.extent || 4096;
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i);
      const props = f.properties || {};
      const rings = ringsFromFeature(z, x, y, extent, f);
      if (!rings.length) continue;
      if (isOpenWalkableProps(props) && f.type === 3) {
        for (const ring of rings) open.push({ kind: props["pmap:kind"] || props.leisure || props.landuse || "open", ring });
      } else if (isBarrierProps(props)) {
        for (const ring of rings) barriers.push({ kind: barrierKind(props), ring });
      }
    }
  }
  return { open, barriers };
}

function midLatOf(lines) {
  let s = 0, n = 0;
  for (const line of lines) {
    for (const p of line) {
      s += p.lat;
      n += 1;
    }
  }
  return n ? s / n : 0;
}

/**
 * Pack a walk graph from geographic lines (arrays of {lon,lat}).
 * Drops isolated fragments smaller than MIN_COMPONENT nodes.
 */

function pointToRingDistanceMeters(point, ring) {
  let best = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const vx = b.lat - a.lat, vy = b.lon - a.lon;
    const len2 = vx * vx + vy * vy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, ((point.lat - a.lat) * vx + (point.lon - a.lon) * vy) / len2)) : 0;
    const hit = { lat: a.lat + vx * t, lon: a.lon + vy * t };
    const d = geodesicMeters(point, hit);
    if (d < best) best = d;
  }
  return best;
}

/** Drop long graph edges that cut through the interior of a sports pitch. */
export function dropPitchCuttingEdges(graph, open, minCut = 40, inset = 8) {
  if (!graph || !graph.edges || !graph.nodes || !open || !open.length) return graph;
  const scale = graph.scale || SCALE;
  const pts = [];
  for (let i = 0; i + 1 < graph.nodes.length; i += 2) {
    pts.push({ lon: graph.nodes[i] / scale, lat: graph.nodes[i + 1] / scale });
  }
  const pitches = open.filter((a) => {
    const k = String(a.kind || a.k || "").toLowerCase();
    return k === "pitch" || k.includes("pitch") || k === "track" || k === "stadium";
  });
  if (!pitches.length) return graph;
  const kept = [];
  for (let i = 0; i + 1 < graph.edges.length; i += 2) {
    const ia = graph.edges[i], ib = graph.edges[i + 1];
    const a = pts[ia], b = pts[ib];
    if (!a || !b) continue;
    const meters = geodesicMeters(a, b);
    const mid = { lat: (a.lat + b.lat) / 2, lon: (a.lon + b.lon) / 2 };
    let cut = false;
    if (meters >= minCut) {
      for (const pitch of pitches) {
        const ring = pitch.ring || [];
        if (ring.length < 4) continue;
        if (pointInRing(mid, ring) && pointToRingDistanceMeters(mid, ring) > inset) {
          cut = true;
          break;
        }
      }
    }
    if (!cut) kept.push(ia, ib);
  }
  graph.edges = kept;
  if (graph.stats) graph.stats.edges = kept.length / 2;
  return graph;
}

export function packWalkGraph(lines, { name = "walk", source = "", minComponent = MIN_COMPONENT } = {}) {
  const midLat = midLatOf(lines);
  const latM = 111320;
  const lonM = 111320 * Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
  const cellLat = GRID_METERS / latM;
  const cellLon = GRID_METERS / lonM;
  const keyOf = (lon, lat) => `${Math.round(lon / cellLon)}:${Math.round(lat / cellLat)}`;

  const nodeMap = new Map();
  const nodes = [];
  function nodeId(lon, lat) {
    const k = keyOf(lon, lat);
    if (nodeMap.has(k)) return nodeMap.get(k);
    const id = nodes.length;
    nodeMap.set(k, id);
    nodes.push({ lon, lat });
    return id;
  }

  const edgeSet = new Set();
  const adj = [];
  function addEdge(a, b) {
    if (a === b) return;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const k = lo + ":" + hi;
    if (edgeSet.has(k)) return;
    edgeSet.add(k);
    (adj[a] || (adj[a] = [])).push(b);
    (adj[b] || (adj[b] = [])).push(a);
  }

  for (const line of lines || []) {
    let prev = -1;
    for (const p of line) {
      if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
      const id = nodeId(p.lon, p.lat);
      if (prev >= 0) addEdge(prev, id);
      prev = id;
    }
  }

  const seen = new Uint8Array(nodes.length);
  const keep = new Uint8Array(nodes.length);
  for (let i = 0; i < nodes.length; i++) {
    if (seen[i]) continue;
    const stack = [i];
    const comp = [];
    seen[i] = 1;
    while (stack.length) {
      const n = stack.pop();
      comp.push(n);
      for (const nb of adj[n] || []) {
        if (!seen[nb]) {
          seen[nb] = 1;
          stack.push(nb);
        }
      }
    }
    if (comp.length >= minComponent) for (const n of comp) keep[n] = 1;
  }

  const remap = new Int32Array(nodes.length).fill(-1);
  const outNodes = [];
  for (let i = 0; i < nodes.length; i++) {
    if (!keep[i]) continue;
    remap[i] = outNodes.length;
    outNodes.push(nodes[i]);
  }
  const outEdges = [];
  for (const k of edgeSet) {
    const [a, b] = k.split(":").map(Number);
    if (remap[a] < 0 || remap[b] < 0) continue;
    outEdges.push(remap[a], remap[b]);
  }

  const packedNodes = [];
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const n of outNodes) {
    packedNodes.push(Math.round(n.lon * SCALE), Math.round(n.lat * SCALE));
    if (n.lon < minLon) minLon = n.lon;
    if (n.lat < minLat) minLat = n.lat;
    if (n.lon > maxLon) maxLon = n.lon;
    if (n.lat > maxLat) maxLat = n.lat;
  }
  if (!outNodes.length) {
    minLon = minLat = maxLon = maxLat = 0;
  }

  return {
    v: GRAPH_VERSION,
    name,
    source,
    attribution: OSM_ATTRIBUTION,
    scale: SCALE,
    bounds: [minLon, minLat, maxLon, maxLat],
    nodes: packedNodes,
    edges: outEdges,
    stats: {
      nodesIn: nodes.length,
      nodesOut: outNodes.length,
      edges: outEdges.length / 2,
    },
  };
}

export function buildWalkGraphFromTiles(tiles, { name, source } = {}) {
  const lines = [];
  let kept = 0;
  let skipped = 0;
  for (const t of tiles || []) {
    if (!t || !t.data) continue;
    const parsed = parseTileLines(t.z, t.x, t.y, t.data);
    kept += parsed.kept;
    skipped += parsed.skipped;
    for (const line of parsed.lines) lines.push(line);
  }
  const graph = packWalkGraph(lines, { name, source });
  const open = [];
  const barriers = [];
  for (const t of tiles || []) {
    if (!t || !t.data) continue;
    try {
      const areas = extractAreaPolygons(t.z, t.x, t.y, t.data);
      open.push(...areas.open);
      barriers.push(...areas.barriers);
    } catch { /* skip a bad tile */ }
  }
  dropPitchCuttingEdges(graph, open);
  graph.open = packRings(open, SCALE);
  graph.blocked = packBlocked(rasterizeBarriers(barriers, graph.bounds, 10));
  graph.stats.keptFeatures = kept;
  graph.stats.skippedFeatures = skipped;
  graph.stats.tiles = (tiles || []).length;
  graph.stats.openAreas = open.length;
  graph.stats.barriers = barriers.length;
  return graph;
}

export function pointsInGraphBounds(graph, points, pad = 0.002) {
  const b = graph && graph.bounds;
  if (!b || !points || !points.length) return false;
  return points.every((p) => {
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
    return p.lon >= b[0] - pad && p.lat >= b[1] - pad && p.lon <= b[2] + pad && p.lat <= b[3] + pad;
  });
}

export function somePointsInGraphBounds(graph, points, pad = 0.002) {
  const b = graph && graph.bounds;
  if (!b || !points || !points.length) return false;
  return points.some((p) => {
    if (!p || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
    return p.lon >= b[0] - pad && p.lat >= b[1] - pad && p.lon <= b[2] + pad && p.lat <= b[3] + pad;
  });
}
