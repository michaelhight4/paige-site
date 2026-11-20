/**
 * Manual treadmill / indoor log. Distance and time are what the user
 * entered; there is no GPS track.
 */
import { METERS_PER_MILE, METERS_PER_KM } from "./util.js";

export const MAX_DISTANCE_M = 200 * 1000;
export const MAX_ELAPSED_SEC = 24 * 60 * 60;
export const MIN_DISTANCE_M = 10;
export const MIN_ELAPSED_SEC = 10;

export function parseDistanceInput(raw, units = "mi") {
  const text = String(raw ?? "").trim().replace(",", ".");
  if (!text) return { ok: false, reason: "Enter a distance." };
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0) return { ok: false, reason: "Enter a distance greater than zero." };
  const meters = units === "km" ? n * METERS_PER_KM : n * METERS_PER_MILE;
  if (meters < MIN_DISTANCE_M) return { ok: false, reason: "That distance is too short to log." };
  if (meters > MAX_DISTANCE_M) return { ok: false, reason: "That distance is too long to log in one go." };
  return { ok: true, meters, input: n, units };
}

/** Accepts minutes ("45"), mm:ss ("32:10"), or h:mm:ss ("1:32:10"). Bare numbers are minutes. */
export function parseDurationInput(raw) {
  const text = String(raw ?? "").trim();
  if (!text) return { ok: false, reason: "Enter a time." };
  if (/^\d+$/.test(text) || /^\d+\.\d+$/.test(text)) {
    const minutes = Number(text);
    if (!Number.isFinite(minutes) || minutes <= 0) return { ok: false, reason: "Enter a time greater than zero." };
    const sec = Math.round(minutes * 60);
    if (sec < MIN_ELAPSED_SEC) return { ok: false, reason: "That time is too short to log." };
    if (sec > MAX_ELAPSED_SEC) return { ok: false, reason: "That time is too long to log in one go." };
    return { ok: true, seconds: sec };
  }
  const parts = text.split(":").map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) {
    return { ok: false, reason: "Use minutes, mm:ss, or h:mm:ss." };
  }
  const nums = parts.map((p) => Number(p));
  let sec;
  if (nums.length === 2) sec = nums[0] * 60 + nums[1];
  else sec = nums[0] * 3600 + nums[1] * 60 + nums[2];
  if (nums.slice(1).some((n) => n > 59)) return { ok: false, reason: "Minutes and seconds must be between 0 and 59." };
  if (sec < MIN_ELAPSED_SEC) return { ok: false, reason: "That time is too short to log." };
  if (sec > MAX_ELAPSED_SEC) return { ok: false, reason: "That time is too long to log in one go." };
  return { ok: true, seconds: sec };
}

export function parseWhenInput(raw, now = new Date()) {
  if (raw == null || String(raw).trim() === "") return { ok: true, date: now };
  const text = String(raw).trim();
  const d = new Date(text);
  if (!Number.isFinite(d.getTime())) return { ok: false, reason: "Enter a valid date and time." };
  if (d.getTime() > now.getTime() + 5 * 60 * 1000) return { ok: false, reason: "That time is in the future." };
  return { ok: true, date: d };
}

export function buildIndoorActivity({ type, meters, elapsedSec, endedAt, note } = {}, now = new Date()) {
  const end = endedAt instanceof Date ? endedAt : (endedAt ? new Date(endedAt) : now);
  const start = new Date(end.getTime() - (elapsedSec || 0) * 1000);
  return {
    type: type === "run" ? "run" : "walk",
    source: "indoor",
    distanceMeters: meters || 0,
    elapsedSec: elapsedSec || 0,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    track: [],
    indoorNote: note ? String(note).trim() : "",
  };
}

export function indoorSourceLabel() {
  return "Logged indoors";
}

export function indoorSummaryNote() {
  return "Distance and time are what you entered. There is no GPS track.";
}

export function indoorPromptCopy(type = "walk") {
  const kind = type === "run" ? "run" : "walk";
  return {
    title: `Log an indoor ${kind}`,
    body: `Use this for a treadmill or indoor ${kind}. Heldpath will not use GPS. Distance and time are what you enter.`,
    save: "Save",
    cancel: "Cancel",
  };
}
