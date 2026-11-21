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
import { analyzeLapGate } from "./lap_gate.js";
import { considerAutoPause, createAutoPauseState } from "./auto_pause.js";
import { applyTrackPoint } from "./gap_fill.js";
import { normalizeSport } from "./sport.js";
import { updateOffRoute } from "./off_route.js";
import { maybeDetectStart, progressFromStart } from "./start_detect.js";
import { nativeWatcherOptions, webWatchOptions, shouldAcceptFix } from "./low_power.js";
import { fuseElevation, heightFromPressure } from "./elevation.js";
import { createGpsFilter, applyGpsFix, applyCadenceHold } from "./gps_filter.js";
import { createHeadingTracker, updateHeadingTracker, startCompassWatch, requestCompassPermission } from "./heading.js";
import * as heldpathLocation from "./heldpath_location.js";

const BackgroundGeolocation = registerPlugin("BackgroundGeolocation");

let enhancedLocation = false;
let compassStop = null;
let pluginHandle = null;

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
let lastFusedEle = null;
let refPressure = null;
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
    type: normalizeSport(type),
    courseId: course ? course.id : null,
    courseName: course ? course.name : null,
    coursePins: course ? course.pins.slice() : null,
    coursePath: planned,
    lapPath: course
      ? ((course.path && course.path.length >= 2) ? course.path.slice() : (course.pins ? course.pins.slice() : null))
      : null,
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
    rawTrack: [],
    gpsFilter: createGpsFilter({ type: normalizeSport(type) }),
    headingTracker: createHeadingTracker(),
    livePoint: null,
    liveHeading: null,
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
  autoWatch = createAutoPauseState(Date.parse(session.startedAt), session.type);
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
  autoWatch = createAutoPauseState(Date.parse(session.startedAt) || at, session.type);
  if (session.paused) return session;
  return tickElapsed(at);
}

