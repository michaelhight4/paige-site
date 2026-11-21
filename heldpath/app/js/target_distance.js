/**
 * Target-distance planning for a saved course.
 * Uses routed path lengths when the course has a path; otherwise the pin line.
 *
 * Modes when the target is longer than the course:
 *   - use-course: loop a closed circuit, or go out-and-back on a point-to-point
 *     course, as many times as needed, and place a stop pin at the exact target.
 *   - continue-past: follow the course once, then keep tracking the real path
 *     and alert when the target distance is reached.
 */
import { haversineMeters, pathLengthMeters, pointAlongPath, formatDistance, METERS_PER_MILE, METERS_PER_KM } from "./util.js";
import { coursePath, courseMeters } from "./routing.js";

export const MODE_COURSE = "use-course";
export const MODE_CONTINUE = "continue-past";
export const CLOSE_METERS = 30;
export const SESSION_DISTANCE_EXPLAINER_KEY = "heldpath.session-distance-explainer.v1";
export const SESSION_DISTANCE_EXPLAINER_BODY =
  "On a loop, set how far you want to go. We'll count the laps and place an end marker on the map, including partway around a lap if you stop short of a whole number.";

export function isClosedCircuit(path, closeMeters = CLOSE_METERS) {
  if (!path || path.length < 2) return false;
  const len = pathLengthMeters(path);
  if (len < closeMeters) return false;
  return haversineMeters(path[0], path[path.length - 1]) <= Math.max(closeMeters, len * 0.02);
}

export function reversePath(path) {
  return (path || []).slice().reverse().map((p) => ({ lat: p.lat, lon: p.lon, role: p.role }));
}

/** Points from the start of `path` up to and including the point at `meters`. */
export function pathPrefix(path, meters) {
  if (!path || !path.length) return [];
  const total = pathLengthMeters(path);
  const target = Math.max(0, Number(meters) || 0);
  if (target <= 0) return [{ lat: path[0].lat, lon: path[0].lon }];
  if (target >= total - 0.01) return path.map((p) => ({ lat: p.lat, lon: p.lon }));
  const out = [{ lat: path[0].lat, lon: path[0].lon }];
  let acc = 0;
  for (let i = 1; i < path.length; i++) {
    const seg = haversineMeters(path[i - 1], path[i]);
    if (acc + seg >= target) {
      const pt = pointAlongPath(path, target);
      const last = out[out.length - 1];
      if (!last || haversineMeters(last, pt) > 0.2) {
        out.push({ lat: pt.lat, lon: pt.lon });
      }
      return out;
    }
    acc += seg;
    out.push({ lat: path[i].lat, lon: path[i].lon });
  }
  return out;
}

function appendPath(dest, next) {
  if (!next || !next.length) return dest;
  if (!dest.length) {
    for (const p of next) dest.push({ lat: p.lat, lon: p.lon });
    return dest;
  }
  const last = dest[dest.length - 1];
  const start = next[0];
  const skipFirst = haversineMeters(last, start) <= 1.5;
  for (let i = skipFirst ? 1 : 0; i < next.length; i++) {
    dest.push({ lat: next[i].lat, lon: next[i].lon });
  }
  return dest;
}

export function formatLapLabel({ kind, index, total }) {
  if (!kind || !index || !total) return "";
  const word = kind === "lap" ? "Lap" : "Pass";
  return `${word} ${index} of ${total}`;
}

/**
 * Progress through a planned target, given meters already traveled along the plan
 * (or GPS distance for continue-past).
 *
 * Lap index comes from the start/finish gate analyser in lap_gate.js, which
 * only advances after every sector of the loop is completed in order. The
 * distance fallback below is for drawing a plan before a GPS track exists
 * (course preview / distance picker) and never drives a real lap count.
 */
