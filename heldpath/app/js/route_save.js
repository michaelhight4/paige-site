/**
 * After a walk or run stops: measure how far past a course or target the
 * person went, build a saveable route from a GPS track, and extend a saved
 * course with only the extra segment.
 */
import { haversineMeters, pathLengthMeters } from "./util.js";
import { inGraphBounds, snapToNode, routeLegs } from "./routing.js";

export const PAST_METERS = 100;

export function plannedMeters(sess) {
  if (!sess) return 0;
  if (sess.target && sess.target.targetMeters > 0) return Number(sess.target.targetMeters) || 0;
  if (sess.coursePath && sess.coursePath.length >= 2) return pathLengthMeters(sess.coursePath);
  if (sess.coursePins && sess.coursePins.length >= 2) return pathLengthMeters(sess.coursePins);
  return 0;
}

/** Full GPS distance — never the capped course/target progress. */
export function activityDistanceMeters(sess) {
  return Math.max(0, Number(sess && sess.distanceMeters) || 0);
}

export function extraMeters(sess) {
  const planned = plannedMeters(sess);
  if (!(planned > 0)) return 0;
  return Math.max(0, activityDistanceMeters(sess) - planned);
}

export function percentOfPlan(totalMeters, planMeters) {
  const plan = Number(planMeters) || 0;
  const total = Math.max(0, Number(totalMeters) || 0);
  if (!(plan > 0)) return 0;
  return Math.round((total / plan) * 100);
}

export function shouldOfferOvershootSave(sess, threshold = PAST_METERS) {
  return extraMeters(sess) > threshold;
}

export function celebrationCopy(percent, { hasCourse = true } = {}) {
  const n = Math.max(0, Math.round(Number(percent) || 0));
  const noun = hasCourse ? "route" : "goal";
  return `Congratulations, you did ${n}% of the ${noun}! Way to kill it!`;
}

