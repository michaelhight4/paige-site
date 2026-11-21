/**
 * Matched loops — cluster repeated efforts on the same private course.
 *
 * A match is deliberately geographic and local: same sport, similar start
 * and finish, similar distance, and (when available) a similar opening
 * bearing. Nothing leaves the phone. Sector PBs stay in sector_timing.js;
 * this module adds the course-level trend across matched efforts.
 */
import { haversineMeters, METERS_PER_MILE } from "./util.js";

export const MATCH_START_M = 250;
export const MATCH_DISTANCE_RATIO = 0.12;
export const MATCH_MIN_CLOSED_M = 200;

export function sportOf(activity) {
  const raw = String((activity && activity.type) || "walk").toLowerCase();
  if (raw === "ride" || raw === "bike" || raw === "cycle" || raw === "cycling") return "ride";
  if (raw === "run" || raw === "running") return "run";
  return "walk";
}

export function sportLabel(sport) {
  if (sport === "ride") return "Ride";
  if (sport === "run") return "Run";
  return "Walk";
}

function validPoint(p) {
  return p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon));
}

export function activityTime(activity) {
  const t = Date.parse((activity && (activity.startedAt || activity.endedAt)) || "");
  return Number.isFinite(t) ? t : 0;
}

export function bearingDegrees(a, b) {
  const lat1 = (Number(a.lat) * Math.PI) / 180;
  const lat2 = (Number(b.lat) * Math.PI) / 180;
  const dLon = ((Number(b.lon) - Number(a.lon)) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function bearingDelta(a, b) {
  const d = Math.abs(Number(a) - Number(b)) % 360;
  return d > 180 ? 360 - d : d;
}

/** Compact facts about one effort, used for matching and trends. */
export function loopFacts(activity) {
  if (!activity) return null;
  const track = (activity.track || []).filter(validPoint);
  const meters = Number(activity.distanceMeters) || 0;
  if (track.length < 2 || meters <= 0) return null;
  const start = track[0];
  const end = track[track.length - 1];
  const startEndM = haversineMeters(start, end);
  const closed = startEndM <= Math.max(MATCH_MIN_CLOSED_M, meters * 0.12);
  const look = track[Math.min(3, track.length - 1)];
  const startBearing = look && look !== start ? bearingDegrees(start, look) : null;
  const back = track[Math.max(0, track.length - 4)];
  const endBearing = back && back !== end ? bearingDegrees(back, end) : null;
  return {
    id: activity.id || null,
    sport: sportOf(activity),
    courseId: activity.courseId || null,
    courseName: activity.courseName || "",
    start: { lat: Number(start.lat), lon: Number(start.lon) },
    end: { lat: Number(end.lat), lon: Number(end.lon) },
    meters,
    durationSec: Math.max(0, Number(activity.elapsedSec) || 0),
    startEndM,
    closed,
    startBearing,
    endBearing,
    at: activityTime(activity),
    date: activity.startedAt || activity.endedAt || null,
  };
}

/** Same loop? Geographic tolerance, distance similarity and opening bearing. */
export function sameLoop(a, b, opts = {}) {
  if (!a || !b) return false;
  if (a.sport !== b.sport) return false;
  if (!a.closed || !b.closed) return false;
  const startTol = Number(opts.startM) > 0 ? Number(opts.startM) : MATCH_START_M;
  const endTol = Number(opts.endM) > 0 ? Number(opts.endM) : startTol;
  if (haversineMeters(a.start, b.start) > startTol) return false;
  if (haversineMeters(a.end, b.end) > endTol) return false;
  const small = Math.min(a.meters, b.meters);
  const big = Math.max(a.meters, b.meters);
  const ratio = Number(opts.distanceRatio) > 0 ? Number(opts.distanceRatio) : MATCH_DISTANCE_RATIO;
  if (small <= 0 || big / small > 1 + ratio) return false;
  if (a.startBearing != null && b.startBearing != null && bearingDelta(a.startBearing, b.startBearing) > 75) return false;
  return true;
}

function mostCommon(values) {
  const counts = new Map();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  let best = "";
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) { best = v; bestN = n; }
  }
  return best;
}

function median(values) {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return 0;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2;
}

function groupName(facts) {
  const course = mostCommon(facts.map((f) => f.courseName));
  if (course) return course;
  const sport = sportLabel(facts[0] && facts[0].sport);
  const km = median(facts.map((f) => f.meters)) / 1000;
  return `${sport} loop · ${km.toFixed(1)} km`;
}

/**
 * Cluster activities into matched loops. Groups need at least two efforts.
 * The newest, longest group comes first.
 */
