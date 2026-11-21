/**
 * Health sync — opt-in, off by default, always free.
 *
 * Runtime API for Health Connect (Android) and Apple Health (iOS).
 * This app stays on Capacitor 7. The plugin shim that the APK worker can wire
 * is in plugins/heldpath-health; until it is present every call returns a
 * structured "unavailable" result. Nothing here pretends data is syncing.
 *
 * Rules:
 *  - Write each completed walk/run (distance, time, route when we have it,
 *    pace) to the platform health store.
 *  - Read steps and calories from the health app. Steps/calories are never
 *    computed by Heldpath; when the health app does not give a number the
 *    field stays null.
 *  - Import watch-tracked walks and runs so watch users can skip phone GPS.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";
import { dedupeDecision } from "./import_activities.js";
import { newActivity } from "./storage.js";

const NativeHealth = registerPlugin("HeldpathHealth");

/** Test-only hook so unit tests can feed mocked Health Connect sessions (including routes). */
let testBridge = null;
export function setHealthTestBridge(bridge) {
  testBridge = bridge || null;
}

async function nativeCall(method, payload) {
  if (testBridge && typeof testBridge[method] === "function") {
    return testBridge[method](payload);
  }
  return NativeHealth[method](payload);
}

export const HEALTH_SCOPES = [
  "writeWorkouts",
  "readSteps",
  "readCalories",
  "readWorkouts",
  "readRoutes",
  "readDistance",
  "readHeartRate",
];

export const HEALTH_STATUS = {
  stub: false,
  plugin: "HeldpathHealth",
  platforms: { android: "Health Connect", ios: "Apple Health" },
  reason:
    "Health Connect is used only when you turn it on. Walks, runs and rides stay on this phone.",
};

export function providerForPlatform(platform = Capacitor.getPlatform()) {
  if (platform === "android") return "Health Connect";
  if (platform === "ios") return "Apple Health";
  return null;
}

function unavailableReason(platform) {
  if (platform === "android") return "Health Connect is not available on this phone. Install or update Health Connect, then try again.";
  if (platform === "ios") return "Apple Health is not connected in this build yet. The HeldpathHealth plugin shim is in plugins/heldpath-health for the iOS build.";
  return "Health sync works in the Heldpath phone app on Android and iPhone, not in the browser preview.";
}

export function pluginPresent() {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("HeldpathHealth");
  } catch {
    return false;
  }
}

function unavailable(extra = {}) {
  const platform = Capacitor.getPlatform();
  return {
    ok: false,
    available: false,
    status: "unavailable",
    platform,
    provider: providerForPlatform(platform),
    reason: unavailableReason(platform),
    ...extra,
  };
}

function errorResult(err, extra = {}) {
  const platform = Capacitor.getPlatform();
  return {
    ok: false,
    available: false,
    status: "error",
    platform,
    provider: providerForPlatform(platform),
    reason: `Health app request failed: ${String(err && err.message ? err.message : err)}`,
    ...extra,
  };
}

/**
 * @returns {Promise<{ok:boolean,available:boolean,status:string,platform:string,provider:string|null,scopes:string[],reason?:string}>}
 */
export async function isAvailable() {
  if (testBridge) {
    if (typeof testBridge.isAvailable === "function") return testBridge.isAvailable();
    return { ok: true, available: true, status: "ready", platform: "android", provider: "Health Connect", scopes: HEALTH_SCOPES };
  }
  if (!Capacitor.isNativePlatform()) return unavailable({ scopes: [] });
  if (!pluginPresent()) return unavailable({ scopes: [] });
  try {
    const res = await nativeCall("isAvailable");
    const available = !!(res && (res.available || res.ok));
    return {
      ok: available,
      available,
      status: available ? "ready" : "unavailable",
      platform: Capacitor.getPlatform(),
      provider: (res && res.provider) || providerForPlatform(),
      scopes: (res && res.scopes) || HEALTH_SCOPES,
      reason: available ? undefined : (res && res.reason) || HEALTH_STATUS.reason,
    };
  } catch (err) {
    return errorResult(err);
  }
}

