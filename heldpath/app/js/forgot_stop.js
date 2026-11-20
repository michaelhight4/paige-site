/**
 * If you've been still for 10 minutes, ask whether you forgot to stop.
 * When you do stop, you can trim standing time from the end.
 */
import { haversineMeters, formatDuration } from "./util.js";

export const FORGOT_MS = 10 * 60 * 1000;
export const TRIM_AFTER_MS = 2 * 60 * 1000;
export const STILL_RADIUS_M = 15;

export function lastMovingAt(sess) {
  if (!sess) return null;
  if (sess.paused && sess.pauseReason === "auto" && sess.pauseStarted) return sess.pauseStarted;
  const track = sess.track || [];
  const last = track[track.length - 1];
  if (last && last.at) {
    const n = Date.parse(last.at);
    if (Number.isFinite(n)) return n;
  }
  return sess.startedAt ? Date.parse(sess.startedAt) : null;
}

export function stillForMs(sess, at = Date.now()) {
  const last = lastMovingAt(sess);
  if (last == null) return 0;
  return Math.max(0, at - last);
}

export function shouldPromptForgot(sess, at = Date.now()) {
  if (!sess || sess.forgotPrompted) return false;
  return stillForMs(sess, at) >= FORGOT_MS;
}

export function noteForgotDismissed(sess) {
  if (sess) sess.forgotPrompted = true;
  return sess;
}

export function noteForgotMoved(sess) {
  if (sess) sess.forgotPrompted = false;
  return sess;
}

/** Trailing stretch spent inside a small radius of the final point. */
export function trailingStill(sess, at = Date.now()) {
  const track = (sess && sess.track) || [];
  if (track.length < 2) return { idleMs: 0, idleSec: 0, cutIndex: track.length, pointCount: 0 };
  const end = track[track.length - 1];
  const endAt = end.at ? Date.parse(end.at) : at;
  let cut = track.length - 1;
  for (let i = track.length - 2; i >= 0; i--) {
    if (haversineMeters(track[i], end) > STILL_RADIUS_M) break;
    cut = i;
  }
  const startStill = track[cut];
  const startAt = startStill && startStill.at ? Date.parse(startStill.at) : endAt;
  const idleMs = Math.max(0, (Number.isFinite(endAt) ? endAt : at) - (Number.isFinite(startAt) ? startAt : at));
  return {
    idleMs,
    idleSec: Math.round(idleMs / 1000),
    cutIndex: cut,
    pointCount: track.length - cut,
    from: startStill,
    to: end,
  };
}

/** Standing time that was actually counted on the clock (auto-paused time is not). */
export function countedIdle(sess, at = Date.now()) {
  if (sess && sess.paused && sess.pauseReason === "auto" && sess.pauseStarted) {
    return trailingStill(sess, sess.pauseStarted);
  }
  return trailingStill(sess, at);
}

export function shouldOfferTrim(sess, at = Date.now()) {
  const trail = countedIdle(sess, at);
  return { ...trail, offer: trail.idleMs >= TRIM_AFTER_MS };
}

export function applyTrim(sess, trail, at = Date.now()) {
  if (!sess || !trail || trail.cutIndex == null) return sess;
  const counted = countedIdle(sess, at);
  const use = trail.idleMs >= 0 ? trail : counted;
  const kept = (sess.track || []).slice(0, Math.max(1, (use.cutIndex ?? trail.cutIndex) + 1));
  sess.track = kept;
  const idleSec = use.idleSec || 0;
  sess.elapsedSec = Math.max(0, (sess.elapsedSec || 0) - idleSec);
  if (sess.paused && sess.pauseReason === "auto") {
    sess.paused = false;
    sess.pauseStarted = null;
    sess.pauseReason = null;
  }
  sess.trimmedIdleSec = idleSec;
  return sess;
}

export function forgotCopy(idleMs) {
  const mins = Math.max(10, Math.round((idleMs || FORGOT_MS) / 60000));
  return {
    title: "Are you still going?",
    body: `You've been still for ${mins} minutes. If you forgot to stop, you can end this walk or run and trim the standing time.`,
    stay: "Still going",
    stop: "Stop",
  };
}

export function trimCopy(idleSec, unitsKind = "walk") {
  const kind = unitsKind === "run" ? "run" : "walk";
  const time = formatDuration(idleSec || 0);
  return {
    title: "Trim the end?",
    body: `You were still for about ${time} at the end. Remove that standing time from this ${kind}?`,
    trim: "Trim it",
    keep: "Keep it",
  };
}