export function pushPoint(lat, lon, at = Date.now(), ele = null, extras = {}) {
  if (!session || session.paused) return session;
  const pt = { lat, lon, t: session.elapsedSec, at: new Date(at).toISOString() };
  if (ele != null && Number.isFinite(Number(ele))) pt.ele = Number(ele);
  if (Number.isFinite(Number(extras.heading)) && Number(extras.heading) >= 0) pt.heading = Number(extras.heading);
  if (Number.isFinite(Number(extras.speed)) && Number(extras.speed) >= 0) pt.speed = Number(extras.speed);
  const last = session.track[session.track.length - 1];
  if (last) {
    const d = haversineMeters(last, pt);
    if (d < 1.5 && session.track.length > 1) {
      // ignore jitter
      return session;
    }
    applyTrackPoint(session, last, pt, at);
    if (pt.ele != null) {
      const lastPt = session.track[session.track.length - 1];
      if (lastPt && lastPt.ele == null) lastPt.ele = pt.ele;
    }
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

function sessionLapGate(sess) {
  if (!sess || !sess.coursePins || sess.coursePins.length < 2) return null;
  if (!sess.track || sess.track.length < 2) return null;
  // Gate and sector pins come from the one-lap course, never from the
  // repeated target path (which is several laps long).
  return analyzeLapGate({ pins: sess.coursePins, path: sess.lapPath || null }, sess.track);
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
    const gate = sess.target.mode === MODE_CONTINUE ? null : sessionLapGate(sess);
    const prog = progressOnPlan(sess.target, traveled, { gate });
    const lapLabel = prog.label || (gate && gate.gated ? `Lap ${gate.currentLap}` : "");
    return stampGoal(sess, {
      onCourse: true,
      traveled: prog.traveled,
      remaining: prog.left,
      total: sess.target.targetMeters,
      lapLabel,
      hitTarget: prog.hitTarget,
      pastCourse: !!prog.pastCourse,
      lives: gate && gate.gated ? gate : null,
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
  const gate = sessionLapGate(sess);
  const result = {
    onCourse: true,
    traveled: adj.traveled,
    remaining: adj.remaining,
    total: adj.total,
    lapLabel: gate && gate.gated ? `Lap ${gate.currentLap}` : "",
    hitTarget: false,
    pastCourse: false,
    lives: gate && gate.gated ? gate : null,
  };
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
  const body = sess ? liveNotification(sess) : "Tracking your activity";
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
    type: session ? session.type : "walk",
    startedAt: session ? Date.parse(session.startedAt) : at,
    at,
    ...(fix || {}),
  };
}

/** Record a GPS fix for auto-pause, and append it to the track when not paused. */
function fuseFixElevation(extras = {}) {
  let baroM = extras.altitudeBaro;
  if (baroM == null && extras.pressureHpa != null) {
    if (!refPressure) {
      refPressure = extras.pressureHpa;
      if (extras.altitude != null) lastFusedEle = extras.altitude;
    }
    baroM = heightFromPressure(extras.pressureHpa, {
      refHpa: refPressure,
      refHeightM: lastFusedEle || extras.altitude || 0,
    });
  }
  const fused = fuseElevation({
    baroM,
    gpsM: extras.altitude,
    demM: extras.demM,
    prevM: lastFusedEle,
  });
  if (fused.meters != null) lastFusedEle = fused.meters;
  return fused.meters;
}

export function noteFix(lat, lon, at = Date.now(), extras = {}) {
  if (!session) return session;
  const raw = {
    lat,
    lon,
    at,
    accuracy: extras.accuracy,
    speed: extras.speed,
    heading: extras.heading,
    altitude: extras.altitude,
  };
  if (!session.rawTrack) session.rawTrack = [];
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))) {
    const rawPt = { lat, lon, t: session.elapsedSec, at: new Date(at).toISOString() };
    if (Number.isFinite(Number(extras.accuracy))) rawPt.accuracy = Number(extras.accuracy);
    if (Number.isFinite(Number(extras.altitude))) rawPt.ele = Number(extras.altitude);
    if (Number.isFinite(Number(extras.speed))) rawPt.speed = Number(extras.speed);
    if (Number.isFinite(Number(extras.heading)) && Number(extras.heading) >= 0) rawPt.heading = Number(extras.heading);
    session.rawTrack.push(rawPt);
  }
  if (!session.gpsFilter) session.gpsFilter = createGpsFilter({ type: session.type });
  if (!session.headingTracker) session.headingTracker = createHeadingTracker();
  updateHeadingTracker(session.headingTracker, {
    compass: extras.compassHeading != null
      ? { heading: extras.compassHeading, sensorAccuracy: extras.sensorAccuracy, accuracyDeg: extras.accuracyDeg }
      : null,
    gpsHeading: extras.heading,
    speedMps: extras.speed,
    accuracyM: extras.accuracy,
    stepping: extras.stepping != null ? extras.stepping : (Number(extras.cadenceHz) > 0 ? true : undefined),
    at,
  });
  let applied = applyGpsFix(session.gpsFilter, raw);
  let used = applied.ok && applied.filtered ? applied.filtered : null;
  if (!used && Number(extras.cadenceHz) > 0) {
    used = applyCadenceHold(session.gpsFilter, {
      cadenceHz: extras.cadenceHz,
      strideM: session.type === "run" ? 0.9 : 0.7,
      at,
      heading: session.headingTracker.heading,
    });
  }
  if (used && session.headingTracker.heading != null) used.heading = session.headingTracker.heading;
  session.liveHeading = session.headingTracker.heading;
  session.livePoint = used || session.livePoint;
  session.needsCompassCalibration = !!session.headingTracker.needsCalibration;
  if (!used) return session;
  const ele = fuseFixElevation(extras || {});
  const before = session.paused;
  const reason = session.pauseReason;
  const decision = considerAutoPause(autoWatch, autoInput(at, { lat: used.lat, lon: used.lon }));
  applyAutoDecision(decision, at);
  if (decision === "resume" && reason === "auto") {
    const from = autoWatch.movingSince || at;
    for (const s of autoWatch.samples) {
      if (s.at >= from) pushPoint(s.lat, s.lon, s.at);
    }
  } else if (!session.paused) {
    pushPoint(used.lat, used.lon, at, ele, { heading: used.heading, speed: used.speed });
  }
  return session;
}

