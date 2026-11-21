/**
 * On-device heading for the user marker and heading-up map follow.
 *
 * When standing still (speed under about 0.8 m/s, or the step detector
 * idle), GPS bearing is ignored completely and only the rotation-vector
 * compass is used. A circular EMA, deadband, and turn-rate limit keep
 * the arrow and heading-up map from twitching. GPS bearing is blended
 * in only above walking speed, with good accuracy and hysteresis so the
 * source does not flip. Nothing is sent off the phone.
 */
export const COMPASS_UNTIL_MPS = 0.8;
export const GPS_FROM_MPS = 2.5;
/** Speed at which we first start blending GPS bearing (hysteresis). */
export const GPS_ENTER_MPS = 1.5;
export const SMOOTH_TAU_SEC = 0.45;
export const STATIONARY_TAU_SEC = 0.7;
export const DEADBAND_DEG = 6;
export const MAX_TURN_DEG_PER_SEC = 55;
export const MAX_TURN_MOVING_DEG_PER_SEC = 180;
export const REDRAW_MIN_DEG = 1.5;
export const REDRAW_MIN_MS = 80;
export const GOOD_GPS_ACCURACY_M = 25;
export const CALIBRATE_ACCURACY_DEG = 25;
export const CALIBRATE_COPY = "Move your phone in a figure-eight to improve the compass. This stays on your phone.";

export function wrapDeg(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n)) return 0;
  return ((n % 360) + 360) % 360;
}

/** True when a heading sample is present. Number(null) is 0, so null must be rejected first. */
export function isHeading(value) {
  return value != null && value !== "" && Number.isFinite(Number(value));
}