/**
 * Ask the platform health app for workout write + steps/calories read access.
 * @returns {Promise<{ok:boolean,available:boolean,granted:boolean,status:string,scopes:string[],reason?:string}>}
 */
export async function requestAccess() {
  const avail = await isAvailable();
  if (!avail.available) {
    return { ...avail, granted: false, scopes: [] };
  }
  try {
    const res = await nativeCall("requestAccess", { scopes: HEALTH_SCOPES });
    const granted = !!(res && (res.granted || res.ok));
    return {
      ok: granted,
      available: true,
      granted,
      status: granted ? "granted" : "denied",
      platform: avail.platform,
      provider: avail.provider,
      scopes: (res && res.scopes) || HEALTH_SCOPES,
      reason: granted ? undefined : "Health access was not granted. You can turn it on later in the health app.",
    };
  } catch (err) {
    return { ...errorResult(err), granted: false, scopes: [] };
  }
}

function healthType(type) {
  if (type === "ride" || type === "bike" || type === "cycling") return "ride";
  return type === "run" ? "run" : "walk";
}

function healthSamples(activity) {
  const src = (activity && activity.samples) || {};
  const clean = (list) => (Array.isArray(list)
    ? list
        .filter((s) => s && Number.isFinite(Number(s.offsetSec)) && Number.isFinite(Number(s.value)))
        .map((s) => ({ offsetSec: Number(s.offsetSec), value: Number(s.value) }))
    : []);
  return {
    heartRate: clean(src.heartRate),
    cadence: clean(src.cadence),
    power: clean(src.power),
  };
}

/** Shape written to the health app. Pace is distance/time, never steps. */
export function workoutPayload(activity) {
  const track = (activity && activity.track) || [];
  const type = healthType(activity && activity.type);
  return {
    type,
    startedAt: activity && activity.startedAt,
    endedAt: (activity && activity.endedAt) || new Date().toISOString(),
    distanceMeters: Number(activity && activity.distanceMeters) || 0,
    elapsedSec: Number(activity && activity.elapsedSec) || 0,
    avgPaceSecPerKm:
      type !== "ride" && activity && activity.distanceMeters > 0 && activity.elapsedSec > 0
        ? Math.round(activity.elapsedSec / (activity.distanceMeters / 1000))
        : null,
    avgSpeedMps:
      type === "ride" && activity && activity.distanceMeters > 0 && activity.elapsedSec > 0
        ? activity.distanceMeters / activity.elapsedSec
        : null,
    ...healthSamples(activity),
    route: track
      .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon))
      .map((p) => ({
        lat: p.lat,
        lon: p.lon,
        offsetSec: Number.isFinite(p.t) ? p.t : null,
      })),
  };
}

/**
 * Write one completed walk/run to Health Connect or Apple Health.
 * @returns {Promise<{ok:boolean,written:boolean,status:string,reason?:string,activityId?:string}>}
 */
export async function writeWorkout(activity) {
  if (!activity || !(activity.distanceMeters > 0) || !(activity.elapsedSec > 0)) {
    return { ok: false, written: false, status: "invalid", reason: "A workout needs a distance and a time." };
  }
  const avail = await isAvailable();
  if (!avail.available) return { ...avail, written: false, activityId: activity.id || null };
  try {
    const res = await nativeCall("writeWorkout", { workout: workoutPayload(activity) });
    const written = !!(res && (res.written || res.ok));
    return {
      ok: written,
      written,
      status: written ? "written" : "error",
      platform: avail.platform,
      provider: avail.provider,
      activityId: (res && res.id) || activity.id || null,
      reason: written ? undefined : (res && res.reason) || "The health app did not accept this workout.",
    };
  } catch (err) {
    return { ...errorResult(err), written: false, activityId: activity.id || null };
  }
}

/**
 * Steps and calories from the health app for a time window.
 * Returns null for a value the health app did not supply. Never estimates.
 * @returns {Promise<{ok:boolean,steps:number|null,calories:number|null,status:string,provider?:string|null,entries?:Array,reason?:string}>}
 */