export function noteCompass(reading, at = Date.now()) {
  if (!session) return session;
  if (!session.headingTracker) session.headingTracker = createHeadingTracker();
  updateHeadingTracker(session.headingTracker, { compass: reading, at });
  session.liveHeading = session.headingTracker.heading;
  session.needsCompassCalibration = !!session.headingTracker.needsCalibration;
  if (session.livePoint) session.livePoint = { ...session.livePoint, heading: session.liveHeading };
  return session;
}

export async function setEnhancedLocation(on) {
  enhancedLocation = !!on;
  const res = await heldpathLocation.setEnhanced(on);
  if (session && onUpdate) {
    try { await restartWatching(); } catch { /* keep flag even if restart fails */ }
  }
  return res;
}

export function isEnhancedLocation() {
  return !!enhancedLocation;
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
  lastFusedEle = null;
  refPressure = null;
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
      if (heldpathLocation.isHeldpathLocationAvailable()) {
        pluginHandle = await heldpathLocation.addWatcher(
          {
            enhanced: enhancedLocation,
            lowPower: lowPowerEnabled,
            background: true,
            backgroundTitle: payload.title,
            backgroundMessage: payload.body,
            intervalMs: lowPowerEnabled ? 10000 : 1000,
            distanceFilter: 0,
          },
          (fix) => {
            if (!fix || !session) return;
            const next = { lat: fix.lat, lon: fix.lon, at: fix.at };
            if (!shouldAcceptFix(lastAcceptedFix, next, { lowPower: lowPowerEnabled })) return;
            lastAcceptedFix = next;
            noteFix(next.lat, next.lon, next.at, {
              altitude: fix.altitude,
              altitudeAccuracy: fix.altitudeAccuracy,
              accuracy: fix.accuracy,
              speed: fix.speed,
              heading: fix.heading,
              compassHeading: fix.compassHeading,
              sensorAccuracy: fix.sensorAccuracy,
              cadenceHz: fix.cadenceHz,
            });
            tickElapsed();
            if (onUpdate) onUpdate(session, "fix");
            refreshNotification(session);
          },
          (error) => { if (onUpdate) onUpdate(session, "error", error); },
          (heading) => {
            if (!session || !heading) return;
            noteCompass({
              heading: heading.heading ?? heading.compassHeading,
              sensorAccuracy: heading.sensorAccuracy,
            });
            if (onUpdate) onUpdate(session, "heading");
          },
        );
        watcherId = pluginHandle && pluginHandle.id;
        lastNotificationBody = payload.body;
        lastNotificationAt = Date.now();
        return { ok: true, native: true, gpsOnly: !enhancedLocation };
      }
      lastNotificationBody = payload.body;
      lastNotificationAt = Date.now();
      return { ok: false, native: true, error: "HeldpathLocation plugin is not available." };
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
        noteFix(next.lat, next.lon, next.at, {
          altitude: pos.coords.altitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        });
        tickElapsed();
        if (onUpdate) onUpdate(session, "fix");
      },
      () => {},
      webWatchOptions(lowPowerEnabled)
    );
  }
  try {
    requestCompassPermission().catch(() => {});
    compassStop = startCompassWatch((reading) => {
      noteCompass(reading);
      if (onUpdate) onUpdate(session, "heading");
    });
  } catch { /* no browser compass */ }
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
  if (compassStop) {
    try { compassStop(); } catch { /* ignore */ }
    compassStop = null;
  }
  if (pluginHandle) {
    try { await heldpathLocation.removeWatcher(pluginHandle); } catch { /* ignore */ }
    pluginHandle = null;
  } else if (Capacitor.isNativePlatform() && watcherId) {
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
