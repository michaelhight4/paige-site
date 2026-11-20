/**
 * Autosave the live walk or run every few seconds so a crash or force-quit
 * can offer Resume or Save what you have on the next open.
 */
import { formatDistance, formatDuration } from "./util.js";

export const LIVE_KEY = "heldpath.live-session.v1";
export const SAVE_EVERY_MS = 5000;
export const MIN_RESUME_METERS = 20;
export const MIN_RESUME_SEC = 20;

const SESSION_FIELDS = [
  "type", "units", "startedAt",
  "courseId", "courseName", "coursePins", "coursePath",
  "target", "targetAnnounced",
  "goalComplete", "goalAnnounced", "goalCompleteSec", "goalCompleteMeters", "goalKeptGoing",
  "paused", "pausedAcc", "pauseStarted", "pauseReason",
  "track", "distanceMeters", "elapsedSec",
  "courseTraveledMeters",
  "offRoute", "offRouteSince", "offRouteMeters", "rejoinPoint", "wayBack",
  "startDetected", "startReversed", "midStart", "pathOriginMeters",
];

let lastSaveAt = 0;

export function snapshotSession(sess, extra = {}) {
  if (!sess) return null;
  const session = {};
  for (const key of SESSION_FIELDS) {
    if (sess[key] === undefined) continue;
    session[key] = sess[key];
  }
  return {
    savedAt: extra.savedAt || new Date().toISOString(),
    activePlanId: extra.activePlanId || null,
    session: JSON.parse(JSON.stringify(session)),
  };
}

export function isResumable(snap) {
  const s = snap && snap.session;
  if (!s) return false;
  const meters = s.distanceMeters || 0;
  const sec = s.elapsedSec || 0;
  const pts = (s.track && s.track.length) || 0;
  return meters >= MIN_RESUME_METERS || sec >= MIN_RESUME_SEC || pts >= 3;
}

export function saveLiveSession(sess, extra = {}, store) {
  const snap = snapshotSession(sess, extra);
  if (!snap) return null;
  writeStore(store).setItem(LIVE_KEY, JSON.stringify(snap));
  lastSaveAt = extra.at || Date.now();
  return snap;
}

export function maybeSaveLiveSession(sess, extra = {}, store, at = Date.now()) {
  if (!sess) return null;
  const force = !!extra.force;
  if (!force && lastSaveAt && at - lastSaveAt < SAVE_EVERY_MS) return null;
  return saveLiveSession(sess, { ...extra, at }, store);
}

export function loadLiveSession(store) {
  try {
    const raw = writeStore(store).getItem(LIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.session) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLiveSession(store) {
  writeStore(store).removeItem(LIVE_KEY);
  lastSaveAt = 0;
}

export function resetAutosaveClock() {
  lastSaveAt = 0;
}

export function resumePromptCopy(snap, units = "mi") {
  const s = snap && snap.session;
  const kind = s && s.type === "run" ? "run" : "walk";
  const title = `Resume your ${kind}?`;
  const body = `Heldpath closed before this ${kind} was saved. You can pick up where you left off, or save what you have.`;
  const stats = s
    ? `${formatDistance(s.distanceMeters || 0, units)} · ${formatDuration(s.elapsedSec || 0)}`
    : "";
  return { title, body, stats, kind };
}

function writeStore(store) {
  if (store) return store;
  if (typeof localStorage !== "undefined") return localStorage;
  throw new Error("no storage");
}
