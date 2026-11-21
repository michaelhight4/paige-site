import { StatusBar, Style } from "@capacitor/status-bar";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSportRate,
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
  geodesicDirect,
} from "./util.js";
import { loadState, saveState, resetState, newCourse, newActivity, newPlan, newGoal, migrateCourses } from "./storage.js";
import * as health from "./health.js";
import { normalizeSport, loadLastSport, saveLastSport, sportLabel, rateLabel } from "./sport.js"; /* heldpath-hook: bike */
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
/* heldpath-hook: routes-heatmap */
import {
  filterActivities as filterHeatmapActivities,
  heatmapSummary,
  heatmapBounds,
  renderHeatmap,
  clearHeatmap,
  heatmapEmptyCopy,
} from "./heatmap.js";
import {
  matchedLoops,
  trendSeries,
  formatTrend,
  trendLabel,
  sportLabel as matchSportLabel,
} from "./matched_loops.js";
import {
  generateSuggestions,
  suggestionPreview,
  suggestionName,
  suggestionPins,
  suggestionReason,
} from "./suggest_routes.js";
import {
  HILL_PACE_NOTE,
  hillPaceForActivity,
  hillPaceLine,
} from "./hill_pace.js";
/* heldpath-hook: routes-heatmap end */
import {
  emptyBuilderState,
  placePin,
  setEndMode,
  toggleEndMode,
  setEndIndex,
  addNextStop,
  undoPin,
  removePin,
  removeEnd,
  snapshotBuilder,
  restoreBuilder,
  sharedPinIndices,
  samePin,
  pinLabel,
  pinNumberLabel,
  routeStops,
  canSave,
  savedPins,
  ingestPins,
  routeCourse,
  isExplainerSeen,
  markExplainerSeen,
  isPathModeExplainerSeen,
  markPathModeExplainerSeen,
  setPinPathMode,
  builderHint,
  EXPLAINER_BODY,
  EXPLAINER_TITLE,
  PATH_MODE_EXPLAINER_BODY,
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
  formatSectorLine,
  readSectorPbs,
  hasSectorHistory,
  goalFromFinishTime,
  goalFromPace,
  synthesizeSectorTrack,
} from "./sector_timing.js";
import {
  buildGoalSeries,
  mountGoalChart,  historyTableMarkup,
  loadChartStyle,
  saveChartStyle,
  periodGoalProgress,
  periodRingMarkup,
  periodHistory,
  runsForGoal,
  metricForGoal,
  pointsFromRuns,
  goalPeriod,
  oneShotGoalProgress,
  freeGoalGap,
  freeGoalGapMarkup,
} from "./goal_progress.js";

/* heldpath-hook: summary-laps — post-run Summary + More Details views */
import { renderSummary, renderDetails, buildSectorModel, detailsMapMeters, sectorTrackSegments } from "./summary_view.js";

import { initPlansUi, renderPlansScreen } from "./plans_ui.js";
import { initStretchesUi, showStretchesHub, showStretchGroup, showStretchWorkout, showStretchCredits, showStretchFollow, openStretchVideo, closeStretchVideo, setStretchStyle } from "./stretches_ui.js";
import { initMapDownloadUi, showMapAreas, openCrop, closeCrop } from "./map_download_ui.js";
/* heldpath-hook: import — universal GPX/FIT/TCX/zip import and export/share cards */
import { initImportUi } from "./import_ui.js";
import { initExportUi } from "./export_ui.js";
import { listAreas } from "./map_offline.js";
import { ensureWalkGraph, ensureLoopGraph, ensureBikeGraph, ensureBikeLoopGraph, graphCoversPoints } from "./area_graphs.js"; /* heldpath-hook: bike */
import { assessRouteLowSignal, LOW_SIGNAL_COPY, pathBbox } from "./low_signal.js";
import { gainLoss, displayDistance, naismithSeconds, formatGain, elevationProfileSvg, FLAT_DISCLAIMER, HILLS_DISCLAIMER, DEM_CREDIT_SHORT, DEM_ATTRIBUTION_URL } from "./elevation.js";
import { samplePathDem } from "./elevation_dem.js";

import { applyCompletedSession, importPlanFile, addPlanToState, makePlan, PLAN_FORMAT, PLAN_FORMAT_VERSION } from "./plans.js";
import { buildPlanDraft, buildAutoLoop, AUTO_LOOP_FAIL_COPY } from "./plan_progress.js";
import { recentAveragePaceSecPerMeter } from "./plan_legs.js";
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
  startLocationWatch,
  stopLocationWatch,
  locationWatchActive,
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
  setActiveGraph,
  routeLegs,
  autoLoopRoute,
  coursePath,
  courseMeters,
  snapToNode,
  normalizePathMode,
  isOffPathMode,
  ON_PATH_COLOR,
  OFF_PATH_COLOR,
  LONG_DETOUR_HINT,
  UNROUTABLE_SWITCH_HINT,
} from "./routing.js";
import {
  planFromCourse,
  planTarget,
  MODE_COURSE,
  MODE_CONTINUE,
  progressOnPlan,
  shouldPromptSessionDistance,
  shouldAutoEndAtTarget,
  formatLapPlanLabel,
  inputValueForMeters,
  SESSION_DISTANCE_EXPLAINER_KEY,
  SESSION_DISTANCE_EXPLAINER_BODY,
  isSessionDistanceExplainerSeen,
  markSessionDistanceExplainerSeen,
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
  startType: loadLastSport(), // heldpath-hook: bike — default to the last sport
  hideNav: false,
  builderRoute: null,
  straightOverrides: new Set(),
  lockWalkGraph: false,
  findingPaths: false,
  builderSheetExpanded: false,
  pathMode: "on",
  /* heldpath-hook: routes-heatmap */
  insightsSport: "all",
  insightsRange: "all",
  insightsGroupId: null,
  insightsSuggestion: null,
  insightsSuggestionMeta: null,
  insightsBusy: false,
  insightsSaved: "",
  /* heldpath-hook: routes-heatmap end */
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

let autoEndingSession = false;

function onLiveSessionUpdate(s, why) {
  if (!s) return;
  paintSessionHud(s);
  drawSessionOnMap(s);
  maybeSaveLiveSession(s, { ...liveSessionExtra(), force: why === "hide" });
  maybeForgotPrompt(s);
  maybeAutoEndLoopTarget(s);
}

function maybeAutoEndLoopTarget(s) {
  if (autoEndingSession || !shouldAutoEndAtTarget(s)) return;
  autoEndingSession = true;
  Promise.resolve(finishTracking()).finally(() => {
    autoEndingSession = false;
  });
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
  if (activity.source === "import") {
    const fmt = String(activity.importFormat || "").toUpperCase();
    return fmt ? `Imported ${fmt} file` : "Imported from a file";
  }
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
  /* heldpath-hook: routes-heatmap, summary-laps */
  const mapScreens = new Set(["today", "tracking", "builder", "summary-details", "insights"]);
  $("map").style.visibility = mapScreens.has(name) ? "visible" : "hidden";
  if ($("map-tools")) $("map-tools").hidden = !mapScreens.has(name) || name === "insights";
  document.body.dataset.screen = name;
  document.body.classList.toggle("on-map-screen", mapScreens.has(name));
  $("tab-bar").style.display = name === "lock" || ui.hideNav ? "none" : "grid";
  if (mapScreens.has(name)) {
    requestAnimationFrame(() => map.resizeMap());
    if (name === "insights") paintInsightsMap();
    else if (name === "builder") startBuilderLocation({ center: false });
    else maybeStartLiveLocation();
    paintMapStyleButton();
  } else if (typeof stopLocationWatch === "function" && !locationWatchActive()) {
    /* leave an existing watch running so returning to the map keeps the last fix */
  }
  if (name !== "insights") {
    try { clearHeatmap(map.getMap()); } catch { /* map may not be ready */ }
  }
  /* heldpath-hook: routes-heatmap end */
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

function closeAllSheets() {
  document.querySelectorAll(".sheet-back.open").forEach((el) => el.classList.remove("open"));
}

function openSheet(id) {
  // Only one sheet at a time — a leftover prompt (e.g. low-signal) must
  // not sit on top of a later dialog.
  document.querySelectorAll(".sheet-back.open").forEach((el) => {
    if (el.id !== id) el.classList.remove("open");
  });
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
  if (banner && !ui.keepMapBanner) banner.hidden = true;
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
  $("track-kicker").textContent = `${sportLabel(sess.type)}${sess.courseName ? " · " + sess.courseName : ""}`; /* heldpath-hook: bike */
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
  $("track-pace").textContent = formatSportRate(sess.type, sess.distanceMeters, sess.elapsedSec, sess.units); /* heldpath-hook: bike */
  if ($("track-pace-lbl")) $("track-pace-lbl").textContent = rateLabel(sess.type);
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


function makeSectorFixture() {
  const a = { lat: 41.85, lon: -87.65, role: "start" };
  const b = { ...geodesicDirect(a, 90, 0.5 * METERS_PER_MILE), role: "via" };
  const c = { ...geodesicDirect(b, 90, 1.7 * METERS_PER_MILE), role: "via" };
  const d = { ...geodesicDirect(c, 90, 0.8 * METERS_PER_MILE), role: "end" };
  const pins = [a, b, c, d];
  const course = newCourse({ name: "Even-pace loop", pins });
  course.goal = goalFromFinishTime(30 * 60, course);
  // Previous bests so the Best row is visible (not a first run).
  course.sectorPbs = {
    0: { seconds: 295.1, activityId: "prev", date: "2026-11-11T09:00:00.000Z" },
    1: { seconds: 1030.0, activityId: "prev", date: "2026-11-11T09:00:00.000Z" },
    2: { seconds: 470.0, activityId: "prev", date: "2026-11-11T09:00:00.000Z" },
  };
  course.sectorHistory = [{ at: "2026-11-11T09:00:00.000Z", activityId: "prev", times: [295.1, 1030.0, 470.0], totalSec: 1795.1 }];
  const sectorSeconds = [292.3, 1010.0, 460.0]; // 4:52.3, 16:50.0, 7:40.0
  const trackPts = synthesizeSectorTrack(course, sectorSeconds, { stepMeters: 8 });
  return {
    course,
    track: trackPts,
    sectorSeconds,
    sectorMeters: sectorMetersList(course),
    meters: sectorMetersList(course).reduce((s, v) => s + v, 0),
    totalSec: sectorSeconds.reduce((s, v) => s + v, 0),
  };
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
  if ($("sector-flash-label")) $("sector-flash-label").textContent = flash.label || "";
  if ($("sector-flash-main")) $("sector-flash-main").textContent = flash.sectorLine;
  const bestEl = $("sector-flash-best");
  if (bestEl) {
    bestEl.hidden = !flash.bestLine;
    bestEl.textContent = flash.bestLine || "";
    bestEl.classList.toggle("purple", !!(flash.showBest && row.isNewPb));
  }
  if ($("sector-flash-cum")) $("sector-flash-cum").textContent = [flash.cumulativeLine, flash.bestPossibleLine].filter(Boolean).join(" · ");
  ui.sectorFlashSticky = true;
  if (course.sectorCallout) maybeCallout(flash.spoken, { audio: true, haptic: true });
}

function paintSectorLineEl(el, label, target, you, deltaSec, color) {
  el.textContent = "";
  const tgt = Number(target) > 0 ? formatSectorTime(target) : "—";
  const youTxt = Number(you) > 0 ? formatSectorTime(you) : "—";
  el.appendChild(document.createTextNode(`${label} ${tgt} | You ${youTxt}`));
  const delta = (Number(you) > 0 && Number(target) > 0 && deltaSec != null) ? formatSectorDelta(deltaSec) : "";
  if (delta) {
    el.appendChild(document.createTextNode(" "));
    const s = document.createElement("span");
    s.className = "sector-delta " + (color || "");
    s.textContent = delta;
    el.appendChild(s);
  }
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
  let cum = 0;
  compared.forEach((row, i) => {
    const appliedRow = applied && applied.rows && applied.rows[i];
    const isPb = !!(appliedRow && appliedRow.isNewPb);
    const block = document.createElement("div");
    block.className = "sector-block";
    block.dataset.testid = "sector-block-" + (i + 1);
    const lab = document.createElement("div");
    lab.className = "sector-block-label";
    lab.textContent = "S" + (i + 1);
    block.appendChild(lab);
    const goalLine = document.createElement("div");
    goalLine.className = "sector-line";
    goalLine.dataset.testid = "sector-goal-" + (i + 1);
    paintSectorLineEl(goalLine, "Goal", row.target, row.time, row.vsGoal, row.colorVsGoal);
    block.appendChild(goalLine);
    if (histBefore && row.pb > 0) {
      const bestLine = document.createElement("div");
      bestLine.className = "sector-line";
      bestLine.dataset.testid = "sector-best-" + (i + 1);
      paintSectorLineEl(bestLine, "Best", row.pb, row.time, row.vsPb, isPb ? "purple" : row.colorVsPb);
      block.appendChild(bestLine);
    }
    if (row.vsGoal != null) cum += row.vsGoal;
    table.appendChild(block);
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
    const c = sess.courseId ? courseById(sess.courseId) : null;
    paintCourseLegs(sess.courseLegs || (c && c.legs), guide, { id: "course-line", width: 4 });
    if (sess.coursePins) addCoursePins(sess.coursePins);
    if (sess.target && sess.target.stopPin) {
      const stopLabel = sess.target.targetMeters
        ? formatDistance(sess.target.targetMeters, units(), { digits: 2 })
        : "End";
      map.addPin(sess.target.stopPin, { kind: "stop", label: stopLabel });
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
  if (clickable && builderState) {
    const placed = [];
    (builderState.pins || []).forEach((p, i) => {
      const hit = placed.find((x) => samePin(x, p));
      if (hit) hit.indices.push(i);
      else placed.push({ lat: p.lat, lon: p.lon, role: p.role, index: i, indices: [i] });
    });
    placed.forEach((p) => {
      const kind = p.indices.includes(0) ? "start" : (builderState.endIndex != null && p.indices.includes(builderState.endIndex) ? "end" : "via");
      const pathMode = normalizePathMode((builderState.pins[p.index] || p).pathMode);
      const opts = {
        kind,
        label: pinLabel(builderState, p.index),
        pathMode,
        onClick: (ev) => {
          if (ev && ev.stopPropagation) ev.stopPropagation();
          openPinAction(p.index);
        },
      };
      map.addPin(p, opts);
    });
    return;
  }
  (pins || []).forEach((p, i) => {
    const kind = p.role || (i === 0 ? "start" : i === pins.length - 1 ? "end" : "via");
    const label = kind === "start" ? "Start" : kind === "end" ? "End" : String(i + 1);
    map.addPin(p, { kind, label, pathMode: normalizePathMode(p.pathMode) });
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
    previous: ui.builderRoute || null,
    straightOverrides: ui.straightOverrides,
  });
  ui.builderRoute = routed;
  return routed;
}


function waitMapReady(ms = 4000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; resolve(); };
    try {
      map.whenReady(() => {
        const idle = (typeof map.whenIdle === "function") ? map.whenIdle() : Promise.resolve();
        Promise.race([idle, new Promise((r) => setTimeout(r, 2000))]).then(finish, finish);
      });
    } catch {
      finish();
    }
    setTimeout(finish, ms);
  });
}

function fitBuilderCourse(coords, extra = {}) {
  if (!coords || !coords.length) return;
  try { map.resizeMap(); } catch { /* map may not be ready */ }
  const panel = document.querySelector(".builder-panel");
  const mapEl = $("map");
  const vh = (mapEl && mapEl.getBoundingClientRect().height) || window.innerHeight || 800;
  // Padding is relative to the full-screen map, so it must clear the
  // sheet *and* the tab bar — not just the panel's own height.
  let bottom = 160;
  if (panel) {
    const top = panel.getBoundingClientRect().top;
    if (top > 0) bottom = Math.round(vh - top + 28);
  }
  bottom = Math.min(Math.max(bottom, 140), Math.round(vh * 0.72));
  map.fitBounds(coords, { top: 80, bottom, left: 56, right: 56, maxZoom: extra.maxZoom || 16 });
}

/** Evenly spaced pins that already sit on a walkable path, for a visible loop. */
function pinsFromPath(path, count = 4, graph = null) {
  const pts = (path || []).filter((p) => p && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)));
  if (pts.length < 2) return [];
  const total = pathLengthMeters(pts);
  if (!(total > 20)) return [];
  const n = Math.max(3, Number(count) || 4);
  const pins = [];
  for (let i = 0; i < n; i++) {
    const raw = pointAlongPath(pts, (total * i) / n) || pts[0];
    const snap = graph ? snapToNode(graph, raw.lat, raw.lon, 150) : null;
    const pt = snap ? { lat: snap.lat, lon: snap.lon } : raw;
    const last = pins[pins.length - 1];
    if (last && samePin(last, pt, 40)) continue;
    pins.push({ lat: pt.lat, lon: pt.lon, role: pins.length === 0 ? "start" : "via" });
  }
  if (pins.length < 3) return [];
  pins.push({ lat: pins[0].lat, lon: pins[0].lon, role: "end" });
  return pins;
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
  const shared = sharedPinIndices(st, index);
  const sub = $("pin-action-sub");
  if (sub) {
    sub.textContent = shared.length > 1
      ? "This pin is visited more than once. Delete one stop number, set this place as the end, or add another visit."
      : "Delete this pin, set it as the end, or add it as another stop.";
  }
  const deletes = $("pin-action-deletes");
  const singleBtn = $("btn-pin-delete");
  if (deletes) deletes.innerHTML = "";
  if (shared.length > 1) {
    if (singleBtn) singleBtn.hidden = true;
    shared.forEach((i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-danger pin-delete-stop";
      btn.style.width = "100%";
      btn.style.marginBottom = "10px";
      btn.dataset.testid = "pin-delete-stop-" + (i + 1);
      btn.textContent = "Delete stop " + (i + 1);
      btn.addEventListener("click", () => applyPinDelete(i));
      if (deletes) deletes.appendChild(btn);
    });
  } else if (singleBtn) {
    singleBtn.hidden = false;
    singleBtn.textContent = "Delete this pin";
  }
  const setEnd = $("btn-pin-set-end");
  const removeEndBtn = $("btn-pin-remove-end");
  if (setEnd) setEnd.hidden = st.endIndex === index;
  if (removeEndBtn) removeEndBtn.hidden = st.endIndex !== index;
  const onBtn = $("btn-pin-path-on");
  const offBtn = $("btn-pin-path-off");
  const mode = normalizePathMode(st.pins[index].pathMode);
  if (onBtn) {
    onBtn.setAttribute("aria-pressed", mode === "on" ? "true" : "false");
    onBtn.classList.toggle("on", mode === "on");
  }
  if (offBtn) {
    offBtn.setAttribute("aria-pressed", mode === "off" ? "true" : "false");
    offBtn.classList.toggle("on", mode === "off");
  }
  openSheet("sheet-pin-action");
}

function pushBuilderHistory() {
  if (!ui.builderHistory) ui.builderHistory = [];
  ui.builderHistory.push(snapshotBuilder(activeBuilder()));
  if (ui.builderHistory.length > 40) ui.builderHistory.shift();
}

function applyBuilderChange(mutator) {
  pushBuilderHistory();
  ui.builder = mutator(activeBuilder());
  ui.builderPins = ui.builder.pins;
  ui.builderRoute = null;
  renderBuilder();
}

function applyPinDelete(index) {
  closeSheet("sheet-pin-action");
  applyBuilderChange((st) => removePin(st, index));
}

function undoLastBuilderAction() {
  if (ui.builderHistory && ui.builderHistory.length) {
    const snap = ui.builderHistory.pop();
    ui.builder = restoreBuilder(snap);
    ui.builderPins = ui.builder.pins;
    ui.builderRoute = null;
    renderBuilder();
    return;
  }
  ui.builder = undoPin(activeBuilder());
  ui.builderPins = ui.builder.pins;
  ui.builderRoute = null;
  renderBuilder();
}

function currentPathMode() {
  return normalizePathMode(ui.pathMode || (state.settings && state.settings.lastPathMode) || "on");
}

function setCurrentPathMode(mode, { persistChoice = true } = {}) {
  const next = normalizePathMode(mode);
  ui.pathMode = next;
  if (persistChoice) {
    state.settings.lastPathMode = next;
    persist();
  }
  paintPathModeButton();
}

function paintPathModeButton() {
  const btn = $("btn-path-mode");
  if (!btn) return;
  const off = isOffPathMode(currentPathMode());
  btn.textContent = off ? "Off path" : "On path";
  btn.setAttribute("aria-label", btn.textContent);
  btn.setAttribute("aria-pressed", off ? "true" : "false");
  btn.classList.toggle("off-path", off);
  btn.classList.toggle("on-path", !off);
}

function hidePathModeExplainer({ seen = false } = {}) {
  const coach = $("path-mode-coach");
  const btn = $("btn-path-mode");
  if (coach) coach.hidden = true;
  if (btn) btn.classList.remove("path-mode-pulse");
  if (seen) markPathModeExplainerSeen();
}

function maybeShowPathModeExplainer({ force = false } = {}) {
  if (!force && isPathModeExplainerSeen()) {
    hidePathModeExplainer();
    return;
  }
  const copy = $("path-mode-coach-copy");
  if (copy) copy.textContent = PATH_MODE_EXPLAINER_BODY;
  const coach = $("path-mode-coach");
  const btn = $("btn-path-mode");
  if (coach) coach.hidden = false;
  if (btn) btn.classList.add("path-mode-pulse");
}

function cyclePinPathMode(index) {
  const st = activeBuilder();
  const pin = st.pins[index];
  if (!pin) return;
  const next = isOffPathMode(pin.pathMode) ? "on" : "off";
  applyBuilderChange((s) => setPinPathMode(s, index, next));
}

function maybeShowBuilderExplainer({ force = false } = {}) {
  if (!force && isExplainerSeen()) return;
  if ($("builder-help-title")) $("builder-help-title").textContent = EXPLAINER_TITLE;
  if ($("builder-help-copy")) $("builder-help-copy").textContent = EXPLAINER_BODY;
  openSheet("sheet-builder-help");
}

const LOADING_PATHS = "Loading paths…";

let builderGraphToken = 0;

/* heldpath-hook: bike — builder and saved courses use the bike graph on a ride. */
function rideMode() {
  return normalizeSport(ui.startType) === "ride";
}
async function ensureSportGraph(points, opts = {}) {
  if (rideMode()) {
    const bike = await ensureBikeGraph(points, opts);
    if (bike) return bike;
  }
  return ensureWalkGraph(points, opts);
}
async function ensureSportLoopGraph(center, meters, opts = {}) {
  if (rideMode()) {
    const bike = await ensureBikeLoopGraph(center, meters, opts);
    if (bike) return bike;
  }
  return ensureLoopGraph(center, meters, opts);
}
function maybeEnsureBuilderGraph(pins) {
  if (!pins || pins.length < 1) return;
  if (ui.lockWalkGraph) return;
  const current = getActiveGraph();
  if (current && graphCoversPoints(current, pins)) return;
  const token = ++builderGraphToken;
  ui.findingPaths = true;
  const note = $("route-fallback-note");
  if (note) {
    note.hidden = false;
    note.classList.add("finding");
    note.textContent = LOADING_PATHS;
  }
  ensureSportGraph(pins, {
    lockWalkGraph: !!ui.lockWalkGraph,
    onStatus: () => {},
  }).then(() => {
    if (token !== builderGraphToken) return;
    ui.findingPaths = false;
    if (ui.screen === "builder") renderBuilder();
  }).catch(() => {
    if (token !== builderGraphToken) return;
    ui.findingPaths = false;
    if (ui.screen === "builder") renderBuilder();
  });
}

async function waitBuilderRouted(ms = 20000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const routed = ui.builderRoute;
    const ready = !ui.findingPaths && routed && Array.isArray(routed.legs)
      && routed.legs.some((l) => l.mode === "routed" || l.mode === "straight" || l.reason === "open-area" || l.reason === "detour" || l.reason === "off-path");
    if (ready) return true;
    const failed = !ui.findingPaths && routed && routed.legs
      && routed.legs.every((l) => l.mode === "unroutable");
    if (failed && Date.now() - start > 1500) return false;
    await new Promise((r) => setTimeout(r, 200));
  }
  return !!(ui.builderRoute && ui.builderRoute.legs && ui.builderRoute.legs.some((l) => l.mode === "routed" || l.mode === "straight"));
}

