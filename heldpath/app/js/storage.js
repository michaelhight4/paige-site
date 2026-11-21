import { uid } from "./util.js";
import { normalizeSport } from "./sport.js";

const KEY = "heldpath.v1";

const DEFAULT_SETTINGS = {
  units: "mi",
  healthOptIn: false,
  mapPackInstalled: false,
  seenMapPrompt: false,
  locationDisclosureAccepted: false,
  mapDataMode: null, // "offline" | "mobile"
  lastKnown: null, // { lat, lon, at }
  demo: false,
  autoPause: true,
  lowPower: false,
  countHills: false,
  mapStyle: "map", // "map" | "satellite"
  lastPathMode: "on", // "on" | "off" — next pin in the course builder
  lastSessionDistanceMeters: null,
  weightUnit: null, // "lb" | "kg" — null means pick from locale / units
  bodyKg: null,
  lastSport: "walk", // walk | run | ride — the start picker default
};

export function emptyState() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    courses: [],
    activities: [],
    plans: [], // free scheduled sessions on the calendar (also plan sessions)
    planLibrary: [], // owned/imported plan objects
    planCredits: 0, // cached count; the IAP ledger is authoritative
    groupRuns: [],
    goals: [], // free personal goals — never paywalled
  };
}


/**
 * Weekly/monthly *time totals* are no longer a free goal type.
 * A time goal is a target time for a set distance (or a saved route),
 * tracked run over run, with no deadline. If a leftover period-time
 * goal also has a distance and a time, keep it as a time-for-distance
 * goal; otherwise drop it.
 */
export function isPeriodTimeGoal(goal) {
  if (!goal) return false;
  const k = String(goal.kind || "");
  if (k === "week-time" || k === "month-time") return true;
  const period = goal.period === "week" || goal.period === "month" || k.startsWith("week") || k.startsWith("month");
  if (!period) return false;
  if (k === "time-distance" || k === "route-time" || k === "distance") return false;
  if (k.includes("count") || k.includes("distance")) return false;
  return k === "time" || k.endsWith("-time");
}

export function migrateGoals(goals) {
  const out = [];
  for (const g of goals || []) {
    if (!g) continue;
    if (!isPeriodTimeGoal(g)) {
      out.push(g);
      continue;
    }
    if (Number(g.distanceMeters) > 0 && Number(g.finishSec) > 0) {
      const { period, ...rest } = g;
      out.push({
        ...rest,
        kind: "time-distance",
        period: null,
        name: (g.name && !/weekly time|monthly time/i.test(g.name)) ? g.name : "",
      });
    }
  }
  return out;
}

/**
 * The builder "Follow walkable paths" toggle is gone; routing is always on.
 * Drop any leftover setting that turned it off.
 */
export function migrateSettings(settings) {
  const s = { ...(settings || {}) };
  delete s.followPaths;
  delete s.routeMode;
  return s;
}

/**
 * Whole-course straightLine came from the removed toggle.
 * Keep per-leg Use anyway overrides; clear the global flag and any
 * straight-only path so the course is re-routed on walkable paths.
 */
export function migrateCourses(courses) {
  return (courses || []).map((c) => {
    if (!c || !c.straightLine) return c;
    const next = { ...c, straightLine: false };
    const overrides = Array.isArray(c.straightOverrides) ? c.straightOverrides : [];
    if (!overrides.length) {
      next.path = null;
      next.legs = null;
      next.usedStraight = false;
    }
    return next;
  });
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      ...emptyState(),
      ...parsed,
      settings: migrateSettings({ ...DEFAULT_SETTINGS, ...(parsed.settings || {}) }),
      courses: migrateCourses(parsed.courses || []),
      activities: parsed.activities || [],
      plans: parsed.plans || [],
      planLibrary: parsed.planLibrary || [],
      planCredits: parsed.planCredits || 0,
      groupRuns: parsed.groupRuns || [],
      goals: migrateGoals(parsed.goals || []),
    };
  } catch {
    return emptyState();
  }
}

