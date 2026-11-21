/**
 * On-device GPS cleanup for live tracking.
 *
 * A constant-velocity Kalman filter fuses position, speed and bearing,
 * rejects poor accuracy and impossible jumps, and predicts a gliding
 * position between fixes. Raw points are kept separately for export.
 * Nothing leaves the phone.
 */
import { haversineMeters } from "./util.js";
import { geodesicMeters } from "./geodesic.js";
import { maxFillSpeedMps } from "./gap_fill.js";

export const MAX_ACCURACY_M = 25;
export const PREDICT_MAX_SEC = 2;
export const JUMP_SLACK = 1.15;

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const METERS_PER_DEG_LAT = 111320;

export function sportMaxSpeedMps(type) {
  return maxFillSpeedMps(type);
}

export function localFrame(lat0, lon0) {
  const mid = Number(lat0) * DEG2RAD;
  return {
    lat0: Number(lat0),
    lon0: Number(lon0),
    mx: METERS_PER_DEG_LAT * Math.cos(mid),
    my: METERS_PER_DEG_LAT,
  };
}

export function toLocal(lat, lon, frame) {
  return {
    x: (Number(lon) - frame.lon0) * frame.mx,
    y: (Number(lat) - frame.lat0) * frame.my,
  };
}

export function toLatLon(x, y, frame) {
  return {
    lat: frame.lat0 + y / frame.my,
    lon: frame.lon0 + x / frame.mx,
  };
}

export function headingSpeedToVelocity(headingDeg, speedMps) {
  if (!(speedMps > 0) || !Number.isFinite(Number(headingDeg)) || headingDeg < 0) return null;
  const rad = Number(headingDeg) * DEG2RAD;
  return { vx: Math.sin(rad) * speedMps, vy: Math.cos(rad) * speedMps };
}

export function velocityToHeadingSpeed(vx, vy) {
  const speed = Math.hypot(vx, vy);
  if (!(speed > 0.05)) return { speed: 0, heading: null };
  let heading = Math.atan2(vx, vy) * RAD2DEG;
  if (heading < 0) heading += 360;
  return { speed, heading };
}

/**
 * Why a raw fix should be dropped. `prev` is the last *accepted* raw or
 * filtered point. Accuracy worse than 25 m, or a jump faster than the
 * sport cap, is rejected.
 */
export function rejectReason(fix, prev, { type = "walk" } = {}) {
  if (!fix || !Number.isFinite(Number(fix.lat)) || !Number.isFinite(Number(fix.lon))) return "invalid";
  const acc = Number(fix.accuracy);
  if (Number.isFinite(acc) && acc > MAX_ACCURACY_M) return "accuracy";
  if (!prev) return null;
  const dt = ((Number(fix.at) || 0) - (Number(prev.at) || 0)) / 1000;
  if (!(dt > 0) || dt > 30) return null;
  const dist = geodesicMeters
    ? geodesicMeters({ lat: prev.lat, lon: prev.lon }, { lat: fix.lat, lon: fix.lon })
    : haversineMeters({ lat: prev.lat, lon: prev.lon }, { lat: fix.lat, lon: fix.lon });
  const cap = sportMaxSpeedMps(type) * JUMP_SLACK;
  if (dist / dt > cap) return "jump";
  return null;
}

export function createGpsFilter({ type = "walk" } = {}) {
  return {
    type,
    frame: null,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    // Diagonal covariances: pos m^2, vel (m/s)^2
    pxx: 25,
    pyy: 25,
    pvvx: 4,
    pvvy: 4,
    at: 0,
    lastAccepted: null,
  };
}

function predict(state, dt) {
  if (!(dt > 0)) return;
  const t = Math.min(dt, PREDICT_MAX_SEC + 1);
  state.x += state.vx * t;
  state.y += state.vy * t;
  const accVar = state.type === "ride" ? 1.2 : 0.25;
  const qPos = accVar * t * t * t * t / 4;
  const qVel = accVar * t * t;
  state.pxx += qPos + state.pvvx * t * t;
  state.pyy += qPos + state.pvvy * t * t;
  state.pvvx += qVel;
  state.pvvy += qVel;
}

function updateScalar(value, measure, p, r) {
  const k = p / (p + r);
  return { value: value + k * (measure - value), p: (1 - k) * p, k };
}

/**
 * Feed one raw GNSS fix. Returns the filtered point when accepted.
 * `raw` is never mutated; callers should append it to a raw log themselves.
 */
