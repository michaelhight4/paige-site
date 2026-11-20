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

export const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
export const DEFAULT_STEP = 0.02; // 2%, within the 1–3% range
export const MIN_STEP = 0.01;
export const MAX_STEP = 0.03;

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
export const MAX_SESSIONS_PER_WEEK = { walk: 5, run: 4 };
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
export function routeForGoal({ targetMeters, course = null, autoLoop = false, center = null } = {}) {
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
        mode: "course",
        courseId: course.id || null,
        pins,
        targetLengthMeters: target,
        scaleFactor,
        repeatTimes,
      };
    }
  }
  const origin = center || { lat: 43.7672, lon: 11.2543 };
  const graph = getActiveGraph();
  if (graph) {
    const loop = autoLoopRoute(graph, origin, target);
    if (loop && !loop.fallback && loop.pins && loop.path && loop.path.length >= 2) {
      return {
        mode: "autoloop",
        courseId: null,
        pins: loop.pins,
        path: loop.path,
        targetLengthMeters: target,
        scaleFactor: 1,
        repeatTimes: 1,
      };
    }
  }
  const pins = autoLoopPins(origin, target);
  return {
    mode: "autoloop",
    courseId: null,
    pins,
    targetLengthMeters: target,
    scaleFactor: 1,
    repeatTimes: 1,
    fallback: "rectangle",
  };
}

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
  const type = activityType === "run" ? "run" : "walk";
  const mph = activityMph(type);
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
  const kind = o.activityType === "run" ? "run" : "walk";
  const n = Math.max(1, Number(o.sessions) || 1);
  const guided = n === 1 ? `1 guided ${kind}` : `${n} guided ${kind}s`;
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
  const kind = type === "run" ? "Run" : "Walk";
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
    includes: ["Step goals", "Per-leg paces", "Water reminders"],
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
  center = { lat: 43.7672, lon: 11.2543 },
  bodyKg = null,
  now = new Date(),
  name = "",
  beginner = true,
}) {
  const type = activityType === "run" ? "run" : "walk";
  const mph = activityMph(type);
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

  const route = routeForGoal({ targetMeters: sessionMeters, course, autoLoop, center });
  const pins = route.pins;
  sessionMeters = pathLengthMeters(pins) || sessionMeters;
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
  const legTargetsSec = buildLegTargets(pins, initialTargetSec);
  const legGoalTargetsSec = goalTargetSec ? buildLegTargets(pins, goalTargetSec) : null;

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
      mode: route.mode,
      courseId: route.courseId,
      targetLengthMeters: sessionMeters,
      scaleFactor: Math.round(route.scaleFactor * 1000) / 1000,
      repeatTimes: route.repeatTimes,
      loop: { type: "LineString", coordinates: (route.path && route.path.length >= 2 ? route.path : pins).map((p) => [p.lon, p.lat]) },
      pins,
    },
    schedule: {
      sessionsPerWeek: Number(((sessionsNeeded / days) * 7).toFixed(2)),
      sessionDistanceMeters: sessionMeters,
      sessionDurationSec: sessionSecTypical,
      sessionDates: dates,
      initialTargetSec,
      goalTargetSec,
      legTargetsSec,
      legGoalTargetsSec,
      maxSessionsPerWeek: maxPerWeek,
      effort,
      vdot,
      trainingPaces,
      mix: runWalkMix({ activityType: type, beginner, sessionSec: sessionSecTypical }),
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
      legTargetsSec,
      legStartedAt: legTargetsSec.map(() => startedAt),
      legGoalTargetsSec,
    },
  };
}

function defaultTitle(type, dist, dur, days) {
  const kind = type === "run" ? "Run" : "Walk";
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
