/**
 * Heldpath planner + split-target progression.
 * Progression replaces a fixed weekly % schedule.
 * A target only gets faster when BOTH are true:
 *   1) the user has met or beaten the current target
 *   2) at least one full week has passed at that target speed
 * Missing a target never makes it faster. Tightening is ~1–3%, capped by the goal.
 */
import {
  activityMph,
  etaSeconds,
  pathLengthMeters,
  legDistances,
  addDays,
  isoDate,
  startOfDay,
  METERS_PER_MILE,
  geodesicMeters,
} from "./util.js";
import { destination } from "./util.js";
import { autoLoopRoute, getActiveGraph } from "./routing.js";
import { ensureLoopGraph } from "./area_graphs.js";
import { KG_PER_LB } from "./body_weight.js";

export const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_STEP = 0.02; // 2%, within the 1–3% range
export const MIN_STEP = 0.01;
export const MAX_STEP = 0.03;

/** One new sport for this work: walk, run or ride. */
export const PLAN_ACTIVITY_TYPES = ["walk", "run", "ride"];
export const RIDE_MPH = 12;
export function planActivityMph(type) {
  if (type === "ride") return RIDE_MPH;
  return activityMph(type);
}
function planActivityType(type) {
  return type === "run" ? "run" : type === "ride" ? "ride" : "walk";
}

/* ————————————————————————————————————————————————————————————————
 * Published reference formulas. Nothing here is AI-generated: the
 * equations are the ACSM metabolic equations, the Compendium of
 * Physical Activities MET convention, Daniels/Gilbert VDOT, Riegel's
 * endurance prediction and ordinary hydration guidance.
 * ———————————————————————————————————————————————————————————————— */

/** ACSM metabolic equations (ACSM's Guidelines, walking/running). Grade is a fraction (0.05 = 5%). */
export function metsForPace({ activityType = "walk", mph, grade = 0 } = {}) {
  const speed = Number(mph);
  if (!Number.isFinite(speed) || speed <= 0) return 0;
  // Leisure cycling ballpark from the Compendium of Physical Activities
  // (about 8 METs at 12 mph). Plan-effort maths only.
  if (activityType === "ride") {
    return Math.round(Math.max(3.5, speed * 0.65) * 100) / 100;
  }
  const metersPerMin = (speed * METERS_PER_MILE) / 60;
  const g = Math.max(0, Number(grade) || 0);
  // Running: VO2 = 0.2 v + 0.9 v g + 3.5. Walking: VO2 = 0.1 v + 1.8 v g + 3.5 (v in m/min).
  const vo2 = activityType === "run"
    ? 0.2 * metersPerMin + 0.9 * metersPerMin * g + 3.5
    : 0.1 * metersPerMin + 1.8 * metersPerMin * g + 3.5;
  return Math.round((vo2 / 3.5) * 100) / 100;
}

/**
 * Estimated effort for a planned session. This is plan-effort maths, not a
 * replacement for the phone's health-app calories on a completed walk.
 * kcal/min = METs × 3.5 × kg / 200 (ACSM).
 */
export function effortEstimate({ activityType = "walk", mph, durationSec = 0, bodyKg = null, gainM = 0, distanceM = 0 } = {}) {
  const grade = (Number(distanceM) > 0 && Number(gainM) > 0) ? Number(gainM) / Number(distanceM) : 0;
  const mets = metsForPace({ activityType, mph, grade });
  const minutes = Math.max(0, Number(durationSec) || 0) / 60;
  const kg = Number(bodyKg) > 0 ? Number(bodyKg) : 70;
  const kcalPerMin = (mets * 3.5 * kg) / 200;
  return {
    mets,
    kcalPerMin: Math.round(kcalPerMin * 10) / 10,
    kcal: Math.round(kcalPerMin * minutes),
    bodyKg: kg,
    assumedBodyKg: !(Number(bodyKg) > 0),
  };
}

/** Riegel endurance prediction: T2 = T1 × (D2 / D1)^1.06. */
export function riegelPredict({ timeSec, fromMeters, toMeters, exponent = 1.06 } = {}) {
  const t = Number(timeSec);
  const from = Number(fromMeters);
  const to = Number(toMeters);
  if (!(t > 0) || !(from > 0) || !(to > 0)) return null;
  return t * Math.pow(to / from, exponent);
}

/**
 * Daniels/Gilbert VDOT from a race performance.
 * v in m/min, t in minutes.
 */
export function vdotFromPerformance({ distanceMeters, timeSec } = {}) {
  const d = Number(distanceMeters);
  const t = Number(timeSec) / 60;
  if (!(d > 0) || !(t > 0)) return null;
  const v = d / t;
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct =
    0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return Math.round((vo2 / pct) * 10) / 10;
}

/** Velocity (m/min) that costs a given % of VDOT, from the Daniels VO2 curve. */
function velocityForVdot(vdot, fraction) {
  const target = Number(vdot) * fraction;
  if (!(target > 0)) return 0;
  const a = 0.000104;
  const b = 0.182258;
  const c = -(4.6 + target);
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
}

/** The usual Daniels training bands, as paces. */
export function trainingPacesFromVdot(vdot) {
  const v = Number(vdot);
  if (!(v > 0)) return null;
  const band = (fraction) => {
    const mpm = velocityForVdot(v, fraction);
    const mph = (mpm * 60) / METERS_PER_MILE;
    const secPerMile = mph > 0 ? 3600 / mph : null;
    const secPerKm = mpm > 0 ? (1000 / mpm) * 60 : null;
    return {
      mph: Math.round(mph * 100) / 100,
      secPerMile: secPerMile == null ? null : Math.round(secPerMile),
      secPerKm: secPerKm == null ? null : Math.round(secPerKm),
    };
  };
  return {
    vdot: v,
    easy: band(0.7),
    marathon: band(0.79),
    threshold: band(0.88),
    interval: band(1.0),
  };
}

