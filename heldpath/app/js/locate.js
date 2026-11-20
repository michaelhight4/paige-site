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

/** One-shot GPS read. Returns a fix or null. Safe to call from the PWA or native. */
export async function requestPosition({ timeout = 12000, enableHighAccuracy = true } = {}) {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
      return coordsFromBrowser(pos);
    }
  } catch {
    /* fall through to the browser API */
  }
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(coordsFromBrowser(pos)),
      () => resolve(null),
      { enableHighAccuracy, timeout, maximumAge: 30000 }
    );
  });
}
