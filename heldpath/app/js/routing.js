/**
 * Offline pedestrian routing over a prebuilt walkable graph.
 * Shortest path is Dijkstra with a binary heap (no external router).
 * The bundled Florence graph is derived from the firenze.pmtiles OSM extract.
 */
import { haversineMeters, destination, pathLengthMeters } from "./util.js";

const DEFAULT_SNAP = 80;
const EARTH_LAT_M = 111320;

let activeGraph = null;

export function setActiveGraph(graph) {
  activeGraph = graph || null;
  return activeGraph;
}

export function getActiveGraph() {
  return activeGraph;
}

export function clearActiveGraph() {
  activeGraph = null;
}

function lonCell(meters, lat) {
  return meters / (EARTH_LAT_M * Math.cos((lat * Math.PI) / 180));
}

export function parseGraph(raw) {
  if (!raw || !raw.nodes || !raw.edges) throw new Error("invalid walk graph");
  const scale = raw.scale || 1e6;
  const packed = raw.nodes;
  const n = packed.length / 2;
  const lon = new Float64Array(n);
  const lat = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    lon[i] = packed[i * 2] / scale;
    lat[i] = packed[i * 2 + 1] / scale;
  }
  const adj = Array.from({ length: n }, () => []);
  const edges = raw.edges;
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i];
    const b = edges[i + 1];
    if (a < 0 || b < 0 || a >= n || b >= n || a === b) continue;
    const meters = haversineMeters(
      { lon: lon[a], lat: lat[a] },
      { lon: lon[b], lat: lat[b] }
    );
    adj[a].push({ to: b, meters });
    adj[b].push({ to: a, meters });
  }
  const bounds = raw.bounds || [
    Math.min.apply(null, lon),
    Math.min.apply(null, lat),
    Math.max.apply(null, lon),
    Math.max.apply(null, lat),
  ];
  const midLat = (bounds[1] + bounds[3]) / 2;
  const cellM = 40;
  const cell = { lat: cellM / EARTH_LAT_M, lon: lonCell(cellM, midLat) };
  const grid = new Map();
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(lon[i] / cell.lon);
    const gy = Math.floor(lat[i] / cell.lat);
    const key = gx + ":" + gy;
    const bucket = grid.get(key);
    if (bucket) bucket.push(i);
    else grid.set(key, [i]);
  }
  return {
    n,
    lon,
    lat,
    adj,
    bounds,
    grid,
    cell,
    name: raw.name || "",
    attribution: raw.attribution || "",
  };
}

export function graphFromNodesEdges(nodes, edges) {
  const packed = [];
  for (const p of nodes) {
    packed.push(Math.round(p.lon * 1e6), Math.round(p.lat * 1e6));
  }
  const flat = [];
  for (const e of edges) flat.push(e[0], e[1]);
  return parseGraph({ v: 1, scale: 1e6, nodes: packed, edges: flat });
}

export function nodePoint(graph, id) {
  return { lat: graph.lat[id], lon: graph.lon[id] };
}

export function inGraphBounds(graph, lat, lon, pad = 0.002) {
  const b = graph.bounds;
  return lon >= b[0] - pad && lat >= b[1] - pad && lon <= b[2] + pad && lat <= b[3] + pad;
}

export function snapToNode(graph, lat, lon, maxMeters = DEFAULT_SNAP) {
  if (!graph) return null;
  const gx = Math.floor(lon / graph.cell.lon);
  const gy = Math.floor(lat / graph.cell.lat);
  const reach = Math.max(1, Math.ceil(maxMeters / 40) + 1);
  let best = -1;
  let bestD = Infinity;
  for (let dx = -reach; dx <= reach; dx++) {
    for (let dy = -reach; dy <= reach; dy++) {
      const bucket = graph.grid.get(gx + dx + ":" + (gy + dy));
      if (!bucket) continue;
      for (const id of bucket) {
        const d = haversineMeters({ lat, lon }, nodePoint(graph, id));
        if (d < bestD) {
          bestD = d;
          best = id;
        }
      }
    }
  }
  if (best < 0 || bestD > maxMeters) return null;
  return { id: best, meters: bestD, lat: graph.lat[best], lon: graph.lon[best] };
}

class MinHeap {
  constructor() {
    this.a = [];
  }
  get size() {
    return this.a.length;
  }
  push(id, pri) {
    const a = this.a;
    a.push({ id, pri });
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].pri <= a[i].pri) break;
      const t = a[p];
      a[p] = a[i];
      a[i] = t;
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (!a.length) return top;
    a[0] = last;
    let i = 0;
    for (;;) {
      let s = i;
      const l = i * 2 + 1;
      const r = l + 1;
      if (l < a.length && a[l].pri < a[s].pri) s = l;
      if (r < a.length && a[r].pri < a[s].pri) s = r;
      if (s === i) break;
      const t = a[i];
      a[i] = a[s];
      a[s] = t;
      i = s;
    }
    return top;
  }
}

