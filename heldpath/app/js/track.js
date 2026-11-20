import { registerPlugin } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import { requestWakeLock, releaseWakeLock, isWeb } from "./platform.js";
import {
  haversineMeters,
  notificationText,
  remainingAlongPath,
  pathLengthMeters,
  activityMph,
  etaSeconds,
} from "./util.js";
import { progressOnPlan, MODE_CONTINUE } from "./target_distance.js";
import { considerAutoPause, createAutoPauseState } from "./auto_pause.js";
import { applyTrackPoint } from "./gap_fill.js";
import { updateOffRoute } from "./off_route.js";
import { maybeDetectStart, progressFromStart } from "./start_detect.js";
import { nativeWatcherOptions, webWatchOptions, shouldAcceptFix } from "./low_power.js";

const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

let watcherId = null;
let timer = null;
let onUpdate = null;
let session = null;
let actionHandler = null;
let notificationListener = null;
let lastNotificationBody = "";
let lastNotificationAt = 0;
let autoPauseEnabled = true;
let lowPowerEnabled = false;
let lastAcceptedFix = null;
let autoWatch = createAutoPauseState();

const NOTIFICATION_ID = "heldpath-tracking";
const NOTIFICATION_REFRESH_MS = 15000;

export function getSession() {
  return session;
}

export function makeSession({ type, course, units, target } = {}) {
  const planned = target && target.path && target.path.length >= 2
    ? target.path.slice()
    : (course && course.path && course.path.length >= 2 ? course.path.slice() : (course ? course.pins.slice() : null));
  session = {
    type: type || "walk",
    courseId: course ? course.id : null,
    courseName: course ? course.name : null,
    coursePins: course ? course.pins.slice() : null,
    coursePath: planned,
    target: target || null,
    targetAnnounced: false,
    goalComplete: false,
    goalAnnounced: false,
    goalCompleteSec: null,
    goalCompleteMeters: null,
    goalKeptGoing: false,
    units: units || "mi",
    startedAt: new Date().toISOString(),
    paused: false,
    pausedAcc: 0,
    pauseStarted: null,
    track: [],
    distanceMeters: 0,
    elapsedSec: 0,
    pauseReason: null,
    offRoute: false,
    offRouteSince: null,
    offRouteMeters: 0,
    rejoinPoint: null,
    wayBack: null,
    startDetected: false,
    startReversed: false,
    midStart: false,
    pathOriginMeters: 0,
    lowPower: !!lowPowerEnabled,
  };
  autoWatch = createAutoPauseState(Date.parse(session.startedAt));
  return session;
}

export function setAutoPauseEnabled(on) {
  autoPauseEnabled = !!on;
  if (!on && session && session.paused && session.pauseReason === "auto") {
    resumeSession();
  }
  return autoPauseEnabled;
}

export function setLowPowerEnabled(on) {
  const next = !!on;
  const changed = next !== lowPowerEnabled;
  lowPowerEnabled = next;
  if (session) session.lowPower = next;
  return changed;
}

export function isLowPowerEnabled() {
  return !!lowPowerEnabled;
}


export function isAutoPauseEnabled() {
  return autoPauseEnabled;
}

export function tickElapsed(at = Date.now()) {
  if (!session || session.paused) return session;
  const start = Date.parse(session.startedAt);
  const paused = session.pausedAcc + (session.pauseStarted ? at - session.pauseStarted : 0);
  session.elapsedSec = Math.max(0, Math.round((at - start - paused) / 1000));
  return session;
}

/** Rehydrate a session after a crash or force-quit. Dead time is not counted. */
export function restoreSession(saved, at = Date.now()) {
  if (!saved) {
    session = null;
    return null;
  }
  session = JSON.parse(JSON.stringify(saved));
  session.track = Array.isArray(session.track) ? session.track.slice() : [];
  session.coursePins = session.coursePins ? session.coursePins.slice() : null;
  session.coursePath = session.coursePath ? session.coursePath.slice() : null;
  const last = session.track[session.track.length - 1];
  const lastAt = last && last.at ? Date.parse(last.at) : Date.parse(session.startedAt);
  const base = Number.isFinite(lastAt) ? lastAt : at;
  const gap = Math.max(0, at - base);
  if (session.paused) {
    session.pauseStarted = at;
  } else if (gap > 2000) {
    session.pausedAcc = (session.pausedAcc || 0) + gap;
    session.pauseStarted = null;
  }
  autoWatch = createAutoPauseState(Date.parse(session.startedAt) || at);
  if (session.paused) return session;
  return tickElapsed(at);
}

