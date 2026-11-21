/**
 * History-based route suggestions (free, on-device).
 *
 * Learn the usual sport, distance, pace and start point from local
 * activities; snap past tracks to the same walk graph the course builder
 * uses and count edge usage. Then reuse the existing Dijkstra loop builder
 * in routing.js (autoLoopRoute) and rank its candidates here so a loop
 * prefers ground you already know but still includes some new edges.
 *
 * No second router, no Mapbox, no Google, no server. A suggestion is saved
 * as an ordinary free course by the UI.
 */
import { autoLoopRoute, snapToGraph, shortestPath } from "./routing.js";
import { haversineMeters, pathLengthMeters, METERS_PER_MILE, activityMph } from "./util.js";
import { naismithSeconds, gainLoss } from "./elevation.js";

export const SUGGEST_DEFAULT_METERS = 5000;
export const RIDE_MPH = 12;
export const START_CLUSTER_M = 300;

export function sportOf(activity) {
  const raw = String((activity && activity.type) || "walk").toLowerCase();
  if (raw === "ride" || raw === "bike" || raw === "cycle" || raw === "cycling") return "ride";
  if (raw === "run" || raw === "running") return "run";
  return "walk";
}

export function edgeKey(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return `${lo}:${hi}`;
}

function median(values) {
  const list = (values || []).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return 0;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

function clusterKey(point, cellM) {
  const latM = 111320;
  const lonM = latM * Math.max(0.1, Math.cos((Number(point.lat) * Math.PI) / 180));
  return `${Math.round((Number(point.lat) * latM) / cellM)}:${Math.round((Number(point.lon) * lonM) / cellM)}`;
}

function trackStart(activity) {
  const track = (activity && activity.track) || [];
  for (const p of track) {
    if (p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))) {
      return { lat: Number(p.lat), lon: Number(p.lon) };
    }
  }
  return null;
}

/** Usual start points, clustered on a coarse grid. Most-used first. */
export function startClusters(activities, { cellM = START_CLUSTER_M } = {}) {
  const buckets = new Map();
  for (const a of activities || []) {
    const start = trackStart(a);
    if (!start) continue;
    const key = clusterKey(start, cellM);
    const b = buckets.get(key) || { lat: 0, lon: 0, count: 0, lastAt: 0 };
    b.lat += start.lat;
    b.lon += start.lon;
    b.count += 1;
    const t = Date.parse((a.startedAt || a.endedAt) || "");
    b.lastAt = Math.max(b.lastAt, Number.isFinite(t) ? t : 0);
    buckets.set(key, b);
  }
  return Array.from(buckets.values())
    .map((b) => ({ lat: b.lat / b.count, lon: b.lon / b.count, count: b.count, lastAt: b.lastAt }))
    .sort((a, b) => (b.count - a.count) || (b.lastAt - a.lastAt));
}

/**
 * What a usual outing looks like. Falls back gracefully when there is no
 * history yet, so a first route can still be generated.
 */
export function historyProfile(activities, opts = {}) {
  const sport = opts.sport && opts.sport !== "all" ? opts.sport : null;
  const list = (activities || []).filter((a) => a && Array.isArray(a.track) && a.track.length >= 2);
  const matching = sport ? list.filter((a) => sportOf(a) === sport) : list;
  const source = matching.length ? matching : list;
  const withDistance = source.filter((a) => Number(a.distanceMeters) > 300);
  const usualDistanceMeters = median(withDistance.map((a) => Number(a.distanceMeters)));
  let totalSec = 0;
  let totalM = 0;
  for (const a of withDistance) {
    const sec = Number(a.elapsedSec) || 0;
    if (sec > 0) {
      totalSec += sec;
      totalM += Number(a.distanceMeters);
    }
  }
  const paceSecPerMeter = totalM > 0 ? totalSec / totalM : 0;
  const climbs = withDistance
    .filter((a) => Number(a.climbGainM) > 0)
    .map((a) => Number(a.climbGainM) / (Number(a.distanceMeters) / 1000));
  return {
    sport: sport || (source.length ? sportOf(source[source.length - 1]) : opts.fallbackSport || "walk"),
    activities: source.length,
    usualDistanceMeters: usualDistanceMeters || (opts.fallbackMeters || SUGGEST_DEFAULT_METERS),
    paceSecPerMeter,
    usualMph: paceSecPerMeter > 0 ? 3600 / paceSecPerMeter / METERS_PER_MILE : 0,
    usualClimbPerKm: median(climbs),
    starts: startClusters(source),
    latestStart: source.length ? trackStart(source[source.length - 1]) : null,
  };
}

/**
 * Count graph-edge uses from past tracks. Sampling keeps a long history
 * cheap; a walk graph edge used many times is "known good".
 */