/**
 * @param {object} args
 * @param {number} args.currentTargetSec  current split/course target (seconds, lower is faster)
 * @param {number|null} args.bestPerformedSec  best time at this work, or null if never finished
 * @param {string|number|Date} args.targetStartedAt  when this target speed began
 * @param {Date} args.now
 * @param {number|null} [args.goalTargetSec]  fastest (lowest) time the goal requires; cap
 * @param {number} [args.step]  fraction in [0.01, 0.03]
 */
export function nextSplitTarget({
  currentTargetSec,
  bestPerformedSec,
  targetStartedAt,
  now,
  goalTargetSec = null,
  step = DEFAULT_STEP,
}) {
  const stepClamped = Math.min(MAX_STEP, Math.max(MIN_STEP, step || DEFAULT_STEP));
  const met = bestPerformedSec != null && Number.isFinite(bestPerformedSec) && bestPerformedSec <= currentTargetSec + 0.5;
  const started = new Date(targetStartedAt).getTime();
  const at = now instanceof Date ? now.getTime() : new Date(now).getTime();
  const fullWeekPassed = Number.isFinite(started) && at - started >= MS_WEEK;

  if (!met) {
    return { targetSec: currentTargetSec, tightened: false, reason: "not_met" };
  }
  if (!fullWeekPassed) {
    return { targetSec: currentTargetSec, tightened: false, reason: "week1_hold" };
  }

  let next = currentTargetSec * (1 - stepClamped);
  if (goalTargetSec != null && Number.isFinite(goalTargetSec)) {
    // Never faster than the goal requires (lower sec = faster).
    next = Math.max(next, goalTargetSec);
  }
  const tightened = next < currentTargetSec - 0.01;
  return {
    targetSec: tightened ? next : currentTargetSec,
    tightened,
    reason: tightened ? "tighten" : "at_goal",
  };
}

/**
 * Evenly divide the gap between today's target and the goal across the
 * sessions in the window. A target moves to the next rung only after that
 * session's target has been beaten, so a miss holds. Returns seconds.
 */
export function evenGapSteps({ currentTargetSec, goalTargetSec = null, sessions = 1 } = {}) {
  const current = Number(currentTargetSec);
  const n = Math.max(1, Math.round(Number(sessions) || 1));
  const goal = Number(goalTargetSec);
  if (!(current > 0)) return Array(n).fill(0);
  if (!(goal > 0) || goal >= current) return Array(n).fill(Math.round(current * 10) / 10);
  const gap = current - goal;
  if (n === 1) return [Math.round(goal * 10) / 10];
  return Array.from({ length: n }, (_, i) => {
    const sec = i === n - 1 ? goal : current - (gap * i) / (n - 1);
    return Math.round(sec * 10) / 10;
  });
}

/**
 * The rung for the next session. Hitting (or beating) the current rung
 * advances exactly one step; a miss keeps the same rung. Never faster than
 * the final goal rung.
 */
export function nextLadderTarget({ sessionTargetsSec, index = 0, performedSec = null } = {}) {
  const ladder = Array.isArray(sessionTargetsSec) && sessionTargetsSec.length
    ? sessionTargetsSec.map((v) => Number(v) || 0)
    : [];
  if (!ladder.length) return { targetSec: 0, nextIndex: 0, advanced: false, reason: "no_target" };
  const i = Math.max(0, Math.min(ladder.length - 1, Math.round(Number(index) || 0)));
  const targetSec = ladder[i];
  const performed = Number(performedSec);
  const beaten = Number.isFinite(performed) && performed > 0 && performed <= targetSec + 0.5;
  if (!beaten) {
    return { targetSec, nextIndex: i, advanced: false, reason: "not_met" };
  }
  if (i >= ladder.length - 1) {
    return { targetSec, nextIndex: i, advanced: false, reason: "at_goal" };
  }
  return {
    targetSec: ladder[i + 1],
    nextIndex: i + 1,
    advanced: true,
    reason: "advance",
  };
}

/**
 * Paid-plan progression: the precomputed even gap ladder advances one rung
 * when a session beats its target. Missing holds the rung. Per-leg targets
 * are the same rung split by leg distance, and each leg still only tightens
 * when that leg was beaten. `pins`/`path` make the per-leg split possible.
 */
export function applyCoachedSessionResult(
  progression,
  performedSec,
  now = new Date(),
  goalTargetSec = null,
  legPerformedSec = null,
  { pins = null, path = null, goalLegTargetsSec = null } = {}
) {
  const ladder = Array.isArray(progression && progression.sessionTargetsSec)
    ? progression.sessionTargetsSec.slice()
    : null;
  if (!ladder || !ladder.length) {
    return applySessionResult(progression, performedSec, now, goalTargetSec, legPerformedSec);
  }
  const step = nextLadderTarget({
    sessionTargetsSec: ladder,
    index: progression.sessionIndex || 0,
    performedSec,
  });
  const nextTarget = step.advanced ? step.targetSec : ladder[Math.max(0, Math.min(ladder.length - 1, progression.sessionIndex || 0))];
  const out = {
    ...progression,
    currentTargetSec: nextTarget,
    sessionIndex: step.nextIndex,
    lastReason: step.reason,
    lastPerformedSec: performedSec,
    lastSessionTargetSec: ladder[Math.max(0, Math.min(ladder.length - 1, progression.sessionIndex || 0))],
    lastAdvanced: step.advanced,
  };
  if (step.advanced) out.targetStartedAt = startOfDay(now).toISOString();

  if (pins && pins.length >= 2 && Array.isArray(legPerformedSec)) {
    const currentLegs = Array.isArray(out.legTargetsSec) ? out.legTargetsSec.slice() : [];
    const nextLegs = buildLegTargets(pins, nextTarget, { path });
    const goals = Array.isArray(goalLegTargetsSec)
      ? goalLegTargetsSec
      : (Array.isArray(out.legGoalTargetsSec) ? out.legGoalTargetsSec : null);
    const started = Array.isArray(out.legStartedAt) ? out.legStartedAt.slice() : [];
    for (let i = 0; i < nextLegs.length; i++) {
      const have = Number(legPerformedSec[i]);
      const cur = Number(currentLegs[i]) || 0;
      const candidate = Number(nextLegs[i]) || cur;
      const goal = goals && goals[i] != null ? Number(goals[i]) : null;
      const beaten = Number.isFinite(have) && have > 0 && have <= cur + 0.5;
      const allowed = goal == null || candidate >= goal;
      if (beaten && allowed && candidate < cur - 0.01) {
        currentLegs[i] = candidate;
        started[i] = startOfDay(now).toISOString();
      }
    }
    out.legTargetsSec = currentLegs;
    out.legStartedAt = started;
  }
  return out;
}

