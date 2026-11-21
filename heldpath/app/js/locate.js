/**
 * Launch location: centre on the user, never on a hard-coded city.
 * A last-known fix is used while a fresh GPS read is in flight, or if
 * permission is denied. With no fix at all, the map shows the world view.
 */
export const WORLD_VIEW = { lat: 20, lon: 0, zoom: 2 };
export const STREET_ZOOM = 15;

export function isFiniteCoord(point) {
  return !!(point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)));
}

export function normalizeFix(point, now = Date.now()) {
  if (!isFiniteCoord(point)) return null;
  const fix = {
    lat: Number(point.lat),
    lon: Number(point.lon),
    at: point.at != null ? Number(point.at) : now,
  };
  if (Number.isFinite(Number(point.accuracy))) fix.accuracy = Number(point.accuracy);
  const heading = Number(point.heading);
  if (Number.isFinite(heading) && heading >= 0) fix.heading = heading;
  if (Number.isFinite(Number(point.speed)) && Number(point.speed) >= 0) fix.speed = Number(point.speed);
  return fix;
}

/**
 * Choose the camera for launch or for a mid-wait update.
 * A live fix wins, then last known, then the world. Florence is never a fallback.
 */
export function viewForLaunch({ lastKnown = null, fix = null } = {}) {
  const live = normalizeFix(fix);
  if (live) return { lat: live.lat, lon: live.lon, zoom: STREET_ZOOM, source: "fix" };
  const remembered = normalizeFix(lastKnown);
  if (remembered) {
    return { lat: remembered.lat, lon: remembered.lon, zoom: STREET_ZOOM, source: "lastKnown" };
  }
  return { ...WORLD_VIEW, source: "world" };
}

export function shouldOfferMapChoice(settings = {}) {
  if (settings.seenMapPrompt) return false;
  if (settings.mapDataMode === "offline" || settings.mapDataMode === "mobile") return false;
  return true;
}

export function defaultMapDataMode(settings = {}) {
  if (settings.mapDataMode === "offline" || settings.mapDataMode === "mobile") {
    return settings.mapDataMode;
  }
  if (settings.seenMapPrompt) return "mobile";
  return null;
}

function coordsFromBrowser(pos, now = Date.now()) {
  if (!pos || !pos.coords) return null;
  const raw = {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    at: pos.timestamp || now,
  };
  if (Number.isFinite(Number(pos.coords.heading))) raw.heading = Number(pos.coords.heading);
  if (Number.isFinite(Number(pos.coords.speed)) && Number(pos.coords.speed) >= 0) raw.speed = Number(pos.coords.speed);
  return normalizeFix(raw, now);
}

/** Short note shown when location is blocked or the fix fails. */
export const LOCATION_DENIED_NOTE =
  "Location is blocked for this site. You can search for a place or pan the map to find your area. On iPhone, open Settings → Privacy & Security → Location Services, then allow this browser and this website.";

export const LOCATION_TIMEOUT_NOTE =
  "Couldn't find you in time. Search for a place or pan the map to set your area.";

export const LOCATION_UNAVAILABLE_NOTE =
  "Couldn't find your location. Search for a place or pan the map to set your area.";

export const FINDING_YOU = "Finding you…";

export const LOCATION_EXPLAINER =
  "GPS is needed for Heldpath to work. No data is collected about your location beyond what the map needs for your run.";

export function noteForLocateReason(reason) {
  if (reason === "denied") return LOCATION_DENIED_NOTE;
  if (reason === "timeout") return LOCATION_TIMEOUT_NOTE;
  if (reason === "unavailable" || reason === "error") return LOCATION_UNAVAILABLE_NOTE;
  return "";
}

/** Show the in-app explainer only when the system has not already decided. */
export function shouldShowLocationExplainer(permission) {
  return permission !== "granted" && permission !== "denied";
}

export function normalizePermissionState(value) {
  const v = String(value || "").toLowerCase();
  if (v === "granted") return "granted";
  if (v === "denied") return "denied";
  return "prompt";
}

export function reasonFromGeoError(err) {
  const code = err && err.code;
  if (code === 1) return "denied";
  if (code === 2) return "unavailable";
  if (code === 3) return "timeout";
  const msg = String((err && err.message) || "").toLowerCase();
  if (/denied|permission|prompt/i.test(msg)) return "denied";
  if (/timeout/i.test(msg)) return "timeout";
  if (!err) return "unavailable";
  return "error";
}

function resultOk(fix) {
  return { ok: true, fix, reason: null };
}

function resultFail(reason) {
  return { ok: false, fix: null, reason: reason || "unavailable" };
}

/**
 * One-shot GPS read. Returns { ok, fix, reason }.
 * Call this directly from a tap when possible: iOS Safari often will not
 * show a permission prompt, or will time out, if the request is not tied
 * to a user gesture.
 */
/**
 * Read the current permission without prompting.
 * Uses Capacitor Geolocation.checkPermissions on the native app, or the
 * Permissions API on the web. Returns "granted", "denied", or "prompt".
 */
export async function queryLocationPermission() {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const st = await Geolocation.checkPermissions();
      const loc = st && (st.location || st.coarseLocation);
      return normalizePermissionState(loc);
    }
  } catch {
    /* fall through to the web API */
  }
  try {
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
      const st = await navigator.permissions.query({ name: "geolocation" });
      return normalizePermissionState(st && st.state);
    }
  } catch {
    /* Safari and some WebViews throw; treat as unknown / prompt */
  }
  return "prompt";
}

