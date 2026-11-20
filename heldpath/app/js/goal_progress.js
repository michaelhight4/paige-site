/**
 * Progress graph and permanent week/month history for a free route goal,
 * a paid plan, or overall Stats.
 *
 * Time / speed goals: Y is run time (lower is better).
 * Distance goals: Y is distance per run (higher is better).
 * Current weekly/monthly averages are a single flat line and RESET at the
 * calendar week (Monday, or the locale's week start) and calendar month.
 * With no runs yet this week or month, that line is hidden and the legend
 * shows an em dash. Historical week/month rows are kept from all saved runs.
 *
 * The session series is the only connected/bar series: one red point or bar
 * per run (X = session 1, 2, 3…). Goal, weekly, and monthly are flat lines.
 * Chart style (line | bar) is remembered on the device.
 */
import { formatDuration, formatPace, formatDistance, METERS_PER_MILE, METERS_PER_KM, isoDate } from "./util.js";

export const CHART_STYLE_KEY = "heldpath.goal-chart-style.v1";

export function paceSecPerUnit(meters, seconds, units = "mi") {
  if (!(meters > 0) || !(seconds > 0)) return null;
  const dist = units === "km" ? meters / METERS_PER_KM : meters / METERS_PER_MILE;
  const pace = seconds / dist;
  return Number.isFinite(pace) && pace > 0 && pace < 3600 * 3 ? pace : null;
}

export function dayKey(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return isoDate(d);
}

/**
 * JS weekday (0 = Sunday … 6 = Saturday). Defaults to Monday when the
 * locale does not publish a week start. Intl weekInfo.firstDay is 1–7
 * (Monday–Sunday).
 */
export function weekStartsOn(locale) {
  try {
    const loc = new Intl.Locale(String(locale || defaultLocale()));
    const fd = loc.weekInfo && loc.weekInfo.firstDay;
    if (fd === 7) return 0;
    if (fd >= 1 && fd <= 6) return fd;
  } catch { /* ignore */ }
  return 1;
}

function defaultLocale() {
  try {
    if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  } catch { /* ignore */ }
  return "en-GB";
}

