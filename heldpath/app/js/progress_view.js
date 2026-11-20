/**
 * Progress screen: free week/month/year/all-time charts, personal records,
 * all-time totals, streaks, achievements and a friendly empty state.
 * Markup + small event wires only; scanning stays in progress_stats.js / util.js.
 */
import {
  PR_DEFS,
  chartBuckets,
  filterActivitiesByRange,
  formatDistance,
  formatDuration,
  formatPace,
  personalRecords,
  sumActivities,
  escapeHtml,
  METERS_PER_MILE,
} from "./util.js";
import { formatGain } from "./elevation.js";
import {
  chartTicks,
  evaluateAchievements,
  summarizeActivities,
} from "./progress_stats.js";

const PROGRESS_ART = "assets/art_progress_empty.png";

const RANGE_LABEL = {
  W: "Last 7 days",
  M: "Last 30 days",
  Y: "Last 12 months",
  All: "All time",
};

const dist = (meters, units) => formatDistance(meters, units, { digits: 1 });

const ICON_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.6 4.2 4.2L19 7.2"/></svg>`;
const ICON_LOCK = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>`;
const ICON_ROUTE = `<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M12 64c14 0 12-24 28-24s14 20 28 20 12-28 28-28" /><circle cx="12" cy="64" r="5" /><path d="M96 32c0 7-8 14-8 14s-8-7-8-14a8 8 0 0 1 16 0Z" /><circle cx="88" cy="31" r="2.6" /></svg>`;

export function emptyProgressMarkup() {
  return `<div class="empty card stats-empty" data-testid="progress-empty-state">
    <div class="stats-art" aria-hidden="true">
      <span class="stats-art-fallback">${ICON_ROUTE}</span>
      <img src="${PROGRESS_ART}" alt="" onerror="this.remove()" />
    </div>
    <h3>Your progress starts with one walk</h3>
    <p>Finish any walk or run and this screen fills in: distance over time, personal records, streaks and achievements. All of it is free, always.</p>
    <button class="btn btn-primary stats-empty-btn" id="empty-go-walk" data-testid="empty-start-walk">Start a walk</button>
    <p class="tiny stats-empty-note">Five minutes still counts. The first dot on the chart is the fun one.</p>
  </div>`;
}

