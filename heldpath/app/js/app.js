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
import { loadState, saveState, resetState, newCourse, newActivity, newPlan, newGoal } from "./storage.js";
import * as health from "./health.js";
import { PLANS_HOOK_COPY } from "./plans_hook.js";
import * as map from "./map.js";
import * as track from "./track.js";
import { updateOffRoute, offRouteCopy } from "./off_route.js";
import { startDetectCopy } from "./start_detect.js";
import {
  maybeSaveLiveSession,
  loadLiveSession,
  clearLiveSession,
  isResumable,
  resumePromptCopy,
  snapshotSession,
} from "./session_autosave.js";
import {
  shouldPromptForgot,
  shouldOfferTrim,
  applyTrim,
  noteForgotDismissed,
  noteForgotMoved,
  stillForMs,
  forgotCopy,
  trimCopy,
} from "./forgot_stop.js";
import {
  parseDistanceInput,
  parseDurationInput,
  parseWhenInput,
  buildIndoorActivity,
  indoorSourceLabel,
  indoorSummaryNote,
  indoorPromptCopy,
} from "./indoor_log.js";
import * as splits from "./splits.js";
import { seedDemo, midCourseWalk, pastCourseRun, arnoLoopPins } from "./demo.js";
import { purchaseSupport, SUPPORT_PRODUCT_ID } from "./iap.js";
import { isWeb, applyPlatformVisibility, registerServiceWorker, listenForInstallPrompt, canPromptInstall, promptInstall, WEB_APP_NOTE, WEB_PAY_NOTE } from "./platform.js";
import { renderCalendarView } from "./calendar_view.js";
import { conflictCopy, plansOnDate } from "./calendar_conflict.js";
import { renderProgressView } from "./progress_view.js";
import {
  emptyBuilderState,
  placePin,
  setEndMode,
  toggleEndMode,
  setEndIndex,
  addNextStop,
  undoPin,
  pinLabel,
  pinNumberLabel,
  routeStops,
  canSave,
  savedPins,
  ingestPins,
  routeCourse,
  isExplainerSeen,
  markExplainerSeen,
  builderHint,
  EXPLAINER_BODY,
  EXPLAINER_TITLE,
  legLabels,
} from "./course_builder.js";
import {
  resolveGoal,
  sectorTargets,
  sectorTimesFromTrack,
  compareSectors,
  bestPossibleSec,
  applySectorResult,
  newlyCompletedSectors,
  sectorMetersList,
  liveSectorFlash,
  maybeCallout,
  parseFinishInput,
  parsePaceInput,
  formatSectorDelta,
  formatSectorTime,
  readSectorPbs,
  hasSectorHistory,
  goalFromFinishTime,
  goalFromPace,
} from "./sector_timing.js";
import {
  buildGoalSeries,
  mountGoalChart,
  historyTableMarkup,
  loadChartStyle,
  saveChartStyle,
  periodGoalProgress,
  periodRingMarkup,
  periodHistory,
  runsForGoal,
  metricForGoal,
  pointsFromRuns,
  goalPeriod,
} from "./goal_progress.js";

