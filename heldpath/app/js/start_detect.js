/**
 * Detect a mid-route or reverse start so progress is from where
 * you actually began, not from the official start pin.
 */
import { haversineMeters, pathLengthMeters, projectOnPath } from "./util.js";

export const START_CONFIRM_M = 30;
export const MID_START_M = 40;

export function reversePath(path) {
  return (path || []).slice().reverse().map((p) => ({ ...p }));
}

export function movementMeters(fixes) {
  if (!fixes || fixes.length < 2) return 0;
  return pathLengthMeters(fixes);
}

/**
 * After a short confirmed movement, decide whether the course should
 * run in reverse and whether progress starts mid-route.
 * Returns null until there is enough movement to be sure.
 */
export function inferStart(path, fixes) {
  if (!path || path.length < 2 || !fixes || fixes.length < 2) return null;
  if (movementMeters(fixes) < START_CONFIRM_M) return null;
  const first = projectOnPath(path, fixes[0]);
  const last = projectOnPath(path, fixes[fixes.length - 1]);
  const along = last.traveled - first.traveled;
  const reversed = along <= -START_CONFIRM_M * 0.6;
  const oriented = reversed ? reversePath(path) : path;
  const originProj = projectOnPath(oriented, fixes[0]);
  const originMeters = originProj.traveled >= MID_START_M ? originProj.traveled : 0;
  return {
    reversed,
    path: oriented,
    originMeters,
    midStart: originMeters >= MID_START_M,
    firstOffset: first.offsetMeters,
  };
}

export function applyStartDetection(sess, inference) {
  if (!sess || !inference || sess.startDetected) return sess;
  sess.startDetected = true;
  sess.startReversed = !!inference.reversed;
  sess.pathOriginMeters = inference.originMeters || 0;
  sess.midStart = !!inference.midStart;
  if (inference.reversed && inference.path) {
    sess.coursePath = inference.path;
  }
  sess.courseTraveledMeters = 0;
  return sess;
}

export function maybeDetectStart(sess) {
  if (!sess || sess.startDetected) return sess;
  const path = (sess.coursePath && sess.coursePath.length >= 2)
    ? sess.coursePath
    : (sess.coursePins && sess.coursePins.length >= 2 ? sess.coursePins : null);
  const inf = inferStart(path, sess.track);
  if (inf) applyStartDetection(sess, inf);
  return sess;
}

/** Along-course progress from the detected start, never including the unrun prefix. */
export function progressFromStart(rawTraveled, total, originMeters) {
  const origin = Math.max(0, originMeters || 0);
  const span = Math.max(0, (total || 0) - origin);
  const traveled = Math.max(0, Math.min(span, (rawTraveled || 0) - origin));
  return { traveled, remaining: Math.max(0, span - traveled), total: span, origin };
}

export function startDetectCopy(sess) {
  if (!sess || !sess.startDetected) return "";
  if (sess.startReversed && sess.midStart) return "Started mid-route, running this course in reverse. Progress is from here.";
  if (sess.startReversed) return "This course is running in reverse.";
  if (sess.midStart) return "Started mid-route. Progress is from here to the end.";
  return "";
}
