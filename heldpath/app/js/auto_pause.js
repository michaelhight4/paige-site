import { haversineMeters } from "./util.js";

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

const SAMPLE_KEEP_MS = STOP_DWELL_MS + 2000;

export function createAutoPauseState(startedAt = 0) {
  return {
    startedAt: startedAt || 0,
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

  if (Number.isFinite(input.lat) && Number.isFinite(input.lon)) {
    state.samples.push({ lat: input.lat, lon: input.lon, at });
  }
  const keepAfter = at - SAMPLE_KEEP_MS;
  state.samples = state.samples.filter((s) => s.at >= keepAfter);

  const window = windowStats(state.samples, at - STOP_DWELL_MS);
  const recent = windowStats(state.samples, at - MOVE_DWELL_MS);
  const lastAt = state.samples.length ? state.samples[state.samples.length - 1].at : null;
  const quietMs = lastAt != null ? at - lastAt : 0;

  const movingNow = recent.speed >= MOVE_SPEED_MPS && recent.straight >= 0.55 && recent.net >= 1.2;
  if (movingNow) {
    state.hasMoved = true;
    state.lastMovingAt = at;
    if (state.movingSince == null) state.movingSince = at;
  } else if (
    (recent.span >= MOVE_DWELL_MS - 400 && recent.speed < STOP_SPEED_MPS) ||
    quietMs >= MOVE_DWELL_MS
  ) {
    state.movingSince = null;
  }

  const pastGrace = at - state.startedAt >= START_GRACE_MS;
  const windowStill =
    (window.span >= STOP_DWELL_MS - 400 && window.speed < MOVE_SPEED_MPS) ||
    quietMs >= STOP_DWELL_MS;

  if (!input.paused && state.hasMoved && pastGrace && windowStill) return "pause";
  if (
    input.paused &&
    input.pauseReason === "auto" &&
    state.movingSince != null &&
    at - state.movingSince >= MOVE_DWELL_MS &&
    movingNow
  ) {
    return "resume";
  }
  return null;
}
