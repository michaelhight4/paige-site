/**
 * Low-power tracking: a looser GPS fix so the phone lasts longer.
 * Off by default. Normal tracking requests a GPS fix every second with no
 * distance filter, so the marker can move with the user instead of in jumps.
 */
import { haversineMeters } from "./util.js";

export const NORMAL_DISTANCE_FILTER_M = 0;
export const LOW_DISTANCE_FILTER_M = 30;
export const LOW_INTERVAL_MS = 10000;
export const LOW_MIN_FIX_MS = 8000;
export const LOW_MIN_FIX_M = 20;
export const LOW_MAX_AGE_MS = 20000;

export const LOW_POWER_COPY = "Uses a looser GPS fix so the phone lasts longer. The path may be a little less detailed. High-accuracy tracking stays on unless you turn this on.";
export const LOW_POWER_HUD = "Low-power tracking is on. The path may be less detailed.";

export function watchOptions(lowPower = false) {
  if (lowPower) {
    return {
      lowPower: true,
      enableHighAccuracy: false,
      maximumAge: LOW_MAX_AGE_MS,
      timeout: 20000,
      stale: true,
      distanceFilter: LOW_DISTANCE_FILTER_M,
      intervalMs: LOW_INTERVAL_MS,
      priority: "balanced",
    };
  }
  return {
    lowPower: false,
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
    stale: false,
    distanceFilter: NORMAL_DISTANCE_FILTER_M,
    intervalMs: 1000,
    priority: "high",
  };
}

/**
 * Native addWatcher options. Extra keys (interval, priority) are for a
 * plugin fork; stock community background-geolocation ignores unknown keys
 * and still honours distanceFilter and stale.
 */
export function nativeWatcherOptions(base, lowPower = false) {
  const opts = watchOptions(lowPower);
  return {
    ...base,
    requestPermissions: true,
    stale: opts.stale,
    distanceFilter: opts.distanceFilter,
    requestInterval: opts.intervalMs,
    interval: opts.intervalMs,
    priority: opts.priority,
    enableHighAccuracy: opts.enableHighAccuracy,
  };
}

export function webWatchOptions(lowPower = false) {
  const opts = watchOptions(lowPower);
  return {
    enableHighAccuracy: opts.enableHighAccuracy,
    maximumAge: opts.maximumAge,
    timeout: opts.timeout,
  };
}

/** Drop tight, frequent fixes when low-power tracking is on. */
export function shouldAcceptFix(prev, next, { lowPower = false } = {}) {
  if (!next || !Number.isFinite(next.lat) || !Number.isFinite(next.lon)) return false;
  if (!lowPower || !prev) return true;
  const dt = (next.at || 0) - (prev.at || 0);
  if (dt >= LOW_MIN_FIX_MS) return true;
  if (dt < 0) return true;
  const dist = haversineMeters(
    { lat: prev.lat, lon: prev.lon },
    { lat: next.lat, lon: next.lon }
  );
  return dist >= LOW_MIN_FIX_M;
}