export function shortestPath(graph, src, dst, opts = {}) {
  if (!graph || src < 0 || dst < 0) return null;
  if (src === dst) return { nodes: [src], meters: 0 };
  const avoid = opts.avoid == null ? -1 : opts.avoid;
  const dist = new Float64Array(graph.n).fill(Infinity);
  const prev = new Int32Array(graph.n).fill(-1);
  dist[src] = 0;
  const heap = new MinHeap();
  heap.push(src, 0);
  while (heap.size) {
    const cur = heap.pop();
    if (cur.pri !== dist[cur.id]) continue;
    if (cur.id === dst) break;
    const nbrs = graph.adj[cur.id];
    for (let i = 0; i < nbrs.length; i++) {
      const e = nbrs[i];
      if (e.to === avoid && e.to !== dst && e.to !== src) continue;
      const nd = cur.pri + e.meters;
      if (nd < dist[e.to]) {
        dist[e.to] = nd;
        prev[e.to] = cur.id;
        heap.push(e.to, nd);
      }
    }
  }
  if (!Number.isFinite(dist[dst])) return null;
  const nodes = [];
  for (let n = dst; n >= 0; n = prev[n]) nodes.push(n);
  nodes.reverse();
  return { nodes, meters: dist[dst] };
}

function pointsFromNodes(graph, ids) {
  return ids.map((id) => nodePoint(graph, id));
}

function straightLeg(a, b, reason) {
  return {
    points: [
      { lat: a.lat, lon: a.lon },
      { lat: b.lat, lon: b.lon },
    ],
    meters: haversineMeters(a, b),
    mode: "straight",
    reason: reason || "straight-line",
  };
}

export function routePair(graph, a, b, opts = {}) {
  if (!a || !b) return null;
  if (opts.straightLine) return straightLeg(a, b, "toggle");
  if (!graph) return straightLeg(a, b, "no-graph");
  const maxSnap = opts.maxSnap == null ? DEFAULT_SNAP : opts.maxSnap;
  const sa = snapToNode(graph, a.lat, a.lon, maxSnap);
  const sb = snapToNode(graph, b.lat, b.lon, maxSnap);
  if (!sa || !sb) return straightLeg(a, b, "no-snap");
  const path = shortestPath(graph, sa.id, sb.id);
  if (!path) return straightLeg(a, b, "no-route");
  const points = [{ lat: a.lat, lon: a.lon }];
  const mid = pointsFromNodes(graph, path.nodes);
  for (const p of mid) {
    const last = points[points.length - 1];
    if (haversineMeters(last, p) > 0.4) points.push(p);
  }
  const end = { lat: b.lat, lon: b.lon };
  if (haversineMeters(points[points.length - 1], end) > 0.4) points.push(end);
  const meters = path.meters + sa.meters + sb.meters;
  return { points, meters, mode: "routed", snapA: sa, snapB: sb };
}

export function routeLegs(graph, pins, opts = {}) {
  const list = (pins || []).map((p) => ({ ...p }));
  if (list.length < 2) {
    return {
      pins: list,
      path: list.map((p) => ({ lat: p.lat, lon: p.lon })),
      meters: 0,
      legs: [],
      usedStraight: false,
      straightLine: !!opts.straightLine,
    };
  }
  const legs = [];
  const path = [];
  let usedStraight = false;
  for (let i = 0; i < list.length - 1; i++) {
    const leg = routePair(graph, list[i], list[i + 1], opts);
    legs.push({
      meters: leg.meters,
      mode: leg.mode,
      reason: leg.reason || null,
      points: leg.points,
    });
    if (leg.mode === "straight") usedStraight = true;
    if (!path.length) path.push(...leg.points);
    else {
      const rest = leg.points.slice(1);
      path.push(...rest);
    }
  }
  return {
    pins: list,
    path,
    meters: pathLengthMeters(path),
    legs,
    usedStraight,
    straightLine: !!opts.straightLine,
  };
}

function uniqueStops(ids) {
  const out = [];
  for (const id of ids) {
    if (!out.length || out[out.length - 1] !== id) out.push(id);
  }
  return out;
}

/**
 * Build a closed walkable loop near `center` of about `targetMeters`.
 * Waypoints are snapped from a circle; heading, radius and waypoint count
 * are searched (deterministically) to hit the target. Returns
 * { pins, path, meters, fallback } — fallback is "rectangle" when the
 * graph cannot produce a loop.
 */