export function pushPoint(lat, lon, at = Date.now()) {
  if (!session || session.paused) return session;
  const pt = { lat, lon, t: session.elapsedSec, at: new Date(at).toISOString() };
  const last = session.track[session.track.length - 1];
  if (last) {
    const d = haversineMeters(last, pt);
    if (d < 1.5 && session.track.length > 1) {
      // ignore jitter
      return session;
    }
    applyTrackPoint(session, last, pt, at);
    maybeDetectStart(session);
    updateOffRoute(session, at);
    return session;
  }
  session.track.push(pt);
  maybeDetectStart(session);
  updateOffRoute(session, at);
  return session;
}

function sessionCoursePath(sess) {
  if (sess && sess.coursePath && sess.coursePath.length >= 2) return sess.coursePath;
  if (sess && sess.coursePins && sess.coursePins.length >= 2) return sess.coursePins;
  return null;
}

function traveledForTarget(sess, path) {
  if (sess.target && sess.target.mode === MODE_CONTINUE) return sess.distanceMeters || 0;
  const last = sess.track && sess.track[sess.track.length - 1];
  if (!path || !last) return 0;
  return alongCourseProgress(sess, path, last).traveled;
}

function alongCourseProgress(sess, path, last) {
  maybeDetectStart(sess);
  if (!path || !last) {
    const total = path ? Math.max(0, pathLengthMeters(path) - (sess.pathOriginMeters || 0)) : 0;
    return { traveled: 0, remaining: total, total };
  }
  const r = remainingAlongPath(path, last);
  const adj = progressFromStart(r.traveled, r.total, sess.pathOriginMeters || 0);
  const traveled = Math.max(sess.courseTraveledMeters || 0, adj.traveled);
  sess.courseTraveledMeters = traveled;
  return { traveled, remaining: Math.max(0, adj.total - traveled), total: adj.total };
}

export function courseRemaining(sess) {
  if (!sess) return { onCourse: false, traveled: 0, remaining: 0, total: 0 };
  if (sess.target && sess.target.targetMeters > 0) {
    const path = sessionCoursePath(sess);
    const last = sess.track[sess.track.length - 1];
    let traveled;
    if (sess.target.mode === MODE_CONTINUE) {
      traveled = sess.distanceMeters || 0;
    } else if (!last) {
      traveled = 0;
    } else {
      traveled = alongCourseProgress(sess, path, last).traveled;
    }
    const prog = progressOnPlan(sess.target, traveled);
    return stampGoal(sess, {
      onCourse: true,
      traveled: prog.traveled,
      remaining: prog.left,
      total: sess.target.targetMeters,
      lapLabel: prog.label || "",
      hitTarget: prog.hitTarget,
      pastCourse: !!prog.pastCourse,
    });
  }
  const path = sessionCoursePath(sess);
  if (!path) {
    return { onCourse: false, traveled: sess.distanceMeters || 0, remaining: 0, total: 0 };
  }
  const last = sess.track[sess.track.length - 1];
  if (!last) {
    const total = progressFromStart(0, pathLengthMeters(path), sess.pathOriginMeters || 0).total;
    return { onCourse: true, traveled: 0, remaining: total, total };
  }
  // Mid-route and reverse starts only count the stretch actually run.
  // Progress is monotonic so a loop or a rejoin cannot rewind it.
  const adj = alongCourseProgress(sess, path, last);
  const result = { onCourse: true, traveled: adj.traveled, remaining: adj.remaining, total: adj.total, hitTarget: false, pastCourse: false };
  return stampGoal(sess, result);
}