/** Daily drink target, general guidance, not medical advice. ml. */
export function waterTargetMl({ bodyKg, sessionHoursThatDay }) {
  const baseline = bodyKg ? Math.round((32.5 * bodyKg) / 50) * 50 : 2000;
  const extra = Math.round(((sessionHoursThatDay || 0) * 500) / 50) * 50;
  return { dailyMl: baseline + extra, baselineMl: baseline, exerciseMl: extra };
}

export const WATER_DISCLAIMER =
  "This is general guidance, not medical advice. Needs vary with body size, climate, health and medications. Ask a clinician if you are unsure. You can adjust this number.";

export function mlToOz(ml) {
  return Math.round(((Number(ml) || 0) / ML_PER_OZ) * 10) / 10;
}

export function ozToMl(oz) {
  return Math.round((Number(oz) || 0) * ML_PER_OZ);
}

export function defaultReminderTimes() {
  return DEFAULT_REMINDER_TIMES.slice();
}

/** Keep only valid HH:MM strings, de-duplicated and sorted. */
export function normaliseReminderTimes(times) {
  if (!Array.isArray(times)) return [];
  const out = [];
  for (const raw of times) {
    const m = String(raw || "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!m) continue;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) continue;
    const hhmm = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    if (!out.includes(hhmm)) out.push(hhmm);
  }
  return out.sort();
}

/** 22:00–05:59 counts as night. The app adds no night alerts on its own. */
export function isNightTime(hhmm) {
  const [h] = normaliseReminderTimes([hhmm]);
  if (!h) return false;
  const hour = Number(h.slice(0, 2));
  return hour >= 22 || hour < 6;
}

/**
 * Reminder times for a plan. Night alerts are dropped unless the plan says
 * the user deliberately added them (water.allowNight === true).
 */
export function reminderTimesFor(plan, opts = {}) {
  const raw = plan && plan.water && Array.isArray(plan.water.reminderLocalTimes)
    ? plan.water.reminderLocalTimes
    : DEFAULT_REMINDER_TIMES;
  const times = normaliseReminderTimes(raw.length ? raw : DEFAULT_REMINDER_TIMES);
  const allowNight = opts.allowNight != null
    ? !!opts.allowNight
    : !!(plan && plan.water && plan.water.allowNight);
  return allowNight ? times : times.filter((t) => !isNightTime(t));
}

/** Max sessions a week for a beginner-safe plan (at least two rest days). */
export const MAX_SESSIONS_PER_WEEK = { walk: 5, run: 4, ride: 5 };
export const DEFAULT_REMINDER_TIMES = ["08:00", "12:00", "16:00", "20:00"];
export const ML_PER_OZ = 29.5735;

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function bearingBetween(a, b) {
  const toR = (d) => (d * Math.PI) / 180;
  const lat1 = toR(a.lat);
  const lat2 = toR(b.lat);
  const dLon = toR(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

/**
 * Deterministic rectangular loop around the user's area. Not OSM road
 * routing: it is a sane, offline, repeatable shape that follows the map
 * area the user is in. The bearing offset is derived from the centre so
 * loops in different areas do not all line up the same way.
 */
export function autoLoopPins(center, meters, opts = {}) {
  const target = Math.max(200, Number(meters) || 0);
  const side = target / 4;
  const aspect = clamp(Number(opts.aspect) || 1.12, 0.8, 1.4);
  const east = side * aspect;
  const north = side * (2 - aspect);
  const seed = Math.abs(Math.round((center.lat * 1e5 + center.lon * 1e5) % 24));
  const offset = opts.bearingOffset == null ? seed - 12 : Number(opts.bearingOffset);
  const bearings = [90 + offset, 180 + offset, 270 + offset, 360 + offset];
  const dists = [east, north, east, north];
  const origin = { lat: center.lat, lon: center.lon, role: "start" };
  const pins = [{ ...origin }];
  let cur = { ...origin };
  for (let i = 0; i < 3; i++) {
    cur = destination(cur.lat, cur.lon, bearings[i], dists[i]);
    pins.push({ lat: cur.lat, lon: cur.lon, role: "via" });
  }
  pins.push({ lat: origin.lat, lon: origin.lon, role: "end" });
  return pins;
}

/** Scale a pin route around an anchor, preserving its shape. */
export function scalePins(pins, factor, anchor = null) {
  if (!pins || pins.length < 1) return [];
  const f = Number(factor);
  if (!(f > 0) || Math.abs(f - 1) < 0.001) return pins.map((p) => ({ ...p }));
  const a = anchor || pins[0];
  return pins.map((p) => {
    const meters = pathLengthMeters([a, p]);
    if (meters <= 0.5) return { ...p };
    const b = bearingBetween(a, p);
    const q = destination(a.lat, a.lon, b, meters * f);
    return { ...p, lat: q.lat, lon: q.lon };
  });
}

/** Repeat a route. Closed loops repeat as laps; open routes become out-and-back. */
export function repeatPins(pins, times) {
  if (!pins || pins.length < 2) return pins ? pins.map((p) => ({ ...p })) : [];
  const n = Math.max(1, Math.round(Number(times) || 1));
  if (n === 1) return pins.map((p) => ({ ...p }));
  const total = pathLengthMeters(pins);
  const closed = haversine(pins[0], pins[pins.length - 1]) <= Math.max(30, total * 0.05);
  const out = [];
  for (let k = 0; k < n; k++) {
    let chunk = pins.map((p) => ({ ...p }));
    if (!closed) chunk = k % 2 === 1 ? chunk.slice().reverse() : chunk;
    if (out.length) chunk = chunk.slice(1); // drop the join point
    out.push(...chunk);
  }
  out.forEach((p, i) => {
    p.role = i === 0 ? "start" : i === out.length - 1 ? "end" : "via";
  });
  return out;
}

function haversine(a, b) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Pick a deterministic route for a session length.
 * A saved course is used as a template: scaled to length, or repeated and
 * then scaled when the session is much longer than the course.
 */
function autoloopResult(loop, target) {
  if (loop && loop.ok !== false && !loop.fallback && loop.pins && loop.path && loop.path.length >= 2) {
    return {
      ok: true,
      mode: "autoloop",
      courseId: null,
      pins: loop.pins,
      path: loop.path,
      meters: loop.meters,
      targetLengthMeters: target,
      scaleFactor: 1,
      repeatTimes: 1,
    };
  }
  return {
    ok: false,
    mode: "autoloop",
    courseId: null,
    pins: [],
    path: null,
    meters: 0,
    targetLengthMeters: target,
    scaleFactor: 1,
    repeatTimes: 1,
    reason: (loop && loop.reason) || "no-loop",
  };
}

/**
 * Pick a deterministic route for a session length.
 * Saved courses are scaled/repeated. Auto loops use the walk graph around
 * `center` — never a silent rectangle, and never a hard-coded city.
 */
export function routeForGoal({ targetMeters, course = null, autoLoop = false, center = null, graph = null, loop = null } = {}) {
  const target = Math.max(50, Number(targetMeters) || 0);
  if (course && course.pins && course.pins.length >= 2 && !autoLoop) {
    const base = pathLengthMeters(course.pins);
    if (base > 1) {
      const ratio = target / base;
      let pins;
      let repeatTimes = 1;
      let scaleFactor = ratio;
      if (ratio > 2.5) {
        repeatTimes = Math.max(2, Math.round(ratio));
        pins = repeatPins(course.pins, repeatTimes);
        scaleFactor = target / Math.max(1, pathLengthMeters(pins));
        pins = scalePins(pins, scaleFactor, course.pins[0]);
      } else {
        pins = scalePins(course.pins, ratio, course.pins[0]);
      }
      return {
        ok: true,
        mode: "course",
        courseId: course.id || null,
        pins,
        targetLengthMeters: target,
        scaleFactor,
        repeatTimes,
      };
    }
  }
  if (!autoLoop) {
    return { ok: true, mode: "none", courseId: null, pins: [], path: null, targetLengthMeters: target, scaleFactor: 1, repeatTimes: 1 };
  }
  if (loop) return autoloopResult(loop, target);
  if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lon))) {
    return autoloopResult({ ok: false, reason: "no-center" }, target);
  }
  const g = graph || getActiveGraph();
  if (!g) return autoloopResult({ ok: false, reason: "no-graph" }, target);
  return autoloopResult(autoLoopRoute(g, center, target), target);
}