export async function readStepsAndCalories(from, to) {
  const avail = await isAvailable();
  if (!avail.available) return { ...avail, steps: null, calories: null, entries: [] };
  try {
    const res = await nativeCall("readStepsAndCalories", { from, to });
    return {
      ok: !!res,
      status: res ? "read" : "error",
      platform: avail.platform,
      provider: (res && res.provider) || avail.provider,
      steps: Number.isFinite(res && res.steps) ? res.steps : null,
      calories: Number.isFinite(res && res.calories) ? res.calories : null,
      entries: Array.isArray(res && res.entries) ? res.entries : [],
      reason: res ? undefined : "The health app returned no reading.",
    };
  } catch (err) {
    return { ...errorResult(err), steps: null, calories: null, entries: [] };
  }
}

function haversineMeters(a, b) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function trackDistanceMeters(track) {
  let meters = 0;
  for (let i = 1; i < track.length; i++) meters += haversineMeters(track[i - 1], track[i]);
  return meters;
}

export const KNOWN_HEALTH_ORIGINS = {
  "com.sec.android.app.shealth": "Samsung Health",
  "com.samsung.android.app.health": "Samsung Health",
  "com.garmin.android.apps.connectmobile": "Garmin",
  "com.fitbit.FitbitMobile": "Fitbit",
  "com.strava": "Strava",
  "com.google.android.apps.fitness": "Google Fit",
  "com.google.android.apps.healthdata": "Health Connect",
  "com.google.android.apps.wearable.health": "Wear OS",
  "com.nike.plusgps": "Nike Run Club",
  "com.underarmour.ua.record": "MapMyRun",
  "com.peloton.activity": "Peloton",
  "com.apple.Health": "Apple Health",
  "com.pagegames.heldpath": "Heldpath",
};

export function originLabel(origin, fallback) {
  if (fallback) return fallback;
  const key = String(origin || "");
  return KNOWN_HEALTH_ORIGINS[key] || (key ? key : "Unknown app");
}

export function normalizeImported(raw) {
  if (!raw || typeof raw !== "object") return null;
  const startedAt = raw.startedAt || raw.startTime || null;
  const endedAt = raw.endedAt || raw.endTime || null;
  let elapsedSec = Number(raw.elapsedSec);
  if (!Number.isFinite(elapsedSec) && startedAt && endedAt) {
    elapsedSec = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000);
  }
  const track = Array.isArray(raw.track)
    ? raw.track.filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
        .map((p) => ({ lat: Number(p.lat), lon: Number(p.lon), ele: p.ele, at: p.at, t: p.t }))
    : [];
  let distanceMeters = Number(raw.distanceMeters);
  if (!(distanceMeters > 0) && track.length >= 2) distanceMeters = trackDistanceMeters(track);
  const origin = raw.dataOrigin || raw.healthOrigin || null;
  const label = originLabel(origin, raw.originLabel || raw.healthOriginLabel);
  const row = {
    type: healthType(raw.type),
    startedAt: startedAt || (elapsedSec > 0 ? new Date(Date.now() - elapsedSec * 1000).toISOString() : null),
    endedAt: endedAt || new Date().toISOString(),
    distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : 0,
    elapsedSec: Number.isFinite(elapsedSec) ? elapsedSec : 0,
    track,
    source: "health",
    health: {
      steps: Number.isFinite(raw.steps) ? raw.steps : null,
      calories: Number.isFinite(raw.calories) ? raw.calories : null,
      provider: raw.provider || providerForPlatform(),
    },
    healthId: raw.id ? String(raw.id) : `${origin || "health"}:${startedAt || "session"}:${Math.round(distanceMeters || 0)}:${elapsedSec || 0}`,
    healthOrigin: origin,
    healthOriginLabel: label,
    courseId: null,
    courseName: raw.name || label || null,
    samples: healthSamples(raw),
    climbGainM: Number.isFinite(raw.climbGainM) ? raw.climbGainM : 0,
    avgHr: Number.isFinite(raw.avgHr) ? raw.avgHr : null,
    maxHr: Number.isFinite(raw.maxHr) ? raw.maxHr : null,
    routeConsentNeeded: !!raw.routeConsentNeeded,
  };
  if (!(row.elapsedSec > 0) && !(row.distanceMeters > 0) && track.length < 2 && !row.routeConsentNeeded) return null;
  return row;
}