async function ensureCoursePath(course) {
  if (!course || !course.pins || course.pins.length < 2) return course;
  if (course.path && course.path.length >= 2 && !course.straightLine) return course;
  try {
    const g = await ensureSportGraph(course.pins);
    const routed = routeCourse(g, ingestPins(course.pins), {
      straightOverrides: course.straightOverrides,
    });
    if (routed && routed.path && routed.path.length >= 2 && !routed.unroutable) {
      course.path = routed.path;
      course.legs = routed.legs;
      course.straightLine = false;
      course.usedStraight = !!routed.usedStraight;
      persist();
    }
  } catch { /* leave unrepaired; never invent a silent straight path */ }
  return course;
}

function resetBuilderRoutingFlags() {
  ui.straightOverrides = new Set();
  ui.lockWalkGraph = false;
  ui.findingPaths = false;
  ui.builderRoute = null;
  ui.builderHistory = [];
}

function useAnyway(key) {
  if (!key) return;
  if (!ui.straightOverrides) ui.straightOverrides = new Set();
  ui.straightOverrides.add(key);
  ui.builderRoute = null;
  renderBuilder();
}

function paintBuilderLine(routed, st) {
  if (routed && Array.isArray(routed.legs) && routed.legs.length) {
    routed.legs.forEach((leg, i) => {
      const pts = leg.points || [];
      if (pts.length < 2) return;
      let color = ON_PATH_COLOR;
      let dash = false;
      let width = 5;
      if (leg.mode === "unroutable") {
        color = "#E24B4A";
        dash = true;
        width = 5;
      } else if (leg.mode === "straight" || isOffPathMode(leg.pathMode) || leg.reason === "off-path") {
        color = OFF_PATH_COLOR;
        dash = false;
        width = 5;
      } else if (leg.offMap) {
        color = OFF_PATH_COLOR;
        dash = false;
        width = 5;
      }
      map.drawRoute(pts, { id: "build-line-" + i, color, width, dash });
    });
    return;
  }
  const line = routed && routed.path && routed.path.length >= 2 ? routed.path : routeStops(st);
  if (line.length >= 2) map.drawRoute(line, { id: "build-line" });
}

function midPathPoint(points) {
  if (!points || points.length < 2) return null;
  const total = pathLengthMeters(points);
  if (!(total > 0)) return { lat: points[0].lat, lon: points[0].lon };
  return pointAlongPath(points, total / 2);
}

function paintBuilderLegLabels(routed) {
  if (typeof map.clearLegLabels === "function") map.clearLegLabels();
  const legs = routed && routed.legs;
  if (!legs || !legs.length) return;
  const st = activeBuilder();
  const stops = routeStops(st);
  legs.forEach((leg, i) => {
    const mid = midPathPoint(leg.points || []);
    if (!mid) return;
    const meters = leg.mode === "unroutable" ? (leg.straightMeters || 0) : leg.meters;
    if (!(meters > 0)) return;
    const dest = stops[i + 1];
    map.addLegLabel(mid, formatDistance(meters, units()), {
      muted: leg.mode === "unroutable",
      onClick: dest ? (ev) => {
        if (ev && ev.stopPropagation) ev.stopPropagation();
        cyclePinPathMode(dest.index);
      } : null,
    });
  });
  if (typeof map.resolveLegLabelCollisions === "function") map.resolveLegLabelCollisions();
}

function paintBuilderLiveBar(routed, st) {
  const bar = $("builder-live-bar");
  const distEl = $("builder-live-distance");
  const etaEl = $("builder-live-eta");
  const pins = (st && st.pins) || [];
  if (!bar) return;
  if (pins.length < 2 || !routed) {
    bar.hidden = true;
    if (distEl) distEl.textContent = "—";
    if (etaEl) etaEl.textContent = "";
    return;
  }
  bar.hidden = false;
  const total = routed.meters || 0;
  if (distEl) distEl.textContent = formatDistance(total, units());
  const walkEta = formatEta(etaSeconds(total, activityMph("walk")));
  const runEta = formatEta(etaSeconds(total, activityMph("run")));
  if (etaEl) etaEl.textContent = walkEta + " walk · " + runEta + " run";
}

function legLineColor(leg) {
  if (!leg) return ON_PATH_COLOR;
  if (leg.mode === "unroutable") return "#E24B4A";
  if (leg.mode === "straight" || isOffPathMode(leg.pathMode) || leg.reason === "off-path" || leg.offMap) {
    return OFF_PATH_COLOR;
  }
  return ON_PATH_COLOR;
}

function paintCourseLegs(legs, fallback, { id = "course-line", width = 5 } = {}) {
  if (legs && legs.length) {
    legs.forEach((leg, i) => {
      const pts = leg.points || [];
      if (pts.length < 2) return;
      map.drawRoute(pts, { id: id + "-" + i, color: legLineColor(leg), width, dash: leg.mode === "unroutable" });
    });
    return;
  }
  if (fallback && fallback.length >= 2) map.drawRoute(fallback, { id, color: ON_PATH_COLOR, width });
}

function legFlagText(leg) {
  if (leg.mode === "unroutable") return " · no walkable path";
  if (leg.longDetour) return " · path is much longer";
  if (leg.reason === "off-path" || isOffPathMode(leg.pathMode)) return " · off path";
  if (leg.offMap) return " · off path";
  if (leg.mode === "straight") return " · off path";
  return "";
}


function firstHintableLeg(routed) {
  const legs = (routed && routed.legs) || [];
  const i = legs.findIndex((l) => l && (l.mode === "unroutable" || l.longDetour));
  if (i < 0) return null;
  return { leg: legs[i], i };
}

function destPinIndexForLeg(st, legIndex) {
  const stops = routeStops(st || activeBuilder());
  const dest = stops[legIndex + 1];
  return dest && dest.index != null ? dest.index : null;
}

function paintRouteHint(routed, st, waiting) {
  const wrap = $("route-detour-hint");
  const note = $("route-fallback-note");
  const btn = $("btn-switch-pin-green");
  if (note) note.classList.remove("finding");
  ui.hintDestPinIndex = null;
  if (!wrap || !note) return;
  if (waiting) {
    wrap.hidden = false;
    note.hidden = false;
    note.classList.add("finding");
    note.textContent = LOADING_PATHS;
    if (btn) btn.hidden = true;
    return;
  }
  const hit = firstHintableLeg(routed);
  if (!hit) {
    wrap.hidden = true;
    note.hidden = true;
    note.textContent = "";
    if (btn) btn.hidden = true;
    return;
  }
  const destIndex = destPinIndexForLeg(st, hit.i);
  ui.hintDestPinIndex = destIndex;
  wrap.hidden = false;
  note.hidden = false;
  note.textContent = hit.leg.mode === "unroutable" ? UNROUTABLE_SWITCH_HINT : LONG_DETOUR_HINT;
  if (btn) btn.hidden = destIndex == null;
}

function switchHintPinToGreen() {
  const i = ui.hintDestPinIndex;
  if (i == null) return;
  applyBuilderChange((s) => setPinPathMode(s, i, "off"));
}

