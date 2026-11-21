/**
 * Sport helpers — walk, run, ride. Riding is the only new sport.
 * Speed replaces pace for rides; everything else stays per sport.
 */
import {
  activityMph,
  formatSportRate,
  formatSpeed,
  isRideType,
  personalRecords,
  rideRecords,
  prDefsFor,
  RIDE_PR_DEFS,
  FOOT_PR_DEFS,
} from "./util.js";

export const ACTIVITY_TYPES = ["walk", "run", "ride"];

const LAST_SPORT_KEY = "heldpath.lastSport";

export function normalizeSport(type) {
  if (isRideType(type)) return "ride";
  return type === "run" ? "run" : "walk";
}

export function isRide(type) {
  return normalizeSport(type) === "ride";
}

export function sportLabel(type) {
  const s = normalizeSport(type);
  if (s === "ride") return "Ride";
  return s === "run" ? "Run" : "Walk";
}

/** "avg speed" on a ride, "avg pace" on foot. */
export function rateLabel(type) {
  return isRide(type) ? "avg speed" : "avg pace";
}

export function defaultMph(type) {
  return activityMph(type);
}

/** Pace for walk/run, speed for a ride. */
export function formatRate(type, meters, seconds, units) {
  return formatSportRate(type, meters, seconds, units);
}

export { formatSpeed, personalRecords, rideRecords, prDefsFor, RIDE_PR_DEFS, FOOT_PR_DEFS };

/** Per-sport personal records, plus longest ride / best climb for rides. */
export function recordsForSport(activities, sport) {
  const normalized = normalizeSport(sport);
  const marks = personalRecords(activities, normalized);
  if (normalized !== "ride") return { sport: normalized, marks, longest: null, bestClimb: null };
  const { longest, bestClimb } = rideRecords(activities);
  return { sport: normalized, marks, longest, bestClimb };
}

export function loadLastSport(storage) {
  try {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!store) return "walk";
    return normalizeSport(store.getItem(LAST_SPORT_KEY));
  } catch {
    return "walk";
  }
}

export function saveLastSport(type, storage) {
  const sport = normalizeSport(type);
  try {
    const store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (store) store.setItem(LAST_SPORT_KEY, sport);
  } catch { /* private mode */ }
  return sport;
}

/** Convert a stored activity/plan type to the sport family. */
export function sportOfActivity(activity) {
  return normalizeSport(activity && activity.type);
}
