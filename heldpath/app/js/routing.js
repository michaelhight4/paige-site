/**
 * Offline pedestrian routing over a prebuilt walkable graph.
 * Shortest path is Dijkstra with a binary heap (no external router).
 * The bundled Florence graph is derived from the firenze.pmtiles OSM extract.
 */
import { haversineMeters, destination, pathLengthMeters, geodesicMeters } from "./util.js";
import { openAreaLegAllowed, unpackRings, unpackBlocked } from "./open_areas.js";

export const DEFAULT_SNAP = 200;
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
    const meters = geodesicMeters(
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
    openAreas: unpackRings(raw.open || raw.openAreas),
    barriers: unpackRings(raw.barriers),
    blocked: unpackBlocked(raw.blocked),
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

function pairPoints(a, b) {
  return [
    { lat: a.lat, lon: a.lon },
    { lat: b.lat, lon: b.lon },
  ];
}

function straightLeg(a, b, reason) {
  const meters = geodesicMeters(a, b);
  return {
    points: pairPoints(a, b),
    meters,
    straightMeters: meters,
    mode: "straight",
    reason: reason || "straight-line",
    offMap: reason === "off-map" || reason === "use-anyway",
  };
}

/** A gap with no walkable path. Not counted until the user chooses Use anyway. */
function unroutableLeg(a, b, reason) {
  return {
    points: pairPoints(a, b),
    meters: 0,
    straightMeters: geodesicMeters(a, b),
    mode: "unroutable",
    reason: reason || "no-route",
  };
}

export function legKey(a, b) {
  if (!a || !b) return "";
  const fmt = (p) => `${Number(p.lat).toFixed(6)},${Number(p.lon).toFixed(6)}`;
  return `${fmt(a)}>${fmt(b)}`;
}

export function routePair(graph, a, b, opts = {}) {
  if (!a || !b) return null;
  if (opts.straightLine) return straightLeg(a, b, "toggle");
  if (opts.allowStraight) return straightLeg(a, b, "off-map");
  // Open walkable areas (soccer pitches, parks, grass, tracks…) take
  // priority over a network detour around the field: both pins in the
  // same polygon and a clear straight line is a normal valid leg.
  if (graph && openAreaLegAllowed(graph, a, b)) {
    return straightLeg(a, b, "open-area");
  }
  if (!graph) return unroutableLeg(a, b, "no-graph");
  const maxSnap = opts.maxSnap == null ? DEFAULT_SNAP : opts.maxSnap;
  const sa = snapToNode(graph, a.lat, a.lon, maxSnap);
  const sb = snapToNode(graph, b.lat, b.lon, maxSnap);
  if (!sa || !sb) return unroutableLeg(a, b, "no-snap");
  const path = shortestPath(graph, sa.id, sb.id);
  if (!path) return unroutableLeg(a, b, "no-route");
  const points = [{ lat: a.lat, lon: a.lon }];
  const mid = pointsFromNodes(graph, path.nodes);
  for (const p of mid) {
    const last = points[points.length - 1];
    if (haversineMeters(last, p) > 0.4) points.push(p);
  }
  const end = { lat: b.lat, lon: b.lon };
  if (haversineMeters(points[points.length - 1], end) > 0.4) points.push(end);
  // Measure the exact drawn geometry, segment by segment, no simplification.
  const meters = pathLengthMeters(points);
  return { points, meters, mode: "routed", snapA: sa, snapB: sb };
}

function pinsSharePrefix(a, b) {
  if (!a || !b) return 0;
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] && b[i] && a[i].lat === b[i].lat && a[i].lon === b[i].lon) i++;
  return i;
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
  // Reuse unchanged prefix legs when adding/undoing pins so a 100+ stop
  // (marathon-length) course stays fast in the builder.
  const prev = opts.previous;
  const canReuse = prev && !!prev.straightLine === !!opts.straightLine
    && Array.isArray(prev.legs) && Array.isArray(prev.pins)
    && prev._graph === graph;
  const shared = canReuse ? pinsSharePrefix(prev.pins, list) : 0;
  const reuseLegs = canReuse && shared >= 2 ? prev.legs.slice(0, shared - 1) : [];

  const legs = reuseLegs.slice();
  const path = [];
  let usedStraight = legs.some((l) => l.mode === "straight" && l.reason !== "open-area");
  if (legs.length) {
    for (let i = 0; i < legs.length; i++) {
      const pts = legs[i].points || [];
      if (!path.length) path.push(...pts);
      else path.push(...pts.slice(1));
    }
  }
  for (let i = legs.length; i < list.length - 1; i++) {
    const key = legKey(list[i], list[i + 1]);
    const overrides = opts.straightOverrides;
    const override = !!(overrides && (
      (typeof overrides.has === "function" && overrides.has(key))
      || (Array.isArray(overrides) && overrides.includes(key))
    ));
    const leg = routePair(graph, list[i], list[i + 1], {
      straightLine: !!opts.straightLine,
      allowStraight: override && !opts.straightLine,
      maxSnap: opts.maxSnap,
    });
    legs.push({
      meters: leg.meters,
      straightMeters: leg.straightMeters,
      mode: leg.mode,
      reason: leg.reason || null,
      offMap: !!leg.offMap,
      points: leg.points,
      key,
    });
    if (leg.mode === "straight" && leg.reason !== "open-area") usedStraight = true;
    if (!path.length) path.push(...leg.points);
    else path.push(...leg.points.slice(1));
  }
  const unroutable = legs.some((l) => l.mode === "unroutable");
  const offMap = legs.some((l) => l.offMap);
  const meters = legs.reduce((s, l) => s + (l.mode === "unroutable" ? 0 : (Number(l.meters) || 0)), 0);
  return {
    pins: list,
    path,
    meters,
    legs,
    usedStraight,
    unroutable,
    offMap,
    straightLine: !!opts.straightLine,
    _graph: graph,
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
 * are searched (deterministically) to hit the target. Never invents a
 * silent straight-line rectangle: if a walkable loop cannot be built,
 * returns { ok: false, reason }.
 */

function bearingDegrees(a, b) {
  const lat1 = Number(a.lat) * Math.PI / 180;
  const lat2 = Number(b.lat) * Math.PI / 180;
  const dLon = (Number(b.lon) - Number(a.lon)) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function turnDelta(fromDeg, toDeg) {
  let d = Math.abs(Number(fromDeg) - Number(toDeg)) % 360;
  return d > 180 ? 360 - d : d;
}

export function autoLoopFailed(reason) {
  return { ok: false, reason: reason || "no-loop", pins: null, path: null, meters: 0, fallback: null };
}

function attachLoopToUser(built, center) {
  if (!built || !built.path || built.path.length < 4 || !center) return built;
  const start = { lat: Number(center.lat), lon: Number(center.lon) };
  const path = [start, ...built.path];
  const last = path[path.length - 1];
  if (haversineMeters(last, start) > 0.5) path.push({ ...start });
  else path[path.length - 1] = { ...start };
  const pins = (built.pins || []).map((p) => ({ ...p }));
  if (pins.length) {
    pins[0] = { lat: start.lat, lon: start.lon, role: "start" };
    pins[pins.length - 1] = { lat: start.lat, lon: start.lon, role: "end" };
  }
  return { ...built, ok: true, fallback: null, pins, path, meters: pathLengthMeters(path) };
}

export function autoLoopRoute(graph, center, targetMeters, opts = {}) {
  const target = Math.max(200, Number(targetMeters) || 0);
  if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lon))) {
    return autoLoopFailed("no-center");
  }
  if (!graph) return autoLoopFailed("no-graph");

  const pathCache = new Map();
  function hop(a, b, avoid) {
    const key = a + ">" + b + ">" + (avoid == null ? -1 : avoid);
    if (pathCache.has(key)) return pathCache.get(key);
    const res = shortestPath(graph, a, b, avoid == null ? {} : { avoid });
    pathCache.set(key, res);
    return res;
  }

  function assemble(start, stops, viaPts, opts = {}) {
    const path = [];
    let meters = 0;
    const maxDetour = opts.maxDetour || 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const piece = hop(stops[i], stops[i + 1]);
      if (!piece) return null;
      if (maxDetour) {
        const a = { lat: graph.lat[stops[i]], lon: graph.lon[stops[i]] };
        const b = { lat: graph.lat[stops[i + 1]], lon: graph.lon[stops[i + 1]] };
        const crow = haversineMeters(a, b);
        if (crow > 5 && piece.meters > crow * maxDetour + 80) return null;
      }
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
    return { pins, path, meters, fallback: null, ok: true };
  }

  function tryOnce(start, radius, count, offsetDeg, snapPad) {
    const ids = [start.id];
    const viaPts = [];
    for (let i = 0; i < count; i++) {
      const bearing = offsetDeg + (i * 360) / count;
      const dest = destination(center.lat, center.lon, bearing, radius);
      const snap = snapToNode(graph, dest.lat, dest.lon, Math.max(snapPad || 80, radius * 0.45));
      if (!snap) return null;
      viaPts.push(snap);
      if (snap.id !== ids[ids.length - 1]) ids.push(snap.id);
    }
    if (ids[ids.length - 1] !== start.id) ids.push(start.id);
    const stops = uniqueStops(ids);
    if (stops.length < 3) return null;
    if (stops[0] !== stops[stops.length - 1]) stops.push(stops[0]);
    const built = assemble(start, stops, viaPts, { maxDetour: 3 });
    if (!built || built.meters < target * 0.55 || built.meters > target * 1.6) return null;
    built.quality = loopQuality(built.path);
    return built;
  }

  function edgeKey(a, b) {
    return a < b ? a + ":" + b : b + ":" + a;
  }

  function walkToward(fromId, heading, budgetMeters, used) {
    const nodes = [fromId];
    let id = fromId;
    let meters = 0;
    let prev = -1;
    const seen = used || new Set();
    for (let guard = 0; guard < 500 && meters < budgetMeters; guard++) {
      const nbrs = graph.adj[id] || [];
      if (!nbrs.length) break;
      let best = null;
      let bestScore = Infinity;
      for (const e of nbrs) {
        if (e.to === prev) continue;
        const brg = bearingDegrees(
          { lat: graph.lat[id], lon: graph.lon[id] },
          { lat: graph.lat[e.to], lon: graph.lon[e.to] }
        );
        const reused = seen.has(edgeKey(id, e.to));
        const score = turnDelta(heading, brg) + (reused ? 80 : 0);
        if (score < bestScore) {
          bestScore = score;
          best = e;
        }
      }
      if (!best) {
        for (const e of nbrs) {
          if (e.to === prev) { best = e; break; }
        }
      }
      if (!best) break;
      seen.add(edgeKey(id, best.to));
      prev = id;
      id = best.to;
      meters += best.meters;
      nodes.push(id);
    }
    return { nodes, meters, end: id };
  }

  function loopQuality(pts) {
    if (!pts || pts.length < 4) return 0;
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const p of pts) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
    const height = haversineMeters({ lat: minLat, lon: minLon }, { lat: maxLat, lon: minLon });
    const width = haversineMeters({ lat: minLat, lon: minLon }, { lat: minLat, lon: maxLon });
    const short = Math.min(width, height);
    const long = Math.max(width, height) || 1;
    return short / long;
  }

  function retraceRatio(nodes) {
    if (!nodes || nodes.length < 3) return 1;
    const seen = new Set();
    let reused = 0, total = 0;
    for (let i = 1; i < nodes.length; i++) {
      const key = edgeKey(nodes[i - 1], nodes[i]);
      total++;
      if (seen.has(key)) reused++;
      else seen.add(key);
    }
    return total ? reused / total : 1;
  }

  function tryHeadingLoop(start, sides, offsetDeg, scale, shareUsed = true) {
    const budget = (target / sides) * scale;
    const nodes = [start.id];
    const viaPts = [];
    const used = shareUsed ? new Set() : null;
    let id = start.id;
    for (let s = 0; s < sides; s++) {
      const heading = (offsetDeg + (s * 360) / sides) % 360;
      const walk = walkToward(id, heading, budget, used);
      if (!walk.nodes.length || walk.end == null) return null;
      for (const n of walk.nodes.slice(1)) {
        if (n !== nodes[nodes.length - 1]) nodes.push(n);
      }
      const viaId = walk.end;
      viaPts.push({ id: viaId, lat: graph.lat[viaId], lon: graph.lon[viaId] });
      id = walk.end;
    }
    if (nodes[nodes.length - 1] !== start.id) {
      const closeHop = hop(nodes[nodes.length - 1], start.id);
      if (!closeHop) return null;
      const crow = haversineMeters(
        { lat: graph.lat[nodes[nodes.length - 1]], lon: graph.lon[nodes[nodes.length - 1]] },
        { lat: start.lat, lon: start.lon }
      );
      if (crow > 0.5 && closeHop.meters > crow * 3 + 80) return null;
      if (closeHop.meters > target * 0.45) return null;
      for (const n of closeHop.nodes.slice(1)) {
        if (n !== nodes[nodes.length - 1]) nodes.push(n);
      }
    }
    if (nodes.length < 4) return null;
    const pts = pointsFromNodes(graph, nodes);
    if (pts.length < 4) return null;
    pts[0] = { lat: start.lat, lon: start.lon };
    pts[pts.length - 1] = { lat: start.lat, lon: start.lon };
    const meters = pathLengthMeters(pts);
    if (meters < target * 0.55 || meters > target * 1.6) return null;
    const pins = [{ lat: start.lat, lon: start.lon, role: "start" }];
    const step = Math.max(1, Math.floor(viaPts.length / 3) || 1);
    for (let i = 0; i < viaPts.length; i += step) {
      const p = viaPts[i];
      if (p.id === start.id) continue;
      pins.push({ lat: p.lat, lon: p.lon, role: "via" });
    }
    pins.push({ lat: start.lat, lon: start.lon, role: "end" });
    return { pins, path: pts, meters, fallback: null, ok: true, quality: loopQuality(pts), retrace: retraceRatio(nodes) };
  }

  function smallestBlock(start) {
    const nbrs = graph.adj[start.id] || [];
    let best = null;
    for (let i = 0; i < nbrs.length; i++) {
      for (let j = i + 1; j < nbrs.length; j++) {
        const mid = hop(nbrs[i].to, nbrs[j].to, start.id);
        if (!mid) continue;
        const meters = mid.meters + nbrs[i].meters + nbrs[j].meters;
        if (meters < 80 || meters > target * 1.8) continue;
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
          ok: true,
        };
        if (!best || Math.abs(cand.meters - target) < Math.abs(best.meters - target)) best = cand;
      }
    }
    return best;
  }

  function loopRank(cand) {
    const err = Math.abs(cand.meters - target) / target;
    const q = Number(cand.quality);
    const quality = Number.isFinite(q) ? q : loopQuality(cand.path);
    const retrace = Number(cand.retrace);
    const shaped = quality >= 0.18 && !(retrace > 0.25);
    // Length first: never prefer an off-target circuit over a ±5% loop.
    if (err <= 0.05 && shaped) return 0;
    if (err <= 0.05) return 1;
    if (err <= 0.08 && shaped) return 2;
    if (err <= 0.10 && shaped) return 3;
    return 4;
  }

  function consider(cand, best) {
    if (!cand) return best;
    const attached = attachLoopToUser(cand, center);
    if (!attached || !attached.path) return best;
    attached.quality = cand.quality != null ? cand.quality : loopQuality(attached.path);
    attached.retrace = cand.retrace;
    attached._rank = loopRank(attached);
    attached._err = Math.abs(attached.meters - target);
    if (!best) return attached;
    if (attached._rank < best._rank) return attached;
    if (attached._rank === best._rank && attached._err < best._err) return attached;
    return best;
  }

  function searchWithStart(start, counts, scales, offsets) {
    const baseR = target / (2 * Math.PI);
    let best = target < 700 ? consider(smallestBlock(start), null) : null;
    const close = target * 0.05;
    const headingScales = opts.headingScales || [0.7, 0.8, 0.85, 0.9, 0.93, 0.96, 0.98, 1.0, 1.02, 1.05, 1.08, 1.12, 1.18, 1.25, 1.35];
    outer: for (const offsetDeg of offsets) {
      for (const count of counts) {
        for (const scale of headingScales) {
          best = consider(tryHeadingLoop(start, count, offsetDeg, scale), best);
          if (best && best._rank === 0) break outer;
        }
      }
    }
    if (!(best && best._rank <= 1)) {
      outerU: for (const offsetDeg of offsets) {
        for (const count of counts) {
          for (const scale of headingScales) {
            best = consider(tryHeadingLoop(start, count, offsetDeg, scale, false), best);
            if (best && best._rank <= 1) break outerU;
          }
        }
      }
    }
    if (!(best && best._rank <= 1)) {
      outer2: for (const offsetDeg of offsets) {
        for (const count of counts) {
          for (const scale of scales) {
            best = consider(tryOnce(start, baseR * scale, count, offsetDeg, Math.max(80, start._snap || 120)), best);
            if (best && best._rank <= 1) break outer2;
          }
        }
      }
    }
    return best;
  }

  const tightCounts = opts.waypointCounts || [3, 4, 5, 6];
  const tightScales = opts.scales || [0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.65, 0.8, 1.0, 1.2];
  const tightOffsets = opts.offsets || [0, 20, 40, 60, 80, 100, 120, 150];
  const wideCounts = opts.wideCounts || [3, 4, 5, 6, 7, 8];
  const wideScales = opts.wideScales || [0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1.0, 1.15, 1.3, 1.5, 1.7];
  const wideOffsets = opts.wideOffsets || [0, 15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165];
  const snapRadii = opts.snapRadii || [120, 200, 350, 500];

  let best = null;
  const close = target * 0.05;
  for (const maxSnap of snapRadii) {
    const start = snapToNode(graph, center.lat, center.lon, maxSnap);
    if (!start) continue;
    start._snap = maxSnap;
    // Tight search first (keeps existing loops stable); widen if we miss ±5%.
    const first = searchWithStart(start, tightCounts, tightScales, tightOffsets);
    const wide = (!first || Math.abs(first.meters - target) > close)
      ? searchWithStart(start, wideCounts, wideScales, wideOffsets)
      : null;
    for (const cand of [first, wide]) {
      if (!cand) continue;
      if (!best || Math.abs(cand.meters - target) < Math.abs(best.meters - target)) best = cand;
    }
    if (best && best._rank === 0) break;
  }
  if (!best) return autoLoopFailed("no-loop");
  return best.path && best.path[0] && haversineMeters(best.path[0], center) < 1
    ? best
    : attachLoopToUser(best, center);
}

export function coursePath(course) {
  if (!course) return [];
  if (course.path && course.path.length >= 2) return course.path;
  return (course.pins || []).map((p) => ({ lat: p.lat, lon: p.lon }));
}

export function courseMeters(course) {
  if (course && Array.isArray(course.legs) && course.legs.length) {
    return course.legs.reduce((s, l) => s + (l.mode === "unroutable" ? 0 : (Number(l.meters) || 0)), 0);
  }
  return pathLengthMeters(coursePath(course));
}

const BUNDLED_GRAPH_URL = "./maps/firenze_walk.json";

export async function loadBundledGraph(url = BUNDLED_GRAPH_URL, { activate = true } = {}) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("walk graph missing: " + res.status);
  const graph = parseGraph(await res.json());
  if (activate) setActiveGraph(graph);
  return graph;
}

export const BUNDLED_GRAPH = BUNDLED_GRAPH_URL;
