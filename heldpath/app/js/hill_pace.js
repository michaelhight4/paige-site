/**
 * Optional hill-adjusted pace (off by default).
 *
 * Model: Minetti et al. (2002), "Energy cost of walking and running at
 * extreme uphill and downhill slopes", J Appl Physiol 93:1039-1046.
 * The metabolic cost of running (J/kg/m) at gradient i is
 *   155.4 i^5 - 30.4 i^4 - 43.3 i^3 + 46.3 i^2 + 19.5 i + 3.6
 * with a flat cost of 3.6 J/kg/m. We divide the actual pace by
 * cost(i) / cost(0) to get an effort-equivalent flat pace.
 *
 * This is extra information only. Sector targets, goal times and all
 * live goal maths always use flat time (see sector_timing.js).
 */
import { haversineMeters, METERS_PER_MILE, METERS_PER_KM } from "./util.js";
import { despikeElevations, smoothElevations, gainLoss } from "./elevation.js";

export const HILL_PACE_LABEL = "Hill-adjusted pace";
export const HILL_PACE_SOURCE = "Minetti et al. 2002 energy-cost model";
export const MINETTI_FLAT_COST = 3.6;
export const MINETTI_MAX_GRADE = 0.4;
export const HILL_PACE_NOTE =
  "Off by default. When on, an activity can also show an effort-equivalent pace for its hills. "
  + "The model is Minetti et al. (2002), a published energy-cost curve. "
  + "Sector targets and goal times always use flat time, never this.";

const COEFFS = [155.4, -30.4, -43.3, 46.3, 19.5, MINETTI_FLAT_COST];

/** Metabolic cost in J/kg/m for a fractional gradient. */
export function minettiCost(grade) {
  const i = Math.max(-MINETTI_MAX_GRADE, Math.min(MINETTI_MAX_GRADE, Number(grade) || 0));
  let v = 0;
  for (let p = 0; p < COEFFS.length; p++) v += COEFFS[p] * Math.pow(i, COEFFS.length - 1 - p);
  return Math.max(0.5, v);
}

/** Cost ratio versus flat ground. Uphill > 1, gentle downhill < 1. */
export function gradeFactor(grade) {
  return minettiCost(grade) / MINETTI_FLAT_COST;
}

export function hillPaceEnabled(settings) {
  return !!(settings && settings.hillPace);
}

export function sportSupportsHillPace(activityOrSport) {
  const raw = typeof activityOrSport === "string"
    ? activityOrSport
    : (activityOrSport && activityOrSport.type) || "walk";
  return raw !== "ride" && raw !== "bike" && raw !== "cycle" && raw !== "cycling";
}

function elevationOf(point) {
  if (!point) return null;
  const v = point.ele ?? point.elevation ?? point.alt ?? point.altitude;
  return v == null || !Number.isFinite(Number(v)) ? null : Number(v);
}

function unitMeters(units) {
  return units === "km" ? METERS_PER_KM : METERS_PER_MILE;
}

function paceText(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Effort-equivalent flat pace for a track with elevation samples.
 * Returns null when there is not enough elevation to be honest.
 */
export function hillAdjustedPace({ track, distanceMeters, elapsedSec, units = "mi" } = {}) {
  const pts = (track || []).filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
  const seconds = Number(elapsedSec) || 0;
  let meters = Number(distanceMeters) || 0;
  if (pts.length < 3 || seconds <= 0) return null;
  const rawEle = pts.map(elevationOf);
  const haveEle = rawEle.filter((v) => v != null).length;
  if (haveEle < Math.max(2, Math.floor(pts.length * 0.5))) return null;
  const ele = smoothElevations(despikeElevations(rawEle), 5);
  let actual = 0;
  let effective = 0;
  let graded = 0;
  for (let i = 1; i < pts.length; i++) {
    const run = haversineMeters(pts[i - 1], pts[i]);
    if (!(run > 0)) continue;
    actual += run;
    let factor = 1;
    if (ele[i] != null && ele[i - 1] != null) {
      const grade = (ele[i] - ele[i - 1]) / run;
      factor = gradeFactor(grade);
      graded++;
    }
    effective += run * factor;
  }
  if (!(effective > 0)) return null;
  if (!(meters > 0)) meters = actual;
  if (!(meters > 0)) return null;
  const uM = unitMeters(units);
  const actualPace = seconds / (meters / uM);
  const adjustedPace = actualPace * (actual > 0 ? actual / effective : 1);
  const gl = gainLoss(pts);
  return {
    ok: true,
    sport: "walk",
    actualPaceSecPerUnit: actualPace,
    adjustedPaceSecPerUnit: adjustedPace,
    adjustedTimeSec: seconds * (actual > 0 ? actual / effective : 1),
    actualTimeSec: seconds,
    factor: actual > 0 ? effective / actual : 1,
    gainM: gl.gainM,
    lossM: gl.lossM,
    gradedSegments: graded,
    source: HILL_PACE_SOURCE,
    units,
  };
}

/** One short line for an activity card. Deliberately never says GAP. */
export function hillPaceLine(result, units = "mi") {
  if (!result || !result.ok) return "";
  const suffix = units === "km" ? "/km" : "/mi";
  return `${HILL_PACE_LABEL} ${paceText(result.adjustedPaceSecPerUnit)}${suffix} · actual ${paceText(result.actualPaceSecPerUnit)}${suffix}`;
}

/** Activity helper: respect the setting and only offer walk/run. */
export function hillPaceForActivity(activity, { units = "mi", enabled = false } = {}) {
  if (!enabled || !activity || !sportSupportsHillPace(activity)) return null;
  return hillAdjustedPace({
    track: activity.track,
    distanceMeters: activity.distanceMeters,
    elapsedSec: activity.elapsedSec,
    units,
  });
}