export function saveState(state) {
  const copy = {
    settings: state.settings,
    courses: state.courses,
    activities: state.activities,
    plans: state.plans,
    planLibrary: state.planLibrary || [],
    planCredits: state.planCredits || 0,
    groupRuns: state.groupRuns || [],
    goals: state.goals || [],
  };
  localStorage.setItem(KEY, JSON.stringify(copy));
}

export function resetState() {
  localStorage.removeItem(KEY);
  return emptyState();
}

export function newCourse(partial = {}) {
  return {
    id: uid("course"),
    name: partial.name || "New course",
    pins: partial.pins || [], // {lat, lon, role: 'start'|'via'|'end'}
    path: partial.path || null, // routed polyline, or null to use pins
    straightLine: !!partial.straightLine,
    usedStraight: !!partial.usedStraight,
    offMap: !!partial.offMap,
    legs: Array.isArray(partial.legs) ? partial.legs : null,
    straightOverrides: Array.isArray(partial.straightOverrides) ? partial.straightOverrides : [],
    legPbs: partial.legPbs || {}, // per-leg {seconds, activityId, date}, free
    sectorPbs: partial.sectorPbs || {},
    sectorHistory: partial.sectorHistory || [],
    goal: partial.goal || null, // free route goal (time, pace, or distance)
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function newActivity(partial = {}) {
  return {
    id: uid("act"),
    type: normalizeSport(partial.type),
    courseId: partial.courseId || null,
    courseName: partial.courseName || null,
    startedAt: partial.startedAt || new Date().toISOString(),
    endedAt: partial.endedAt || null,
    distanceMeters: partial.distanceMeters || 0,
    elapsedSec: partial.elapsedSec || 0,
    track: partial.track || [],
    source: partial.source || "phone", // phone | watch | health
    health: partial.health || null, // {steps, calories, provider} from the health app only
    healthId: partial.healthId || null, // watch import dedupe key
    healthSync: partial.healthSync || null, // {written, status, reason} for honesty in the summary
    climbGainM: partial.climbGainM || 0,
    climbLossM: partial.climbLossM || 0,
    distance3dMeters: partial.distance3dMeters || 0,
    /* heldpath-hook: import — file import metadata (no purchase data) */
    importHash: partial.importHash || null,
    importFormat: partial.importFormat || null,
    importName: partial.importName || null,
    mergedIds: Array.isArray(partial.mergedIds) ? partial.mergedIds : [],
    replacedSource: partial.replacedSource || null,
    avgHr: Number.isFinite(Number(partial.avgHr)) ? Number(partial.avgHr) : null,
    maxHr: Number.isFinite(Number(partial.maxHr)) ? Number(partial.maxHr) : null,
  };
}

export function newPlan(partial = {}) {
  return {
    id: partial.id || uid("plan"),
    date: partial.date,
    courseId: partial.courseId || null,
    courseName: partial.courseName || null,
    activityType: partial.activityType || "walk",
    sourcePlanId: partial.sourcePlanId || null,
    sourceSessionDate: partial.sourceSessionDate || null,
    targetLengthMeters: partial.targetLengthMeters || null,
    targetSec: partial.targetSec || null,
    routePins: partial.routePins || null,
    groupRunId: partial.groupRunId || null,
    startAt: partial.startAt || null,
  };
}


/** A free goal. Never requires a plan credit or purchase. */
export function newGoal(partial = {}) {
  return {
    id: partial.id || uid("goal"),
    name: partial.name || "",
    // distance | time | time-distance | route-time | pace | week-count | week-distance | month-count | month-distance
    kind: partial.kind || "distance",
    distanceMeters: partial.distanceMeters || null,
    finishSec: partial.finishSec || null,
    paceSecPerMile: partial.paceSecPerMile || null,
    targetCount: partial.targetCount || null,
    period: partial.period || null, // week | month | null
    courseId: partial.courseId || null,
    createdAt: partial.createdAt || new Date().toISOString(),
    paid: false,
  };
}
