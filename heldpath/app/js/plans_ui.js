/**
 * Plans screen wiring. Kept out of app.js so the calendar, Today, Courses,
 * Progress and tracking code stay untouched. The engine lives in
 * plan_progress.js and plans.js; this file only reads/writes those objects.
 */
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  formatDistance,
  formatDuration,
  formatPace,
  pathLengthMeters,
  METERS_PER_MILE,
  METERS_PER_KM,
} from "./util.js";
import {
  buildPlanDraft,
  planTeaserModel,
  WATER_DISCLAIMER,
  reminderTimesFor,
  buildAutoLoop,
  AUTO_LOOP_FAIL_COPY,
  normaliseReminderTimes,
  isNightTime,
  mlToOz,
  ozToMl,
} from "./plan_progress.js";
import {
  defaultWeightUnit,
  parseWeightInput,
  formatWeightInput,
} from "./body_weight.js";
import {
  createPlanForGoal,
  addPlanToState,
  removePlanFromState,
  exportFileName,
  serialisePlanFile,
  importPlanFile,
  scheduleDrinkReminders,
  updateWaterTarget,
  reminderPayloadFor,
} from "./plans.js";
import { ensureWalkGraph } from "./area_graphs.js";
import { overlapPlanCopy, overlappingDates } from "./calendar_conflict.js";
import { OWNERSHIP_COPY, creditsRemaining } from "./iap.js";
import { exactCourseRoute, buildEvenPaceLegTargets, describeLegPlan } from "./plan_legs.js";
import {
  formatWaterLine,
  loadWaterPrefs,
  saveWaterPrefs,
  logOneBottle,
  todayLoggedMl,
  recommendWaterTarget,
  readCachedTemperature,
  WATER_CALC_NOTE,
  WATER_NOT_MEDICAL,
  normaliseBottleOz,
  defaultWaterUnit,
} from "./water_units.js";

let ctx = null;
let bound = false;

const ui = {
  type: "walk",
  distanceMeters: 10 * METERS_PER_MILE,
  waterOverrideMl: null,
  reminderOverride: null,
  selectedPlanId: null,
  preview: null,
};

const $ = (id) => document.getElementById(id);

function state() {
  return ctx.getState();
}

function units() {
  return ctx.units ? ctx.units() : state().settings?.units || "mi";
}