export function autoLoopRoute(graph, center, targetMeters, opts = {}) {
  const target = Math.max(200, Number(targetMeters) || 0);
  if (!graph || !center) return { fallback: "rectangle", pins: null, path: null, meters: 0 };

  const start = snapToNode(graph, center.lat, center.lon, opts.maxSnap || 120);
  if (!start) return { fallback: "rectangle", pins: null, path: null, meters: 0 };

  const pathCache = new Map();
  function hop(a, b, avoid) {
    const key = a + ">" + b + ">" + (avoid == null ? -1 : avoid);
    if (pathCache.has(key)) return pathCache.get(key);
    const res = shortestPath(graph, a, b, avoid == null ? {} : { avoid });
    pathCache.set(key, res);
    return res;
  }

  function assemble(stops, viaPts) {
    const path = [];
    let meters = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const piece = hop(stops[i], stops[i + 1]);
      if (!piece) return null;
      meters += piece.meters;
      const pts = pointsFromNodes(graph, piece.nodes);
      if (!path.length) path.push(...pts);
      else path.push(...pts.slice(1));
    }
    if (path.length < 4) return null;
    const pins = [{ lat: start.lat, lon: start.lon, role: "start" }];
    const vias = viaPts || [];
    const step = Math.max(1, Math.floor(vias.length / 3) || 1);
    for (let i = 0; i < vias.length; i += step) {
      const p = vias[i];
      if (p.id === start.id) continue;
      pins.push({ lat: p.lat, lon: p.lon, role: "via" });
    }
    pins.push({ lat: start.lat, lon: start.lon, role: "end" });
    return { pins, path, meters, fallback: null };
  }

  function tryOnce(radius, count, offsetDeg) {
    const ids = [start.id];
    const viaPts = [];
    for (let i = 0; i < count; i++) {
      const bearing = offsetDeg + (i * 360) / count;
      const dest = destination(center.lat, center.lon, bearing, radius);
      const snap = snapToNode(graph, dest.lat, dest.lon, Math.max(80, radius * 0.45));
      if (!snap) return null;
      viaPts.push(snap);
      if (snap.id !== ids[ids.length - 1]) ids.push(snap.id);
    }
    if (ids[ids.length - 1] !== start.id) ids.push(start.id);
    const stops = uniqueStops(ids);
    if (stops.length < 3) return null;
    if (stops[0] !== stops[stops.length - 1]) stops.push(stops[0]);
    const built = assemble(stops, viaPts);
    if (!built || built.meters < target * 0.4) return null;
    return built;
  }

  function smallestBlock() {
    const nbrs = graph.adj[start.id] || [];
    let best = null;
    for (let i = 0; i < nbrs.length; i++) {
      for (let j = i + 1; j < nbrs.length; j++) {
        const mid = hop(nbrs[i].to, nbrs[j].to, start.id);
        if (!mid) continue;
        const meters = mid.meters + nbrs[i].meters + nbrs[j].meters;
        if (meters < 80) continue;
        const nodes = [start.id, nbrs[i].to, ...mid.nodes.slice(1), start.id];
        const viaPts = [
          { id: nbrs[i].to, lat: graph.lat[nbrs[i].to], lon: graph.lon[nbrs[i].to] },
          { id: nbrs[j].to, lat: graph.lat[nbrs[j].to], lon: graph.lon[nbrs[j].to] },
        ];
        const built = assemble(uniqueStops(nodes).concat(uniqueStops(nodes)[0] === nodes[nodes.length-1] ? [] : [start.id]), viaPts);
        // assemble from the path nodes more carefully:
        const path = pointsFromNodes(graph, [start.id, ...mid.nodes, start.id]);
        path[0] = { lat: start.lat, lon: start.lon };
        path[path.length - 1] = { lat: start.lat, lon: start.lon };
        const cand = {
          pins: [
            { lat: start.lat, lon: start.lon, role: "start" },
            { lat: graph.lat[nbrs[i].to], lon: graph.lon[nbrs[i].to], role: "via" },
            { lat: graph.lat[nbrs[j].to], lon: graph.lon[nbrs[j].to], role: "via" },
            { lat: start.lat, lon: start.lon, role: "end" },
          ],
          path,
          meters,
          fallback: null,
        };
        if (!best || Math.abs(cand.meters - target) < Math.abs(best.meters - target)) best = cand;
      }
    }
    return best;
  }

  const baseR = target / (2 * Math.PI);
  const counts = opts.waypointCounts || [3, 4, 5, 6];
  const scales = opts.scales || [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.65, 0.8, 1.0, 1.2];
  const offsets = opts.offsets || [0, 20, 40, 60, 80, 100, 120, 150];
  let best = target < 700 ? smallestBlock() : null;
  const close = target * 0.05;
  outer: for (const offsetDeg of offsets) {
    for (const count of counts) {
      for (const scale of scales) {
        const cand = tryOnce(baseR * scale, count, offsetDeg);
        if (!cand) continue;
        if (!best || Math.abs(cand.meters - target) < Math.abs(best.meters - target)) best = cand;
        if (Math.abs(best.meters - target) <= close) break outer;
      }
    }
  }
  return best || { fallback: "rectangle", pins: null, path: null, meters: 0 };
}

export function coursePath(course) {
  if (!course) return [];
  if (course.path && course.path.length >= 2) return course.path;
  return (course.pins || []).map((p) => ({ lat: p.lat, lon: p.lon }));
}

export function courseMeters(course) {
  return pathLengthMeters(coursePath(course));
}

const BUNDLED_GRAPH_URL = "./maps/firenze_walk.json";

export async function loadBundledGraph(url = BUNDLED_GRAPH_URL) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("walk graph missing: " + res.status);
  const graph = parseGraph(await res.json());
  setActiveGraph(graph);
  return graph;
}

export const BUNDLED_GRAPH = BUNDLED_GRAPH_URL;