/** Signed shortest turn from `from` to `to`, in (-180, 180]. */
export function shortestDelta(from, to) {
  let d = wrapDeg(to) - wrapDeg(from);
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

export function lerpHeading(from, to, t) {
  const a = Math.max(0, Math.min(1, Number(t) || 0));
  return wrapDeg(Number(from) + shortestDelta(from, to) * a);
}

/**
 * Degrees clockwise that the screen has been rotated from the device's
 * natural portrait. Portrait is 0, landscape-left is typically 90.
 */
export function screenOrientationOffset(env = typeof globalThis !== "undefined" ? globalThis : {}) {
  const screenObj = env.screen || (env.window && env.window.screen);
  const o = screenObj && screenObj.orientation;
  if (o && Number.isFinite(Number(o.angle))) return wrapDeg(Number(o.angle));
  const raw = env.orientation != null
    ? env.orientation
    : (env.window && env.window.orientation);
  if (Number.isFinite(Number(raw))) return wrapDeg(Number(raw));
  return 0;
}

/**
 * Tilt-compensated compass heading of the top of the device, in degrees
 * clockwise from north, before any screen-orientation offset. Based on the
 * W3C device-orientation worked example so the reading stays usable when
 * the phone is not lying flat.
 */
export function tiltCompensatedHeading(alpha, beta, gamma) {
  if (![alpha, beta, gamma].every((v) => Number.isFinite(Number(v)))) return null;
  const deg = Math.PI / 180;
  const _x = Number(beta) * deg;
  const _y = Number(gamma) * deg;
  const _z = Number(alpha) * deg;
  const cX = Math.cos(_x);
  const cY = Math.cos(_y);
  const cZ = Math.cos(_z);
  const sX = Math.sin(_x);
  const sY = Math.sin(_y);
  const sZ = Math.sin(_z);
  const vx = -cZ * sY - sZ * sX * cY;
  const vy = -sZ * sY + cZ * sX * cY;
  let heading = Math.atan2(vx, vy);
  if (heading < 0) heading += 2 * Math.PI;
  return wrapDeg(heading * (180 / Math.PI));
}

/**
 * World heading from a deviceorientation / deviceorientationabsolute event.
 * iOS `webkitCompassHeading` is already the heading of the top of the
 * screen, so the screen offset is not applied a second time.
 */
export function compassFromDeviceOrientation(event, { screenAngle = 0 } = {}) {
  if (!event) return null;
  if (Number.isFinite(Number(event.webkitCompassHeading))) {
    const accuracy = Number(event.webkitCompassAccuracy);
    return {
      heading: wrapDeg(Number(event.webkitCompassHeading)),
      accuracyDeg: Number.isFinite(accuracy) ? accuracy : null,
      source: "webkit",
      screenRelative: true,
    };
  }
  const tilt = tiltCompensatedHeading(event.alpha, event.beta, event.gamma);
  if (tilt == null) return null;
  return {
    heading: wrapDeg(tilt - (Number(screenAngle) || 0)),
    accuracyDeg: null,
    source: event.absolute === true || event.type === "deviceorientationabsolute" ? "absolute" : "relative",
    screenRelative: true,
  };
}

/** True when GPS bearing must be ignored: stopped, or the step detector is idle. */
export function isStationary(speedMps, stepping) {
  if (stepping === false) return true;
  return (Number(speedMps) || 0) < COMPASS_UNTIL_MPS;
}

/**
 * Hysteresis for the heading source. Stays on compass until clearly walking
 * with a usable GPS fix; stays on a GPS blend until speed drops back under
 * the stationary threshold or accuracy goes bad.
 */
export function headingSourceMode(speedMps, { previous = "compass", stepping, accuracyM } = {}) {
  if (isStationary(speedMps, stepping)) return "compass";
  const goodAcc = !Number.isFinite(Number(accuracyM)) || Number(accuracyM) <= GOOD_GPS_ACCURACY_M;
  if (!goodAcc) return "compass";
  const s = Number(speedMps) || 0;
  if (previous === "blend" || previous === "gps") {
    return s >= COMPASS_UNTIL_MPS ? "blend" : "compass";
  }
  return s >= GPS_ENTER_MPS ? "blend" : "compass";
}

/** 0 = all compass, 1 = all GPS bearing. */
export function gpsHeadingWeight(speedMps, { compassUntil = COMPASS_UNTIL_MPS, gpsFrom = GPS_FROM_MPS } = {}) {
  const s = Math.max(0, Number(speedMps) || 0);
  if (s <= compassUntil) return 0;
  if (s >= gpsFrom) return 1;
  return (s - compassUntil) / (gpsFrom - compassUntil);
}

/**
 * Circular EMA toward the blended target. When stationary (or the step
 * detector is idle), GPS bearing is ignored even if a compass sample has
 * not arrived yet — the previous heading is held.
 */
export function blendHeading({
  compassHeading,
  gpsHeading,
  speedMps,
  previous,
  dtSec,
  tau = SMOOTH_TAU_SEC,
  stepping,
  accuracyM,
  sourceMode,
} = {}) {
  const hasC = Number.isFinite(Number(compassHeading));
  const hasG = Number.isFinite(Number(gpsHeading)) && Number(gpsHeading) >= 0;
  const stationary = isStationary(speedMps, stepping);
  const mode = sourceMode || headingSourceMode(speedMps, { previous: "compass", stepping, accuracyM });
  const useGps = !stationary && mode === "blend" && hasG;
  let target = null;
  if (hasC && useGps) {
    target = lerpHeading(compassHeading, gpsHeading, gpsHeadingWeight(speedMps));
  } else if (hasC) {
    target = wrapDeg(compassHeading);
  } else if (useGps) {
    target = wrapDeg(gpsHeading);
  }
  if (target == null) return isHeading(previous) ? wrapDeg(previous) : null;
  if (!isHeading(previous)) return target;
  const dt = Math.max(0, Math.min(1, Number(dtSec) || 0.05));
  const usedTau = stationary ? Math.max(Number(tau) || SMOOTH_TAU_SEC, STATIONARY_TAU_SEC) : Math.max(0.04, Number(tau) || SMOOTH_TAU_SEC);
  const a = 1 - Math.exp(-dt / usedTau);
  return lerpHeading(previous, target, a);
}

/** Hold the displayed heading unless the change exceeds the deadband; cap turn rate. */
export function applyHeadingDeadband(previous, next, {
  deadband = DEADBAND_DEG,
  maxTurnDegPerSec = MAX_TURN_DEG_PER_SEC,
  dtSec = 0.05,
} = {}) {
  if (!isHeading(next)) return isHeading(previous) ? wrapDeg(previous) : null;
  const target = wrapDeg(next);
  if (!isHeading(previous)) return target;
  const from = wrapDeg(previous);
  const delta = shortestDelta(from, target);
  if (Math.abs(delta) < deadband) return from;
  const dt = Math.max(0, Number(dtSec) || 0);
  const cap = Math.max(0, Number(maxTurnDegPerSec) || 0) * dt;
  if (cap > 0 && Math.abs(delta) > cap) {
    return wrapDeg(from + Math.sign(delta) * cap);
  }
  return target;
}

export function shouldRedrawHeading(previous, next, lastDrawAt, at, {
  minDeg = REDRAW_MIN_DEG,
  minMs = REDRAW_MIN_MS,
} = {}) {
  if (!isHeading(next)) return false;
  if (!isHeading(previous)) return true;
  const dt = Number(at) - Number(lastDrawAt || 0);
  if (Number.isFinite(dt) && dt >= 0 && dt < minMs && Math.abs(shortestDelta(previous, next)) < minDeg * 2) {
    return false;
  }
  return Math.abs(shortestDelta(previous, next)) >= minDeg || (Number.isFinite(dt) && dt >= 400);
}

/**
 * True when the magnetometer looks poorly calibrated. iOS reports
 * `webkitCompassAccuracy` in degrees (−1 unknown). Android rotation-vector
 * accuracy is 0–3 (unreliable … high).
 */
export function calibrationNeeded({ accuracyDeg, sensorAccuracy } = {}) {
  if (Number.isFinite(Number(accuracyDeg))) {
    if (Number(accuracyDeg) < 0) return true;
    if (Number(accuracyDeg) > CALIBRATE_ACCURACY_DEG) return true;
  }
  if (Number.isFinite(Number(sensorAccuracy)) && Number(sensorAccuracy) <= 1) return true;
  return false;
}

/** CSS rotation for a screen-space marker on a possibly rotated map. */
export function headingToMarkerAngle(heading, mapBearing) {
  if (!Number.isFinite(Number(heading))) return null;
  return wrapDeg(Number(heading) - (Number(mapBearing) || 0));
}

export function createHeadingTracker() {
  return {
    heading: null,
    smoothed: null,
    compass: null,
    gps: null,
    speedMps: 0,
    stepping: null,
    accuracyM: null,
    at: 0,
    lastDrawAt: 0,
    needsCalibration: false,
    source: null,
    sourceMode: "compass",
    stationary: true,
    allowMapRotate: false,
    shouldRedraw: false,
  };
}

export function updateHeadingTracker(state, { compass, gpsHeading, speedMps, at, stepping, accuracyM } = {}) {
  const next = state || createHeadingTracker();
  const when = Number(at) || Date.now();
  const dt = next.at ? Math.max(0, Math.min(1, (when - next.at) / 1000)) : 0.05;
  if (compass && Number.isFinite(Number(compass.heading))) {
    next.compass = Number(compass.heading);
    next.needsCalibration = calibrationNeeded(compass);
  }
  if (Number.isFinite(Number(gpsHeading)) && Number(gpsHeading) >= 0) {
    next.gps = Number(gpsHeading);
  }
  if (speedMps != null) next.speedMps = Number(speedMps) || 0;
  if (stepping !== undefined) next.stepping = stepping;
  if (accuracyM !== undefined) next.accuracyM = Number.isFinite(Number(accuracyM)) ? Number(accuracyM) : null;
  next.stationary = isStationary(next.speedMps, next.stepping);
  next.sourceMode = headingSourceMode(next.speedMps, {
    previous: next.sourceMode || "compass",
    stepping: next.stepping,
    accuracyM: next.accuracyM,
  });
  next.source = next.sourceMode;
  const useGps = !next.stationary && next.sourceMode === "blend";
  next.smoothed = blendHeading({
    compassHeading: next.compass,
    gpsHeading: useGps ? next.gps : null,
    speedMps: next.speedMps,
    previous: next.smoothed != null ? next.smoothed : next.heading,
    dtSec: dt,
    tau: next.stationary ? STATIONARY_TAU_SEC : SMOOTH_TAU_SEC,
    stepping: next.stepping,
    accuracyM: next.accuracyM,
    sourceMode: next.sourceMode,
  });
  const maxTurn = next.stationary ? MAX_TURN_DEG_PER_SEC : MAX_TURN_MOVING_DEG_PER_SEC;
  const displayed = applyHeadingDeadband(next.heading, next.smoothed, {
    deadband: DEADBAND_DEG,
    maxTurnDegPerSec: maxTurn,
    dtSec: dt,
  });
  const redraw = shouldRedrawHeading(next.heading, displayed, next.lastDrawAt, when);
  const rotateDelta = Number.isFinite(Number(next.heading)) && Number.isFinite(Number(displayed))
    ? Math.abs(shortestDelta(next.heading, displayed))
    : (Number.isFinite(Number(displayed)) ? DEADBAND_DEG : 0);
  next.allowMapRotate = !!next.stationary ? rotateDelta >= DEADBAND_DEG : Number.isFinite(Number(displayed));
  next.shouldRedraw = redraw || (next.allowMapRotate && next.stationary);
  if (redraw) next.lastDrawAt = when;
  next.heading = displayed;
  next.at = when;
  return next;
}

/**
 * Start listening for on-device compass events in a browser or WebView.
 * Returns a stop function. `onReading` receives { heading, accuracyDeg, source }.
 */
export function startCompassWatch(onReading, env = typeof window !== "undefined" ? window : null) {
  if (!env || typeof env.addEventListener !== "function") return () => {};
  const handle = (event) => {
    const reading = compassFromDeviceOrientation(event, {
      screenAngle: screenOrientationOffset(env),
    });
    if (reading && onReading) onReading(reading, event);
  };
  const abs = "ondeviceorientationabsolute" in env;
  if (abs) env.addEventListener("deviceorientationabsolute", handle, true);
  env.addEventListener("deviceorientation", handle, true);
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    if (abs) env.removeEventListener("deviceorientationabsolute", handle, true);
    env.removeEventListener("deviceorientation", handle, true);
  };
}

export async function requestCompassPermission(env = typeof window !== "undefined" ? window : null) {
  const DOE = env && env.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === "function") {
    try {
      const res = await DOE.requestPermission();
      return { ok: res === "granted", status: res };
    } catch (err) {
      return { ok: false, status: "error", reason: String(err && err.message ? err.message : err) };
    }
  }
  return { ok: true, status: "not-required" };
}
