/**
 * When GPS drops out mid-run, fill the missing stretch along the planned
 * route instead of drawing a straight jump or adding teleport distance.
 */
import { haversineMeters, projectOnPath, pointsBetweenAlongPath, isRideType } from "./util.js";

export const GAP_MS = 15000;
export const ON_ROUTE_M = 50;
export const MIN_FILL_M = 25;
export const STEP_M = 30;
/** A fill cannot invent a sprint faster than a hard run (~18 mph). */
export const MAX_SPEED_MPS = 8;
/** Implied speed above this, with no route to follow, is treated as a teleport. */
export const TELEPORT_SPEED_MPS = 12;
/**
 * A ride on a fast descent is not a teleport. Far above normal road speed,
 * but still a hard cap so a bad fix cannot invent a motorway jump.
 */
export const RIDE_MAX_SPEED_MPS = 23; // ~51 mph
export const RIDE_TELEPORT_SPEED_MPS = 32; // ~72 mph

export function maxFillSpeedMps(type) {
  return isRideType(type) ? RIDE_MAX_SPEED_MPS : MAX_SPEED_MPS;
}

export function teleportSpeedMps(type) {
  return isRideType(type) ? RIDE_TELEPORT_SPEED_MPS : TELEPORT_SPEED_MPS;
}

export function lastFixTime(last) {
  if (!last) return null;
  if (last.at) {
    const n = Date.parse(last.at);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function timeGapMs(last, at) {
  const t0 = lastFixTime(last);
  return t0 == null ? 0 : Math.max(0, at - t0);
}

export function impliedSpeedMps(last, next, at) {
  const ms = timeGapMs(last, at);
  const d = haversineMeters(last, next);
  if (ms <= 0) return d > 0 ? Infinity : 0;
  return d / (ms / 1000);
}

/** A gap long enough, or a jump faster than a person can run, is a dropout. */
export function isDropout(last, next, at, type) {
  if (!last || !next) return false;
  const d = haversineMeters(last, next);
  const ms = timeGapMs(last, at);
  if (d < MIN_FILL_M) return false;
  if (ms >= GAP_MS) return true;
  if (ms >= 8000 && impliedSpeedMps(last, next, at) > maxFillSpeedMps(type) + 0.5) return true;
  return false;
}

export function isTeleport(last, next, at, type) {
  if (!last || !next) return false;
  const d = haversineMeters(last, next);
  const ms = timeGapMs(last, at);
  if (d < MIN_FILL_M) return false;
  if (impliedSpeedMps(last, next, at) > teleportSpeedMps(type)) return true;
  if (ms >= GAP_MS && d >= 200) return true;
  return false;
}

function interpolateIso(last, at, t) {
  const t0 = lastFixTime(last);
  const start = t0 == null ? at : t0;
  const ms = start + Math.max(0, Math.min(1, t)) * Math.max(0, at - start);
  return new Date(ms).toISOString();
}

/**
 * If both fixes sit on the planned path, return intermediate points along
 * it and the along-path distance. Otherwise null.
 */
export function fillAlongRoute(path, last, next, at, type) {
  if (!path || path.length < 2 || !last || !next) return null;
  const a = projectOnPath(path, last);
  const b = projectOnPath(path, next);
  if (a.offsetMeters > ON_ROUTE_M || b.offsetMeters > ON_ROUTE_M) return null;
  const forward = b.traveled - a.traveled;
  if (forward < MIN_FILL_M) return null;
  const ms = Math.max(timeGapMs(last, at), 1);
  if (forward / (ms / 1000) > maxFillSpeedMps(type)) return null;
  const raw = pointsBetweenAlongPath(path, a.traveled, b.traveled, STEP_M);
  const mids = raw.filter((p) => haversineMeters(p, last) >= 2);
  const points = mids.map((p, i) => {
    const t = forward === 0 ? 1 : (p.traveled - a.traveled) / forward;
    return {
      lat: p.lat,
      lon: p.lon,
      at: interpolateIso(last, at, t),
      filled: true,
    };
  });
  // End on the real fix, not only the projection.
  const lastMid = points[points.length - 1];
  if (!lastMid || haversineMeters(lastMid, next) >= 2) {
    points.push({ lat: next.lat, lon: next.lon, at: new Date(at).toISOString(), filled: false });
  } else {
    lastMid.lat = next.lat;
    lastMid.lon = next.lon;
    lastMid.at = new Date(at).toISOString();
    lastMid.filled = false;
  }
  const snap = haversineMeters({ lat: b.point.lat, lon: b.point.lon }, next);
  return { points, meters: forward + Math.min(snap, ON_ROUTE_M), filled: true };
}

/**
 * Apply a candidate GPS point to a session track.
 * Returns { session, filled } after mutating session.track / distanceMeters.
 */
export function applyTrackPoint(session, last, next, at) {
  if (!session) return { session, filled: false };
  const type = session.type || "walk";
  const dropout = isDropout(last, next, at, type);
  if (dropout) {
    const path = (session.coursePath && session.coursePath.length >= 2)
      ? session.coursePath
      : (session.coursePins && session.coursePins.length >= 2 ? session.coursePins : null);
    const fill = path ? fillAlongRoute(path, last, next, at, type) : null;
    if (fill) {
      for (const p of fill.points) {
        const elapsed = session.elapsedSec || 0;
        session.track.push({ lat: p.lat, lon: p.lon, t: elapsed, at: p.at, filled: !!p.filled });
      }
      session.distanceMeters += fill.meters;
      return { session, filled: true };
    }
    // No route to follow. Keep the new fix. Only drop distance if the
    // jump is too far or too fast to be a real run (or ride).
    session.track.push({ lat: next.lat, lon: next.lon, t: session.elapsedSec || 0, at: new Date(at).toISOString() });
    if (!isTeleport(last, next, at, type)) session.distanceMeters += haversineMeters(last, next);
    return { session, filled: false };
  }
  session.distanceMeters += haversineMeters(last, next);
  session.track.push({ lat: next.lat, lon: next.lon, t: session.elapsedSec || 0, at: new Date(at).toISOString() });
  return { session, filled: false };
}
