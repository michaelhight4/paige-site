/**
 * JS face of the first-party HeldpathLocation plugin.
 *
 * Default path is Android LocationManager GPS_PROVIDER only, 1 s, no
 * distance filter. Google Fused / network location is used only when the
 * user has turned on Enhanced location (Google). Heading comes from the
 * on-device rotation vector. Nothing is sent to Paige Games.
 */
import { registerPlugin } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";

const Native = registerPlugin("HeldpathLocation");

export function isHeldpathLocationAvailable() {
  if (!Capacitor.isNativePlatform()) return false;
  return !!(Native && typeof Native.addWatcher === "function");
}

export function nativeFix(location) {
  if (!location) return null;
  const lat = Number(location.latitude ?? location.lat);
  const lon = Number(location.longitude ?? location.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const fix = {
    lat,
    lon,
    at: Number(location.time || location.at || Date.now()),
    provider: location.provider || "gps",
  };
  if (Number.isFinite(Number(location.accuracy))) fix.accuracy = Number(location.accuracy);
  if (Number.isFinite(Number(location.altitude))) fix.altitude = Number(location.altitude);
  if (Number.isFinite(Number(location.altitudeAccuracy))) fix.altitudeAccuracy = Number(location.altitudeAccuracy);
  if (Number.isFinite(Number(location.speed)) && Number(location.speed) >= 0) fix.speed = Number(location.speed);
  if (Number.isFinite(Number(location.bearing ?? location.heading)) && Number(location.bearing ?? location.heading) >= 0) {
    fix.heading = Number(location.bearing ?? location.heading);
  }
  if (Number.isFinite(Number(location.compassHeading))) fix.compassHeading = Number(location.compassHeading);
  if (Number.isFinite(Number(location.sensorAccuracy))) fix.sensorAccuracy = Number(location.sensorAccuracy);
  if (Number.isFinite(Number(location.cadenceHz))) fix.cadenceHz = Number(location.cadenceHz);
  return fix;
}

export function watcherOptions({
  enhanced = false,
  lowPower = false,
  background = true,
  backgroundTitle = "Heldpath",
  backgroundMessage = "Recording your activity",
  intervalMs = 1000,
  distanceFilter = 0,
} = {}) {
  return {
    enhanced: !!enhanced,
    lowPower: !!lowPower,
    background: background !== false,
    backgroundTitle,
    backgroundMessage,
    intervalMs: lowPower ? Math.max(intervalMs, 8000) : Math.max(250, intervalMs || 1000),
    distanceFilter: lowPower ? Math.max(distanceFilter, 20) : 0,
    requestPermissions: true,
  };
}

export async function addWatcher(opts, onLocation, onError, onHeading) {
  if (!isHeldpathLocationAvailable()) return { ok: false, reason: "unavailable" };
  const id = await Native.addWatcher(watcherOptions(opts), (location, error) => {
    if (error) {
      if (onError) onError(error);
      return;
    }
    const fix = nativeFix(location);
    if (fix && onLocation) onLocation(fix);
  });
  let headingHandle = null;
  if (onHeading && Native.addListener) {
    try {
      headingHandle = await Native.addListener("heading", (data) => {
        if (data && onHeading) onHeading(data);
      });
    } catch { /* older shim */ }
  }
  return { ok: true, id, headingHandle };
}

export async function removeWatcher(handle) {
  if (!handle) return;
  if (handle.headingHandle && typeof handle.headingHandle.remove === "function") {
    try { await handle.headingHandle.remove(); } catch { /* ignore */ }
  }
  if (!isHeldpathLocationAvailable()) return;
  try { await Native.removeWatcher({ id: handle.id }); } catch { /* ignore */ }
}

export async function setEnhanced(enabled) {
  if (!isHeldpathLocationAvailable() || typeof Native.setEnhanced !== "function") return { ok: false };
  try {
    await Native.setEnhanced({ enabled: !!enabled });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}

export async function requestBatteryExemption() {
  if (!isHeldpathLocationAvailable() || typeof Native.requestBatteryExemption !== "function") {
    return { ok: false, reason: "unavailable" };
  }
  try {
    return await Native.requestBatteryExemption();
  } catch (err) {
    return { ok: false, reason: String(err) };
  }
}

export async function getCurrent() {
  if (!isHeldpathLocationAvailable() || typeof Native.getCurrent !== "function") return null;
  try {
    const loc = await Native.getCurrent();
    return nativeFix(loc);
  } catch {
    return null;
  }
}

export { Native as HeldpathLocation };
