/**
 * Start/finish gate lap detection.
 *
 * A lap counts only when the athlete crosses the start/finish gate AFTER
 * completing every pin-to-pin sector of the loop, in order (Gary's rule,
 * STRAVA_GAP_PLAN §7). Distance alone never awards a lap.
 *
 * The gate is a small radius around the shared start/end. The same builder
 * pins that define sectors also define the gates, so this module and
 * sector_timing.js share one geometry source.
 *
 * Used by tracking (live "Lap 2 of 4") and by the post-run views. Gap-fill
 * along the route inserts fixes through the gate, so a short dropout near
 * the line neither invents nor denies a lap.
 */
import { haversineMeters, pathLengthMeters, projectOnPath } from "./util.js";
import { isClosedCircuit, CLOSE_METERS } from "./target_distance.js";
import { sectorDistances } from "./plan_legs.js";

export const DEFAULT_GATE_METERS = CLOSE_METERS;
export const DEFAULT_SECTOR_METERS = CLOSE_METERS;

function pointElapsedSec(pt, originMs) {
  if (!pt) return 0;
  if (Number.isFinite(Number(pt.t)) && Number(pt.t) < 1e7) return Number(pt.t);
  const at = pt.at;
  let ms = null;
  if (typeof at === "number" && Number.isFinite(at)) ms = at > 1e11 ? at : at * 1000;
  else if (at) {
    const parsed = Date.parse(at);
    if (Number.isFinite(parsed)) ms = parsed;
  } else if (Number.isFinite(Number(pt.t))) {
    const n = Number(pt.t);
    ms = n > 1e11 ? n : n * 1000;
  }
  if (ms == null) return 0;
  return (ms - (originMs == null ? ms : originMs)) / 1000;
}