export function edgeUsage(graph, activities, opts = {}) {
  const sport = opts.sport && opts.sport !== "all" ? opts.sport : null;
  const maxSamples = Number(opts.maxSamples) > 0 ? Number(opts.maxSamples) : 500;
  const maxSnap = Number(opts.maxSnap) > 0 ? Number(opts.maxSnap) : 60;
  const usage = new Map();
  if (!graph) return usage;
  for (const a of activities || []) {
    if (sport && sportOf(a) !== sport) continue;
    const pts = (a.track || []).filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
    if (pts.length < 2) continue;
    const stride = Math.max(1, Math.ceil(pts.length / maxSamples));
    const sampled = [];
    for (let i = 0; i < pts.length; i += stride) sampled.push(pts[i]);
    if (sampled[sampled.length - 1] !== pts[pts.length - 1]) sampled.push(pts[pts.length - 1]);
    for (let i = 1; i < sampled.length; i++) {
      const sa = snapToGraph(graph, sampled[i - 1].lat, sampled[i - 1].lon, maxSnap);
      const sb = snapToGraph(graph, sampled[i].lat, sampled[i].lon, maxSnap);
      if (!sa || !sb) continue;
      const hop = shortestPath(graph, sa.id, sb.id);
      if (!hop || hop.nodes.length < 2 || hop.nodes.length > 400) continue;
      for (let k = 1; k < hop.nodes.length; k++) {
        const key = edgeKey(hop.nodes[k - 1], hop.nodes[k]);
        const rec = usage.get(key) || { count: 0, a: hop.nodes[k - 1], b: hop.nodes[k] };
        rec.count += 1;
        usage.set(key, rec);
      }
    }
  }
  return usage;
}

// Local helper dropped: points are always validated before sampling.

/** Fraction of a candidate's line that follows known edges. */
export function routeMix(graph, path, usage) {
  if (!graph || !path || path.length < 2 || !usage) {
    return { knownMeters: 0, newMeters: 0, knownRatio: 0, edges: 0, knownEdges: 0 };
  }
  let knownMeters = 0;
  let newMeters = 0;
  let knownEdges = 0;
  let edges = 0;
  let prev = null;
  for (const p of path) {
    const snap = snapToGraph(graph, Number(p.lat), Number(p.lon), 60);
    if (!snap) { prev = null; continue; }
    if (prev != null && snap.id !== prev) {
      const key = edgeKey(prev, snap.id);
      const meters = graphEdgeMeters(graph, prev, snap.id);
      edges += 1;
      if (usage.has(key)) {
        knownEdges += 1;
        knownMeters += meters;
      } else {
        newMeters += meters;
      }
    }
    prev = snap.id;
  }
  const total = knownMeters + newMeters;
  return {
    knownMeters,
    newMeters,
    knownRatio: total > 0 ? knownMeters / total : 0,
    edges,
    knownEdges,
  };
}

function graphEdgeMeters(graph, a, b) {
  const nbrs = (graph.adj && graph.adj[a]) || [];
  const hit = nbrs.find((e) => e.to === b);
  if (hit) return Number(hit.meters) || 0;
  return haversineMeters(
    { lat: graph.lat[a], lon: graph.lon[a] },
    { lat: graph.lat[b], lon: graph.lon[b] }
  );
}

/** Prefer known ground and a little novelty, while staying near the target. */
export function scoreCandidate(candidate, { targetMeters, mix, profile } = {}) {
  if (!candidate || !candidate.path || !candidate.meters) return -Infinity;
  const target = Math.max(200, Number(targetMeters) || 0);
  const err = target > 0 ? Math.abs(candidate.meters - target) / target : 1;
  let score = 2.4 * Math.max(0, 1 - err);
  if (mix) {
    // A loop that is 100% familiar is less useful than one that mixes new ground.
    const blend = 1 - Math.abs((mix.knownRatio || 0) - 0.6) / 0.6;
    score += 1.5 * Math.max(0, blend);
    if ((mix.newMeters || 0) >= Math.min(250, target * 0.12)) score += 0.35;
    if ((mix.knownRatio || 0) > 0.97) score -= 0.45;
  }
  const quality = Number(candidate.quality);
  if (Number.isFinite(quality)) score += Math.min(0.5, quality * 0.5);
  if (profile && profile.activities >= 3 && candidate.meters) {
    const usual = profile.usualDistanceMeters;
    if (usual > 0) score += 0.2 * Math.max(0, 1 - Math.abs(candidate.meters - usual) / usual);
  }
  return score;
}

function targetFromHistory(profile, goal, explicit) {
  if (Number(explicit) > 0) return Number(explicit);
  const usual = Math.max(500, Number(profile.usualDistanceMeters) || SUGGEST_DEFAULT_METERS);
  if (!goal) return usual;
  const goalMeters = Number(goal.distanceMeters) || 0;
  if (goalMeters > usual * 1.02) {
    // Small step toward the free distance goal, never all at once.
    return Math.min(goalMeters, usual * 1.1);
  }
  if (goalMeters > 0) return goalMeters;
  return usual;
}

function uniqueSuggestions(list) {
  const out = [];
  for (const s of list) {
    const dup = out.some((o) => Math.abs(o.meters - s.meters) < 60
      && o.start && s.start
      && haversineMeters(o.start, s.start) < 120);
    if (!dup) out.push(s);
  }
  return out;
}

/**
 * Generate ranked new loops near a usual start. Uses autoLoopRoute for the
 * circuit itself; this module only chooses the start, target and ranking.
 */