export function groupSessionsByOrigin(sessions) {
  const groups = new Map();
  for (const raw of sessions || []) {
    const session = raw && raw.healthId ? raw : normalizeImported(raw);
    if (!session) continue;
    const key = session.healthOrigin || "unknown";
    if (!groups.has(key)) {
      groups.set(key, {
        origin: key,
        label: session.healthOriginLabel || originLabel(key),
        sessions: [],
        withRoute: 0,
      });
    }
    const g = groups.get(key);
    g.sessions.push(session);
    if ((session.track || []).length >= 2) g.withRoute += 1;
  }
  return [...groups.values()].sort((a, b) => b.sessions.length - a.sessions.length);
}

/**
 * Merge selected Health Connect sessions into the on-device activity list.
 * De-duplicates against existing walks (healthId, then a near match on time and distance).
 */
export function applyImportedSessions(existing, sessions, { origins = null } = {}) {
  const allowed = origins == null ? null : new Set(origins);
  const next = Array.isArray(existing) ? existing.slice() : [];
  const added = [];
  let skipped = 0;
  for (const raw of sessions || []) {
    const session = raw && raw.healthId ? raw : normalizeImported(raw);
    if (!session) { skipped += 1; continue; }
    if (allowed && !allowed.has(session.healthOrigin || "unknown")) { skipped += 1; continue; }
    if ((session.track || []).length < 2 && !(session.distanceMeters > 0)) { skipped += 1; continue; }
    const decision = dedupeDecision(session, next);
    if (decision.status === "duplicate") { skipped += 1; continue; }
    if (decision.status === "replace" && decision.match) {
      const idx = next.indexOf(decision.match);
      if (idx >= 0) {
        const merged = {
          ...decision.match,
          ...session,
          id: decision.match.id,
          mergedIds: [...(decision.match.mergedIds || []), session.healthId].filter(Boolean),
        };
        next[idx] = merged;
        added.push(merged);
        continue;
      }
    }
    const row = newActivity({ ...session, source: session.source || "health" });
    next.push(row);
    added.push(row);
  }
  return { activities: next, added, skipped };
}


export async function listExerciseSessions({ from, to } = {}) {
  const avail = await isAvailable();
  if (!avail.available) return { ...avail, sessions: [], groups: [] };
  try {
    const res = await nativeCall("listWorkouts", { from, to });
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res && res.workouts)
        ? res.workouts
        : [];
    const sessions = list.map(normalizeImported).filter(Boolean);
    return {
      ok: true,
      available: true,
      sessions,
      groups: groupSessionsByOrigin(sessions),
      status: sessions.length ? "listed" : "empty",
      platform: avail.platform,
      provider: (res && res.provider) || avail.provider,
      reason: sessions.length ? undefined : "No walks, runs or rides were found in Health Connect.",
    };
  } catch (err) {
    return { ...errorResult(err), sessions: [], groups: [] };
  }
}

export async function requestExerciseRoute(id) {
  try {
    const res = await nativeCall("requestExerciseRoute", { id });
    return res || { ok: false };
  } catch (err) {
    return { ok: false, reason: String(err && err.message ? err.message : err) };
  }
}

/**
 * Import walks/runs recorded on a watch (through the same health pipeline).
 * @returns {Promise<{ok:boolean,imported:Array,status:string,provider?:string|null,reason?:string,skipped?:number}>}
 */
export async function importWatchWorkouts(from, to) {
  const avail = await isAvailable();
  if (!avail.available) return { ...avail, imported: [], skipped: 0 };
  try {
    const res = await nativeCall("listWorkouts", { from, to });
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res && res.workouts)
        ? res.workouts
        : [];
    const imported = list.map(normalizeImported).filter(Boolean);
    return {
      ok: true,
      imported,
      status: imported.length ? "imported" : "empty",
      platform: avail.platform,
      provider: (res && res.provider) || avail.provider,
      skipped: list.length - imported.length,
      reason: imported.length ? undefined : "The health app has no watch workouts in that time range.",
    };
  } catch (err) {
    return { ...errorResult(err), imported: [], skipped: 0 };
  }
}
