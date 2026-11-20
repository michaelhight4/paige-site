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
