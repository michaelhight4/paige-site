/**
 * Free per-leg splits and personal bests for saved courses.
 *
 * A "leg" is the stretch between two pins of a saved course. Splits are
 * measured from the activity's own GPS track by projecting each fix onto the
 * course and reading the elapsed time at every pin. If a watch import has
 * distance and time but no route, the total is shared across the legs by
 * distance, and only a finished course records bests.
 *
 * This module is pure and safe to import from Node tests.
 * It extends util.legDistances / util.remainingAlongPath / util.splitTimes.
 * Split *targets* (the weekly-faster plan engine) live in plan_progress.js and
 * are deliberately not part of this file.
 */
import {
  formatDuration,
  formatPace,
  legDistances,
  pathLengthMeters,
  remainingAlongPath,
} from "./util.js";

export function pinLabel(index, pinCount) {
  if (index <= 0) return "Start";
  if (index >= pinCount - 1) return "End";
  return `Pin ${index + 1}`;
}

export function legLabel(index, pinCount) {
  return `${pinLabel(index, pinCount)} → ${pinLabel(index + 1, pinCount)}`;
}

/** Course pins as legs with cumulative distances, e.g. [{from,to,meters,...}]. */
export function courseLegs(course) {
  const pins = (course && course.pins) || [];
  if (pins.length < 2) return [];
  let acc = 0;
  return legDistances(pins).map((leg, index) => {
    const startMeters = acc;
    acc += leg.meters;
    return {
      ...leg,
      index,
      label: legLabel(index, pins.length),
      startMeters,
      endMeters: acc,
    };
  });
}

function toleranceFor(totalMeters) {
  return Math.max(10, totalMeters * 0.01);
}

/**
 * Track fixes projected onto the course, with a monotonic distance so a
 * back-and-forth GPS wobble cannot rewind progress.
 */
function progressSamples(activity, pins, totalMeters) {
  const track = (activity && activity.track) || [];
  const started = activity && activity.startedAt ? Date.parse(activity.startedAt) : 0;
  const samples = [];
  let maxTraveled = 0;
  for (const point of track) {
    if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) continue;
    let seconds = null;
    if (Number.isFinite(point.t)) seconds = point.t;
    else if (point.at && started) seconds = (Date.parse(point.at) - started) / 1000;
    if (seconds == null || !Number.isFinite(seconds) || seconds < 0) continue;
    const r = remainingAlongPath(pins, { lat: point.lat, lon: point.lon });
    const traveled = Math.max(maxTraveled, Math.min(totalMeters, Math.max(0, r.traveled)));
    maxTraveled = traveled;
    samples.push({ traveled, seconds });
  }
  return { samples, maxTraveled };
}

function timeAtDistance(samples, meters) {
  if (meters <= 0) return 0;
  let prev = { traveled: 0, seconds: 0 };
  for (const sample of samples) {
    if (sample.traveled >= meters) {
      if (sample.traveled <= prev.traveled) return sample.seconds;
      const f = (meters - prev.traveled) / (sample.traveled - prev.traveled);
      return prev.seconds + f * (sample.seconds - prev.seconds);
    }
    prev = sample;
  }
  return samples.length ? samples[samples.length - 1].seconds : null;
}

function emptyResult(legs, basis, totalMeters) {
  return {
    legs: legs.map((leg) => ({
      ...leg,
      seconds: null,
      complete: false,
      pace: "—",
    })),
    complete: false,
    basis,
    totalMeters,
  };
}

/**
 * Per-leg splits for one completed (or partial) activity on a saved course.
 *
 * @returns {{
 *   legs: Array<{index:number,label:string,meters:number,seconds:number|null,complete:boolean,pace:string}>,
 *   complete: boolean, basis: "gps"|"prorated"|"none", totalMeters: number
 * }}
 */