export function defaultRouteName(act, when = null) {
  const t = when || (act && act.startedAt ? new Date(act.startedAt) : new Date());
  const date = t instanceof Date ? t : new Date(t);
  const h = date.getHours();
  const period = h < 5 || h >= 21 ? "Night" : h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
  const kind = act && act.type === "walk" ? "walk" : "run";
  const monthDay = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${period} ${kind}, ${monthDay}`;
}

function headingRad(a, b) {
  const mid = (((a.lat + b.lat) / 2) * Math.PI) / 180;
  const dx = (b.lon - a.lon) * Math.cos(mid);
  const dy = b.lat - a.lat;
  return Math.atan2(dx, dy);
}

function turnDeg(a, b, c) {
  let d = headingRad(b, c) - headingRad(a, b);
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs((d * 180) / Math.PI);
}

function perpMeters(p, a, b) {
  const midLat = (((a.lat + b.lat) / 2) * Math.PI) / 180;
  const x = (lng) => lng * Math.cos(midLat);
  const ax = x(a.lon), ay = a.lat;
  const bx = x(b.lon), by = b.lat;
  const px = x(p.lon), py = p.lat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const q = { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
  return haversineMeters(p, q);
}

function douglasPeucker(points, epsilon) {
  if (!points || points.length <= 2) return (points || []).slice();
  let maxD = 0;
  let idx = 0;
  const a = points[0];
  const b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpMeters(points[i], a, b);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD > epsilon) {
    const left = douglasPeucker(points.slice(0, idx + 1), epsilon);
    const right = douglasPeucker(points.slice(idx), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [a, b];
}

/**
 * Collapse a GPS track to start, end, turns, and occasional key points.
 */
export function simplifyTrackToPins(track, { turnDeg: turn = 40, minSpacing = 25, dpMeters = 16, keyEvery = 350 } = {}) {
  const raw = (track || [])
    .map((p) => ({ lat: p.lat, lon: p.lon }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (raw.length === 0) return [];
  if (raw.length === 1) return [{ ...raw[0], role: "start" }];

  const cleaned = [raw[0]];
  for (let i = 1; i < raw.length; i++) {
    if (haversineMeters(cleaned[cleaned.length - 1], raw[i]) >= 2) cleaned.push(raw[i]);
  }
  if (cleaned.length === 1) cleaned.push(raw[raw.length - 1]);

  const keepIdx = new Set([0, cleaned.length - 1]);
  let since = 0;
  let lastKept = 0;
  for (let i = 1; i < cleaned.length - 1; i++) {
    const gap = haversineMeters(cleaned[i], cleaned[i - 1]);
    since += gap;
    const angled = turnDeg(cleaned[i - 1], cleaned[i], cleaned[i + 1]) >= turn;
    const spaced = haversineMeters(cleaned[i], cleaned[lastKept]) >= minSpacing;
    if ((angled && spaced) || since >= keyEvery) {
      keepIdx.add(i);
      lastKept = i;
      since = 0;
    }
  }
  const marked = cleaned.filter((_, i) => keepIdx.has(i));
  const simplified = douglasPeucker(marked, dpMeters);
  if (simplified.length < 2) {
    return [
      { ...cleaned[0], role: "start" },
      { ...cleaned[cleaned.length - 1], role: "end" },
    ];
  }
  return simplified.map((p, i) => ({
    lat: p.lat,
    lon: p.lon,
    role: i === 0 ? "start" : i === simplified.length - 1 ? "end" : "via",
  }));
}

function almostSame(a, b, meters = 8) {
  return a && b && haversineMeters(a, b) < meters;
}

export function snapPinsToGraph(pins, graph, maxSnap = 80) {
  if (!graph || !pins || !pins.length) return { pins: (pins || []).map((p) => ({ ...p })), snapped: 0 };
  const out = [];
  let snapped = 0;
  for (const p of pins) {
    let next = { lat: p.lat, lon: p.lon, role: p.role };
    if (inGraphBounds(graph, p.lat, p.lon)) {
      const hit = snapToNode(graph, p.lat, p.lon, maxSnap);
      if (hit) {
        next = { lat: hit.lat, lon: hit.lon, role: p.role, snapped: true, nodeId: hit.id };
        snapped++;
      }
    }
    if (out.length && almostSame(out[out.length - 1], next, 6)) {
      if (next.role === "end") out[out.length - 1].role = "end";
      continue;
    }
    out.push(next);
  }
  if (out.length === 1 && pins.length >= 2) out.push({ lat: pins[pins.length - 1].lat, lon: pins[pins.length - 1].lon, role: "end" });
  return { pins: out, snapped };
}

/**
 * Build a course-shaped route from a GPS track. Snaps and follows walkable
 * paths where a routing graph covers the area; otherwise keeps the simplified
 * GPS shape so we do not invent a worse line.
 */
export function routeFromTrack(track, graph = null, opts = {}) {
  const raw = (track || []).map((p) => ({ lat: p.lat, lon: p.lon }));
  const pins = simplifyTrackToPins(raw, opts);
  const gpsMeters = pathLengthMeters(raw.length >= 2 ? raw : pins);
  if (pins.length < 2) {
    return { pins, path: pins.map((p) => ({ lat: p.lat, lon: p.lon })), meters: gpsMeters, usedGraph: false };
  }
  if (!graph) {
    return { pins, path: pins.map((p) => ({ lat: p.lat, lon: p.lon })), meters: pathLengthMeters(pins), usedGraph: false };
  }
  const snapped = snapPinsToGraph(pins, graph, opts.maxSnap || 80);
  if (snapped.snapped === 0 || snapped.pins.length < 2) {
    return { pins, path: pins.map((p) => ({ lat: p.lat, lon: p.lon })), meters: pathLengthMeters(pins), usedGraph: false };
  }
  const routed = routeLegs(graph, snapped.pins, opts);
  const routedMeters = routed.meters || 0;
  // If routing balloons the length, keep the simplified GPS line.
  if (gpsMeters > 0 && routedMeters > gpsMeters * 1.45) {
    return { pins, path: pins.map((p) => ({ lat: p.lat, lon: p.lon })), meters: pathLengthMeters(pins), usedGraph: false };
  }
  return {
    pins: snapped.pins,
    path: (routed.path && routed.path.length >= 2) ? routed.path : snapped.pins.map((p) => ({ lat: p.lat, lon: p.lon })),
    meters: routedMeters || pathLengthMeters(snapped.pins),
    usedGraph: true,
    usedStraight: !!routed.usedStraight,
  };
}

export function extraTrackAfter(track, afterMeters) {
  const pts = track || [];
  if (pts.length < 2) return pts.slice();
  const cut = Math.max(0, Number(afterMeters) || 0);
  if (!(cut > 0)) return pts.slice();
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += haversineMeters(pts[i - 1], pts[i]);
    if (acc >= cut) return pts.slice(i);
  }
  return pts.slice(-1);
}

function courseLine(course) {
  if (course && course.path && course.path.length >= 2) return course.path.map((p) => ({ lat: p.lat, lon: p.lon }));
  if (course && course.pins && course.pins.length >= 2) return course.pins.map((p) => ({ lat: p.lat, lon: p.lon }));
  return [];
}

/**
 * Append only the extra GPS segment to a saved course. The original pins and
 * path stay; new vias and a new end come from the extra part.
 */
export function extendCourseWithExtra(course, track, sess, graph = null) {
  const line = courseLine(course);
  const cutAt = (sess && sess.goalCompleteMeters != null)
    ? sess.goalCompleteMeters
    : plannedMeters(sess || { coursePath: line, coursePins: course && course.pins, target: sess && sess.target, distanceMeters: 0 });
  const extra = extraTrackAfter(track, cutAt);
  const built = routeFromTrack(extra, graph);
  const origPins = (course && course.pins ? course.pins : []).map((p) => ({ ...p }));
  if (origPins.length) origPins[origPins.length - 1] = { ...origPins[origPins.length - 1], role: origPins.length === 1 ? "start" : "via" };
  const add = (built.pins || []).filter((p, i) => {
    if (i === 0 && origPins.length && almostSame(origPins[origPins.length - 1], p, 15)) return false;
    return true;
  }).map((p, i, arr) => ({
    lat: p.lat,
    lon: p.lon,
    role: i === arr.length - 1 ? "end" : "via",
  }));
  const pins = origPins.concat(add);
  if (pins.length) pins[0].role = "start";
  if (pins.length > 1) pins[pins.length - 1].role = "end";
  const extraPath = (built.path || []).filter((p, i) => {
    if (i === 0 && line.length && almostSame(line[line.length - 1], p, 12)) return false;
    return true;
  });
  const path = line.concat(extraPath);
  return {
    pins,
    path,
    meters: pathLengthMeters(path),
    extraMeters: pathLengthMeters(extraPath.length ? [line[line.length - 1] || extraPath[0], ...extraPath].filter(Boolean) : []),
  };
}

export function shouldOfferFreeRoute(sess, minMeters = PAST_METERS) {
  if (!sess) return false;
  if (sess.courseId || (sess.coursePins && sess.coursePins.length >= 2) || (sess.coursePath && sess.coursePath.length >= 2)) return false;
  if (sess.target && sess.target.targetMeters > 0) return false;
  const track = sess.track || [];
  if (track.length < 2) return false;
  return activityDistanceMeters(sess) > minMeters;
}