export function progressOnPlan(plan, traveledMeters, { gate = null } = {}) {
  if (!plan) return null;
  const target = plan.targetMeters;
  const traveled = Math.max(0, Number(traveledMeters) || 0);
  const left = Math.max(0, target - traveled);
  const hitTarget = traveled + 0.5 >= target;
  const courseLen = plan.courseMeters || 0;
  let index = 1;
  let total = plan.totalPasses || 1;
  if (plan.mode === MODE_CONTINUE) {
    return {
      kind: null,
      index: null,
      total: null,
      label: "",
      traveled: Math.min(traveled, target),
      left,
      hitTarget,
      pastCourse: courseLen > 0 && traveled > courseLen + 1,
    };
  }
  if (courseLen > 0 && total > 0) {
    if (hitTarget) index = total;
    else if (plan.kind === "lap" && gate && gate.gated && gate.currentLap > 0) {
      index = Math.min(total, gate.currentLap);
    } else index = Math.min(total, Math.floor(traveled / courseLen) + 1);
  }
  return {
    kind: plan.kind,
    index,
    total,
    label: formatLapLabel({ kind: plan.kind, index, total }),
    traveled: Math.min(traveled, target),
    left,
    hitTarget,
    pastCourse: false,
    gated: !!(plan.kind === "lap" && gate && gate.gated),
    completedLaps: gate && gate.gated ? gate.completedLaps : null,
    bestLapSec: gate && gate.gated ? gate.bestLapSec : null,
  };
}

/**
 * Build a target-distance plan for a saved course.
 * `mode` is used only when target > course length.
 */
export function planTarget({ course, path, courseMeters: courseLenArg, targetMeters, mode = MODE_COURSE, closeMeters = CLOSE_METERS } = {}) {
  const line = path || (course ? coursePath(course) : null) || [];
  const courseMetersVal = courseLenArg != null ? Number(courseLenArg) : (course ? courseMeters(course) : pathLengthMeters(line));
  const target = Math.max(0, Number(targetMeters) || 0);
  if (!line.length || !(courseMetersVal > 0) || !(target > 0)) return null;

  const closed = isClosedCircuit(line, closeMeters);
  const kind = closed ? "lap" : "pass";

  if (mode === MODE_CONTINUE && target > courseMetersVal + 0.5) {
    return {
      mode: MODE_CONTINUE,
      closed,
      kind: null,
      courseMeters: courseMetersVal,
      targetMeters: target,
      path: line.map((p) => ({ lat: p.lat, lon: p.lon })),
      stopPin: null,
      totalPasses: 1,
      remainderMeters: target - courseMetersVal,
    };
  }

  const totalPasses = Math.max(1, Math.ceil((target - 0.01) / courseMetersVal));
  const remainder = target - (totalPasses - 1) * courseMetersVal;
  const exact = Math.abs(remainder - courseMetersVal) <= 0.5 || remainder <= 0.5;

  const built = [];
  let dirForward = true;
  for (let pass = 1; pass <= totalPasses; pass++) {
    const last = pass === totalPasses;
    const take = last && !exact ? remainder : courseMetersVal;
    const src = closed || dirForward ? line : reversePath(line);
    const chunk = last && !exact ? pathPrefix(src, take) : src.map((p) => ({ lat: p.lat, lon: p.lon }));
    appendPath(built, chunk);
    if (!closed) dirForward = !dirForward;
  }

  const stopAt = pointAlongPath(built, target) || built[built.length - 1];
  const stopPin = {
    lat: stopAt.lat,
    lon: stopAt.lon,
    role: "stop",
    meters: target,
  };

  return {
    mode: MODE_COURSE,
    closed,
    kind,
    courseMeters: courseMetersVal,
    targetMeters: target,
    path: built,
    stopPin,
    totalPasses,
    remainderMeters: exact ? 0 : remainder,
    exact,
  };
}

export function planFromCourse(course, targetMeters, mode) {
  return planTarget({ course, targetMeters, mode });
}

/**
 * Start and end are the designated pins, not a path that happens to close
 * or a return leg to some earlier waypoint.
 */
