/**
 * Pre-run low-signal prompt: tunnels/covered ways, or a route outside
 * downloaded map coverage. Skip when the route area is already on the phone
 * and no tunnel or covered stretch is on the path.
 */
import { haversineMeters } from "./util.js";
import { normalizeBbox, OFM_USER_AGENT } from "./map_tiles.js";
import { allowsOverpass } from "./privacy_data.js";
import { tunnelsFromTiles } from "./offline_places.js";
import { listCachedTiles } from "./map_storage.js";

export const LOW_SIGNAL_COPY = "Parts of this route may have weak signal. Download the route area for the best accuracy?";
export const SAMPLE_STEP_M = 50;
export const BBOX_PAD_M = 200;
export const TUNNEL_NEAR_M = 40;
export const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const SKIP_TUNNEL = new Set(["", "no", "false", "0", "none"]);

export function pathBbox(points, padMeters = BBOX_PAD_M) {
  const pts = (points || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (!pts.length) return null;
  let west = pts[0].lon, east = pts[0].lon, south = pts[0].lat, north = pts[0].lat;
  for (const p of pts) {
    if (p.lon < west) west = p.lon;
    if (p.lon > east) east = p.lon;
    if (p.lat < south) south = p.lat;
    if (p.lat > north) north = p.lat;
  }
  const midLat = (south + north) / 2;
  const dLat = padMeters / 111320;
  const cos = Math.max(0.2, Math.cos((midLat * Math.PI) / 180));
  const dLon = padMeters / (111320 * cos);
  return normalizeBbox({
    west: west - dLon,
    east: east + dLon,
    south: south - dLat,
    north: north + dLat,
  });
}

export function pointInArea(point, area) {
  if (!point || !area) return false;
  return point.lon >= area.west && point.lon <= area.east && point.lat >= area.south && point.lat <= area.north;
}

export function samplePath(points, stepMeters = SAMPLE_STEP_M) {
  const pts = (points || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (!pts.length) return [];
  const out = [{ lat: pts[0].lat, lon: pts[0].lon }];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = haversineMeters(a, b);
    if (!(d > 0)) continue;
    let remain = d;
    let from = a;
    while (acc + remain >= stepMeters) {
      const need = stepMeters - acc;
      const t = need / (haversineMeters(from, b) || remain);
      from = { lat: from.lat + (b.lat - from.lat) * t, lon: from.lon + (b.lon - from.lon) * t };
      out.push(from);
      remain = haversineMeters(from, b);
      acc = 0;
    }
    acc += remain;
  }
  const last = pts[pts.length - 1];
  const prev = out[out.length - 1];
  if (!prev || prev.lat !== last.lat || prev.lon !== last.lon) out.push({ lat: last.lat, lon: last.lon });
  return out;
}

export function coverageGaps(points, areas) {
  const samples = samplePath(points);
  const list = areas || [];
  return samples.filter((p) => !list.some((a) => pointInArea(p, a)));
}

export function isCovered(points, areas) {
  const pts = (points || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (!pts.length) return false;
  return coverageGaps(pts, areas).length === 0;
}

export function isLowSignalTag(tags) {
  if (!tags || typeof tags !== "object") return false;
  if (tags.tunnel != null && !SKIP_TUNNEL.has(String(tags.tunnel).toLowerCase())) return true;
  if (tags.covered != null && !SKIP_TUNNEL.has(String(tags.covered).toLowerCase())) return true;
  return false;
}

function wayPoints(way) {
  if (way && Array.isArray(way.geometry)) {
    return way.geometry.map((g) => ({ lat: g.lat, lon: g.lon }));
  }
  return way && way.points ? way.points : [];
}

export function wayNearPath(way, path, maxMeters = TUNNEL_NEAR_M) {
  const pts = wayPoints(way);
  const samples = samplePath(path, Math.min(SAMPLE_STEP_M, maxMeters));
  if (!pts.length || !samples.length) return false;
  for (const a of pts) {
    for (const b of samples) {
      if (haversineMeters(a, b) <= maxMeters) return true;
    }
  }
  return false;
}

export function tunnelsOnPath(ways, path) {
  return (ways || []).filter((w) => isLowSignalTag(w.tags || w) && wayNearPath(w, path));
}

/**
 * Decide whether to show the pre-run prompt.
 * Covered routes with no tunnels are skipped. A coverage gap or a tunnel /
 * covered stretch on the path is enough to show it.
 */
export function assessLowSignal({ path, areas = [], ways = [] } = {}) {
  const pts = path || [];
  const bbox = pathBbox(pts);
  const covered = isCovered(pts, areas);
  const tunnels = tunnelsOnPath(ways, pts);
  const coverageGap = !covered;
  const hasTunnels = tunnels.length > 0;
  const show = !!(bbox && pts.length >= 2 && (coverageGap || hasTunnels));
  return {
    show,
    covered,
    coverageGap,
    hasTunnels,
    tunnels,
    bbox,
    copy: LOW_SIGNAL_COPY,
  };
}

export function overpassQuery(bbox) {
  const box = normalizeBbox(bbox);
  const s = box.south.toFixed(6);
  const w = box.west.toFixed(6);
  const n = box.north.toFixed(6);
  const e = box.east.toFixed(6);
  return `[out:json][timeout:12];(way["tunnel"](${s},${w},${n},${e});way["covered"](${s},${w},${n},${e}););out geom tags;`;
}

export function waysFromOverpass(json) {
  const els = (json && json.elements) || [];
  return els
    .filter((el) => el && el.type === "way" && isLowSignalTag(el.tags) && Array.isArray(el.geometry))
    .map((el) => ({ id: el.id, tags: el.tags, geometry: el.geometry }));
}

let tunnelFetcher = defaultTunnelFetcher;

export function setTunnelFetcher(fn) {
  tunnelFetcher = typeof fn === "function" ? fn : defaultTunnelFetcher;
}

async function defaultTunnelFetcher(bbox, fetchFn = fetch) {
  const res = await fetchFn(OVERPASS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": OFM_USER_AGENT,
    },
    body: "data=" + encodeURIComponent(overpassQuery(bbox)),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return waysFromOverpass(json);
}

export async function loadTunnelWays(bbox, { fetchFn, timeoutMs = 8000 } = {}) {
  if (!bbox) return [];
  const work = Promise.resolve().then(() => tunnelFetcher(bbox, fetchFn || fetch));
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve([]), timeoutMs);
  });
  try {
    const ways = await Promise.race([work.catch(() => []), timeout]);
    return Array.isArray(ways) ? ways : [];
  } finally {
    clearTimeout(timer);
  }
}

export function shouldFetchTunnels() {
  try {
    if (typeof navigator !== "undefined" && navigator.webdriver) return false;
    if (typeof location !== "undefined") {
      const q = new URLSearchParams(location.search);
      if (q.has("screen") || q.has("nosw")) return false;
    }
  } catch { /* ignore */ }
  // Overpass is opt-in. Off by default so a map area is never sent off-device.
  return allowsOverpass();
}

export async function loadOfflineTunnelWays() {
  try {
    const tiles = await listCachedTiles();
    return tunnelsFromTiles(tiles);
  } catch {
    return [];
  }
}

export async function assessRouteLowSignal(path, { areas, ways, fetchFn, timeoutMs } = {}) {
  const pts = path || [];
  const bbox = pathBbox(pts);
  const areaList = areas || [];
  let found = ways;
  if (found == null) {
    found = await loadOfflineTunnelWays();
    if (shouldFetchTunnels()) {
      try {
        const online = await loadTunnelWays(bbox, { fetchFn, timeoutMs });
        if (online && online.length) found = found.concat(online);
      } catch { /* keep offline ways */ }
    }
  }
  return assessLowSignal({ path: pts, areas: areaList, ways: found });
}