/** Load the walk graph for the user's location and build a street loop. */
export async function buildAutoLoop(center, targetMeters, opts = {}) {
  const target = Math.max(200, Number(targetMeters) || 0);
  if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lon))) {
    return autoloopResult({ ok: false, reason: "no-center" }, target);
  }
  let graph = null;
  try {
    graph = await ensureLoopGraph(center, target, opts);
  } catch {
    graph = getActiveGraph();
  }
  if (!graph) return autoloopResult({ ok: false, reason: "no-graph" }, target);
  return autoloopResult(autoLoopRoute(graph, center, target, opts), target);
}

export const AUTO_LOOP_FAIL_COPY = "Couldn't build a loop here — pick a saved route or build one";

/**
 * Split a session target into per-leg (between-pins) targets, in seconds.
 * The last leg absorbs rounding so the legs add up to the session target.
 */
export function buildLegTargets(pins, totalSec) {
  const total = Math.max(1, Math.round(Number(totalSec) || 0));
  const legs = pins && pins.length >= 2 ? legDistances(pins) : [];
  if (!legs.length) return [];
  const meters = legs.reduce((s, l) => s + l.meters, 0);
  if (meters <= 0) {
    const each = Math.round(total / legs.length);
    return legs.map((_, i) => (i === legs.length - 1 ? total - each * (legs.length - 1) : each));
  }
  const out = legs.map((l) => Math.max(1, Math.round((l.meters / meters) * total)));
  const drift = total - out.reduce((s, v) => s + v, 0);
  out[out.length - 1] = Math.max(1, out[out.length - 1] + drift);
  return out;
}

/** Apply the same progression rule to every leg independently. */
export function applyLegSessionResult(progression, performedSecs, now = new Date(), goalTargetsSec = null) {
  const targets = Array.isArray(progression.legTargetsSec) ? progression.legTargetsSec.slice() : [];
  const started = Array.isArray(progression.legStartedAt) ? progression.legStartedAt.slice() : [];
  const goals = Array.isArray(goalTargetsSec) ? goalTargetsSec : null;
  const reasons = [];
  let anyTightened = false;
  for (let i = 0; i < targets.length; i++) {
    const res = nextSplitTarget({
      currentTargetSec: targets[i],
      bestPerformedSec: Array.isArray(performedSecs) ? performedSecs[i] : null,
      targetStartedAt: started[i] || progression.targetStartedAt,
      now,
      goalTargetSec: goals ? goals[i] : null,
      step: progression.step || DEFAULT_STEP,
    });
    reasons.push(res.reason);
    if (res.tightened) {
      targets[i] = res.targetSec;
      started[i] = startOfDay(now).toISOString();
      anyTightened = true;
    }
  }
  return {
    ...progression,
    legTargetsSec: targets,
    legStartedAt: started,
    lastLegReasons: reasons,
    lastLegTightened: anyTightened,
  };
}

/** Per-leg times from a completed GPS track, or null if the track is short. */
export function legSplitsFromTrack(pins, track) {
  if (!pins || pins.length < 2 || !track || track.length < 2) return null;
  if (!track.every((p) => p && Number.isFinite(p.t))) return null;
  const legs = legDistances(pins).map((l) => l.meters);
  const out = [];
  let boundary = 0;
  let idx = 1;
  let traveled = 0;
  let prevTraveled = 0;
  let prevT = 0;
  for (const leg of legs) {
    boundary += leg;
    while (idx < track.length && traveled < boundary) {
      prevTraveled = traveled;
      traveled += geodesicMeters(track[idx - 1], track[idx]);
      prevT = track[idx - 1].t;
      idx++;
    }
    if (traveled < boundary) return null;
    const span = traveled - prevTraveled;
    const frac = span <= 0 ? 0 : (boundary - prevTraveled) / span;
    const t = prevT + (track[idx - 1].t - prevT) * frac;
    out.push(Math.max(1, Math.round(t - (out.reduce((s, v) => s + v, 0)))));
  }
  return out;
}

