/**
 * Personal heatmap — the ground you have already covered, painted from your
 * own stored tracks. On-device only: there is no community heatmap and no
 * server. Repeated ground is brighter because segments are counted on a
 * coarse local grid.
 *
 * Pure helpers (filtering, grid counting, GeoJSON) are safe to import from
 * Node tests. The map painters accept an existing MapLibre map instance, so
 * the map stays owned by www/js/map.js.
 */
import { pathLengthMeters } from "./util.js";

export const HEATMAP_SOURCE = "heldpath-heatmap";
export const HEATMAP_GLOW_LAYER = "heldpath-heatmap-glow";
export const HEATMAP_LINE_LAYER = "heldpath-heatmap-line";
export const HEATMAP_CELL_M = 25;

export const SPORT_FILTERS = [
  { id: "all", label: "All" },
  { id: "walk", label: "Walk" },
  { id: "run", label: "Run" },
  { id: "ride", label: "Ride" },
];

export const RANGE_FILTERS = [
  { id: "30d", label: "30 days", days: 30 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "12m", label: "12 months", days: 365 },
  { id: "all", label: "All time", days: null },
];

/** Normalise stored activity types. Biking is stored as ride (or bike). */
export function sportOf(activity) {
  const raw = String((activity && activity.type) || "walk").toLowerCase();
  if (raw === "ride" || raw === "bike" || raw === "cycle" || raw === "cycling") return "ride";
  if (raw === "run" || raw === "running") return "run";
  return "walk";
}

export function sportLabel(sport) {
  const id = sport === "ride" ? "ride" : sport === "run" ? "run" : "walk";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function pointTime(activity) {
  const raw = (activity && (activity.startedAt || activity.endedAt)) || "";
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/** Prefer the displayed track; fall back to raw GPS or a stored path so empty lag-bug tracks still paint. */
export function activityRoute(activity) {
  const candidates = [
    activity && activity.track,
    activity && activity.rawTrack,
    activity && activity.path,
  ];
  let best = [];
  for (const list of candidates) {
    if (!Array.isArray(list)) continue;
    const pts = list.filter(validPoint);
    if (pts.length > best.length) best = pts;
  }
  return best;
}

function rangeStart(range, now) {
  const preset = RANGE_FILTERS.find((r) => r.id === range);
  if (!preset || preset.days == null) return null;
  return (now instanceof Date ? now.getTime() : Date.now()) - preset.days * 86400000;
}

/** Filter stored activities by sport and date range. `since`/`until` win over `range`. */
export function filterActivities(activities, opts = {}) {
  const sport = opts.sport || "all";
  const since = opts.since != null
    ? Date.parse(opts.since)
    : (opts.range ? rangeStart(opts.range, opts.now) : null);
  const until = opts.until != null ? Date.parse(opts.until) : null;
  return (activities || []).filter((a) => {
    if (!a || activityRoute(a).length < 2) return false;
    if (sport !== "all" && sportOf(a) !== sport) return false;
    const t = pointTime(a);
    if (Number.isFinite(since) && t != null && t < since) return false;
    if (Number.isFinite(until) && t != null && t > until) return false;
    return true;
  });
}

function cellKey(lat, lon, cellM = HEATMAP_CELL_M) {
  const latM = 111320;
  const lonM = latM * Math.max(0.1, Math.cos((Number(lat) * Math.PI) / 180));
  return `${Math.round((Number(lat) * latM) / cellM)}:${Math.round((Number(lon) * lonM) / cellM)}`;
}

function validPoint(p) {
  return p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon));
}

/**
 * Count how many times each small ground cell is crossed. Each track segment
 * votes for its midpoint cell, so a repeated loop glows and one-off ground
 * stays dim. Returns the counts and the maximum (for map intensity).
 */
export function heatGrid(activities, opts = {}) {
  const cellM = Number(opts.cellM) > 0 ? Number(opts.cellM) : HEATMAP_CELL_M;
  const cells = new Map();
  let segments = 0;
  for (const a of activities || []) {
    const pts = activityRoute(a);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const q = pts[i];
      const key = cellKey((Number(p.lat) + Number(q.lat)) / 2, (Number(p.lon) + Number(q.lon)) / 2, cellM);
      cells.set(key, (cells.get(key) || 0) + 1);
      segments++;
    }
  }
  let max = 0;
  for (const v of cells.values()) if (v > max) max = v;
  return { cells, segments, max, cellM };
}

/**
 * GeoJSON lines for the heatmap. Each segment carries `weight`, the number
 * of times its ground cell has been crossed (1 on first visit). `sport`
 * keeps walk/run/ride separable for colouring.
 */