function watchBrowserPosition({ timeout, enableHighAccuracy, maximumAge }) {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.geolocation.watchPosition) {
      resolve(resultFail("unavailable"));
      return;
    }
    let settled = false;
    let timer = null;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      try { navigator.geolocation.clearWatch(id); } catch { /* ignore */ }
      resolve(res);
    };
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = coordsFromBrowser(pos);
        finish(fix ? resultOk(fix) : resultFail("unavailable"));
      },
      (err) => finish(resultFail(reasonFromGeoError(err))),
      { enableHighAccuracy, timeout, maximumAge: 0 }
    );
    timer = setTimeout(() => finish(resultFail("timeout")), timeout);
  });
}

async function watchNativePosition(Geolocation, { timeout, enableHighAccuracy }) {
  return new Promise((resolve) => {
    let settled = false;
    let handle = null;
    let timer = null;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      const id = handle && (handle.value ?? handle);
      if (id != null && Geolocation.clearWatch) {
        Promise.resolve(Geolocation.clearWatch({ id })).catch(() => {});
      }
      resolve(res);
    };
    timer = setTimeout(() => finish(resultFail("timeout")), timeout);
    Promise.resolve(
      Geolocation.watchPosition(
        { enableHighAccuracy, timeout },
        (pos, err) => {
          if (err) {
            finish(resultFail(reasonFromGeoError(err)));
            return;
          }
          const fix = coordsFromBrowser(pos);
          finish(fix ? resultOk(fix) : resultFail("unavailable"));
        }
      )
    ).then((h) => {
      handle = h;
      if (settled && Geolocation.clearWatch) {
        const id = h && (h.value ?? h);
        if (id != null) Promise.resolve(Geolocation.clearWatch({ id })).catch(() => {});
      }
    }).catch((err) => finish(resultFail(reasonFromGeoError(err))));
  });
}

/**
 * One-shot GPS read with a watchPosition fallback if getCurrentPosition
 * times out. Returns { ok, fix, reason }.
 * Call this from a user gesture when permission is still "prompt" so the
 * system dialog is tied to the tap. Do not call it on page load.
 */
export async function requestPosition({ timeout = 20000, enableHighAccuracy = true, maximumAge = 0 } = {}) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      try {
        const current = await Geolocation.checkPermissions();
        const loc = current && (current.location || current.coarseLocation);
        if (normalizePermissionState(loc) !== "granted") {
          const asked = await Geolocation.requestPermissions();
          const next = asked && (asked.location || asked.coarseLocation);
          if (normalizePermissionState(next) !== "granted") {
            return resultFail("denied");
          }
        }
        try {
          const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
          const fix = coordsFromBrowser(pos);
          if (fix) return resultOk(fix);
        } catch (err) {
          const reason = reasonFromGeoError(err);
          if (reason !== "timeout" && reason !== "unavailable" && reason !== "error") {
            return resultFail(reason);
          }
        }
        return await watchNativePosition(Geolocation, { timeout, enableHighAccuracy });
      } catch (err) {
        return resultFail(reasonFromGeoError(err));
      }
    }
  } catch {
    /* fall through to the browser API */
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return resultFail("unavailable");
  }
  const once = await new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix = coordsFromBrowser(pos);
        resolve(fix ? resultOk(fix) : resultFail("unavailable"));
      },
      (err) => resolve(resultFail(reasonFromGeoError(err))),
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
  if (once.ok || once.reason === "denied") return once;
  return watchBrowserPosition({ timeout, enableHighAccuracy, maximumAge: 0 });
}

let liveWatch = null;

export function stopLocationWatch() {
  const w = liveWatch;
  liveWatch = null;
  if (!w) return;
  try {
    if (w.kind === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(w.id);
    } else if (typeof w.clear === "function") {
      Promise.resolve(w.clear()).catch(() => {});
    }
  } catch { /* ignore */ }
}

/**
 * Continuous location updates for the builder (and other map screens).
 * Uses the ordinary Geolocation API, not the run-session background watcher.
 * Works offline once permission is granted, from the last device fix.
 */
export async function startLocationWatch({ onFix, onError, onHeading } = {}) {
  stopLocationWatch();
  const opts = { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 };
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      // GPS_PROVIDER only via the first-party plugin. Do not use Capacitor
      // Geolocation here: on Android it goes through Google Fused by default.
      const loc = await import("./heldpath_location.js");
      if (loc.isHeldpathLocationAvailable()) {
        const handle = await loc.addWatcher(
          { enhanced: !!(opts.enhanced), background: false, intervalMs: 1000, distanceFilter: 0 },
          (fix) => { if (fix && onFix) onFix(fix); },
          (err) => { if (onError) onError(reasonFromGeoError(err)); },
          onHeading || null,
        );
        liveWatch = {
          kind: "heldpath",
          id: handle && handle.id,
          clear: () => loc.removeWatcher(handle),
        };
        return { ok: true, native: true, gpsOnly: true };
      }
    }
  } catch {
    /* fall through to the web API */
  }
  if (typeof navigator !== "undefined" && navigator.geolocation && navigator.geolocation.watchPosition) {
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = coordsFromBrowser(pos);
        if (fix && onFix) onFix(fix);
      },
      (err) => { if (onError) onError(reasonFromGeoError(err)); },
      opts
    );
    liveWatch = { kind: "web", id };
    return { ok: true, native: false };
  }
  return { ok: false, reason: "unavailable" };
}

export function locationWatchActive() {
  return !!liveWatch;
}

