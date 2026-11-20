import { registerPlugin } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import { requestWakeLock, releaseWakeLock, isWeb } from "./platform.js";
import {
  haversineMeters,
  notificationText,
  remainingAlongPath,
  activityMph,
  etaSeconds,
} from "./util.js";
import { progressOnPlan, MODE_CONTINUE } from "./target_distance.js";

const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

let watcherId = null;
let timer = null;
let onUpdate = null;
let session = null;
let actionHandler = null;
let notificationListener = null;
let lastNotificationBody = "";
let lastNotificationAt = 0;

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
    units: units || "mi",
    startedAt: new Date().toISOString(),
    paused: false,
    pausedAcc: 0,
    pauseStarted: null,
    track: [],
    distanceMeters: 0,
    elapsedSec: 0,
  };
  return session;
}

export function tickElapsed() {
  if (!session || session.paused) return session;
  const start = Date.parse(session.startedAt);
  const now = Date.now();
  const paused = session.pausedAcc + (session.pauseStarted ? now - session.pauseStarted : 0);
  session.elapsedSec = Math.max(0, Math.round((now - start - paused) / 1000));
  return session;
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
    if (d < 80 || session.track.length === 1) session.distanceMeters += d;
    else session.distanceMeters += d; // still count a larger GPS jump once
  }
  session.track.push(pt);
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
  return remainingAlongPath(path, last).traveled;
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
      const r = remainingAlongPath(path, last);
      traveled = Math.max(sess.courseTraveledMeters || 0, r.traveled);
      sess.courseTraveledMeters = traveled;
    }
    const prog = progressOnPlan(sess.target, traveled);
    return {
      onCourse: true,
      traveled: prog.traveled,
      remaining: prog.left,
      total: sess.target.targetMeters,
      lapLabel: prog.label || "",
      hitTarget: prog.hitTarget,
      pastCourse: !!prog.pastCourse,
    };
  }
  const path = sessionCoursePath(sess);
  if (!path) {
    return { onCourse: false, traveled: sess.distanceMeters || 0, remaining: 0, total: 0 };
  }
  const last = sess.track[sess.track.length - 1];
  if (!last) {
    const total = remainingAlongPath(path, path[0]).total;
    return { onCourse: true, traveled: 0, remaining: total, total };
  }
  const r = remainingAlongPath(path, last);
  // Keep course progress monotonic: a looped course projects onto its own
  // start, and GPS jitter must not rewind distance done or the notification.
  const traveled = Math.max(sess.courseTraveledMeters || 0, r.traveled);
  sess.courseTraveledMeters = traveled;
  return { onCourse: true, traveled, remaining: Math.max(0, r.total - traveled), total: r.total };
}

export function liveNotification(sess) {
  const rem = courseRemaining(sess);
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
  return {
    id: NOTIFICATION_ID,
    title: "Heldpath",
    body: paused ? `${body} · paused` : body,
    ongoing: true,
    onlyAlertOnce: true,
    actions: [
      { id: paused ? "resume" : "pause", label: paused ? "Resume" : "Pause" },
      { id: "stop", label: "Stop" },
    ],
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

function emitNotificationAction(raw) {
  const action = String(raw || "").toLowerCase();
  const known = action === "pause" || action === "resume" || action === "stop";
  if (!known) return;
  if (action === "pause") pauseSession();
  else if (action === "resume") resumeSession();
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

export function pauseSession() {
  if (!session || session.paused) return session;
  session.paused = true;
  session.pauseStarted = Date.now();
  refreshNotification(session, { force: true });
  return session;
}

export function resumeSession() {
  if (!session || !session.paused) return session;
  session.pausedAcc += Date.now() - (session.pauseStarted || Date.now());
  session.pauseStarted = null;
  session.paused = false;
  refreshNotification(session, { force: true });
  return session;
}

export function stopSession() {
  const done = session;
  session = null;
  lastNotificationBody = "";
  lastNotificationAt = 0;
  return done;
}

export async function startWatching(handler) {
  onUpdate = handler;
  if (isWeb()) requestWakeLock();
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    if (!session) return;
    tickElapsed();
    if (onUpdate) onUpdate(session, "tick");
    refreshNotification(session);
  }, 1000);

  if (Capacitor.isNativePlatform()) {
    try {
      const payload = notificationPayload(session);
      await bindNotificationActions();
      watcherId = await BackgroundGeolocation.addWatcher(
        {
          backgroundMessage: payload.body,
          backgroundTitle: payload.title,
          // The APK worker reads these in docs/NATIVE_TRACKING.md. Extra keys
          // are ignored by plugin versions that do not know them.
          notificationId: payload.id,
          notificationActions: payload.actions,
          notificationDeepLink: payload.deepLink,
          notificationOngoing: payload.ongoing,
          requestPermissions: true,
          stale: false,
          distanceFilter: 5,
        },
        (location, error) => {
          if (error) {
            if (onUpdate) onUpdate(session, "error", error);
            return;
          }
          if (!location || !session) return;
          pushPoint(location.latitude, location.longitude, location.time || Date.now());
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
        pushPoint(pos.coords.latitude, pos.coords.longitude, pos.timestamp);
        tickElapsed();
        if (onUpdate) onUpdate(session, "fix");
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );
  }
  return { ok: true, native: false };
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