export function startOfCalendarWeek(date, { locale, weekStart } = {}) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  const start = weekStart != null ? weekStart : weekStartsOn(locale);
  const diff = (d.getDay() - start + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfCalendarMonth(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

export function weekKeyFor(date, opts) {
  const start = startOfCalendarWeek(date, opts);
  return start ? isoDate(start) : "";
}

export function monthKeyFor(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function inCurrentWeek(day, now, opts) {
  const a = startOfCalendarWeek(day + "T12:00:00", opts);
  const b = startOfCalendarWeek(now, opts);
  return !!(a && b && a.getTime() === b.getTime());
}

export function inCurrentMonth(day, now) {
  return monthKeyFor(day + "T12:00:00") === monthKeyFor(now);
}

/** "time" (speed / finish-time goals) or "distance". */
export function metricForGoal(goal, plan) {
  if (goal && (goal.kind === "distance" || goal.metric === "distance")) return "distance";
  if (goal && (goal.kind === "time" || goal.kind === "pace" || goal.kind === "speed" || goal.finishSec > 0 || goal.paceSecPerMile > 0)) {
    return "time";
  }
  const kind = plan && plan.goal && plan.goal.kind;
  if (kind === "distance") return "distance";
  if (kind === "time" || kind === "both") return "time";
  if (plan && plan.goal && plan.goal.durationSec > 0 && !(plan.goal.distanceMeters > 0)) return "time";
  if (plan && plan.goal && plan.goal.distanceMeters > 0 && !(plan.goal.durationSec > 0)) return "distance";
  return "time";
}

export function runsForGoal({ activities, course, plan, overall, metric } = {}) {
  const list = activities || [];
  const wantDistance = metric === "distance";
  return list.filter((a) => {
    if (!a) return false;
    // Distance-only goals track every run that recorded a distance, including
    // short ones, and ignore whether a time was logged.
    if (wantDistance) {
      if (!(Number(a.distanceMeters) > 0)) return false;
    } else if (!(Number(a.elapsedSec) > 0) && !(Number(a.distanceMeters) > 0)) {
      return false;
    }
    if (overall) return true;
    if (course && course.id && a.courseId === course.id) return true;
    if (plan && plan.id) {
      if (a.planId === plan.id || a.sourcePlanId === plan.id || a.activePlanId === plan.id) return true;
    }
    return false;
  }).slice().sort((a, b) => String(a.startedAt || a.endedAt || "").localeCompare(String(b.startedAt || b.endedAt || "")));
}

export function pointsFromRuns(runs, units = "mi", metric = "time") {
  const out = [];
  let n = 0;
  for (const a of runs || []) {
    const day = dayKey(a.startedAt || a.endedAt);
    if (!day) continue;
    const seconds = Number(a.elapsedSec) || 0;
    const meters = Number(a.distanceMeters) || 0;
    if (metric === "distance") {
      if (!(meters > 0)) continue; // every positive distance counts, even very short
    } else if (!(seconds > 0)) {
      continue;
    }
    n += 1;
    out.push({
      session: n,
      day,
      seconds,
      meters,
      pace: paceSecPerUnit(meters, seconds, units),
      at: a.startedAt || a.endedAt,
      id: a.id,
    });
  }
  return out;
}

export function currentPeriodAverage(points, period, { now = new Date(), locale, weekStart, metric = "time" } = {}) {
  const inPeriod = (p) => (period === "month" ? inCurrentMonth(p.day, now) : inCurrentWeek(p.day, now, { locale, weekStart }));
  const rows = (points || []).filter(inPeriod);
  if (!rows.length) return null;
  if (metric === "distance") {
    const meters = rows.reduce((s, p) => s + (p.meters || 0), 0) / rows.length;
    return { value: meters, count: rows.length, metric: "distance" };
  }
  const seconds = rows.reduce((s, p) => s + (p.seconds || 0), 0) / rows.length;
  return { value: seconds, count: rows.length, metric: "time" };
}

function goalValue(goal, course, plan, metric) {
  if (metric === "distance") {
    return Number((goal && (goal.distanceMeters || goal.meters)) || (plan && plan.goal && plan.goal.distanceMeters) || (plan && plan.route && plan.route.targetLengthMeters)) || null;
  }
  if (goal && goal.finishSec > 0) return Number(goal.finishSec);
  if (goal && goal.paceSecPerMile > 0) {
    const m = Number((goal && goal.meters) || 0);
    if (m > 0) return goal.paceSecPerMile * (m / METERS_PER_MILE);
  }
  const sessionSec = plan && (plan.progression?.currentTargetSec || plan.schedule?.initialTargetSec || plan.goal?.durationSec);
  return Number(sessionSec) || null;
}

export function buildGoalSeries({
  activities, course, plan, goal, units = "mi",
  now = new Date(), locale, weekStart, overall = false,
} = {}) {
  const resolvedGoal = goal || (course && course.goal) || null;
  const metric = metricForGoal(resolvedGoal, plan);
  const runs = runsForGoal({ activities, course, plan, overall, metric });
  const points = pointsFromRuns(runs, units, metric);
  const weekAvg = currentPeriodAverage(points, "week", { now, locale, weekStart, metric });
  const monthAvg = currentPeriodAverage(points, "month", { now, locale, weekStart, metric });
  const goalVal = goalValue(resolvedGoal, course, plan, metric);
  return {
    points,
    weekAvg: weekAvg && weekAvg.value,
    monthAvg: monthAvg && monthAvg.value,
    weekCount: weekAvg ? weekAvg.count : 0,
    monthCount: monthAvg ? monthAvg.count : 0,
    goalValue: goalVal,
    metric,
    units,
    runs,
  };
}

export function periodHistory(points, period, { locale, weekStart, metric = "time", units = "mi" } = {}) {
  const groups = new Map();
  for (const p of points || []) {
    const key = period === "month"
      ? monthKeyFor(p.day + "T12:00:00")
      : weekKeyFor(p.day + "T12:00:00", { locale, weekStart });
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const rows = [...groups.entries()].map(([key, list]) => {
    const count = list.length;
    const totalMeters = list.reduce((s, p) => s + (p.meters || 0), 0);
    const totalSec = list.reduce((s, p) => s + (p.seconds || 0), 0);
    const avgTimeSec = count ? totalSec / count : 0;
    const avgDistance = count ? totalMeters / count : 0;
    const avgPaceSec = paceSecPerUnit(totalMeters, totalSec, units);
    const first = list[0].day;
    const last = list[list.length - 1].day;
    return {
      key,
      period,
      count,
      totalMeters,
      totalSec,
      avgTimeSec,
      avgDistance,
      avgPaceSec,
      first,
      last,
      label: period === "month" ? monthLabel(key) : weekLabel(key, last),
    };
  });
  rows.sort((a, b) => b.key.localeCompare(a.key));
  return rows;
}

function weekLabel(startIso, endIso) {
  const a = new Date(startIso + "T12:00:00");
  const b = endIso ? new Date(endIso + "T12:00:00") : a;
  const fa = a.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const fb = b.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fa}–${fb}`;
}

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function formatPaceTick(sec, units) {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const s = Math.max(1, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}${units === "km" ? "/km" : "/mi"}`;
}

export function formatMetricValue(value, metric, units) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  if (metric === "count") {
    const n = Math.round(Number(value));
    return `${n} ${n === 1 ? "run" : "runs"}`;
  }
  if (metric === "distance") return formatDistance(value, units, { digits: 2 });
  return formatDuration(value);
}

function niceTicks(minV, maxV, metric, units) {
  if (metric === "distance") {
    const span = Math.max(maxV - minV, units === "km" ? 200 : 400);
    const lo = Math.max(0, minV - span * 0.08);
    const hi = maxV + span * 0.12;
    const step = niceStep(hi - lo, 5);
    const ticks = [];
    const start = Math.floor(lo / step) * step;
    for (let v = start; v <= hi + step / 10; v += step) ticks.push(v);
    return { lo: ticks[0], hi: ticks[ticks.length - 1], ticks };
  }
  const lo = Math.max(0, Math.floor(minV / 15) * 15);
  const hi = Math.max(lo + 30, Math.ceil(maxV / 15) * 15);
  const step = Math.max(15, Math.round((hi - lo) / 4 / 15) * 15);
  const ticks = [];
  for (let v = lo; v <= hi + 0.01; v += step) ticks.push(v);
  return { lo, hi: ticks[ticks.length - 1] || hi, ticks };
}

function niceStep(span, count) {
  const raw = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / pow;
  const mul = n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10;
  return mul * pow;
}

export function loadChartStyle(storage) {
  try {
    const v = (storage || defaultStorage())?.getItem(CHART_STYLE_KEY);
    return v === "bar" ? "bar" : "line";
  } catch { return "line"; }
}

export function saveChartStyle(style, storage) {
  const v = style === "bar" ? "bar" : "line";
  try { (storage || defaultStorage())?.setItem(CHART_STYLE_KEY, v); } catch { /* quota */ }
  return v;
}

/**
 * SVG chart. Time goals: Y = run time, lower is better (time increases down? no:
 * Y value is time, plotted with larger time higher on a normal axis, so lower
 * times sit lower — "lower is better"). Distance: Y = distance, higher is better.
 * Flat goal / weekly / monthly lines. Sessions are a red line+dots or red bars.
 */
export function renderGoalProgressChart(series, {
  width = 320,
  height = 220,
  title = "Progress",
  mode = "line",
} = {}) {
  const { points, weekAvg, monthAvg, goalValue: goalVal, metric = "time", units } = series || {};
  const pad = { l: 52, r: 12, t: 22, b: 44 };
  const iw = Math.max(40, width - pad.l - pad.r);
  const ih = Math.max(40, height - pad.t - pad.b);
  const better = metric === "distance" ? "higher is better" : "lower is better";
  const axisName = metric === "distance" ? (units === "km" ? "km" : "mi") : "time";
  if (!points || !points.length) {
    return {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="goal-chart" role="img" aria-label="${esc(title)}">
        <rect class="goal-chart-bg" width="100%" height="100%"/>
        <text x="50%" y="50%" text-anchor="middle" class="goal-chart-empty">No runs in this goal yet</text>
      </svg>`,
      series,
    };
  }
  const values = points.map((p) => (metric === "distance" ? p.meters : p.seconds));
  if (goalVal) values.push(goalVal);
  if (weekAvg != null) values.push(weekAvg);
  if (monthAvg != null) values.push(monthAvg);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const { lo, hi, ticks } = niceTicks(minV, maxV, metric, units);
  const n = points.length;
  const xOf = (session) => pad.l + ((session - 1) / Math.max(n - 1, 1)) * iw;
  // Normal axis: larger value is higher on the chart (up). Time: longer is up
  // (lower is better). Distance: more is up (higher is better).
  const yOf = (v) => pad.t + ih - ((v - lo) / Math.max(hi - lo, 1)) * ih;
  const y0 = yOf(Math.max(lo, 0));

  const flat = (value, cls) => (value == null || !Number.isFinite(value) ? "" :
    `<line class="${cls}" x1="${pad.l}" x2="${pad.l + iw}" y1="${yOf(value).toFixed(1)}" y2="${yOf(value).toFixed(1)}" />`);

  const poly = points.map((p, i) => {
    const v = metric === "distance" ? p.meters : p.seconds;
    return `${i ? "L" : "M"}${xOf(p.session).toFixed(1)},${yOf(v).toFixed(1)}`;
  }).join(" ");

  const sessionLine = mode !== "bar" && n >= 2
    ? `<path class="goal-chart-sessions" d="${poly}" fill="none"/>` : "";

  const bars = mode === "bar" ? points.map((p, i) => {
    const v = metric === "distance" ? p.meters : p.seconds;
    const x = xOf(p.session);
    const y = yOf(v);
    const gap = n > 1 ? (iw / Math.max(n - 1, 1)) * 0.55 : 16;
    const bw = Math.max(4, Math.min(22, gap));
    const top = Math.min(y, y0);
    const h = Math.max(1, Math.abs(y0 - y));
    return `<g class="goal-chart-day" data-session="${p.session}" data-day="${esc(p.day)}" data-i="${i}" tabindex="0" role="button">
      <rect class="goal-chart-bar" x="${(x - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}"/>
    </g>`;
  }).join("") : "";

  const dots = mode !== "bar" ? points.map((p, i) => {
    const v = metric === "distance" ? p.meters : p.seconds;
    return `<g class="goal-chart-day" data-session="${p.session}" data-day="${esc(p.day)}" data-i="${i}" tabindex="0" role="button">
      <circle class="goal-chart-dot" cx="${xOf(p.session).toFixed(1)}" cy="${yOf(v).toFixed(1)}" r="4"/>
    </g>`;
  }).join("") : "";

  const xTicks = n <= 8 ? points.map((p) => p.session) : [1, Math.round(n / 2), n];
  const yLabels = ticks.map((v) => `<text class="goal-chart-tick" x="${pad.l - 6}" y="${yOf(v) + 3}" text-anchor="end">${esc(formatMetricValue(v, metric, units))}</text>
    <line class="goal-chart-grid" x1="${pad.l}" x2="${pad.l + iw}" y1="${yOf(v).toFixed(1)}" y2="${yOf(v).toFixed(1)}"/>`).join("");
  const xLabels = xTicks.map((s) => `<text class="goal-chart-tick" x="${xOf(s).toFixed(1)}" y="${height - 22}" text-anchor="middle">${s}</text>`).join("");

  const goalLine = flat(goalVal, "goal-chart-goal");
  const weekLine = flat(weekAvg, "goal-chart-week");
  const monthLine = flat(monthAvg, "goal-chart-month");

  const legend = `<g class="goal-chart-legend-row" font-size="10" transform="translate(0, ${height - 8})">
      <line class="goal-chart-goal" x1="${pad.l}" y1="-2" x2="${pad.l + 14}" y2="-2"/>
      <text class="goal-chart-legend-text" x="${pad.l + 18}" y="1">Goal ${esc(formatMetricValue(goalVal, metric, units))}</text>
      <line class="goal-chart-week" x1="${pad.l + 118}" y1="-2" x2="${pad.l + 132}" y2="-2"/>
      <text class="goal-chart-legend-text" x="${pad.l + 136}" y="1">Weekly avg ${esc(formatMetricValue(weekAvg, metric, units))}</text>
      <line class="goal-chart-month" x1="${pad.l + 250}" y1="-2" x2="${pad.l + 264}" y2="-2"/>
      <text class="goal-chart-legend-text" x="${pad.l + 268}" y="1">Monthly avg ${esc(formatMetricValue(monthAvg, metric, units))}</text>
    </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.max(width, 400)} ${Math.max(height, 228)}" width="100%" class="goal-chart" role="img" aria-label="${esc(title)}. ${axisName}, ${better}.">
    <rect class="goal-chart-bg" width="100%" height="100%"/>
    <text class="goal-chart-axis" x="${pad.l}" y="14">${esc(metric === "distance" ? `Distance (${units}, higher is better)` : "Time (lower is better)")} · sessions</text>
    ${yLabels}
    ${xLabels}
    ${monthLine}
    ${weekLine}
    ${goalLine}
    ${sessionLine}
    ${bars}
    ${dots}
    ${legend}
  </svg>`;
  return { svg, series };
}

function legendSvg(x, { goal, week, month }) {
  const item = (cls, label, tx) =>
    `<line class="${cls}" x1="${tx}" y1="12" x2="${tx + 14}" y2="12"/>
     <text class="goal-chart-legend-text" x="${tx + 18}" y="15">${esc(label)}</text>`;
  // Place items on a wrapping-friendly single row; values go in the label.
  return `<g class="goal-chart-legend-row" font-size="10" transform="translate(0, ${/* drawn at top of bottom pad via labels below chart */ 0})">
    <g transform="translate(${x}, 0)">
      ${item("goal-chart-goal", `Goal ${goal}`, 0)}
      ${item("goal-chart-week", `Weekly avg ${week}`, 110)}
      ${item("goal-chart-month", `Monthly avg ${month}`, 230)}
    </g>
  </g>`.replace('transform="translate(0, 0)"', `transform="translate(0, 0)"`);
}

// Put the legend just above the bottom edge by injecting y via a wrapper in render — fix placement:
// The legend group is currently at origin. Re-render will position it using height in the template.
// I'll position it in the SVG after x labels by wrapping with a transform in renderGoalProgressChart.
// (Patch after write if needed.)

export function pointDetail(point, units = "mi", metric = "time") {
  if (!point) return "";
  const when = point.at
    ? new Date(point.at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : point.day;
  const time = formatDuration(point.seconds || 0);
  const dist = formatDistance(point.meters || 0, units, { digits: 2 });
  const pace = point.pace != null ? formatPace(point.meters, point.seconds, units) : "—";
  return `Session ${point.session} · ${when}\n${time} · ${dist} · ${pace}`;
}

export function mountGoalChart(el, series, opts = {}) {
  if (!el) return null;
  const mode = opts.mode || loadChartStyle(opts.storage);
  const { svg } = renderGoalProgressChart(series, { ...opts, mode });
  el.innerHTML = svg + `<p class="tiny goal-chart-tip" data-testid="goal-chart-tip" hidden></p>`;
  const tip = el.querySelector(".goal-chart-tip");
  el.querySelectorAll(".goal-chart-day").forEach((g) => {
    const show = () => {
      const i = Number(g.getAttribute("data-i"));
      const pt = series.points[i];
      if (!pt || !tip) return;
      tip.hidden = false;
      tip.textContent = pointDetail(pt, series.units, series.metric);
    };
    g.addEventListener("click", show);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(); } });
  });
  return el;
}

export function historyTableMarkup(rows, { period, metric = "time", units = "mi" } = {}) {
  if (!rows || !rows.length) {
    return `<p class="tiny" data-testid="history-empty">No ${period === "month" ? "monthly" : "weekly"} history yet.</p>`;
  }
  const head = metric === "distance"
    ? `<div class="hist-head"><span>Period</span><span class="t">Avg distance</span><span class="t">Runs</span><span class="t">Total</span></div>`
    : `<div class="hist-head"><span>Period</span><span class="t">Avg time</span><span class="t">Avg pace</span><span class="t">Runs</span><span class="t">Total</span></div>`;
  const body = rows.map((r) => {
    if (metric === "distance") {
      return `<div class="hist-row" data-key="${esc(r.key)}">
        <span>${esc(r.label)}</span>
        <span class="t">${esc(formatDistance(r.avgDistance, units, { digits: 2 }))}</span>
        <span class="t">${r.count}</span>
        <span class="t">${esc(formatDistance(r.totalMeters, units, { digits: 1 }))}</span>
      </div>`;
    }
    return `<div class="hist-row" data-key="${esc(r.key)}">
      <span>${esc(r.label)}</span>
      <span class="t">${esc(formatDuration(r.avgTimeSec))}</span>
      <span class="t">${esc(r.avgPaceSec != null ? formatPaceTick(r.avgPaceSec, units) : "—")}</span>
      <span class="t">${r.count}</span>
      <span class="t">${esc(formatDistance(r.totalMeters, units, { digits: 1 }))}</span>
    </div>`;
  }).join("");
  return `<div class="hist-table" data-testid="history-table">${head}${body}</div>`;
}

function defaultStorage() {
  try { if (typeof localStorage !== "undefined") return localStorage; } catch { /* ignore */ }
  return null;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}


/** Period of a goal: explicit .period, or inferred from kind (week-distance, month-count, …). */
export function goalPeriod(goal) {
  if (!goal) return null;
  if (goal.period === "week" || goal.period === "month") return goal.period;
  const k = String(goal.kind || "");
  if (k.startsWith("week")) return "week";
  if (k.startsWith("month")) return "month";
  return null;
}

export function periodGoalMetric(goal) {
  const k = String((goal && goal.kind) || "");
  if (k.includes("count")) return "count";
  if (k.includes("distance") || goal && goal.distanceMeters > 0 && !(goal.finishSec > 0) && !(goal.targetCount > 0)) return "distance";
  if (k.includes("time") || (goal && goal.finishSec > 0)) return "time";
  if (goal && goal.targetCount > 0) return "count";
  if (goal && goal.distanceMeters > 0) return "distance";
  return "distance";
}

/**
 * Progress toward a weekly or monthly goal in the current period only.
 * Each device computes this from its own activities — nothing is synced.
 */
export function periodGoalProgress(goal, activities, { now = new Date(), locale, weekStart, units = "mi" } = {}) {
  const period = goalPeriod(goal);
  if (!period) return null;
  const metric = periodGoalMetric(goal);
  const inPeriod = (a) => {
    const d = a && (a.endedAt || a.startedAt);
    if (!d) return false;
    const key = dayKey(d);
    if (!key) return false;
    return period === "week" ? inCurrentWeek(key, now, { locale, weekStart }) : inCurrentMonth(key, now);
  };
  const runs = (activities || []).filter((a) => a && inPeriod(a));
  let current = 0;
  if (metric === "count") current = runs.length;
  else if (metric === "distance") current = runs.reduce((s, a) => s + (Number(a.distanceMeters) || 0), 0);
  else current = runs.reduce((s, a) => s + (Number(a.elapsedSec) || 0), 0);
  let target = 0;
  if (metric === "count") target = Number(goal.targetCount) || 0;
  else if (metric === "distance") target = Number(goal.distanceMeters) || 0;
  else target = Number(goal.finishSec) || Number(goal.durationSec) || 0;
  const pct = target > 0 ? current / target : 0;
  return {
    period,
    metric,
    current,
    target,
    pct,
    remaining: Math.max(0, target - current),
    complete: target > 0 && current >= target,
    runCount: runs.length,
    units,
    label: period === "week" ? "This week" : "This month",
    currentLabel: formatMetricValue(current, metric, units),
    targetLabel: formatMetricValue(target, metric, units),
  };
}

/** Circular progress ring for a weekly/monthly goal. */
export function periodRingMarkup(progress, { size = 120, testid = "period-ring" } = {}) {
  if (!progress) return "";
  const p = Math.max(0, Math.min(1.0, Number(progress.pct) || 0));
  const r = 46;
  const c = 2 * Math.PI * r;
  const dash = `${(p * c).toFixed(2)} ${(c).toFixed(2)}`;
  const color = progress.complete ? "#2ec47e" : "#4EC3F7";
  const mid = progress.complete ? "Done" : `${Math.round(p * 100)}%`;
  return `<div class="period-ring" data-testid="${testid}" data-complete="${progress.complete ? "1" : "0"}">
    <svg viewBox="0 0 120 120" width="${size}" height="${size}" role="img" aria-label="${progress.label}: ${progress.currentLabel} of ${progress.targetLabel}">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${dash}" transform="rotate(-90 60 60)"/>
      <text x="60" y="56" text-anchor="middle" class="period-ring-pct">${mid}</text>
      <text x="60" y="76" text-anchor="middle" class="period-ring-sub">${progress.label}</text>
    </svg>
    <p class="period-ring-copy"><strong>${progress.currentLabel}</strong> of ${progress.targetLabel}</p>
  </div>`;
}
