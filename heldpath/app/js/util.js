/** Pure helpers for Heldpath. Safe to import from Node tests. */

export const WALK_MPH = 3;
export const RUN_MPH = 6;
export const METERS_PER_MILE = 1609.344;
export const METERS_PER_KM = 1000;

export const PR_DEFS = [
  { id: "1mi", label: "1 mile", meters: 1609.344 },
  { id: "5k", label: "5K", meters: 5000 },
  { id: "10k", label: "10K", meters: 10000 },
  { id: "half", label: "Half marathon", meters: 21097.5 },
  { id: "marathon", label: "Marathon", meters: 42195 },
];

export function activityMph(type) {
  return type === "run" ? RUN_MPH : WALK_MPH;
}

export function haversineMeters(a, b) {
  const R = 6371000;
  const toR = (d) => (d * Math.PI) / 180;
  const lat1 = toR(a.lat);
  const lat2 = toR(b.lat);
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function pathLengthMeters(coords) {
  let sum = 0;
  for (let i = 1; i < coords.length; i++) {
    sum += haversineMeters(coords[i - 1], coords[i]);
  }
  return sum;
}

export function legDistances(coords) {
  const legs = [];
  for (let i = 1; i < coords.length; i++) {
    legs.push({
      from: i - 1,
      to: i,
      meters: haversineMeters(coords[i - 1], coords[i]),
    });
  }
  return legs;
}

/** Destination given start, bearing degrees, distance meters. */
export function destination(lat, lon, bearingDeg, meters) {
  const R = 6371000;
  const br = (bearingDeg * Math.PI) / 180;
  const ang = meters / R;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(ang) + Math.cos(lat1) * Math.sin(ang) * Math.cos(br)
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(br) * Math.sin(ang) * Math.cos(lat1),
      Math.cos(ang) - Math.sin(lat1) * Math.sin(lat2)
    );
  return { lat: (lat2 * 180) / Math.PI, lon: (lon2 * 180) / Math.PI };
}

export function pointAlongPath(coords, meters) {
  if (!coords.length) return null;
  if (meters <= 0) return { ...coords[0], traveled: 0, remaining: pathLengthMeters(coords) };
  let left = meters;
  const total = pathLengthMeters(coords);
  for (let i = 1; i < coords.length; i++) {
    const seg = haversineMeters(coords[i - 1], coords[i]);
    if (left <= seg) {
      const t = seg === 0 ? 0 : left / seg;
      return {
        lat: coords[i - 1].lat + (coords[i].lat - coords[i - 1].lat) * t,
        lon: coords[i - 1].lon + (coords[i].lon - coords[i - 1].lon) * t,
        traveled: Math.min(meters, total),
        remaining: Math.max(0, total - meters),
      };
    }
    left -= seg;
  }
  const last = coords[coords.length - 1];
  return { ...last, traveled: total, remaining: 0 };
}

export function remainingAlongPath(coords, position) {
  const total = pathLengthMeters(coords);
  if (!coords.length) return { traveled: 0, remaining: 0, total };
  // Project onto the nearest segment, then remaining = from projection to end.
  let bestDist = Infinity;
  let traveledAtProj = 0;
  let acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1];
    const b = coords[i];
    const seg = haversineMeters(a, b);
    const proj = projectOnSegment(position, a, b);
    const d = haversineMeters(position, proj.point);
    if (d < bestDist) {
      bestDist = d;
      traveledAtProj = acc + proj.t * seg;
    }
    acc += seg;
  }
  const traveled = Math.min(total, Math.max(0, traveledAtProj));
  return { traveled, remaining: Math.max(0, total - traveled), total };
}

function projectOnSegment(p, a, b) {
  const midLat = ((a.lat + b.lat) / 2) * Math.PI / 180;
  const x = (lng) => lng * Math.cos(midLat);
  const ax = x(a.lon), ay = a.lat;
  const bx = x(b.lon), by = b.lat;
  const px = x(p.lon), py = p.lat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return { t, point: { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t } };
}

export function etaSeconds(meters, mph) {
  if (!meters || meters <= 0 || !mph) return 0;
  const miles = meters / METERS_PER_MILE;
  return Math.round((miles / mph) * 3600);
}

