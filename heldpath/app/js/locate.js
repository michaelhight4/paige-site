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
  return normalizeFix({
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    at: pos.timestamp || now,
  }, now);
}

/** Short note shown when the browser blocks location (especially Safari on iPhone). */
export const LOCATION_DENIED_NOTE =
  "Location is blocked for this site. On iPhone, open Settings → Privacy & Security → Location Services, then allow Safari and this website. You can also search or pan the map to find your area.";

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
export async function requestPosition({ timeout = 20000, enableHighAccuracy = true, maximumAge = 60000 } = {}) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
        const fix = coordsFromBrowser(pos);
        return fix ? resultOk(fix) : resultFail("unavailable");
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
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const fix = coordsFromBrowser(pos);
        resolve(fix ? resultOk(fix) : resultFail("unavailable"));
      },
      (err) => resolve(resultFail(reasonFromGeoError(err))),
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}
