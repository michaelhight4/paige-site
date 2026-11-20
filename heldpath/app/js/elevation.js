/**
 * Elevation: smooth and fuse barometer, GPS altitude and DEM samples,
 * then report gain, loss, a profile, Naismith time, and optional 3D distance.
 */
import { haversineMeters } from "./util.js";

export const GAIN_THRESHOLD_M = 3;
export const FLAT_DISCLAIMER = "Distance is measured as flat ground. Elevation isn't included unless you turn on Count hills in distance.";
export const HILLS_DISCLAIMER = "Distance includes hills.";
export const DEM_CREDIT_SHORT = "Elevation data: Tilezen/Mapzen terrain tiles, hosted by AWS Open Data.";
export const DEM_ATTRIBUTION_URL = "https://github.com/tilezen/joerd/blob/master/docs/attribution.md";

/** Terrarium encoding used by AWS Terrain Tiles. */
export function terrariumToMeters(r, g, b) {
  return r * 256 + g + b / 256 - 32768;
}

export function metersToTerrarium(meters) {
  const v = meters + 32768;
  const r = Math.min(255, Math.max(0, Math.floor(v / 256)));
  const rem = v - r * 256;
  const g = Math.min(255, Math.max(0, Math.floor(rem)));
  const b = Math.min(255, Math.max(0, Math.round((rem - g) * 256)));
  return { r, g, b };
}

/**
 * Barometer first, then GPS altitude, then DEM as a correction toward terrain.
 * A prior fused sample keeps short gaps stable.
 */
export function fuseElevation({ baroM, gpsM, demM, prevM } = {}) {
  const have = (v) => v != null && Number.isFinite(Number(v));
  let base = null;
  let source = "none";
  if (have(baroM)) { base = Number(baroM); source = "baro"; }
  else if (have(gpsM)) { base = Number(gpsM); source = "gps"; }
  else if (have(demM)) { base = Number(demM); source = "dem"; }
  else if (have(prevM)) { return { meters: Number(prevM), source: "hold" }; }
  else return { meters: null, source: "none" };

  if (have(demM) && source !== "dem") {
    const dem = Number(demM);
    const alpha = source === "baro" ? 0.25 : 0.45;
    base = base * (1 - alpha) + dem * alpha;
  }
  if (have(prevM)) {
    const prev = Number(prevM);
    base = prev * 0.35 + base * 0.65;
  }
  return { meters: Math.round(base * 10) / 10, source };
}

/** Simple moving average; keeps ends so a short climb is not erased. */
export function smoothElevations(values, window = 5) {
  const arr = (values || []).map((v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v)));
  const n = arr.length;
  if (n < 3) return arr.slice();
  const w = Math.max(3, window % 2 === 1 ? window : window + 1);
  const half = Math.floor(w / 2);
  const out = arr.slice();
  for (let i = 0; i < n; i++) {
    let sum = 0, c = 0;
    for (let j = i - half; j <= i + half; j++) {
      if (j < 0 || j >= n || arr[j] == null) continue;
      sum += arr[j];
      c += 1;
    }
    if (c) out[i] = Math.round((sum / c) * 10) / 10;
  }
  const first = arr.find((v) => v != null);
  const last = [...arr].reverse().find((v) => v != null);
  if (first != null) out[arr.findIndex((v) => v != null)] = first;
  if (last != null) out[n - 1 - [...arr].reverse().findIndex((v) => v != null)] = last;
  return out;
}

function seriesFrom(points) {
  if (!points) return [];
  if (points.length && typeof points[0] === "number") return points.map((v) => (Number.isFinite(v) ? v : null));
  return points.map((p) => {
    if (p == null) return null;
    const v = p.ele ?? p.elevation ?? p.alt ?? p.altitude;
    return v == null || !Number.isFinite(Number(v)) ? null : Number(v);
  });
}

/** Drop isolated spikes that stand taller than both neighbours by the threshold. */
export function despikeElevations(values, thresholdM = GAIN_THRESHOLD_M) {
  const arr = (values || []).map((v) => (v == null || !Number.isFinite(Number(v)) ? null : Number(v)));
  const out = arr.slice();
  for (let i = 1; i < arr.length - 1; i++) {
    if (arr[i] == null || arr[i - 1] == null || arr[i + 1] == null) continue;
    const mid = Math.max(arr[i - 1], arr[i + 1]);
    const low = Math.min(arr[i - 1], arr[i + 1]);
    if (arr[i] - mid >= thresholdM * 2) out[i] = mid;
    else if (low - arr[i] >= thresholdM * 2) out[i] = low;
  }
  return out;
}

/**
 * Cumulative gain and loss. Isolated spikes and vertical wiggles under the
 * noise threshold do not pile up as fake climb.
 */