export function heatmapFeatureCollection(activities, opts = {}) {
  const grid = heatGrid(activities, opts);
  const features = [];
  const maxFeatures = Number(opts.maxFeatures) > 0 ? Number(opts.maxFeatures) : 12000;
  for (const a of activities || []) {
    const pts = activityRoute(a);
    const sport = sportOf(a);
    const stride = pts.length > 3000 ? Math.ceil(pts.length / 3000) : 1;
    for (let i = 1; i < pts.length; i += stride) {
      const p = pts[i - stride] || pts[i - 1];
      const q = pts[i];
      if (!p || !q) continue;
      const key = cellKey((Number(p.lat) + Number(q.lat)) / 2, (Number(p.lon) + Number(q.lon)) / 2, grid.cellM);
      const weight = grid.cells.get(key) || 1;
      features.push({
        type: "Feature",
        properties: { weight, sport, activityId: a.id || null },
        geometry: {
          type: "LineString",
          coordinates: [
            [Number(p.lon), Number(p.lat)],
            [Number(q.lon), Number(q.lat)],
          ],
        },
      });
      if (features.length >= maxFeatures) break;
    }
    if (features.length >= maxFeatures) break;
  }
  return {
    type: "FeatureCollection",
    features,
    maxWeight: grid.max,
    meta: { segments: grid.segments, groundCells: grid.cells.size, source: "local-only" },
  };
}

/** Headline numbers for the heatmap card. */
export function heatmapSummary(activities, opts = {}) {
  const list = opts.filtered ? activities || [] : filterActivities(activities, opts);
  const grid = heatGrid(list, opts);
  let meters = 0;
  const sports = { walk: 0, run: 0, ride: 0 };
  for (const a of list) {
    const stored = Number(a.distanceMeters) || 0;
    meters += stored > 0 ? stored : pathLengthMeters(activityRoute(a));
    sports[sportOf(a)] += 1;
  }
  const repeated = Array.from(grid.cells.values()).filter((n) => n > 1).length;
  return {
    activities: list.length,
    meters,
    sports,
    groundCells: grid.cells.size,
    repeatedCells: repeated,
    maxPasses: grid.max,
  };
}

export function heatmapBounds(features) {
  let minLat = Infinity, minLon = Infinity, maxLat = -Infinity, maxLon = -Infinity;
  for (const f of (features && features.features) || []) {
    for (const [lon, lat] of f.geometry.coordinates || []) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
  }
  if (!(minLat < maxLat) || !(minLon < maxLon)) return null;
  return { minLat, minLon, maxLat, maxLon };
}

const COLOR_MATCH = [
  "match", ["get", "sport"],
  "run", "#F3E0A8",
  "ride", "#B8F3D0",
  "#4EC3F7",
];
const WEIGHT_OPACITY = [
  "interpolate", ["linear"], ["min", ["coalesce", ["get", "weight"], 1], 8],
  1, 0.18,
  2, 0.38,
  4, 0.62,
  8, 0.9,
];
const WEIGHT_WIDTH = [
  "interpolate", ["linear"], ["min", ["coalesce", ["get", "weight"], 1], 8],
  1, 2,
  4, 4,
  8, 7,
];

function removeLayer(map, id) {
  if (map.getLayer && map.getLayer(id)) map.removeLayer(id);
}

function removeSource(map, id) {
  if (map.getSource && map.getSource(id)) map.removeSource(id);
}

/** Paint (or update) the personal heatmap on an existing MapLibre map. */
export function renderHeatmap(map, activities, opts = {}) {
  if (!map || typeof map.addSource !== "function") return null;
  const fc = opts.featureCollection || heatmapFeatureCollection(activities, opts);
  if (!fc.features.length) {
    clearHeatmap(map);
    return fc;
  }
  try {
    if (map.getSource(HEATMAP_SOURCE)) {
      map.getSource(HEATMAP_SOURCE).setData(fc);
    } else {
      map.addSource(HEATMAP_SOURCE, { type: "geojson", data: fc });
    }
    if (!map.getLayer(HEATMAP_GLOW_LAYER)) {
      map.addLayer({
        id: HEATMAP_GLOW_LAYER,
        type: "line",
        source: HEATMAP_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#1E6F95",
          "line-width": 6,
          "line-opacity": 0.18,
          "line-blur": 5,
        },
      });
    }
    if (!map.getLayer(HEATMAP_LINE_LAYER)) {
      map.addLayer({
        id: HEATMAP_LINE_LAYER,
        type: "line",
        source: HEATMAP_SOURCE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": COLOR_MATCH,
          "line-width": WEIGHT_WIDTH,
          "line-opacity": WEIGHT_OPACITY,
        },
      });
    }
    // Width expression for the glow; MapLibre cannot reference another layer.
    const glow = map.getLayer(HEATMAP_GLOW_LAYER);
    if (glow) {
      try {
        map.setPaintProperty(HEATMAP_GLOW_LAYER, "line-width", [
          "interpolate", ["linear"], ["min", ["coalesce", ["get", "weight"], 1], 8],
          1, 4, 8, 14,
        ]);
      } catch { /* older map style */ }
    }
  } catch { /* map style not ready */ }
  return fc;
}

export function clearHeatmap(map) {
  if (!map) return;
  try {
    removeLayer(map, HEATMAP_LINE_LAYER);
    removeLayer(map, HEATMAP_GLOW_LAYER);
    removeSource(map, HEATMAP_SOURCE);
  } catch { /* map may be tearing down */ }
}

export function heatmapEmptyCopy() {
  return "The heat map fills from walks, runs and rides recorded in Heldpath, or imported from Health Connect, once they include a route. It stays on this phone — there is no community map and nothing is uploaded. If you already walked with another app on this phone, import those sessions from Settings.";
}