function stampGoal(sess, result) {
  const complete = !!(result && result.onCourse && (result.hitTarget || result.remaining <= 0.5) && result.total > 0);
  if (complete && sess && !sess.goalComplete) {
    sess.goalComplete = true;
    sess.goalCompleteSec = sess.elapsedSec || 0;
    sess.goalCompleteMeters = sess.distanceMeters || 0;
  }
  const stamped = !!(sess && sess.goalComplete);
  const extra = stamped
    ? Math.max(0, (sess.distanceMeters || 0) - (sess.goalCompleteMeters || 0))
    : 0;
  return {
    ...result,
    complete: stamped,
    extraMeters: extra,
    completeSec: stamped ? sess.goalCompleteSec : null,
    gpsMeters: sess && sess.distanceMeters || 0,
  };
}

export function awaitingKeepGoing(sess) {
  return !!(sess && sess.goalComplete && !sess.goalKeptGoing);
}

export function keepGoingAfterGoal(sess = session) {
  if (!sess) return sess;
  sess.goalKeptGoing = true;
  return sess;
}

export function liveNotification(sess) {
  const rem = courseRemaining(sess);
  const kind = sess.target && sess.target.targetMeters > 0 ? "target" : "course";
  if (rem.complete && !sess.goalKeptGoing) {
    return notificationText({
      completePrompt: true,
      completeKind: kind,
      completeMeters: rem.total || sess.goalCompleteMeters || 0,
      completeSec: rem.completeSec != null ? rem.completeSec : sess.elapsedSec,
      units: sess.units,
    });
  }
  if (rem.complete) {
    return notificationText({
      complete: true,
      completeKind: kind,
      extraMeters: rem.extraMeters,
      units: sess.units,
    });
  }
  return notificationText({
    doneMeters: rem.onCourse ? rem.traveled : sess.distanceMeters,
    leftMeters: rem.remaining,
    onCourse: rem.onCourse,
    elapsedSec: sess.elapsedSec,
    units: sess.units,
    activityType: sess.type,
    lapLabel: rem.lapLabel || "",
  });
}

/**
 * The whole lock-screen notification in one shape: live body, Pause/Resume
 * and Stop actions, and the deep link that opens the live map.
 * The JS side stays useful even before the native shim lands.
 */
export function notificationPayload(sess = session) {
  const paused = !!(sess && sess.paused);
  const body = sess ? liveNotification(sess) : "Tracking your walk";
  const awaiting = awaitingKeepGoing(sess);
  const actions = awaiting
    ? [
        { id: "keep-going", label: "Keep going" },
        { id: "stop", label: "Stop" },
      ]
    : [
        { id: paused ? "resume" : "pause", label: paused ? "Resume" : "Pause" },
        { id: "stop", label: "Stop" },
      ];
  return {
    id: NOTIFICATION_ID,
    title: "Heldpath",
    body: paused && !awaiting ? `${body} · paused` : body,
    ongoing: true,
    onlyAlertOnce: true,
    actions,
    deepLink: "heldpath://tracking",
  };
}

/**
 * Register the tap/action handler emitted by the native foreground service
 * (see docs/NATIVE_TRACKING.md). The app uses it for Pause and Stop.
 */
export function onNotificationAction(handler) {
  actionHandler = handler;
}

function normalizeAction(raw) {
  const action = String(raw || "").toLowerCase().replace(/[\s_]+/g, "-");
  if (action === "keepgoing" || action === "keep-going") return "keep-going";
  return action;
}

function emitNotificationAction(raw) {
  const action = normalizeAction(raw);
  const known = action === "pause" || action === "resume" || action === "stop" || action === "keep-going";
  if (!known) return;
  if (action === "pause") pauseSession();
  else if (action === "resume") resumeSession();
  else if (action === "keep-going") keepGoingAfterGoal();
  if (actionHandler) actionHandler(action, session);
}