import { initPlansUi, renderPlansScreen } from "./plans_ui.js";
import { initStretchesUi, showStretchesHub, showStretchGroup, showStretchWorkout, showStretchCredits, showStretchFollow, openStretchVideo, closeStretchVideo, setStretchStyle } from "./stretches_ui.js";
import { initMapDownloadUi, showMapAreas, openCrop, closeCrop } from "./map_download_ui.js";
import { listAreas } from "./map_offline.js";
import { ensureWalkGraph, graphCoversPoints } from "./area_graphs.js";
import { assessRouteLowSignal, LOW_SIGNAL_COPY, pathBbox } from "./low_signal.js";
import { gainLoss, displayDistance, naismithSeconds, formatGain, elevationProfileSvg, FLAT_DISCLAIMER, HILLS_DISCLAIMER, DEM_CREDIT_SHORT, DEM_ATTRIBUTION_URL } from "./elevation.js";
import { samplePathDem } from "./elevation_dem.js";

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
  queryLocationPermission,
  shouldShowLocationExplainer,
  noteForLocateReason,
  LOCATION_DENIED_NOTE,
  FINDING_YOU,
  LOCATION_EXPLAINER,
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
import { qrSvg, encodeQrFrames, createQrAssembler, scanQrImageData } from "./share_qr.js";
import {
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

function liveSessionExtra() {
  return { activePlanId: ui.activePlanId || null };
}

function flushLiveSession(force = true) {
  const s = track.getSession();
  if (!s) return;
  maybeSaveLiveSession(s, { ...liveSessionExtra(), force });
}

function onLiveSessionUpdate(s, why) {
  if (!s) return;
  paintSessionHud(s);
  drawSessionOnMap(s);
  maybeSaveLiveSession(s, { ...liveSessionExtra(), force: why === "hide" });
  maybeForgotPrompt(s);
}

function maybeForgotPrompt(s) {
  if (!s) return;
  if (shouldPromptForgot(s)) {
    const copy = forgotCopy(stillForMs(s));
    if ($("forgot-title")) $("forgot-title").textContent = copy.title;
    if ($("forgot-body")) $("forgot-body").textContent = copy.body;
    openSheet("sheet-forgot");
    return;
  }
  if (stillForMs(s) < 30000) {
    noteForgotMoved(s);
    const sheet = $("sheet-forgot");
    if (sheet && sheet.classList.contains("open")) closeSheet("sheet-forgot");
  }
}

function stayGoingFromForgot() {
  const s = track.getSession();
  if (s) noteForgotDismissed(s);
  closeSheet("sheet-forgot");
  flushLiveSession(true);
}

function showResumeSheet(snap) {
  ui.pendingResume = snap;
  const copy = resumePromptCopy(snap, units());
  if ($("resume-title")) $("resume-title").textContent = copy.title;
  if ($("resume-body")) $("resume-body").textContent = copy.body;
  if ($("resume-stats")) $("resume-stats").textContent = copy.stats;
  const path = snap && snap.session && (snap.session.track || snap.session.coursePath || snap.session.coursePins);
  if (path && path.length) {
    try {
      map.clearOverlays();
      map.clearMarkers();
      if ((snap.session.coursePath || snap.session.coursePins || []).length >= 2) {
        map.drawRoute(snap.session.coursePath || snap.session.coursePins, { id: "course-line", color: "#7A8798", width: 4 });
      }
      if (snap.session.track && snap.session.track.length >= 2) {
        map.drawRoute(snap.session.track, { id: "live-line", color: "#4EC3F7", width: 5 });
      }
      map.fitBounds(path, 80);
    } catch { /* map may not be ready */ }
  }
  openSheet("sheet-resume");
}

async function resumePendingSession() {
  const snap = ui.pendingResume;
  closeSheet("sheet-resume");
  if (!snap || !snap.session) return;
  ui.activePlanId = snap.activePlanId || null;
  const sess = track.restoreSession(snap.session);
  if (!sess) return;
  track.setAutoPauseEnabled(state.settings.autoPause !== false);
  track.setLowPowerEnabled(!!state.settings.lowPower);
  setTab("today");
  showScreen("tracking");
  paintSessionHud(sess);
  const fit = sess.track && sess.track.length >= 2 ? sess.track : (sess.coursePath || sess.coursePins);
  map.whenReady(() => {
    drawSessionOnMap(sess);
    if (fit && fit.length) map.fitBounds(fit, { top: 56, bottom: 420, left: 48, right: 48 });
  });
  drawSessionOnMap(sess);
  flushLiveSession(true);
  await track.startWatching(onLiveSessionUpdate);
}

async function savePendingSession() {
  const snap = ui.pendingResume;
  closeSheet("sheet-resume");
  ui.pendingResume = null;
  if (!snap || !snap.session) return;
  ui.activePlanId = snap.activePlanId || null;
  track.restoreSession(snap.session);
  clearLiveSession();
  await finishTracking();
}

async function discardPendingSession() {
  clearLiveSession();
  ui.pendingResume = null;
  closeSheet("sheet-resume");
  setTab("today");
  showScreen("today");
  await locateAndOfferMapChoice();
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
  if (activity.source === "indoor") return indoorSourceLabel();
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
  const pauseNote = $("track-pause-note");
  if (pauseNote) {
    const auto = !!(sess.paused && sess.pauseReason === "auto");
    pauseNote.hidden = !auto;
  }
  const lowNote = $("track-lowpower-note");
  if (lowNote) {
    const on = !!(sess.lowPower || track.isLowPowerEnabled());
    lowNote.hidden = !on;
  }
  updateOffRoute(sess);
  const startNote = $("track-start-note");
  if (startNote) {
    const copy = startDetectCopy(sess);
    startNote.hidden = !copy;
    if (copy) startNote.textContent = copy;
  }
  const offNote = $("track-offroute-note");
  if (offNote) {
    offNote.hidden = !sess.offRoute;
    if (sess.offRoute) offNote.textContent = offRouteCopy(sess.offRouteMeters, sess.units);
  }
  $("lock-body").textContent = track.liveNotification(sess);
  paintSectorFlash(sess);
}

function courseForSession(sess) {
  if (!sess) return null;
  if (sess.courseId) {
    const c = (state.courses || []).find((x) => x.id === sess.courseId);
    if (c) return c;
  }
  if (sess.coursePins && sess.coursePins.length >= 2) {
    return {
      id: sess.courseId || null,
      name: sess.courseName || "Course",
      pins: sess.coursePins,
      path: sess.coursePath || null,
      goal: sess.courseGoal || null,
      sectorPbs: sess.sectorPbs || {},
      sectorHistory: sess.sectorHistory || [],
      sectorCallout: !!sess.sectorCallout,
    };
  }
  return null;
}

function paintSectorFlash(sess) {
  const el = $("sector-flash");
  if (!el) return;
  const course = courseForSession(sess);
  const goal = course && resolveGoal(course);
  if (!course || !goal) {
    el.hidden = true;
    return;
  }
  const meters = sectorMetersList(course);
  const traveled = (sess.track && sess.track.length)
    ? (sess.distanceMeters || 0)
    : 0;
  const prev = ui.sectorTraveled == null ? 0 : ui.sectorTraveled;
  const just = newlyCompletedSectors(prev, traveled, meters);
  ui.sectorTraveled = traveled;
  if (!just.length) {
    if (!ui.sectorFlashSticky) el.hidden = true;
    return;
  }
  const times = sectorTimesFromTrack(course, sess.track || []);
  const pbs = readSectorPbs(course);
  const hist = hasSectorHistory(course);
  const targets = sectorTargets(course, goal);
  const compared = compareSectors({ times, targets, pbs, hasHistory: hist });
  const idx = just[just.length - 1];
  const row = compared[idx];
  if (!row || row.time == null) return;
  const cum = compared.slice(0, idx + 1).reduce((s, r) => s + (Number(r.vsGoal) || 0), 0);
  const bp = hist ? bestPossibleSec(pbs, targets) : null;
  const flash = liveSectorFlash(row, { cumulativeDelta: cum, hasHistory: hist, bestPossible: bp });
  el.hidden = false;
  el.classList.remove("green", "red", "purple");
  if (flash.color) el.classList.add(flash.color);
  if ($("sector-flash-main")) $("sector-flash-main").textContent = flash.sectorLine;
  if ($("sector-flash-cum")) $("sector-flash-cum").textContent = [flash.cumulativeLine, flash.bestPossibleLine].filter(Boolean).join(" · ");
  ui.sectorFlashSticky = true;
  if (course.sectorCallout) maybeCallout(flash.spoken, { audio: true, haptic: true });
}

function renderSectorTable(root, course, act) {
  if (!root) return;
  root.innerHTML = "";
  const goal = course && resolveGoal(course);
  if (!course || !goal || !act) return;
  const times = sectorTimesFromTrack(course, act.track || []);
  const targets = sectorTargets(course, goal);
  const pbs = readSectorPbs(course);
  const histBefore = hasSectorHistory(course);
  const compared = compareSectors({ times, targets, pbs, hasHistory: histBefore });
  const applied = applySectorResult(course, times, { activityId: act.id, at: act.endedAt });
  const hist = hasSectorHistory(course);
  const bp = bestPossibleSec(readSectorPbs(course), targets);
  const table = document.createElement("div");
  table.className = "sector-table";
  table.setAttribute("data-testid", "sector-table");
  const head = document.createElement("div");
  head.className = "split-head";
  head.innerHTML = `<span>Sector</span><span class="t">Time</span><span class="t">Target</span><span class="t">Delta</span>`;
  table.appendChild(head);
  let cum = 0;
  compared.forEach((row, i) => {
    const el = document.createElement("div");
    const appliedRow = applied && applied.rows && applied.rows[i];
    const isPb = !!(appliedRow && appliedRow.isNewPb);
    const color = isPb ? "purple" : (row.colorVsGoal || "");
    el.className = "split-row sector-row" + (color ? " " + color : "");
    const label = document.createElement("span");
    label.textContent = `S${i + 1}`;
    const time = document.createElement("span");
    time.className = "t";
    time.textContent = row.time == null ? "—" : formatSectorTime(row.time);
    const tgt = document.createElement("span");
    tgt.className = "t";
    tgt.textContent = row.target == null ? "—" : formatSectorTime(row.target);
    const delta = document.createElement("span");
    delta.className = "t sector-delta " + color;
    delta.textContent = row.vsGoal == null ? "—" : formatSectorDelta(row.vsGoal);
    if (row.vsGoal != null) cum += row.vsGoal;
    el.appendChild(label);
    el.appendChild(time);
    el.appendChild(tgt);
    el.appendChild(delta);
    table.appendChild(el);
  });
  root.appendChild(table);
  const foot = document.createElement("p");
  foot.className = "tiny";
  foot.style.marginTop = "12px";
  const bits = [`Total ${formatSectorDelta(cum)}`];
  if (bp != null) bits.push(`Best possible ${formatSectorTime(bp)}`);
  foot.textContent = bits.join(" · ") + ". Even pace from the goal time and the full route distance.";
  root.appendChild(foot);
}

function paintCourseGoalFields(course) {
  if (!course) return;
  const goal = course.goal || {};
  if ($("course-goal-time")) {
    $("course-goal-time").value = goal.finishInput || (goal.finishSec ? formatDuration(goal.finishSec) : "");
  }
  if ($("course-goal-pace")) {
    const unit = units();
    if ($("course-goal-pace-unit")) $("course-goal-pace-unit").textContent = unit === "km" ? "/km" : "/mi";
    $("course-goal-pace").value = goal.paceInput || "";
  }
  if ($("course-sector-callout")) $("course-sector-callout").checked = !!course.sectorCallout;
  if ($("course-goal-status")) {
    const g = resolveGoal(course);
    $("course-goal-status").textContent = g
      ? "Goal saved. Sector targets use even pace and stay free."
      : "No goal yet. Add a finish time or a pace — free.";
  }
}

function saveCourseGoal() {
  const course = (state.courses || []).find((c) => c.id === ui.courseId);
  if (!course) return;
  const finish = parseFinishInput(($("course-goal-time") && $("course-goal-time").value) || "");
  const paceRaw = ($("course-goal-pace") && $("course-goal-pace").value) || "";
  const pace = parsePaceInput(paceRaw);
  let goal = null;
  if (finish) {
    goal = goalFromFinishTime(finish, course);
    if (goal) goal.finishInput = String($("course-goal-time").value || "").trim();
  } else if (pace) {
    goal = goalFromPace(pace, course, units());
    if (goal) goal.paceInput = String(paceRaw).trim();
  }
  course.goal = goal;
  course.sectorCallout = !!($("course-sector-callout") && $("course-sector-callout").checked);
  course.updatedAt = new Date().toISOString();
  persist();
  paintCourseGoalFields(course);
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
  if (sess.offRoute && sess.wayBack && sess.wayBack.length >= 2) {
    map.drawRoute(sess.wayBack, { id: "way-back", color: "#F0C15A", width: 5, dash: true });
  }
  const last = sess.track[sess.track.length - 1];
  if (last) {
    map.addDot(last);
    map.setCenter(last.lat, last.lon);
  }
}

function addCoursePins(pins, { builderState = null, clickable = false } = {}) {
  (pins || []).forEach((p, i) => {
    const kind = p.role || (i === 0 ? "start" : i === pins.length - 1 ? "end" : "via");
    const label = builderState
      ? pinLabel(builderState, i)
      : (kind === "start" ? "Start" : kind === "end" ? "End" : String(i + 1));
    const opts = { kind, label };
    if (clickable && builderState) {
      opts.onClick = (ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        openPinAction(i);
      };
    }
    map.addPin(p, opts);
  });
}

function activeBuilder() {
  if (!ui.builder) {
    ui.builder = Array.isArray(ui.builderPins) && ui.builderPins.length
      ? ingestPins(ui.builderPins)
      : emptyBuilderState();
    ui.builderPins = ui.builder.pins;
    return ui.builder;
  }
  if (Array.isArray(ui.builderPins) && ui.builderPins !== ui.builder.pins) {
    ui.builder = ingestPins(ui.builderPins);
    ui.builderPins = ui.builder.pins;
  } else {
    ui.builderPins = ui.builder.pins;
  }
  return ui.builder;
}

function builderRoute() {
  const st = activeBuilder();
  const routed = routeCourse(getActiveGraph(), st, {
    straightLine: !ui.followPaths,
    previous: ui.builderRoute || null,
  });
  ui.builderRoute = routed;
  return routed;
}

function paintEndPointButton() {
  const btn = $("btn-end-point-pin");
  if (!btn) return;
  const on = !!(ui.builder && ui.builder.endMode);
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.classList.toggle("on", on);
  btn.textContent = on ? "End point pin · on" : "End point pin";
}

function openPinAction(index) {
  const st = activeBuilder();
  if (!st.pins[index]) return;
  ui.pinActionIndex = index;
  const label = pinLabel(st, index);
  if ($("pin-action-title")) $("pin-action-title").textContent = label || `Pin ${index + 1}`;
  if ($("pin-action-sub")) $("pin-action-sub").textContent = "Add this pin as the next stop (it keeps every visit number), or set it as the end.";
  openSheet("sheet-pin-action");
}

function maybeShowBuilderExplainer({ force = false } = {}) {
  if (!force && isExplainerSeen()) return;
  if ($("builder-help-title")) $("builder-help-title").textContent = EXPLAINER_TITLE;
  if ($("builder-help-copy")) $("builder-help-copy").textContent = EXPLAINER_BODY;
  openSheet("sheet-builder-help");
}

function paintFollowToggle() {
  const btn = $("toggle-follow-paths");
  if (!btn) return;
  btn.classList.toggle("on", !!ui.followPaths);
  btn.setAttribute("aria-checked", ui.followPaths ? "true" : "false");
}

let builderGraphToken = 0;
function maybeEnsureBuilderGraph(pins) {
  if (!pins || pins.length < 1) return;
  const current = getActiveGraph();
  if (current && graphCoversPoints(current, pins)) return;
  const token = ++builderGraphToken;
  ensureWalkGraph(pins).then((g) => {
    if (token !== builderGraphToken) return;
    if (g !== current && ui.screen === "builder") renderBuilder();
  }).catch(() => {});
}

function renderBuilder() {
  const st = activeBuilder();
  const pins = st.pins || [];
  maybeEnsureBuilderGraph(pins);
  const hint = $("builder-hint");
  if (hint) hint.textContent = builderHint(st, { followPaths: !!ui.followPaths });
  paintFollowToggle();
  paintEndPointButton();
  const box = $("builder-legs");
  const note = $("route-fallback-note");
  const routed = pins.length >= 2 && st.endIndex != null ? builderRoute() : (pins.length >= 2 ? builderRoute() : (ui.builderRoute = null));
  if (note) {
    if (routed && routed.usedStraight && ui.followPaths) {
      note.hidden = false;
      note.textContent = "No walkable path was found for one or more legs, so a straight line is used there.";
    } else if (!ui.followPaths) {
      note.hidden = false;
      note.textContent = "Straight line — not following roads.";
    } else {
      note.hidden = true;
      note.textContent = "";
    }
  }
  if (box) {
    box.innerHTML = "";
    if (pins.length < 2 || st.endIndex == null) {
      box.innerHTML = `<p class="tiny">${st.endIndex == null && pins.length >= 2 ? "Turn on End point pin, or tap a pin and choose Set as end, to finish the route." : "Leg distances will show here after the second pin."}</p>`;
    } else {
      const labels = legLabels(st);
      routed.legs.forEach((leg, i) => {
        const names = labels[i] || { from: `Pin ${i + 1}`, to: `Pin ${i + 2}` };
        const flag = leg.mode === "straight" && ui.followPaths ? " · straight line" : "";
        const ret = names.returnLeg ? " · return" : "";
        const row = document.createElement("div");
        row.className = "leg-row";
        row.innerHTML = `<span>${escapeHtml(names.from)} → ${escapeHtml(names.to)}${flag}${ret}</span><span>${formatDistance(leg.meters, units())}</span>`;
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
      const distNote = document.createElement("p");
      distNote.className = "tiny";
      distNote.dataset.testid = "builder-distance-note";
      distNote.textContent = state.settings.countHills ? HILLS_DISCLAIMER : FLAT_DISCLAIMER;
      box.appendChild(distNote);
    }
  }
  if ($("btn-save-course")) $("btn-save-course").disabled = !canSave(st);
  map.clearOverlays();
  map.clearMarkers();
  const line = routed && routed.path && routed.path.length >= 2 ? routed.path : routeStops(st);
  if (line.length >= 2) map.drawRoute(line, { id: "build-line" });
  addCoursePins(pins, { builderState: st, clickable: true });
  refreshBuilderElevation(line);
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
  paintCourseGoalFields(course);
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
  const schedNote = $("sched-conflict");
  if (schedNote) {
    const copy = conflictCopy(plansOnDate(state.plans, ui.selectedDay));
    schedNote.hidden = !copy;
    schedNote.textContent = copy;
  }
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

function renderGoalsScreen() {
  const root = $("goals-list");
  if (!root) return;
  const items = state.goals || [];
  const acts = state.activities || [];
  const locale = (typeof navigator !== "undefined" && navigator.language) || "en-US";
  const parts = [];
  if (!items.length) {
    parts.push(`<p class="tiny" data-testid="goals-empty">No goals yet. Add a weekly or monthly target below — free, with a ring for this period and a chart on Progress.</p>`);
  }
  for (const g of items) {
    const period = goalPeriod(g);
    const title = g.name || (period ? `${period === "week" ? "Weekly" : "Monthly"} ${periodGoalTitle(g)}` : (g.kind || "Goal"));
    parts.push(`<div class="goal-card" data-testid="goal-card" data-goal-id="${escapeHtml(g.id)}">`);
    parts.push(`<h3>${escapeHtml(title)}</h3>`);
    if (period) {
      const prog = periodGoalProgress(g, acts, { locale, units: units() });
      if (prog) parts.push(periodRingMarkup(prog, { testid: "period-ring" }));
    }
    parts.push(`<p class="tiny">Always free. Your progress stays on this phone.</p>`);
    parts.push(`<button class="btn btn-secondary btn-goal-remove" data-id="${escapeHtml(g.id)}" style="width:100%;margin-top:8px">Remove</button>`);
    parts.push(`</div>`);
  }
  parts.push(`<div class="card" data-testid="add-goal-card" style="margin-top:12px">
    <h3>Add a free goal</h3>
    <div class="field"><label for="goal-new-kind">Type</label>
      <select id="goal-new-kind">
        <option value="week-distance">Weekly distance</option>
        <option value="month-distance">Monthly distance</option>
        <option value="week-count">Weekly run count</option>
        <option value="month-count">Monthly run count</option>
        <option value="week-time">Weekly time</option>
        <option value="month-time">Monthly time</option>
        <option value="distance">Distance per run</option>
      </select>
    </div>
    <div class="field"><label for="goal-new-value">Target</label>
      <input id="goal-new-value" data-testid="goal-new-value" type="number" min="0.1" step="0.1" value="10" inputmode="decimal" />
      <p class="tiny" id="goal-new-unit-hint">Miles (or km if that is your unit). Count goals use a number of runs. Time goals use minutes.</p>
    </div>
    <button class="btn btn-primary" id="btn-goal-add" data-testid="goal-add" style="width:100%">Add goal</button>
  </div>`);
  root.innerHTML = parts.join("");
  const addBtn = $("btn-goal-add");
  if (addBtn && !addBtn._bound) {
    addBtn._bound = true;
  }
  const add = $("btn-goal-add");
  if (add) add.addEventListener("click", addGoalFromForm);
  root.querySelectorAll(".btn-goal-remove").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-id");
      state.goals = (state.goals || []).filter((g) => g.id !== id);
      persist();
      renderGoalsScreen();
    });
  });
}

