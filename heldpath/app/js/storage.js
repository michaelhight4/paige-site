import { uid } from "./util.js";

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

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    return {
      ...emptyState(),
      ...parsed,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      courses: parsed.courses || [],
      activities: parsed.activities || [],
      plans: parsed.plans || [],
      planLibrary: parsed.planLibrary || [],
      planCredits: parsed.planCredits || 0,
      groupRuns: parsed.groupRuns || [],
      goals: parsed.goals || [],
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
    type: partial.type || "walk",
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
    // distance | time | pace | week-count | week-distance | week-time | month-count | month-distance | month-time
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
