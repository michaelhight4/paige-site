/**
 * Per-leg plan targets for a saved custom pin route (or a generated route)
 * when the plan has a time goal. Sector and plan targets use a perfect
 * even pace (goal time / total distance) — elevation is shown as info
 * only and is not used in the target math. History comes from past runs of that
 * route, or a recent average pace if there is no history. All of this is
 * local / offline.
 */
import { gainLoss } from "./elevation.js";
import { formatDistance, formatDuration, formatPace, haversineMeters, METERS_PER_MILE, pathLengthMeters } from "./util.js";

/** 1 m of climb ≈ 8 m of flat effort (Naismith: 600 m climb ~ 1 hour, ~5 km/h walk). */
const CLIMB_FLAT_M = 8;

export function exactCourseRoute(course) {
  if (!course || !Array.isArray(course.pins) || course.pins.length < 2) return null;
  const pins = course.pins.map((p) => ({ lat: p.lat, lon: p.lon, role: p.role }));
  const path = (course.path && course.path.length >= 2)
    ? course.path.map((p) => ({ lat: p.lat, lon: p.lon, ele: p.ele }))
    : pins;
  return {
    mode: "course",
    courseId: course.id || null,
    pins,
    path,
    meters: pathLengthMeters(path) || pathLengthMeters(pins),
    scaleFactor: 1,
    repeatTimes: 1,
    exact: true,
  };
}

export function legDistances(pins) {
  const list = pins || [];
  const legs = [];
  for (let i = 0; i < list.length - 1; i++) {
    legs.push({
      from: i,
      to: i + 1,
      meters: haversineMeters(list[i], list[i + 1]),
    });
  }
  return legs;
}

/**
 * Split a path (with optional ele) into per-leg gain/loss by walking the
 * polyline and cutting at pin distances along it.
 */
export function legElevation(pins, path) {
  const legs = legDistances(pins);
  const line = path && path.length >= 2 ? path : pins;
  const hasEle = line.some((p) => Number.isFinite(Number(p.ele)));
  if (!hasEle) {
    return legs.map((l) => ({ ...l, gainM: 0, lossM: 0, effortM: l.meters }));
  }
  const prefixes = [0];
  for (let i = 1; i < line.length; i++) {
    prefixes[i] = prefixes[i - 1] + haversineMeters(line[i - 1], line[i]);
  }
  const total = prefixes[prefixes.length - 1] || 1;
  let acc = 0;
  return legs.map((l) => {
    const start = acc;
    const end = acc + l.meters;
    acc = end;
    const pts = [];
    for (let i = 0; i < line.length; i++) {
      const d = prefixes[i];
      if (d < start - 0.5) continue;
      if (d > end + 0.5 && pts.length) break;
      pts.push(line[i]);
    }
    if (pts.length < 2) pts.push(line[0], line[line.length - 1]);
    const gl = gainLoss(pts);
    const effortM = l.meters + (gl.gainM || 0) * CLIMB_FLAT_M;
    return { ...l, gainM: gl.gainM || 0, lossM: gl.lossM || 0, effortM };
  });
}

/**
 * Perfect even-pace targets. Target pace = totalSec / total route distance;
 * each sector target = sector distance × that pace. Elevation is not used.
 * Prefer routed `path` distances when a path is given, otherwise pin-to-pin.
 * The last sector absorbs rounding so the targets sum to totalSec.
 */
export function buildEvenPaceLegTargets(pins, totalSec, { path } = {}) {
  const total = Math.max(0, Number(totalSec) || 0);
  const legs = sectorDistances(pins, path);
  if (!legs.length) return [];
  const meters = legs.reduce((s, l) => s + Math.max(0, l.meters || 0), 0);
  if (!(meters > 0) || !(total > 0)) {
    return legs.map(() => 0);
  }
  const out = legs.map((l) => Math.max(0, (Math.max(0, l.meters) / meters) * total));
  // Keep tenths available for live deltas; callers may round for display.
  const drift = total - out.reduce((s, v) => s + v, 0);
  out[out.length - 1] = Math.max(0, out[out.length - 1] + drift);
  return out;
}

/** @deprecated Name kept so older callers compile; math is even pace, not grade. */
export function buildGradeAdjustedLegTargets(pins, totalSec, opts) {
  return buildEvenPaceLegTargets(pins, totalSec, opts);
}

/**
 * Sector lengths along a routed path, cut at pin distances, or pin-to-pin
 * haversine when no path is available.
 */
