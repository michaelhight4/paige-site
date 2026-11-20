/**
 * Free route goal time and F1-style sector timing.
 *
 * Target math is a perfect even pace only:
 *   targetPace = goalTime / totalRouteDistance
 *   sectorTarget = sectorDistance * targetPace
 * Elevation may be shown as info, never in the target math.
 * History and PBs are stored on the course object, on-device, offline.
 */
import {
  buildEvenPaceLegTargets,
  sectorDistances,
  legSplitsFromTrack,
} from "./plan_legs.js";
import { pathLengthMeters, METERS_PER_MILE, formatDuration } from "./util.js";

export function routeMeters(course) {
  if (!course) return 0;
  if (course.path && course.path.length >= 2) return pathLengthMeters(course.path);
  if (course.pins && course.pins.length >= 2) return pathLengthMeters(course.pins);
  return 0;
}

/** Goal from a finish time (seconds). */
export function goalFromFinishTime(finishSec, course) {
  const finish = Math.max(0, Number(finishSec) || 0);
  const meters = routeMeters(course);
  const paceSecPerMile = meters > 0 ? finish / (meters / METERS_PER_MILE) : null;
  return { kind: "time", finishSec: finish, paceSecPerMile, meters };
}

/** Goal from a pace (seconds per mile or km). */
export function goalFromPace(paceSecPerUnit, course, units = "mi") {
  const pace = Math.max(0, Number(paceSecPerUnit) || 0);
  const meters = routeMeters(course);
  const unitM = units === "km" ? 1000 : METERS_PER_MILE;
  const finishSec = meters > 0 ? pace * (meters / unitM) : 0;
  const paceSecPerMile = units === "km" ? pace * (METERS_PER_MILE / 1000) : pace;
  return { kind: "pace", finishSec, paceSecPerMile, paceSecPerUnit: pace, units, meters };
}

export function resolveGoal(course) {
  const g = course && course.goal;
  if (!g) return null;
  if (g.finishSec > 0) return goalFromFinishTime(g.finishSec, course);
  if (g.paceSecPerMile > 0) return goalFromPace(g.paceSecPerMile, course, "mi");
  return null;
}

/** Even-pace sector targets (seconds, fractional). */
export function sectorTargets(course, goal) {
  const g = goal || resolveGoal(course);
  if (!g || !(g.finishSec > 0)) return [];
  const pins = course.pins || [];
  return buildEvenPaceLegTargets(pins, g.finishSec, { path: course.path });
}