export function matchedLoops(activities, opts = {}) {
  const minCount = Number(opts.minCount) > 0 ? Number(opts.minCount) : 2;
  const facts = (activities || []).map(loopFacts).filter(Boolean).filter((f) => f.closed);
  facts.sort((a, b) => a.at - b.at);
  const groups = [];
  for (const fact of facts) {
    let group = groups.find((g) => sameLoop(g.facts[0], fact, opts));
    if (!group) {
      group = { id: `loop-${fact.id || groups.length}`, facts: [] };
      groups.push(group);
    }
    group.facts.push(fact);
  }
  const out = groups
    .filter((g) => g.facts.length >= minCount)
    .map((g) => {
      const list = g.facts.slice().sort((a, b) => a.at - b.at);
      const first = list[0];
      return {
        id: g.id,
        name: groupName(list),
        sport: first.sport,
        count: list.length,
        distanceMeters: median(list.map((f) => f.meters)),
        firstAt: first.at,
        lastAt: list[list.length - 1].at,
        start: { ...first.start },
        end: { ...first.end },
        courseIds: Array.from(new Set(list.map((f) => f.courseId).filter(Boolean))),
        activityIds: list.map((f) => f.id).filter(Boolean),
        efforts: list,
      };
    });
  out.sort((a, b) => (b.lastAt - a.lastAt) || (b.count - a.count));
  return out;
}

function unitMeters(units) {
  return units === "km" ? 1000 : METERS_PER_MILE;
}

/**
 * Pace (walk/run) or speed (ride) over time for one matched loop.
 * `deltaSec` is latest minus first for pace (negative = faster);
 * `deltaSpeed` is latest minus first for ride speed (positive = faster).
 */
export function trendSeries(group, { units = "mi" } = {}) {
  const efforts = ((group && group.efforts) || [])
    .filter((f) => f.meters > 0 && f.durationSec > 0)
    .slice()
    .sort((a, b) => a.at - b.at);
  const uM = unitMeters(units);
  const isRide = group && group.sport === "ride";
  const points = efforts.map((f) => ({
    activityId: f.id,
    at: f.at,
    date: f.date,
    meters: f.meters,
    durationSec: f.durationSec,
    paceSecPerUnit: f.durationSec / (f.meters / uM),
    speedPerHour: f.meters / 1000 / (f.durationSec / 3600),
  }));
  const first = points[0] || null;
  const last = points.length ? points[points.length - 1] : null;
  return {
    metric: isRide ? "speed" : "pace",
    unitLabel: isRide ? "km/h" : `/${units === "km" ? "km" : "mi"}`,
    lowerIsBetter: !isRide,
    points,
    first,
    last,
    deltaSec: first && last ? last.paceSecPerUnit - first.paceSecPerUnit : 0,
    deltaSpeed: first && last ? last.speedPerHour - first.speedPerHour : 0,
    improves: first && last ? (isRide ? last.speedPerHour > first.speedPerHour : last.paceSecPerUnit < first.paceSecPerUnit) : false,
  };
}

function shortPace(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** One plain line for a matched-loop row. */
export function formatTrend(group, { units = "mi" } = {}) {
  const series = trendSeries(group, { units });
  const count = (group && group.count) || series.points.length;
  const km = Math.round(((group && group.distanceMeters) || 0) / 100) / 10;
  const head = `${count} ${sportLabel(group && group.sport).toLowerCase()}s on the same loop · ${km.toFixed(1)} km`;
  if (series.points.length < 2 || !series.last) return `${head} · first effort`;
  if (series.metric === "speed") {
    const delta = series.deltaSpeed;
    const tail = Math.abs(delta) < 0.05
      ? "same speed as the first"
      : `${Math.abs(delta).toFixed(1)} km/h ${delta > 0 ? "faster" : "slower"} than the first`;
    return `${head} · ${series.last.speedPerHour.toFixed(1)} km/h · ${tail}`;
  }
  const delta = series.deltaSec;
  const tail = Math.abs(delta) < 0.5
    ? "same pace as the first"
    : `${Math.abs(Math.round(delta))}s ${delta < 0 ? "faster" : "slower"} than the first`;
  return `${head} · ${shortPace(series.last.paceSecPerUnit)}${series.unitLabel} · ${tail}`;
}

/** Find the matched-loop group that contains an activity, if any. */
export function matchedGroupForActivity(groups, activityId) {
  if (!activityId) return null;
  return (groups || []).find((g) => (g.activityIds || []).includes(activityId)) || null;
}

export function trendLabel(series) {
  if (!series || !series.points || series.points.length < 2) return "Needs a second effort";
  if (series.metric === "speed") return series.deltaSpeed > 0 ? "Trending faster" : series.deltaSpeed < 0 ? "Trending slower" : "Holding steady";
  return series.deltaSec < 0 ? "Trending faster" : series.deltaSec > 0 ? "Trending slower" : "Holding steady";
}