export function activityLegSplits(activity, course) {
  const pins = (course && course.pins) || [];
  const legs = courseLegs(course);
  if (!activity || legs.length === 0) return { legs: [], complete: false, basis: "none", totalMeters: 0 };
  if (activity.courseId && course.id && activity.courseId !== course.id) {
    return { legs: [], complete: false, basis: "none", totalMeters: 0 };
  }

  const totalMeters = pathLengthMeters(pins);
  if (totalMeters <= 0) return { legs: [], complete: false, basis: "none", totalMeters: 0 };
  const tolerance = toleranceFor(totalMeters);
  const { samples, maxTraveled } = progressSamples(activity, pins, totalMeters);
  const distance = Number(activity.distanceMeters) || 0;
  const elapsed = Number(activity.elapsedSec) || 0;
  const useGps = samples.length >= 2 && maxTraveled > 5;

  if (useGps) {
    // A closed loop ends at its own start pin, so the final projection can
    // read 0. If the recorded distance covered the course, snap the last
    // sample to the finish and let the final leg close.
    let effectiveMax = maxTraveled;
    if (distance >= totalMeters - tolerance && maxTraveled < totalMeters - 0.5) {
      const secondsAtMax = timeAtDistance(samples, maxTraveled);
      const secondsAtFinish = elapsed > 0 ? (elapsed * totalMeters) / distance : samples[samples.length - 1].seconds;
      samples.push({
        traveled: totalMeters,
        seconds: Math.max(secondsAtMax == null ? 0 : secondsAtMax, secondsAtFinish),
      });
      effectiveMax = totalMeters;
    }
    const complete = effectiveMax >= totalMeters - tolerance;
    const out = legs.map((leg) => {
      const crossed = leg.endMeters <= effectiveMax + 0.5;
      const seconds = crossed ? Math.max(0, timeAtDistance(samples, leg.endMeters) - timeAtDistance(samples, leg.startMeters)) : null;
      return {
        ...leg,
        seconds: seconds == null ? null : Math.round(seconds),
        complete: crossed,
        pace: seconds ? formatPace(leg.meters, seconds) : "—",
      };
    });
    return { legs: out, complete, basis: "gps", totalMeters };
  }

  // No usable route (watch import, treadmill, GPS denied): share a finished
  // total by distance. Never invent a finish: distance must cover the course.
  if (distance >= totalMeters - tolerance && elapsed > 0) {
    let acc = 0;
    const out = legs.map((leg) => {
      const seconds = Math.round(elapsed * (leg.meters / totalMeters));
      acc += seconds;
      return { ...leg, seconds, complete: true, pace: formatPace(leg.meters, seconds) };
    });
    // Put any rounding remainder on the final leg so the total matches.
    const drift = Math.round(elapsed) - acc;
    if (out.length && drift !== 0) {
      out[out.length - 1].seconds += drift;
      out[out.length - 1].pace = formatPace(out[out.length - 1].meters, out[out.length - 1].seconds);
    }
    return { legs: out, complete: true, basis: "prorated", totalMeters };
  }

  return emptyResult(legs, "none", totalMeters);
}

/**
 * Update the saved course's per-leg bests from one activity.
 * Only complete legs can set a best. Mutates course.legPbs.
 *
 * @returns {{legs:Array, complete:boolean, basis:string, newBests:Array, pbs:object}}
 */
export function updateCourseLegPbs(course, activity) {
  const result = activityLegSplits(activity, course);
  if (!course || result.legs.length === 0) {
    return { ...result, newBests: [], pbs: (course && course.legPbs) || {} };
  }
  if (!course.legPbs || typeof course.legPbs !== "object") course.legPbs = {};
  const newBests = [];
  for (const leg of result.legs) {
    if (!leg.complete || leg.seconds == null || leg.seconds <= 0) continue;
    const previous = course.legPbs[leg.index] || null;
    if (!previous || leg.seconds < previous.seconds) {
      course.legPbs[leg.index] = {
        seconds: leg.seconds,
        activityId: activity.id || null,
        date: activity.endedAt || activity.startedAt || new Date().toISOString(),
      };
      newBests.push({ ...leg, previous });
    }
  }
  return { ...result, newBests, pbs: course.legPbs };
}

/** Course leg rows with the stored best for the course detail screen. */
export function courseLegSummary(course) {
  const pbs = (course && course.legPbs) || {};
  return courseLegs(course).map((leg) => {
    const best = pbs[leg.index] || null;
    return {
      ...leg,
      bestSeconds: best ? best.seconds : null,
      bestDate: best ? best.date : null,
      bestActivityId: best ? best.activityId : null,
    };
  });
}

/** Rows for the post-run summary, including which legs set a new best. */
export function splitRows(course, result) {
  const pbs = (course && course.legPbs) || {};
  const newBests = (result && result.newBests) || [];
  const legs = (result && result.legs) || courseLegs(course).map((leg) => ({
    ...leg,
    seconds: null,
    complete: false,
    pace: "—",
  }));
  return legs.map((leg, index) => {
    const best = pbs[index] || null;
    const previous = newBests.find((b) => b.index === index) || null;
    return {
      ...leg,
      bestSeconds: best ? best.seconds : null,
      bestDate: best ? best.date : null,
      isNewBest: !!previous,
      previousBestSeconds: previous && previous.previous ? previous.previous.seconds : null,
    };
  });
}

/** e.g. "5 of 6 legs complete" — short, honest status for the summary. */
export function splitsStatus(result) {
  if (!result || !result.legs || result.legs.length === 0) return "No course splits for this activity.";
  const done = result.legs.filter((leg) => leg.complete).length;
  if (result.complete) return `${done} of ${result.legs.length} legs complete · whole course finished`;
  return `${done} of ${result.legs.length} legs complete · course not finished`;
}

export function formatLegTime(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  return formatDuration(seconds);
}
