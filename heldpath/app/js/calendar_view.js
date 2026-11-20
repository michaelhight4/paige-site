/**
 * Calendar screen: readable month grid, day history, planned sessions and a
 * friendly empty state. Markup + event wiring only; dates come from util.js.
 */
import {
  activityMph,
  escapeHtml,
  etaSeconds,
  formatDistance,
  formatDuration,
  formatEta,
  formatPace,
  isoDate,
  monthGrid,
  pathLengthMeters,
} from "./util.js";
import { dayPlanLabel, sortCalendarItems } from "./calendar_conflict.js";

const CALENDAR_ART = "assets/art_calendar_empty.png";

const ICON_ROUTE = `<svg viewBox="0 0 120 80" aria-hidden="true"><path d="M12 64c14 0 12-24 28-24s14 20 28 20 12-28 28-28" /><circle cx="12" cy="64" r="5" /><path d="M96 32c0 7-8 14-8 14s-8-7-8-14a8 8 0 0 1 16 0Z" /><circle cx="88" cy="31" r="2.6" /></svg>`;

const SOURCE_LABEL = {
  phone: "Recorded in Heldpath",
  watch: "From your watch",
  health: "From the health app",
};

const dist = (meters, units) => formatDistance(meters, units, { digits: 1 });

export function groupActivitiesByDay(activities) {
  const out = {};
  for (const a of activities || []) {
    const raw = a.endedAt || a.startedAt;
    const t = Date.parse(raw || 0);
    if (!Number.isFinite(t)) continue;
    const key = isoDate(new Date(t));
    (out[key] ||= []).push(a);
  }
  return out;
}

export function groupPlansByDay(plans) {
  const out = {};
  for (const p of plans || []) {
    if (!p || !p.date) continue;
    (out[p.date] ||= []).push(p);
  }
  return out;
}

function dayTotalMeters(acts) {
  return (acts || []).reduce((sum, a) => sum + (a.distanceMeters || 0), 0);
}