function unitFactor() {
  return units() === "km" ? METERS_PER_KM : METERS_PER_MILE;
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtNum(n, digits = 1) {
  const v = Number(n) || 0;
  return String(Number(v.toFixed(digits)));
}

function courseById(id) {
  return (state().courses || []).find((c) => c.id === id) || null;
}

function newestPlan() {
  const list = state().planLibrary || [];
  if (!list.length) return null;
  if (ui.selectedPlanId) {
    const found = list.find((p) => p.id === ui.selectedPlanId);
    if (found) return found;
  }
  return list[list.length - 1];
}

function notificationsPlugin() {
  return Capacitor.isNativePlatform() ? LocalNotifications : null;
}

async function syncReminders(plan) {
  const notifications = notificationsPlugin();
  if (notifications) {
    try {
      await notifications.requestPermissions();
    } catch {
      // The reminder times are still saved in the plan if permission is denied.
    }
  }
  return scheduleDrinkReminders(plan, { notifications });
}

/* ——— Draft / preview ——— */

function userCenter() {
  const c = ctx && ctx.getCenter && ctx.getCenter();
  if (c && Number.isFinite(Number(c.lat)) && Number.isFinite(Number(c.lon))) {
    return { lat: Number(c.lat), lon: Number(c.lon) };
  }
  return null;
}

function localeNow() {
  return (typeof navigator !== "undefined" && navigator.language) || "en-US";
}

function currentWeightUnit() {
  const remembered = state().settings && state().settings.weightUnit;
  return defaultWeightUnit({ locale: localeNow(), units: units(), remembered });
}

function persistBodyFromForm() {
  const input = $("plan-body");
  const unit = currentWeightUnit();
  const kg = parseWeightInput(input && input.value, unit);
  const st = state().settings;
  if (st) {
    st.weightUnit = unit;
    st.bodyKg = kg;
    if (ctx && ctx.persist) ctx.persist();
  }
  return kg;
}

function paintBodyWeightField({ force = false } = {}) {
  const unit = currentWeightUnit();
  document.querySelectorAll("#plan-body-unit-tog button").forEach((b) => {
    b.classList.toggle("active", b.dataset.unit === unit);
  });
  const input = $("plan-body");
  if (!input) return;
  if (!force && document.activeElement === input) return;
  const kg = state().settings && state().settings.bodyKg;
  input.value = kg ? formatWeightInput(kg, unit) : (force ? "" : input.value);
}

function setWeightUnit(next) {
  const prev = currentWeightUnit();
  const typed = parseWeightInput($("plan-body") && $("plan-body").value, prev);
  const kg = typed || (state().settings && state().settings.bodyKg) || null;
  if (state().settings) {
    state().settings.weightUnit = next === "kg" ? "kg" : "lb";
    state().settings.bodyKg = kg;
    if (ctx && ctx.persist) ctx.persist();
  }
  paintBodyWeightField({ force: true });
  updatePreview();
}

function readGoal() {
  const days = Math.max(1, Math.round(Number($("plan-days").value) || 14));
  const routeValue = $("plan-route").value;
  const course = routeValue !== "auto" ? courseById(routeValue) : null;
  const bodyKg = persistBodyFromForm();
  const name = ($("plan-title").value || "").trim();
  return {
    activityType: ui.type,
    goalDistanceMeters: ui.distanceMeters,
    windowDays: days,
    course,
    autoLoop: !course,
    bodyKg,
    name,
    center: userCenter() || undefined,
  };
}

function draftForGoal(goal) {
  const draft = buildPlanDraft(goal);
  if (goal && goal.course && goal.course.pins && goal.course.pins.length >= 2 && !goal.autoLoop) {
    // Saved custom pin routes are accepted as-is: never scaled or repeated.
    const exact = exactCourseRoute(goal.course);
    const pins = exact.pins || goal.course.pins;
    const path = exact.path || goal.course.path || null;
    const meters = pathLengthMeters(path && path.length >= 2 ? path : pins);
    draft.route = {
      ...draft.route,
      mode: "course",
      courseId: goal.course.id || null,
      pins,
      path,
      targetLengthMeters: meters,
      scaleFactor: 1,
      repeatTimes: 1,
    };
    draft.schedule.sessionDistanceMeters = meters;
    const totalSec = draft.schedule.initialTargetSec || draft.schedule.sessionDurationSec;
    const even = buildEvenPaceLegTargets(pins, totalSec, { path });
    draft.schedule.legTargetsSec = even.map((l) => (typeof l === "number" ? l : l.targetSec));
    draft.legPlan = describeLegPlan(pins, {
      targetSec: totalSec,
      path,
      units: units(),
    });
  }
  if (ui.waterOverrideMl != null) {
    draft.water.dailyMl = ui.waterOverrideMl;
    draft.water.userAdjusted = true;
  }
  if (ui.reminderOverride && ui.reminderOverride.length) {
    draft.water.reminderLocalTimes = ui.reminderOverride.slice();
    draft.water.allowNight = ui.reminderOverride.some((t) => isNightTime(t));
  }
  return draft;
}

function fillTeaser(goal) {
  const root = $("plan-preview");
  if (!root) return;
  const model = planTeaserModel(goal, { units: units(), formatDistance });
  const includes = model.includes.map((item) => `<li>${esc(item)}</li>`).join("");
  const bars = [72, 58, 81, 46, 64].map((w) => (
    `<div class="plan-teaser-row"><span class="plan-teaser-ghost"></span><span class="plan-teaser-bar" style="width:${w}%"></span></div>`
  )).join("");
  root.innerHTML = `<div class="plan-teaser" data-testid="plan-teaser">
      <div class="plan-teaser-stat"><span>Your goal</span><strong>${esc(model.goalLabel)}</strong></div>
      <div class="plan-teaser-stat"><span>Plan length</span><strong>${esc(model.lengthLabel)}</strong></div>
      <div>
        <span class="tiny">What's included</span>
        <ul class="plan-teaser-includes">${includes}</ul>
      </div>
      <div class="plan-teaser-lock">
        <div class="plan-teaser-steps" aria-hidden="true">${bars}</div>
        <div class="plan-teaser-veil">Unlock to see your guided steps</div>
      </div>
    </div>`;
}

function renderOwnership() {
  $("plan-own-copy").textContent = OWNERSHIP_COPY;
}

function renderCreditNote() {
  const credits = creditsRemaining();
  const note = $("plan-create-note");
  const current = (note && note.textContent) || "";
  const busy = /Loading paths|Couldn't build a loop|Getting your location|Tap the map to set the start|Turn on location/i.test(current);
  if (!busy) {
    note.textContent = credits > 0
      ? `${credits} unused plan credit${credits === 1 ? "" : "s"} on this phone. Creating a plan uses one.`
      : "No credit yet. Creating a plan buys one $2 credit first (stub in this build). Importing a shared plan stays free.";
  }
  $("btn-plan-create").textContent = credits > 0 ? "Create plan · use 1 credit" : "Create plan · $2";
}

function waterPrefs() {
  const u = units();
  return loadWaterPrefs(undefined, { units: u, locale: (typeof navigator !== "undefined" && navigator.language) || "en-US" });
}

function renderWater(draft) {
  const plan = newestPlan();
  const locked = $("plan-water-locked");
  const open = $("plan-water-open");
  if (!plan) {
    if (locked) locked.hidden = false;
    if (open) open.hidden = true;
    if ($("plan-water-line")) $("plan-water-line").textContent = "";
    if ($("plan-water")) $("plan-water").textContent = "";
    if ($("plan-water-ml")) $("plan-water-ml").value = "";
    if ($("plan-water-oz")) $("plan-water-oz").value = "";
    if ($("plan-water-recommend-box")) $("plan-water-recommend-box").hidden = true;
    if ($("plan-water-recommend-line")) $("plan-water-recommend-line").textContent = "";
    return;
  }
  if (locked) locked.hidden = true;
  if (open) open.hidden = false;
  const source = plan || draft;
  const ml = source.water.dailyMl;
  const prefs = waterPrefs();
  if ($("plan-water-line")) $("plan-water-line").textContent = formatWaterLine(ml, prefs);
  if ($("plan-water")) {
    $("plan-water").textContent = plan
      ? `${plan.title}: ${formatWaterLine(ml, prefs)} on a session day.`
      : `${formatWaterLine(ml, prefs)} on a session day.`;
  }
  $("plan-water-disclaimer").textContent = WATER_DISCLAIMER;
  $("plan-water-ml").value = String(ml);
  $("plan-water-oz").value = String(mlToOz(ml));
  if ($("plan-water-unit")) $("plan-water-unit").value = prefs.unit || defaultWaterUnit({ units: units() });
  if ($("plan-water-bottle")) {
    const bottle = prefs.bottleOz || 16.9;
    const known = ["16.9", "20", "24", "32", "40"];
    $("plan-water-bottle").value = known.includes(String(bottle)) ? String(bottle) : "custom";
    if ($("plan-water-bottle-custom-wrap")) $("plan-water-bottle-custom-wrap").hidden = $("plan-water-bottle").value !== "custom";
    if ($("plan-water-bottle-custom")) $("plan-water-bottle-custom").value = String(bottle);
  }
  const logged = todayLoggedMl();
  if ($("plan-water-logged")) {
    $("plan-water-logged").textContent = logged > 0
      ? `Today: ${formatWaterLine(logged, prefs)} logged.`
      : "Nothing logged today. Tap +1 bottle to record a drink.";
  }
  const times = reminderTimesFor(source);
  if ($("plan-reminder-times")) $("plan-reminder-times").value = times.join(", ");
  if ($("plan-reminder-note")) {
    $("plan-reminder-note").textContent = times.length
      ? `Drink reminders: ${times.join(", ")}. ${times.some((t) => isNightTime(t)) ? "Includes a night time you added." : "No night alerts unless you add them."} On-device only.`
      : "No reminder times set.";
  }
}

function persistWaterPrefsFromForm() {
  const prefs = waterPrefs();
  if ($("plan-water-unit")) prefs.unit = $("plan-water-unit").value || prefs.unit;
  if ($("plan-water-bottle")) {
    const v = $("plan-water-bottle").value;
    prefs.bottleOz = v === "custom"
      ? normaliseBottleOz(Number($("plan-water-bottle-custom") && $("plan-water-bottle-custom").value))
      : normaliseBottleOz(Number(v));
  }
  saveWaterPrefs(prefs);
  return prefs;
}

function onLogOneBottle() {
  if (!newestPlan()) return;
  const prefs = persistWaterPrefsFromForm();
  logOneBottle(prefs);
  renderWater();
}

function onRecommendWater() {
  const plan = newestPlan();
  if (!plan) return;
  const box = $("plan-water-recommend-box");
  if (!box) return;
  box.hidden = false;
  const prefs = persistWaterPrefsFromForm();
  const hours = (plan.schedule && plan.schedule.sessionDurationSec)
    ? plan.schedule.sessionDurationSec / 3600
    : 1;
  const cached = readCachedTemperature();
  const rec = recommendWaterTarget({
    sessionHours: hours,
    tempC: cached && cached.tempC,
    bodyKg: (readGoal().bodyKg != null ? readGoal().bodyKg : (state().settings && state().settings.bodyKg)) || null,
  });
  ui.pendingWaterRec = rec;
  if ($("plan-water-recommend-line")) $("plan-water-recommend-line").textContent = formatWaterLine(rec.dailyMl, prefs);
  if ($("plan-water-recommend-how")) $("plan-water-recommend-how").textContent = WATER_CALC_NOTE;
  if ($("plan-water-recommend-disclaimer")) $("plan-water-recommend-disclaimer").textContent = WATER_NOT_MEDICAL;
}

function acceptWaterRecommendation() {
  const rec = ui.pendingWaterRec;
  if (!rec || !(rec.dailyMl > 0)) return;
  const ml = Math.max(500, Math.min(10000, Math.round(rec.dailyMl / 50) * 50));
  ui.waterOverrideMl = ml;
  const box = $("plan-water-recommend-box");
  if (box) box.hidden = true;
  const plan = newestPlan();
  if (plan) {
    updateWaterTarget(plan, { dailyMl: ml });
    if (ctx && ctx.persist) ctx.persist();
  }
  renderWater();
}

function adjustWaterRecommendation() {
  const rec = ui.pendingWaterRec;
  if (rec && rec.dailyMl > 0) {
    $("plan-water-ml").value = String(Math.round(rec.dailyMl / 50) * 50);
    $("plan-water-oz").value = String(mlToOz(Number($("plan-water-ml").value)));
  }
  if ($("plan-water-ml")) $("plan-water-ml").focus();
}

function renderRouteOptions() {
  const sel = $("plan-route");
  const current = sel.value;
  const courses = state().courses || [];
  const opts = [`<option value="auto">Auto loop around my area</option>`]
    .concat(courses.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} · ${formatDistance(pathLengthMeters(c.pins), units())}</option>`));
  sel.innerHTML = opts.join("");
  sel.value = courses.some((c) => c.id === current) ? current : "auto";
}

function updatePreview() {
  ui.preview = null;
  fillTeaser(readGoal());
  renderWater();
  renderCreditNote();
}

/* ——— Plans list ——— */

function renderPlanList() {
  const list = state().planLibrary || [];
  const root = $("plan-list");
  if (!list.length) {
    root.innerHTML = `<p class="tiny">No plans yet. A plan adds its sessions to your Calendar, with water targets and drink reminders. It stays on this phone, and the export file is your backup.</p>`;
    return;
  }
  root.innerHTML = "";
  for (const plan of list.slice().reverse()) {
    const u = units();
    const s = plan.schedule || {};
    const el = document.createElement("div");
    el.className = "plan-item";
    const next = (s.sessionDates || [])[0];
    const legs = plan.progression?.legTargetsSec || s.legTargetsSec || [];
    el.innerHTML = `<div class="plan-item-head">
        <h3>${esc(plan.title)}</h3>
        <span class="plan-owned">${plan.ownership?.state === "imported" ? "Imported free" : "Yours"}</span>
      </div>
      <p>${plan.activityType === "run" ? "Run" : "Walk"} · ${s.sessionDates?.length || 0} sessions · ${formatDistance(s.sessionDistanceMeters || 0, u)} each</p>
      <p class="tiny">${next ? "First session " + next + " · " : ""}${plan.water?.dailyMl || 2000} ml water target</p>
      ${legs.length ? `<p class="tiny">Per-leg targets: ${legs.map((x) => formatDuration(x)).join(" · ")}</p>` : ""}
      <div class="btn-row plan-item-actions">
        <button class="btn btn-secondary" data-export-plan="${esc(plan.id)}">Export</button>
        <button class="btn btn-secondary" data-share-plan="${esc(plan.id)}">Share link</button>
        <button class="btn btn-secondary" data-remove-plan="${esc(plan.id)}">Remove</button>
      </div>`;
    root.appendChild(el);
  }
}

/* ——— Actions ——— */

async function resolveAutoLoopCenter(noteEl) {
  let center = userCenter();
  if (center) return center;
  if (ctx && typeof ctx.resolveLoopCenter === "function") {
    if (noteEl) noteEl.textContent = "Getting your location…";
    center = await ctx.resolveLoopCenter({
      onNeedTap: () => {
        if (noteEl) noteEl.textContent = "Tap the map to set the start of your loop";
      },
    });
  }
  return center || null;
}

async function createPlan() {
  const goal = readGoal();
  const noteEl = $("plan-create-note");
  if (goal.autoLoop) {
    const center = await resolveAutoLoopCenter(noteEl);
    if (!center) {
      if (noteEl) noteEl.textContent = "Turn on location or tap the map to set a start point. Auto loop does not assume a city.";
      return;
    }
    goal.center = center;
    if (noteEl) noteEl.textContent = "Loading paths…";
    const loop = await buildAutoLoop(center, goal.goalDistanceMeters);
    if (!loop || loop.ok === false) {
      if (noteEl) noteEl.textContent = AUTO_LOOP_FAIL_COPY;
      return;
    }
    goal.loop = loop;
  }
  if (noteEl) noteEl.textContent = "Creating…";
  const res = await createPlanForGoal(goal);
  if (!res.ok) {
    if (noteEl) noteEl.textContent = res.error === "purchase_failed"
      ? "The store could not be reached. Nothing was charged."
      : res.error === "no-loop"
        ? AUTO_LOOP_FAIL_COPY
        : "Could not create the plan. Nothing was charged.";
    return;
  }
  if (ui.waterOverrideMl != null || (ui.reminderOverride && ui.reminderOverride.length)) {
    updateWaterTarget(res.plan, {
      ...(ui.waterOverrideMl != null ? { dailyMl: ui.waterOverrideMl } : {}),
      ...(ui.reminderOverride && ui.reminderOverride.length
        ? {
            reminderLocalTimes: ui.reminderOverride,
            allowNight: ui.reminderOverride.some((t) => isNightTime(t)),
          }
        : {}),
    });
  }
  const existingCreate = (state().plans || []).filter((p) => p.sourcePlanId !== res.plan.id);
  const overlapCreate = overlappingDates(res.plan.schedule && res.plan.schedule.sessionDates, existingCreate);
  addPlanToState(state(), res.plan, { courseName: goal.course?.name });
  ctx.persist();
  ui.selectedPlanId = res.plan.id;
  ui.waterOverrideMl = null;
  ui.reminderOverride = null;
  const remind = await syncReminders(res.plan);
  renderPlansScreen();
  $("plan-create-note").textContent = res.purchased
    ? "Plan created. A $2 credit was recorded on this phone; store checkout is not live in this build. Save or export it any time."
    : "Plan created with one credit. It is yours to keep, save and share.";
  const overlapCreateNote = overlapPlanCopy(overlapCreate);
  if (overlapCreateNote) $("plan-create-note").textContent += " " + overlapCreateNote;
  $("plan-reminder-note").textContent = remind.ok
    ? `Drink reminders scheduled on this phone: ${reminderTimesFor(res.plan).join(", ")}.`
    : `${reminderPayloadFor(res.plan).length} reminder times saved. They run on the phone once the app is installed.`;
  if (goal.autoLoop && ctx && typeof ctx.showPlanRoute === "function") {
    const row = (state().plans || []).find((p) => p.sourcePlanId === res.plan.id) || null;
    ctx.showPlanRoute(row || res.plan);
  }
}

async function saveWater() {
  const plan = newestPlan();
  const ml = Number($("plan-water-ml").value) || 0;
  const times = normaliseReminderTimes(String($("plan-reminder-times").value || "").split(","));
  const allowNight = times.some((t) => isNightTime(t));
  if (!plan) {
    ui.waterOverrideMl = Math.max(500, Math.min(10000, Math.round(ml / 50) * 50));
    ui.reminderOverride = times.length ? times : null;
    updatePreview();
    return;
  }
  updateWaterTarget(plan, {
    dailyMl: ml,
    ...(times.length ? { reminderLocalTimes: times, allowNight } : {}),
  });
  ctx.persist();
  const remind = await syncReminders(plan);
  renderWater();
  $("plan-reminder-note").textContent = remind.ok
    ? `Water target saved. Reminders on this phone: ${reminderTimesFor(plan).join(", ")}.`
    : `Water target saved. Reminder times: ${reminderTimesFor(plan).join(", ")}. On-device only.`;
}

async function exportPlan(plan) {
  if (!plan) return;
  const text = serialisePlanFile(plan);
  const name = exportFileName(plan);
  if (Capacitor.isNativePlatform()) {
    try {
      await Filesystem.writeFile({
        path: name,
        data: text,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      $("plan-import-note").textContent = `Saved ${name} to Documents. Anyone can import it for free.`;
      return;
    } catch {
      // Fall through to the browser download / clipboard path.
    }
  }
  try {
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    $("plan-import-note").textContent = `Exported ${name}. Importing it on any device is free.`;
  } catch {
    try {
      await navigator.clipboard.writeText(text);
      $("plan-import-note").textContent = "Could not download here; the plan file was copied to the clipboard instead.";
    } catch {
      $("plan-import-note").textContent = "Could not export on this device.";
    }
  }
}

async function importFile(file) {
  if (!file) return;
  const text = await file.text();
  const ids = (state().planLibrary || []).map((p) => p.id);
  const res = importPlanFile(text, { existingIds: ids });
  if (!res.ok) {
    $("plan-import-note").textContent = `That file could not be imported (${res.error}). Nothing was charged.`;
    return;
  }
  const existingImport = (state().plans || []).filter((p) => p.sourcePlanId !== res.plan.id);
  const overlapImport = overlappingDates(res.plan.schedule && res.plan.schedule.sessionDates, existingImport);
  addPlanToState(state(), res.plan);
  ctx.persist();
  ui.selectedPlanId = res.plan.id;
  await syncReminders(res.plan);
  renderPlansScreen();
  $("plan-import-note").textContent = "Plan imported free. It is on this phone and its sessions are on your Calendar. No credit was used.";
  const overlapImportNote = overlapPlanCopy(overlapImport);
  if (overlapImportNote) $("plan-import-note").textContent += " " + overlapImportNote;
}

function removePlan(planId) {
  const plan = (state().planLibrary || []).find((p) => p.id === planId);
  if (!plan) return;
  if (!window.confirm(`Remove “${plan.title}” from this phone? Your export file can be imported again for free.`)) return;
  removePlanFromState(state(), planId);
  if (ui.selectedPlanId === planId) ui.selectedPlanId = null;
  ctx.persist();
  renderPlansScreen();
  $("plan-import-note").textContent = "Plan removed from this phone. Import it again for free with Export/Import.";
}

/* ——— Bind / render ——— */

function bind() {
  if (bound) return;
  bound = true;
  $("plan-type-tog").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-type]");
    if (!b) return;
    ui.type = b.dataset.type === "run" ? "run" : "walk";
    document.querySelectorAll("#plan-type-tog button").forEach((x) => x.classList.toggle("active", x === b));
    ui.waterOverrideMl = null;
    updatePreview();
  });
  $("plan-days").addEventListener("change", updatePreview);
  $("plan-route").addEventListener("change", updatePreview);
  $("plan-distance").addEventListener("input", () => {
    const v = Number($("plan-distance").value) || 0;
    ui.distanceMeters = Math.max(0.1, v) * unitFactor();
    ui.waterOverrideMl = null;
    updatePreview();
  });
  $("plan-body").addEventListener("input", updatePreview);
  if ($("plan-body-unit-tog")) {
    $("plan-body-unit-tog").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-unit]");
      if (!b) return;
      setWeightUnit(b.dataset.unit);
    });
  }
  $("plan-title").addEventListener("input", updatePreview);
  $("btn-plan-create").addEventListener("click", () => { createPlan().catch(() => {}); });
  $("btn-plan-water-save").addEventListener("click", () => { persistWaterPrefsFromForm(); saveWater().catch(() => {}); });
  if ($("btn-water-log-bottle")) $("btn-water-log-bottle").addEventListener("click", () => onLogOneBottle());
  if ($("btn-water-recommend")) $("btn-water-recommend").addEventListener("click", () => onRecommendWater());
  if ($("btn-water-accept")) $("btn-water-accept").addEventListener("click", () => acceptWaterRecommendation());
  if ($("btn-water-adjust")) $("btn-water-adjust").addEventListener("click", () => adjustWaterRecommendation());
  if ($("plan-water-unit")) $("plan-water-unit").addEventListener("change", () => { persistWaterPrefsFromForm(); updatePreview(); });
  if ($("plan-water-bottle")) $("plan-water-bottle").addEventListener("change", () => {
    if ($("plan-water-bottle-custom-wrap")) $("plan-water-bottle-custom-wrap").hidden = $("plan-water-bottle").value !== "custom";
    persistWaterPrefsFromForm();
    updatePreview();
  });
  if ($("plan-water-bottle-custom")) $("plan-water-bottle-custom").addEventListener("change", () => { persistWaterPrefsFromForm(); updatePreview(); });
  $("plan-water-ml").addEventListener("input", () => {
    const ml = Number($("plan-water-ml").value) || 0;
    $("plan-water-oz").value = String(mlToOz(ml));
  });
  $("plan-water-oz").addEventListener("input", () => {
    const oz = Number($("plan-water-oz").value) || 0;
    $("plan-water-ml").value = String(ozToMl(oz));
  });
  $("btn-plan-export").addEventListener("click", () => { exportPlan(newestPlan()).catch(() => {}); });
  $("btn-plan-share").addEventListener("click", () => { sharePlan(newestPlan()); });
  $("btn-plan-import").addEventListener("click", () => $("plan-import-file").click());
  $("plan-import-file").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    importFile(f).catch(() => {}).finally(() => { e.target.value = ""; });
  });
  $("plan-list").addEventListener("click", (e) => {
    const ex = e.target.closest("[data-export-plan]");
    if (ex) {
      const plan = (state().planLibrary || []).find((p) => p.id === ex.dataset.exportPlan);
      exportPlan(plan).catch(() => {});
      return;
    }
    const sh = e.target.closest("[data-share-plan]");
    if (sh) {
      const plan = (state().planLibrary || []).find((p) => p.id === sh.dataset.sharePlan);
      sharePlan(plan);
      return;
    }
    const rm = e.target.closest("[data-remove-plan]");
    if (rm) removePlan(rm.dataset.removePlan);
  });
}


function sharePlan(plan) {
  if (!plan) {
    $("plan-import-note").textContent = "Create or import a plan first, then share a link.";
    return;
  }
  if (typeof ctx.openShare === "function") ctx.openShare(plan);
}

export function initPlansUi(context) {
  ctx = context;
  bind();
}

function kickPlanGraph() {
  const c = userCenter();
  if (!c) return;
  const meters = (ui && ui.distanceMeters) || 1609;
  if (typeof ctx.preloadLoopGraph === "function") {
    ctx.preloadLoopGraph(c, meters).catch(() => {});
  } else {
    ensureWalkGraph(c).catch(() => {});
  }
}

export function renderPlansScreen() {
  if (!ctx) return;
  kickPlanGraph();
  if (!Array.isArray(state().planLibrary)) state().planLibrary = [];
  renderOwnership();
  renderRouteOptions();
  const u = units();
  $("plan-dist-unit").textContent = u;
  if (document.activeElement !== $("plan-distance")) {
    $("plan-distance").value = fmtNum(ui.distanceMeters / unitFactor(), u === "km" ? 2 : 1);
  }
  paintBodyWeightField();
  renderPlanList();
  updatePreview();
}
