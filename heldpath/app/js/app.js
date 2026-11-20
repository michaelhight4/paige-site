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
  completeAlertText,
  isoDate,
  startOfDay,
  SUPPORT_COPY,
  escapeHtml,
  METERS_PER_MILE,
  pointAlongPath,
  destination,
} from "./util.js";
import { loadState, saveState, resetState, newCourse, newActivity, newPlan } from "./storage.js";
import * as health from "./health.js";
import { PLANS_HOOK_COPY } from "./plans_hook.js";
import * as map from "./map.js";
import * as track from "./track.js";
import * as splits from "./splits.js";
import { seedDemo, midCourseWalk, pastCourseRun, arnoLoopPins } from "./demo.js";
import { purchaseSupport, SUPPORT_PRODUCT_ID } from "./iap.js";
import { isWeb, applyPlatformVisibility, registerServiceWorker, listenForInstallPrompt, canPromptInstall, promptInstall, WEB_APP_NOTE, WEB_PAY_NOTE } from "./platform.js";
import { renderCalendarView } from "./calendar_view.js";
import { renderProgressView } from "./progress_view.js";
import { initPlansUi, renderPlansScreen } from "./plans_ui.js";
import { initStretchesUi, showStretchesHub, showStretchGroup, showStretchWorkout, showStretchCredits, showStretchFollow, openStretchVideo, closeStretchVideo } from "./stretches_ui.js";
import { initMapDownloadUi, showMapAreas, openCrop, closeCrop } from "./map_download_ui.js";
import { applyCompletedSession, importPlanFile, addPlanToState, makePlan, PLAN_FORMAT, PLAN_FORMAT_VERSION } from "./plans.js";
import { buildPlanDraft } from "./plan_progress.js";
import { encodeCourse, encodePlan, decodeShare, isShareHash, shareSummary, pathPreviewSvg } from "./share_link.js";
import {
  WORLD_VIEW,
  STREET_ZOOM,
  viewForLaunch,
  shouldOfferMapChoice,
  defaultMapDataMode,
  normalizeFix,
  requestPosition,
  LOCATION_DENIED_NOTE,
} from "./locate.js";
import { searchPlaces } from "./geocode.js";
import {
  makeGroupRun,
  inviteMessage,
  smsHref,
  icsText,
  icsFileName,
  addGroupRunToState,
  formatWhen,
} from "./group_run.js";
import { qrSvg } from "./share_qr.js";
import {
  loadBundledGraph,
  getActiveGraph,
  routeLegs,
  autoLoopRoute,
  coursePath,
  courseMeters,
} from "./routing.js";
import {
  planFromCourse,
  planTarget,
  MODE_COURSE,
  MODE_CONTINUE,
  progressOnPlan,
} from "./target_distance.js";
import {
  activityDistanceMeters,
  plannedMeters,
  percentOfPlan,
  shouldOfferOvershootSave,
  shouldOfferFreeRoute,
  celebrationCopy,
  defaultRouteName,
  routeFromTrack,
  extendCourseWithExtra,
} from "./route_save.js";

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
  followPaths: true,
  builderRoute: null,
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
  if ($("map-tools")) $("map-tools").hidden = !mapScreens.has(name);
  document.body.dataset.screen = name;
  document.body.classList.toggle("on-map-screen", mapScreens.has(name));
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
  if (banner) banner.hidden = true;
}

function playQuietCompleteAlert() {
  try { if (navigator.vibrate) navigator.vibrate([200, 80, 220]); } catch { /* ignore */ }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch { /* ignore */ }
}

function completePromptCopy(sess, rem) {
  const kind = sess.target && sess.target.targetMeters > 0 ? "target" : "course";
  return completeAlertText({
    kind,
    meters: (rem && rem.total) || sess.goalCompleteMeters || 0,
    seconds: rem && rem.completeSec != null ? rem.completeSec : (sess.goalCompleteSec != null ? sess.goalCompleteSec : sess.elapsedSec),
    units: sess.units,
  });
}

function paintCompletePrompt(sess, rem) {
  const awaiting = track.awaitingKeepGoing(sess);
  const banner = $("track-complete-banner");
  const text = $("track-complete-text");
  if (banner) {
    banner.hidden = !awaiting;
    banner.classList.toggle("show", awaiting);
  }
  if (text && awaiting) text.textContent = completePromptCopy(sess, rem || track.courseRemaining(sess));
  const live = $("lock-actions-live");
  const done = $("lock-actions-complete");
  const hud = $("track-live-actions");
  if (live) live.hidden = !!awaiting;
  if (done) done.hidden = !awaiting;
  if (hud) hud.hidden = !!awaiting;
}

function maybeAnnounceComplete(sess, rem) {
  if (!sess || !rem || !rem.complete || sess.goalAnnounced || sess.goalKeptGoing) return;
  sess.goalAnnounced = true;
  sess.targetAnnounced = true;
  paintCompletePrompt(sess, rem);
  playQuietCompleteAlert();
  track.refreshNotification(sess, { force: true }).catch(() => {});
}

function paintSessionHud(sess) {
  if (!sess) return;
  const rem = track.courseRemaining(sess);
  const onCourse = rem.onCourse;
  $("track-kicker").textContent = `${sess.type === "run" ? "Run" : "Walk"}${sess.courseName ? " · " + sess.courseName : ""}`;
  const lap = $("track-lap");
  const leftLbl = $("track-left-lbl");
  const etaLbl = $("track-eta-lbl");
  paintCompletePrompt(sess, rem);
  if (rem.complete) {
    if (lap) {
      const kind = sess.target && sess.target.targetMeters > 0 ? "Target done" : "Course done";
      lap.hidden = false;
      lap.textContent = rem.extraMeters > 8 ? `${kind} · +${formatDistance(rem.extraMeters, sess.units)} extra` : kind;
    }
    $("track-remain-wrap").style.display = "grid";
    $("track-left").textContent = `+${formatDistance(rem.extraMeters || 0, sess.units)}`;
    if (leftLbl) leftLbl.textContent = "extra";
    $("track-eta").textContent = formatDuration(rem.completeSec != null ? rem.completeSec : 0);
    if (etaLbl) etaLbl.textContent = sess.target && sess.target.targetMeters > 0 ? "goal time" : "course time";
    $("track-done").textContent = formatDistance(sess.distanceMeters, sess.units);
  } else {
    if (lap) {
      if (rem.lapLabel) {
        lap.hidden = false;
        lap.textContent = rem.lapLabel;
      } else {
        lap.hidden = true;
        lap.textContent = "";
      }
    }
    $("track-remain-wrap").style.display = onCourse ? "grid" : "none";
    if (leftLbl) leftLbl.textContent = "left";
    if (etaLbl) etaLbl.textContent = "remaining";
    if (onCourse) {
      $("track-left").textContent = formatDistance(rem.remaining, sess.units);
      $("track-eta").textContent = rem.remaining <= 8 ? "Done" : formatEta(etaSeconds(rem.remaining, activityMph(sess.type)));
    }
    $("track-done").textContent = formatDistance(onCourse ? rem.traveled : sess.distanceMeters, sess.units);
  }
  maybeAnnounceComplete(sess, rem);
  $("track-time").textContent = formatDuration(sess.elapsedSec);
  $("track-pace").textContent = formatPace(sess.distanceMeters, sess.elapsedSec, sess.units);
  $("btn-pause").textContent = sess.paused ? "Resume" : "Pause";
  $("lock-body").textContent = track.liveNotification(sess);
}