export function formatSectorTime(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds))) return "—";
  const s = Math.max(0, Number(seconds));
  const tenths = Math.round(s * 10) / 10;
  const whole = Math.floor(tenths);
  const frac = Math.round((tenths - whole) * 10);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const sec = whole % 60;
  const core = `${m}:${String(sec).padStart(2, "0")}.${frac}`;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${frac}` : core;
}

/** F1-style delta: green '-0:04.2' when ahead, red '+0:03.1' when behind. */
export function formatSectorDelta(deltaSec) {
  if (deltaSec == null || !Number.isFinite(Number(deltaSec))) return "—";
  const v = Number(deltaSec);
  if (Math.abs(v) < 0.05) return "0:00.0";
  const sign = v > 0 ? "+" : "−";
  return sign + formatSectorTime(Math.abs(v));
}

export function deltaColor(deltaSec, { isNewPb = false } = {}) {
  if (isNewPb) return "purple";
  if (deltaSec == null || !Number.isFinite(Number(deltaSec))) return "neutral";
  if (Math.abs(Number(deltaSec)) < 0.05) return "neutral";
  return Number(deltaSec) < 0 ? "green" : "red";
}

function spanSeconds(a, b) {
  const d = (Number(b) || 0) - (Number(a) || 0);
  if (!(d > 0)) return 0;
  return d > 10000 ? d / 1000 : d;
}

/** Convert split values that may be ms or sec into seconds. */
function asSeconds(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 10000 ? n / 1000 : n;
}

export function sectorTimesFromTrack(course, track) {
  const pins = course && course.pins;
  if (!pins || pins.length < 2 || !track || track.length < 2) return [];
  const raw = legSplitsFromTrack(pins, track) || [];
  return raw.map(asSeconds);
}

export function readSectorPbs(course) {
  const raw = (course && (course.sectorPbs || course.legPbs)) || {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const sec = v && typeof v === "object" ? Number(v.seconds) : Number(v);
    if (sec > 0) out[String(k)] = { seconds: sec, activityId: v && v.activityId, date: v && v.date };
  }
  return out;
}

export function hasSectorHistory(course) {
  const pbs = readSectorPbs(course);
  if (Object.keys(pbs).length) return true;
  return !!(course && Array.isArray(course.sectorHistory) && course.sectorHistory.length);
}

export function compareSectors({ times, targets, pbs, hasHistory }) {
  const n = Math.max(times.length, targets.length);
  const history = !!hasHistory;
  return Array.from({ length: n }, (_, i) => {
    const time = times[i] || 0;
    const target = targets[i] || 0;
    const pb = pbs && pbs[String(i)] ? Number(pbs[String(i)].seconds) : null;
    const vsGoal = time && target ? time - target : null;
    const vsPb = history && time && pb ? time - pb : null;
    const isNewPb = !!(time > 0 && (pb == null || time < pb - 0.009));
    return {
      index: i,
      time,
      target,
      pb,
      vsGoal,
      vsPb: history ? vsPb : null,
      isNewPb: history && isNewPb,
      colorVsGoal: deltaColor(vsGoal),
      colorVsPb: history ? deltaColor(vsPb, { isNewPb: history && isNewPb }) : "neutral",
    };
  });
}

/** Sum of best sector times (missing sectors use the target, or omit). */
export function bestPossibleSec(pbs, targets) {
  const n = (targets && targets.length) || Object.keys(pbs || {}).length;
  if (!n) return null;
  let sum = 0;
  let any = false;
  for (let i = 0; i < n; i++) {
    const pb = pbs && pbs[String(i)] && pbs[String(i)].seconds;
    if (pb > 0) { sum += pb; any = true; }
    else if (targets && targets[i] > 0) sum += targets[i];
  }
  return any ? sum : null;
}

export function applySectorResult(course, times, { activityId, at } = {}) {
  if (!course || !times || !times.length) {
    return { course, newBests: [], rows: [] };
  }
  if (!course.sectorPbs || typeof course.sectorPbs !== "object") course.sectorPbs = {};
  if (!Array.isArray(course.sectorHistory)) course.sectorHistory = [];
  const previous = readSectorPbs(course);
  const hadHistory = hasSectorHistory({ ...course, sectorPbs: previous, sectorHistory: course.sectorHistory.slice(0, -0) });
  const hadAnyPb = Object.keys(previous).length > 0;
  const newBests = [];
  times.forEach((sec, i) => {
    if (!(sec > 0)) return;
    const prev = previous[String(i)];
    if (!prev || sec < prev.seconds - 0.009) {
      course.sectorPbs[String(i)] = {
        seconds: Math.round(sec * 10) / 10,
        activityId: activityId || null,
        date: (at || new Date()).toISOString?.() || at || new Date().toISOString(),
      };
      // Keep legacy free leg bests in sync (whole seconds).
      if (!course.legPbs || typeof course.legPbs !== "object") course.legPbs = {};
      course.legPbs[i] = { seconds: Math.round(sec), activityId: activityId || null, date: course.sectorPbs[String(i)].date };
      newBests.push(i);
    }
  });
  const totalSec = times.reduce((s, v) => s + (Number(v) || 0), 0);
  course.sectorHistory.push({
    at: (at || new Date()).toISOString?.() || new Date().toISOString(),
    activityId: activityId || null,
    times: times.map((s) => Math.round(s * 10) / 10),
    totalSec: Math.round(totalSec * 10) / 10,
  });
  if (course.sectorHistory.length > 50) course.sectorHistory = course.sectorHistory.slice(-50);
  const goal = resolveGoal(course);
  const targets = sectorTargets(course, goal);
  const rows = compareSectors({
    times,
    targets,
    pbs: previous,
    hasHistory: hadAnyPb,
  }).map((row) => ({
    ...row,
    isNewPb: newBests.includes(row.index),
    colorVsPb: hadAnyPb ? deltaColor(row.vsPb, { isNewPb: newBests.includes(row.index) }) : "neutral",
  }));
  return {
    course,
    newBests,
    rows,
    bestPossible: bestPossibleSec(readSectorPbs(course), targets),
    hadHistory: hadAnyPb,
  };
}

/**
 * Sectors completed when travelled distance crosses a boundary.
 * Returns 0-based sector indices that were just finished.
 */
export function newlyCompletedSectors(prevMeters, nextMeters, sectorMeters) {
  const out = [];
  let acc = 0;
  for (let i = 0; i < (sectorMeters || []).length; i++) {
    acc += sectorMeters[i];
    if (prevMeters < acc - 0.5 && nextMeters >= acc - 0.5) out.push(i);
  }
  return out;
}

export function sectorMetersList(course) {
  return sectorDistances(course && course.pins, course && course.path).map((l) => l.meters);
}

export function liveSectorFlash(row, { cumulativeDelta, hasHistory, bestPossible } = {}) {
  const vsGoal = formatSectorDelta(row.vsGoal);
  const parts = [`S${row.index + 1}  ${vsGoal}`];
  if (hasHistory && row.vsPb != null) {
    parts.push(row.isNewPb ? `PB ${formatSectorTime(row.time)}` : `vs PB ${formatSectorDelta(row.vsPb)}`);
  }
  const cum = cumulativeDelta != null ? formatSectorDelta(cumulativeDelta) : null;
  return {
    color: row.isNewPb && hasHistory ? "purple" : row.colorVsGoal,
    sectorLine: parts.join(" · "),
    cumulativeLine: cum ? `Total ${cum}` : "",
    bestPossibleLine: bestPossible != null ? `Best possible ${formatSectorTime(bestPossible)}` : "",
    vsGoal,
    spoken: speakDelta(row, { cumulativeDelta, hasHistory }),
  };
}

function speakDelta(row, { cumulativeDelta, hasHistory }) {
  const n = row.index + 1;
  const goal = row.vsGoal == null ? "" : (row.vsGoal < 0 ? `minus ${spokenTime(Math.abs(row.vsGoal))} on the goal` : row.vsGoal > 0 ? `plus ${spokenTime(row.vsGoal)} on the goal` : "on the goal");
  const pb = hasHistory && row.isNewPb ? ". New sector best" : "";
  return `Sector ${n}, ${goal}${pb}.`;
}

function spokenTime(sec) {
  const t = Math.abs(Number(sec) || 0);
  const s = Math.floor(t);
  const tenth = Math.round((t - s) * 10);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m > 0) return `${m} ${m === 1 ? "minute" : "minutes"} ${r}.${tenth}`;
  return `${r}.${tenth}`;
}

export async function maybeCallout(text, { audio = false, haptic = false } = {}) {
  if (haptic) {
    try { if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([40, 40, 80]); } catch { /* ignore */ }
  }
  if (audio && text && typeof window !== "undefined" && window.speechSynthesis) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.volume = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  }
}

export function parseFinishInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d+):(\d{1,2})(?:\.(\d))?$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]) + (m[3] ? Number(m[3]) / 10 : 0);
  const min = Number(s);
  if (Number.isFinite(min) && min > 0) return min * 60;
  return null;
}

export function parsePaceInput(raw) {
  const s = String(raw || "").trim();
  if (!s) return null;
  const m = s.match(/^(\d+):(\d{2})$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}

export { formatDuration };
