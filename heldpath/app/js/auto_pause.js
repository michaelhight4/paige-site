import { haversineMeters, isRideType } from "./util.js";

/** Below this net speed, the runner is treated as standing still. ~1.0 mph. */
export const STOP_SPEED_MPS = 0.45;
/** At or above this net speed, the runner is treated as moving. ~1.6 mph. */
export const MOVE_SPEED_MPS = 0.70;
/** How long the recent path must look still before an auto-pause. */
export const STOP_DWELL_MS = 5000;
/** How long they must be moving again before an auto-resume. */
export const MOVE_DWELL_MS = 2000;
/** Do not auto-pause in the first seconds of a session. */
export const START_GRACE_MS = 10000;

/**
 * Rides need a wider band than feet. A red light should still pause, but
 * slow rolling at walking speed is a real ride, not standing still.
 * Still ~1.0 mph, moving ~2.7 mph, with a longer stop dwell so a trackstand
 * at a light does not flicker the timer. Rolling at 3 mph stays a ride.
 */
export const RIDE_STOP_SPEED_MPS = 0.5;
export const RIDE_MOVE_SPEED_MPS = 1.2;
export const RIDE_STOP_DWELL_MS = 8000;
export const RIDE_MOVE_DWELL_MS = 3000;

/** Thresholds for a sport. Unknown types keep the walk/run band. */
export function autoPauseThresholds(type) {
  if (isRideType(type)) {
    return {
      stopSpeedMps: RIDE_STOP_SPEED_MPS,
      moveSpeedMps: RIDE_MOVE_SPEED_MPS,
      stopDwellMs: RIDE_STOP_DWELL_MS,
      moveDwellMs: RIDE_MOVE_DWELL_MS,
      startGraceMs: START_GRACE_MS,
    };
  }
  return {
    stopSpeedMps: STOP_SPEED_MPS,
    moveSpeedMps: MOVE_SPEED_MPS,
    stopDwellMs: STOP_DWELL_MS,
    moveDwellMs: MOVE_DWELL_MS,
    startGraceMs: START_GRACE_MS,
  };
}

const SAMPLE_KEEP_MS = Math.max(STOP_DWELL_MS, RIDE_STOP_DWELL_MS) + 2000;

export function createAutoPauseState(startedAt = 0, type = "walk") {
  return {
    startedAt: startedAt || 0,
    type,
    samples: [],
    lastMovingAt: null,
    movingSince: null,
    hasMoved: false,
  };
}

function windowStats(samples, fromAt) {
  const window = samples.filter((s) => s.at >= fromAt);
  if (window.length < 2) return { net: 0, path: 0, span: 0, speed: 0, straight: 0 };
  const first = window[0];
  const last = window[window.length - 1];
  const span = last.at - first.at;
  const net = haversineMeters(first, last);
  let path = 0;
  for (let i = 1; i < window.length; i += 1) {
    path += haversineMeters(window[i - 1], window[i]);
  }
  return {
    net,
    path,
    span,
    speed: span > 0 ? net / (span / 1000) : 0,
    straight: path > 0 ? net / path : 0,
  };
}

/**
 * Decide whether to auto-pause or auto-resume.
 * Feed a GPS fix (lat/lon) or a timer tick (time only).
 * Manual pauses are left alone. Auto-pause only starts after the runner
 * has actually moved, and never during the first few seconds.
 *
 * Net speed over the window is used so GPS jitter around one spot does not
 * look like walking. A real walk is nearly straight, so resume also requires
 * that net distance is most of the path length.
 *
 * @returns {null | "pause" | "resume"}
 */
export function considerAutoPause(state, input = {}) {
  if (!state || !input.enabled) return null;
  const at = input.at;
  if (!Number.isFinite(at)) return null;
  if (Number.isFinite(input.startedAt)) state.startedAt = input.startedAt;
  else if (!state.startedAt) state.startedAt = at;
  if (input.paused && input.pauseReason === "manual") return null;
  const type = input.type || state.type || "walk";
  state.type = type;
  const th = autoPauseThresholds(type);

  if (Number.isFinite(input.lat) && Number.isFinite(input.lon)) {
    state.samples.push({ lat: input.lat, lon: input.lon, at });
  }
  const keepAfter = at - SAMPLE_KEEP_MS;
  state.samples = state.samples.filter((s) => s.at >= keepAfter);

  const window = windowStats(state.samples, at - th.stopDwellMs);
  const recent = windowStats(state.samples, at - th.moveDwellMs);
  const lastAt = state.samples.length ? state.samples[state.samples.length - 1].at : null;
  const quietMs = lastAt != null ? at - lastAt : 0;

  const movingNow = recent.speed >= th.moveSpeedMps && recent.straight >= 0.55 && recent.net >= 1.2;
  if (movingNow) {
    state.hasMoved = true;
    state.lastMovingAt = at;
    if (state.movingSince == null) state.movingSince = at;
  } else if (
    (recent.span >= th.moveDwellMs - 400 && recent.speed < th.stopSpeedMps) ||
    quietMs >= th.moveDwellMs
  ) {
    state.movingSince = null;
  }

  const pastGrace = at - state.startedAt >= th.startGraceMs;
  const windowStill =
    (window.span >= th.stopDwellMs - 400 && window.speed < th.moveSpeedMps) ||
    quietMs >= th.stopDwellMs;

  if (!input.paused && state.hasMoved && pastGrace && windowStill) return "pause";
  if (
    input.paused &&
    input.pauseReason === "auto" &&
    state.movingSince != null &&
    at - state.movingSince >= th.moveDwellMs &&
    movingNow
  ) {
    return "resume";
  }
  return null;
}