export function generateSuggestions(opts = {}) {
  const graph = opts.graph;
  const activities = opts.activities || [];
  const sport = opts.sport && opts.sport !== "all" ? opts.sport : null;
  const profile = historyProfile(activities, { sport: sport || undefined, fallbackSport: opts.sport });
  if (!graph) return { ok: false, reason: "no-graph", profile, suggestions: [] };
  const center = opts.center || profile.starts[0] || profile.latestStart;
  if (!center) return { ok: false, reason: "no-start", profile, suggestions: [] };
  const target = targetFromHistory(profile, opts.goal, opts.targetMeters);
  const usage = opts.usage || edgeUsage(graph, activities, { sport: sport || undefined });
  const loopFn = opts.autoLoop || autoLoopRoute;
  const targets = [target, target * 1.05, target * 0.95];
  const offsets = [0, 35, 70, 110];
  const raw = [];
  for (let i = 0; i < targets.length; i++) {
    const built = loopFn(graph, center, targets[i], { offsets: offsets.slice(i % 2, i % 2 + 2) });
    if (!built || !built.ok || !built.path) continue;
    const mix = routeMix(graph, built.path, usage);
    raw.push({
      ...built,
      start: { lat: center.lat, lon: center.lon },
      sport: profile.sport,
      targetMeters: Math.round(targets[i]),
      mix,
      score: scoreCandidate(built, { targetMeters: target, mix, profile }),
    });
  }
  const suggestions = uniqueSuggestions(raw)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Number(opts.count) || 3));
  return { ok: suggestions.length > 0, profile, targetMeters: Math.round(target), suggestions };
}

function estimateSpeed(profile, sport) {
  if (profile && profile.usualMph > 0) return profile.usualMph;
  if (sport === "ride") return RIDE_MPH;
  return activityMph(sport === "run" ? "run" : "walk");
}

/**
 * Distance, climb and time preview. Climb comes from history when known;
 * samplePathDem can replace it with local terrain later.
 */
export function suggestionPreview(suggestion, opts = {}) {
  const meters = Number(suggestion && suggestion.meters) || 0;
  const profile = opts.profile || null;
  const sport = (suggestion && suggestion.sport) || opts.sport || "walk";
  const km = meters / 1000;
  const climbM = Number.isFinite(Number(opts.climbM))
    ? Number(opts.climbM)
    : Math.max(0, Math.round((profile && profile.usualClimbPerKm ? profile.usualClimbPerKm : 0) * km));
  const seconds = Number(opts.seconds) > 0
    ? Math.round(Number(opts.seconds))
    : naismithSeconds(meters, climbM, estimateSpeed(profile, sport));
  return {
    meters,
    climbM,
    climbKnown: Number.isFinite(Number(opts.climbM)),
    seconds,
    sport,
    knownRatio: suggestion && suggestion.mix ? suggestion.mix.knownRatio : 0,
  };
}

/** Replace a preview's climb/time with sampled elevations. */
export function applyElevations(suggestion, elevations, opts = {}) {
  const path = (suggestion && suggestion.path) || [];
  const points = path.map((p, i) => ({ ...p, ele: elevations && elevations[i] }));
  const gl = gainLoss(points);
  const preview = suggestionPreview(suggestion, { ...opts, climbM: gl.gainM });
  return { ...suggestion, climbM: gl.gainM, estimateSec: preview.seconds, preview };
}

export function suggestionReason(suggestion, profile, goal) {
  const meters = Math.round(Number(suggestion && suggestion.meters) || 0);
  const usual = Math.round(Number(profile && profile.usualDistanceMeters) || 0);
  if (goal && Number(goal.distanceMeters) > 0 && meters > usual) return "A little further toward your goal";
  if (usual > 0 && Math.abs(meters - usual) / usual < 0.12) return "Your usual distance, on new ground";
  if (profile && profile.starts && profile.starts.length) return "Starts at a place you usually start";
  return "A fresh loop from here";
}

/** Name a suggestion like a saved course, without pretending it is one. */
export function suggestionName(suggestion, units = "mi") {
  const meters = Number(suggestion && suggestion.meters) || 0;
  const sport = suggestion && suggestion.sport === "ride" ? "Ride" : suggestion && suggestion.sport === "run" ? "Run" : "Walk";
  if (units === "km") return `${sport} loop · ${(meters / 1000).toFixed(1)} km`;
  return `${sport} loop · ${(meters / METERS_PER_MILE).toFixed(1)} mi`;
}

export function suggestionPins(suggestion) {
  if (!suggestion) return [];
  if (Array.isArray(suggestion.pins) && suggestion.pins.length >= 2) {
    return suggestion.pins.map((p) => ({ lat: p.lat, lon: p.lon, role: p.role }));
  }
  const path = suggestion.path || [];
  if (path.length < 2) return [];
  return [
    { lat: path[0].lat, lon: path[0].lon, role: "start" },
    { lat: path[path.length - 1].lat, lon: path[path.length - 1].lon, role: "end" },
  ];
}

export function suggestionMeters(suggestion) {
  return Number(suggestion && suggestion.meters) || pathLengthMeters((suggestion && suggestion.path) || []);
}