function periodGoalTitle(g) {
  const k = String(g.kind || "");
  if (k.includes("count")) return "run count";
  if (k.includes("time")) return "time";
  return "distance";
}

function addGoalFromForm() {
  const kind = (($("goal-new-kind") && $("goal-new-kind").value) || "week-distance");
  const raw = Number(($("goal-new-value") && $("goal-new-value").value) || 0);
  if (!(raw > 0)) return;
  const period = kind.startsWith("week") ? "week" : kind.startsWith("month") ? "month" : null;
  const g = newGoal({ kind, period, paid: false });
  if (kind.includes("count")) g.targetCount = Math.round(raw);
  else if (kind.includes("time")) g.finishSec = Math.round(raw * 60);
  else {
    g.distanceMeters = units() === "km" ? raw * 1000 : raw * METERS_PER_MILE;
  }
  if (kind === "week-distance") g.name = period === "week" ? "Weekly distance" : g.name;
  state.goals = state.goals || [];
  state.goals.push(g);
  persist();
  renderGoalsScreen();
}

function renderProgress() {
  document.querySelectorAll("#range-tog button").forEach((b) => {
    b.classList.toggle("active", b.dataset.range === ui.range);
  });
  renderProgressView($("progress-body"), {
    activities: state.activities,
    courses: state.courses,
    goals: state.goals,
    planLibrary: state.planLibrary,
    range: ui.range,
    units: units(),
    onStartWalk: () => {
      setTab("today");
      openStart("walk");
    },
    onOpenGoals: () => showScreen("goals"),
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
  if ($("auto-pause-switch")) {
    const on = state.settings.autoPause !== false;
    $("auto-pause-switch").classList.toggle("on", on);
    $("auto-pause-switch").setAttribute("aria-checked", on ? "true" : "false");
  }
  if ($("low-power-switch")) {
    const on = !!state.settings.lowPower;
    $("low-power-switch").classList.toggle("on", on);
    $("low-power-switch").setAttribute("aria-checked", on ? "true" : "false");
  }
  if ($("count-hills-switch")) {
    const on = !!state.settings.countHills;
    $("count-hills-switch").classList.toggle("on", on);
    $("count-hills-switch").setAttribute("aria-checked", on ? "true" : "false");
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
  if (ui.screen === "goals") renderGoalsScreen();
  if (ui.screen === "settings" || ui.screen === "support") renderSettings();
  if (ui.screen === "plans") renderPlansScreen();
  if (track.getSession()) paintSessionHud(track.getSession());
}

/* ——— Actions ——— */
function localDateTimeValue(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function setIndoorError(msg) {
  const el = $("indoor-error");
  if (!el) return;
  if (!msg) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = msg;
}

function openIndoorLog(type) {
  closeSheet("sheet-start");
  ui.indoorType = type === "run" ? "run" : "walk";
  const copy = indoorPromptCopy(ui.indoorType);
  if ($("indoor-title")) $("indoor-title").textContent = copy.title;
  if ($("indoor-body")) $("indoor-body").textContent = copy.body;
  if ($("indoor-unit")) $("indoor-unit").textContent = units();
  if ($("indoor-distance")) $("indoor-distance").value = "";
  if ($("indoor-time")) $("indoor-time").value = "";
  if ($("indoor-when")) $("indoor-when").value = localDateTimeValue(new Date());
  if ($("indoor-note")) $("indoor-note").value = "";
  setIndoorError("");
  openSheet("sheet-indoor");
}

function saveIndoorLog() {
  const dist = parseDistanceInput($("indoor-distance") && $("indoor-distance").value, units());
  if (!dist.ok) { setIndoorError(dist.reason); return; }
  const dur = parseDurationInput($("indoor-time") && $("indoor-time").value);
  if (!dur.ok) { setIndoorError(dur.reason); return; }
  const when = parseWhenInput($("indoor-when") && $("indoor-when").value, new Date());
  if (!when.ok) { setIndoorError(when.reason); return; }
  const built = buildIndoorActivity({
    type: ui.indoorType || ui.startType || "walk",
    meters: dist.meters,
    elapsedSec: dur.seconds,
    endedAt: when.date,
    note: $("indoor-note") ? $("indoor-note").value : "",
  });
  const act = newActivity(built);
  state.activities.push(act);
  persist();
  closeSheet("sheet-indoor");
  showSummary(act, null, null);
}

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


let disclosurePending = null;

function ensureLocationDisclosure() {
  if (disclosurePending) return disclosurePending;
  disclosurePending = new Promise((resolve) => {
    const copy = $("loc-copy");
    if (copy && LOCATION_EXPLAINER) copy.textContent = LOCATION_EXPLAINER;
    const yes = $("btn-loc-continue");
    if (!yes) {
      resolve({ allowed: false, locatePromise: null });
      return;
    }
    const done = (result) => {
      yes.removeEventListener("click", onYes);
      closeSheet("sheet-location");
      resolve(result);
    };
    const onYes = () => {
      state.settings.locationDisclosureAccepted = true;
      persist();
      // Start GPS in this same tap so iOS Safari and Chrome show one prompt.
      const locatePromise = requestPosition();
      done({ allowed: true, locatePromise });
    };
    yes.addEventListener("click", onYes);
    closeSheet("sheet-map");
    openSheet("sheet-location");
  }).finally(() => {
    disclosurePending = null;
  });
  return disclosurePending;
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

function plannedRoutePoints(course, targetPlan) {
  if (targetPlan && targetPlan.path && targetPlan.path.length >= 2) return targetPlan.path;
  if (course && course.path && course.path.length >= 2) return course.path;
  if (course && course.pins && course.pins.length >= 2) return course.pins;
  return null;
}

async function startTracking(type, course, plan, targetPlan, { skipLowSignal = false } = {}) {
  closeSheet("sheet-start");
  closeSheet("sheet-target");
  const path = plannedRoutePoints(course, targetPlan);
  if (!skipLowSignal && path && path.length >= 2) {
    let areas = [];
    try { areas = await listAreas(); } catch { areas = []; }
    const risk = await assessRouteLowSignal(path, { areas });
    if (risk.show) {
      ui.pendingLowSignal = { type, course, plan, targetPlan, bbox: risk.bbox || pathBbox(path) };
      const copy = $("low-signal-copy");
      if (copy) copy.textContent = LOW_SIGNAL_COPY;
      openSheet("sheet-low-signal");
      return;
    }
  }
  await beginTracking(type, course, plan, targetPlan);
}

function acceptLowSignalDownload() {
  const pending = ui.pendingLowSignal;
  closeSheet("sheet-low-signal");
  if (!pending || !pending.bbox) {
    ui.pendingLowSignal = null;
    return;
  }
  const bbox = pending.bbox;
  ui.pendingLowSignal = null;
  openCrop({ bbox, afterClose: "today" });
}

function dismissLowSignalPrompt() {
  const pending = ui.pendingLowSignal;
  closeSheet("sheet-low-signal");
  ui.pendingLowSignal = null;
  if (!pending) return;
  beginTracking(pending.type, pending.course, pending.plan, pending.targetPlan);
}

async function beginTracking(type, course, plan, targetPlan) {
  const perm = await queryLocationPermission();
  if (perm !== "granted") {
    if (!shouldShowLocationExplainer(perm)) {
      showLocateDenied("denied");
      return;
    }
    const disc = await ensureLocationDisclosure();
    if (!disc || !disc.allowed) return;
    if (disc.locatePromise) {
      const res = await disc.locatePromise;
      applyLocateResult(res, { animate: true });
      if (!res || !res.ok) return;
    }
  }
  const sess = track.makeSession({ type, course, units: units(), target: targetPlan || null });
  track.setAutoPauseEnabled(state.settings.autoPause !== false);
  track.setLowPowerEnabled(!!state.settings.lowPower);
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
  flushLiveSession(true);
  const res = await track.startWatching(onLiveSessionUpdate);
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
  flushLiveSession(true);
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
  closeSheet("sheet-forgot");
  await track.stopWatching();
  const sess = track.stopSession();
  clearLiveSession();
  ui.pendingResume = null;
  ui.hideNav = false;
  if (!sess) {
    showScreen("today");
    return;
  }
  const offer = shouldOfferTrim(sess);
  if (offer.offer) {
    ui.pendingFinish = { sess };
    const copy = trimCopy(offer.idleSec, sess.type);
    if ($("trim-title")) $("trim-title").textContent = copy.title;
    if ($("trim-body")) $("trim-body").textContent = copy.body;
    openSheet("sheet-trim-end");
    return;
  }
  await completeSession(sess);
}

async function confirmTrimEnd(trim) {
  const pending = ui.pendingFinish;
  closeSheet("sheet-trim-end");
  ui.pendingFinish = null;
  if (!pending || !pending.sess) {
    showScreen("today");
    return;
  }
  if (trim) applyTrim(pending.sess, shouldOfferTrim(pending.sess));
  await completeSession(pending.sess);
}

async function completeSession(sess) {
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
    ...elevationFields(sess.track),
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
      await ensureWalkGraph(sess.track);
      ui.pendingSaveRoute = { act, course, sess, track: (sess.track || []).slice(), graph: getActiveGraph(), legResult };
      const pct = percentOfPlan(act.distanceMeters, plannedMeters(sess));
      $("celebrate-copy").textContent = celebrationCopy(pct, { hasCourse: !!course });
      showOfferMap(sess, course);
      openSheet("sheet-celebrate");
      return;
    }
    if (shouldOfferFreeRoute(sess)) {
      await ensureWalkGraph(sess.track);
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

let builderElevToken = 0;
async function refreshBuilderElevation(path) {
  const el = $("builder-elevation");
  if (!el) return;
  if (!path || path.length < 2) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const token = ++builderElevToken;
  // Use already sampled elevations if present; otherwise ask the cached DEM.
  const haveEle = path.some((p) => p && p.ele != null);
  let pts = path;
  if (!haveEle) {
    try { pts = await samplePathDem(path); } catch { pts = path; }
  }
  if (token !== builderElevToken) return;
  const gl = gainLoss(pts);
  const total = (pts.length >= 2) ? /* filled below */ null : null;
  // Update Naismith ETAs on the total row if we have climb.
  const tot = $("builder-total") || document.querySelector("[data-testid='builder-total']");
  if (tot && gl.gainM > 0) {
    const flat = pathLengthMeters(path);
    const shown = displayDistance(pts, flat, { countHills: !!state.settings.countHills });
    const walkEta = formatEta(naismithSeconds(flat, gl.gainM, activityMph("walk")));
    const runEta = formatEta(naismithSeconds(flat, gl.gainM, activityMph("run")));
    tot.innerHTML = `<span>Total</span><span>${formatDistance(shown.meters, units())} · ${formatGain(gl.gainM, units())} climb · ${walkEta} walk · ${runEta} run</span>`;
  }
  paintElevationBox(el, gl, { units: units(), credit: true });
}

function elevationFields(points) {

  const gl = gainLoss(points || []);
  return {
    climbGainM: gl.gainM,
    climbLossM: gl.lossM,
    distance3dMeters: displayDistance(points || [], 0, { countHills: true }).meters || 0,
  };
}

function activityElevation(act) {
  if (!act) return null;
  const gl = gainLoss(act.track || []);
  if (gl.gainM || gl.lossM || (gl.samples || []).some((v) => v != null)) return gl;
  if (act.climbGainM || act.climbLossM) return { gainM: act.climbGainM || 0, lossM: act.climbLossM || 0, samples: [] };
  return null;
}

function paintElevationBox(el, elev, { units: u = "mi", credit = false } = {}) {
  if (!el) return;
  if (!elev || (!(elev.gainM > 0) && !(elev.lossM > 0) && !(elev.samples && elev.samples.length >= 2))) {
    el.hidden = true;
    el.innerHTML = "";
    return;
  }
  const svg = (elev.samples && elev.samples.length >= 2)
    ? elevationProfileSvg(elev.samples, { gainM: elev.gainM, lossM: elev.lossM, units: u })
    : "";
  const creditLine = credit
    ? `<p class="tiny elev-credit">${DEM_CREDIT_SHORT} <a href="${DEM_ATTRIBUTION_URL}" target="_blank" rel="noopener">Sources</a>.</p>`
    : "";
  el.hidden = false;
  el.innerHTML = `<p class="tiny"><strong>Climb ${formatGain(elev.gainM, u)}</strong> · descent ${formatGain(elev.lossM, u)}</p>${svg}${creditLine}`;
}

function showSummary(act, course, legResult) {

  ui.summary = { act, course, legResult };
  const type = act.type === "run" ? "Run" : "Walk";
  $("summary-title").textContent = `${type} complete`;
  $("summary-sub").textContent = `${new Date(act.endedAt || act.startedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${sourceLabel(act)}`;
  const indoorNote = $("summary-indoor-note");
  if (indoorNote) {
    if (act.source === "indoor") {
      indoorNote.hidden = false;
      indoorNote.textContent = act.indoorNote
        ? `${indoorSummaryNote()} ${act.indoorNote}`
        : indoorSummaryNote();
    } else {
      indoorNote.hidden = true;
      indoorNote.textContent = "";
    }
  }
  const elev = activityElevation(act);
  const shown = displayDistance(act.track, act.distanceMeters, { countHills: !!state.settings.countHills });
  $("summary-stats").innerHTML = `
    <div class="total-box"><div class="num">${formatDistance(shown.meters, units())}</div><div class="lbl">Distance</div></div>
    <div class="total-box"><div class="num">${formatDuration(act.elapsedSec)}</div><div class="lbl">Time</div></div>
    <div class="total-box"><div class="num">${formatPace(shown.meters, act.elapsedSec, units())}</div><div class="lbl">Avg pace</div></div>`;
  if (elev && (elev.gainM > 0 || elev.lossM > 0)) {
    $("summary-stats").innerHTML += `
    <div class="total-box"><div class="num">${formatGain(elev.gainM, units())}</div><div class="lbl">Climb</div></div>
    <div class="total-box"><div class="num">${formatGain(elev.lossM, units())}</div><div class="lbl">Descent</div></div>`;
  }
  paintElevationBox($("summary-elevation"), elev, { units: units(), credit: true });
  const sectorRoot = $("summary-sectors");
  if (sectorRoot) {
    const c = course || (act.courseId && (state.courses || []).find((x) => x.id === act.courseId));
    if (c && resolveGoal(c)) {
      renderSectorTable(sectorRoot, c, act);
      persist();
    } else {
      sectorRoot.innerHTML = "";
    }
  }
  const distNote = $("summary-distance-note");
  if (distNote) {
    distNote.hidden = act.source === "indoor";
    distNote.textContent = act.source === "indoor" ? "" : shown.disclaimer;
  }

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
  ui.builder = emptyBuilderState();
  ui.builderPins = ui.builder.pins;
  ui.builderRoute = null;
  setTab("today");
  showScreen("builder");
  map.clearOverlays();
  map.clearMarkers();
  renderBuilder();
  maybeShowBuilderExplainer();
  if (ui.offBuildClick) ui.offBuildClick();
  ui.offBuildClick = map.onMapClick((pt) => {
    ui.builder = placePin(activeBuilder(), pt);
    ui.builderPins = ui.builder.pins;
    renderBuilder();
  });
}

function cancelBuilder() {
  if (ui.offBuildClick) { ui.offBuildClick(); ui.offBuildClick = null; }
  ui.builder = emptyBuilderState();
  ui.builderPins = ui.builder.pins;
  ui.builderRoute = null;
  map.clearOverlays();
  map.clearMarkers();
  showScreen("today");
  setTab("today");
}

function saveBuilder() {
  if (!canSave(activeBuilder())) return;
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
  if ($("btn-low-signal-download")) $("btn-low-signal-download").addEventListener("click", () => acceptLowSignalDownload());
  if ($("btn-low-signal-later")) $("btn-low-signal-later").addEventListener("click", () => dismissLowSignalPrompt());
  $("btn-build-course").addEventListener("click", beginBuilder);
  $("btn-saved-courses").addEventListener("click", () => setTab("courses"));
  $("btn-new-course").addEventListener("click", beginBuilder);
  $("btn-undo-pin").addEventListener("click", () => {
    ui.builder = undoPin(activeBuilder());
    ui.builderPins = ui.builder.pins;
    ui.builderRoute = null;
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
    const st = activeBuilder();
    const routed = ui.builderRoute || builderRoute();
    const c = newCourse({
      name,
      pins: savedPins(st),
      path: routed && routed.path && routed.path.length >= 2 ? routed.path.slice() : null,
      straightLine: !ui.followPaths,
      usedStraight: !!(routed && routed.usedStraight),
    });
    state.courses.push(c);
    persist();
    closeSheet("sheet-save-course");
    if (ui.offBuildClick) { ui.offBuildClick(); ui.offBuildClick = null; }
    ui.builder = emptyBuilderState();
    ui.builderPins = ui.builder.pins;
    setTab("courses");
  });
  $("btn-pause").addEventListener("click", pauseOrResume);
  $("btn-stop").addEventListener("click", finishTracking);
  if ($("btn-forgot-stay")) $("btn-forgot-stay").addEventListener("click", () => stayGoingFromForgot());
  if ($("btn-forgot-stop")) $("btn-forgot-stop").addEventListener("click", () => finishTracking());
  if ($("btn-trim-yes")) $("btn-trim-yes").addEventListener("click", () => confirmTrimEnd(true));
  if ($("btn-trim-no")) $("btn-trim-no").addEventListener("click", () => confirmTrimEnd(false));
  if ($("btn-resume-session")) $("btn-resume-session").addEventListener("click", () => resumePendingSession());
  if ($("btn-resume-save")) $("btn-resume-save").addEventListener("click", () => savePendingSession());
  if ($("btn-resume-discard")) $("btn-resume-discard").addEventListener("click", () => discardPendingSession());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushLiveSession(true);
  });
  window.addEventListener("pagehide", () => flushLiveSession(true));
  try {
    CapacitorApp.addListener("appStateChange", (s) => {
      if (s && s.isActive === false) flushLiveSession(true);
    });
  } catch { /* web */ }
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
  if ($("btn-log-indoor")) $("btn-log-indoor").addEventListener("click", () => openIndoorLog(ui.startType));
  $("btn-start-cancel").addEventListener("click", () => closeSheet("sheet-start"));
  if ($("btn-indoor-save")) $("btn-indoor-save").addEventListener("click", () => saveIndoorLog());
  if ($("btn-indoor-cancel")) $("btn-indoor-cancel").addEventListener("click", () => closeSheet("sheet-indoor"));
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
  if ($("auto-pause-switch")) {
    $("auto-pause-switch").addEventListener("click", () => {
      const next = !(state.settings.autoPause !== false);
      state.settings.autoPause = next;
      track.setAutoPauseEnabled(next);
      persist();
      renderSettings();
      const sess = track.getSession();
      if (sess) paintSessionHud(sess);
    });
  }
  if ($("low-power-switch")) {
    $("low-power-switch").addEventListener("click", () => {
      const next = !state.settings.lowPower;
      state.settings.lowPower = next;
      const changed = track.setLowPowerEnabled(next);
      persist();
      renderSettings();
      const sess = track.getSession();
      if (sess) {
        paintSessionHud(sess);
        if (changed) track.restartWatching().catch(() => {});
      }
    });
  }
  if ($("count-hills-switch")) {
    $("count-hills-switch").addEventListener("click", () => {
      state.settings.countHills = !state.settings.countHills;
      persist();
      renderSettings();
      if (ui.summary && ui.summary.act) showSummary(ui.summary.act, ui.summary.course, ui.summary.legResult);
      if (ui.screen === "builder") renderBuilder();
      if (ui.screen === "progress") renderProgress();
    });
  }
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
  if ($("btn-share-qr")) $("btn-share-qr").addEventListener("click", () => openShareQrSheet());
  if ($("btn-share-qr-close")) $("btn-share-qr-close").addEventListener("click", () => closeSheet("sheet-share-qr"));
  if ($("btn-share-qr-prev")) $("btn-share-qr-prev").addEventListener("click", () => stepShareQr(-1));
  if ($("btn-share-qr-next")) $("btn-share-qr-next").addEventListener("click", () => stepShareQr(1));
  if ($("btn-scan-qr-courses")) $("btn-scan-qr-courses").addEventListener("click", () => startQrScan());
  if ($("btn-scan-qr-plans")) $("btn-scan-qr-plans").addEventListener("click", () => startQrScan());
  if ($("btn-scan-qr-close")) $("btn-scan-qr-close").addEventListener("click", () => stopQrScan());
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
  if ($("btn-goals-open")) $("btn-goals-open").addEventListener("click", () => { showScreen("goals"); renderGoalsScreen(); });
  if ($("goals-back")) $("goals-back").addEventListener("click", () => setTab("settings"));
  if ($("btn-goals-open-plans")) $("btn-goals-open-plans").addEventListener("click", () => { showScreen("plans"); renderPlansScreen(); });
  if ($("btn-end-point-pin")) $("btn-end-point-pin").addEventListener("click", () => {
    ui.builder = toggleEndMode(activeBuilder());
    paintEndPointButton();
    renderBuilder();
  });
  if ($("btn-builder-help")) $("btn-builder-help").addEventListener("click", () => maybeShowBuilderExplainer({ force: true }));
  if ($("btn-builder-help-gotit")) $("btn-builder-help-gotit").addEventListener("click", () => {
    markExplainerSeen();
    closeSheet("sheet-builder-help");
  });
  if ($("btn-pin-add-stop")) $("btn-pin-add-stop").addEventListener("click", () => {
    const i = ui.pinActionIndex;
    closeSheet("sheet-pin-action");
    if (i == null) return;
    ui.builder = addNextStop(activeBuilder(), i);
    ui.builderPins = ui.builder.pins;
    renderBuilder();
  });
  if ($("btn-pin-set-end")) $("btn-pin-set-end").addEventListener("click", () => {
    const i = ui.pinActionIndex;
    closeSheet("sheet-pin-action");
    if (i == null) return;
    ui.builder = setEndIndex(activeBuilder(), i);
    ui.builderPins = ui.builder.pins;
    renderBuilder();
  });
  if ($("btn-pin-action-cancel")) $("btn-pin-action-cancel").addEventListener("click", () => closeSheet("sheet-pin-action"));
  if ($("btn-course-goal-save")) $("btn-course-goal-save").addEventListener("click", () => saveCourseGoal());
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
  if ($("plans-back")) $("plans-back").addEventListener("click", () => { showScreen("goals"); });
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

function renderMapChoiceSheet() {
  const hasFix = !!normalizeFix(state.settings.lastKnown);
  const wrap = $("map-choice-search-wrap");
  if (wrap) wrap.hidden = hasFix;
  // Search is only a fallback when we could not find the user.
  if (hasFix) hideSheetSearchResults();
}

function hideSheetSearchResults() {
  const list = $("map-choice-search-results");
  if (list) { list.hidden = true; list.innerHTML = ""; }
}

function openMapChoice() {
  closeSheet("sheet-location");
  renderMapChoiceSheet();
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
  if (btn) {
    btn.classList.toggle("busy", !!busy);
    btn.disabled = !!busy;
  }
  showFindingYou(busy);
}

function showFindingYou(show) {
  const el = $("finding-you");
  if (!el) return;
  el.hidden = !show;
  el.textContent = show ? FINDING_YOU : "";
}

function showLocateDenied(reason) {
  const note = noteForLocateReason(reason) || (reason ? LOCATION_DENIED_NOTE : "");
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
  const wrap = $("map-choice-search-wrap");
  if (wrap) wrap.hidden = !note;
}

function hideLocateDenied() {
  for (const id of ["map-locate-note", "map-choice-locate-note"]) {
    const el = $(id);
    if (el) { el.hidden = true; el.textContent = ""; }
  }
  const wrap = $("map-choice-search-wrap");
  if (wrap && normalizeFix(state.settings.lastKnown)) wrap.hidden = true;
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
  // Query only — never call getCurrentPosition on load (that would prompt).
  const perm = await queryLocationPermission();
  if (perm === "granted") {
    showFindingYou(true);
    const res = await requestPosition();
    showFindingYou(false);
    applyLocateResult(res, { animate: true });
  } else if (shouldShowLocationExplainer(perm)) {
    const disc = await ensureLocationDisclosure();
    if (disc && disc.allowed) {
      showFindingYou(true);
      const res = await (disc.locatePromise || requestPosition());
      showFindingYou(false);
      applyLocateResult(res, { animate: true });
    } else {
      applyLocateResult({ ok: false, fix: null, reason: "denied" }, { animate: false });
    }
  } else {
    applyLocateResult({ ok: false, fix: null, reason: "denied" }, { animate: false });
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
    const groupNote0 = $("group-conflict");
    if (groupNote0) { groupNote0.hidden = true; groupNote0.textContent = ""; }
    return;
  }
  const start = new Date(`${date}T${time}`);
  if (Number.isNaN(start.getTime())) {
    $("group-preview").textContent = "That date or time could not be read.";
    return;
  }
  const len = courseMeters(c);
  $("group-preview").textContent = `${c.name} · ${formatDistance(len, units())} · ${formatWhen(start.toISOString())} · ${formatEta(etaSeconds(len, activityMph(type)))}`;
  const groupNote = $("group-conflict");
  if (groupNote) {
    const copy = conflictCopy(plansOnDate(state.plans, date));
    groupNote.hidden = !copy;
    groupNote.textContent = copy;
  }
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
  openSheet("sheet-share");
}

function openShareQrSheet() {
  const pending = ui.pendingShareOut;
  if (!pending || !pending.obj) return;
  const encoded = encodeQrFrames(pending.kind, pending.obj);
  ui.qrFrames = encoded.frames || [];
  ui.qrIndex = 0;
  closeSheet("sheet-share");
  renderShareQrFrame();
  openSheet("sheet-share-qr");
}

function stepShareQr(delta) {
  const frames = ui.qrFrames || [];
  if (!frames.length) return;
  ui.qrIndex = (ui.qrIndex + delta + frames.length) % frames.length;
  renderShareQrFrame();
}

function renderShareQrFrame() {
  const frames = ui.qrFrames || [];
  const box = $("share-qr");
  const count = $("share-qr-count");
  const nav = $("share-qr-nav");
  if (!frames.length) {
    if (box) { box.innerHTML = ""; box.hidden = true; }
    if (count) count.textContent = "This course could not be turned into a QR code.";
    if (nav) nav.hidden = true;
    return;
  }
  const i = Math.max(0, Math.min(ui.qrIndex || 0, frames.length - 1));
  ui.qrIndex = i;
  try {
    box.innerHTML = qrSvg(frames[i]);
    box.hidden = false;
  } catch (err) {
    box.innerHTML = "";
    box.hidden = true;
    console.warn("qr", err);
  }
  if (frames.length === 1) {
    count.textContent = "One code. Works with no signal.";
    nav.hidden = true;
  } else {
    count.textContent = `Code ${i + 1} of ${frames.length}. Show these in order. Works with no signal.`;
    nav.hidden = false;
  }
}

function stopQrScan() {
  ui.scanActive = false;
  if (ui.scanRaf) {
    try { cancelAnimationFrame(ui.scanRaf); } catch { /* ignore */ }
    ui.scanRaf = 0;
  }
  const stream = ui.scanStream;
  ui.scanStream = null;
  if (stream && stream.getTracks) {
    stream.getTracks().forEach((tr) => { try { tr.stop(); } catch { /* ignore */ } });
  }
  const video = $("scan-qr-video");
  if (video) {
    try { video.srcObject = null; } catch { /* ignore */ }
  }
  closeSheet("sheet-scan-qr");
}

async function startQrScan({ previewOnly = false } = {}) {
  stopQrScanKeepSheet();
  ui.qrAssembler = createQrAssembler();
  ui.scanActive = !previewOnly;
  const note = $("scan-qr-note");
  if (note) note.textContent = previewOnly
    ? "Camera stays off in this preview."
    : "Point the camera at each code. Works with no signal.";
  openSheet("sheet-scan-qr");
  if (previewOnly) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (note) note.textContent = "This device cannot open the camera. You can still use a share link.";
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    if (!ui.scanActive) {
      stream.getTracks().forEach((tr) => tr.stop());
      return;
    }
    ui.scanStream = stream;
    const video = $("scan-qr-video");
    if (video) {
      video.srcObject = stream;
      try { await video.play(); } catch { /* autoplay may be blocked until a gesture */ }
    }
    tickQrScan();
  } catch (err) {
    if (note) {
      const denied = err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      note.textContent = denied
        ? "Camera access is needed only to scan a course or plan QR code. Nothing is kept."
        : "The camera could not be opened. You can still use a share link.";
    }
  }
}

function stopQrScanKeepSheet() {
  ui.scanActive = false;
  if (ui.scanRaf) {
    try { cancelAnimationFrame(ui.scanRaf); } catch { /* ignore */ }
    ui.scanRaf = 0;
  }
  const stream = ui.scanStream;
  ui.scanStream = null;
  if (stream && stream.getTracks) {
    stream.getTracks().forEach((tr) => { try { tr.stop(); } catch { /* ignore */ } });
  }
  const video = $("scan-qr-video");
  if (video) {
    try { video.srcObject = null; } catch { /* ignore */ }
  }
}

function tickQrScan() {
  if (!ui.scanActive) return;
  const video = $("scan-qr-video");
  const canvas = $("scan-qr-canvas");
  if (video && canvas && video.readyState >= 2 && video.videoWidth) {
    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const text = scanQrImageData(img);
      if (text) handleScannedQr(text);
    }
  }
  ui.scanRaf = requestAnimationFrame(tickQrScan);
}

function handleScannedQr(text) {
  if (!ui.qrAssembler) ui.qrAssembler = createQrAssembler();
  const result = ui.qrAssembler.add(text);
  const note = $("scan-qr-note");
  if (result.status === "need_more") {
    if (note) note.textContent = `Got ${result.got} of ${result.total}. Scan the next code.`;
    return;
  }
  if (result.status === "complete" && result.decoded && result.decoded.ok) {
    stopQrScan();
    const decoded = result.decoded;
    if (decoded.kind === "plan") installSharedPlanDirectly(decoded);
    else openImportSheet(decoded);
    return;
  }
  if (result.status === "error" && note) {
    note.textContent = "That code could not be read. Try again from the first code.";
    ui.qrAssembler.reset();
  }
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

function installSharedPlanDirectly(decoded) {
  if (!decoded || !decoded.ok || decoded.kind !== "plan") return false;
  const res = importPlanFile(JSON.stringify({
    format: PLAN_FORMAT,
    formatVersion: PLAN_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    plan: decoded.plan,
  }), { existingIds: (state.planLibrary || []).map((p) => p.id) });
  if (!res.ok) {
    ui.pendingShare = decoded;
    $("share-import-title").textContent = "Could not add this plan";
    $("share-import-sub").textContent = "That plan could not be imported. Nothing was charged.";
    $("btn-share-import-add").textContent = "Try again";
    $("share-import-preview").innerHTML = "";
    openSheet("sheet-share-import");
    return true;
  }
  addPlanToState(state, res.plan);
  persist();
  ui.pendingShare = null;
  closeSheet("sheet-share-import");
  showScreen("plans");
  renderPlansScreen();
  const note = $("plan-import-note") || $("plans-price-line");
  if (note && $("plan-import-note")) {
    $("plan-import-note").textContent = "Plan added to this phone. This is your own copy — your progress, metrics, graphs and history stay on this device and are not shared.";
  }
  return true;
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
  if (decoded.kind === "plan") installSharedPlanDirectly(decoded);
  else openImportSheet(decoded);
  if (typeof history !== "undefined" && typeof location !== "undefined" && isShareHash(location.href)) {
    try { history.replaceState(null, "", location.pathname); } catch { /* ignore */ }
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
    closeSheet("sheet-indoor");
    closeSheet("sheet-resume");
    closeSheet("sheet-forgot");
    closeSheet("sheet-trim-end");
    closeSheet("sheet-location");
    closeSheet("sheet-course");
    closeSheet("sheet-target");
    closeSheet("sheet-save-route");
    closeSheet("sheet-celebrate");
    closeSheet("sheet-save-free");
    closeSheet("sheet-share");
    closeSheet("sheet-share-qr");
    if (typeof stopQrScanKeepSheet === "function") stopQrScanKeepSheet();
    closeSheet("sheet-scan-qr");
    if (typeof setOfferChrome === "function") setOfferChrome(false);
    try { map.clearOverlays(); map.clearMarkers(); } catch { /* map may not be ready */ }
    closeSheet("sheet-share-import");
    closeSheet("sheet-group");
    closeSheet("sheet-group-invite");
    closeSheet("sheet-builder-help");
    closeSheet("sheet-pin-action");
    if (name !== "builder-help") {
      try { markExplainerSeen(); } catch { /* ignore */ }
    }
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
    } else if (name === "tracking-offroute") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses = [course];
      const sess = midCourseWalk(course, units());
      track.stopSession();
      const made = track.makeSession({ type: "walk", course, units: units() });
      Object.assign(made, sess);
      const last = made.track[made.track.length - 1] || course.pins[0];
      const off = { lat: last.lat + 0.0008, lon: last.lon, t: made.elapsedSec, at: new Date().toISOString() };
      made.track = (made.track || []).concat([off]);
      made.offRouteSince = Date.now() - 8000;
      updateOffRoute(made, Date.now());
      made.offRoute = true;
      setTab("today");
      showScreen("tracking");
      paintSessionHud(made);
      map.whenReady(() => { drawSessionOnMap(made); map.fitBounds((made.wayBack || []).concat(course.pins), 80); });
      drawSessionOnMap(made);
    } else if (name === "tracking-midstart" || name === "tracking-reverse") {
      const start = { lat: 43.77, lon: 11.25 };
      const end = { lat: 43.77, lon: 11.2548 };
      const course = newCourse({ name: "River path", pins: [start, end], path: [start, end] });
      state.courses = [course, ...(state.courses || [])];
      track.stopSession();
      const made = track.makeSession({ type: "walk", course, units: units() });
      const pts = [];
      if (name === "tracking-reverse") {
        for (let i = 0; i <= 8; i++) {
          const lon = end.lon - (end.lon - start.lon) * (i / 50);
          pts.push({ lat: start.lat, lon, t: i * 8, at: new Date(Date.now() - (8 - i) * 4000).toISOString() });
        }
      } else {
        const midLon = (start.lon + end.lon) / 2;
        for (let i = 0; i <= 8; i++) {
          const lon = midLon + (end.lon - start.lon) * (i / 50);
          pts.push({ lat: start.lat, lon, t: i * 8, at: new Date(Date.now() - (8 - i) * 4000).toISOString() });
        }
      }
      made.track = [];
      made.distanceMeters = 0;
      for (const p of pts) track.pushPoint(p.lat, p.lon, Date.parse(p.at));
      made.elapsedSec = 64;
      setTab("today");
      showScreen("tracking");
      paintSessionHud(made);
      map.whenReady(() => { drawSessionOnMap(made); map.fitBounds([start, end], 80); });
      drawSessionOnMap(made);
    } else if (name === "tracking-autopause") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses = [course];
      const sess = midCourseWalk(course, units());
      track.stopSession();
      const made = track.makeSession({ type: "walk", course, units: units() });
      Object.assign(made, sess);
      made.paused = true;
      made.pauseReason = "auto";
      setTab("today");
      showScreen("tracking");
      paintSessionHud(made);
      map.whenReady(() => { drawSessionOnMap(made); map.fitBounds(course.pins, 80); });
      drawSessionOnMap(made);
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
      await ensureWalkGraph({ lat: 43.7672, lon: 11.2543 });
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
      await ensureWalkGraph({ lat: 43.7672, lon: 11.2543 });
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
    } else if (name === "calendar-conflict") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      const day = "2026-12-05";
      const walk = newPlan({
        date: day,
        courseId: course.id,
        courseName: course.name,
        activityType: "walk",
      });
      state.plans = (state.plans || []).filter((p) => p.date !== day);
      state.plans.push(walk);
      const start = new Date(2026, 11, 5, 9, 0, 0);
      const made = makeGroupRun({ course, startAt: start, activityType: "run", now: new Date(2026, 10, 20, 12, 0, 0) });
      if (made.ok) addGroupRunToState(state, made.run);
      persist();
      ui.cal = new Date(2026, 11, 5);
      ui.selectedDay = day;
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
    else if (name === "builder-help") {
      await window.HeldpathTest.show("builder", opt);
      maybeShowBuilderExplainer({ force: true });
    } else if (name === "builder-loop" || name === "builder-mile-loop") {
      const center = { lat: 43.7672, lon: 11.2543 };
      await ensureWalkGraph(center);
      ui.followPaths = true;
      const wantMile = name === "builder-mile-loop";
      const loop = (wantMile && getActiveGraph()) ? autoLoopRoute(getActiveGraph(), center, 1609) : null;
      if (loop && loop.pins && loop.pins.length >= 3) {
        ui.builder = ingestPins(loop.pins);
        ui.builder = setEndIndex(ui.builder, 0);
        ui.builderRoute = loop;
      } else {
        const pins = arnoLoopPins();
        ui.builder = ingestPins(pins);
        ui.builder = setEndIndex(ui.builder, 0);
      }
      ui.builderPins = ui.builder.pins;
      showScreen("builder");
      setTab("today");
      showScreen("builder");
      renderBuilder();
      const fit = (ui.builderRoute && ui.builderRoute.path) || routeStops(ui.builder);
      const pad = { top: 56, bottom: 520, left: 56, right: 56 };
      map.whenReady(() => { renderBuilder(); if (fit && fit.length) map.fitBounds(fit, pad); });
    } else if (name === "goals") {
      const now = new Date("2026-11-18T18:00:00");
      state.goals = [
        newGoal({ name: "Weekly distance", kind: "week-distance", period: "week", distanceMeters: 10 * METERS_PER_MILE }),
        newGoal({ name: "Monthly runs", kind: "month-count", period: "month", targetCount: 12 }),
      ];
      persist();
      showScreen("goals");
      renderGoalsScreen();
    } else if (name === "plans" || name === "plans-water") {
      showScreen("plans");
      renderPlansScreen();
      if (name === "plans-water") {
        setTimeout(() => { try { onRecommendWater && onRecommendWater(); } catch { /* plans_ui private */ } }, 0);
        // Open the recommendation box from this page if the button exists.
        const rec = $("btn-water-recommend");
        if (rec) rec.click();
      }
    } else if (name === "progress-goals" || name === "progress-bars") {
      state.goals = state.goals || [];
      if (!state.goals.some((g) => g.kind === "week-distance")) {
        state.goals.push(newGoal({ name: "Weekly distance", kind: "week-distance", period: "week", distanceMeters: 10 * METERS_PER_MILE }));
      }
      persist();
      ui.range = "All";
      if (name === "progress-bars") {
        try { localStorage.setItem("heldpath.goal-chart-style.v1", "bar"); } catch { /* ignore */ }
      } else {
        try { localStorage.setItem("heldpath.goal-chart-style.v1", "line"); } catch { /* ignore */ }
      }
      setTab("progress");
    } else if (name === "summary-sectors") {
      const course = state.courses[0] || newCourse({ name: "Park loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      course.goal = goalFromFinishTime(30 * 60, course) || { finishSec: 30 * 60 };
      const pins = course.pins;
      const trackPts = [];
      const totalM = courseMeters(course) || 1609;
      const startMs = Date.parse("2026-11-18T09:00:00.000Z");
      for (let i = 0; i < pins.length; i++) {
        const frac = i / Math.max(1, pins.length - 1);
        const elapsed = Math.round(frac * 28 * 60);
        trackPts.push({
          lat: pins[i].lat,
          lon: pins[i].lon,
          t: elapsed,
          at: new Date(startMs + elapsed * 1000).toISOString(),
        });
      }
      const act = newActivity({
        type: "run",
        courseId: course.id,
        courseName: course.name,
        startedAt: "2026-11-18T09:00:00.000Z",
        endedAt: "2026-11-18T09:28:00.000Z",
        distanceMeters: totalM,
        elapsedSec: 28 * 60,
        track: trackPts,
      });
      showSummary(act, course, null);
    } else if (name === "tracking-sectors") {
      const course = state.courses[0] || newCourse({ name: "Park loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      course.goal = goalFromFinishTime(30 * 60, course) || { finishSec: 30 * 60 };
      course.sectorCallout = false;
      persist();
      const made = await window.HeldpathTest.show("tracking", opt);
      // After tracking is on screen, overlay a sector flash as if sector 1 just finished ahead.
      const flash = $("sector-flash");
      if (flash) {
        flash.hidden = false;
        flash.classList.remove("green", "red", "purple");
        flash.classList.add("green");
        if ($("sector-flash-main")) $("sector-flash-main").textContent = "S1  −0:04.2";
        if ($("sector-flash-cum")) $("sector-flash-cum").textContent = "Total −0:04.2";
      }
    } else if (name === "target-setup") {
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
    else if (name === "share-qr") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      setTab("courses");
      ui.pendingShareOut = { kind: "course", obj: course };
      openShareQrSheet();
    }
    else if (name === "scan-qr") {
      setTab("courses");
      showScreen("courses");
      startQrScan({ previewOnly: true });
      const note = $("scan-qr-note");
      if (note) note.textContent = "Point the camera at a Heldpath QR code. Works with no signal.";
    }
    else if (name === "indoor-log") {
      setTab("today");
      showScreen("today");
      openIndoorLog("run");
      if ($("indoor-distance")) $("indoor-distance").value = "3.1";
      if ($("indoor-time")) $("indoor-time").value = "28:00";
    } else if (name === "forgot-stop") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses = [course];
      const sess = midCourseWalk(course, units());
      track.stopSession();
      const made = track.makeSession({ type: "walk", course, units: units() });
      Object.assign(made, sess);
      made.paused = true;
      made.pauseReason = "auto";
      made.pauseStarted = Date.now() - 10 * 60 * 1000;
      setTab("today");
      showScreen("tracking");
      paintSessionHud(made);
      const copy = forgotCopy(10 * 60 * 1000);
      if ($("forgot-title")) $("forgot-title").textContent = copy.title;
      if ($("forgot-body")) $("forgot-body").textContent = copy.body;
      openSheet("sheet-forgot");
      map.whenReady(() => { drawSessionOnMap(made); map.fitBounds(course.pins, 80); });
      drawSessionOnMap(made);
    } else if (name === "trim-end") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses = [course];
      const sess = midCourseWalk(course, units());
      const copy = trimCopy(12 * 60, "walk");
      if ($("trim-title")) $("trim-title").textContent = copy.title;
      if ($("trim-body")) $("trim-body").textContent = copy.body;
      ui.pendingFinish = { sess };
      setTab("today");
      showScreen("today");
      openSheet("sheet-trim-end");
    }
    else if (name === "resume-session") {
      setTab("today");
      showScreen("today");
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses = [course];
      const sess = midCourseWalk(course, units());
      const snap = snapshotSession({
        type: sess.type || "walk",
        units: sess.units || units(),
        startedAt: sess.startedAt,
        courseId: course.id,
        courseName: course.name,
        coursePins: course.pins,
        coursePath: course.path || course.pins,
        track: sess.track,
        distanceMeters: sess.distanceMeters,
        elapsedSec: sess.elapsedSec || 12 * 60,
        paused: false,
      });
      showResumeSheet(snap);
    }
    else if (name === "settings") setTab("settings");
    else if (name === "low-signal") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      ui.pendingLowSignal = { type: "walk", course, plan: null, targetPlan: null, bbox: pathBbox(course.pins || course.path) };
      const copy = $("low-signal-copy");
      if (copy) copy.textContent = LOW_SIGNAL_COPY;
      setTab("today");
      showScreen("today");
      openSheet("sheet-low-signal");
    }

    else if (name === "settings-lowpower") {
      state.settings.lowPower = true;
      track.setLowPowerEnabled(true);
      setTab("settings");
    } else if (name === "settings-hills") {
      state.settings.countHills = true;
      setTab("settings");
    } else if (name === "summary-elevation") {
      const trackPts = [];
      for (let i = 0; i <= 10; i++) {
        const ele = i <= 5 ? i * 20 : (10 - i) * 20;
        trackPts.push({ lat: 41.88 + i * 0.0009, lon: -87.63, ele, t: i * 60 });
      }
      const gl = gainLoss(trackPts);
      const act = newActivity({
        type: "walk",
        courseName: "Hill path",
        startedAt: "2026-11-20T16:00:00.000Z",
        endedAt: "2026-11-20T16:45:00.000Z",
        distanceMeters: 1000,
        elapsedSec: 2700,
        track: trackPts,
        source: "phone",
        climbGainM: gl.gainM,
        climbLossM: gl.lossM,
      });
      showSummary(act, null, null);
    } else if (name === "tracking-lowpower") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      state.settings.lowPower = true;
      track.setLowPowerEnabled(true);
      const made = track.makeSession({ type: "walk", course, units: "mi" });
      made.lowPower = true;
      made.distanceMeters = 400;
      made.elapsedSec = 300;
      setTab("today");
      showScreen("tracking");
      paintSessionHud(made);
    }
    else if (name === "goals") { showScreen("goals"); renderGoalsScreen(); }
    else if (name === "plans") { showScreen("plans"); renderPlansScreen(); }
    else if (name === "support") { setTab("settings"); showScreen("support"); renderSettings(); }
    else if (name === "stretches") { setStretchStyle("realistic"); setTab("settings"); showStretchesHub(); }
    else if (name === "stretches-group") { setStretchStyle("realistic"); setTab("settings"); showStretchGroup("hips"); }
    else if (name === "stretches-card") { setStretchStyle("realistic"); setTab("settings"); showStretchGroup("shoulders_arms"); }
    else if (name === "stretches-workout") { setStretchStyle("realistic"); setTab("settings"); showStretchWorkout(1); }
    else if (name === "stretches-credits") { setTab("settings"); showStretchCredits(); }
    else if (name === "stretches-flashcards") { setStretchStyle("flashcards"); setTab("settings"); showStretchesHub(); }
    else if (name === "stretches-flashcard") { setStretchStyle("flashcards"); setTab("settings"); showStretchGroup("shoulders_arms"); }
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
    else if (name === "location" || name === "disclosure") {
      setTab("today");
      showScreen("today");
      closeSheet("sheet-map");
      openSheet("sheet-location");
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
  initPlansUi({ getState: () => state, persist, units, openShare: (plan) => openShareSheet("plan", plan), getCenter: () => (state.settings.lastKnown && state.settings.lastKnown.lat != null ? { lat: state.settings.lastKnown.lat, lon: state.settings.lastKnown.lon } : null) });
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
    const pending = loadLiveSession();
    if (isResumable(pending)) showResumeSheet(pending);
    else await locateAndOfferMapChoice();
  }
}

init();
