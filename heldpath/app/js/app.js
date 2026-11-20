import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatEta,
  etaSeconds,
  activityMph,
  pathLengthMeters,
  legDistances,
  notificationText,
  isoDate,
  startOfDay,
  SUPPORT_COPY,
  escapeHtml,
} from "./util.js";
import { loadState, saveState, resetState, newCourse, newActivity, newPlan } from "./storage.js";
import * as health from "./health.js";
import { PLANS_HOOK_COPY } from "./plans_hook.js";
import * as map from "./map.js";
import * as track from "./track.js";
import * as splits from "./splits.js";
import { seedDemo, midCourseWalk, arnoLoopPins } from "./demo.js";
import { purchaseSupport, SUPPORT_PRODUCT_ID } from "./iap.js";
import { isWeb, applyPlatformVisibility, registerServiceWorker, listenForInstallPrompt, canPromptInstall, promptInstall, WEB_APP_NOTE, WEB_PAY_NOTE } from "./platform.js";
import { persistStarterPack } from "./map.js";
import { renderCalendarView } from "./calendar_view.js";
import { renderProgressView } from "./progress_view.js";
import { initPlansUi, renderPlansScreen } from "./plans_ui.js";
import { applyCompletedSession } from "./plans.js";

let state = loadState();
const PR_BADGES = {
  "1mi": "badge_mile",
  "5k": "badge_5k",
  "10k": "badge_10k",
  half: "badge_half",
  marathon: "badge_marathon",
};
const ui = {
  tab: "today",
  screen: "today",
  range: "W",
  cal: startOfDay(new Date()),
  selectedDay: isoDate(new Date()),
  openActId: null,
  startType: "walk",
  hideNav: false,
};

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

function persist() {
  saveState(state);
}

function units() {
  return state.settings.units || "mi";
}

/** Steps/calories only ever come from the health app; blank when absent. */
function healthFieldsText(activity) {
  const h = activity && activity.health;
  if (!h) return "";
  const bits = [];
  if (Number.isFinite(h.steps)) bits.push(`${h.steps.toLocaleString()} steps`);
  if (Number.isFinite(h.calories)) bits.push(`${Math.round(h.calories).toLocaleString()} cal`);
  return bits.join(" · ");
}