export function sectorDistances(pins, path) {
  const list = pins || [];
  if (list.length < 2) return [];
  const line = path && path.length >= 2 ? path : null;
  if (!line) return legDistances(list);
  const prefixes = [0];
  for (let i = 1; i < line.length; i++) {
    prefixes[i] = prefixes[i - 1] + haversineMeters(line[i - 1], line[i]);
  }
  const total = prefixes[prefixes.length - 1] || 0;
  // Walk the path and record distance between successive pin snaps.
  const cuts = list.map((p) => {
    let best = 0, bestD = Infinity;
    for (let i = 0; i < line.length; i++) {
      const d = haversineMeters(p, line[i]);
      if (d < bestD) { bestD = d; best = prefixes[i]; }
    }
    return best;
  });
  // Force monotonic cuts so a loop or messy snap cannot go backwards.
  for (let i = 1; i < cuts.length; i++) {
    if (cuts[i] < cuts[i - 1]) cuts[i] = cuts[i - 1];
  }
  if (cuts[cuts.length - 1] < total) cuts[cuts.length - 1] = total;
  const legs = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    legs.push({ from: i, to: i + 1, meters: Math.max(0, cuts[i + 1] - cuts[i]) });
  }
  return legs;
}

export function recentAveragePaceSecPerMeter(activities, { type, limit = 8 } = {}) {
  const list = (activities || [])
    .filter((a) => a && (!type || a.type === type) && a.distanceMeters > 50 && a.elapsedSec > 0)
    .slice(-limit);
  let m = 0;
  let s = 0;
  for (const a of list) {
    m += Number(a.distanceMeters) || 0;
    s += Number(a.elapsedSec) || 0;
  }
  if (!(m > 0) || !(s > 0)) return null;
  return s / m;
}

/** Per-leg historic time (sec) from past activities on the same course. */
export function historyTimesForLegs(pins, activities, { courseId, type } = {}) {
  const n = Math.max(0, (pins || []).length - 1);
  if (!n) return null;
  const matching = (activities || []).filter((a) => {
    if (courseId && a.courseId && a.courseId === courseId) return true;
    return false;
  });
  if (!matching.length) return null;
  const sums = Array(n).fill(0);
  const counts = Array(n).fill(0);
  for (const a of matching) {
    const splits = legSplitsFromTrack(pins, a.track);
    if (!splits) continue;
    splits.forEach((sec, i) => {
      if (sec > 0 && i < n) { sums[i] += sec; counts[i] += 1; }
    });
  }
  if (!counts.some((c) => c > 0)) return null;
  return sums.map((s, i) => (counts[i] ? s / counts[i] : null));
}

/** Same helper as plan_progress, kept local so this module stays standalone. */
function pointElapsedSec(pt, origin) {
  if (!pt) return 0;
  if (Number.isFinite(Number(pt.t)) && Number(pt.t) < 1e7) return Number(pt.t);
  const at = pt.at;
  let ms = null;
  if (typeof at === "number" && Number.isFinite(at)) ms = at > 1e11 ? at : at * 1000;
  else if (at) {
    const parsed = Date.parse(at);
    if (Number.isFinite(parsed)) ms = parsed;
  } else if (Number.isFinite(Number(pt.t))) {
    const n = Number(pt.t);
    ms = n > 1e11 ? n : n * 1000;
  }
  if (ms == null) return 0;
  const o = origin == null ? ms : origin;
  return (ms - o) / 1000;
}