export function courseStartPin(course) {
  const pins = (course && course.pins) || [];
  if (!pins.length) return null;
  const start = pins.find((p) => p && p.role === "start");
  return start || pins[0];
}

export function courseEndPin(course) {
  const pins = (course && course.pins) || [];
  if (!pins.length) return null;
  for (let i = pins.length - 1; i >= 0; i--) {
    if (pins[i] && pins[i].role === "end") return pins[i];
  }
  return pins[pins.length - 1];
}

export function courseHasSharedStartEnd(course, closeMeters = CLOSE_METERS) {
  const pins = (course && course.pins) || [];
  if (pins.length < 2) return false;
  const start = courseStartPin(course);
  const end = courseEndPin(course);
  if (!start || !end) return false;
  const limit = closeMeters == null ? CLOSE_METERS : closeMeters;
  return haversineMeters(start, end) <= limit;
}

/** Show the session-distance / lap picker only for a shared start/end loop. */
export function shouldPromptSessionDistance(course) {
  return courseHasSharedStartEnd(course);
}

/**
 * A planned loop (use-course) ends at the computed stop pin.
 * Point-to-point and continue-past keep tracking after the end.
 */
export function shouldAutoEndAtTarget(sess) {
  if (!sess || !sess.goalComplete) return false;
  const target = sess.target;
  if (!target || !(Number(target.targetMeters) > 0)) return false;
  if (target.mode === MODE_CONTINUE) return false;
  return courseHasSharedStartEnd({ pins: sess.coursePins, path: sess.coursePath });
}

export function lapPlanFromMeters(courseMeters, targetMeters) {
  const course = Number(courseMeters) || 0;
  const target = Number(targetMeters) || 0;
  if (!(course > 0) || !(target > 0)) return null;
  const totalPasses = Math.max(1, Math.ceil((target - 0.01) / course));
  const remainder = target - (totalPasses - 1) * course;
  const exact = Math.abs(remainder - course) <= 0.5 || remainder <= 0.5;
  return {
    courseMeters: course,
    targetMeters: target,
    totalPasses,
    remainderMeters: exact ? 0 : remainder,
    exact,
    kind: "lap",
    underOneLap: target < course - 0.5,
  };
}

function formatPartial(meters, units) {
  return formatDistance(meters, units, { digits: 2 });
}

/** Human lap summary for the distance picker, e.g. "2 laps + 0.56 mi". */
export function formatLapPlanLabel(courseMeters, targetMeters, units = "mi") {
  const plan = lapPlanFromMeters(courseMeters, targetMeters);
  if (!plan) return "";
  const u = units === "km" ? "km" : "mi";
  if (plan.underOneLap) {
    return `Ends ${formatPartial(plan.targetMeters, u)} into the first lap`;
  }
  if (plan.exact) {
    return plan.totalPasses === 1 ? "1 lap" : `${plan.totalPasses} laps`;
  }
  const full = plan.totalPasses - 1;
  const laps = full === 1 ? "1 lap" : `${full} laps`;
  return `${laps} + ${formatPartial(plan.remainderMeters, u)}`;
}

export function inputValueForMeters(meters, units = "mi") {
  const n = Number(meters) || 0;
  if (!(n > 0)) return "";
  if (units === "km") return String(Math.round((n / METERS_PER_KM) * 100) / 100);
  return String(Math.round((n / METERS_PER_MILE) * 100) / 100);
}

function defaultStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch { /* private mode */ }
  return null;
}

export function isSessionDistanceExplainerSeen(storage) {
  const store = storage || defaultStorage();
  if (!store) return false;
  try {
    return store.getItem(SESSION_DISTANCE_EXPLAINER_KEY) === "1";
  } catch {
    return false;
  }
}

export function markSessionDistanceExplainerSeen(storage) {
  const store = storage || defaultStorage();
  if (!store) return;
  try {
    store.setItem(SESSION_DISTANCE_EXPLAINER_KEY, "1");
  } catch { /* quota */ }
}