function renderBuilder() {
  applyBuilderSheet();
  paintPathModeButton();
  const st = activeBuilder();
  const pins = st.pins || [];
  maybeEnsureBuilderGraph(pins);
  const hint = $("builder-hint");
  if (hint) {
    hint.textContent = builderHint(st);
    hint.hidden = true;
  }
  paintEndPointButton();
  const box = $("builder-legs");
  const note = $("route-fallback-note");
  const waiting = !!ui.findingPaths;
  let routed = null;
  if (waiting) {
    // Do not route (or draw a straight/unroutable stand-in) while the
    // walk graph is still loading.
    ui.builderRoute = null;
  } else if (pins.length >= 2) {
    routed = builderRoute();
  } else {
    ui.builderRoute = null;
  }
  const warnings = $("route-warnings");
  if (note) note.classList.remove("finding");
  paintRouteHint(routed, st, waiting);
  if (warnings) {
    warnings.innerHTML = "";
    warnings.hidden = true;
  }
  paintBuilderLiveBar(routed, st);
  if (box) {
    box.innerHTML = "";
    const toggle = $("btn-legs-toggle");
    if (waiting && pins.length >= 2) {
      if (toggle) toggle.hidden = true;
      box.classList.remove("is-collapsed");
      box.innerHTML = `<p class="tiny">${LOADING_PATHS}</p>`;
    } else if (pins.length < 2 || !routed || !routed.legs || !routed.legs.length) {
      if (toggle) toggle.hidden = true;
      box.classList.remove("is-collapsed");
      box.innerHTML = `<p class="tiny">Leg distances will show here after the second pin.</p>`;
    } else {
      if (toggle) {
        toggle.hidden = false;
        toggle.setAttribute("aria-expanded", ui.legsOpen === false ? "false" : "true");
        const n = routed.legs.length;
        toggle.textContent = n === 1 ? "1 leg" : n + " legs";
      }
      box.classList.toggle("is-collapsed", ui.legsOpen === false);
      const labels = legLabels(st);
      routed.legs.forEach((leg, i) => {
        const names = labels[i] || { from: `Pin ${i + 1}`, to: `Pin ${i + 2}` };
        const flag = legFlagText(leg);
        const ret = names.returnLeg ? " · return" : "";
        const row = document.createElement("div");
        row.className = "leg-row";
        if (leg.mode === "unroutable") row.classList.add("unroutable");
        if (leg.offMap) row.classList.add("off-map");
        if (leg.longDetour) row.classList.add("long-detour");
        if (leg.reason === "off-path" || isOffPathMode(leg.pathMode) || (leg.mode === "straight" && leg.reason !== "open-area")) row.classList.add("off-path");
        const shown = leg.mode === "unroutable" ? (leg.straightMeters || 0) : leg.meters;
        const dist = leg.mode === "unroutable"
          ? formatDistance(shown, units()) + " (not counted)"
          : formatDistance(leg.meters, units());
        row.innerHTML = `<span>${escapeHtml(names.from)} → ${escapeHtml(names.to)}<span class="leg-flag">${flag}</span>${ret}</span><span>${dist}</span>`;
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
      if (st.endIndex == null) {
        const needEnd = document.createElement("p");
        needEnd.className = "tiny";
        needEnd.dataset.testid = "builder-need-end";
        needEnd.textContent = "Turn on End point pin, or tap a pin and choose Set as end, to finish the route.";
        box.appendChild(needEnd);
      }
    }
  }
  if ($("btn-save-course")) $("btn-save-course").disabled = !canSave(st);
  map.clearOverlays();
  map.clearMarkers();
  if (!waiting) {
    paintBuilderLine(routed, st);
    paintBuilderLegLabels(routed);
  }
  addCoursePins(pins, { builderState: st, clickable: true });
  const line = routed && routed.path && routed.path.length >= 2 ? routed.path : routeStops(st);
  if (!waiting) refreshBuilderElevation(line, { countedMeters: routed ? routed.meters : undefined });
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
  if (course && course.pins && course.pins.length >= 2 && !(course.path && course.path.length >= 2)) {
    ensureCoursePath(course).then((updated) => {
      if (ui.courseId === course.id && updated && updated.path && $("course-sub")) {
        const len2 = courseMeters(updated);
        $("course-sub").textContent = `${formatDistance(len2, units())} · ${formatEta(etaSeconds(len2, 3))} walk · ${formatEta(etaSeconds(len2, 6))} run`;
        renderCourses();
      }
    });
  }
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
    /* heldpath-hook: routes-heatmap */
    hillPace: !!state.settings.hillPace,
    /* heldpath-hook: goals-plans */
    sport: ui.calSport || "all",
    onSport: (s) => {
      ui.calSport = s === "ride" || s === "run" || s === "walk" ? s : "all";
      renderCalendar();
    },
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
          path: p.routePath || (c && c.path) || null,
        };
        startTracking(p.activityType, course, p);
      } else if (c) {
        startTracking(p.activityType, c, p);
      }
    },
    onOpenGroup: (id) => openGroupEvent(id),
    onOpenPlanRoute: (id) => openPlanRoute(id, { from: "calendar" }),
    onSchedule: () => openSessionChoice(),
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