function timeOfDay(value) {
  const d = new Date(value || 0);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dateHeading(iso) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function shortDate(iso) {
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function dotMarkup(acts, plans) {
  let html = "";
  const actDots = Math.min((acts || []).length, 2);
  for (let i = 0; i < actDots; i++) html += `<i class="dot"></i>`;
  const planDots = Math.min((plans || []).length, 2);
  for (let i = 0; i < planDots; i++) html += `<i class="dot plan"></i>`;
  return html;
}

function activityRow(a, units, open) {
  const when = timeOfDay(a.endedAt || a.startedAt);
  const title = `${a.type === "run" ? "Run" : "Walk"}${a.courseName ? " · " + a.courseName : ""}`;
  const source = SOURCE_LABEL[a.source] || SOURCE_LABEL.phone;
  const pace = formatPace(a.distanceMeters, a.elapsedSec, units);
  const course = a.courseId
    ? `<button class="btn btn-secondary act-again" data-repeat="${escapeHtml(a.courseId)}" data-type="${a.type === "run" ? "run" : "walk"}">${a.type === "run" ? "Run" : "Walk"} this course again</button>`
    : "";
  return `<button class="list-item act-row" data-act="${escapeHtml(a.id)}" aria-expanded="${open ? "true" : "false"}">
      <div class="grow">
        <h3>${escapeHtml(title)}</h3>
        <p>${when} · ${dist(a.distanceMeters, units)} · ${formatDuration(a.elapsedSec)}</p>
      </div>
      <div class="meta">${open ? "Hide" : "Details"}</div>
    </button>
    ${open ? `<div class="act-detail">
      <div class="act-stats">
        <div><span>Distance</span><strong>${dist(a.distanceMeters, units)}</strong></div>
        <div><span>Time</span><strong>${formatDuration(a.elapsedSec)}</strong></div>
        <div><span>Avg pace</span><strong>${escapeHtml(pace)}</strong></div>
      </div>
      <p class="tiny act-meta">${when} · ${escapeHtml(source)}</p>
      ${course}
    </div>` : ""}`;
}

function planRow(p, courses, units, isToday, isFuture) {
  const c = (courses || []).find((x) => x.id === p.courseId);
  const len = c ? pathLengthMeters(c.pins) : 0;
  const eta = formatEta(etaSeconds(len, activityMph(p.activityType)));
  const isGroup = !!p.groupRunId;
  const timeLabel = p.startAt ? new Date(p.startAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
  const title = isGroup
    ? `Group ${p.activityType === "run" ? "run" : "walk"}${p.courseName ? " · " + p.courseName : ""}`
    : `Planned ${p.activityType === "run" ? "run" : "walk"}${p.courseName ? " · " + p.courseName : ""}`;
  const body = c
    ? `${dist(len, units)} · ${eta}${timeLabel ? " · " + timeLabel : ""}${isToday ? " · Today" : ""}`
    : "Saved course was removed";
  if (!isToday && !isFuture) {
    return `<div class="list-item plan-row is-past">
      <div class="grow"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>
      <div class="meta muted">${c ? "Past" : "—"}</div>
    </div>`;
  }
  if (isGroup) {
    return `<button class="list-item plan-row" data-group-plan="${escapeHtml(p.id)}" data-testid="group-event-row">
      <div class="grow"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>
      <div class="meta">View</div>
    </button>`;
  }
  if (!c) {
    return `<div class="list-item plan-row is-past">
      <div class="grow"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>
      <div class="meta muted">—</div>
    </div>`;
  }
  return `<button class="list-item plan-row" data-plan="${escapeHtml(p.id)}">
      <div class="grow"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></div>
      <div class="meta">Start</div>
    </button>`;
}

function emptyStateMarkup(canStart) {
  return `<div class="empty card cal-empty" data-testid="calendar-empty-state">
    <div class="stats-art small" aria-hidden="true">
      <span class="stats-art-fallback">${ICON_ROUTE}</span>
      <img src="${CALENDAR_ART}" alt="" onerror="this.remove()" />
    </div>
    <h3>Your calendar is wide open</h3>
    <p>Start a walk and it shows up here as history. Or plan a saved course for another day — history and planning are both free.</p>
    <div class="empty-actions">
      ${canStart ? `<button class="btn btn-primary" id="cal-empty-walk">Start a walk</button>` : ""}
      <button class="btn btn-secondary" id="cal-empty-plan">Plan a session</button>
    </div>
  </div>`;
}

function upcomingMarkup(plans, courses, todayIso, units) {
  const next = sortCalendarItems((plans || []).filter((p) => p.date && p.date >= todayIso)).slice(0, 3);
  if (!next.length) return "";
  const rows = next.map((p) => {
    const c = (courses || []).find((x) => x.id === p.courseId);
    const len = c ? pathLengthMeters(c.pins) : 0;
    return `<button class="list-item upcoming-row" data-up="${escapeHtml(p.date)}">
      <div class="grow">
        <h3>${escapeHtml(shortDate(p.date))}</h3>
        <p>${p.groupRunId ? "Group " : ""}${p.activityType === "run" ? "run" : "walk"}${p.courseName ? " · " + escapeHtml(p.courseName) : ""} · ${dist(len, units)}</p>
      </div>
      <div class="meta">${p.date === todayIso ? "Today" : "View"}</div>
    </button>`;
  }).join("");
  return `<div class="card upcoming-card">
    <div class="section-head"><h2>Coming up</h2><span class="section-note">Free to plan</span></div>
    <div class="list">${rows}</div>
  </div>`;
}

export function renderCalendarView(ctx) {
  const {
    grid,
    panel,
    activities = [],
    plans = [],
    courses = [],
    units = "mi",
    cal = new Date(),
    selectedDay = isoDate(new Date()),
    todayIso = isoDate(new Date()),
    openActivityId = null,
    onSelectDay,
    onStartPlan,
    onOpenGroup,
    onSchedule,
    onGroupRun,
    onToggleActivity,
    onStartCourse,
    onStartWalk,
  } = ctx || {};

  const actsByDay = groupActivitiesByDay(activities);
  const plansByDay = groupPlansByDay(plans);

  grid.innerHTML = "";
  for (const week of monthGrid(cal.getFullYear(), cal.getMonth())) {
    const row = document.createElement("div");
    row.className = "week";
    for (const cell of week) {
      const acts = actsByDay[cell.iso] || [];
      const dayPlans = plansByDay[cell.iso] || [];
      const meters = dayTotalMeters(acts);
      const b = document.createElement("button");
      b.className = "day";
      if (!cell.inMonth) b.classList.add("out");
      if (cell.iso === todayIso) b.classList.add("today");
      if (cell.iso === selectedDay) b.classList.add("selected");
      b.dataset.iso = cell.iso;
      const bits = [];
      if (acts.length) bits.push(`${acts.length} ${acts.length === 1 ? "activity" : "activities"}`, dist(meters, units));
      if (dayPlans.length) bits.push(`${dayPlans.length} planned`);
      b.setAttribute(
        "aria-label",
        `${cell.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}: ${bits.length ? bits.join(", ") : "nothing logged"}`
      );
      const noteClass = acts.length ? "has-acts" : dayPlans.length > 1 ? "has-plan has-conflict" : dayPlans.length ? "has-plan" : "";
      const note = acts.length ? dist(meters, units) : dayPlanLabel(dayPlans);
      b.innerHTML = `<span class="n">${cell.date.getDate()}</span>
        <span class="dots">${dotMarkup(acts, dayPlans)}</span>
        <span class="day-note ${noteClass}">${escapeHtml(note)}</span>`;
      b.addEventListener("click", () => {
        if (onSelectDay) onSelectDay(cell.iso);
      });
      row.appendChild(b);
    }
    grid.appendChild(row);
  }

  const legend = document.createElement("div");
  legend.className = "cal-legend";
  legend.setAttribute("aria-hidden", "true");
  legend.innerHTML = `<span><i class="dot"></i> Finished</span><span><i class="dot plan"></i> Planned</span>`;
  grid.appendChild(legend);

  const acts = actsByDay[selectedDay] || [];
  const dayPlans = plansByDay[selectedDay] || [];
  const isFuture = selectedDay > todayIso;
  const isToday = selectedDay === todayIso;
  const historyEmpty = !activities.length && !plans.length;

  let html = "";
  if (historyEmpty) html += emptyStateMarkup(true);

  const meters = dayTotalMeters(acts);
  const seconds = acts.reduce((s, a) => s + (a.elapsedSec || 0), 0);
  html += `<div class="card day-card">
    <div class="section-head">
      <h2>${escapeHtml(dateHeading(selectedDay))}</h2>
      ${isToday ? `<span class="today-tag">Today</span>` : ""}
    </div>`;
  if (acts.length) {
    html += `<p class="day-summary">${acts.length} ${acts.length === 1 ? "activity" : "activities"} · ${dist(meters, units)} · ${formatDuration(seconds)}</p>`;
  } else if (!dayPlans.length) {
    html += isToday
      ? `<p class="tiny">Nothing yet today. Start a walk and it will show up here.</p>`
      : isFuture
        ? `<p class="tiny">Nothing planned yet. Schedule a walk or run on a saved course — it's free.</p>`
        : `<p class="tiny">No walks or runs on this day.</p>`;
  }
  if (dayPlans.length > 1 && (isToday || isFuture)) {
    html += `<p class="tiny plan-hint is-conflict" data-testid="calendar-conflict-note">This day has more than one plan. Both stay on the calendar.</p>`;
  } else if (dayPlans.length && (isToday || isFuture)) {
    const hasGroup = dayPlans.some((p) => p.groupRunId);
    html += hasGroup
      ? `<p class="tiny plan-hint">Tap a group event to see its date and route. Tap a planned session to start it.</p>`
      : `<p class="tiny plan-hint">Tap a planned session to start it.</p>`;
  }
  for (const a of acts) {
    html += activityRow(a, units, a.id === openActivityId);
  }
  for (const p of sortCalendarItems(dayPlans)) {
    html += planRow(p, courses, units, isToday, isFuture);
  }
  if (isFuture || isToday) {
    if (!historyEmpty) {
      html += `<button class="btn btn-secondary sched-btn" id="btn-sched-open" data-testid="calendar-schedule">Schedule a walk or run</button>`;
      html += `<button class="btn btn-secondary sched-btn" id="btn-group-open" data-testid="calendar-group">Plan a Group Run</button>`;
    }
  }
  html += `</div>`;
  html += upcomingMarkup(plans, courses, todayIso, units);
  panel.innerHTML = html;

  panel.querySelectorAll("[data-act]").forEach((el) => {
    el.addEventListener("click", () => {
      if (onToggleActivity) onToggleActivity(el.dataset.act);
    });
  });
  panel.querySelectorAll("[data-plan]").forEach((el) => {
    el.addEventListener("click", () => {
      if (onStartPlan) onStartPlan(el.dataset.plan);
    });
  });
  panel.querySelectorAll("[data-group-plan]").forEach((el) => {
    el.addEventListener("click", () => {
      if (onOpenGroup) onOpenGroup(el.dataset.groupPlan);
    });
  });
  panel.querySelectorAll("[data-repeat]").forEach((el) => {
    el.addEventListener("click", () => {
      if (onStartCourse) onStartCourse(el.dataset.repeat, el.dataset.type);
    });
  });
  panel.querySelectorAll("[data-up]").forEach((el) => {
    el.addEventListener("click", () => {
      if (onSelectDay) onSelectDay(el.dataset.up);
    });
  });
  const sched = panel.querySelector("#btn-sched-open");
  if (sched && onSchedule) sched.addEventListener("click", onSchedule);
  const groupBtn = panel.querySelector("#btn-group-open");
  if (groupBtn && onGroupRun) groupBtn.addEventListener("click", onGroupRun);
  const emptyPlan = panel.querySelector("#cal-empty-plan");
  if (emptyPlan && onSchedule) emptyPlan.addEventListener("click", onSchedule);
  const emptyWalk = panel.querySelector("#cal-empty-walk");
  if (emptyWalk && onStartWalk) emptyWalk.addEventListener("click", onStartWalk);
}