export function applyGpsFix(state, raw) {
  const reason = rejectReason(raw, state.lastAccepted, { type: state.type });
  if (reason) return { ok: false, reason, state, raw, filtered: null };
  if (!state.frame) {
    state.frame = localFrame(raw.lat, raw.lon);
    const loc = toLocal(raw.lat, raw.lon, state.frame);
    state.x = loc.x;
    state.y = loc.y;
    const vel = headingSpeedToVelocity(raw.heading, raw.speed);
    if (vel) {
      state.vx = vel.vx;
      state.vy = vel.vy;
    }
    state.at = Number(raw.at) || Date.now();
    state.lastAccepted = { lat: raw.lat, lon: raw.lon, at: state.at };
    const boot = pointFromState(state);
    return { ok: true, reason: null, state, raw, filtered: boot };
  }
  const at = Number(raw.at) || Date.now();
  const dt = Math.max(0, (at - (state.at || at)) / 1000);
  predict(state, dt);
  const z = toLocal(raw.lat, raw.lon, state.frame);
  const acc = Number.isFinite(Number(raw.accuracy)) ? Math.max(5, Number(raw.accuracy)) : 10;
  const r = (acc + 8) * (acc + 8);
  const ux = updateScalar(state.x, z.x, state.pxx, r);
  const uy = updateScalar(state.y, z.y, state.pyy, r);
  state.x = ux.value;
  state.y = uy.value;
  state.pxx = Math.max(0.25, ux.p);
  state.pyy = Math.max(0.25, uy.p);
  const measured = headingSpeedToVelocity(raw.heading, raw.speed);
  if (measured && raw.speed > 0.3) {
    const rV = 1.5;
    const uvx = updateScalar(state.vx, measured.vx, state.pvvx, rV);
    const uvy = updateScalar(state.vy, measured.vy, state.pvvy, rV);
    state.vx = uvx.value;
    state.vy = uvy.value;
    state.pvvx = Math.max(0.05, uvx.p);
    state.pvvy = Math.max(0.05, uvy.p);
  } else if (dt > 0.15 && state.lastAccepted) {
    const prev = toLocal(state.lastAccepted.lat, state.lastAccepted.lon, state.frame);
    const k = 0.12;
    const newVx = (z.x - prev.x) / dt;
    const newVy = (z.y - prev.y) / dt;
    if (Number.isFinite(newVx) && Number.isFinite(newVy)) {
      state.vx = state.vx * (1 - k) + newVx * k;
      state.vy = state.vy * (1 - k) + newVy * k;
    }
  }
  state.at = at;
  state.lastAccepted = { lat: raw.lat, lon: raw.lon, at };
  return { ok: true, reason: null, state, raw, filtered: pointFromState(state) };
}

export function pointFromState(state, at) {
  if (!state || !state.frame) return null;
  const when = at != null ? Number(at) : state.at;
  const dt = Math.max(0, Math.min(PREDICT_MAX_SEC, (when - state.at) / 1000));
  const x = state.x + state.vx * dt;
  const y = state.y + state.vy * dt;
  const ll = toLatLon(x, y, state.frame);
  const motion = velocityToHeadingSpeed(state.vx, state.vy);
  return {
    lat: ll.lat,
    lon: ll.lon,
    at: when,
    speed: motion.speed,
    heading: motion.heading,
    filtered: true,
  };
}

/** Hold speed through a brief GPS dropout using step cadence (walk/run). */
export function applyCadenceHold(state, { cadenceHz, strideM, at, heading } = {}) {
  if (!state || !state.frame) return pointFromState(state, at);
  const hz = Number(cadenceHz);
  const stride = Number(strideM);
  if (!(hz > 0.4) || !(stride > 0.3)) return pointFromState(state, at);
  const speed = hz * stride;
  const cap = sportMaxSpeedMps(state.type);
  const v = Math.min(speed, cap);
  const hdg = heading != null ? heading : velocityToHeadingSpeed(state.vx, state.vy).heading;
  const vel = headingSpeedToVelocity(hdg, v);
  if (vel) {
    const when = Number(at) || Date.now();
    const dt = Math.max(0, Math.min(PREDICT_MAX_SEC, (when - state.at) / 1000));
    predict(state, dt);
    state.vx = vel.vx;
    state.vy = vel.vy;
    state.at = when;
  }
  return pointFromState(state, at);
}

export function pathDistance(points) {
  const pts = (points || []).filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    sum += geodesicMeters
      ? geodesicMeters(pts[i - 1], pts[i])
      : haversineMeters(pts[i - 1], pts[i]);
  }
  return sum;
}