function trackOriginMs(track) {
  const p = track && track[0];
  if (!p) return 0;
  if (typeof p.at === "number" && Number.isFinite(p.at)) return p.at > 1e11 ? p.at : p.at * 1000;
  if (p.at) {
    const parsed = Date.parse(p.at);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function legSplitsFromTrack(pins, track) {
  if (!pins || pins.length < 2 || !track || track.length < 2) return null;
  const legs = legDistances(pins).map((l) => l.meters);
  const origin = trackOriginMs(track);
  let travelled = 0;
  let cursor = 0;
  const splits = [];
  let boundary = 0;
  for (const leg of legs) {
    boundary += leg;
    let hit = null;
    for (let i = cursor; i < track.length; i++) {
      if (i > 0) travelled += haversineMeters(track[i - 1], track[i]);
      cursor = i;
      if (travelled >= boundary - 1) {
        hit = pointElapsedSec(track[i], origin);
        break;
      }
    }
    const prev = splits.length ? splits.reduce((s, v) => s + v, 0) : 0;
    splits.push(hit == null ? 0 : Math.max(0.1, hit - prev));
  }
  return splits;
}

export function paceSecPerMile(meters, seconds) {
  if (!(meters > 0) || !(seconds > 0)) return null;
  return seconds / (meters / METERS_PER_MILE);
}

export function formatPaceGap(needSecPerMile, haveSecPerMile) {
  if (needSecPerMile == null || haveSecPerMile == null) return "";
  const d = Math.round(haveSecPerMile - needSecPerMile);
  if (d === 0) return "on target";
  const abs = Math.abs(d);
  const clock = abs >= 60
    ? `${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`
    : `${abs}s`;
  return d > 0 ? `${clock}/mi faster` : `${clock}/mi in hand`;
}

function compactPace(label) {
  return String(label || "—").replace(" /", "/");
}

/**
 * One line per Gary's example:
 * "Leg 3 to 4: 0.42 mi, need 9:10/mi, you're at 9:45/mi, 35s/mi faster"
 */
export function formatLegPlanLine(leg, { units = "mi" } = {}) {
  const from = (leg.from ?? 0) + 1;
  const to = (leg.to ?? (leg.from ?? 0) + 1) + 1;
  const dist = formatDistance(leg.meters, units, { digits: 2 });
  const need = compactPace(leg.needPace || "—");
  const have = compactPace(leg.havePace || "—");
  const gap = leg.gap || "";
  const climb = leg.gainM > 3 ? ` (climb ${Math.round(leg.gainM)} m)` : "";
  const gapBit = gap ? `, ${gap}` : "";
  return `Leg ${from} to ${to}: ${dist}${climb}, need ${need}, you're at ${have}${gapBit}`;
}

export function describeLegPlan(pins, {
  targetSec,
  path,
  activities,
  courseId,
  type,
  units = "mi",
} = {}) {
  const elev = legElevation(pins, path);
  const targets = buildEvenPaceLegTargets(pins, targetSec, { path });
  const history = historyTimesForLegs(pins, activities, { courseId, type });
  const fallback = recentAveragePaceSecPerMeter(activities, { type });
  return elev.map((l, i) => {
    const tSec = targets[i] || 0;
    const hist = history && history[i];
    const haveSec = hist > 0 ? hist : (fallback && l.meters ? fallback * l.meters : null);
    const needPace = formatPace(l.meters, tSec, units);
    const havePace = haveSec ? formatPace(l.meters, haveSec, units) : "—";
    const gap = formatPaceGap(paceSecPerMile(l.meters, tSec), haveSec ? paceSecPerMile(l.meters, haveSec) : null);
    const row = {
      ...l,
      targetSec: tSec,
      haveSec: haveSec || null,
      needPace,
      havePace,
      gap,
      source: hist > 0 ? "history" : haveSec ? "recent" : "none",
    };
    row.line = formatLegPlanLine(row, { units });
    return row;
  });
}

function spanSeconds(a, b) {
  const d = (Number(b) || 0) - (Number(a) || 0);
  if (!(d > 0)) return 0;
  return d > 10000 ? d / 1000 : d;
}

export function liveLegStatus(pins, track, targets, { units = "mi" } = {}) {
  if (!pins || pins.length < 2 || !track || track.length < 1) return null;
  const legs = legDistances(pins);
  let travelled = 0;
  for (let i = 1; i < track.length; i++) travelled += haversineMeters(track[i - 1], track[i]);
  let acc = 0;
  let idx = 0;
  for (let i = 0; i < legs.length; i++) {
    if (travelled < acc + legs[i].meters - 0.5) { idx = i; break; }
    acc += legs[i].meters;
    idx = Math.min(i + 1, legs.length - 1);
  }
  const t0 = track[0].at || 0;
  let along = 0;
  let legStartAt = t0;
  for (let i = 1; i < track.length; i++) {
    const next = along + haversineMeters(track[i - 1], track[i]);
    if (next >= acc && along < acc) legStartAt = track[i - 1].at || t0;
    along = next;
  }
  const elapsed = spanSeconds(legStartAt, track[track.length - 1].at);
  const alongLeg = Math.max(0, travelled - acc);
  const targetSec = targets && targets[idx];
  const targetPace = formatPace(legs[idx].meters, targetSec, units);
  const actualPace = alongLeg > 5 && elapsed > 0 ? formatPace(alongLeg, elapsed, units) : "—";
  const from = idx + 1;
  const to = idx + 2;
  return {
    index: idx,
    travelled,
    alongLeg,
    elapsedSec: elapsed,
    targetSec,
    targetPace,
    actualPace,
    line: `Leg ${from} to ${to}: target ${targetPace}, you're at ${actualPace}`,
  };
}

/**
 * After a run: which legs hit (at or under target) or missed.
 * `performed` and `targets` are seconds.
 */
export function summarizeLegHits(pins, performed, targets, { units = "mi" } = {}) {
  const legs = legDistances(pins);
  return legs.map((l, i) => {
    const need = Number(targets && targets[i]) || 0;
    const have = Number(performed && performed[i]) || 0;
    const hit = have > 0 && need > 0 && have <= need + 1;
    return {
      ...l,
      targetSec: need,
      performedSec: have,
      hit,
      missed: have > 0 && need > 0 && !hit,
      line: `Leg ${i + 1} to ${i + 2}: ${formatDistance(l.meters, units, { digits: 2 })}, target ${formatDuration(need)}, you ${have ? formatDuration(have) : "—"} — ${!have ? "no split" : hit ? "hit" : "missed"}`,
    };
  });
}
