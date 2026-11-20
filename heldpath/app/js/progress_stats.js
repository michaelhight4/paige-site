/**
 * Pure Progress helpers: streaks, summaries, chart scaling and achievements.
 * Safe to import from Node tests and from the browser bundle.
 */
import {
  addDays,
  formatDistance,
  isoDate,
  startOfDay,
  METERS_PER_MILE,
} from "./util.js";

export function activityDayKey(activity) {
  if (!activity) return null;
  const t = Date.parse(activity.endedAt || activity.startedAt || 0);
  if (!Number.isFinite(t)) return null;
  return isoDate(new Date(t));
}

/** Sorted unique local calendar days with at least one activity. */
export function activeDayKeys(activities) {
  const set = new Set();
  for (const a of activities || []) {
    const key = activityDayKey(a);
    if (key) set.add(key);
  }
  return [...set].sort();
}

/**
 * Day streak. A day counts once no matter how many walks it has.
 * "Current" keeps counting from today, or from yesterday when today is still open.
 */
export function computeStreak(activities, now = new Date()) {
  const days = activeDayKeys(activities);
  const set = new Set(days);
  let current = 0;
  if (days.length) {
    let cursor = startOfDay(now);
    if (!set.has(isoDate(cursor))) cursor = addDays(cursor, -1);
    while (set.has(isoDate(cursor))) {
      current++;
      cursor = addDays(cursor, -1);
    }
  }
  let longest = days.length ? 1 : 0;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1] + "T12:00:00");
    if (isoDate(addDays(prev, 1)) === days[i]) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }
  return {
    current,
    longest,
    activeDays: days.length,
    lastDay: days.length ? days[days.length - 1] : null,
  };
}

function parseTime(a) {
  return Date.parse(a.endedAt || a.startedAt || 0);
}

export function summarizeActivities(activities, now = new Date()) {
  const list = activities || [];
  let distanceMeters = 0;
  let elapsedSec = 0;
  let walks = 0;
  let runs = 0;
  let longestMeters = 0;
  let firstAt = null;
  let lastAt = null;
  for (const a of list) {
    distanceMeters += a.distanceMeters || 0;
    elapsedSec += a.elapsedSec || 0;
    if ((a.type || "walk") === "run") runs++;
    else walks++;
    if ((a.distanceMeters || 0) > longestMeters) longestMeters = a.distanceMeters || 0;
    const t = parseTime(a);
    if (Number.isFinite(t)) {
      if (!firstAt || t < firstAt) firstAt = t;
      if (!lastAt || t > lastAt) lastAt = t;
    }
  }
  const streak = computeStreak(list, now);
  return {
    count: list.length,
    distanceMeters,
    elapsedSec,
    walks,
    runs,
    longestMeters,
    activeDays: streak.activeDays,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    lastDay: streak.lastDay,
    firstAt,
    lastAt,
  };
}

/** Round a chart maximum up to a friendly 1 / 2 / 2.5 / 5 / 10 step. */
export function niceChartMax(meters) {
  const m = Number(meters) || 0;
  if (m <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(m)));
  const norm = m / mag;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return nice * mag;
}

function shortDistance(meters, units) {
  const v = units === "km" ? meters / 1000 : meters / METERS_PER_MILE;
  const digits = v >= 10 ? 0 : 1;
  return v.toFixed(digits).replace(/\.0$/, "");
}

/** Zero / half / full axis ticks for the distance chart. */
export function chartTicks(maxMeters, units = "mi") {
  const max = niceChartMax(maxMeters);
  const half = max / 2;
  return {
    max,
    ticks: [
      { value: 0, label: "0" },
      { value: half, label: shortDistance(half, units) },
      { value: max, label: `${shortDistance(max, units)} ${units}` },
    ],
  };
}

const CHECK_EARLY_HOUR = 8;
const CHECK_LATE_HOUR = 20;

function earlyBirdCount(activities) {
  return (activities || []).filter((a) => {
    const t = Date.parse(a.startedAt || a.endedAt || 0);
    if (!Number.isFinite(t)) return false;
    return new Date(t).getHours() < CHECK_EARLY_HOUR;
  }).length;
}