function originMs(track) {
  const p = track && track[0];
  if (!p) return 0;
  if (typeof p.at === "number" && Number.isFinite(p.at)) return p.at > 1e11 ? p.at : p.at * 1000;
  if (p.at) {
    const parsed = Date.parse(p.at);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function coursePins(course) {
  if (!course) return [];
  if (Array.isArray(course.pins) && course.pins.length >= 2) return course.pins;
  return [];
}

export function courseLine(course) {
  if (!course) return [];
  if (course.path && course.path.length >= 2) return course.path;
  return course.pins || [];
}

/** A closed, shared-start-end course with at least one sector. */
export function isGatedLoop(course, closeMeters = DEFAULT_GATE_METERS) {
  const pins = coursePins(course);
  if (pins.length < 2) return false;
  const line = courseLine(course);
  if (line.length >= 2 && !isClosedCircuit(line, closeMeters)) return false;
  return haversineMeters(pins[0], pins[pins.length - 1]) <= closeMeters;
}

/**
 * Walk a GPS track through the gate state machine. Pure: no storage, no DOM.
 * Returns lap counts, lap times and per-lap sector times.
 */
export function analyzeLapGate(course, track, {
  gateMeters = DEFAULT_GATE_METERS,
  sectorMeters = DEFAULT_SECTOR_METERS,
} = {}) {
  const pins = coursePins(course);
  const line = courseLine(course);
  const closed = isGatedLoop(course, gateMeters) || (pins.length >= 2 && isClosedCircuit(line, gateMeters));
  const pointCount = track ? track.length : 0;
  const result = {
    closed,
    gated: false,
    segmentCount: Math.max(0, pins.length - 1),
    courseMeters: line.length >= 2 ? pathLengthMeters(line) : 0,
    gate: pins.length ? { lat: pins[0].lat, lon: pins[0].lon } : null,
    gateMeters,
    sectorMeters,
    completedLaps: 0,
    currentLap: 1,
    lap: 1,
    armed: false,
    nextSector: 0,
    leftGate: false,
    atGate: false,
    points: pointCount,
    lapTimes: [],
    sectorTimesByLap: [[]],
    sectorTimes: [],
    gateCrossings: [],
    bestLapSec: null,
    lastLapSec: null,
  };
  if (!closed || pins.length < 2 || !track || track.length < 2) return result;
  result.gated = true;

  const origin = originMs(track);
  const times = track.map((p) => pointElapsedSec(p, origin));
  const gate = pins[0];
  const total = result.courseMeters;
  const legs = sectorDistances(pins, line);
  let boundaryAcc = 0;
  const sectorEnds = legs.map((l) => (boundaryAcc += Number(l.meters) || 0));
  if (sectorEnds.length) sectorEnds[sectorEnds.length - 1] = total;
  const boundaryPins = pins.slice(1);

  let inGate = haversineMeters(track[0], gate) <= gateMeters;
  let leftGate = !inGate;
  let nextSector = 0;
  let armed = false;
  let lapStartSec = times[0] || 0;
  let sectorStartSec = lapStartSec;
  let currentLap = 1;
  let completedLaps = 0;
  let lapOffset = 0;
  let prevRaw = 0;
  let prevProgress = 0;
  let prevT = times[0] || 0;
  result.atGate = inGate;

  for (let i = 0; i < track.length; i++) {
    const pt = track[i];
    const t = times[i] || 0;
    const gateDist = haversineMeters(pt, gate);
    const nowInGate = gateDist <= gateMeters;

    // Route progress, not raw distance, so a cut across the middle cannot
    // advance a sector on its own. The loop closure is unwrapped, and
    // backwards movement is held at the previous progress.
    const proj = projectOnPath(line, pt);
    let raw = proj.traveled;
    if (raw + total * 0.3 < prevRaw) {
      if (prevRaw > total * 0.7 && raw < total * 0.3) lapOffset += total;
      else raw = prevRaw;
    }
    let progress = lapOffset + raw;
    if (progress < prevProgress) progress = prevProgress;

    // Sectors complete in order, only after leaving the gate and only when
    // the athlete is actually at the pin. A cut or skipped pin leaves
    // nextSector behind and never arms the lap.
    if (leftGate && nextSector < sectorEnds.length) {
      const boundary = completedLaps * total + sectorEnds[nextSector];
      if (progress + 0.5 >= boundary) {
        const near = haversineMeters(pt, boundaryPins[nextSector]) <= sectorMeters;
        if (near) {
          const span = progress - prevProgress;
          const frac = span > 0.05 ? Math.min(1, Math.max(0, (boundary - prevProgress) / span)) : 1;
          const crossT = prevT + (t - prevT) * frac;
          const sec = Math.max(0, crossT - sectorStartSec);
          const lapSectors = result.sectorTimesByLap[currentLap - 1];
          if (lapSectors) lapSectors.push(Math.round(sec * 10) / 10);
          result.sectorTimes.push(Math.round(sec * 10) / 10);
          sectorStartSec = crossT;
          nextSector += 1;
          if (nextSector >= sectorEnds.length) {
            // The last sector ends at the shared start/end gate: one
            // arrival completes the loop and starts the next lap.
            armed = true;
            result.gateCrossings.push(i);
            result.lapTimes.push({
              lap: currentLap,
              seconds: Math.round(Math.max(0, crossT - lapStartSec) * 10) / 10,
              startSec: Math.round(lapStartSec * 10) / 10,
              endSec: Math.round(crossT * 10) / 10,
              endIndex: i,
            });
            completedLaps += 1;
            currentLap += 1;
            lapStartSec = crossT;
            sectorStartSec = crossT;
            nextSector = 0;
            armed = false;
            result.sectorTimesByLap.push([]);
            prevProgress = progress;
            prevT = t;
            prevRaw = raw;
            if (inGate && !nowInGate) leftGate = true;
            inGate = nowInGate;
            continue;
          }
        }
      }
    }

    if (inGate && !nowInGate) leftGate = true;
    inGate = nowInGate;
    prevProgress = progress;
    prevT = t;
    prevRaw = raw;
  }

  result.completedLaps = completedLaps;
  result.currentLap = currentLap;
  result.lap = currentLap;
  result.armed = armed;
  result.nextSector = nextSector;
  result.leftGate = leftGate;
  result.atGate = inGate;
  result.sectorTimesByLap = result.sectorTimesByLap.filter((l, i) => i === 0 || l.length > 0);
  const laps = result.lapTimes.map((l) => l.seconds).filter((s) => s > 0);
  if (laps.length) {
    result.lastLapSec = laps[laps.length - 1];
    result.bestLapSec = Math.min(...laps);
  }
  return result;
}

/** Current lap for the live label. 1 before the first full gate crossing. */
export function lapNumberFor(analysis) {
  if (!analysis || !analysis.gated) return null;
  return Math.max(1, Number(analysis.currentLap) || 1);
}

/** Fastest fully gated lap, or null. */
export function bestGatedLap(analysis) {
  return analysis && analysis.bestLapSec != null ? analysis.bestLapSec : null;
}