/** Safe weekly volume check: about 10% is the ceiling. */
export function safeWeeklyIncrease(previousMeters, nextMeters, maxIncreasePct = 0.1) {
  const prev = Number(previousMeters);
  const next = Number(nextMeters);
  if (!(prev > 0) || !Number.isFinite(next)) return false;
  return next <= prev * (1 + maxIncreasePct) + 0.5;
}

/**
 * Week-by-week volume summary. Sessions are held at the same length across
 * the window, so volume never jumps; the helper still exposes the 10% cap
 * for any later ramp and for tests.
 */
export function weeklyProgression({ windowDays = 14, sessionsPerWeek = 3, sessionMeters = 0, maxIncreasePct = 0.1 } = {}) {
  const days = Math.max(1, Math.round(Number(windowDays) || 14));
  const weeks = Math.max(1, Math.ceil(days / 7));
  const perWeek = Math.max(0, Number(sessionsPerWeek) || 0);
  const meters = Math.max(0, Number(sessionMeters) || 0);
  const out = [];
  for (let i = 0; i < weeks; i++) {
    const weekMeters = Math.round(perWeek * meters);
    const prev = i ? out[i - 1].meters : weekMeters;
    out.push({
      week: i + 1,
      sessions: perWeek,
      meters: weekMeters,
      safe: i === 0 ? true : safeWeeklyIncrease(prev, weekMeters, maxIncreasePct),
    });
  }
  return { weeks: out, maxIncreasePct, safe: out.every((w) => w.safe) };
}

/** Beginner walk-run mix guidance for run plans. */
export function runWalkMix({ activityType, beginner = true, sessionSec = 1800 } = {}) {
  if (activityType !== "run" || !beginner) return null;
  return {
    label: "Walk 5 min to warm up, then repeat 1 min easy run / 2 min walk. Finish with 5 min walking.",
    warmupSec: 300,
    runSec: 60,
    walkSec: 120,
    minutes: Math.round((Number(sessionSec) || 0) / 60),
  };
}

/**
 * Ride session pattern. Easy/harder intervals on time, not power, so no
 * power meter is needed. Same incremental target rule as walk and run.
 */
export function rideMix({ activityType, beginner = true, sessionSec = 1800 } = {}) {
  if (activityType !== "ride") return null;
  const minutes = Math.max(10, Math.round((Number(sessionSec) || 1800) / 60));
  return beginner
    ? {
        label: "Ride easy 5 min, then repeat 2 min steady / 2 min easy. Spin easy for the last 5 min.",
        warmupSec: 300,
        hardSec: 120,
        easySec: 120,
        minutes,
      }
    : {
        label: "Ride easy 10 min, then 3 × 5 min steady with 2 min easy between. Finish easy.",
        warmupSec: 600,
        hardSec: 300,
        easySec: 120,
        minutes,
      };
}

/** The session pattern for the paid plan: walk-run, ride intervals or an even walk. */
export function sessionMix({ activityType = "walk", beginner = true, sessionSec = 1800 } = {}) {
  const type = planActivityType(activityType);
  if (type === "run") return runWalkMix({ activityType: type, beginner, sessionSec });
  if (type === "ride") return rideMix({ activityType: type, beginner, sessionSec });
  return {
    label: "Walk at an easy, even effort. Keep a rest day between longer walks.",
    minutes: Math.max(10, Math.round((Number(sessionSec) || 1800) / 60)),
  };
}

/* ————————————————————————————————————————————————————————————————
 * Carb and protein guidance for the $2 plan. Ranges are published
 * general guidance for recreational endurance activity, scaled to a
 * 2,000 kcal reference diet. This is not a personal prescription and
 * not medical advice.
 * ———————————————————————————————————————————————————————————————— */

export const NUTRITION_DISCLAIMER_PERSONAL =
  "General guidance for healthy adults, not medical advice. Daily gram ranges are based on your weight and published per-body-weight rates for recreational endurance activity. Needs vary with health and medications — adjust with a clinician or dietitian if you are unsure.";

export const NUTRITION_DISCLAIMER_REFERENCE =
  "General guidance for healthy adults, not medical advice. Without a body weight, daily gram ranges follow a 2,000-calorie reference diet (carbohydrate about 45–65% of calories, protein about 10–35%). Enter your weight for a personalised daily range. Needs vary — adjust with a clinician or dietitian if you are unsure.";

/** Default disclaimer: the 2,000-calorie fallback used when no weight is entered. */
export const NUTRITION_DISCLAIMER = NUTRITION_DISCLAIMER_REFERENCE;

export const NUTRITION_SOURCES = [
  "ACSM, Nutrition and Athletic Performance (2016): carbohydrate and protein ranges for training and recovery.",
  "ISSN position stand, Protein and Exercise (2017): 1.2–1.6 g/kg/day for endurance activity.",
  "ISSN position stand, Carbohydrate and Exercise Performance (2018): 3–5 g/kg/day for moderate endurance training.",
];

/** 2,000-calorie AMDR gram bands used only when no body weight is entered. */
export const REFERENCE_DIET_KCAL = 2000;
export const REFERENCE_CARB_G = { minG: 225, maxG: 325, minPct: 45, maxPct: 65 };
export const REFERENCE_PROTEIN_G = { minG: 50, maxG: 175, minPct: 10, maxPct: 35 };

/**
 * Format a published g/kg range in the user's body-weight unit.
 * 1 g/kg equals KG_PER_LB g/lb (the exact international pound).
 */
