/**
 * Off-route nudge: show the way back to the planned path, and never
 * reduce course progress when the runner rejoins.
 */
import { haversineMeters, projectOnPath, pointAlongPath, formatDistance } from "./util.js";

export const OFF_ROUTE_M = 40;
export const REJOIN_M = 25;
export const NUDGE_AFTER_MS = 6000;

export function sessionPath(sess) {
  if (sess && sess.coursePath && sess.coursePath.length >= 2) return sess.coursePath;
  if (sess && sess.coursePins && sess.coursePins.length >= 2) return sess.coursePins;
  return null;
}

/** Closest point on the remaining route (at or ahead of current progress). */
export function rejoinPoint(path, position, traveledFloor = 0) {
  if (!path || path.length < 2 || !position) return null;
  const floor = Math.max(0, traveledFloor - 8);
  const proj = projectOnPath(path, position);
  if (proj.traveled >= floor) {
    return { ...proj.point, traveled: proj.traveled, offsetMeters: proj.offsetMeters };
  }
  const ahead = pointAlongPath(path, Math.min(proj.total, Math.max(floor, 0)));
  if (!ahead) return null;
  return {
    lat: ahead.lat,
    lon: ahead.lon,
    traveled: ahead.traveled,
    offsetMeters: haversineMeters(position, ahead),
  };
}

export function offRouteCopy(meters, units = "mi") {
  const dist = meters < 1000
    ? `${Math.max(1, Math.round(meters))} m`
    : formatDistance(meters, units);
  return `You're off the route. The way back is ${dist}.`;
}

/**
 * Snapshot of whether the current fix is off the planned route.
 * Does not apply the dwell timer; updateOffRoute() does that.
 */
export function evaluateOffRoute(sess, position) {
  const path = sessionPath(sess);
  const none = { off: false, offsetMeters: 0, rejoin: null, wayBack: null, metersBack: 0 };
  if (!sess || !position || !path) return none;
  if (sess.goalComplete && !sess.goalKeptGoing) return none;
  if (sess.goalKeptGoing && sess.goalComplete) return none;
  const floor = sess.courseTraveledMeters || 0;
  const proj = projectOnPath(path, position);
  const rejoin = rejoinPoint(path, position, floor);
  const off = proj.offsetMeters > OFF_ROUTE_M;
  const metersBack = rejoin ? haversineMeters(position, rejoin) : proj.offsetMeters;
  const wayBack = rejoin ? [position, { lat: rejoin.lat, lon: rejoin.lon }] : null;
  return {
    off,
    offsetMeters: proj.offsetMeters,
    rejoin,
    wayBack: off ? wayBack : null,
    metersBack,
  };
}

export function updateOffRoute(sess, at = Date.now()) {
  if (!sess) return null;
  const last = sess.track && sess.track[sess.track.length - 1];
  const ev = evaluateOffRoute(sess, last);
  if (ev.off) {
    sess.offRouteSince = sess.offRouteSince || at;
    sess.offRoute = at - sess.offRouteSince >= NUDGE_AFTER_MS;
  } else {
    sess.offRouteSince = null;
    sess.offRoute = false;
  }
  sess.rejoinPoint = ev.off ? ev.rejoin : null;
  sess.wayBack = sess.offRoute ? ev.wayBack : null;
  sess.offRouteMeters = ev.offsetMeters;
  return ev;
}

/** Course progress must not go backwards when the runner rejoins earlier on the path. */
export function rejoinedProgress(previousTraveled, projectedTraveled) {
  return Math.max(previousTraveled || 0, projectedTraveled || 0);
}
