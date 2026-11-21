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

const NativeHealth = registerPlugin("HeldpathHealth");

export const HEALTH_SCOPES = [
  "writeWorkouts",
  "readSteps",
  "readCalories",
  "readWorkouts",
];

export const HEALTH_STATUS = {
  stub: true,
  plugin: "HeldpathHealth",
  platforms: { android: "Health Connect", ios: "Apple Health" },
  reason:
    "Health sync is not wired into this Capacitor 7 build yet. The HeldpathHealth plugin shim is ready in plugins/heldpath-health for the APK worker. Your setting is saved.",
};

export function providerForPlatform(platform = Capacitor.getPlatform()) {
  if (platform === "android") return "Health Connect";
  if (platform === "ios") return "Apple Health";
  return null;
}

function unavailableReason(platform) {
  if (platform === "android") return "Health Connect is not connected in this build yet. The HeldpathHealth plugin shim is in plugins/heldpath-health for the APK worker.";
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
  if (!Capacitor.isNativePlatform()) return unavailable({ scopes: [] });
  if (!pluginPresent()) return unavailable({ scopes: [] });
  try {
    const res = await NativeHealth.isAvailable();
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
    const res = await NativeHealth.requestAccess({ scopes: HEALTH_SCOPES });
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
    const res = await NativeHealth.writeWorkout({ workout: workoutPayload(activity) });
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
    const res = await NativeHealth.readStepsAndCalories({ from, to });
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

function normalizeImported(raw) {
  if (!raw || typeof raw !== "object") return null;
  const startedAt = raw.startedAt || raw.startTime || null;
  const endedAt = raw.endedAt || raw.endTime || null;
  let elapsedSec = Number(raw.elapsedSec);
  if (!Number.isFinite(elapsedSec) && startedAt && endedAt) {
    elapsedSec = Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000);
  }
  const distanceMeters = Number(raw.distanceMeters);
  if (!(distanceMeters > 0) || !(elapsedSec > 0)) return null;
  const track = Array.isArray(raw.track)
    ? raw.track.filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon))
    : [];
  return {
    type: healthType(raw.type),
    startedAt: startedAt || new Date(Date.now() - elapsedSec * 1000).toISOString(),
    endedAt: endedAt || new Date().toISOString(),
    distanceMeters,
    elapsedSec,
    track,
    source: "watch",
    health: {
      steps: Number.isFinite(raw.steps) ? raw.steps : null,
      calories: Number.isFinite(raw.calories) ? raw.calories : null,
      provider: raw.provider || providerForPlatform(),
    },
    healthId: raw.id ? String(raw.id) : `${startedAt || "watch"}:${distanceMeters}:${elapsedSec}`,
    courseId: null,
    courseName: raw.name || null,
    samples: healthSamples(raw),
    climbGainM: Number.isFinite(raw.climbGainM) ? raw.climbGainM : 0,
  };
}

/**
 * Import walks/runs recorded on a watch (through the same health pipeline).
 * @returns {Promise<{ok:boolean,imported:Array,status:string,provider?:string|null,reason?:string,skipped?:number}>}
 */
export async function importWatchWorkouts(from, to) {
  const avail = await isAvailable();
  if (!avail.available) return { ...avail, imported: [], skipped: 0 };
  try {
    const res = await NativeHealth.listWorkouts({ from, to });
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