function selectedDayLabel() {
  return new Date(ui.selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function openSessionChoice() {
  const sub = $("session-choice-sub");
  if (sub) sub.textContent = `For ${selectedDayLabel()}.`;
  const hasRoutes = (state.courses || []).some((c) => c && c.pins && c.pins.length >= 2);
  const empty = $("session-choice-empty");
  if (empty) empty.hidden = hasRoutes;
  const useBtn = $("btn-session-use-route");
  if (useBtn) useBtn.disabled = !hasRoutes;
  openSheet("sheet-session-choice");
}

function beginBuilderForSchedule() {
  ui.returnToSchedule = { day: ui.selectedDay };
  closeSheet("sheet-session-choice");
  closeSheet("sheet-schedule");
  beginBuilder();
}

function estimateSessionSec(meters, type) {
  const pace = recentAveragePaceSecPerMeter(state.activities || [], { type });
  if (pace && pace > 0 && Number(meters) > 0) return Number(meters) * pace;
  return etaSeconds(meters, activityMph(type));
}

function courseForGroupPlan(plan) {
  if (!plan) return null;
  const existing = plan.courseId ? courseById(plan.courseId) : null;
  if (existing && existing.pins && existing.pins.length >= 2) return existing;
  const run = (state.groupRuns || []).find((g) => g.id === plan.groupRunId);
  if (run && run.shareUrl) {
    const dec = decodeShare(run.shareUrl);
    if (dec && dec.ok && dec.course && dec.course.pins && dec.course.pins.length >= 2) {
      return { ...dec.course, id: null, name: dec.course.name || run.courseName || plan.courseName };
    }
  }
  if (plan.routePins && plan.routePins.length >= 2) {
    return { id: plan.courseId || null, name: plan.courseName, pins: plan.routePins, path: plan.routePath || null };
  }
  return existing || null;
}

function saveGroupCourseTemplate(course, noteEl) {
  if (!course || !course.pins || course.pins.length < 2) {
    if (noteEl) noteEl.textContent = "This event has no route to save.";
    return false;
  }
  if (course.id && courseById(course.id)) {
    if (noteEl) noteEl.textContent = "This route is already in your routes.";
    return false;
  }
  const copy = newCourse({
    name: course.name || "Shared route",
    pins: course.pins.map((p) => ({ lat: p.lat, lon: p.lon, role: p.role })),
    path: course.path && course.path.length >= 2 ? course.path.map((p) => ({ lat: p.lat, lon: p.lon })) : null,
  });
  state.courses.push(copy);
  persist();
  if (noteEl) noteEl.textContent = "Saved to your routes. Only the route template was copied — no one else's runs.";
  return true;
}

function openGroupEvent(planOrId) {
  const plan = typeof planOrId === "string"
    ? (state.plans || []).find((p) => p.id === planOrId)
    : planOrId;
  if (!plan) return;
  ui.pendingGroupPlan = plan;
  const run = (state.groupRuns || []).find((g) => g.id === plan.groupRunId);
  const titleEl = $("group-event-title");
  if (titleEl) titleEl.textContent = (run && run.title) || plan.courseName || "Group event";
  const whenEl = $("group-event-when");
  if (whenEl) whenEl.textContent = formatWhen(plan.startAt || (run && run.startAt)) || selectedDayLabel();
  const course = courseForGroupPlan(plan);
  const courseEl = $("group-event-course");
  if (courseEl) courseEl.textContent = course ? course.name : (plan.courseName || "Route unavailable");
  const note = $("group-event-note");
  if (note) note.textContent = "";
  const openBtn = $("btn-group-open-route");
  if (openBtn) openBtn.disabled = !(course && course.pins && course.pins.length >= 2);
  openSheet("sheet-group-event");
}

function openGroupRoute() {
  const plan = ui.pendingGroupPlan;
  const course = courseForGroupPlan(plan);
  if (!course || !course.pins || course.pins.length < 2) {
    const note = $("group-event-note");
    if (note) note.textContent = "This event has no route to open.";
    return;
  }
  ui.pendingGroupCourse = course;
  closeSheet("sheet-group-event");
  setTab("today");
  showScreen("today");
  if ($("today-dock")) $("today-dock").hidden = true;
  map.clearOverlays();
  map.clearMarkers();
  const line = (course.path && course.path.length >= 2) ? course.path : course.pins;
  if (line.length >= 2) paintCourseLegs(course.legs, line, { id: "course-line", width: 5 });
  addCoursePins(course.pins);
  const pad = { top: 56, bottom: 360, left: 48, right: 48 };
  map.whenReady(() => map.fitBounds(line, pad));
  map.fitBounds(line, pad);
  const meters = courseMeters(course);
  const type = (plan && plan.activityType) || "walk";
  const usedRecent = !!recentAveragePaceSecPerMeter(state.activities || [], { type });
  const dur = estimateSessionSec(meters, type);
  const startAt = plan && (plan.startAt || ((state.groupRuns || []).find((g) => g.id === plan.groupRunId) || {}).startAt);
  let finish = formatEta(dur);
  if (startAt) {
    const clock = new Date(new Date(startAt).getTime() + dur * 1000);
    if (!Number.isNaN(clock.getTime())) {
      finish = `${formatEta(dur)} · finish around ${clock.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
    }
  }
  if ($("group-route-title")) $("group-route-title").textContent = course.name || "Route";
  if ($("group-route-stats")) $("group-route-stats").textContent = `${formatDistance(meters, units())} · ${finish}`;
  if ($("group-route-pace-note")) {
    $("group-route-pace-note").textContent = usedRecent
      ? "Estimated finish uses your recent pace."
      : "Estimated finish uses the default walk or run pace.";
  }
  if ($("group-route-note")) $("group-route-note").textContent = "";
  openSheet("sheet-group-route");
}

function closeGroupRouteView() {
  closeSheet("sheet-group-route");
  if ($("today-dock")) $("today-dock").hidden = false;
  try { map.clearOverlays(); map.clearMarkers(); } catch { /* ignore */ }
  setTab("calendar");
  if (ui.pendingGroupPlan) openGroupEvent(ui.pendingGroupPlan);
}

function courseForPlanSession(plan) {
  if (!plan) return null;
  const existing = plan.courseId ? courseById(plan.courseId) : null;
  if (existing && existing.pins && existing.pins.length >= 2) {
    return existing.path ? existing : { ...existing, path: plan.routePath || existing.path || null };
  }
  if (plan.routePins && plan.routePins.length >= 2) {
    return { id: plan.courseId || null, name: plan.courseName || "Plan loop", pins: plan.routePins, path: plan.routePath || null };
  }
  if (plan.route && plan.route.pins && plan.route.pins.length >= 2) {
    return { id: plan.route.courseId || null, name: plan.title || plan.courseName || "Plan loop", pins: plan.route.pins, path: plan.route.path || null };
  }
  return existing || null;
}

function showMapBanner(text) {
  const banner = $("map-banner");
  const copy = String(text || "");
  ui.keepMapBanner = !!copy;
  if (!banner) return;
  banner.hidden = !copy;
  banner.textContent = copy;
}

function openPlanRoute(planOrId, { from = "calendar" } = {}) {
  const plan = typeof planOrId === "string"
    ? (state.plans || []).find((p) => p.id === planOrId)
    : planOrId;
  const course = courseForPlanSession(plan);
  if (!course || !course.pins || course.pins.length < 2) {
    const note = $("plan-create-note");
    if (note) note.textContent = AUTO_LOOP_FAIL_COPY;
    return;
  }
  ui.pendingPlanRoute = { plan, course, from };
  closeSheet("sheet-plan-route");
  setTab("today");
  showScreen("today");
  if ($("today-dock")) $("today-dock").hidden = true;
  map.clearOverlays();
  map.clearMarkers();
  const line = (course.path && course.path.length >= 2) ? course.path : course.pins;
  if (line.length >= 2) paintCourseLegs(course.legs, line, { id: "course-line", width: 5 });
  addCoursePins(course.pins);
  const pad = { top: 56, bottom: 360, left: 48, right: 48 };
  map.whenReady(() => map.fitBounds(line, pad));
  map.fitBounds(line, pad);
  const meters = courseMeters(course);
  const type = (plan && plan.activityType) || "walk";
  const usedRecent = !!recentAveragePaceSecPerMeter(state.activities || [], { type });
  const dur = estimateSessionSec(meters, type);
  if ($("plan-route-title")) $("plan-route-title").textContent = course.name || "Plan loop";
  if ($("plan-route-stats")) $("plan-route-stats").textContent = `${formatDistance(meters, units())} · ${formatEta(dur)}`;
  if ($("plan-route-pace-note")) {
    $("plan-route-pace-note").textContent = usedRecent
      ? "Estimated finish uses your recent pace."
      : "Estimated finish uses the default walk or run pace.";
  }
  if ($("plan-route-note")) $("plan-route-note").textContent = "";
  const startBtn = $("btn-plan-route-start");
  if (startBtn) startBtn.hidden = false;
  openSheet("sheet-plan-route");
}

function closePlanRouteView() {
  closeSheet("sheet-plan-route");
  if ($("today-dock")) $("today-dock").hidden = false;
  try { map.clearOverlays(); map.clearMarkers(); } catch { /* ignore */ }
  const from = ui.pendingPlanRoute && ui.pendingPlanRoute.from;
  if (from === "plans") setTab("plans");
  else setTab("calendar");
}

function startPendingPlanRoute() {
  const pending = ui.pendingPlanRoute;
  if (!pending || !pending.course) return;
  closeSheet("sheet-plan-route");
  if ($("today-dock")) $("today-dock").hidden = false;
  const plan = pending.plan || {};
  startTracking(plan.activityType || "walk", pending.course, plan);
}

function pickLoopStartOnMap() {
  return new Promise((resolve) => {
    if (ui.offPickLoop) {
      try { ui.offPickLoop(); } catch { /* ignore */ }
      ui.offPickLoop = null;
    }
    setTab("today");
    showScreen("today");
    showMapBanner("Tap the map to set the start of your loop");
    ui.offPickLoop = map.onMapClick((pt) => {
      if (ui.offPickLoop) {
        try { ui.offPickLoop(); } catch { /* ignore */ }
        ui.offPickLoop = null;
      }
      showMapBanner("");
      const fix = { lat: pt.lat, lon: pt.lon, accuracy: 25, at: Date.now() };
      state.settings.lastKnown = fix;
      persist();
      try { map.setUserDot(fix); } catch { /* ignore */ }
      resolve({ lat: pt.lat, lon: pt.lon });
    });
  });
}

async function resolveLoopCenter({ onNeedTap } = {}) {
  const known = normalizeFix(state.settings.lastKnown);
  if (known) return { lat: known.lat, lon: known.lon };
  try {
    const disc = await ensureLocationDisclosure();
    if (disc && disc.allowed) {
      const res = await (disc.locatePromise || requestPosition());
      applyLocateResult(res, { animate: true });
      if (res && res.ok && res.fix) return { lat: res.fix.lat, lon: res.fix.lon };
    }
  } catch { /* permission denied or unavailable */ }
  if (typeof onNeedTap === "function") onNeedTap();
  return pickLoopStartOnMap();
}

function openSchedule(opt = {}) {
  if (!state.courses.length) {
    openSessionChoice();
    return;
  }
  $("sched-sub").textContent = `For ${selectedDayLabel()}.`;
  const schedNote = $("sched-conflict");
  if (schedNote) {
    const copy = conflictCopy(plansOnDate(state.plans, ui.selectedDay));
    schedNote.hidden = !copy;
    schedNote.textContent = copy;
  }
  const sel = $("sched-course");
  sel.innerHTML = state.courses.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  if (opt.courseId && state.courses.some((c) => c.id === opt.courseId)) sel.value = opt.courseId;
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
    parts.push(`<p class="tiny" data-testid="goals-empty">No goals yet. Tap New goal above — it is free, with a ring here and a chart on Progress.</p>`);
  }
  for (const g of items) {
    const period = goalPeriod(g);
    const title = g.name || defaultGoalName(g);
    parts.push(`<div class="goal-card" data-testid="goal-card" data-goal-id="${escapeHtml(g.id)}">`);
    parts.push(`<h3>${escapeHtml(title)}</h3>`);
    const prog = period
      ? periodGoalProgress(g, acts, { locale, units: units() })
      : oneShotGoalProgress(g, acts, { units: units() });
    if (prog) parts.push(periodRingMarkup(prog, { testid: period ? "period-ring" : "goal-ring" }));
    const gap = freeGoalGap(g, acts, { locale, units: units() });
    if (gap) parts.push(freeGoalGapMarkup(gap, { testid: "goal-gap" }));
    parts.push(`<p class="tiny">Always free. Your progress stays on this phone.</p>`);
    parts.push(`<button class="btn btn-secondary btn-goal-remove" data-id="${escapeHtml(g.id)}" style="width:100%;margin-top:8px">Remove</button>`);
    parts.push(`</div>`);
  }
  root.innerHTML = parts.join("");
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

function defaultGoalName(g) {
  const period = goalPeriod(g);
  if (period) return `${period === "week" ? "Weekly" : "Monthly"} ${periodGoalTitle(g)}`;
  if (g.kind === "route-time") {
    const c = (state.courses || []).find((x) => x.id === g.courseId);
    const time = g.finishSec ? formatDuration(g.finishSec) : "";
    return (c && c.name ? c.name : "Route") + (time ? " in " + time : "");
  }
  if (g.kind === "time-distance" || (g.distanceMeters > 0 && g.finishSec > 0)) {
    return formatDistance(g.distanceMeters, units()) + " in " + formatDuration(g.finishSec);
  }
  if (g.kind === "distance" && g.distanceMeters > 0) return formatDistance(g.distanceMeters, units());
  return g.kind || "Goal";
}

function paintGoalTypeFields() {
  const kind = ($("goal-new-kind") && $("goal-new-kind").value) || "time-distance";
  const showDistance = kind === "time-distance" || kind === "distance" || kind.endsWith("-distance");
  const showTime = kind === "time-distance" || kind === "route-time";
  const showCount = kind.endsWith("-count");
  const showCourse = kind === "route-time";
  if ($("goal-field-distance")) $("goal-field-distance").hidden = !showDistance;
  if ($("goal-field-time")) $("goal-field-time").hidden = !showTime;
  if ($("goal-field-count")) $("goal-field-count").hidden = !showCount;
  if ($("goal-field-course")) $("goal-field-course").hidden = !showCourse;
  const distLabel = $("goal-new-distance-label");
  if (distLabel) {
    distLabel.textContent = units() === "km" ? "Distance (km)" : "Distance (mi)";
  }
  const timeLabel = $("goal-new-time-label");
  if (timeLabel) timeLabel.textContent = "Time";
  fillGoalCourseSelect();
}

function fillGoalCourseSelect() {
  const sel = $("goal-new-course");
  const empty = $("goal-new-course-empty");
  if (!sel) return;
  const courses = state.courses || [];
  const prev = sel.value;
  sel.innerHTML = "";
  if (!courses.length) {
    const o = document.createElement("option");
    o.value = "";
    o.textContent = "No saved routes";
    sel.appendChild(o);
    sel.disabled = true;
    if (empty) empty.hidden = false;
    return;
  }
  sel.disabled = false;
  if (empty) empty.hidden = true;
  courses.forEach((c) => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.name || "Course";
    sel.appendChild(o);
  });
  if (prev && courses.some((c) => c.id === prev)) sel.value = prev;
}

function openNewGoalSheet() {
  showScreen("goals");
  renderGoalsScreen();
  if ($("goal-new-kind")) $("goal-new-kind").value = "time-distance";
  if ($("goal-new-distance")) $("goal-new-distance").value = units() === "km" ? "5" : "3";
  if ($("goal-new-time")) $("goal-new-time").value = "18:00";
  if ($("goal-new-count")) $("goal-new-count").value = "3";
  const err = $("goal-new-error");
  if (err) { err.hidden = true; err.textContent = ""; }
  paintGoalTypeFields();
  openSheet("sheet-new-goal");
}

function showGoalFormError(msg) {
  const err = $("goal-new-error");
  if (!err) return;
  err.hidden = !msg;
  err.textContent = msg || "";
}

function addGoalFromForm() {
  showGoalFormError("");
  const kind = (($("goal-new-kind") && $("goal-new-kind").value) || "time-distance");
  if (kind === "week-time" || kind === "month-time") {
    showGoalFormError("A time goal is a target time for a set distance, tracked run over run. Weekly or monthly time totals are not used.");
    return;
  }
  const period = kind.startsWith("week") ? "week" : kind.startsWith("month") ? "month" : null;
  const g = newGoal({ kind, period, paid: false });
  if (kind === "route-time") {
    const courseId = $("goal-new-course") && $("goal-new-course").value;
    const course = (state.courses || []).find((c) => c.id === courseId);
    if (!course) {
      showGoalFormError("Save a course first, then you can set a goal time on it.");
      return;
    }
    const dur = parseDurationInput($("goal-new-time") && $("goal-new-time").value);
    if (!dur.ok) { showGoalFormError(dur.reason || "Enter a time."); return; }
    g.courseId = course.id;
    g.finishSec = dur.seconds;
    g.name = defaultGoalName(g);
  } else if (kind === "time-distance") {
    const dist = parseDistanceInput($("goal-new-distance") && $("goal-new-distance").value, units());
    if (!dist.ok) { showGoalFormError(dist.reason || "Enter a distance."); return; }
    const dur = parseDurationInput($("goal-new-time") && $("goal-new-time").value);
    if (!dur.ok) { showGoalFormError(dur.reason || "Enter a time."); return; }
    g.distanceMeters = dist.meters;
    g.finishSec = dur.seconds;
    g.name = defaultGoalName(g);
  } else if (kind.endsWith("-count")) {
    const raw = Number($("goal-new-count") && $("goal-new-count").value);
    if (!(raw > 0)) { showGoalFormError("Enter how many walks or runs."); return; }
    g.targetCount = Math.round(raw);
    g.name = defaultGoalName(g);
  } else {
    const dist = parseDistanceInput($("goal-new-distance") && $("goal-new-distance").value, units());
    if (!dist.ok) { showGoalFormError(dist.reason || "Enter a distance."); return; }
    g.distanceMeters = dist.meters;
    g.name = defaultGoalName(g);
  }
  state.goals = state.goals || [];
  state.goals.push(g);
  persist();
  closeSheet("sheet-new-goal");
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

/* heldpath-hook: routes-heatmap */
function insightsFiltered() {
  return filterHeatmapActivities(state.activities, {
    sport: ui.insightsSport,
    range: ui.insightsRange,
  });
}

function paintInsightsMap() {
  try {
    const instance = map.getMap && map.getMap();
    if (!instance) return;
    const fc = renderHeatmap(instance, insightsFiltered(), {
      sport: ui.insightsSport,
      range: ui.insightsRange,
    });
    const bounds = heatmapBounds(fc);
    if (bounds) {
      map.fitBounds([
        { lat: bounds.minLat, lon: bounds.minLon },
        { lat: bounds.maxLat, lon: bounds.maxLon },
      ], 64);
    }
  } catch { /* map may not be ready */ }
}

function insightTrendMarkup(group) {
  const series = trendSeries(group, { units: units() });
  const rows = series.points.slice().reverse().map((p) => {
    const activity = (state.activities || []).find((a) => a.id === p.activityId);
    const when = new Date(p.at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const value = series.metric === "speed"
      ? `${p.speedPerHour.toFixed(1)} km/h`
      : formatPace(p.meters, p.durationSec, units());
    const hill = activity && state.settings.hillPace
      ? hillPaceForActivity(activity, { units: units(), enabled: true })
      : null;
    const hillText = hill ? `<p class="tiny">${escapeHtml(hillPaceLine(hill, units()))}</p>` : "";
    return `<div class="insights-trend-row"><span>${escapeHtml(when)} · ${escapeHtml(formatDistance(p.meters, units(), { digits: 1 }))}</span><span>${escapeHtml(value)}</span></div>${hillText}`;
  }).join("");
  return `<div class="insights-trend">
    <p class="tiny" style="margin-bottom:6px">${escapeHtml(trendLabel(series))} · ${escapeHtml(matchSportLabel(group.sport))} · ${escapeHtml(sportOfActivity(group))}</p>
    ${rows}
  </div>`;
}

function sportOfActivity(group) {
  return group.count === 1 ? "1 effort" : `${group.count} efforts`;
}

function insightsLoopsMarkup(groups) {
  if (!groups.length) {
    return `<p class="tiny">Finish the same loop twice and it appears here with a pace trend. Loops stay private to this phone.</p>`;
  }
  let html = "";
  for (const group of groups) {
    const open = ui.insightsGroupId === group.id;
    html += `<button class="list-item insights-loop-row" data-loop="${escapeHtml(group.id)}" aria-expanded="${open ? "true" : "false"}">
      <div class="grow"><h3>${escapeHtml(group.name)}</h3><p>${escapeHtml(formatTrend(group, { units: units() }))}</p></div>
      <div class="meta">${open ? "Hide" : "Trend"}</div>
    </button>`;
    if (open) html += insightTrendMarkup(group);
  }
  return html;
}

function insightsSuggestionMarkup() {
  const s = ui.insightsSuggestion;
  if (!s) return "";
  const meta = ui.insightsSuggestionMeta || {};
  const preview = s.preview || suggestionPreview(s, { profile: meta.profile, units: units() });
  const climb = preview.climbKnown === false && !(preview.climbM > 0)
    ? "Climb not sampled"
    : `Climb ${formatGain(preview.climbM, units())}`;
  const known = Math.round((preview.knownRatio || 0) * 100);
  return `<div class="insights-suggest-card" data-testid="insights-suggestion">
    <h3>${escapeHtml(suggestionName(s, units()))}</h3>
    <p class="tiny">${escapeHtml(suggestionReason(s, meta.profile, meta.goal))}</p>
    <div class="insights-suggest-stats">
      <span><strong>${escapeHtml(formatDistance(preview.meters, units()))}</strong> distance</span>
      <span>${escapeHtml(climb)}</span>
      <span><strong>${escapeHtml(formatEta(preview.seconds))}</strong> estimate</span>
      <span>${known}% familiar ground</span>
    </div>
    <button class="btn btn-primary" id="btn-save-suggestion" data-testid="save-suggestion" style="width:100%">Save as a free course</button>
  </div>`;
}

function renderInsights() {
  document.querySelectorAll("#insights-sport button").forEach((b) => {
    b.classList.toggle("active", b.dataset.sport === ui.insightsSport);
  });
  document.querySelectorAll("#insights-range button").forEach((b) => {
    b.classList.toggle("active", b.dataset.range === ui.insightsRange);
  });
  const filtered = insightsFiltered();
  const summary = heatmapSummary(filtered, { filtered: true });
  const sportBits = [];
  if (summary.sports.walk) sportBits.push(`${summary.sports.walk} walk${summary.sports.walk === 1 ? "" : "s"}`);
  if (summary.sports.run) sportBits.push(`${summary.sports.run} run${summary.sports.run === 1 ? "" : "s"}`);
  if (summary.sports.ride) sportBits.push(`${summary.sports.ride} ride${summary.sports.ride === 1 ? "" : "s"}`);
  if ($("insights-summary")) {
    $("insights-summary").textContent = summary.activities
      ? `${formatDistance(summary.meters, units())} covered · ${sportBits.join(" · ")} · ${summary.groundCells.toLocaleString()} ground cells${summary.repeatedCells ? `, ${summary.repeatedCells.toLocaleString()} revisited` : ""}.`
      : "";
  }
  if ($("insights-empty")) {
    $("insights-empty").textContent = filtered.length ? "" : heatmapEmptyCopy();
  }
  const groups = matchedLoops(state.activities, { minCount: 2 })
    .filter((g) => ui.insightsSport === "all" || g.sport === ui.insightsSport);
  if ($("insights-loops")) $("insights-loops").innerHTML = insightsLoopsMarkup(groups);
  if ($("insights-suggest")) {
    $("insights-suggest").innerHTML = insightsSuggestionMarkup();
    const save = $("btn-save-suggestion");
    if (save) save.addEventListener("click", saveInsightsSuggestion);
  }
  if ($("insights-saved")) $("insights-saved").textContent = ui.insightsSaved || "";
  if ($("btn-suggest-loop")) $("btn-suggest-loop").disabled = !!ui.insightsBusy;
  if ($("hill-pace-note")) $("hill-pace-note").textContent = HILL_PACE_NOTE;
}

async function suggestLoop() {
  if (ui.insightsBusy) return;
  ui.insightsBusy = true;
  ui.insightsSaved = "";
  if ($("insights-suggest-note")) $("insights-suggest-note").textContent = "Reading your history and the local walk graph…";
  renderInsights();
  try {
    let graph = getActiveGraph();
    const known = normalizeFix(state.settings.lastKnown);
    const firstTrack = (state.activities || [])
      .map((a) => (a.track || [])[0])
      .find((p) => p && Number.isFinite(Number(p.lat)));
    const center = known || firstTrack || null;
    if (!graph && center) {
      try { graph = await ensureLoopGraph(center, 1600); } catch { /* no map pack */ }
    }
    const goal = (state.goals || []).find((g) => g && (Number(g.distanceMeters) > 0 || Number(g.finishSec) > 0)) || null;
    const result = generateSuggestions({
      graph,
      activities: state.activities,
      sport: ui.insightsSport,
      goal,
      count: 3,
    });
    if (!result.ok) {
      ui.insightsBusy = false;
      if ($("insights-suggest-note")) {
        $("insights-suggest-note").textContent = result.reason === "no-graph"
          ? "No local walk graph yet. Download your local map in Settings, then try again."
          : "Walk a few outings first, then Heldpath can suggest a loop from where you usually start.";
      }
      renderInsights();
      return;
    }
    const choice = result.suggestions[0];
    choice.preview = suggestionPreview(choice, { profile: result.profile, units: units() });
    ui.insightsSuggestion = choice;
    ui.insightsSuggestionMeta = { profile: result.profile, goal, targetMeters: result.targetMeters };
    ui.insightsBusy = false;
    if ($("insights-suggest-note")) {
      $("insights-suggest-note").textContent = suggestionReason(choice, result.profile, goal);
    }
    renderInsights();
    try { map.drawRoute(choice.path, { id: "insight-suggest", color: "#F3E0A8", width: 5 }); } catch { /* map may be busy */ }
    // Terrain sample is a bonus; history-based climb stays if offline.
    try {
      const { samplePathDem } = await import("./elevation_dem.js");
      const samples = await samplePathDem(choice.path, { stepM: 90 });
      const gl = gainLoss(samples);
      if (gl && Number.isFinite(gl.gainM) && gl.gainM > 0) {
        choice.climbM = gl.gainM;
        choice.preview = suggestionPreview(choice, { profile: result.profile, climbM: gl.gainM, units: units() });
        if (ui.insightsSuggestion === choice) renderInsights();
      }
    } catch { /* offline: keep the history estimate */ }
  } catch {
    ui.insightsBusy = false;
    if ($("insights-suggest-note")) $("insights-suggest-note").textContent = "Could not build a loop just now. Try again near a downloaded map.";
    renderInsights();
  }
}

function saveInsightsSuggestion() {
  const s = ui.insightsSuggestion;
  if (!s) return;
  const name = suggestionName(s, units());
  state.courses.push(newCourse({
    name,
    pins: suggestionPins(s),
    path: s.path || null,
  }));
  persist();
  ui.insightsSaved = `Saved "${name}" to Courses. It is free, like every course.`;
  ui.insightsSuggestion = null;
  ui.insightsGroupId = null;
  renderInsights();
  renderCourses();
}

function openInsights({ suggest = false } = {}) {
  ui.hideNav = false;
  showScreen("insights");
  renderInsights();
  if (suggest) setTimeout(() => { suggestLoop(); }, 60);
}
/* heldpath-hook: routes-heatmap end */

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
  /* heldpath-hook: routes-heatmap */
  if ($("hill-pace-switch")) {
    const on = !!state.settings.hillPace;
    $("hill-pace-switch").classList.toggle("on", on);
    $("hill-pace-switch").setAttribute("aria-checked", on ? "true" : "false");
  }
  if ($("hill-pace-note")) $("hill-pace-note").textContent = HILL_PACE_NOTE;
  /* heldpath-hook: routes-heatmap end */
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
  /* heldpath-hook: routes-heatmap */
  if (ui.screen === "insights") renderInsights();
  /* heldpath-hook: routes-heatmap end */
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
  const sport = normalizeSport(type); /* heldpath-hook: bike */
  ui.startType = sport;
  saveLastSport(sport);
  document.querySelectorAll("#start-sport-picker [data-sport]").forEach((b) => {
    const on = b.dataset.sport === sport;
    b.classList.toggle("active", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  $("start-sheet-title").textContent = sport === "ride" ? "Start a ride" : sport === "run" ? "Start a run" : "Start a walk";
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
      b.querySelector("p").textContent = `${formatDistance(len, units())} · ${formatEta(etaSeconds(len, activityMph(sport)))}`;
      b.querySelector(".meta").textContent = "Go";
      b.addEventListener("click", () => promptTargetThenStart(sport, c));
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
  const preview = $("target-lap-preview");
  const label = meters != null && len > 0 ? formatLapPlanLabel(len, meters, units()) : "";
  if (preview) {
    preview.textContent = label;
    preview.hidden = !label;
  }
  if (overBox) overBox.hidden = !over;
  if (startBtn) startBtn.hidden = false;
  if (hint) hint.hidden = meters != null || !!over;
  const sheet = $("sheet-target");
  if (sheet) sheet.classList.toggle("target-is-over", !!over);
}

function hideSessionDistanceExplainer() {
  const coach = $("session-distance-coach");
  const row = $("target-input-row");
  if (coach) coach.hidden = true;
  if (row) row.classList.remove("session-distance-pulse");
}

function maybeShowSessionDistanceExplainer({ force } = {}) {
  const coach = $("session-distance-coach");
  const copy = $("session-distance-coach-copy");
  const row = $("target-input-row");
  if (copy) copy.textContent = SESSION_DISTANCE_EXPLAINER_BODY;
  const show = !!force || !isSessionDistanceExplainerSeen();
  if (coach) coach.hidden = !show;
  if (row) row.classList.toggle("session-distance-pulse", !!show);
}

function promptTargetThenStart(type, course) {
  if (!course) {
    startTracking(type, null);
    return;
  }
  // Session-distance / lap picker is only for a shared start/end loop.
  // Point-to-point and an end pin elsewhere start immediately.
  if (!shouldPromptSessionDistance(course)) {
    startTracking(type, course);
    return;
  }
  ui.pendingStart = { type, course };
  closeSheet("sheet-start");
  closeSheet("sheet-course");
  const len = courseMeters(course);
  $("target-course-sub").textContent = `${course.name} · ${formatDistance(len, units())}`;
  $("target-unit").textContent = units() === "km" ? "km" : "mi";
  const last = state.settings && Number(state.settings.lastSessionDistanceMeters);
  $("target-distance").value = last > 0 ? inputValueForMeters(last, units()) : "";
  refreshTargetOptions();
  maybeShowSessionDistanceExplainer();
  openSheet("sheet-target");
}

function startPendingWithMode(mode) {
  const pending = ui.pendingStart;
  if (!pending) return;
  const meters = parseTargetMeters();
  if (meters > 0) {
    if (!state.settings) state.settings = {};
    state.settings.lastSessionDistanceMeters = meters;
    persist();
  }
  markSessionDistanceExplainerSeen();
  hideSessionDistanceExplainer();
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
async function refreshBuilderElevation(path, { countedMeters } = {}) {
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
    const flat = countedMeters != null ? countedMeters : pathLengthMeters(path);
    if (!(flat > 0)) return paintElevationBox(el, gl, { units: units(), credit: true });
    const shown = displayDistance(pts, flat, { countHills: !!state.settings.countHills });
    const walkEta = formatEta(naismithSeconds(flat, gl.gainM, activityMph("walk")));
    const runEta = formatEta(naismithSeconds(flat, gl.gainM, activityMph("run")));
    tot.innerHTML = `<span>Total</span><span>${formatDistance(shown.meters, units())} · ${formatGain(gl.gainM, units())} climb · ${walkEta} walk · ${runEta} run</span>`;
    const distEl = $("builder-live-distance");
    const etaEl = $("builder-live-eta");
    if (distEl) distEl.textContent = formatDistance(shown.meters, units());
    if (etaEl) etaEl.textContent = walkEta + " walk · " + runEta + " run";
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

/* heldpath-hook: summary-laps — multi-lap F1 tower fixture */
function makeLapSummaryFixture() {
  const a = { lat: 43.7672, lon: 11.2543 };
  const b = destination(a.lat, a.lon, 90, 120);
  const c = destination(b.lat, b.lon, 0, 120);
  const d = destination(c.lat, c.lon, 270, 120);
  const pins = [
    { ...a, role: "start" }, { ...b, role: "via" }, { ...c, role: "via" },
    { ...d, role: "via" }, { ...a, role: "end" },
  ];
  const path = [a, b, c, d, { lat: a.lat, lon: a.lon }];
  const course = newCourse({ name: "Two-lap loop", pins, path });
  course.goal = goalFromFinishTime(250, course);
  course.sectorPbs = {
    0: { seconds: 55, activityId: "prev", date: "2026-11-11T09:00:00.000Z" },
    1: { seconds: 70, activityId: "prev", date: "2026-11-11T09:00:00.000Z" },
    2: { seconds: 59, activityId: "prev", date: "2026-11-11T09:00:00.000Z" },
    3: { seconds: 60, activityId: "prev", date: "2026-11-11T09:00:00.000Z" },
  };
  course.sectorHistory = [{ at: "2026-11-11T09:00:00.000Z", activityId: "prev", times: [55, 70, 59, 60], totalSec: 244 }];
  const corners = [a, b, c, d, a];
  const lapSecs = [[60, 65, 63, 62], [58, 64, 61, 60]];
  const track = [{ lat: a.lat, lon: a.lon, t: 0, at: "2026-11-18T09:00:00.000Z" }];
  let t = 0;
  for (const sides of lapSecs) {
    for (let i = 0; i < 4; i++) {
      const p = corners[i], q = corners[i + 1];
      const steps = 14;
      for (let k = 1; k <= steps; k++) {
        t += sides[i] / steps;
        const f = k / steps;
        track.push({
          lat: p.lat + (q.lat - p.lat) * f,
          lon: p.lon + (q.lon - p.lon) * f,
          t,
          at: new Date(Date.parse("2026-11-18T09:00:00.000Z") + t * 1000).toISOString(),
        });
      }
    }
  }
  const act = newActivity({
    type: "run",
    courseId: course.id,
    courseName: course.name,
    startedAt: "2026-11-18T09:00:00.000Z",
    endedAt: new Date(Date.parse("2026-11-18T09:00:00.000Z") + t * 1000).toISOString(),
    distanceMeters: 960,
    elapsedSec: t,
    track,
  });
  return { course, act };
}

function showSummary(act, course, legResult) {

  ui.summary = { act, course, legResult };
  const type = sportLabel(act.type); /* heldpath-hook: bike */
  const elev = activityElevation(act);
  const shown = displayDistance(act.track, act.distanceMeters, { countHills: !!state.settings.countHills });
  const indoorNote = act.source === "indoor"
    ? (act.indoorNote ? `${indoorSummaryNote()} ${act.indoorNote}` : indoorSummaryNote())
    : "";
  const key = `${act.id || "act"}|${(course && course.id) || ""}`;
  if (!ui.summaryModel || ui.summaryModel.key !== key) {
    const model = buildSectorModel(course, act, { apply: true });
    ui.summaryModel = { key, model };
    if (model && model.hasGoal) persist();
  }
  const model = ui.summaryModel.model;
  const outline = (course && ((course.path && course.path.length >= 2) ? course.path : course.pins))
    || (act.track && act.track.length >= 2 ? act.track : null);
  renderSummary({
    act,
    course,
    units: units(),
    shownMeters: shown.meters,
    elev,
    model,
    outline,
    title: `${type} complete`,
    sub: `${new Date(act.endedAt || act.startedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${sourceLabel(act)}`,
    indoorNote,
    distanceNote: act.source === "indoor" ? "" : shown.disclaimer,
  });
  ui.hideNav = true;
  showScreen("summary");
}

function summaryDetailsCtx() {
  const { act, course, legResult } = ui.summary || {};
  if (!act) return null;
  const elev = activityElevation(act);
  const shown = displayDistance(act.track, act.distanceMeters, { countHills: !!state.settings.countHills });
  const model = ui.summaryModel && ui.summaryModel.model ? ui.summaryModel.model : buildSectorModel(course, act, { apply: false });
  return { act, course, legResult, elev, shown, model };
}

function openSummaryDetails() {
  const ctx = summaryDetailsCtx();
  if (!ctx) return;
  const { act, course, legResult, elev, shown, model } = ctx;
  renderDetails({
    act,
    course,
    units: units(),
    shownMeters: shown.meters,
    elev,
    model,
    sub: `${new Date(act.endedAt || act.startedAt).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${sourceLabel(act)}`,
    healthOptIn: !!state.settings.healthOptIn,
    healthSync: act.healthSync || null,
    legResult,
    splits,
  });
  paintElevationBox($("details-elevation"), elev, { units: units(), credit: true });
  const elevEl = $("details-elevation");
  if (elevEl && !elevEl.innerHTML.trim()) {
    elevEl.hidden = false;
    elevEl.innerHTML = `<p class="tiny">No elevation samples for this activity. The health app and phone barometer add them when available.</p>`;
  }
  ui.hideNav = true;
  showScreen("summary-details");
  drawSummaryDetailsMap(act, course);
}

/* heldpath-hook: summary-laps — draw S1…Sn on the real GPS track */
function drawSummaryDetailsMap(act, course) {
  if (!act) return;
  const paint = () => {
    try { map.clearOverlays(); map.clearMarkers(); map.clearLegLabels(); } catch { /* not ready */ }
    const track = act.track || [];
    const meters = detailsMapMeters(course, act);
    const segs = sectorTrackSegments(track, meters);
    const palette = ["#4EC3F7", "#B8F3D0", "#F3E0A8", "#FFB4A8", "#9BB7FF"];
    segs.forEach((seg, i) => {
      map.drawRoute(seg.coords, { id: "details-leg-" + i, color: palette[i % palette.length], width: 5 });
      const mid = seg.coords[Math.floor(seg.coords.length / 2)];
      if (mid) map.addLegLabel(mid, "S" + (i + 1));
    });
    if (!segs.length && track.length >= 2) {
      map.drawRoute(track, { id: "details-track", color: "#4EC3F7", width: 5 });
    }
    if (course && course.pins && course.pins.length) addCoursePins(course.pins);
    const line = track.length >= 2 ? track : ((course && (course.path || course.pins)) || []);
    if (line.length) {
      const bottom = Math.round((window.innerHeight || 800) * 0.64) + 24;
      const pad = { top: 84, bottom, left: 48, right: 48 };
      map.whenReady(() => map.fitBounds(line, pad));
      map.fitBounds(line, pad);
    }
  };
  map.whenReady(paint);
  paint();
}

function closeSummaryDetails() {
  ui.hideNav = true;
  showScreen("summary");
}



function bindBuilderSheetGestures() {
  const panel = document.querySelector(".builder-panel");
  if (!panel || panel.dataset.sheetGestures === "1") return;
  panel.dataset.sheetGestures = "1";
  let startY = null;
  let dragging = false;
  panel.addEventListener("pointerdown", (e) => {
    if (e.target && e.target.closest("button, a, input, .legs, .builder-live-bar")) return;
    startY = e.clientY;
    dragging = true;
  });
  panel.addEventListener("pointerup", (e) => {
    if (!dragging || startY == null) return;
    const dy = e.clientY - startY;
    startY = null;
    dragging = false;
    if (dy > 36 && ui.builderSheetExpanded) setBuilderSheet(false);
    else if (dy < -36 && !ui.builderSheetExpanded) setBuilderSheet(true);
  });
  panel.addEventListener("pointercancel", () => { dragging = false; startY = null; });
}

function applyBuilderSheet() {
  const panel = document.querySelector(".builder-panel");
  const expanded = ui.builderSheetExpanded === true;
  if (panel) {
    panel.classList.toggle("is-expanded", expanded);
    panel.classList.toggle("is-collapsed", !expanded);
  }
  document.body.classList.toggle("builder-sheet-open", expanded && ui.screen === "builder");
  const btn = $("btn-builder-sheet");
  if (btn) {
    btn.textContent = expanded ? "↓" : "↑";
    btn.setAttribute("aria-expanded", expanded ? "true" : "false");
    btn.setAttribute("aria-label", expanded ? "Hide course details" : "Show course details");
  }
}

function setBuilderSheet(expanded) {
  ui.builderSheetExpanded = !!expanded;
  applyBuilderSheet();
  try {
    const line = ui.builderRoute && ui.builderRoute.path && ui.builderRoute.path.length >= 2
      ? ui.builderRoute.path
      : (ui.builder ? routeStops(ui.builder) : null);
    if (line && line.length) fitBuilderCourse(line);
  } catch { /* no route yet */ }
}

function toggleBuilderSheet() {
  setBuilderSheet(!ui.builderSheetExpanded);
}

function beginBuilder() {
  resetBuilderRoutingFlags();
  ui.builder = emptyBuilderState();
  ui.builderPins = ui.builder.pins;
  ui.builderSheetExpanded = false;
  ui.pathMode = currentPathMode();
  setTab("today");
  showScreen("builder");
  applyBuilderSheet();
  paintPathModeButton();
  map.clearOverlays();
  map.clearMarkers();
  startBuilderLocation({ center: true });
  renderBuilder();
  maybeShowBuilderExplainer();
  if (isExplainerSeen()) maybeShowPathModeExplainer();
  if (ui.offBuildClick) ui.offBuildClick();
  ui.offBuildClick = map.onMapClick((pt) => {
    applyBuilderChange((st) => placePin(st, pt, { pathMode: currentPathMode() }));
  });
}

function cancelBuilder() {
  if (ui.offBuildClick) { ui.offBuildClick(); ui.offBuildClick = null; }
  resetBuilderRoutingFlags();
  ui.builder = emptyBuilderState();
  ui.builderPins = ui.builder.pins;
  map.clearOverlays();
  map.clearMarkers();
  const back = ui.returnToSchedule;
  ui.returnToSchedule = null;
  if (back) {
    if (back.day) ui.selectedDay = back.day;
    setTab("calendar");
    openSessionChoice();
    return;
  }
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
    paintCourseLegs(course && course.legs, guide, { id: "course-line", width: 4 });
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
  if ($("btn-start-ride")) $("btn-start-ride").addEventListener("click", () => openStart("ride")); /* heldpath-hook: bike */
  document.querySelectorAll("#start-sport-picker [data-sport]").forEach((b) => {
    b.addEventListener("click", () => openStart(b.dataset.sport));
  });
  if ($("btn-low-signal-download")) $("btn-low-signal-download").addEventListener("click", () => acceptLowSignalDownload());
  if ($("btn-low-signal-later")) $("btn-low-signal-later").addEventListener("click", () => dismissLowSignalPrompt());
  $("btn-build-course").addEventListener("click", beginBuilder);
  $("btn-saved-courses").addEventListener("click", () => setTab("courses"));
  $("btn-new-course").addEventListener("click", beginBuilder);
  /* heldpath-hook: routes-heatmap */
  if ($("btn-open-insights")) $("btn-open-insights").addEventListener("click", () => openInsights());
  if ($("btn-suggest-from-courses")) $("btn-suggest-from-courses").addEventListener("click", () => openInsights({ suggest: true }));
  if ($("insights-back")) $("insights-back").addEventListener("click", () => setTab("courses"));
  if ($("btn-suggest-loop")) $("btn-suggest-loop").addEventListener("click", () => suggestLoop());
  document.querySelectorAll("#insights-sport button").forEach((b) => {
    b.addEventListener("click", () => {
      ui.insightsSport = b.dataset.sport || "all";
      ui.insightsGroupId = null;
      ui.insightsSuggestion = null;
      renderInsights();
      paintInsightsMap();
    });
  });
  document.querySelectorAll("#insights-range button").forEach((b) => {
    b.addEventListener("click", () => {
      ui.insightsRange = b.dataset.range || "all";
      ui.insightsGroupId = null;
      ui.insightsSuggestion = null;
      renderInsights();
      paintInsightsMap();
    });
  });
  if ($("insights-loops")) {
    $("insights-loops").addEventListener("click", (ev) => {
      const row = ev.target.closest("[data-loop]");
      if (!row) return;
      const id = row.dataset.loop;
      ui.insightsGroupId = ui.insightsGroupId === id ? null : id;
      renderInsights();
    });
  }
  if ($("hill-pace-switch")) {
    $("hill-pace-switch").addEventListener("click", () => {
      state.settings.hillPace = !state.settings.hillPace;
      persist();
      renderSettings();
      if (ui.screen === "insights") renderInsights();
    });
  }
  /* heldpath-hook: routes-heatmap end */
  $("btn-undo-pin").addEventListener("click", () => undoLastBuilderAction());
  if ($("btn-builder-sheet")) $("btn-builder-sheet").addEventListener("click", () => toggleBuilderSheet());
  bindBuilderSheetGestures();
  if ($("btn-legs-toggle")) $("btn-legs-toggle").addEventListener("click", () => {
    ui.legsOpen = ui.legsOpen === false;
    const box = $("builder-legs");
    const toggle = $("btn-legs-toggle");
    if (box) box.classList.toggle("is-collapsed", ui.legsOpen === false);
    if (toggle) toggle.setAttribute("aria-expanded", ui.legsOpen === false ? "false" : "true");
  });
  $("btn-cancel-build").addEventListener("click", cancelBuilder);
  $("btn-save-course").addEventListener("click", saveBuilder);
  $("btn-course-name-cancel").addEventListener("click", () => closeSheet("sheet-save-course"));
  $("btn-course-name-save").addEventListener("click", () => {
    const name = ($("course-name").value || "New course").trim();
    const st = activeBuilder();
    const routed = ui.builderRoute || builderRoute();
    const c = newCourse({
      name,
      pins: savedPins(st),
      path: routed && routed.path && routed.path.length >= 2 ? routed.path.slice() : null,
      straightLine: false,
      usedStraight: !!(routed && routed.usedStraight),
      offMap: !!(routed && routed.offMap),
      legs: (routed && routed.legs || []).map((l) => ({
        meters: l.meters,
        straightMeters: l.straightMeters,
        mode: l.mode,
        reason: l.reason || null,
        offMap: !!l.offMap,
        points: l.points,
        key: l.key,
      })),
      straightOverrides: [...(ui.straightOverrides || [])],
    });
    state.courses.push(c);
    persist();
    closeSheet("sheet-save-course");
    if (ui.offBuildClick) { ui.offBuildClick(); ui.offBuildClick = null; }
    ui.builder = emptyBuilderState();
    ui.builderPins = ui.builder.pins;
    const back = ui.returnToSchedule;
    ui.returnToSchedule = null;
    if (back) {
      if (back.day) ui.selectedDay = back.day;
      setTab("calendar");
      renderCalendar();
      openSchedule({ courseId: c.id });
      return;
    }
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
  if ($("btn-session-distance-gotit")) {
    $("btn-session-distance-gotit").addEventListener("click", () => {
      markSessionDistanceExplainerSeen();
      hideSessionDistanceExplainer();
    });
  }
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
  if ($("btn-session-use-route")) {
    $("btn-session-use-route").addEventListener("click", () => {
      closeSheet("sheet-session-choice");
      openSchedule();
    });
  }
  if ($("btn-session-create-route")) {
    $("btn-session-create-route").addEventListener("click", () => beginBuilderForSchedule());
  }
  if ($("btn-session-choice-cancel")) {
    $("btn-session-choice-cancel").addEventListener("click", () => closeSheet("sheet-session-choice"));
  }
  if ($("btn-group-open-route")) $("btn-group-open-route").addEventListener("click", () => openGroupRoute());
  if ($("btn-group-save-route")) {
    $("btn-group-save-route").addEventListener("click", () => {
      saveGroupCourseTemplate(courseForGroupPlan(ui.pendingGroupPlan), $("group-event-note"));
    });
  }
  if ($("btn-group-event-close")) $("btn-group-event-close").addEventListener("click", () => closeSheet("sheet-group-event"));
  if ($("btn-group-route-save")) {
    $("btn-group-route-save").addEventListener("click", () => {
      saveGroupCourseTemplate(ui.pendingGroupCourse || courseForGroupPlan(ui.pendingGroupPlan), $("group-route-note"));
    });
  }
  if ($("btn-group-route-back")) $("btn-group-route-back").addEventListener("click", () => closeGroupRouteView());
  if ($("btn-plan-route-start")) $("btn-plan-route-start").addEventListener("click", () => startPendingPlanRoute());
  if ($("btn-plan-route-save")) {
    $("btn-plan-route-save").addEventListener("click", () => {
      const pending = ui.pendingPlanRoute;
      saveGroupCourseTemplate(pending && pending.course, $("plan-route-note"));
    });
  }
  if ($("btn-plan-route-back")) $("btn-plan-route-back").addEventListener("click", () => closePlanRouteView());
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
  /* heldpath-hook: summary-laps — More Details is a free second screen */
  if ($("btn-summary-details")) $("btn-summary-details").addEventListener("click", openSummaryDetails);
  if ($("btn-details-back")) $("btn-details-back").addEventListener("click", closeSummaryDetails);
  if ($("btn-details-done")) $("btn-details-done").addEventListener("click", () => {
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
    applyBuilderChange((st) => toggleEndMode(st));
    paintEndPointButton();
  });
  if ($("btn-builder-help")) $("btn-builder-help").addEventListener("click", () => maybeShowBuilderExplainer({ force: true }));
  if ($("btn-path-mode")) $("btn-path-mode").addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    setCurrentPathMode(isOffPathMode(currentPathMode()) ? "on" : "off");
  });
  if ($("btn-path-mode-gotit")) $("btn-path-mode-gotit").addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    hidePathModeExplainer({ seen: true });
  });
  if ($("btn-switch-pin-green")) $("btn-switch-pin-green").addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    switchHintPinToGreen();
  });

  if ($("btn-builder-help-gotit")) $("btn-builder-help-gotit").addEventListener("click", () => {
    markExplainerSeen();
    closeSheet("sheet-builder-help");
    maybeShowPathModeExplainer();
  });
  if ($("btn-pin-add-stop")) $("btn-pin-add-stop").addEventListener("click", () => {
    const i = ui.pinActionIndex;
    closeSheet("sheet-pin-action");
    closeSheet("sheet-new-goal");
    if (i == null) return;
    applyBuilderChange((st) => addNextStop(st, i, { pathMode: currentPathMode() }));
  });
    if ($("btn-pin-path-on")) $("btn-pin-path-on").addEventListener("click", () => {
    const i = ui.pinActionIndex;
    closeSheet("sheet-pin-action");
    if (i != null) applyBuilderChange((s) => setPinPathMode(s, i, "on"));
  });
  if ($("btn-pin-path-off")) $("btn-pin-path-off").addEventListener("click", () => {
    const i = ui.pinActionIndex;
    closeSheet("sheet-pin-action");
    if (i != null) applyBuilderChange((s) => setPinPathMode(s, i, "off"));
  });
if ($("btn-pin-set-end")) $("btn-pin-set-end").addEventListener("click", () => {
    const i = ui.pinActionIndex;
    closeSheet("sheet-pin-action");
    closeSheet("sheet-new-goal");
    if (i == null) return;
    applyBuilderChange((st) => setEndIndex(st, i));
  });
  if ($("btn-pin-delete")) $("btn-pin-delete").addEventListener("click", () => {
    const i = ui.pinActionIndex;
    if (i == null) return;
    applyPinDelete(i);
  });
  if ($("btn-pin-remove-end")) $("btn-pin-remove-end").addEventListener("click", () => {
    closeSheet("sheet-pin-action");
    closeSheet("sheet-new-goal");
    applyBuilderChange((st) => removeEnd(st));
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
  if ($("btn-map-style")) {
    $("btn-map-style").addEventListener("click", () => toggleMapStyle());
  }
  const openNewGoal = () => openNewGoalSheet();
  if ($("btn-new-goal")) $("btn-new-goal").addEventListener("click", openNewGoal);
  if ($("btn-today-new-goal")) $("btn-today-new-goal").addEventListener("click", openNewGoal);
  if ($("btn-settings-new-goal")) $("btn-settings-new-goal").addEventListener("click", openNewGoal);
  if ($("goal-new-kind")) $("goal-new-kind").addEventListener("change", () => paintGoalTypeFields());
  if ($("btn-goal-save")) $("btn-goal-save").addEventListener("click", addGoalFromForm);
  if ($("btn-goal-cancel")) $("btn-goal-cancel").addEventListener("click", () => closeSheet("sheet-new-goal"));
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


function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function paintMapStyleButton() {
  const sat = (state.settings.mapStyle || "map") === "satellite";
  const btn = $("btn-map-style");
  if (btn) {
    btn.setAttribute("aria-pressed", sat ? "true" : "false");
    btn.textContent = sat ? "Satellite" : "Map";
    btn.title = sat ? "Switch to map" : "Switch to satellite";
    btn.setAttribute("aria-label", sat ? "Satellite view, switch to map" : "Map view, switch to satellite");
  }
  const note = $("map-style-note");
  if (note) {
    if (sat && !isOnline()) {
      note.hidden = false;
      note.textContent = "Satellite needs signal.";
    } else {
      note.hidden = true;
    }
  }
}

function applySavedMapStyle() {
  const style = state.settings.mapStyle === "satellite" ? "satellite" : "map";
  if (typeof map.setMapStyle === "function") map.setMapStyle(style, { online: isOnline() });
  paintMapStyleButton();
}

function toggleMapStyle() {
  const next = (state.settings.mapStyle || "map") === "satellite" ? "map" : "satellite";
  state.settings.mapStyle = next;
  persist();
  if (typeof map.setMapStyle === "function") map.setMapStyle(next, { online: isOnline() });
  paintMapStyleButton();
}

function onLiveFix(fix) {
  const saved = rememberLocation(fix);
  const point = saved || fix;
  if (point) map.setUserDot(point);
}

function maybeStartLiveLocation() {
  const known = normalizeFix(state.settings.lastKnown);
  if (known) map.setUserDot(known);
  const allowed = !!state.settings.locationDisclosureAccepted || !!known;
  if (!allowed) return;
  if (locationWatchActive()) return;
  startLocationWatch({
    onFix: onLiveFix,
    onError: () => {},
  }).catch(() => {});
}

function startBuilderLocation({ center = false } = {}) {
  maybeStartLiveLocation();
  const known = normalizeFix(state.settings.lastKnown);
  if (!known) return;
  map.setUserDot(known);
  const st = ui.builder;
  const empty = !st || !st.pins || !st.pins.length;
  if (center && empty) {
    map.setCenter(known.lat, known.lon, STREET_ZOOM);
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
  const course = migrateCourses([newCourse({
    name: incoming.name,
    pins: incoming.pins,
    path: incoming.path,
    straightLine: incoming.straightLine,
    straightOverrides: incoming.straightOverrides,
  })])[0];
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


const US_TOWN_ROUTES = {
  gulfport: {
    center: { lat: 30.3688, lon: -89.09315 },
    pins: [{ lat: 30.3678, lon: -89.0948 }, { lat: 30.3698, lon: -89.0915 }],
    // Four street-corner pins in the same connected component, compact loop.
    loopPins: [
      { lat: 30.370061, lon: -89.094878 },
      { lat: 30.368182, lon: -89.092829 },
      { lat: 30.366164, lon: -89.094771 },
      { lat: 30.368127, lon: -89.097565 },
    ],
    loopCenter: { lat: 30.3678, lon: -89.0948 },
    zoom: 16.4,
  },
  "oak-park": {
    center: { lat: 41.8880, lon: -87.7990 },
    pins: [{ lat: 41.88755, lon: -87.80394 }, { lat: 41.8884, lon: -87.794 }],
    loopPins: [
      { lat: 41.890334, lon: -87.801796 },
      { lat: 41.885665, lon: -87.799972 },
      { lat: 41.885665, lon: -87.805063 },
      { lat: 41.888625, lon: -87.807112 },
    ],
    loopCenter: { lat: 41.88755, lon: -87.80394 },
    zoom: 15.8,
  },
  holland: {
    center: { lat: 42.7888, lon: -86.10765 },
    pins: [{ lat: 42.7902, lon: -86.1089 }, { lat: 42.7874, lon: -86.1064 }],
    loopPins: [
      { lat: 42.791315, lon: -86.107342 },
      { lat: 42.788575, lon: -86.107106 },
      { lat: 42.788539, lon: -86.111183 },
      { lat: 42.791279, lon: -86.110212 },
    ],
    loopCenter: { lat: 42.7902, lon: -86.1089 },
    zoom: 16.2,
  },
  founders: {
    center: { lat: 41.87224, lon: -88.14636 },
    pins: [{ lat: 41.87200, lon: -88.14540 }, { lat: 41.87115, lon: -88.14540 }],
    loopPins: [
      { lat: 41.87200, lon: -88.14540, pathMode: "on" },
      { lat: 41.87115, lon: -88.14540, pathMode: "on" },
    ],
    loopCenter: { lat: 41.8716, lon: -88.1456 },
    zoom: 17,
  },
};


async function showUsTownAutoLoop({ center, meters = 1609 } = {}) {
  const fix = { lat: center.lat, lon: center.lon, accuracy: 18, at: Date.now() };
  state.settings.lastKnown = fix;
  state.settings.locationDisclosureAccepted = true;
  state.settings.mapStyle = "map";
  persist();
  setTab("today");
  showScreen("today");
  if ($("today-dock")) $("today-dock").hidden = true;
  showMapBanner("Loading paths…");
  await waitMapReady();
  map.setCenter(center.lat, center.lon, 15);
  const loop = await buildAutoLoop(center, meters);
  showMapBanner("");
  if (!loop || loop.ok === false || !loop.pins || loop.pins.length < 2) {
    showMapBanner(AUTO_LOOP_FAIL_COPY);
    return loop;
  }
  const course = { id: null, name: "Plan loop", pins: loop.pins, path: loop.path };
  const plan = {
    id: "hook-plan-loop",
    activityType: "walk",
    courseName: "Plan loop",
    courseId: null,
    routePins: loop.pins,
    routePath: loop.path,
    targetLengthMeters: loop.meters || meters,
  };
  openPlanRoute(plan, { from: "plans" });
  await new Promise((r) => setTimeout(r, 400));
  return loop;
}

async function showUsTownBuilder({ center, pins, satellite = false, zoom = 16.2 } = {}) {
  const fix = { lat: center.lat, lon: center.lon, accuracy: 18, at: Date.now() };
  state.settings.lastKnown = fix;
  state.settings.locationDisclosureAccepted = true;
  state.settings.mapStyle = satellite ? "satellite" : "map";
  persist();
  ui.lockWalkGraph = false;
  ui.findingPaths = false;
  ui.builderRoute = null;
  ui.straightOverrides = new Set();
  ui.builder = emptyBuilderState();
  for (const pin of pins) placePin(ui.builder, pin);
  ui.builderPins = ui.builder.pins;
  setTab("today");
  showScreen("builder");
  applySavedMapStyle();
  await waitMapReady();
  try { await ensureWalkGraph(pins); } catch { /* renderBuilder will warn if the graph fails */ }
  ui.findingPaths = false;
  renderBuilder();
  await waitBuilderRouted(20000);
  const fit = (ui.builderRoute && ui.builderRoute.path && ui.builderRoute.path.length >= 2)
    ? ui.builderRoute.path
    : pins;
  map.setCenter(center.lat, center.lon, zoom);
  fitBuilderCourse(fit, { maxZoom: 17 });
  applySavedMapStyle();
  await new Promise((r) => setTimeout(r, satellite ? 1800 : 800));
  fitBuilderCourse(fit, { maxZoom: 17 });
}


async function showUsTownBuilderLoop({ center, loopCenter, loopPins, pins, zoom = 16.2, meters = 1609, closeLoop } = {}) {
  const at = loopCenter || center;
  const fix = { lat: at.lat, lon: at.lon, accuracy: 18, at: Date.now() };
  state.settings.lastKnown = fix;
  state.settings.locationDisclosureAccepted = true;
  state.settings.mapStyle = "map";
  persist();
  ui.lockWalkGraph = false;
  ui.findingPaths = false;
  ui.straightOverrides = new Set();
  ui.builderRoute = null;
  const coursePins = (loopPins && loopPins.length >= 2) ? loopPins : pins;
  const shouldClose = closeLoop != null ? !!closeLoop : !!(coursePins && coursePins.length >= 3);
  const ingest = shouldClose ? [...coursePins, coursePins[0]] : [...(coursePins || [])];
  ui.builder = ingestPins(ingest.filter(Boolean));
  if (ui.builder.endIndex == null && ui.builder.pins.length) ui.builder = setEndIndex(ui.builder, 0);
  ui.builderPins = ui.builder.pins;
  setTab("today");
  showScreen("builder");
  applySavedMapStyle();
  await waitMapReady();
  map.setCenter(at.lat, at.lon, zoom);
  try { setActiveGraph(null); } catch { /* ok */ }
  try { await ensureWalkGraph(ui.builder.pins, { padDeg: 0.008 }); } catch { /* renderBuilder will warn if the graph fails */ }
  ui.builderRoute = null;
  ui.findingPaths = false;
  renderBuilder();
  await waitBuilderRouted(20000);
  const fit = [
    ...((ui.builderRoute && ui.builderRoute.path) || []),
    ...routeStops(ui.builder),
  ];
  fitBuilderCourse(fit, { maxZoom: 16.2 });
  try { map.raiseOverlays(); } catch { /* map helper */ }
  await new Promise((r) => setTimeout(r, 800));
  fitBuilderCourse(fit, { maxZoom: 16.2 });
  try { map.raiseOverlays(); } catch { /* map helper */ }
}

function oneMileLoopCourse(name = "Park loop") {
  const town = US_TOWN_ROUTES.gulfport;
  const center = (town && (town.loopCenter || town.center)) || { lat: 30.3678, lon: -89.0948 };
  const target = METERS_PER_MILE;
  let side = target / 4;
  let pins = [];
  for (let i = 0; i < 8; i++) {
    const a = { lat: center.lat, lon: center.lon, role: "start" };
    const b = { ...destination(a.lat, a.lon, 90, side), role: "via" };
    const c = { ...destination(b.lat, b.lon, 0, side), role: "via" };
    const d = { ...destination(c.lat, c.lon, 270, side), role: "via" };
    const end = { lat: a.lat, lon: a.lon, role: "end" };
    pins = [a, b, c, d, end];
    const len = pathLengthMeters(pins);
    if (!(len > 0)) break;
    side *= target / len;
  }
  return newCourse({ name, pins, path: pins });
}

function openLoopDistancePicker({ explainer = false, value = "2.56" } = {}) {
  if (state.settings) state.settings.units = "mi";
  const course = oneMileLoopCourse();
  state.courses = [course, ...(state.courses || []).filter((c) => c.id !== course.id)];
  persist();
  ui.pendingStart = { type: "run", course };
  const len = courseMeters(course);
  $("target-course-sub").textContent = `${course.name} · ${formatDistance(len, "mi")}`;
  $("target-unit").textContent = "mi";
  $("target-distance").value = value == null ? "" : String(value);
  refreshTargetOptions();
  setTab("today");
  showScreen("today");
  if (explainer) {
    try { localStorage.removeItem(SESSION_DISTANCE_EXPLAINER_KEY); } catch { /* ignore */ }
    maybeShowSessionDistanceExplainer({ force: true });
  } else {
    markSessionDistanceExplainerSeen();
    hideSessionDistanceExplainer();
  }
  openSheet("sheet-target");
  return course;
}

function showLoopDistanceMap() {
  if (state.settings) state.settings.units = "mi";
  const course = oneMileLoopCourse();
  state.courses = [course, ...(state.courses || []).filter((c) => c.id !== course.id)];
  persist();
  const targetMeters = 2.56 * METERS_PER_MILE;
  const tplan = planFromCourse(course, targetMeters, MODE_COURSE);
  track.stopSession();
  const made = track.makeSession({ type: "run", course, units: "mi", target: tplan });
  const startPt = (tplan && tplan.path && tplan.path[0]) || course.pins[0];
  Object.assign(made, {
    track: [startPt],
    distanceMeters: 0,
    elapsedSec: 0,
    courseTraveledMeters: 0,
  });
  setTab("today");
  showScreen("tracking");
  paintSessionHud(made);
  const bounds = (course.path && course.path.length >= 2) ? course.path : course.pins;
  const paint = () => {
    try { map.resizeMap(); } catch { /* map helper */ }
    if (startPt) {
      try { map.setCenter(startPt.lat, startPt.lon, 15.6); } catch { /* map helper */ }
    }
    drawSessionOnMap(made);
    map.fitBounds(bounds, { top: 72, bottom: 360, left: 48, right: 48, maxZoom: 16.8 });
  };
  paint();
  map.whenReady(paint);
  return new Promise((resolve) => {
    const finish = () => { paint(); resolve(made); };
    if (map.whenIdle) {
      map.whenIdle().then(finish).catch(finish);
    } else {
      setTimeout(finish, 600);
    }
  });
}

window.HeldpathTest = {
  show: async function show(name, opt = {}) {
    hideLocateDenied();
    closeStretchVideo();
    if ($("map-banner")) { $("map-banner").hidden = true; $("map-banner").textContent = ""; }
    closeAllSheets();
    try {
      const cropRoot = $("map-crop-root");
      if (document.body.classList.contains("map-crop-open") || (cropRoot && !cropRoot.hidden)) closeCrop();
    } catch { /* crop ui may not be ready */ }
    if (typeof stopQrScanKeepSheet === "function") stopQrScanKeepSheet();
    if (typeof setOfferChrome === "function") setOfferChrome(false);
    try { map.clearOverlays(); map.clearMarkers(); } catch { /* map may not be ready */ }
    if ($("today-dock")) $("today-dock").hidden = false;
    if (name !== "builder-help") {
      try { markExplainerSeen(); } catch { /* ignore */ }
    }
    if (name !== "path-mode-explainer") {
      try { markPathModeExplainerSeen(); hidePathModeExplainer(); } catch { /* ignore */ }
    }
    if (name !== "session-distance-explainer" && name !== "loop-distance-popup") {
      try { markSessionDistanceExplainerSeen(); hideSessionDistanceExplainer(); } catch { /* ignore */ }
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
      ui.builderSheetExpanded = false;
      await ensureWalkGraph({ lat: 43.7672, lon: 11.2543 });
      if (name === "routing-loop") {
        const center = { lat: 43.7672, lon: 11.2543 };
        try { await ensureSportLoopGraph(center, 1609); } catch { /* fixture graph */ }
        const loop = getActiveGraph() ? autoLoopRoute(getActiveGraph(), center, 1609) : null;
        if (loop && loop.ok && loop.pins && !loop.fallback) {
          ui.builderPins = loop.pins.map((p) => ({ ...p }));
          ui.builderRoute = loop;
        } else {
          // Last-resort fixture for this named Florence screenshot only — never a rectangle.
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
    } else if (name === "session-choice") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses.length) state.courses.push(course);
      persist();
      ui.cal = new Date(2026, 11, 5);
      ui.selectedDay = "2026-12-05";
      setTab("calendar");
      renderCalendar();
      openSessionChoice();
    } else if (name === "group-event" || name === "group-event-route") {
      const course = state.courses[0] || newCourse({ name: "Arno Loop", pins: arnoLoopPins() });
      if (!state.courses[0]) state.courses.push(course);
      const start = new Date(2026, 11, 5, 9, 0, 0);
      const made = makeGroupRun({ course, startAt: start, activityType: "run", now: new Date(2026, 10, 20, 12, 0, 0) });
      if (made.ok) addGroupRunToState(state, made.run);
      persist();
      ui.cal = new Date(2026, 11, 5);
      ui.selectedDay = "2026-12-05";
      setTab("calendar");
      renderCalendar();
      const plan = (state.plans || []).find((p) => p.groupRunId === (made.ok && made.run.id))
        || (state.plans || []).find((p) => p.groupRunId);
      if (plan) openGroupEvent(plan);
      if (name === "group-event-route") {
        openGroupRoute();
        await waitMapReady();
        const c = courseForGroupPlan(plan) || course;
        const line = (c.path && c.path.length >= 2) ? c.path : c.pins;
        if (line && line.length) {
          const pad = { top: 56, bottom: 360, left: 48, right: 48 };
          map.fitBounds(line, pad);
        }
        await new Promise((r) => setTimeout(r, 400));
      }
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
    else if (name === "insights" || name === "insights-empty") {
      ui.insightsSport = "all";
      ui.insightsRange = "all";
      ui.insightsGroupId = null;
      ui.insightsSuggestion = null;
      ui.insightsSaved = "";
      if (name === "insights-empty") state.activities = [];
      openInsights();
      map.whenReady(() => paintInsightsMap());
    }
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
    else if (name === "summary-details") {
      const act = state.activities[state.activities.length - 1];
      if (!act) setTab("today");
      else {
        const c = act.courseId ? courseById(act.courseId) : null;
        const result = c ? splits.updateCourseLegPbs(c, act) : null;
        showSummary(act, c, result);
        openSummaryDetails();
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
      setBuilderSheet(true);
      maybeShowBuilderExplainer({ force: true });
    } else if (
      name === "builder-collapsed" || name === "builder-expanded"
      || name === "builder-collapsed-gulfport" || name === "builder-expanded-gulfport"
      || name === "builder-collapsed-oak-park" || name === "builder-expanded-oak-park"
      || name === "builder-collapsed-holland" || name === "builder-expanded-holland"
    ) {
      const town = name.includes("oak-park") ? "oak-park" : name.includes("holland") ? "holland" : "gulfport";
      await showUsTownBuilderLoop({ ...US_TOWN_ROUTES[town], meters: 1609 });
      setBuilderSheet(name.includes("expanded"));
      renderBuilder();
      try { map.raiseOverlays(); } catch { /* map helper */ }
      await new Promise((r) => setTimeout(r, 300));
    } else if (name === "path-mode-explainer") {
      await showUsTownBuilderLoop({ ...US_TOWN_ROUTES.gulfport, meters: 1609 });
      setBuilderSheet(false);
      renderBuilder();
      maybeShowPathModeExplainer({ force: true });
      await new Promise((r) => setTimeout(r, 300));
    } else if (name === "session-distance-explainer" || name === "loop-distance-popup") {
      openLoopDistancePicker({ explainer: true, value: "2.56" });
    } else if (name === "loop-distance-picker" || name === "session-distance-picker") {
      openLoopDistancePicker({ explainer: false, value: "2.56" });
    } else if (name === "loop-distance-map" || name === "loop-end-marker") {
      await showLoopDistanceMap();
    } else if (name === "builder-mixed-course") {
      const base = US_TOWN_ROUTES.gulfport.loopPins;
      const mixed = [
        { ...base[0], pathMode: "on" },
        { ...base[1], pathMode: "off" },
        { ...base[2], pathMode: "on" },
        { ...base[3], pathMode: "off" },
      ];
      await showUsTownBuilderLoop({ ...US_TOWN_ROUTES.gulfport, loopPins: mixed, meters: 1609 });
      setBuilderSheet(true);
      renderBuilder();
      try { map.raiseOverlays(); } catch { /* map helper */ }
      await new Promise((r) => setTimeout(r, 400));
    } else if (name === "builder-field-detour" || name === "builder-field-detour-blue" || name === "builder-field-detour-before") {
      await showUsTownBuilderLoop({ ...US_TOWN_ROUTES.founders, closeLoop: false, zoom: 17, meters: 1609 });
      setBuilderSheet(true);
      renderBuilder();
      try { map.raiseOverlays(); } catch { /* map helper */ }
      await new Promise((r) => setTimeout(r, 400));
    } else if (name === "builder-field-detour-green") {
      const pins = (US_TOWN_ROUTES.founders.loopPins || []).map((p, i) => ({
        ...p,
        pathMode: i === 0 ? "on" : "off",
      }));
      await showUsTownBuilderLoop({ ...US_TOWN_ROUTES.founders, loopPins: pins, closeLoop: false, zoom: 17, meters: 1609 });
      setBuilderSheet(true);
      renderBuilder();
      try { map.raiseOverlays(); } catch { /* map helper */ }
      await new Promise((r) => setTimeout(r, 400));
    } else if (name === "builder-world-zoom") {
      await showUsTownBuilderLoop({ ...US_TOWN_ROUTES.gulfport, meters: 1609 });
      setBuilderSheet(false);
      renderBuilder();
      const at = US_TOWN_ROUTES.gulfport.loopCenter;
      map.setCenter(at.lat, at.lon, 1.8);
      await new Promise((r) => setTimeout(r, 600));
    } else if (name === "builder-loop" || name === "builder-mile-loop") {
      ui.builderSheetExpanded = true;
      state.settings.mapStyle = "map";
      persist();
      applySavedMapStyle();
      const center = { lat: 43.7672, lon: 11.2543 };
      await ensureWalkGraph(center);
      const wantMile = name === "builder-mile-loop";
      if (wantMile) {
        try { await ensureSportLoopGraph(center, 1609); } catch { /* fixture graph */ }
      }
      const loop = (wantMile && getActiveGraph()) ? autoLoopRoute(getActiveGraph(), center, 1609) : null;
      if (loop && loop.ok && loop.pins && loop.pins.length >= 3 && !loop.fallback) {
        ui.builder = ingestPins(loop.pins);
        ui.builder = setEndIndex(ui.builder, 0);
        ui.builderRoute = loop;
      } else {
        const pins = arnoLoopPins();
        ui.builder = ingestPins(pins);
        ui.builder = setEndIndex(ui.builder, 0);
      }
      ui.builderPins = ui.builder.pins;
      state.settings.lastKnown = { lat: 43.7672, lon: 11.2543, accuracy: 18, heading: 80, at: Date.now() };
      persist();
      setTab("today");
      showScreen("builder");
      renderBuilder();
      const fit = (ui.builderRoute && ui.builderRoute.path) || routeStops(ui.builder);
      await waitMapReady();
      fitBuilderCourse(fit, { maxZoom: 16 });
      await new Promise((r) => setTimeout(r, 400));
      fitBuilderCourse(fit, { maxZoom: 16 });
      await new Promise((r) => setTimeout(r, 300));
    } else if (name === "builder-unroutable" || name === "builder-warning") {
      await ensureWalkGraph({ lat: 43.7672, lon: 11.2543 });
      ui.straightOverrides = new Set();
      ui.lockWalkGraph = true;
      ui.findingPaths = false;
      ui.builder = ingestPins([
        { lat: 43.76797, lon: 11.25316, role: "start" },
        { lat: 43.72923, lon: 11.25549, role: "end" },
      ]);
      ui.builderPins = ui.builder.pins;
      ui.builderRoute = null;
      setTab("today");
      showScreen("builder");
      renderBuilder();
      const warnFit = routeStops(ui.builder);
      renderBuilder();
      await new Promise((r) => setTimeout(r, 300));
      fitBuilderCourse(warnFit, { maxZoom: 14 });
      await new Promise((r) => setTimeout(r, 200));
    } else if (name === "builder-soccer") {
      await ensureWalkGraph({ lat: 43.779187, lon: 11.284345 });
      ui.straightOverrides = new Set();
      ui.lockWalkGraph = true;
      ui.findingPaths = false;
      const soccerPins = [
        { lat: 43.77953723301052, lon: 11.284208670258522, role: "start" },
        { lat: 43.77927434215589, lon: 11.284751817584038, role: "via" },
        { lat: 43.778747104151606, lon: 11.284957006573677, role: "via" },
        { lat: 43.778716602803165, lon: 11.284140273928642, role: "via" },
        { lat: 43.77927579422743, lon: 11.283868700265884, role: "via" },
        { lat: 43.77953723301052, lon: 11.284208670258522, role: "end" },
      ];
      ui.builder = ingestPins(soccerPins);
      ui.builder = setEndIndex(ui.builder, 0);
      ui.builderPins = ui.builder.pins;
      ui.builderRoute = null;
      setTab("today");
      showScreen("builder");
      renderBuilder();
      const soccerFit = routeStops(ui.builder);
      renderBuilder();
      await new Promise((r) => setTimeout(r, 300));
      fitBuilderCourse(soccerFit, { maxZoom: 18 });
      await new Promise((r) => setTimeout(r, 200));
    } else if (name === "builder-live" || name === "builder-mid") {
      await ensureWalkGraph({ lat: 43.7672, lon: 11.2543 });
      ui.straightOverrides = new Set();
      ui.lockWalkGraph = true;
      ui.findingPaths = false;
      ui.legsOpen = true;
      ui.builder = emptyBuilderState();
      placePin(ui.builder, { lat: 43.76797, lon: 11.25316 });
      placePin(ui.builder, { lat: 43.76956, lon: 11.25586 });
      placePin(ui.builder, { lat: 43.77313, lon: 11.25596 });
      ui.builderPins = ui.builder.pins;
      ui.builderRoute = null;
      setTab("today");
      showScreen("builder");
      renderBuilder();
      const liveFit = (ui.builderRoute && ui.builderRoute.path) || routeStops(ui.builder);
      renderBuilder();
      await waitMapReady();
      fitBuilderCourse(liveFit, { maxZoom: 16 });
      await new Promise((r) => setTimeout(r, 400));
      fitBuilderCourse(liveFit, { maxZoom: 16 });
      await new Promise((r) => setTimeout(r, 300));
    } else if (name === "builder-pin-menu") {
      await ensureWalkGraph({ lat: 43.7672, lon: 11.2543 });
      ui.lockWalkGraph = true;
      ui.findingPaths = false;
      ui.builder = emptyBuilderState();
      placePin(ui.builder, { lat: 43.76797, lon: 11.25316 });
      placePin(ui.builder, { lat: 43.76956, lon: 11.25586 });
      placePin(ui.builder, { lat: 43.77313, lon: 11.25596 });
      ui.builderPins = ui.builder.pins;
      ui.builderRoute = null;
      setTab("today");
      showScreen("builder");
      renderBuilder();
      const menuFit = (ui.builderRoute && ui.builderRoute.path) || routeStops(ui.builder);
      await waitMapReady();
      fitBuilderCourse(menuFit, { maxZoom: 16 });
      await new Promise((r) => setTimeout(r, 300));
      fitBuilderCourse(menuFit, { maxZoom: 16 });
      openPinAction(1);
      await new Promise((r) => setTimeout(r, 200));
    } else if (name === "goal-type-dropdown") {
      state.goals = [];
      persist();
      showScreen("goals");
      renderGoalsScreen();
      openNewGoalSheet();
      const sel = $("goal-new-kind");
      if (sel) {
        sel.size = Math.max(2, sel.options.length);
        sel.style.height = "auto";
        sel.focus();
      }
    } else if (name === "new-goal" || name === "goals-new") {

      state.goals = [];
      persist();
      showScreen("goals");
      renderGoalsScreen();
      openNewGoalSheet();
      if ($("goal-new-kind")) $("goal-new-kind").value = "time-distance";
      if ($("goal-new-distance")) $("goal-new-distance").value = "3";
      if ($("goal-new-time")) $("goal-new-time").value = "18:00";
      paintGoalTypeFields();
    } else if (name === "goal-created") {
      state.goals = [
        newGoal({
          name: "3.000 mi in 18:00",
          kind: "time-distance",
          distanceMeters: 3 * METERS_PER_MILE,
          finishSec: 18 * 60,
          paid: false,
        }),
      ];
      persist();
      showScreen("goals");
      renderGoalsScreen();
    } else if (name === "builder-locate") {
      const fix = { lat: 43.76956, lon: 11.25586, accuracy: 22, heading: 35, at: Date.now() };
      state.settings.lastKnown = fix;
      state.settings.locationDisclosureAccepted = true;
      persist();
      ui.lockWalkGraph = true;
      ui.builder = emptyBuilderState();
      ui.builderPins = ui.builder.pins;
      ui.builderRoute = null;
      setTab("today");
      showScreen("builder");
      map.setUserDot(fix);
      map.setCenter(fix.lat, fix.lon, 16);
      startBuilderLocation({ center: true });
      renderBuilder();
      await new Promise((r) => setTimeout(r, 400));
    } else if (name === "plan-autoloop" || name === "plan-autoloop-gulfport" || name === "plan-autoloop-oak-park" || name === "plan-autoloop-holland") {
      const key = name === "plan-autoloop-oak-park" ? "oak-park" : (name === "plan-autoloop-holland" ? "holland" : "gulfport");
      await showUsTownAutoLoop({ ...US_TOWN_ROUTES[key], meters: 1609 });
    } else if (name === "plan-autoloop-loading") {
      const center = US_TOWN_ROUTES.gulfport.center;
      state.settings.lastKnown = { ...center, accuracy: 18, at: Date.now() };
      state.settings.locationDisclosureAccepted = true;
      persist();
      setTab("today");
      showScreen("today");
      try { map.setCenter(center.lat, center.lon, 15); } catch { /* map may still be starting */ }
      showMapBanner("Loading paths…");
      if ($("plan-create-note")) $("plan-create-note").textContent = "Loading paths…";
    } else if (name === "plan-autoloop-nolocation") {
      state.settings.lastKnown = null;
      persist();
      setTab("today");
      showScreen("today");
      showMapBanner("Tap the map to set the start of your loop");
    } else if (name === "builder-satellite" || name === "map-satellite") {
      await showUsTownBuilder({ ...US_TOWN_ROUTES.gulfport, satellite: true });
    } else if (name === "attribution-open" || name === "attribution-flash") {
      setTab("today");
      showScreen("today");
      await waitMapReady();
      map.showAttribution();
      await new Promise((r) => setTimeout(r, 200));
    } else if (name === "attribution-compact") {
      setTab("today");
      showScreen("today");
      await waitMapReady();
      map.collapseAttribution();
      await new Promise((r) => setTimeout(r, 200));
    } else if (name === "attribution-satellite") {
      state.settings.mapStyle = "satellite";
      persist();
      applySavedMapStyle();
      setTab("today");
      showScreen("today");
      await waitMapReady();
      map.showAttribution();
      await new Promise((r) => setTimeout(r, 300));
    } else if (name === "builder-gulfport" || name === "builder-oak-park" || name === "builder-holland") {
      const key = name === "builder-oak-park" ? "oak-park" : (name === "builder-holland" ? "holland" : "gulfport");
      await showUsTownBuilder({ ...US_TOWN_ROUTES[key], satellite: false });
    } else if (name === "builder-loading-paths") {
      // Start a route in a fresh town and return while the graph is still loading.
      const pins = [{ lat: 43.3035, lon: -91.7860 }, { lat: 43.3052, lon: -91.7832 }]; // Decorah, IA
      const center = { lat: 43.3044, lon: -91.7846 };
      state.settings.lastKnown = { ...center, accuracy: 18, at: Date.now() };
      state.settings.locationDisclosureAccepted = true;
      state.settings.mapStyle = "map";
      persist();
      ui.lockWalkGraph = false;
      ui.findingPaths = false;
      ui.builderRoute = null;
      ui.straightOverrides = new Set();
      ui.builder = emptyBuilderState();
      for (const pin of pins) placePin(ui.builder, pin);
      ui.builderPins = ui.builder.pins;
      setTab("today");
      showScreen("builder");
      map.setCenter(center.lat, center.lon, 16);
      renderBuilder();
    } else if (name === "goals") {
      const now = new Date("2026-11-18T18:00:00");
      state.goals = [
        newGoal({ name: "Weekly distance", kind: "week-distance", period: "week", distanceMeters: 10 * METERS_PER_MILE }),
        newGoal({ name: "Monthly runs", kind: "month-count", period: "month", targetCount: 12 }),
      ];
      persist();
      showScreen("goals");
      renderGoalsScreen();
    } else if (name === "plans" || name === "plans-water" || name === "plans-teaser") {
      if (name === "plans-teaser") state.planLibrary = [];
      showScreen("plans");
      if (name === "plans-teaser") {
        const days = $("plan-days");
        if (days) days.value = "56";
        const runBtn = document.querySelector("#plan-type-tog button[data-type='run']");
        if (runBtn) runBtn.click();
        const dist = $("plan-distance");
        if (dist) {
          dist.value = "10";
          dist.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
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
    } else if (name === "summary-laps") {
      const fixture = makeLapSummaryFixture();
      const course = fixture.course;
      state.courses = [course, ...(state.courses || []).filter((c) => c.id !== course.id)];
      persist();
      showSummary(fixture.act, course, null);
      document.querySelectorAll(".sector-expand").forEach((el) => { el.open = true; });
    } else if (name === "summary-laps-details") {
      const fixture = makeLapSummaryFixture();
      const course = fixture.course;
      state.courses = [course, ...(state.courses || []).filter((c) => c.id !== course.id)];
      persist();
      showSummary(fixture.act, course, null);
      openSummaryDetails();
    } else if (name === "summary-sectors-details") {
      const fixture = makeSectorFixture();
      const course = fixture.course;
      state.courses = [course, ...(state.courses || []).filter((c) => c.id !== course.id)];
      persist();
      const act = newActivity({
        type: "run",
        courseId: course.id,
        courseName: course.name,
        startedAt: "2026-11-18T09:00:00.000Z",
        endedAt: "2026-11-18T09:29:22.300Z",
        distanceMeters: fixture.meters,
        elapsedSec: fixture.totalSec,
        track: fixture.track,
      });
      showSummary(act, course, null);
      openSummaryDetails();
    } else if (name === "summary-sectors") {
      const fixture = makeSectorFixture();
      const course = fixture.course;
      state.courses = [course, ...(state.courses || []).filter((c) => c.id !== course.id)];
      persist();
      const act = newActivity({
        type: "run",
        courseId: course.id,
        courseName: course.name,
        startedAt: "2026-11-18T09:00:00.000Z",
        endedAt: "2026-11-18T09:29:22.300Z",
        distanceMeters: fixture.meters,
        elapsedSec: fixture.totalSec,
        track: fixture.track,
      });
      showSummary(act, course, null);
    } else if (name === "tracking-sectors") {
      const fixture = makeSectorFixture();
      const course = fixture.course;
      course.sectorCallout = false;
      state.courses = [course, ...(state.courses || []).filter((c) => c.id !== course.id)];
      persist();
      const made = await window.HeldpathTest.show("tracking", opt);
      const sess = track.getSession && track.getSession();
      if (sess) {
        const sector1 = fixture.track.filter((p) => p.t <= fixture.sectorSeconds[0] + 0.05);
        sess.courseId = course.id;
        sess.courseName = course.name;
        sess.coursePins = course.pins;
        sess.coursePath = course.path || course.pins;
        sess.courseGoal = course.goal;
        sess.sectorPbs = course.sectorPbs;
        sess.sectorHistory = course.sectorHistory;
        sess.track = sector1;
        sess.distanceMeters = fixture.sectorMeters[0];
        sess.elapsedSec = fixture.sectorSeconds[0];
      }
      ui.sectorTraveled = 0;
      ui.sectorFlashSticky = false;
      paintSectorFlash(track.getSession() || made || sess);
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
      // Dense trace so the start/finish gate can see every sector in order.
      const sampleCount = Math.max(48, Math.ceil(along / 6));
      const trace = [];
      for (let i = 0; i <= sampleCount; i++) {
        const d = (along * i) / sampleCount;
        const p = pointAlongPath(tplan.path, d) || tplan.path[0];
        trace.push({ lat: p.lat, lon: p.lon, t: (420 * i) / sampleCount });
      }
      Object.assign(made, {
        track: trace,
        distanceMeters: along,
        elapsedSec: 420,
        courseTraveledMeters: along,
        startDetected: true,
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
        paintCourseLegs(course.legs, pts, { id: "course-line", width: 5 });
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
      openSummaryDetails();
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
  builderSnapshot: () => {
    const note = $("route-fallback-note");
    const legs = (ui.builderRoute && ui.builderRoute.legs) || [];
    return {
      findingPaths: !!ui.findingPaths,
      hasToggle: !!$("toggle-follow-paths"),
      note: (note && !note.hidden) ? (note.textContent || "") : "",
      legs: legs.map((l) => ({
        mode: l.mode,
        reason: l.reason || null,
        pathMode: l.pathMode || null,
        note: l.note || null,
        longDetour: !!l.longDetour,
        meters: l.meters,
        points: (l.points || []).length,
      })),
      meters: ui.builderRoute && ui.builderRoute.meters,
      unroutable: !!(ui.builderRoute && ui.builderRoute.unroutable),
      pins: ((ui.builder && ui.builder.pins) || []).map((p) => ({
        pathMode: p.pathMode || "on",
        role: p.role,
      })),
      pathModeCoach: !!(document.getElementById("path-mode-coach") && !document.getElementById("path-mode-coach").hidden),
      detourHint: !!(document.getElementById("route-detour-hint") && !document.getElementById("route-detour-hint").hidden),
      detourHintText: (() => {
        const n = document.getElementById("route-fallback-note");
        return n && !n.hidden ? (n.textContent || "") : "";
      })(),
      switchVisible: !!(document.getElementById("btn-switch-pin-green") && !document.getElementById("btn-switch-pin-green").hidden),
    };
  },
  builderGeometry: () => {
    const toPt = (p) => (p && Number.isFinite(Number(p.lat)) ? { lat: Number(p.lat), lon: Number(p.lon) } : null);
    const pins = ((ui.builder && ui.builder.pins) || []).map(toPt).filter(Boolean);
    const routed = ui.builderRoute || {};
    const path = (routed.path || []).map(toPt).filter(Boolean);
    const dist = (a, b) => {
      if (!a || !b) return Infinity;
      const dlat = (a.lat - b.lat) * 111320;
      const dlon = (a.lon - b.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180);
      return Math.sqrt(dlat * dlat + dlon * dlon);
    };
    const distToPath = (pin) => {
      let best = Infinity;
      for (let i = 0; i < path.length; i++) {
        const d = dist(pin, path[i]);
        if (d < best) best = d;
        if (i + 1 < path.length) {
          // rough point-to-segment
          const a = path[i], b = path[i + 1];
          const vx = (b.lat - a.lat), vy = (b.lon - a.lon);
          const len2 = vx * vx + vy * vy;
          const t = len2 > 0 ? Math.max(0, Math.min(1, ((pin.lat - a.lat) * vx + (pin.lon - a.lon) * vy) / len2)) : 0;
          const d2 = dist(pin, { lat: a.lat + vx * t, lon: a.lon + vy * t });
          if (d2 < best) best = d2;
        }
      }
      return best;
    };
    const m = typeof map.getMap === "function" ? map.getMap() : null;
    const lineLayers = [];
    if (m && m.getStyle && m.getStyle()) {
      for (const layer of m.getStyle().layers || []) {
        if (/build-line|route-line|preview/i.test(layer.id)) {
          const src = m.getSource(layer.id);
          let n = 0;
          try {
            const data = src && src._data;
            const feats = data && data.features || [];
            n = feats.reduce((s, f) => s + ((f.geometry && f.geometry.coordinates) || []).length, 0);
          } catch { /* ignore */ }
          lineLayers.push({ id: layer.id, type: layer.type, coords: n });
        }
      }
    }
    return {
      endIndex: ui.builder ? ui.builder.endIndex : null,
      findingPaths: !!ui.findingPaths,
      meters: routed.meters,
      pins,
      pinDistToPath: pins.map((p, i) => ({ i, dist: Math.round(distToPath(p) * 10) / 10 })),
      legs: (routed.legs || []).map((l) => ({
        mode: l.mode,
        meters: Math.round(l.meters || 0),
        n: (l.points || []).length,
        first: toPt((l.points || [])[0]),
        last: toPt((l.points || [])[(l.points || []).length - 1]),
      })),
      pathPoints: path.length,
      lineLayers,
      pinScreen: pins.map((pin, i) => {
        const proj = m && m.project ? m.project([pin.lon, pin.lat]) : null;
        const origin = m && m.getContainer ? m.getContainer().getBoundingClientRect() : { left: 0, top: 0 };
        const el = document.querySelectorAll(".pp-map-marker.pin")[i];
        const r = el ? el.getBoundingClientRect() : null;
        const tip = r ? { x: r.left + r.width / 2 - origin.left, y: r.bottom - origin.top } : null;
        return {
          i,
          dx: tip && proj ? Math.round((tip.x - proj.x) * 10) / 10 : null,
          dy: tip && proj ? Math.round((tip.y - proj.y) * 10) / 10 : null,
          tipX: tip ? Math.round(tip.x * 10) / 10 : null,
          tipY: tip ? Math.round(tip.y * 10) / 10 : null,
          projX: proj ? Math.round(proj.x * 10) / 10 : null,
          projY: proj ? Math.round(proj.y * 10) / 10 : null,
          position: el ? getComputedStyle(el).position : null,
        };
      }),
      zoom: m && m.getZoom ? m.getZoom() : null,
      openSheets: Array.from(document.querySelectorAll(".sheet-back.open")).map((el) => el.id),
    };
  },
  setMapView: async (lat, lon, zoom) => {
    map.setCenter(lat, lon, zoom);
    if (typeof map.whenIdle === "function") await map.whenIdle();
    else await new Promise((r) => setTimeout(r, 400));
  },
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
  initPlansUi({
    getState: () => state,
    persist,
    units,
    openShare: (plan) => openShareSheet("plan", plan),
    getCenter: () => (state.settings.lastKnown && state.settings.lastKnown.lat != null ? { lat: state.settings.lastKnown.lat, lon: state.settings.lastKnown.lon } : null),
    resolveLoopCenter,
    showPlanRoute: (plan) => openPlanRoute(plan, { from: "plans" }),
    preloadLoopGraph: (c, meters) => ensureSportLoopGraph(c, meters),
  });
  /* heldpath-hook: import — Settings import review and summary/course export cards */
  initImportUi({
    getState: () => state,
    persist,
    units,
    onChanged: () => {
      if (ui.screen === "progress") renderProgress();
      if (ui.screen === "calendar") renderCalendar();
      if (ui.screen === "settings") renderSettings();
    },
  });
  initExportUi({
    getSummary: () => ui.summary,
    getCourse: () => courseById(ui.courseId),
    units,
  });
  renderSettings();
  try {
    if (Capacitor.isNativePlatform()) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#12161C" });
    }
  } catch { /* web */ }
  const graphReady = ensureWalkGraph();
  const launchView = viewForLaunch({ lastKnown: state.settings.lastKnown });
  await map.initMap($("map"), {
    center: launchView,
    zoom: launchView.zoom,
    mapStyle: state.settings.mapStyle === "satellite" ? "satellite" : "map",
  });
  await graphReady;
  map.whenReady(() => {
    applyLaunchView(null, { animate: false });
    applySavedMapStyle();
    maybeStartLiveLocation();
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
