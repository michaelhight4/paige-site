import {
  destination,
  pathLengthMeters,
  pointAlongPath,
  METERS_PER_MILE,
  isoDate,
  addDays,
  startOfDay,
  etaSeconds,
  activityMph,
} from "./util.js";
import { newCourse, newActivity, newPlan } from "./storage.js";

const ORIGIN = { lat: 43.7694, lon: 11.2478 };

/** A ~2.0 mile loop in the Florence starter map, 5 pins. */
export function arnoLoopPins() {
  const target = 2.0 * METERS_PER_MILE;
  const side = target / 4;
  const bearings = [92, 175, 272, 355];
  const pins = [{ lat: ORIGIN.lat, lon: ORIGIN.lon, role: "start" }];
  let cur = { ...ORIGIN };
  for (let i = 0; i < 3; i++) {
    cur = destination(cur.lat, cur.lon, bearings[i], side);
    pins.push({ lat: cur.lat, lon: cur.lon, role: "via" });
  }
  pins.push({ lat: ORIGIN.lat, lon: ORIGIN.lon, role: "end" });
  return pins;
}

export function courseLength(pins) {
  return pathLengthMeters(pins);
}

function trackAlong(pins, meters, elapsedSec) {
  const n = 16;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const m = (meters * i) / n;
    const p = pointAlongPath(pins, m);
    pts.push({
      lat: p.lat,
      lon: p.lon,
      t: Math.round((elapsedSec * i) / n),
      at: null,
    });
  }
  return pts;
}

export function seedDemo(state, now = new Date()) {
  const pins = arnoLoopPins();
  const loop = newCourse({ name: "Arno Loop", pins });
  const river = newCourse({
    name: "River Walk",
    pins: pins.slice(0, 3).concat([
      { ...destination(pins[2].lat, pins[2].lon, 200, 400), role: "end" },
    ]),
  });
  state.courses = [loop, river];

  const day = (offset, hour, min = 0) => {
    const d = addDays(startOfDay(now), offset);
    d.setHours(hour, min, 0, 0);
    return d;
  };

  const mk = (offset, hour, type, meters, sec, course, startOff = 0) => {
    const started = day(offset, hour);
    const ended = new Date(started.getTime() + sec * 1000);
    const track = trackAlong(course.pins, meters, sec);
    const startIso = started.toISOString();
    track.forEach((p) => {
      p.at = new Date(started.getTime() + p.t * 1000).toISOString();
    });
    return newActivity({
      type,
      courseId: course.id,
      courseName: course.name,
      startedAt: startIso,
      endedAt: ended.toISOString(),
      distanceMeters: meters,
      elapsedSec: sec,
      track,
      source: "phone",
    });
  };

  // History over the last month so W/M/Y charts have shape.
  state.activities = [
    mk(-26, 7, "walk", 3200, 38 * 60, river),
    mk(-21, 8, "run", 5000, 28 * 60 + 20, loop), // 5K PR
    mk(-18, 18, "walk", 2400, 28 * 60, river),
    mk(-14, 7, "run", 1609, 7 * 60 + 48, loop), // 1 mile PR
    mk(-11, 12, "walk", 4000, 46 * 60, loop),
    mk(-8, 8, "run", 6500, 36 * 60, loop),
    mk(-5, 17, "walk", 2800, 33 * 60, river), // Sun if today Fri: -5 is Sun
    mk(-2, 7, "walk", 2100, 25 * 60, loop), // Wed
    mk(-1, 18, "run", 4200, 24 * 60, loop), // Thu
  ];

  // Saturday planned walk on Arno Loop.
  const sat = isoDate(addDays(startOfDay(now), 1));
  state.plans = [
    newPlan({
      date: sat,
      courseId: loop.id,
      courseName: loop.name,
      activityType: "walk",
    }),
  ];
  state.settings.demo = true;
  state.settings.mapPackInstalled = true;
  state.settings.seenMapPrompt = true;
  return state;
}

/** Frozen mid-course walk: 1.2 mi done, 0.8 mi left, ~16 min at 3 mph. */
export function midCourseWalk(course, units = "mi") {
  const done = 1.2 * METERS_PER_MILE;
  const elapsed = 24 * 60;
  const start = new Date(Date.now() - elapsed * 1000);
  const track = trackAlong(course.pins, done, elapsed);
  track.forEach((p) => {
    p.at = new Date(start.getTime() + p.t * 1000).toISOString();
  });
  return {
    type: "walk",
    courseId: course.id,
    courseName: course.name,
    coursePins: course.pins.slice(),
    units,
    startedAt: start.toISOString(),
    paused: false,
    pausedAcc: 0,
    pauseStarted: null,
    track,
    distanceMeters: done,
    elapsedSec: elapsed,
  };
}

export { ORIGIN, etaSeconds, activityMph };