export function formatDistance(meters, units, { digits } = {}) {
  if (meters == null || Number.isNaN(meters)) return "";
  const d = digits == null ? (units === "km" ? 2 : 1) : digits;
  if (units === "km") {
    return `${(meters / METERS_PER_KM).toFixed(d)} km`;
  }
  return `${(meters / METERS_PER_MILE).toFixed(d)} mi`;
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** Human remaining time, e.g. "~16 min" or "~1 hr 10 min". */
export function formatEta(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  if (s < 30) return "~1 min";
  const mins = Math.round(s / 60);
  if (mins < 60) return `~${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return h === 1 ? "~1 hr" : `~${h} hr`;
  return `~${h} hr ${m} min`;
}

export function formatPace(meters, seconds, units) {
  if (!meters || meters <= 0 || !seconds || seconds <= 0) return "—";
  const dist = units === "km" ? meters / METERS_PER_KM : meters / METERS_PER_MILE;
  const secPer = seconds / dist;
  if (!Number.isFinite(secPer) || secPer > 3600 * 2) return "—";
  const m = Math.floor(secPer / 60);
  const s = Math.round(secPer % 60) % 60;
  const suffix = units === "km" ? "/km" : "/mi";
  return `${m}:${String(s).padStart(2, "0")} ${suffix}`;
}

/**
 * Lock-screen / live notification line.
 * On a course: "1.2 mi done · 0.8 mi left · ~16 min"
 * Off a course: "1.2 mi · 24:10 · 11:20 /mi"
 */
export function notificationText({ doneMeters, leftMeters, onCourse, elapsedSec, units, activityType, lapLabel }) {
  const done = formatDistance(doneMeters || 0, units);
  if (onCourse) {
    const left = Math.max(0, leftMeters || 0);
    const prefix = lapLabel ? `${lapLabel} · ` : "";
    if (left <= 8) {
      return `${prefix}${done} done · finished`;
    }
    const mph = activityMph(activityType);
    return `${prefix}${done} done · ${formatDistance(left, units)} left · ${formatEta(etaSeconds(left, mph))}`;
  }
  const time = formatDuration(elapsedSec || 0);
  const pace = formatPace(doneMeters, elapsedSec, units);
  return `${done} · ${time} · ${pace}`;
}

/** Fastest time to reach each PR distance in a single activity, from its GPS track or total. */
export function personalRecords(activities) {
  const best = {};
  for (const def of PR_DEFS) best[def.id] = null;
  for (const act of activities || []) {
    const times = splitTimes(act);
    for (const def of PR_DEFS) {
      const sec = times[def.id];
      if (sec == null) continue;
      if (!best[def.id] || sec < best[def.id].seconds) {
        best[def.id] = {
          seconds: sec,
          activityId: act.id,
          date: act.endedAt || act.startedAt,
          type: act.type,
        };
      }
    }
  }
  return best;
}

export function splitTimes(activity) {
  const out = {};
  const coords = (activity && activity.track) || [];
  const start = activity && activity.startedAt ? Date.parse(activity.startedAt) : 0;
  if (coords.length >= 2) {
    let acc = 0;
    for (let i = 1; i < coords.length; i++) {
      acc += haversineMeters(
        { lat: coords[i - 1].lat, lon: coords[i - 1].lon },
        { lat: coords[i].lat, lon: coords[i].lon }
      );
      const t = coords[i].t != null ? coords[i].t : null;
      for (const def of PR_DEFS) {
        if (out[def.id] != null) continue;
        if (acc >= def.meters) {
          if (t != null) out[def.id] = Math.round(t);
          else if (start && coords[i].at) out[def.id] = Math.round((Date.parse(coords[i].at) - start) / 1000);
          else if (activity.elapsedSec && activity.distanceMeters) {
            out[def.id] = Math.round(activity.elapsedSec * (def.meters / activity.distanceMeters));
          }
        }
      }
    }
  } else if (activity && activity.distanceMeters && activity.elapsedSec) {
    for (const def of PR_DEFS) {
      if (activity.distanceMeters >= def.meters) {
        out[def.id] = Math.round(activity.elapsedSec * (def.meters / activity.distanceMeters));
      }
    }
  }
  return out;
}

export function sumActivities(list) {
  let distanceMeters = 0;
  let elapsedSec = 0;
  for (const a of list || []) {
    distanceMeters += a.distanceMeters || 0;
    elapsedSec += a.elapsedSec || 0;
  }
  return { distanceMeters, elapsedSec, count: (list || []).length };
}

export function startOfDay(date, tzOffsetMin) {
  const d = new Date(date);
  // Use local date parts of the given Date object (box/user local).
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function isoDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function filterActivitiesByRange(activities, range, now = new Date()) {
  const end = startOfDay(now);
  end.setHours(23, 59, 59, 999);
  let start = new Date(0);
  if (range === "W") start = addDays(startOfDay(now), -6);
  else if (range === "M") start = addDays(startOfDay(now), -29);
  else if (range === "Y") {
    start = startOfDay(now);
    start.setFullYear(start.getFullYear() - 1);
    start = addDays(start, 1);
  }
  return (activities || []).filter((a) => {
    const t = Date.parse(a.endedAt || a.startedAt || 0);
    return t >= start.getTime() && t <= end.getTime();
  });
}

export function chartBuckets(activities, range, now = new Date()) {
  const buckets = [];
  let allYearly = false;
  if (range === "W") {
    for (let i = 6; i >= 0; i--) {
      const d = addDays(startOfDay(now), -i);
      buckets.push({ key: isoDate(d), label: d.toLocaleDateString("en-US", { weekday: "short" }), meters: 0 });
    }
  } else if (range === "M") {
    for (let i = 29; i >= 0; i--) {
      const d = addDays(startOfDay(now), -i);
      const label = i === 29 || i === 0 || (i % 7 === 0 && i < 23)
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "";
      buckets.push({ key: isoDate(d), label, meters: 0 });
    }
  } else if (range === "Y") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: d.toLocaleDateString("en-US", { month: "short" }), meters: 0 });
    }
  } else {
    // All: one bucket per month from first activity, or last 12 if none.
    // Long histories switch to one bucket per year so the chart stays readable.
    const acts = activities || [];
    if (!acts.length) return [];
    const times = acts.map((a) => Date.parse(a.endedAt || a.startedAt || 0)).filter(Boolean);
    const min = new Date(Math.min(...times));
    const start = new Date(min.getFullYear(), min.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSpan =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth()) +
      1;
    allYearly = monthSpan > 24;
    if (allYearly) {
      const years = now.getFullYear() - start.getFullYear() + 1;
      const step = years > 24 ? 5 : years > 16 ? 2 : 1;
      for (let y = start.getFullYear(); y <= now.getFullYear(); y++) {
        const idx = y - start.getFullYear();
        buckets.push({
          key: String(y),
          label: idx % step === 0 || idx === years - 1 ? String(y) : "",
          meters: 0,
        });
      }
    } else {
      const cursor = new Date(start);
      let monthIndex = 0;
      const dense = monthSpan <= 6;
      while (cursor <= end) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
        const first = monthIndex === 0;
        const january = cursor.getMonth() === 0;
        const show = dense || first || january || monthIndex % 3 === 0;
        buckets.push({
          key,
          label: show
            ? first || january
              ? `${cursor.toLocaleDateString("en-US", { month: "short" })} '${String(cursor.getFullYear()).slice(-2)}`
              : cursor.toLocaleDateString("en-US", { month: "short" })
            : "",
          meters: 0,
        });
        monthIndex++;
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }
  }
  for (const a of activities || []) {
    const dt = new Date(a.endedAt || a.startedAt || 0);
    let key;
    if (range === "W" || range === "M") key = isoDate(dt);
    else if (range === "All" && allYearly) key = String(dt.getFullYear());
    else key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const b = buckets.find((x) => x.key === key);
    if (b) b.meters += a.distanceMeters || 0;
  }
  return buckets;
}

export function monthGrid(year, month) {
  // week rows starting Sunday, cells { date, inMonth, iso }
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  const rows = [];
  let cursor = start;
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      row.push({
        date: new Date(cursor),
        inMonth: cursor.getMonth() === month,
        iso: isoDate(cursor),
      });
      cursor = addDays(cursor, 1);
    }
    rows.push(row);
    if (cursor.getMonth() !== month && w >= 3) break;
  }
  return rows;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

/** Escape text before it goes into innerHTML. */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export const SUPPORT_COPY =
  "Totally optional. This $5 donation just helps keep the app free. Everything in the app is and always will be free, and donating doesn't unlock anything.";