export function formatGramsPerBodyMass(minPerKg, maxPerKg, unit, { suffix = "/day" } = {}) {
  const tag = suffix == null ? "" : String(suffix);
  if (unit === "lb") {
    const lo = Number(minPerKg) * KG_PER_LB;
    const hi = Number(maxPerKg) * KG_PER_LB;
    return `${lo.toFixed(2)}–${hi.toFixed(2)} g/lb${tag}`;
  }
  const trim = (n) => {
    const s = Number(n);
    return Number.isInteger(s) ? String(s) : String(s);
  };
  return `${trim(minPerKg)}–${trim(maxPerKg)} g/kg${tag}`;
}

/**
 * Conservative carb and protein ranges.
 * With a body weight, use the published ACSM/ISSN g/kg rates and scale
 * daily grams to that weight. Display the rates as g/lb when the user's
 * unit is lb, and as g/kg when it is kg.
 * Without a weight, do not invent a 70 kg example: fall back to 2,000-calorie
 * diet gram bands (AMDR) and still show the published per-body-weight rates
 * so the user can see how a later weight entry will personalise the totals.
 */
export function carbProteinGuidance({ activityType = "walk", bodyKg = null, sessionSec = 0, weightUnit = "kg" } = {}) {
  const type = planActivityType(activityType);
  const unit = weightUnit === "lb" ? "lb" : "kg";
  const hasWeight = Number(bodyKg) > 0;
  const kg = hasWeight ? Number(bodyKg) : null;
  const assumedBodyKg = !hasWeight;
  const hours = Math.max(0, Number(sessionSec) || 0) / 3600;
  const carbRate = { minPerKg: 3, maxPerKg: 5 };
  const proteinRate = { minPerKg: 1.2, maxPerKg: 1.6 };
  const carbLow = hasWeight ? Math.round(carbRate.minPerKg * kg) : REFERENCE_CARB_G.minG;
  const carbHigh = hasWeight ? Math.round(carbRate.maxPerKg * kg) : REFERENCE_CARB_G.maxG;
  const proteinLow = hasWeight ? Math.round(proteinRate.minPerKg * kg) : REFERENCE_PROTEIN_G.minG;
  const proteinHigh = hasWeight ? Math.round(proteinRate.maxPerKg * kg) : REFERENCE_PROTEIN_G.maxG;
  const carbPct = hasWeight ? null : REFERENCE_CARB_G.maxPct;
  const proteinPct = hasWeight ? null : REFERENCE_PROTEIN_G.maxPct;
  const proteinAfter = formatGramsPerBodyMass(0.25, 0.3, unit, { suffix: "" });
  return {
    activityType: type,
    bodyKg: kg,
    assumedBodyKg,
    weightUnit: unit,
    carbs: {
      minG: carbLow,
      maxG: carbHigh,
      minPerKg: carbRate.minPerKg,
      maxPerKg: carbRate.maxPerKg,
      perKg: formatGramsPerBodyMass(carbRate.minPerKg, carbRate.maxPerKg, "kg"),
      perUnit: formatGramsPerBodyMass(carbRate.minPerKg, carbRate.maxPerKg, unit),
      note: hours >= 1
        ? "On longer session days, favour the upper end and eat something with carbohydrate 1–4 hours before."
        : "Spread carbohydrate across the day; a normal mixed diet usually covers a short session.",
    },
    protein: {
      minG: proteinLow,
      maxG: proteinHigh,
      minPerKg: proteinRate.minPerKg,
      maxPerKg: proteinRate.maxPerKg,
      perKg: formatGramsPerBodyMass(proteinRate.minPerKg, proteinRate.maxPerKg, "kg"),
      perUnit: formatGramsPerBodyMass(proteinRate.minPerKg, proteinRate.maxPerKg, unit),
      note: `Include ${proteinAfter} of protein after a session and at meals through the day.`,
    },
    reference: {
      kcal: 2000,
      carbPct,
      proteinPct,
      personalized: hasWeight,
      line: hasWeight
        ? "Daily totals use your weight and published per-body-weight rates; your needs may differ."
        : "Daily totals follow a 2,000-calorie reference diet; enter your weight for a personalised range.",
    },
    disclaimer: hasWeight ? NUTRITION_DISCLAIMER_PERSONAL : NUTRITION_DISCLAIMER_REFERENCE,
    sources: NUTRITION_SOURCES.slice(),
    userAdjustable: true,
  };
}

/**
 * Session count and window only — no paces, distances per week, water, or
 * sector splits. Safe to show before a plan is unlocked.
 */
export function planSessionOutline({
  activityType = "walk",
  goalDistanceMeters = null,
  goalDurationSec = null,
  windowDays = 14,
  course = null,
} = {}) {
  const type = planActivityType(activityType);
  const mph = planActivityMph(type);
  const days = Math.max(1, Math.round(windowDays || 14));
  const goalDistance = Number(goalDistanceMeters) > 0 ? Number(goalDistanceMeters) : null;
  const goalDuration = Number(goalDurationSec) > 0 ? Number(goalDurationSec) : null;

  const maxPerWeek = MAX_SESSIONS_PER_WEEK[type];
  const weeksFrac = Math.max(1, days / 7);
  const maxSessions = Math.max(1, Math.min(days, Math.floor(weeksFrac * maxPerWeek)));
  const typical30 = (mph * METERS_PER_MILE) / 2; // 30 minutes
  const typical45 = typical30 * 1.5;

  // Aim at about three sessions a week first, then size each session to the
  // goal. Very small goals therefore become shorter sessions, not a plan with
  // one giant session and six days off.
  const targetSessions = clamp(Math.round(weeksFrac * 3) || 3, 2, maxSessions);
  const minSession = typical30 * 0.18; // about 5 minutes; goals can be small
  const maxSession = typical45 * 1.25;
  let sessionMeters;
  if (goalDistance) {
    sessionMeters = clamp(goalDistance / targetSessions, minSession, maxSession);
  } else if (goalDuration) {
    sessionMeters = (goalDuration / targetSessions) * ((mph * METERS_PER_MILE) / 3600);
    sessionMeters = clamp(sessionMeters, minSession, maxSession);
  } else if (course && course.pins && course.pins.length >= 2) {
    sessionMeters = pathLengthMeters(course.pins);
  } else {
    sessionMeters = typical30;
  }

  let sessionSecTypical = etaSeconds(sessionMeters, mph) || 1;
  let sessionsNeeded = 1;
  if (goalDistance) sessionsNeeded = Math.max(sessionsNeeded, Math.ceil(goalDistance / sessionMeters - 1e-6));
  if (goalDuration) sessionsNeeded = Math.max(sessionsNeeded, Math.ceil(goalDuration / sessionSecTypical - 1e-6));
  if (sessionsNeeded > maxSessions) {
    // Keep the goal reachable rather than scheduling every day.
    sessionsNeeded = maxSessions;
    if (goalDistance) {
      sessionMeters = goalDistance / maxSessions;
      sessionSecTypical = etaSeconds(sessionMeters, mph) || 1;
    } else if (goalDuration) {
      sessionSecTypical = goalDuration / maxSessions;
      sessionMeters = sessionSecTypical * ((mph * METERS_PER_MILE) / 3600);
    }
  }
  sessionsNeeded = Math.max(1, Math.min(sessionsNeeded, days));
  const weeks = days % 7 === 0 ? days / 7 : Math.ceil(days / 7);
  return {
    activityType: type,
    days,
    weeks,
    sessions: sessionsNeeded,
    sessionMeters,
    sessionSecTypical,
  };
}