function activityDetailLine(activity) {
  const healthLine = healthFieldsText(activity);
  const when = new Date(activity.endedAt || activity.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${when} · ${formatDuration(activity.elapsedSec)}${healthLine ? " · " + healthLine : ""}`;
}

function sourceLabel(activity) {
  if (!activity || !activity.source) return "Tracked on this phone";
  if (activity.source === "watch") return "Imported from a watch";
  if (activity.source === "health") return "From the health app";
  return "Tracked on this phone";
}

async function refreshHealthStatus() {
  const note = $("health-note");
  if (!note) return;
  if (!state.settings.healthOptIn) {
    note.textContent = "Off. Steps and calories always come from your phone's health app, never from Heldpath. Turn this on when you want workouts written to Health Connect or Apple Health.";
    return;
  }
  const avail = await health.isAvailable();
  if (avail.available) {
    const provider = avail.provider || (Capacitor.getPlatform() === "ios" ? "Apple Health" : "Health Connect");
    note.textContent = `On. Connected to ${provider}. Finished walks and runs can be written there, and steps and calories are read back from it. Nothing is estimated by Heldpath.`;
  } else {
    note.textContent = `On in settings, but not connected in this build. ${avail.reason}`;
  }
}

function showScreen(name) {
  ui.screen = name;
  document.querySelectorAll(".screen").forEach((el) => {
    el.classList.toggle("active", el.dataset.screen === name);
  });
  const mapScreens = new Set(["today", "tracking", "builder"]);
  $("map").style.visibility = mapScreens.has(name) ? "visible" : "hidden";
  $("tab-bar").style.display = name === "lock" || ui.hideNav ? "none" : "grid";
  if (mapScreens.has(name)) {
    requestAnimationFrame(() => map.resizeMap());
  }
}

function setTab(tab) {
  ui.tab = tab;
  document.querySelectorAll("#tab-bar .tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  if (tab === "today") {
    if (track.getSession()) showScreen("tracking");
    else showScreen("today");
  } else showScreen(tab);
  render();
}

function openSheet(id) {
  $(id).classList.add("open");
}
function closeSheet(id) {
  $(id).classList.remove("open");
}

function courseById(id) {
  return state.courses.find((c) => c.id === id);
}

/* ——— Renderers ——— */
function renderToday() {
  const banner = $("map-banner");
  if (!state.settings.mapPackInstalled) {
    banner.hidden = false;
    banner.textContent = "Save a map to this phone to use it offline.";
  } else {
    banner.hidden = true;
  }
}

function paintSessionHud(sess) {
  if (!sess) return;
  const rem = track.courseRemaining(sess);
  const onCourse = rem.onCourse;
  $("track-kicker").textContent = `${sess.type === "run" ? "Run" : "Walk"}${sess.courseName ? " · " + sess.courseName : ""}`;
  $("track-remain-wrap").style.display = onCourse ? "grid" : "none";
  if (onCourse) {
    $("track-left").textContent = formatDistance(rem.remaining, sess.units);
    $("track-eta").textContent = rem.remaining <= 8 ? "Done" : formatEta(etaSeconds(rem.remaining, activityMph(sess.type)));
  }
  const done = onCourse ? rem.traveled : sess.distanceMeters;
  $("track-done").textContent = formatDistance(done, sess.units);
  $("track-time").textContent = formatDuration(sess.elapsedSec);
  $("track-pace").textContent = formatPace(sess.distanceMeters, sess.elapsedSec, sess.units);
  $("btn-pause").textContent = sess.paused ? "Resume" : "Pause";
  $("lock-body").textContent = track.liveNotification(sess);
}

function drawSessionOnMap(sess) {
  map.clearOverlays();
  map.clearMarkers();
  if (sess.coursePins && sess.coursePins.length) {
    map.drawRoute(sess.coursePins, { id: "course-line", color: "#7A8798", width: 4 });
    addCoursePins(sess.coursePins);
  }
  if (sess.track.length >= 2) map.drawRoute(sess.track, { id: "live-line", color: "#4EC3F7", width: 5 });
  const last = sess.track[sess.track.length - 1];
  if (last) {
    map.addDot(last);
    map.setCenter(last.lat, last.lon);
  }
}

function addCoursePins(pins) {
  pins.forEach((p, i) => {
    const kind = p.role || (i === 0 ? "start" : i === pins.length - 1 ? "end" : "via");
    const label = kind === "start" ? "Start" : kind === "end" ? "End" : "";
    map.addPin(p, { kind, label });
  });
}

function renderBuilder() {
  const pins = ui.builderPins || [];
  const hint = $("builder-hint");
  if (pins.length === 0) hint.textContent = "Tap the map to place a Start pin. Then add points along the route. The last pin is the End.";
  else if (pins.length === 1) hint.textContent = "Start is placed. Tap to add the next point. Distances update with every pin.";
  else hint.textContent = "Keep adding pins, or save when the route looks right. The last pin is the End.";

  const box = $("builder-legs");
  box.innerHTML = "";
  if (pins.length < 2) {
    box.innerHTML = `<p class="tiny">Leg distances will show here after the second pin.</p>`;
  } else {
    const legs = legDistances(pins);
    legs.forEach((leg, i) => {
      const from = i === 0 ? "Start" : `Pin ${i + 1}`;
      const to = i === legs.length - 1 ? "End" : `Pin ${i + 2}`;
      const row = document.createElement("div");
      row.className = "leg-row";
      row.innerHTML = `<span>${from} → ${to}</span><span>${formatDistance(leg.meters, units())}</span>`;
      box.appendChild(row);
    });
    const total = pathLengthMeters(pins);
    const walkEta = formatEta(etaSeconds(total, activityMph("walk")));
    const runEta = formatEta(etaSeconds(total, activityMph("run")));
    const tot = document.createElement("div");
    tot.className = "total-row";
    tot.dataset.testid = "builder-total";
    tot.innerHTML = `<span>Total</span><span>${formatDistance(total, units())} · ${walkEta} walk · ${runEta} run</span>`;
    box.appendChild(tot);
  }
  $("btn-save-course").disabled = pins.length < 2;
  map.clearOverlays();
  map.clearMarkers();
  if (pins.length >= 2) map.drawRoute(pins, { id: "build-line" });
  addCoursePins(pins);
}

function renderCourses() {
  const root = $("courses-list");
  root.innerHTML = "";
  if (!state.courses.length) {
    root.innerHTML = `<div class="empty card">
      <img class="empty-art" src="assets/empty_courses.png" alt="" />
      <h3>No saved courses yet</h3>
      <p>Build a course on the map with a start, a few points in between, and an end. You can follow it any time, for free.</p>
    </div>`;
    return;
  }
  for (const c of state.courses) {
    const len = pathLengthMeters(c.pins);
    const btn = document.createElement("button");
    btn.className = "list-item";
    btn.innerHTML = `<div class="grow"><h3></h3><p></p></div><div class="meta"></div>`;
    btn.querySelector("h3").textContent = c.name;
    btn.querySelector("p").textContent = `${c.pins.length} pins · ${formatEta(etaSeconds(len, 3))} walk · ${formatEta(etaSeconds(len, 6))} run`;
    btn.querySelector(".meta").textContent = formatDistance(len, units());
    btn.addEventListener("click", () => openCourseActions(c));
    root.appendChild(btn);
  }
}

function openCourseActions(course) {
  ui.courseId = course.id;
  const len = pathLengthMeters(course.pins);
  $("course-title").textContent = course.name;
  $("course-sub").textContent = `${formatDistance(len, units())} · ${formatEta(etaSeconds(len, 3))} walk · ${formatEta(etaSeconds(len, 6))} run`;
  const box = $("course-legs");
  box.innerHTML = "";
  const rows = splits.courseLegSummary(course);
  if (!rows.length) {
    box.innerHTML = `<p class="tiny">Add at least two pins to see legs.</p>`;
  } else {
    const head = document.createElement("div");
    head.className = "split-head";
    head.innerHTML = `<span>Leg</span><span class="t">Best</span><span class="t">Distance</span>`;
    box.appendChild(head);
    for (const row of rows) {
      const el = document.createElement("div");
      el.className = "split-row";
      const label = document.createElement("span");
      label.textContent = row.label;
      const best = document.createElement("span");
      best.className = "t";
      best.textContent = row.bestSeconds == null ? "—" : splits.formatLegTime(row.bestSeconds);
      const dist = document.createElement("span");
      dist.className = "t";
      dist.textContent = formatDistance(row.meters, units());
      el.appendChild(label);
      el.appendChild(best);
      el.appendChild(dist);
      box.appendChild(el);
    }
    const hasBest = rows.some((r) => r.bestSeconds != null);
    const foot = document.createElement("p");
    foot.className = "tiny";
    foot.style.marginTop = "12px";
    foot.textContent = hasBest
      ? "Leg bests are free and update whenever you finish a leg faster."
      : "No leg bests yet. Walk or run this course to set them — free.";
    box.appendChild(foot);
  }
  openSheet("sheet-course");
}

function syncSelectedDayToMonth() {
  const sel = new Date(ui.selectedDay + "T12:00:00");
  if (sel.getFullYear() === ui.cal.getFullYear() && sel.getMonth() === ui.cal.getMonth()) return;
  const today = new Date();
  ui.openActId = null;
  ui.selectedDay =
    today.getFullYear() === ui.cal.getFullYear() && today.getMonth() === ui.cal.getMonth()
      ? isoDate(today)
      : isoDate(new Date(ui.cal.getFullYear(), ui.cal.getMonth(), 1));
}

function renderCalendar() {
  $("cal-month").textContent = ui.cal.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  renderCalendarView({
    grid: $("cal-grid"),
    panel: $("cal-day-panel"),
    activities: state.activities,
    plans: state.plans,
    courses: state.courses,
    units: units(),
    cal: ui.cal,
    selectedDay: ui.selectedDay,
    todayIso: isoDate(new Date()),
    openActivityId: ui.openActId,
    onSelectDay: (iso) => {
      ui.selectedDay = iso;
      ui.openActId = null;
      renderCalendar();
    },
    onToggleActivity: (id) => {
      ui.openActId = ui.openActId === id ? null : id;
      renderCalendar();
    },
    onStartPlan: (id) => {
      const p = state.plans.find((x) => x.id === id);
      if (!p) return;
      const c = courseById(p.courseId);
      const pins = p.routePins && p.routePins.length >= 2 ? p.routePins : (c && c.pins);
      if (pins && pins.length >= 2) {
        const course = {
          id: p.sourcePlanId ? null : c ? c.id : null,
          name: p.courseName || (c && c.name) || "Plan session",
          pins,
        };
        startTracking(p.activityType, course, p);
      } else if (c) {
        startTracking(p.activityType, c, p);
      }
    },
    onSchedule: () => openSchedule(),
    onStartCourse: (courseId, type) => {
      const c = courseById(courseId);
      if (c) startTracking(type === "run" ? "run" : "walk", c);
    },
    onStartWalk: () => {
      setTab("today");
      openStart("walk");
    },
  });
}

function openSchedule() {
  if (!state.courses.length) {
    window.alert("Save a course first, then you can schedule it on a day.");
    setTab("courses");
    return;
  }
  $("sched-sub").textContent = `For ${new Date(ui.selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}.`;
  const sel = $("sched-course");
  sel.innerHTML = state.courses.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  const updatePrev = () => {
    const c = courseById(sel.value);
    const type = $("sched-type").value;
    if (!c) return;
    const len = pathLengthMeters(c.pins);
    $("sched-preview").textContent = `${formatDistance(len, units())} · ${formatEta(etaSeconds(len, activityMph(type)))} estimated`;
  };
  sel.onchange = updatePrev;
  $("sched-type").onchange = updatePrev;
  updatePrev();
  openSheet("sheet-schedule");
}

function renderProgress() {
  document.querySelectorAll("#range-tog button").forEach((b) => {
    b.classList.toggle("active", b.dataset.range === ui.range);
  });
  renderProgressView($("progress-body"), {
    activities: state.activities,
    range: ui.range,
    units: units(),
    onStartWalk: () => {
      setTab("today");
      openStart("walk");
    },
  });
}

function renderSettings() {
  document.querySelectorAll("#units-tog button").forEach((b) => {
    b.classList.toggle("active", b.dataset.units === units());
  });
  if ($("health-switch")) {
    $("health-switch").classList.toggle("on", !!state.settings.healthOptIn);
    $("health-switch").setAttribute("aria-checked", state.settings.healthOptIn ? "true" : "false");
  }
  if (typeof refreshHealthStatus === "function") refreshHealthStatus();
  else if ($("health-note")) {
    $("health-note").textContent = state.settings.healthOptIn
      ? health.HEALTH_STATUS.reason + " Your preference is saved and will apply when health sync is wired."
      : "Health sync stays off until you turn it on.";
  }
  if ($("web-native-note")) $("web-native-note").textContent = WEB_APP_NOTE;
  if ($("web-pay-note")) $("web-pay-note").textContent = WEB_PAY_NOTE;
  $("plans-hook").textContent = PLANS_HOOK_COPY;
  $("map-pack-status").textContent = state.settings.mapPackInstalled
    ? "Florence starter map is saved on this phone and works offline."
    : "No map pack marked as saved yet. The starter map is still in the app.";
  $("support-copy").textContent = SUPPORT_COPY;
}

function render() {
  if (ui.screen === "today") renderToday();
  if (ui.screen === "builder") renderBuilder();
  if (ui.screen === "courses") renderCourses();
  if (ui.screen === "calendar") renderCalendar();
  if (ui.screen === "progress") renderProgress();
  if (ui.screen === "settings" || ui.screen === "support") renderSettings();
  if (ui.screen === "plans") renderPlansScreen();
  if (track.getSession()) paintSessionHud(track.getSession());
}

/* ——— Actions ——— */
function openStart(type) {
  ui.startType = type;
  $("start-sheet-title").textContent = type === "run" ? "Start a run" : "Start a walk";
  const list = $("start-course-list");
  list.innerHTML = "";
  if (!state.courses.length) {
    list.innerHTML = `<p class="tiny">No saved courses yet. You can start without one, or build a course first.</p>`;
  } else {
    for (const c of state.courses) {
      const len = pathLengthMeters(c.pins);
      const b = document.createElement("button");
      b.className = "list-item";
      b.innerHTML = `<div class="grow"><h3></h3><p></p></div><div class="meta"></div>`;
      b.querySelector("h3").textContent = c.name;
      b.querySelector("p").textContent = `${formatDistance(len, units())} · ${formatEta(etaSeconds(len, activityMph(type)))}`;
      b.querySelector(".meta").textContent = "Go";
      b.addEventListener("click", () => { closeSheet("sheet-start"); startTracking(type, c); });
      list.appendChild(b);
    }
  }
  openSheet("sheet-start");
}


function ensureLocationDisclosure() {
  return new Promise((resolve) => {
    if (state.settings.locationDisclosureAccepted) {
      resolve(true);
      return;
    }
    const done = (ok) => {
      closeSheet("sheet-location");
      resolve(ok);
    };
    const yes = $("btn-loc-continue");
    const no = $("btn-loc-cancel");
    const onYes = () => {
      yes.removeEventListener("click", onYes);
      no.removeEventListener("click", onNo);
      state.settings.locationDisclosureAccepted = true;
      persist();
      done(true);
    };
    const onNo = () => {
      yes.removeEventListener("click", onYes);
      no.removeEventListener("click", onNo);
      done(false);
    };
    yes.addEventListener("click", onYes);
    no.addEventListener("click", onNo);
    openSheet("sheet-location");
  });
}

async function startTracking(type, course, plan) {
  closeSheet("sheet-start");
  const ok = await ensureLocationDisclosure();
  if (!ok) return;
  const sess = track.makeSession({ type, course, units: units() });
  setTab("today");
  showScreen("tracking");
  paintSessionHud(sess);
  map.whenReady(() => {
    if (course && course.pins.length) {
      drawSessionOnMap(sess);
      map.fitBounds(course.pins, 80);
    }
  });
  if (course && course.pins.length) {
    drawSessionOnMap(sess);
  }
  const res = await track.startWatching((s) => {
    if (!s) return;
    paintSessionHud(s);
    drawSessionOnMap(s);
  });
  if (plan && isoDate(new Date()) >= plan.date) {
    // leave the plan until stop, then remove if completed
    ui.activePlanId = plan.id;
  }
  if (!res.ok) {
    console.warn("watch start", res);
  }
}

async function pauseOrResume() {
  const s = track.getSession();
  if (!s) return;
  if (s.paused) track.resumeSession();
  else track.pauseSession();
  paintSessionHud(track.getSession());
}

async function importWatchActivities() {
  const status = $("health-import-status");
  if (!state.settings.healthOptIn) {
    status.textContent = "Turn on health sync first so Heldpath can read workouts from the health app.";
    return;
  }
  status.textContent = "Looking for watch workouts from the last 30 days…";
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  let res;
  try {
    res = await health.importWatchWorkouts(from.toISOString(), to.toISOString());
  } catch (err) {
    status.textContent = `Could not read watch workouts: ${String(err)}`;
    return;
  }
  if (!res.ok || !res.imported.length) {
    status.textContent = res.reason || "No watch workouts found for the last 30 days.";
    return;
  }
  let added = 0;
  for (const workout of res.imported) {
    if (workout.healthId && state.activities.some((a) => a.healthId === workout.healthId)) continue;
    state.activities.push(newActivity({ ...workout, source: "watch" }));
    added++;
  }
  if (added) {
    persist();
    if (ui.screen === "progress") renderProgress();
    if (ui.screen === "calendar") renderCalendar();
  }
  status.textContent = added
    ? `Imported ${added} watch ${added === 1 ? "workout" : "workouts"}. Steps and calories came from the health app where it had them.`
    : "Those watch workouts are already in Heldpath.";
}

async function finishTracking() {
  await track.stopWatching();
  const sess = track.stopSession();
  ui.hideNav = false;
  if (!sess) {
    showScreen("today");
    return;
  }
  const rem = track.courseRemaining(sess);
  const course = sess.courseId ? courseById(sess.courseId) : null;
  const act = newActivity({
    type: sess.type,
    courseId: sess.courseId,
    courseName: sess.courseName,
    startedAt: sess.startedAt,
    endedAt: new Date().toISOString(),
    distanceMeters: rem.onCourse ? rem.traveled : sess.distanceMeters,
    elapsedSec: sess.elapsedSec,
    track: sess.track,
    source: "phone",
  });
  if (act.distanceMeters > 20 || act.elapsedSec > 20) {
    let legResult = null;
    if (course) legResult = splits.updateCourseLegPbs(course, act);

    if (state.settings.healthOptIn) {
      try {
        const write = await health.writeWorkout(act);
        act.healthSync = {
          written: !!write.written,
          status: write.status,
          reason: write.reason || null,
          provider: write.provider || null,
        };
        const reading = await health.readStepsAndCalories(act.startedAt, act.endedAt);
        if (reading.ok && (reading.steps != null || reading.calories != null)) {
          // Values come straight from Health Connect / Apple Health.
          act.health = {
            steps: reading.steps,
            calories: reading.calories,
            provider: reading.provider || null,
          };
        } else if (!reading.ok) {
          act.healthSync.readReason = reading.reason || null;
        }
      } catch (err) {
        act.healthSync = { written: false, status: "error", reason: String(err) };
      }
    }

    state.activities.push(act);
    if (ui.activePlanId) {
      const row = state.plans.find((p) => p.id === ui.activePlanId);
      state.plans = state.plans.filter((p) => p.id !== ui.activePlanId);
      ui.activePlanId = null;
      if (row && row.sourcePlanId) {
        const plan = (state.planLibrary || []).find((p) => p.id === row.sourcePlanId);
        if (plan) applyCompletedSession(plan, act);
      }
    }
    persist();
    map.clearOverlays();
    map.clearMarkers();
    showSummary(act, course, legResult);
    return;
  }
  map.clearOverlays();
  map.clearMarkers();
  showScreen("today");
  setTab("today");
}

function showSummary(act, course, legResult) {
  ui.summary = { act, course, legResult };
  const type = act.type === "run" ? "Run" : "Walk";
  $("summary-title").textContent = `${type} complete`;
  $("summary-sub").textContent = `${new Date(act.endedAt || act.startedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${sourceLabel(act)}`;
  $("summary-stats").innerHTML = `
    <div class="total-box"><div class="num">${formatDistance(act.distanceMeters, units())}</div><div class="lbl">Distance</div></div>
    <div class="total-box"><div class="num">${formatDuration(act.elapsedSec)}</div><div class="lbl">Time</div></div>
    <div class="total-box"><div class="num">${formatPace(act.distanceMeters, act.elapsedSec, units())}</div><div class="lbl">Avg pace</div></div>`;

  const healthBox = $("summary-health");
  healthBox.innerHTML = "";
  const healthLine = healthFieldsText(act);
  if (healthLine) {
    const provider = (act.health && act.health.provider) || "your health app";
    const row = document.createElement("div");
    row.className = "pr-row";
    row.innerHTML = `<span>From ${escapeHtml(provider)}</span><span>${escapeHtml(healthLine)}</span>`;
    healthBox.appendChild(row);
    const note = document.createElement("p");
    note.className = "tiny";
    note.style.marginTop = "10px";
    note.textContent = "Steps and calories are read from the health app. Heldpath never counts them itself.";
    healthBox.appendChild(note);
  } else if (state.settings.healthOptIn) {
    const sync = act.healthSync || {};
    const note = document.createElement("p");
    note.className = "tiny";
    note.textContent = sync.written
      ? "Workout saved to the health app. Steps and calories were not available for this walk, so they stay blank."
      : `Health sync is on, but this workout was not written. ${sync.reason || "The health app is not connected in this build."}`;
    healthBox.appendChild(note);
  } else {
    const note = document.createElement("p");
    note.className = "tiny";
    note.textContent = "Health sync is off. Turn it on in Settings to write workouts and show steps and calories from your health app.";
    healthBox.appendChild(note);
  }

  const splitBox = $("summary-splits");
  splitBox.innerHTML = "";
  if (course && legResult && legResult.legs.length) {
    const status = document.createElement("p");
    status.className = "tiny";
    status.style.marginBottom = "6px";
    status.textContent = splits.splitsStatus(legResult);
    splitBox.appendChild(status);
    const head = document.createElement("div");
    head.className = "split-head";
    head.innerHTML = `<span>Leg</span><span class="t">Time</span><span class="t">Pace</span>`;
    splitBox.appendChild(head);
    const rows = splits.splitRows(course, legResult);
    for (const row of rows) {
      const el = document.createElement("div");
      el.className = "split-row";
      const label = document.createElement("span");
      label.textContent = row.label;
      const time = document.createElement("span");
      time.className = "t";
      time.textContent = splits.formatLegTime(row.seconds);
      const pace = document.createElement("span");
      pace.className = "t";
      pace.textContent = row.pace || "—";
      el.appendChild(label);
      el.appendChild(time);
      el.appendChild(pace);
      if (row.bestSeconds != null) {
        const best = document.createElement("span");
        best.className = "best" + (row.isNewBest ? " new" : "");
        best.textContent = row.isNewBest
          ? `New leg best${row.previousBestSeconds ? ` (was ${splits.formatLegTime(row.previousBestSeconds)})` : ""}`
          : `Leg best ${splits.formatLegTime(row.bestSeconds)}`;
        best.style.gridColumn = "1 / -1";
        el.appendChild(best);
      }
      splitBox.appendChild(el);
    }
    const foot = document.createElement("p");
    foot.className = "tiny";
    foot.style.marginTop = "12px";
    foot.textContent = "Course splits and leg bests are free. Faster weekly split targets belong to optional custom plans.";
    splitBox.appendChild(foot);
  } else if (course) {
    const note = document.createElement("p");
    note.className = "tiny";
    note.textContent = "No course split was recorded for this activity. Walk or run the whole course to set leg bests.";
    splitBox.appendChild(note);
  } else {
    const note = document.createElement("p");
    note.className = "tiny";
    note.textContent = "Free walk: no course splits. Pick a saved course next time to see a split for every leg, free.";
    splitBox.appendChild(note);
  }
  ui.hideNav = true;
  showScreen("summary");
}

function beginBuilder() {
  ui.builderPins = [];
  setTab("today");
  showScreen("builder");
  map.clearOverlays();
  map.clearMarkers();
  renderBuilder();
  if (ui.offBuildClick) ui.offBuildClick();
  ui.offBuildClick = map.onMapClick((pt) => {
    const pins = ui.builderPins;
    const role = pins.length === 0 ? "start" : "via";
    if (pins.length) pins[pins.length - 1].role = pins.length === 1 ? "start" : "via";
    pins.push({ lat: pt.lat, lon: pt.lon, role });
    if (pins.length >= 2) pins[pins.length - 1].role = "end";
    renderBuilder();
  });
}

function cancelBuilder() {
  if (ui.offBuildClick) { ui.offBuildClick(); ui.offBuildClick = null; }
  ui.builderPins = [];
  map.clearOverlays();
  map.clearMarkers();
  showScreen("today");
  setTab("today");
}

function saveBuilder() {
  if (!ui.builderPins || ui.builderPins.length < 2) return;
  $("course-name").value = "New course";
  openSheet("sheet-save-course");
}

/* ——— Bind ——— */
function bind() {
  document.querySelectorAll("#tab-bar .tab").forEach((b) => {
    b.addEventListener("click", () => {
      if (ui.screen === "builder") cancelBuilder();
      if (ui.screen === "support") { setTab("settings"); return; }
      if (ui.screen === "lock") { ui.hideNav = false; setTab("today"); return; }
      setTab(b.dataset.tab);
    });
  });
  $("btn-start-walk").addEventListener("click", () => openStart("walk"));
  $("btn-start-run").addEventListener("click", () => openStart("run"));
  $("btn-build-course").addEventListener("click", beginBuilder);
  $("btn-saved-courses").addEventListener("click", () => setTab("courses"));
  $("btn-new-course").addEventListener("click", beginBuilder);
  $("btn-undo-pin").addEventListener("click", () => {
    if (ui.builderPins) ui.builderPins.pop();
    renderBuilder();
  });
  $("btn-cancel-build").addEventListener("click", cancelBuilder);
  $("btn-save-course").addEventListener("click", saveBuilder);
  $("btn-course-name-cancel").addEventListener("click", () => closeSheet("sheet-save-course"));
  $("btn-course-name-save").addEventListener("click", () => {
    const name = ($("course-name").value || "New course").trim();
    const c = newCourse({ name, pins: ui.builderPins.slice() });
    state.courses.push(c);
    persist();
    closeSheet("sheet-save-course");
    if (ui.offBuildClick) { ui.offBuildClick(); ui.offBuildClick = null; }
    ui.builderPins = [];
    setTab("courses");
  });
  $("btn-pause").addEventListener("click", pauseOrResume);
  $("btn-stop").addEventListener("click", finishTracking);
  $("lock-pause").addEventListener("click", pauseOrResume);
  $("lock-stop").addEventListener("click", () => { finishTracking(); showScreen("today"); });
  $("btn-start-free").addEventListener("click", () => { closeSheet("sheet-start"); startTracking(ui.startType, null); });
  $("btn-start-cancel").addEventListener("click", () => closeSheet("sheet-start"));
  $("cal-prev").addEventListener("click", () => {
    ui.cal = new Date(ui.cal.getFullYear(), ui.cal.getMonth() - 1, 1);
    syncSelectedDayToMonth();
    renderCalendar();
  });
  $("cal-next").addEventListener("click", () => {
    ui.cal = new Date(ui.cal.getFullYear(), ui.cal.getMonth() + 1, 1);
    syncSelectedDayToMonth();
    renderCalendar();
  });
  $("btn-sched-cancel").addEventListener("click", () => closeSheet("sheet-schedule"));
  $("btn-sched-save").addEventListener("click", () => {
    const c = courseById($("sched-course").value);
    if (!c) return;
    state.plans.push(newPlan({
      date: ui.selectedDay,
      courseId: c.id,
      courseName: c.name,
      activityType: $("sched-type").value,
    }));
    persist();
    closeSheet("sheet-schedule");
    renderCalendar();
  });
  $("range-tog").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-range]");
    if (!b) return;
    ui.range = b.dataset.range;
    document.querySelectorAll("#range-tog button").forEach((x) => x.classList.toggle("active", x === b));
    renderProgress();
  });
  $("units-tog").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-units]");
    if (!b) return;
    state.settings.units = b.dataset.units;
    persist();
    render();
  });
  $("health-switch").addEventListener("click", async () => {
    const next = !state.settings.healthOptIn;
    state.settings.healthOptIn = next;
    persist();
    renderSettings();
    if (next) {
      const access = await health.requestAccess();
      if (access.status === "granted") renderSettings();
    }
  });
  $("btn-health-import").addEventListener("click", importWatchActivities);
  $("btn-summary-done").addEventListener("click", () => {
    ui.hideNav = false;
    setTab("today");
    showScreen("today");
  });
  $("btn-course-close").addEventListener("click", () => closeSheet("sheet-course"));
  $("btn-course-walk").addEventListener("click", () => {
    const c = courseById(ui.courseId);
    if (!c) return;
    closeSheet("sheet-course");
    startTracking("walk", c);
  });
  $("btn-course-run").addEventListener("click", () => {
    const c = courseById(ui.courseId);
    if (!c) return;
    closeSheet("sheet-course");
    startTracking("run", c);
  });
  $("btn-course-rename").addEventListener("click", () => {
    const c = courseById(ui.courseId);
    if (!c) return;
    const name = window.prompt("New name", c.name);
    if (name && name.trim()) {
      c.name = name.trim();
      c.updatedAt = new Date().toISOString();
      persist();
      renderCourses();
      openCourseActions(c);
    }
  });
  $("btn-course-delete").addEventListener("click", () => {
    const c = courseById(ui.courseId);
    if (!c) return;
    if (window.confirm(`Delete “${c.name}”? This cannot be undone.`)) {
      state.courses = state.courses.filter((x) => x.id !== c.id);
      persist();
      closeSheet("sheet-course");
      renderCourses();
    }
  });
  $("btn-support").addEventListener("click", () => { showScreen("support"); renderSettings(); });
  $("support-back").addEventListener("click", () => setTab("settings"));
  if ($("btn-plans-open")) $("btn-plans-open").addEventListener("click", () => { showScreen("plans"); renderPlansScreen(); });
  if ($("plans-back")) $("plans-back").addEventListener("click", () => setTab("settings"));
  if ($("btn-donate")) {
    $("btn-donate").addEventListener("click", async () => {
      const res = await purchaseSupport();
      const msg = $("donate-msg");
      if (msg) {
        msg.textContent = res.ok
          ? "Thank you. This $5 donation (" + SUPPORT_PRODUCT_ID + ") is recorded as a stub until Play Billing is wired. Nothing is unlocked, and you never have to donate to use the app."
          : "Donation could not be started.";
      }
    });
  }
  $("btn-map-pack").addEventListener("click", () => openSheet("sheet-map"));
  $("btn-save-pack").addEventListener("click", async () => {
    state.settings.mapPackInstalled = true;
    state.settings.seenMapPrompt = true;
    persist();
    if (isWeb()) {
      try { await persistStarterPack(); } catch (err) { console.warn("map pack save", err); }
    }
    closeSheet("sheet-map");
    renderToday();
    renderSettings();
  });
  $("btn-map-later").addEventListener("click", () => {
    state.settings.seenMapPrompt = true;
    persist();
    closeSheet("sheet-map");
  });

  const a2hsBtn = $("btn-a2hs");
  if (a2hsBtn) {
    const note = $("a2hs-note");
    const refresh = () => {
      if (canPromptInstall()) {
        a2hsBtn.disabled = false;
        if (note) note.textContent = "Ready to install. This does not go through an app store.";
      } else if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) {
        a2hsBtn.disabled = true;
        if (note) note.textContent = "Heldpath is already installed on this device.";
      } else {
        a2hsBtn.disabled = false;
        if (note) note.textContent = "On iPhone, tap the Share button, then Add to Home Screen. On Android, use this button when it appears, or the browser menu.";
      }
    };
    refresh();
    window.addEventListener("heldpath-install-available", refresh);
    a2hsBtn.addEventListener("click", async () => {
      const res = await promptInstall();
      if (!res.ok && note && res.reason === "unavailable") {
        note.textContent = "On iPhone, tap the Share button, then Add to Home Screen. On Android, open the browser menu and choose Add to Home Screen or Install app.";
      }
      refresh();
    });
  }

}

function maybeMapPrompt() {
  if (!state.settings.seenMapPrompt && !params.has("empty") && ui.screen === "today") {
    openSheet("sheet-map");
  }
}

/** Tapping the foreground-service notification opens the live map. */
function handleTrackingLink(url) {
  const link = String(url || "");
  if (!/heldpath:\/\/tracking/i.test(link)) return false;
  if (track.getSession()) {
    ui.hideNav = false;
    setTab("today");
    showScreen("tracking");
    paintSessionHud(track.getSession());
    map.whenReady(() => drawSessionOnMap(track.getSession()));
  } else {
    // No live session (for example the process was restarted): open the map.
    setTab("today");
    showScreen("today");
  }
  return true;
}

async function wireAppLinks() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const launch = await CapacitorApp.getLaunchUrl();
    if (launch && launch.url) handleTrackingLink(launch.url);
  } catch { /* ignore */ }
  try {
    await CapacitorApp.addListener("appUrlOpen", (event) => {
      handleTrackingLink(event && event.url);
    });
  } catch { /* ignore */ }
}

/* ——— Test hook used by overlap shots ——— */
window.HeldpathTest = {
  show: async function show(name, opt = {}) {
    closeSheet("sheet-map");
    closeSheet("sheet-schedule");
    closeSheet("sheet-save-course");
    closeSheet("sheet-start");
    closeSheet("sheet-location");
    closeSheet("sheet-course");
    if (opt.empty) {
      state = resetState();
      state.settings.seenMapPrompt = true;
    } else if (opt.demo !== false) {
      if (!state.settings.demo || opt.reseed) {
        state = resetState();
        seedDemo(state);
        persist();
      }
    }
    ui.hideNav = name === "lock";
    if (name !== "calendar-history") ui.openActId = null;
    if (name === "today") {
      ui.hideNav = false;
      setTab("today");
      showScreen("today");
      const paint = () => {
        const c = state.courses[0];
        map.clearOverlays();
        map.clearMarkers();
        if (c && c.pins && c.pins.length >= 2) {
          map.drawRoute(c.pins, { id: "preview" });
          addCoursePins(c.pins);
          map.fitBounds(c.pins, 80);
        }
      };
      map.whenReady(paint);
      setTimeout(paint, 300);
    }
    else if (name === "tracking" || name === "lock") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses = [course];
      const sess = midCourseWalk(course, units());
      // Install frozen session
      track.stopSession();
      // reuse make + overwrite
      const made = track.makeSession({ type: "walk", course, units: units() });
      Object.assign(made, sess);
      setTab("today");
      showScreen("tracking");
      paintSessionHud(made);
      map.whenReady(() => { drawSessionOnMap(made); map.fitBounds(course.pins, 80); });
      drawSessionOnMap(made);
      if (name === "lock") {
        $("lock-body").textContent = track.liveNotification(made);
        const now = new Date();
        $("lock-clock").textContent = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/ AM| PM/, (m) => m.toLowerCase() === " am" || m.toLowerCase() === " pm" ? "" : m);
        // Keep a clean 9:41-style if demo
        $("lock-clock").textContent = "9:41";
        $("lock-date").textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        ui.hideNav = true;
        showScreen("lock");
      }
    } else if (name === "builder") {
      const pins = (state.courses[0] && state.courses[0].pins) || arnoLoopPins();
      ui.builderPins = pins.map((p) => ({ ...p }));
      showScreen("builder");
      setTab("today");
      showScreen("builder");
      map.whenReady(() => { renderBuilder(); map.fitBounds(ui.builderPins, 80); });
      renderBuilder();
    } else if (name === "courses") setTab("courses");
    else if (name === "courses-empty") { state.courses = []; setTab("courses"); }
    else if (name === "calendar") { ui.cal = startOfDay(new Date()); ui.selectedDay = isoDate(new Date()); setTab("calendar"); }
    else if (name === "calendar-future") {
      const p = state.plans[0];
      if (p) ui.selectedDay = p.date;
      setTab("calendar");
    } else if (name === "calendar-empty") { state.activities = []; state.plans = []; ui.cal = startOfDay(new Date()); ui.selectedDay = isoDate(new Date()); setTab("calendar"); }
    else if (name === "calendar-history") {
      const latest = [...state.activities].sort((a, b) => Date.parse(b.endedAt || b.startedAt) - Date.parse(a.endedAt || a.startedAt))[0];
      if (latest) {
        const d = new Date(latest.endedAt || latest.startedAt);
        ui.cal = startOfDay(d);
        ui.selectedDay = isoDate(d);
        ui.openActId = latest.id;
      }
      setTab("calendar");
    }
    else if (name === "progress") { ui.range = "W"; setTab("progress"); }
    else if (name === "progress-all") { ui.range = "All"; setTab("progress"); }
    else if (name === "progress-empty") { ui.range = "W"; state.activities = []; setTab("progress"); }
    else if (name === "summary") {
      const act = state.activities[state.activities.length - 1];
      if (!act) setTab("today");
      else {
        const c = act.courseId ? courseById(act.courseId) : null;
        const result = c ? splits.updateCourseLegPbs(c, act) : null;
        showSummary(act, c, result);
      }
    }
    else if (name === "course-detail") {
      if (state.courses[0]) openCourseActions(state.courses[0]);
    }
    else if (name === "settings") setTab("settings");
    else if (name === "plans") { showScreen("plans"); renderPlansScreen(); }
    else if (name === "support") { setTab("settings"); showScreen("support"); renderSettings(); }
    else if (name === "map-download") { setTab("today"); openSheet("sheet-map"); }
    else if (name === "location" || name === "disclosure") { setTab("today"); showScreen("today"); openSheet("sheet-location"); }
    else setTab(name);
    render();
    map.resizeMap();
    return { screen: ui.screen, notification: $("lock-body").textContent };
  },
  state: () => state,
  notification: () => (track.getSession() ? track.liveNotification(track.getSession()) : $("lock-body").textContent),
};

async function init() {
  applyPlatformVisibility();
  listenForInstallPrompt();
  registerServiceWorker();
  if (params.has("demo") || params.get("seed") === "1") {
    state = resetState();
    seedDemo(state);
    persist();
  }
  if (params.has("empty")) {
    state = resetState();
    state.settings.seenMapPrompt = true;
  }
  bind();
  track.onNotificationAction(async (action) => {
    if (action === "stop") {
      await finishTracking();
      return;
    }
    if (track.getSession()) {
      paintSessionHud(track.getSession());
    }
  });
  await wireAppLinks();
  initPlansUi({ getState: () => state, persist, units });
  renderSettings();
  try {
    if (Capacitor.isNativePlatform()) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#12161C" });
    }
  } catch { /* web */ }
  await map.initMap($("map"));
  map.whenReady(() => {
    const c = state.courses[0];
    if (c && c.pins.length) {
      map.fitBounds(c.pins, 80);
    } else {
      const d = map.defaultCenter();
      map.setCenter(d.lat, d.lon, 14);
    }
  });
  const screen = params.get("screen");
  if (screen) {
    await window.HeldpathTest.show(screen, { demo: !params.has("empty"), empty: params.has("empty") });
  } else {
    setTab("today");
    maybeMapPrompt();
  }
}

init();