export function gainLoss(points, { thresholdM = GAIN_THRESHOLD_M, window = 3 } = {}) {
  const cleaned = despikeElevations(seriesFrom(points), thresholdM);
  const smooth = smoothElevations(cleaned, window);
  let gain = 0, loss = 0;
  let last = null;
  for (const v of cleaned) {
    if (v == null) continue;
    if (last == null) { last = v; continue; }
    const d = v - last;
    if (d >= thresholdM) {
      gain += d;
      last = v;
    } else if (d <= -thresholdM) {
      loss += -d;
      last = v;
    }
  }
  return {
    gainM: Math.round(gain * 10) / 10,
    lossM: Math.round(loss * 10) / 10,
    samples: smooth,
  };
}

/** Slope-adjusted 3D distance from a series of {lat,lon,ele} points. */
export function distance3dMeters(points, { thresholdM = GAIN_THRESHOLD_M, window = 5 } = {}) {
  const pts = (points || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  if (pts.length < 2) return 0;
  const smooth = smoothElevations(pts.map((p) => (p.ele == null ? null : p.ele)), window);
  let sum = 0;
  for (let i = 1; i < pts.length; i++) {
    const h = haversineMeters(pts[i - 1], pts[i]);
    const a = smooth[i - 1];
    const b = smooth[i];
    let v = 0;
    if (a != null && b != null) {
      v = b - a;
      if (Math.abs(v) < thresholdM * 0.25) v = 0;
    }
    sum += Math.sqrt(h * h + v * v);
  }
  return Math.round(sum * 10) / 10;
}

export function displayDistance(points, flatMeters, { countHills = false } = {}) {
  const flat = Number(flatMeters) || 0;
  if (!countHills) {
    return { meters: flat, disclaimer: FLAT_DISCLAIMER, countHills: false };
  }
  const d3 = distance3dMeters(points);
  const meters = d3 > 0 ? d3 : flat;
  return { meters, disclaimer: HILLS_DISCLAIMER, countHills: true, flatMeters: flat };
}

/**
 * Naismith-style time: flat time plus one hour per 600 m of climb.
 * Descent does not shorten the estimate.
 */
export function naismithSeconds(flatMeters, gainM, mph) {
  const miles = (Number(flatMeters) || 0) / 1609.344;
  const speed = Number(mph) || 0;
  const flatSec = speed > 0 && miles > 0 ? (miles / speed) * 3600 : 0;
  const climbSec = Math.max(0, Number(gainM) || 0) / 600 * 3600;
  return Math.round(flatSec + climbSec);
}

export function formatGain(meters, units = "mi") {
  const m = Math.max(0, Number(meters) || 0);
  if (units === "km") {
    if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
    return `${Math.round(m)} m`;
  }
  const ft = m * 3.28084;
  return `${Math.round(ft)} ft`;
}

export function elevationProfileSvg(values, { width = 280, height = 72, gainM = 0, lossM = 0, units = "mi" } = {}) {
  const nums = (values || []).filter((v) => v != null && Number.isFinite(Number(v))).map(Number);
  if (nums.length < 2) return "";
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = Math.max(max - min, 1);
  const pad = 4;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const pts = nums.map((v, i) => {
    const x = pad + (i / (nums.length - 1)) * innerW;
    const y = pad + (1 - (v - min) / span) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const label = `Elevation profile. Climb ${formatGain(gainM, units)}, descent ${formatGain(lossM, units)}.`;
  return `<svg class="elev-profile" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label.replace(/"/g, "'")}" data-testid="elevation-profile"><polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" points="${pts}" /></svg>`;
}

export function summarizeElevation(points, { countHills = false, units = "mi" } = {}) {
  const gl = gainLoss(points);
  const dist = displayDistance(points, pathFlatMeters(points), { countHills });
  return {
    ...gl,
    ...dist,
    profileSvg: elevationProfileSvg(gl.samples, { gainM: gl.gainM, lossM: gl.lossM, units }),
    credit: DEM_CREDIT_SHORT,
  };
}

function pathFlatMeters(points) {
  const pts = (points || []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lon));
  let sum = 0;
  for (let i = 1; i < pts.length; i++) sum += haversineMeters(pts[i - 1], pts[i]);
  return sum;
}

/** Pressure (hPa) to height, relative to a reference pressure and height. */
export function heightFromPressure(hpa, { seaLevelHpa = 1013.25, refHeightM = 0, refHpa = null } = {}) {
  const p = Number(hpa);
  if (!Number.isFinite(p) || p <= 0) return null;
  if (refHpa && refHpa > 0) {
    // Hypsometric, ISA: 44330 * (1 - (P/P0)^0.1903)
    const href = 44330 * (1 - Math.pow(refHpa / seaLevelHpa, 0.1903));
    const h = 44330 * (1 - Math.pow(p / seaLevelHpa, 0.1903));
    return refHeightM + (h - href);
  }
  return 44330 * (1 - Math.pow(p / seaLevelHpa, 0.1903));
}