function nightOwlCount(activities) {
  return (activities || []).filter((a) => {
    const t = Date.parse(a.startedAt || a.endedAt || 0);
    if (!Number.isFinite(t)) return false;
    return new Date(t).getHours() >= CHECK_LATE_HOUR;
  }).length;
}

function weekendCount(activities) {
  return (activities || []).filter((a) => {
    const t = Date.parse(a.startedAt || a.endedAt || 0);
    if (!Number.isFinite(t)) return false;
    const day = new Date(t).getDay();
    return day === 0 || day === 6;
  }).length;
}

function maxActivitiesInDay(activities) {
  const counts = {};
  let max = 0;
  for (const a of activities || []) {
    const key = activityDayKey(a);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
    if (counts[key] > max) max = counts[key];
  }
  return max;
}

/**
 * Earned / locked achievements. Each row is deterministic and easy to explain.
 * Distance goals follow the user's units so the copy never mixes miles and km.
 */
export function evaluateAchievements(activities, { units = "mi", now = new Date() } = {}) {
  const summary = summarizeActivities(activities, now);
  const bigGoal = units === "km" ? 80000 : 50 * METERS_PER_MILE;
  const bigLabel = units === "km" ? "80 km" : "50 miles";
  const defs = [
    {
      id: "first_walk",
      title: "First Steps",
      desc: "Finish your first walk",
      value: summary.walks,
      goal: 1,
    },
    {
      id: "first_run",
      title: "First Run",
      desc: "Finish your first run",
      value: summary.runs,
      goal: 1,
    },
    {
      id: "five_k",
      title: "5K Club",
      desc: "Cover 5 km in one activity",
      value: summary.longestMeters,
      goal: 5000,
      distance: true,
    },
    {
      id: "ten_k",
      title: "10K Day",
      desc: "Cover 10 km in one activity",
      value: summary.longestMeters,
      goal: 10000,
      distance: true,
    },
    {
      id: "ten_outings",
      title: "Out There",
      desc: "Finish 10 walks or runs",
      value: summary.count,
      goal: 10,
    },
    {
      id: "fifty",
      title: "Big Miles",
      desc: `Cover ${bigLabel} in total`,
      value: summary.distanceMeters,
      goal: bigGoal,
      distance: true,
    },
    {
      id: "streak_7",
      title: "Seven in a Row",
      desc: "Move on 7 days in a row",
      value: summary.longestStreak,
      goal: 7,
    },
    {
      id: "weekender",
      title: "Weekender",
      desc: "Move on a Saturday or Sunday",
      value: weekendCount(activities),
      goal: 1,
      simple: true,
    },
    {
      id: "double_day",
      title: "Double Day",
      desc: "Finish two activities in one day",
      value: maxActivitiesInDay(activities),
      goal: 2,
    },
    {
      id: "all_rounder",
      title: "All-Rounder",
      desc: "Finish both a walk and a run",
      value: (summary.walks > 0 ? 1 : 0) + (summary.runs > 0 ? 1 : 0),
      goal: 2,
    },
    {
      id: "early_bird",
      title: "Early Bird",
      desc: "Start before 8 in the morning",
      value: earlyBirdCount(activities),
      goal: 1,
      simple: true,
    },
    {
      id: "night_owl",
      title: "Night Owl",
      desc: "Start a walk or run after 8pm",
      value: nightOwlCount(activities),
      goal: 1,
      simple: true,
    },
  ];
  return defs.map((d) => {
    const value = Math.max(0, d.value || 0);
    const earned = value >= d.goal;
    let progress;
    if (earned) progress = "Earned";
    else if (d.simple) progress = "Not yet";
    else if (d.distance) {
      const done = Math.min(value, d.goal);
      progress = `${formatDistance(done, units, { digits: 1 })} of ${formatDistance(d.goal, units, { digits: 1 })}`;
    } else {
      progress = `${Math.min(value, d.goal)} of ${d.goal}`;
    }
    return { ...d, earned, progress };
  });
}