function drawSessionOnMap(sess) {
  map.clearOverlays();
  map.clearMarkers();
  const guide = (sess.coursePath && sess.coursePath.length >= 2) ? sess.coursePath : sess.coursePins;
  if (guide && guide.length) {
    map.drawRoute(guide, { id: "course-line", color: "#7A8798", width: 4 });
    if (sess.coursePins) addCoursePins(sess.coursePins);
    if (sess.target && sess.target.stopPin) {
      map.addPin(sess.target.stopPin, { kind: "stop", label: "Stop" });
    }
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

function builderRoute() {
  const pins = ui.builderPins || [];
  const routed = routeLegs(getActiveGraph(), pins, { straightLine: !ui.followPaths });
  ui.builderRoute = routed;
  return routed;
}

function paintFollowToggle() {
  const btn = $("toggle-follow-paths");
  if (!btn) return;
  btn.classList.toggle("on", !!ui.followPaths);
  btn.setAttribute("aria-checked", ui.followPaths ? "true" : "false");
}

function renderBuilder() {
  const pins = ui.builderPins || [];
  const hint = $("builder-hint");
  const follow = ui.followPaths;
  if (pins.length === 0) hint.textContent = follow
    ? "Tap the map to place a Start pin. Legs follow walkable paths when a map pack covers the area."
    : "Tap the map to place a Start pin. Straight line is on — legs will not follow roads.";
  else if (pins.length === 1) hint.textContent = "Start is placed. Tap to add the next point. Distances update with every pin.";
  else hint.textContent = follow
    ? "Keep adding pins, or save when the route looks right. The last pin is the End. Distances use the walkable path."
    : "Keep adding pins, or save when the route looks right. The last pin is the End. Straight line is on.";

  paintFollowToggle();
  const box = $("builder-legs");
  box.innerHTML = "";
  const note = $("route-fallback-note");
  const routed = pins.length >= 2 ? builderRoute() : (ui.builderRoute = null);
  if (note) {
    if (routed && routed.usedStraight && follow) {
      note.hidden = false;
      note.textContent = "No walkable path was found for one or more legs, so a straight line is used there.";
    } else if (!follow) {
      note.hidden = false;
      note.textContent = "Straight line — not following roads.";
    } else {
      note.hidden = true;
      note.textContent = "";
    }
  }
  if (pins.length < 2) {
    box.innerHTML = `<p class="tiny">Leg distances will show here after the second pin.</p>`;
  } else {
    routed.legs.forEach((leg, i) => {
      const from = i === 0 ? "Start" : `Pin ${i + 1}`;
      const to = i === routed.legs.length - 1 ? "End" : `Pin ${i + 2}`;
      const flag = leg.mode === "straight" && follow ? " · straight line" : "";
      const row = document.createElement("div");
      row.className = "leg-row";
      row.innerHTML = `<span>${from} → ${to}${flag}</span><span>${formatDistance(leg.meters, units())}</span>`;
      box.appendChild(row);
    });
    const total = routed.meters;
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
  const line = routed && routed.path && routed.path.length >= 2 ? routed.path : pins;
  if (line.length >= 2) map.drawRoute(line, { id: "build-line" });
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
    const len = courseMeters(c);
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
  const len = courseMeters(course);
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
    onGroupRun: () => openGroupRun(),
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
    const len = courseMeters(c);
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
  const mode = defaultMapDataMode(state.settings);
  $("map-pack-status").textContent = "A world overview (zoom 0–6) is in the app, so zooming out never goes black. Street detail can be downloaded for offline use, or loaded over the network as you go.";
  const modeNote = $("map-data-mode-note");
  if (modeNote) {
    modeNote.textContent = mode === "offline"
      ? "Current choice: download your local map for offline use. You can change this at any time."
      : mode === "mobile"
        ? "Current choice: use mobile data (the map loads as you go). You can change this at any time."
        : "Choose whether to download your local map or load streets over mobile data.";
  }
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
      const len = courseMeters(c);
      const b = document.createElement("button");
      b.className = "list-item";
      b.innerHTML = `<div class="grow"><h3></h3><p></p></div><div class="meta"></div>`;
      b.querySelector("h3").textContent = c.name;
      b.querySelector("p").textContent = `${formatDistance(len, units())} · ${formatEta(etaSeconds(len, activityMph(type)))}`;
      b.querySelector(".meta").textContent = "Go";
      b.addEventListener("click", () => promptTargetThenStart(type, c));
      list.appendChild(b);
    }
  }
  openSheet("sheet-start");
}


function ensureLocationDisclosure() {
  return new Promise((resolve) => {
    if (state.settings.locationDisclosureAccepted) {
      resolve({ allowed: true, locatePromise: null });
      return;
    }
    const done = (result) => {
      closeSheet("sheet-location");
      resolve(result);
    };
    const yes = $("btn-loc-continue");
    const no = $("btn-loc-cancel");
    const onYes = () => {
      yes.removeEventListener("click", onYes);
      no.removeEventListener("click", onNo);
      state.settings.locationDisclosureAccepted = true;
      persist();
      // Start GPS in this tap: iOS Safari often will not prompt otherwise.
      const locatePromise = requestPosition();
      done({ allowed: true, locatePromise });
    };
    const onNo = () => {
      yes.removeEventListener("click", onYes);
      no.removeEventListener("click", onNo);
      done({ allowed: false, locatePromise: null });
    };
    yes.addEventListener("click", onYes);
    no.addEventListener("click", onNo);
    openSheet("sheet-location");
  });
}

function parseTargetMeters() {
  const raw = $("target-distance").value;
  if (raw === "" || raw == null) return null;
  const n = Number(raw);
  if (!(n > 0) || !Number.isFinite(n)) return null;
  return units() === "km" ? n * 1000 : n * METERS_PER_MILE;
}

function refreshTargetOptions() {
  const course = ui.pendingStart && ui.pendingStart.course;
  const meters = parseTargetMeters();
  const len = course ? courseMeters(course) : 0;
  const over = meters != null && len > 0 && meters > len + 0.5;
  const overBox = $("target-over-options");
  const startBtn = $("btn-target-start");
  const hint = $("target-blank-hint");
  if (overBox) overBox.hidden = !over;
  if (startBtn) startBtn.hidden = !!over;
  if (hint) hint.hidden = !!over;
  const sheet = $("sheet-target");
  if (sheet) sheet.classList.toggle("target-is-over", !!over);
}

function promptTargetThenStart(type, course) {
  if (!course) {
    startTracking(type, null);
    return;
  }
  ui.pendingStart = { type, course };
  closeSheet("sheet-start");
  closeSheet("sheet-course");
  const len = courseMeters(course);
  $("target-course-sub").textContent = `${course.name} · ${formatDistance(len, units())}`;
  $("target-unit").textContent = units() === "km" ? "km" : "mi";
  $("target-distance").value = "";
  refreshTargetOptions();
  openSheet("sheet-target");
}

function startPendingWithMode(mode) {
  const pending = ui.pendingStart;
  if (!pending) return;
  const meters = parseTargetMeters();
  const plan = meters ? planFromCourse(pending.course, meters, mode || MODE_COURSE) : null;
  closeSheet("sheet-target");
  startTracking(pending.type, pending.course, null, plan);
}

async function startTracking(type, course, plan, targetPlan) {
  closeSheet("sheet-start");
  closeSheet("sheet-target");
  const disc = await ensureLocationDisclosure();
  if (!disc || !disc.allowed) return;
  const sess = track.makeSession({ type, course, units: units(), target: targetPlan || null });
  setTab("today");
  showScreen("tracking");
  paintSessionHud(sess);
  const fit = (sess.coursePath && sess.coursePath.length >= 2) ? sess.coursePath : (course && course.pins);
  map.whenReady(() => {
    if (fit && fit.length) {
      drawSessionOnMap(sess);
      map.fitBounds(fit, { top: 56, bottom: 420, left: 48, right: 48 });
    }
  });
  if (fit && fit.length) {
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
  const course = sess.courseId ? courseById(sess.courseId) : null;
  const act = newActivity({
    type: sess.type,
    courseId: sess.courseId,
    courseName: sess.courseName,
    startedAt: sess.startedAt,
    endedAt: new Date().toISOString(),
    distanceMeters: activityDistanceMeters(sess),
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
    if (shouldOfferOvershootSave(sess)) {
      await ensureWalkGraph();
      ui.pendingSaveRoute = { act, course, sess, track: (sess.track || []).slice(), graph: getActiveGraph(), legResult };
      const pct = percentOfPlan(act.distanceMeters, plannedMeters(sess));
      $("celebrate-copy").textContent = celebrationCopy(pct, { hasCourse: !!course });
      showOfferMap(sess, course);
      openSheet("sheet-celebrate");
      return;
    }
    if (shouldOfferFreeRoute(sess)) {
      await ensureWalkGraph();
      const built = routeFromTrack(sess.track, getActiveGraph());
      ui.pendingFreeRoute = { act, course, built, legResult };
      $("save-free-distance").textContent = formatDistance(built.meters || act.distanceMeters, units());
      $("save-free-name").value = defaultRouteName(act);
      showFreeRouteMap(built);
      openSheet("sheet-save-free");
      return;
    }
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


function trackToCoursePins(track) {
  if (!track || track.length < 2) return [];
  const pins = [{ lat: track[0].lat, lon: track[0].lon, role: "start" }];
  const last = track[track.length - 1];
  // A few vias at roughly even spacing, enough to redraw the path.
  const step = Math.max(1, Math.floor(track.length / 6));
  for (let i = step; i < track.length - 1; i += step) {
    pins.push({ lat: track[i].lat, lon: track[i].lon, role: "via" });
  }
  pins.push({ lat: last.lat, lon: last.lon, role: "end" });
  return pins;
}

function setOfferChrome(on) {
  const dock = $("today-dock");
  if (dock) dock.hidden = !!on;
  ui.hideNav = !!on;
  if ($("tab-bar")) $("tab-bar").style.display = on ? "none" : "grid";
}

function showOfferMap(sess, course) {
  setOfferChrome(true);
  showScreen("today");
  map.clearOverlays();
  map.clearMarkers();
  const guide = (sess && sess.coursePath && sess.coursePath.length >= 2) ? sess.coursePath : (course && course.pins);
  if (guide && guide.length) {
    map.drawRoute(guide, { id: "course-line", color: "#7A8798", width: 4 });
    if (course && course.pins) addCoursePins(course.pins);
  }
  if (sess && sess.track && sess.track.length >= 2) {
    map.drawRoute(sess.track, { id: "live-line", color: "#4EC3F7", width: 5 });
  }
  const fit = (sess && sess.track && sess.track.length >= 2) ? sess.track : guide;
  if (fit && fit.length) {
    const pad = { top: 56, bottom: 420, left: 48, right: 48 };
    map.whenReady(() => map.fitBounds(fit, pad));
    map.fitBounds(fit, pad);
  }
}

function showFreeRouteMap(built) {
  setOfferChrome(true);
  showScreen("today");
  map.clearOverlays();
  map.clearMarkers();
  const line = (built && built.path && built.path.length >= 2) ? built.path : (built && built.pins) || [];
  if (line.length >= 2) map.drawRoute(line, { id: "live-line", color: "#4EC3F7", width: 5 });
  if (built && built.pins) addCoursePins(built.pins);
  if (line.length) {
    const pad = { top: 56, bottom: 520, left: 48, right: 48 };
    map.whenReady(() => map.fitBounds(line, pad));
    map.fitBounds(line, pad);
  }
}

function finishOfferAndSummarize() {
  const pending = ui.pendingSaveRoute || ui.pendingFreeRoute;
  const act = pending && pending.act;
  const course = pending && pending.course;
  const legResult = pending && pending.legResult;
  ui.pendingSaveRoute = null;
  ui.pendingFreeRoute = null;
  closeSheet("sheet-celebrate");
  closeSheet("sheet-save-route");
  closeSheet("sheet-save-free");
  setOfferChrome(false);
  map.clearOverlays();
  map.clearMarkers();
  if (act) showSummary(act, course, legResult);
  else {
    showScreen("today");
    setTab("today");
  }
}

function openSaveRouteChoice() {
  const pending = ui.pendingSaveRoute;
  closeSheet("sheet-celebrate");
  if (!pending) {
    finishOfferAndSummarize();
    return;
  }
  const name = pending.course ? pending.course.name : "this course";
  const updateBtn = $("btn-save-route-update");
  if (updateBtn) {
    updateBtn.hidden = !pending.course;
    updateBtn.textContent = pending.course ? `Add the new part to ${name}` : "Add the new part";
  }
  $("btn-save-route-new").textContent = "Save as a new route";
  $("btn-save-route-skip").textContent = "Keep the activity only";
  $("save-route-sub").textContent = pending.course
    ? `You went past ${pending.course.name}. Add the new part to the saved route, or save a new one?`
    : "Save a new route from the path you just ran, or keep the activity only.";
  openSheet("sheet-save-route");
}

function commitSavedRoute(how) {
  const pending = ui.pendingSaveRoute;
  closeSheet("sheet-save-route");
  if (!pending || how === "skip") {
    finishOfferAndSummarize();
    return;
  }
  const graph = pending.graph || getActiveGraph();
  if (how === "extend" && pending.course) {
    const ext = extendCourseWithExtra(pending.course, pending.track, pending.sess, graph);
    pending.course.pins = ext.pins;
    pending.course.path = ext.path;
    pending.course.updatedAt = new Date().toISOString();
  } else {
    const built = pending.course
      ? extendCourseWithExtra(pending.course, pending.track, pending.sess, graph)
      : routeFromTrack(pending.track, graph);
    const base = pending.course ? `${pending.course.name} (extended)` : defaultRouteName(pending.act);
    state.courses.push(newCourse({ name: base, pins: built.pins, path: built.path }));
  }
  persist();
  finishOfferAndSummarize();
}

function commitFreeRoute(save) {
  const pending = ui.pendingFreeRoute;
  closeSheet("sheet-save-free");
  if (save && pending && pending.built && pending.built.pins && pending.built.pins.length >= 2) {
    const typed = (($("save-free-name") && $("save-free-name").value) || "").trim();
    const name = typed || defaultRouteName(pending.act);
    state.courses.push(newCourse({ name, pins: pending.built.pins, path: pending.built.path }));
    persist();
  }
  finishOfferAndSummarize();
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
  $("toggle-follow-paths").addEventListener("click", () => {
    ui.followPaths = !ui.followPaths;
    paintFollowToggle();
    renderBuilder();
  });
  $("btn-course-name-cancel").addEventListener("click", () => closeSheet("sheet-save-course"));
  $("btn-course-name-save").addEventListener("click", () => {
    const name = ($("course-name").value || "New course").trim();
    const routed = ui.builderRoute || builderRoute();
    const c = newCourse({
      name,
      pins: ui.builderPins.slice(),
      path: routed && routed.path && routed.path.length >= 2 ? routed.path.slice() : null,
      straightLine: !ui.followPaths,
      usedStraight: !!(routed && routed.usedStraight),
    });
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
  $("lock-stop").addEventListener("click", finishTracking);
  function keepGoingFromUi() {
    const s = track.getSession();
    if (!s) return;
    track.keepGoingAfterGoal(s);
    track.refreshNotification(s, { force: true }).catch(() => {});
    paintSessionHud(s);
  }
  if ($("btn-keep-going")) $("btn-keep-going").addEventListener("click", keepGoingFromUi);
  if ($("btn-complete-stop")) $("btn-complete-stop").addEventListener("click", finishTracking);
  if ($("lock-keep-going")) $("lock-keep-going").addEventListener("click", keepGoingFromUi);
  if ($("lock-complete-stop")) $("lock-complete-stop").addEventListener("click", finishTracking);
  $("btn-start-free").addEventListener("click", () => { closeSheet("sheet-start"); startTracking(ui.startType, null); });
  $("btn-start-cancel").addEventListener("click", () => closeSheet("sheet-start"));
  $("target-distance").addEventListener("input", refreshTargetOptions);
  $("btn-target-start").addEventListener("click", () => startPendingWithMode(MODE_COURSE));
  $("btn-target-use-course").addEventListener("click", () => startPendingWithMode(MODE_COURSE));
  $("btn-target-continue-past").addEventListener("click", () => startPendingWithMode(MODE_CONTINUE));
  $("btn-target-cancel").addEventListener("click", () => {
    closeSheet("sheet-target");
    if (ui.pendingStart) openSheet("sheet-start");
  });
  $("btn-save-route-new").addEventListener("click", () => commitSavedRoute("new"));
  $("btn-save-route-update").addEventListener("click", () => commitSavedRoute("extend"));
  $("btn-save-route-skip").addEventListener("click", () => commitSavedRoute("skip"));
  if ($("btn-celebrate-next")) $("btn-celebrate-next").addEventListener("click", openSaveRouteChoice);
  if ($("btn-save-free-save")) $("btn-save-free-save").addEventListener("click", () => commitFreeRoute(true));
  if ($("btn-save-free-skip")) $("btn-save-free-skip").addEventListener("click", () => commitFreeRoute(false));
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
  $("btn-course-share").addEventListener("click", () => {
    const c = courseById(ui.courseId);
    if (!c) return;
    openShareSheet("course", c);
  });
  $("btn-course-group").addEventListener("click", () => {
    const c = courseById(ui.courseId);
    closeSheet("sheet-course");
    openGroupRun({ courseId: c && c.id });
  });
  $("btn-group-cancel").addEventListener("click", () => closeSheet("sheet-group"));
  $("btn-group-create").addEventListener("click", () => { createGroupRunFromSheet(); });
  $("btn-group-invite-close").addEventListener("click", () => closeSheet("sheet-group-invite"));
  $("btn-group-copy").addEventListener("click", () => { copyGroupInvite().catch(() => {}); });
  $("btn-group-cal").addEventListener("click", () => { addGroupToCalendar().catch(() => {}); });
  $("btn-share-close").addEventListener("click", () => closeSheet("sheet-share"));
  $("btn-share-copy").addEventListener("click", () => { copyShareLink().catch(() => {}); });
  $("btn-share-send").addEventListener("click", () => { sendShareLink().catch(() => {}); });
  $("btn-share-import-cancel").addEventListener("click", () => {
    ui.pendingShare = null;
    closeSheet("sheet-share-import");
  });
  $("btn-share-import-add").addEventListener("click", () => { acceptIncomingShare(); });
  $("share-url").addEventListener("click", (e) => { e.target.select(); });
  $("btn-course-walk").addEventListener("click", () => {
    const c = courseById(ui.courseId);
    if (!c) return;
    promptTargetThenStart("walk", c);
  });
  $("btn-course-run").addEventListener("click", () => {
    const c = courseById(ui.courseId);
    if (!c) return;
    promptTargetThenStart("run", c);
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
  initStretchesUi({ showScreen, goSettings: () => setTab("settings") });
  initMapDownloadUi({
    showScreen,
    goSettings: () => setTab("settings"),
    setHideNav: (v) => {
      ui.hideNav = !!v;
      $("tab-bar").style.display = v || ui.screen === "lock" ? "none" : "grid";
    },
  });
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
  if ($("btn-locate-me")) {
    $("btn-locate-me").addEventListener("click", () => locateUser({ animate: true }));
  }
  if ($("btn-map-use-location")) {
    $("btn-map-use-location").addEventListener("click", () => locateUser({ animate: true }));
  }
  bindPlaceSearch($("place-search"), $("place-search-results"));
  bindPlaceSearch($("map-choice-search"), $("map-choice-search-results"));
  if ($("btn-map-download-local")) {
    $("btn-map-download-local").addEventListener("click", () => chooseMapDataMode("offline"));
  }
  if ($("btn-map-use-data")) {
    $("btn-map-use-data").addEventListener("click", () => chooseMapDataMode("mobile"));
  }
  if ($("btn-map-mode-download")) {
    $("btn-map-mode-download").addEventListener("click", () => chooseMapDataMode("offline", { fromSettings: true }));
  }
  if ($("btn-map-mode-data")) {
    $("btn-map-mode-data").addEventListener("click", () => chooseMapDataMode("mobile", { fromSettings: true }));
  }

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

function applyLaunchView(point, { animate = false } = {}) {
  const view = viewForLaunch({ lastKnown: state.settings.lastKnown, fix: point });
  if (animate) map.flyTo(view.lat, view.lon, view.zoom);
  else map.setCenter(view.lat, view.lon, view.zoom);
  if (view.source !== "world") map.setUserDot(view);
  else map.clearUserDot();
  return view;
}

function rememberLocation(fix) {
  const saved = normalizeFix(fix);
  if (!saved) return null;
  state.settings.lastKnown = saved;
  persist();
  return saved;
}

function currentCropCenter() {
  const known = normalizeFix(state.settings.lastKnown);
  if (known) return { lat: known.lat, lon: known.lon, zoom: STREET_ZOOM };
  const m = map.getMap && map.getMap();
  if (m) {
    const c = m.getCenter();
    return { lat: c.lat, lon: c.lng, zoom: m.getZoom() };
  }
  return { ...WORLD_VIEW };
}

function openMapChoice() {
  openSheet("sheet-map");
}

function chooseMapDataMode(mode, { fromSettings = false } = {}) {
  state.settings.mapDataMode = mode === "offline" ? "offline" : "mobile";
  state.settings.seenMapPrompt = true;
  persist();
  closeSheet("sheet-map");
  renderSettings();
  renderToday();
  if (mode === "offline") {
    const at = currentCropCenter();
    openCrop({ lat: at.lat, lon: at.lon, zoom: at.zoom, afterClose: fromSettings ? "map-areas" : "today" });
  }
}

function setLocateBusy(busy) {
  const btn = $("btn-locate-me");
  const choice = $("btn-map-use-location");
  if (btn) {
    btn.classList.toggle("busy", !!busy);
    btn.disabled = !!busy;
  }
  if (choice) {
    choice.disabled = !!busy;
    choice.textContent = busy ? "Finding your location…" : "Use my location";
  }
}

function showLocateDenied(reason) {
  const denied = reason === "denied" || reason === "unavailable" || reason === "timeout" || reason === "error";
  const note = denied ? LOCATION_DENIED_NOTE : "";
  for (const id of ["map-locate-note", "map-choice-locate-note"]) {
    const el = $(id);
    if (!el) continue;
    if (note) {
      el.hidden = false;
      el.textContent = note;
    } else {
      el.hidden = true;
      el.textContent = "";
    }
  }
}

function hideLocateDenied() {
  for (const id of ["map-locate-note", "map-choice-locate-note"]) {
    const el = $(id);
    if (el) { el.hidden = true; el.textContent = ""; }
  }
}

function applyLocateResult(res, { animate = true } = {}) {
  if (res && res.ok && res.fix) {
    rememberLocation(res.fix);
    applyLaunchView(res.fix, { animate });
    hideLocateDenied();
    return true;
  }
  showLocateDenied(res && res.reason);
  applyLaunchView(null, { animate: false });
  return false;
}

/** Start a GPS read. Pass { fromGesture: true } from a click so iOS can show the prompt. */
function locateUser({ animate = true } = {}) {
  setLocateBusy(true);
  const pending = requestPosition();
  return pending.then((res) => {
    setLocateBusy(false);
    applyLocateResult(res, { animate });
    return res;
  }).catch((err) => {
    setLocateBusy(false);
    const res = { ok: false, fix: null, reason: "error" };
    applyLocateResult(res, { animate: false });
    return res;
  });
}

function flyToPlace(place) {
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) return;
  hideLocateDenied();
  map.flyTo(place.lat, place.lon, STREET_ZOOM);
}

function bindPlaceSearch(input, list) {
  if (!input || !list) return;
  let timer = null;
  let inflight = null;
  const close = () => { list.hidden = true; list.innerHTML = ""; };
  const renderHits = (places) => {
    list.innerHTML = "";
    if (!places.length) { close(); return; }
    for (const place of places) {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = place.label;
      b.addEventListener("click", () => {
        input.value = place.label;
        close();
        flyToPlace(place);
      });
      li.appendChild(b);
      list.appendChild(li);
    }
    list.hidden = false;
  };
  const run = async () => {
    const q = input.value.trim();
    if (q.length < 2) { close(); return; }
    if (inflight && inflight.abort) inflight.abort();
    const ac = new AbortController();
    inflight = ac;
    try {
      const places = await searchPlaces(q, { limit: 5, signal: ac.signal });
      if (inflight !== ac) return;
      renderHits(places);
    } catch (err) {
      if (err && err.name === "AbortError") return;
      close();
    }
  };
  input.addEventListener("input", () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(run, 400);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (timer) clearTimeout(timer);
      run();
    }
    if (e.key === "Escape") close();
  });
  document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) close();
  });
}

async function locateAndOfferMapChoice() {
  const skipSheets = params.has("empty") || params.has("screen") || params.has("demo");
  applyLaunchView(null, { animate: false });
  if (skipSheets) return;
  let allowed = !!state.settings.locationDisclosureAccepted;
  let locatePromise = null;
  if (!allowed) {
    const disc = await ensureLocationDisclosure();
    allowed = !!(disc && disc.allowed);
    locatePromise = disc && disc.locatePromise;
  }
  if (allowed) {
    // Prefer the request started in the Continue tap (iOS). If disclosure
    // was already accepted, try now; iOS may still need the on-map button.
    const res = await (locatePromise || requestPosition());
    applyLocateResult(res, { animate: true });
  }
  if (shouldOfferMapChoice(state.settings) && ui.screen === "today") {
    openMapChoice();
  }
}

function maybeMapPrompt() {
  if (shouldOfferMapChoice(state.settings) && !params.has("empty") && !params.has("screen") && ui.screen === "today") {
    openMapChoice();
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

function fillGroupPreview() {
  const c = courseById($("group-course").value);
  const type = $("group-type").value;
  const date = $("group-date").value;
  const time = $("group-time").value;
  if (!c || !date || !time) {
    $("group-preview").textContent = "Choose a course, date, and time.";
    return;
  }
  const start = new Date(`${date}T${time}`);
  if (Number.isNaN(start.getTime())) {
    $("group-preview").textContent = "That date or time could not be read.";
    return;
  }
  const len = courseMeters(c);
  $("group-preview").textContent = `${c.name} · ${formatDistance(len, units())} · ${formatWhen(start.toISOString())} · ${formatEta(etaSeconds(len, activityMph(type)))}`;
}

function openGroupRun(opt = {}) {
  if (!state.courses.length) {
    window.alert("Save a course first, then you can plan a Group Run.");
    setTab("courses");
    return;
  }
  const sel = $("group-course");
  sel.innerHTML = state.courses.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  const preferred = opt.courseId || ui.courseId;
  if (preferred && state.courses.some((c) => c.id === preferred)) sel.value = preferred;
  const today = isoDate(new Date());
  $("group-date").value = opt.date || ui.selectedDay || today;
  $("group-time").value = opt.time || "09:00";
  $("group-type").value = opt.type || "walk";
  sel.onchange = fillGroupPreview;
  $("group-type").onchange = fillGroupPreview;
  $("group-date").onchange = fillGroupPreview;
  $("group-time").onchange = fillGroupPreview;
  fillGroupPreview();
  openSheet("sheet-group");
}

function createGroupRunFromSheet() {
  const c = courseById($("group-course").value);
  const date = $("group-date").value;
  const time = $("group-time").value;
  if (!c || !date || !time) return;
  const start = new Date(`${date}T${time}`);
  const made = makeGroupRun({ course: c, startAt: start, activityType: $("group-type").value });
  if (!made.ok) {
    $("group-preview").textContent = "Could not create that Group Run. Check the date and course.";
    return;
  }
  addGroupRunToState(state, made.run);
  persist();
  closeSheet("sheet-group");
  ui.selectedDay = isoDate(start);
  if (ui.screen === "calendar") renderCalendar();
  openGroupInvite(made.run);
}

function openGroupInvite(run) {
  ui.pendingGroupRun = run;
  $("group-invite-title").textContent = run.title || "Invite your group";
  $("group-invite-sub").textContent = formatWhen(run.startAt);
  $("group-invite-text").value = inviteMessage(run);
  const sms = $("btn-group-sms");
  sms.href = smsHref(run);
  $("group-invite-note").textContent = "Text friends opens your SMS app so you can pick people from your contacts. Heldpath does not read your address book.";
  openSheet("sheet-group-invite");
}

async function copyGroupInvite() {
  const text = $("group-invite-text").value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    $("group-invite-note").textContent = "Invite copied.";
  } catch {
    $("group-invite-text").select();
    $("group-invite-note").textContent = "Copy the invite from the field above.";
  }
}

async function addGroupToCalendar() {
  const run = ui.pendingGroupRun;
  if (!run) return;
  const blob = new Blob([icsText(run)], { type: "text/calendar;charset=utf-8" });
  const name = icsFileName(run);
  try {
    const file = new File([blob], name, { type: "text/calendar" });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: run.title, text: inviteMessage(run) });
      return;
    }
  } catch (err) {
    if (err && err.name === "AbortError") return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $("group-invite-note").textContent = "Calendar file saved. Open it to add this Group Run to your calendar.";
}

function openShareSheet(kind, obj) {
  closeSheet("sheet-course");
  ui.pendingShareOut = { kind, obj };
  const encoded = kind === "plan" ? encodePlan(obj) : encodeCourse(obj);
  const summary = kind === "plan"
    ? shareSummary({ ok: true, kind: "plan", plan: obj }, units())
    : shareSummary(decodeShare(encoded.url), units());
  $("share-title").textContent = kind === "plan" ? "Share this plan" : "Share this course";
  $("share-sub").textContent = summary.sub || "";
  $("share-url").value = encoded.url;
  let note = kind === "plan"
    ? "Anyone with the link can import this plan for free. The plan stays in the link, not on a server."
    : "Anyone with the link can add this course. The route stays in the link, not on a server.";
  if (encoded.omittedPath) {
    note = "The link uses the pins so it stays short. Heldpath can route the path again when someone opens it.";
  }
  if (encoded.tooLong) {
    note = "This plan is large for a link. Export the file instead if the link does not open.";
  }
  $("share-note").textContent = note;
  const qrBox = $("share-qr");
  try {
    qrBox.innerHTML = qrSvg(encoded.qrUrl || encoded.url);
    qrBox.hidden = false;
  } catch (err) {
    qrBox.innerHTML = "";
    qrBox.hidden = true;
    console.warn("qr", err);
  }
  openSheet("sheet-share");
}

async function copyShareLink() {
  const url = $("share-url").value;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    $("share-note").textContent = "Link copied.";
  } catch {
    $("share-url").select();
    $("share-note").textContent = "Copy the link from the field above.";
  }
}

async function sendShareLink() {
  const url = $("share-url").value;
  if (!url) return;
  const title = $("share-title").textContent || "Heldpath";
  if (navigator.share) {
    try {
      await navigator.share({ title, text: "Open this in Heldpath.", url });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  await copyShareLink();
}

function openImportSheet(decoded) {
  if (!decoded || !decoded.ok) return;
  ui.pendingShare = decoded;
  const summary = shareSummary(decoded, units());
  if (decoded.kind === "plan") {
    $("share-import-title").textContent = "Add this plan?";
    $("share-import-sub").textContent = `${summary.title} · ${summary.sub}`;
    $("btn-share-import-add").textContent = "Import this plan for free";
    const pins = decoded.plan && decoded.plan.route && decoded.plan.route.pins;
    $("share-import-preview").innerHTML = pins && pins.length ? pathPreviewSvg(pins) : "";
  } else {
    $("share-import-title").textContent = "Add this course?";
    $("share-import-sub").textContent = `${summary.title} · ${summary.sub}`;
    $("btn-share-import-add").textContent = "Add to my library";
    const pts = decoded.course.path && decoded.course.path.length ? decoded.course.path : decoded.course.pins;
    $("share-import-preview").innerHTML = pathPreviewSvg(pts);
  }
  openSheet("sheet-share-import");
}

function acceptIncomingShare() {
  const decoded = ui.pendingShare;
  if (!decoded || !decoded.ok) return;
  if (decoded.kind === "plan") {
    const res = importPlanFile(JSON.stringify({
      format: PLAN_FORMAT,
      formatVersion: PLAN_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      plan: decoded.plan,
    }), { existingIds: (state.planLibrary || []).map((p) => p.id) });
    if (!res.ok) {
      $("share-import-sub").textContent = "That plan could not be imported. Nothing was charged.";
      return;
    }
    addPlanToState(state, res.plan);
    persist();
    ui.pendingShare = null;
    closeSheet("sheet-share-import");
    showScreen("plans");
    renderPlansScreen();
    return;
  }
  const incoming = decoded.course;
  const existing = (state.courses || []).find((c) => {
    if (!c.pins || c.pins.length !== incoming.pins.length) return false;
    return c.pins.every((p, i) =>
      Math.abs(p.lat - incoming.pins[i].lat) < 1e-5 && Math.abs(p.lon - incoming.pins[i].lon) < 1e-5
    );
  });
  if (existing) {
    ui.pendingShare = null;
    closeSheet("sheet-share-import");
    setTab("courses");
    openCourseActions(existing);
    return;
  }
  const course = newCourse({
    name: incoming.name,
    pins: incoming.pins,
    path: incoming.path,
    straightLine: incoming.straightLine,
  });
  state.courses.push(course);
  persist();
  ui.pendingShare = null;
  closeSheet("sheet-share-import");
  setTab("courses");
  openCourseActions(course);
}

function handleIncomingUrl(url) {
  if (handleTrackingLink(url)) return true;
  const decoded = decodeShare(url);
  if (!decoded.ok) return false;
  openImportSheet(decoded);
  if (typeof history !== "undefined" && typeof location !== "undefined" && isShareHash(location.hash)) {
    try { history.replaceState(null, "", location.pathname + location.search); } catch { /* ignore */ }
  }
  return true;
}

async function wireAppLinks() {
  try {
    if (typeof location !== "undefined" && isShareHash(location.href)) handleIncomingUrl(location.href);
  } catch { /* ignore */ }
  if (!Capacitor.isNativePlatform()) return;
  try {
    const launch = await CapacitorApp.getLaunchUrl();
    if (launch && launch.url) handleIncomingUrl(launch.url);
  } catch { /* ignore */ }
  try {
    await CapacitorApp.addListener("appUrlOpen", (event) => {
      handleIncomingUrl(event && event.url);
    });
  } catch { /* ignore */ }
}

/* ——— Test hook used by overlap shots ——— */

  async function ensureWalkGraph() {
    if (getActiveGraph()) return getActiveGraph();
    if (!ui.graphPromise) {
      ui.graphPromise = loadBundledGraph().catch((err) => {
        console.warn("walk graph", err && err.message ? err.message : err);
        return null;
      });
    }
    return ui.graphPromise;
  }

  async function waitForMapView() {
    const start = Date.now();
    while (!map.getMap() && Date.now() - start < 20000) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

window.HeldpathTest = {
  show: async function show(name, opt = {}) {
    hideLocateDenied();
    closeStretchVideo();
    if ($("map-banner")) { $("map-banner").hidden = true; $("map-banner").textContent = ""; }
    closeSheet("sheet-map");
    closeSheet("sheet-schedule");
    closeSheet("sheet-save-course");
    closeSheet("sheet-start");
    closeSheet("sheet-location");
    closeSheet("sheet-course");
    closeSheet("sheet-target");
    closeSheet("sheet-save-route");
    closeSheet("sheet-celebrate");
    closeSheet("sheet-save-free");
    closeSheet("sheet-share");
    if (typeof setOfferChrome === "function") setOfferChrome(false);
    try { map.clearOverlays(); map.clearMarkers(); } catch { /* map may not be ready */ }
    closeSheet("sheet-share-import");
    closeSheet("sheet-group");
    closeSheet("sheet-group-invite");
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
    } else if (name === "tracking-extra" || name === "route-complete" || name === "lock-complete") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses = [course];
      const sess = pastCourseRun(course, units());
      track.stopSession();
      const made = track.makeSession({ type: "run", course, units: units() });
      Object.assign(made, sess);
      if (name === "tracking-extra") made.goalKeptGoing = true;
      else made.goalKeptGoing = false;
      setTab("today");
      showScreen("tracking");
      paintSessionHud(made);
      const fitPad = { top: 56, bottom: 420, left: 48, right: 48 };
      map.whenReady(() => { drawSessionOnMap(made); map.fitBounds(made.track || course.pins, fitPad); });
      drawSessionOnMap(made);
      if (name === "lock-complete") {
        $("lock-body").textContent = track.liveNotification(made);
        $("lock-clock").textContent = "9:41";
        $("lock-date").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
        ui.hideNav = true;
        showScreen("lock");
      }
    } else if (name === "celebrate-overshoot" || name === "save-route-choice") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses = [course];
      const sess = pastCourseRun(course, units());
      const act = newActivity({
        type: "run",
        courseId: course.id,
        courseName: course.name,
        startedAt: sess.startedAt,
        endedAt: new Date().toISOString(),
        distanceMeters: sess.distanceMeters,
        elapsedSec: sess.elapsedSec,
        track: sess.track,
        source: "phone",
      });
      ui.pendingSaveRoute = { act, course, sess, track: sess.track.slice(), graph: getActiveGraph() };
      const pct = percentOfPlan(act.distanceMeters, plannedMeters(sess));
      $("celebrate-copy").textContent = celebrationCopy(pct, { hasCourse: true });
      showOfferMap(sess, course);
      if (name === "save-route-choice") openSaveRouteChoice();
      else openSheet("sheet-celebrate");
    } else if (name === "save-free-route") {
      await ensureWalkGraph();
      const origin = { lat: 43.7672, lon: 11.2543 };
      const pts = [{ lat: origin.lat, lon: origin.lon }];
      const steps = [[90, 180], [90, 180], [20, 140], [20, 140], [300, 200], [300, 160]];
      let cur = { lat: origin.lat, lon: origin.lon };
      for (const [bearing, meters] of steps) {
        cur = destination(cur.lat, cur.lon, bearing, meters);
        pts.push({ lat: cur.lat, lon: cur.lon });
      }
      const built = routeFromTrack(pts, getActiveGraph());
      const started = new Date(2026, 10, 20, 8, 0, 0);
      const act = newActivity({
        type: "run",
        startedAt: started.toISOString(),
        endedAt: new Date(started.getTime() + 22 * 60 * 1000).toISOString(),
        distanceMeters: built.meters || 1000,
        elapsedSec: 22 * 60,
        track: pts,
        source: "phone",
      });
      ui.pendingFreeRoute = { act, built };
      $("save-free-distance").textContent = formatDistance(built.meters || act.distanceMeters, units());
      $("save-free-name").value = "Morning run, Nov 20";
      showFreeRouteMap(built);
      openSheet("sheet-save-free");
    } else if (name === "builder" || name === "routing-builder" || name === "routing-straight" || name === "routing-loop") {
      await ensureWalkGraph();
      ui.followPaths = name !== "routing-straight";
      if (name === "routing-loop") {
        const center = { lat: 43.7672, lon: 11.2543 };
        const loop = getActiveGraph() ? autoLoopRoute(getActiveGraph(), center, 1609) : null;
        if (loop && loop.pins) {
          ui.builderPins = loop.pins.map((p) => ({ ...p }));
          ui.builderRoute = loop;
        } else {
          ui.builderPins = arnoLoopPins().map((p) => ({ ...p }));
        }
      } else if (name === "routing-builder" || name === "routing-straight") {
        ui.builderPins = [
          { lat: 43.76797, lon: 11.25316, role: "start" },
          { lat: 43.76956, lon: 11.25586, role: "via" },
          { lat: 43.77313, lon: 11.25596, role: "end" },
        ];
      } else {
        const pins = (state.courses[0] && state.courses[0].pins) || arnoLoopPins();
        ui.builderPins = pins.map((p) => ({ ...p }));
      }
      showScreen("builder");
      setTab("today");
      showScreen("builder");
      renderBuilder();
      const fit = (ui.builderRoute && ui.builderRoute.path && ui.builderRoute.path.length >= 2)
        ? ui.builderRoute.path
        : ui.builderPins;
      const pad = { top: 56, bottom: 580, left: 56, right: 56 };
      map.whenReady(() => { renderBuilder(); if (fit && fit.length) map.fitBounds(fit, pad); });
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
      if (!state.courses[0]) {
        seedDemo(state);
        persist();
      }
      setTab("courses");
      if (state.courses[0]) openCourseActions(state.courses[0]);
    }
    else if (name === "target-setup") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      ui.pendingStart = { type: "run", course };
      const len = courseMeters(course);
      $("target-course-sub").textContent = `${course.name} · ${formatDistance(len, units())}`;
      $("target-unit").textContent = "mi";
      // Longer than the course so the two over-length options show.
      const over = (units() === "km" ? (len / 1000) : (len / METERS_PER_MILE)) + 0.5;
      $("target-distance").value = String(Math.round(over * 100) / 100);
      refreshTargetOptions();
      setTab("today");
      showScreen("today");
      openSheet("sheet-target");
    }
    else if (name === "tracking-laps" || name === "target-p2p") {
      const origin = { lat: 43.7672, lon: 11.2543 };
      let path, pins, targetMeters, courseName, along;
      if (name === "target-p2p") {
        const end = { lat: origin.lat + 0.0036, lon: origin.lon + 0.008 }; // roughly 0.7 mi east
        path = [origin, { lat: origin.lat + 0.001, lon: origin.lon + 0.004 }, end];
        pins = [{ ...origin, role: "start" }, { ...end, role: "end" }];
        const once = courseMeters({ pins, path });
        targetMeters = once * 2.5;
        courseName = "River out-and-back";
        along = once * 2.25;
      } else {
        // ~0.25 mi closed loop near the Florence pack centre
        const dlat = 0.00115, dlon = 0.0016;
        path = [
          origin,
          { lat: origin.lat, lon: origin.lon + dlon },
          { lat: origin.lat + dlat, lon: origin.lon + dlon },
          { lat: origin.lat + dlat, lon: origin.lon },
          origin,
        ];
        pins = [{ ...origin, role: "start" }, { lat: origin.lat + dlat, lon: origin.lon + dlon, role: "via" }, { ...origin, role: "end" }];
        const once = courseMeters({ pins, path });
        targetMeters = once * 4;
        courseName = "Quarter loop";
        along = once * 1.2; // lap 2 of 4
      }
      const tplan = planTarget({ path, courseMeters: courseMeters({ pins, path }), targetMeters, mode: MODE_COURSE });
      const course = newCourse({ name: courseName, pins, path });
      const made = track.makeSession({ type: "run", course, units: "mi", target: tplan });
      const pt = pointAlongPath(tplan.path, along);
      const startPt = tplan.path[0];
      Object.assign(made, {
        track: [startPt, pt],
        distanceMeters: along,
        elapsedSec: 420,
        courseTraveledMeters: along,
      });
      setTab("today");
      showScreen("tracking");
      paintSessionHud(made);
      drawSessionOnMap(made);
      map.whenReady(() => {
        drawSessionOnMap(made);
        map.fitBounds(tplan.path, { top: 56, bottom: 420, left: 48, right: 48 });
      });
    }
    else if (name === "group-setup") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      ui.cal = new Date(2026, 11, 5);
      ui.selectedDay = "2026-12-05";
      setTab("calendar");
      openGroupRun({
        courseId: course.id,
        date: "2026-12-05",
        time: "09:00",
        type: "walk",
      });
    }
    else if (name === "group-invite") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      const start = new Date(2026, 11, 5, 9, 0, 0);
      const made = makeGroupRun({ course, startAt: start, activityType: "walk", now: new Date(2026, 10, 20, 12, 0, 0) });
      addGroupRunToState(state, made.run);
      persist();
      ui.cal = new Date(2026, 11, 5);
      ui.selectedDay = "2026-12-05";
      setTab("calendar");
      openGroupInvite(made.run);
    }
    else if (name === "share-course") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      setTab("courses");
      openCourseActions(course);
      openShareSheet("course", course);
    }
    else if (name === "share-import") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      const dec = decodeShare(encodeCourse(course).url);
      ui.pendingShare = dec;
      setTab("today");
      showScreen("today");
      const pts = (course.path && course.path.length >= 2) ? course.path : course.pins;
      map.clearOverlays();
      map.clearMarkers();
      if (pts && pts.length >= 2) {
        map.drawRoute(pts, { id: "course-line", color: "#4EC3F7", width: 5 });
        addCoursePins(course.pins || pts);
        const pad = { top: 56, bottom: 420, left: 48, right: 48 };
        map.whenReady(() => map.fitBounds(pts, pad));
        map.fitBounds(pts, pad);
      }
      openImportSheet(dec);
    }
    else if (name === "share-plan") {
      if (!(state.planLibrary || []).length) {
        const plan = makePlan(buildPlanDraft({
          activityType: "walk",
          goalDistanceMeters: 5000,
          windowDays: 7,
          now: new Date("2026-04-06T12:00:00Z"),
        }), { now: new Date("2026-04-06T12:00:00Z") });
        addPlanToState(state, plan);
      }
      const plan = (state.planLibrary || [])[0];
      showScreen("plans");
      renderPlansScreen();
      if (plan) openShareSheet("plan", plan);
    }
    else if (name === "settings") setTab("settings");
    else if (name === "plans") { showScreen("plans"); renderPlansScreen(); }
    else if (name === "support") { setTab("settings"); showScreen("support"); renderSettings(); }
    else if (name === "stretches") { setTab("settings"); showStretchesHub(); }
    else if (name === "stretches-group") { setTab("settings"); showStretchGroup("hips"); }
    else if (name === "stretches-card") { setTab("settings"); showStretchGroup("shoulders_arms"); }
    else if (name === "stretches-workout") { setTab("settings"); showStretchWorkout(1); }
    else if (name === "stretches-credits") { setTab("settings"); showStretchCredits(); }
    else if (name === "stretches-follow") { setTab("settings"); showStretchFollow(); }
    else if (name === "stretches-video") { setTab("settings"); showStretchFollow(); openStretchVideo("pre_run_experience"); }
    else if (name === "map-choice") {
      setTab("today");
      showScreen("today");
      await waitForMapView();
      rememberLocation({ lat: 41.878, lon: -87.629, at: Date.now() });
      applyLaunchView(state.settings.lastKnown, { animate: false });
      hideLocateDenied();
      openMapChoice();
    }
    else if (name === "locate-denied") {
      setTab("today");
      showScreen("today");
      await waitForMapView();
      applyLaunchView(null, { animate: false });
      showLocateDenied("denied");
      openMapChoice();
    }
    else if (name === "map-here") {
      setTab("today");
      showScreen("today");
      await waitForMapView();
      rememberLocation({ lat: 41.878, lon: -87.629, at: Date.now() });
      applyLaunchView(state.settings.lastKnown, { animate: false });
    }
    else if (name === "map-download") { setTab("today"); showScreen("today"); await waitForMapView(); openCrop({ lat: 43.7672134, lon: 11.2543435, zoom: 13 }); await map.whenIdle(); }
    else if (name === "map-areas") { setTab("settings"); await showMapAreas(); }
    else if (name === "map-world") { setTab("today"); showScreen("today"); await waitForMapView(); map.setCenter(25, 10, 3); await map.whenIdle(); }
    else if (name === "map-mid") { setTab("today"); showScreen("today"); await waitForMapView(); map.setCenter(43.7672134, 11.2543435, 8); await map.whenIdle(); }
    else if (name === "map-in") { setTab("today"); showScreen("today"); await waitForMapView(); map.setCenter(43.7672134, 11.2543435, 14); await map.whenIdle(); }
    else if (name === "map-out") { setTab("today"); showScreen("today"); await waitForMapView(); map.setCenter(41.878, -87.629, 13); await map.whenIdle(); }
    else if (name === "location" || name === "disclosure") { setTab("today"); showScreen("today"); openSheet("sheet-location"); }
    else setTab(name);
    render();
    map.resizeMap();
    // Re-apply coverage views after init/demo fitBounds, which can fire late on first load.
    if (name === "map-world") { await waitForMapView(); map.setCenter(25, 10, 3); await map.whenIdle(); }
    if (name === "map-mid") { await waitForMapView(); map.setCenter(43.7672134, 11.2543435, 8); await map.whenIdle(); }
    if (name === "map-in") { await waitForMapView(); map.setCenter(43.7672134, 11.2543435, 14); await map.whenIdle(); }
    if (name === "map-out") { await waitForMapView(); map.setCenter(41.878, -87.629, 13); await map.whenIdle(); }
    if (name === "map-here") { await waitForMapView(); map.setCenter(41.878, -87.629, 15); map.setUserDot({ lat: 41.878, lon: -87.629 }); await map.whenIdle(); }
    if (name === "map-choice") { await waitForMapView(); map.setCenter(41.878, -87.629, 15); map.setUserDot({ lat: 41.878, lon: -87.629 }); await map.whenIdle(); }
    if (name === "map-download") { await waitForMapView(); map.setCenter(43.7672134, 11.2543435, 13); await map.whenIdle(); }
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
    if (action === "keep-going") {
      const s = track.getSession();
      if (s) {
        await track.refreshNotification(s, { force: true });
        paintSessionHud(s);
      }
      return;
    }
    if (track.getSession()) {
      paintSessionHud(track.getSession());
    }
  });
  await wireAppLinks();
  initPlansUi({ getState: () => state, persist, units, openShare: (plan) => openShareSheet("plan", plan) });
  renderSettings();
  try {
    if (Capacitor.isNativePlatform()) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#12161C" });
    }
  } catch { /* web */ }
  const graphReady = ensureWalkGraph();
  const launchView = viewForLaunch({ lastKnown: state.settings.lastKnown });
  await map.initMap($("map"), { center: launchView, zoom: launchView.zoom });
  await graphReady;
  map.whenReady(() => {
    applyLaunchView(null, { animate: false });
  });
  const screen = params.get("screen");
  if (screen) {
    await window.HeldpathTest.show(screen, { demo: !params.has("empty"), empty: params.has("empty") });
  } else {
    setTab("today");
    await locateAndOfferMapChoice();
  }
}

init();