async function bindNotificationActions() {
  if (typeof BackgroundGeolocation.addListener !== "function") return;
  try {
    const handle = await BackgroundGeolocation.addListener("notificationAction", (event) => {
      emitNotificationAction(event && (event.actionId || event.action || event.id));
    });
    notificationListener = handle || null;
  } catch {
    // Plugin build without action events: documented native hook handles it.
  }
}

/**
 * Push a fresh body to the foreground-service notification.
 *
 * @capacitor-community/background-geolocation 1.3.1 only takes
 * backgroundMessage when the watcher starts. If the installed build exposes
 * updateNotification (the APK worker's hook in docs/NATIVE_TRACKING.md) this
 * updates in place; otherwise it reports method:"hook" and the native side
 * keeps showing the start message. Never throws.
 *
 * @returns {Promise<{ok:boolean,updated:boolean,method:string,payload:object,reason?:string,error?:string}>}
 */
export async function refreshNotification(sess = session, { force = false, minIntervalMs = NOTIFICATION_REFRESH_MS } = {}) {
  if (!sess) return { ok: false, updated: false, method: "none", payload: null, reason: "No active session." };
  const payload = notificationPayload(sess);
  const now = Date.now();
  if (!force && payload.body === lastNotificationBody) {
    return { ok: true, updated: false, method: "unchanged", payload };
  }
  if (!force && now - lastNotificationAt < minIntervalMs) {
    return { ok: true, updated: false, method: "throttled", payload };
  }
  lastNotificationBody = payload.body;
  lastNotificationAt = now;
  if (!Capacitor.isNativePlatform()) {
    return { ok: true, updated: false, method: "web", payload };
  }
  try {
    const update =
      BackgroundGeolocation.updateNotification ||
      BackgroundGeolocation.setBackgroundMessage;
    if (typeof update === "function") {
      await update.call(BackgroundGeolocation, {
        id: watcherId,
        notificationId: payload.id,
        title: payload.title,
        message: payload.body,
        body: payload.body,
        actions: payload.actions,
        deepLink: payload.deepLink,
        ongoing: payload.ongoing,
        onlyAlertOnce: payload.onlyAlertOnce,
      });
      return { ok: true, updated: true, method: "plugin", payload };
    }
    return {
      ok: true,
      updated: false,
      method: "hook",
      payload,
      reason: "Native build has no updateNotification method yet; the start message stays up.",
    };
  } catch (err) {
    return { ok: false, updated: false, method: "error", payload, error: String(err) };
  }
}

export function pauseSession(reason = "manual", at = Date.now()) {
  if (!session) return session;
  if (session.paused) {
    if (reason === "manual") session.pauseReason = "manual";
    return session;
  }
  session.paused = true;
  session.pauseReason = reason === "auto" ? "auto" : "manual";
  session.pauseStarted = at;
  refreshNotification(session, { force: true });
  return session;
}

export function resumeSession(at = Date.now()) {
  if (!session || !session.paused) return session;
  session.pausedAcc += at - (session.pauseStarted || at);
  session.pauseStarted = null;
  session.paused = false;
  session.pauseReason = null;
  refreshNotification(session, { force: true });
  return session;
}

function applyAutoDecision(decision, at) {
  if (decision === "pause") pauseSession("auto", at);
  else if (decision === "resume") resumeSession(at);
}

function autoInput(at, fix) {
  return {
    enabled: autoPauseEnabled,
    paused: !!(session && session.paused),
    pauseReason: session ? session.pauseReason : null,
    startedAt: session ? Date.parse(session.startedAt) : at,
    at,
    ...(fix || {}),
  };
}

/** Record a GPS fix for auto-pause, and append it to the track when not paused. */
export function noteFix(lat, lon, at = Date.now()) {
  if (!session) return session;
  const before = session.paused;
  const reason = session.pauseReason;
  const decision = considerAutoPause(autoWatch, autoInput(at, { lat, lon }));
  applyAutoDecision(decision, at);
  if (decision === "resume" && reason === "auto") {
    const from = autoWatch.movingSince || at;
    for (const s of autoWatch.samples) {
      if (s.at >= from) pushPoint(s.lat, s.lon, s.at);
    }
  } else if (!session.paused) {
    pushPoint(lat, lon, at);
  }
  return session;
}