function dayLabel(value) {
  const raw = String(value || "");
  const d = raw.includes("T") ? new Date(raw) : new Date(raw + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function shortTime(seconds) {
  return formatDuration(seconds || 0);
}

function chartSvg(buckets, units, width) {
  const w = Math.max(240, Math.round(width || 320));
  const h = 208;
  const padL = 44;
  const padR = 8;
  const padT = 22;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const maxMeters = buckets.reduce((m, b) => Math.max(m, b.meters || 0), 0);
  const axisMeters = maxMeters > 0 ? maxMeters : units === "km" ? 1000 : METERS_PER_MILE;
  const { max, ticks } = chartTicks(axisMeters, units);
  const count = buckets.length;
  const gap = count > 20 ? 2 : count > 12 ? 3 : 5;
  const barW = count ? Math.max(2, (plotW - gap * (count - 1)) / count) : 8;
  const parts = [];

  for (const tick of ticks) {
    const y = padT + plotH - (tick.value / max) * plotH;
    parts.push(
      `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${w - padR}" y2="${y.toFixed(1)}" stroke="#333C4A" stroke-width="1"></line>`
    );
    parts.push(
      `<text x="${padL - 8}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" fill="#A8B2C0" font-size="10" font-weight="600">${escapeHtml(tick.label)}</text>`
    );
  }

  buckets.forEach((b, i) => {
    const x = padL + i * (barW + gap);
    const bh = maxMeters > 0 ? Math.max(b.meters ? 3 : 0, (b.meters / max) * plotH) : 0;
    const y = padT + plotH - bh;
    parts.push(
      `<rect x="${x.toFixed(1)}" y="${(y).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(bh, 1).toFixed(1)}" rx="${Math.min(3, barW / 2).toFixed(1)}" fill="${b.meters ? "#4EC3F7" : "#2B3340"}"><title>${escapeHtml(b.label || b.key)}: ${dist(b.meters, units)}</title></rect>`
    );
    if (b.meters > 0 && count <= 12) {
      const label = formatDistance(b.meters, units, { digits: 1 }).replace(/ (mi|km)$/, "");
      parts.push(
        `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" fill="#D7E0EA" font-size="10" font-weight="700">${escapeHtml(label)}</text>`
      );
    }
    if (b.label) {
      parts.push(
        `<text x="${(x + barW / 2).toFixed(1)}" y="${h - 9}" text-anchor="middle" fill="#A8B2C0" font-size="10">${escapeHtml(b.label)}</text>`
      );
    }
  });

  if (maxMeters <= 0) {
    parts.push(
      `<text x="${(padL + plotW / 2).toFixed(1)}" y="${(padT + plotH / 2).toFixed(1)}" text-anchor="middle" fill="#A8B2C0" font-size="12">No distance in this range yet</text>`
    );
  }

  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Distance over time">${parts.join("")}</svg>`;
}

function paintChart(el, buckets, units) {
  if (!el) return;
  el.innerHTML = chartSvg(buckets, units, el.clientWidth || 320);
}

function prRow(def, record, longestMeters, units) {
  if (record) {
    return `<div class="pr-row">
      <div class="pr-main">
        <span>${escapeHtml(def.label)}</span>
        <span class="pr-value">${shortTime(record.seconds)}</span>
      </div>
      <p class="pr-hint">${record.type === "run" ? "Run" : "Walk"} · ${dayLabel(record.date)}</p>
    </div>`;
  }
  const needs = formatDistance(def.meters, units, { digits: 1 });
  return `<div class="pr-row is-locked">
    <div class="pr-main">
      <span>${escapeHtml(def.label)}</span>
      <span class="not-yet">Not yet</span>
    </div>
    <p class="pr-hint">Longest so far ${formatDistance(longestMeters, units, { digits: 1 })} · ${escapeHtml(needs)} to go</p>
  </div>`;
}

function achievementCard(a) {
  return `<div class="ach ${a.earned ? "earned" : "locked"}" data-achievement="${escapeHtml(a.id)}">
    <span class="ach-ic" aria-hidden="true">${a.earned ? ICON_CHECK : ICON_LOCK}</span>
    <span class="ach-title">${escapeHtml(a.title)}</span>
    <span class="ach-desc">${escapeHtml(a.desc)}</span>
    <span class="ach-progress">${escapeHtml(a.progress)}</span>
  </div>`;
}

export function renderProgressView(root, ctx) {
  const {
    activities = [],
    range = "W",
    units = "mi",
    now = new Date(),
    onStartWalk,
  } = ctx || {};

  if (!activities.length) {
    root.innerHTML = emptyProgressMarkup();
    const start = root.querySelector("#empty-go-walk");
    if (start && onStartWalk) start.addEventListener("click", onStartWalk);
    return;
  }

  const slice = filterActivitiesByRange(activities, range, now);
  const sums = sumActivities(slice);
  const summary = summarizeActivities(slice, now);
  const allSummary = summarizeActivities(activities, now);
  const bestDay = slice.reduce((best, a) => Math.max(best, a.distanceMeters || 0), 0);
  const climb = slice.reduce((s, a) => s + (a.climbGainM || 0), 0);
  const allClimb = activities.reduce((s, a) => s + (a.climbGainM || 0), 0);
  const buckets = chartBuckets(slice, range, now);
  const prs = personalRecords(activities);
  const achievements = evaluateAchievements(activities, { units, now });
  const earned = achievements.filter((a) => a.earned).length;
  const recent = [...activities]
    .sort((a, b) => Date.parse(b.endedAt || b.startedAt) - Date.parse(a.endedAt || a.startedAt))
    .slice(0, 8);

  root.innerHTML = `
    <div class="card chart-card">
      <div class="chart-head">
        <h2>Distance over time</h2>
        <div class="chart-total">
          <strong>${dist(sums.distanceMeters, units)}</strong>
          <span>${RANGE_LABEL[range] || "Selected range"}</span>
        </div>
      </div>
      <div class="chart-wrap" id="chart" data-testid="chart"></div>
      <div class="chart-foot">
        <span>${sums.count} ${sums.count === 1 ? "activity" : "activities"} · ${summary.activeDays} active ${summary.activeDays === 1 ? "day" : "days"}</span>
        <span>${bestDay > 0 ? "Longest " + dist(bestDay, units) : "Ready when you are"}</span>
      </div>
    </div>
    <div class="totals">
      <div class="total-box"><div class="num">${dist(sums.distanceMeters, units)}</div><div class="lbl">Distance</div></div>
      <div class="total-box"><div class="num">${formatDuration(sums.elapsedSec)}</div><div class="lbl">Time</div></div>
      <div class="total-box"><div class="num">${sums.count}</div><div class="lbl">${sums.count === 1 ? "Activity" : "Activities"}</div></div>
      <div class="total-box"><div class="num">${summary.activeDays}</div><div class="lbl">Active days</div></div>
      ${climb > 0 ? `<div class="total-box"><div class="num">${formatGain(climb, units)}</div><div class="lbl">Climb</div></div>` : ""}
    </div>
    <div class="card">
      <div class="section-head">
        <h2>Personal records</h2>
        <span class="section-note">Best single activity</span>
      </div>
      ${PR_DEFS.map((d) => prRow(d, prs[d.id], allSummary.longestMeters, units)).join("")}
    </div>
    <div class="card">
      <h2>All time</h2>
      <div class="stat-row"><span>Distance</span><span>${dist(allSummary.distanceMeters, units)}</span></div>
      <div class="stat-row"><span>Time</span><span>${formatDuration(allSummary.elapsedSec)}</span></div>
      <div class="stat-row"><span>Walks</span><span>${allSummary.walks}</span></div>
      <div class="stat-row"><span>Runs</span><span>${allSummary.runs}</span></div>
      <div class="stat-row"><span>Active days</span><span>${allSummary.activeDays}</span></div>
      <div class="stat-row"><span>Current streak</span><span>${allSummary.currentStreak} ${allSummary.currentStreak === 1 ? "day" : "days"}</span></div>
      <div class="stat-row"><span>Longest streak</span><span>${allSummary.longestStreak} ${allSummary.longestStreak === 1 ? "day" : "days"}</span></div>
      ${allClimb > 0 ? `<div class="stat-row"><span>Climb</span><span>${formatGain(allClimb, units)}</span></div>` : ""}
    </div>
    <div class="card">
      <div class="section-head">
        <h2>Achievements</h2>
        <span class="section-note">${earned} of ${achievements.length}</span>
      </div>
      <div class="ach-grid">
        ${achievements.map(achievementCard).join("")}
      </div>
    </div>
    <div class="card">
      <h2>Recent</h2>
      <div class="list" id="recent-list"></div>
    </div>`;

  paintChart(root.querySelector("#chart"), buckets, units);

  const list = root.querySelector("#recent-list");
  for (const a of recent) {
    const el = document.createElement("div");
    el.className = "list-item";
    const when = new Date(a.endedAt || a.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    el.innerHTML = `<div class="grow"><h3>${a.type === "run" ? "Run" : "Walk"}${a.courseName ? " · " + escapeHtml(a.courseName) : ""}</h3><p>${when} · ${formatDuration(a.elapsedSec)} · ${formatPace(a.distanceMeters, a.elapsedSec, units)}</p></div><div class="meta">${dist(a.distanceMeters, units)}</div>`;
    list.appendChild(el);
  }
}