export function formatPlanLength(outline) {
  const o = outline || {};
  const kind = planActivityType(o.activityType);
  const noun = kind === "ride" ? "ride" : kind;
  const n = Math.max(1, Number(o.sessions) || 1);
  const guided = n === 1 ? `1 guided ${noun}` : `${n} guided ${noun}s`;
  const days = Math.max(1, Number(o.days) || 1);
  const weeks = Number(o.weeks) || Math.ceil(days / 7);
  const window = days >= 7 && days % 7 === 0
    ? `${weeks} week${weeks === 1 ? "" : "s"}`
    : `${days} day${days === 1 ? "" : "s"}`;
  return `${window}, ${guided}`;
}

/** Public teaser for the pre-purchase screen. No step targets or water amounts. */
export function planTeaserModel(goal = {}, { units = "mi", formatDistance } = {}) {
  const outline = planSessionOutline(goal);
  const type = outline.activityType;
  const kind = type === "ride" ? "Ride" : type === "run" ? "Run" : "Walk";
  let goalLabel = kind;
  const dist = Number(goal.goalDistanceMeters);
  if (dist > 0 && typeof formatDistance === "function") {
    goalLabel = `${kind} ${formatDistance(dist, units)}`;
  } else if (dist > 0) {
    const miles = dist / METERS_PER_MILE;
    const km = dist / 1000;
    goalLabel = units === "km"
      ? `${kind} ${Number(km.toFixed(km < 10 ? 2 : 1))} km`
      : `${kind} ${Number(miles.toFixed(miles < 10 ? 3 : 1))} mi`;
  }
  if (Number(goal.goalDurationSec) > 0) {
    const sec = Math.round(Number(goal.goalDurationSec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    goalLabel += ` in ${m}:${String(s).padStart(2, "0")}`;
  }
  return {
    goalLabel,
    lengthLabel: formatPlanLength(outline),
    includes: ["Even gap-split interval targets", "Walk-run or ride intervals", "Water guidance", "Carb and protein guidance"],
    activityType: type,
    windowDays: outline.days,
    weeks: outline.weeks,
    sessions: outline.sessions,
  };
}

/**
 * Build a plan draft from a goal. Does not charge or save.
 * Route: saved course scaled/repeated to the session length, else a
 * deterministic loop around the user's area.
 * Time goal: Riegel scaling from the goal performance; run effort also gets
 * a VDOT and Daniels training bands when a distance and time are both set.
 * Call this only after a plan is unlocked (purchase, credit, or a shared import).
 */
export function buildPlanDraft({
  activityType = "walk",
  goalDistanceMeters = null,
  goalDurationSec = null,
  windowDays = 14,
  course = null,
  autoLoop = false,
  center = null,
  loop = null,
  bodyKg = null,
  weightUnit = "kg",
  now = new Date(),
  name = "",
  beginner = true,
}) {
  const type = planActivityType(activityType);
  const mph = planActivityMph(type);
  const maxPerWeek = MAX_SESSIONS_PER_WEEK[type];
  const outline = planSessionOutline({
    activityType: type,
    goalDistanceMeters,
    goalDurationSec,
    windowDays,
    course,
  });
  const days = outline.days;
  const goalDistance = Number(goalDistanceMeters) > 0 ? Number(goalDistanceMeters) : null;
  const goalDuration = Number(goalDurationSec) > 0 ? Number(goalDurationSec) : null;
  let sessionMeters = outline.sessionMeters;
  let sessionSecTypical = outline.sessionSecTypical;
  const sessionsNeeded = outline.sessions;

  const route = routeForGoal({ targetMeters: sessionMeters, course, autoLoop, center, loop });
  const pins = (route && route.pins) || [];
  const routeMeters = (route && route.path && route.path.length >= 2) ? pathLengthMeters(route.path) : pathLengthMeters(pins);
  sessionMeters = routeMeters || sessionMeters;
  sessionSecTypical = etaSeconds(sessionMeters, mph) || 1;

  const dates = spreadDates(now, days, sessionsNeeded);
  const goalTargetSec =
    goalDistance && goalDuration
      ? riegelPredict({
          timeSec: goalDuration,
          fromMeters: goalDistance,
          toMeters: sessionMeters,
        })
      : null;
  const initialTargetSec = goalTargetSec
    ? Math.max(goalTargetSec, sessionSecTypical) // start no faster than typical
    : sessionSecTypical;
  // Paid coaching ladder: the whole gap is divided evenly across the sessions.
  const sessionTargetsSec = evenGapSteps({
    currentTargetSec: initialTargetSec,
    goalTargetSec,
    sessions: sessionsNeeded,
  });
  const nutrition = carbProteinGuidance({ activityType: type, bodyKg, sessionSec: sessionSecTypical, weightUnit });

  const effort = effortEstimate({
    activityType: type,
    mph,
    durationSec: sessionSecTypical,
    bodyKg,
  });

  let vdot = null;
  let trainingPaces = null;
  if (type === "run" && goalDistance && goalDuration) {
    vdot = vdotFromPerformance({ distanceMeters: goalDistance, timeSec: goalDuration });
    trainingPaces = trainingPacesFromVdot(vdot);
  }

  // Water: on a session day, add exercise water for that session's hours.
  const hours = sessionSecTypical / 3600;
  const water = waterTargetMl({ bodyKg, sessionHoursThatDay: hours });
  const waterRest = waterTargetMl({ bodyKg, sessionHoursThatDay: 0 });

  const title = name || defaultTitle(type, goalDistance, goalDuration, days);
  const startedAt = startOfDay(now).toISOString();
  const legSource = (route.path && route.path.length >= 2) ? route.path : pins;
  const legTargetsSec = (legSource && legSource.length >= 2)
    ? buildLegTargets(legSource, initialTargetSec)
    : [Math.round(initialTargetSec) || 1];
  const legGoalTargetsSec = goalTargetSec
    ? ((legSource && legSource.length >= 2) ? buildLegTargets(legSource, goalTargetSec) : [Math.round(goalTargetSec) || 1])
    : null;

  return {
    version: 1,
    title,
    activityType: type,
    goal: {
      kind: goalDistance && goalDuration ? "both" : goalDuration ? "time" : "distance",
      distanceMeters: goalDistance,
      durationSec: goalDuration,
      windowDays: days,
    },
    water: {
      ...water,
      restDayMl: waterRest.dailyMl,
      userAdjusted: false,
      reminderLocalTimes: DEFAULT_REMINDER_TIMES.slice(),
      source: "efsa-acsm-general",
    },
    route: {
      ok: route.ok !== false,
      reason: route.reason || null,
      mode: route.mode,
      courseId: route.courseId,
      targetLengthMeters: sessionMeters,
      scaleFactor: Math.round((route.scaleFactor || 1) * 1000) / 1000,
      repeatTimes: route.repeatTimes,
      loop: { type: "LineString", coordinates: (route.path && route.path.length >= 2 ? route.path : pins).map((p) => [p.lon, p.lat]) },
      pins,
      path: route.path && route.path.length >= 2 ? route.path : null,
    },
    schedule: {
      sessionsPerWeek: Number(((sessionsNeeded / days) * 7).toFixed(2)),
      sessionDistanceMeters: sessionMeters,
      sessionDurationSec: sessionSecTypical,
      sessionDates: dates,
      initialTargetSec,
      goalTargetSec,
      sessionTargetsSec,
      legTargetsSec,
      legGoalTargetsSec,
      maxSessionsPerWeek: maxPerWeek,
      effort,
      vdot,
      trainingPaces,
      nutrition,
      mix: sessionMix({ activityType: type, beginner, sessionSec: sessionSecTypical }),
      weekly: weeklyProgression({
        windowDays: days,
        sessionsPerWeek: sessionsNeeded / days * 7,
        sessionMeters,
      }),
    },
    progression: {
      currentTargetSec: initialTargetSec,
      targetStartedAt: startedAt,
      step: DEFAULT_STEP,
      sessionIndex: 0,
      sessionTargetsSec,
      legTargetsSec,
      legStartedAt: legTargetsSec.map(() => startedAt),
      legGoalTargetsSec,
    },
  };
}

function defaultTitle(type, dist, dur, days) {
  const kind = type === "ride" ? "Ride" : type === "run" ? "Run" : "Walk";
  if (dist) return `${days}-day ${kind.toLowerCase()} plan`;
  return `${days}-day ${kind.toLowerCase()} plan`;
}

export function spreadDates(now, windowDays, count) {
  const days = Math.max(1, Math.round(windowDays || 1));
  const n = Math.max(0, Math.min(days, Math.round(count || 0)));
  const start = addDays(startOfDay(now), 1); // start tomorrow
  if (n === 0) return [];
  if (n === 1) return [isoDate(start)];
  const lastOffset = Math.max(1, days - 1);
  const offsets = [];
  for (let i = 0; i < n; i++) {
    offsets.push(Math.round((i * lastOffset) / (n - 1)));
  }
  // Even spacing already keeps two rest days in most plans. If three days in
  // a row slip through, nudge the middle one so no beginner plan is daily.
  for (let i = 1; i < offsets.length - 1; i++) {
    if (offsets[i] === offsets[i - 1] + 1 && offsets[i] === offsets[i + 1] - 1) {
      const move = offsets[i + 1] < lastOffset ? 1 : -1;
      if (offsets[i] + move !== offsets[i + 1] || move < 0) offsets[i] += move;
    }
  }
  const dates = unique(offsets.sort((a, b) => a - b)).map((o) => isoDate(addDays(start, o)));
  return dates;
}

function unique(arr) {
  return arr.filter((v, i) => arr.indexOf(v) === i);
}

/**
 * Apply progression after a session result, returning a new progression object.
 * Passing per-leg performed seconds (5th argument) applies the same rule to
 * every pin-to-pin target independently.
 */
export function applySessionResult(
  progression,
  performedSec,
  now = new Date(),
  goalTargetSec = null,
  legPerformedSec = null
) {
  const next = nextSplitTarget({
    currentTargetSec: progression.currentTargetSec,
    bestPerformedSec: performedSec,
    targetStartedAt: progression.targetStartedAt,
    now,
    goalTargetSec,
    step: progression.step || DEFAULT_STEP,
  });
  let out;
  if (!next.tightened) {
    out = { ...progression, lastReason: next.reason, lastPerformedSec: performedSec };
  } else {
    out = {
      ...progression,
      currentTargetSec: next.targetSec,
      targetStartedAt: startOfDay(now).toISOString(),
      lastReason: next.reason,
      lastPerformedSec: performedSec,
    };
  }
  if (Array.isArray(legPerformedSec) && Array.isArray(out.legTargetsSec)) {
    out = applyLegSessionResult(out, legPerformedSec, now, out.legGoalTargetsSec || null);
  }
  return out;
}