/** Timer tick so auto-pause still fires when the GPS distance filter is quiet. */
export function noteTick(at = Date.now()) {
  if (!session) return session;
  const decision = considerAutoPause(autoWatch, autoInput(at));
  applyAutoDecision(decision, at);
  if (!session.paused) updateOffRoute(session, at);
  return session;
}

export function stopSession() {
  const done = session;
  session = null;
  lastAcceptedFix = null;
  lastNotificationBody = "";
  lastNotificationAt = 0;
  return done;
}

export async function startWatching(handler) {
  onUpdate = handler;
  if (isWeb()) requestWakeLock();
  lastAcceptedFix = null;
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!session) return;
    noteTick();
    tickElapsed();
    if (onUpdate) onUpdate(session, "tick");
    refreshNotification(session);
  }, 1000);

  if (Capacitor.isNativePlatform()) {
    try {
      const payload = notificationPayload(session);
      await bindNotificationActions();
      watcherId = await BackgroundGeolocation.addWatcher(
        nativeWatcherOptions({
          backgroundMessage: payload.body,
          backgroundTitle: payload.title,
          // The APK worker reads these in docs/NATIVE_TRACKING.md. Extra keys
          // are ignored by plugin versions that do not know them.
          notificationId: payload.id,
          notificationActions: payload.actions,
          notificationDeepLink: payload.deepLink,
          notificationOngoing: payload.ongoing,
        }, lowPowerEnabled),
        (location, error) => {
          if (error) {
            if (onUpdate) onUpdate(session, "error", error);
            return;
          }
          if (!location || !session) return;
          const at = location.time || Date.now();
          const next = { lat: location.latitude, lon: location.longitude, at };
          if (!shouldAcceptFix(lastAcceptedFix, next, { lowPower: lowPowerEnabled })) return;
          lastAcceptedFix = next;
          noteFix(next.lat, next.lon, next.at);
          tickElapsed();
          if (onUpdate) onUpdate(session, "fix");
          refreshNotification(session);
        }
      );
      lastNotificationBody = payload.body;
      lastNotificationAt = Date.now();
      return { ok: true, native: true };
    } catch (err) {
      return { ok: false, native: true, error: String(err) };
    }
  }

  // Browser: use the Geolocation API when permitted; demo mode feeds points itself.
  if (navigator.geolocation) {
    watcherId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!session) return;
        const next = { lat: pos.coords.latitude, lon: pos.coords.longitude, at: pos.timestamp };
        if (!shouldAcceptFix(lastAcceptedFix, next, { lowPower: lowPowerEnabled })) return;
        lastAcceptedFix = next;
        noteFix(next.lat, next.lon, next.at);
        tickElapsed();
        if (onUpdate) onUpdate(session, "fix");
      },
      () => {},
      webWatchOptions(lowPowerEnabled)
    );
  }
  return { ok: true, native: false };
}

export async function restartWatching() {
  const handler = onUpdate;
  if (!session || !handler) return { ok: false, reason: "no-session" };
  await stopWatching();
  return startWatching(handler);
}

export async function stopWatching() {
  await releaseWakeLock();
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (notificationListener && typeof notificationListener.remove === "function") {
    try { await notificationListener.remove(); } catch { /* ignore */ }
  }
  notificationListener = null;
  if (Capacitor.isNativePlatform() && watcherId) {
    try {
      await BackgroundGeolocation.removeWatcher({ id: watcherId });
    } catch { /* ignore */ }
  } else if (typeof watcherId === "number" && navigator.geolocation) {
    navigator.geolocation.clearWatch(watcherId);
  }
  watcherId = null;
  onUpdate = null;
  lastNotificationBody = "";
  lastNotificationAt = 0;
}

export async function openLocationSettings() {
  if (Capacitor.isNativePlatform()) {
    try { await BackgroundGeolocation.openSettings(); } catch { /* ignore */ }
  }
}

export { BackgroundGeolocation };
