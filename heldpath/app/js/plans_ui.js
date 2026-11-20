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
  WATER_DISCLAIMER,
  reminderTimesFor,
  normaliseReminderTimes,
  isNightTime,
  mlToOz,
  ozToMl,
} from "./plan_progress.js";
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
import { OWNERSHIP_COPY, creditsRemaining } from "./iap.js";

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

function readGoal() {
  const days = Math.max(1, Math.round(Number($("plan-days").value) || 14));
  const routeValue = $("plan-route").value;
  const course = routeValue !== "auto" ? courseById(routeValue) : null;
  const bodyRaw = $("plan-body").value.trim();
  const bodyKg = bodyRaw === "" ? null : Math.max(30, Math.min(250, Number(bodyRaw) || 0)) || null;
  const name = ($("plan-title").value || "").trim();
  return {
    activityType: ui.type,
    goalDistanceMeters: ui.distanceMeters,
    windowDays: days,
    course,
    autoLoop: !course,
    bodyKg,
    name,
  };
}

function draftForGoal(goal) {
  const draft = buildPlanDraft(goal);
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

function fillPreview(draft) {
  const u = units();
  const s = draft.schedule;
  const legs = s.legTargetsSec || [];
  const target = s.initialTargetSec;
  const pace = formatPace(s.sessionDistanceMeters, target, u);
  const effort = s.effort || {};
  const rows = [];
  rows.push(`<div class="plan-stat"><span>Session</span><strong>${formatDistance(s.sessionDistanceMeters, u)} · ${formatDuration(s.sessionDurationSec)}</strong></div>`);
  rows.push(`<div class="plan-stat"><span>Schedule</span><strong>${s.sessionDates.length} sessions over ${draft.goal.windowDays} days</strong></div>`);
  rows.push(`<div class="plan-stat"><span>Pace target</span><strong>${pace}</strong></div>`);
  if (legs.length) {
    rows.push(`<div class="plan-stat"><span>Per-leg targets</span><strong>${legs.map((s) => formatDuration(s)).join(" · ")}</strong></div>`);
  }
  rows.push(`<div class="plan-stat"><span>Effort (plan)</span><strong>${effort.mets || "—"} METs · ~${effort.kcal || 0} kcal</strong></div>`);
  if (s.vdot && s.trainingPaces) {
    rows.push(`<div class="plan-stat"><span>VDOT</span><strong>${s.vdot} · easy ${formatPace(1609.344, s.trainingPaces.easy.secPerMile, "mi")}</strong></div>`);
  }
  rows.push(`<div class="plan-stat"><span>Water</span><strong>${draft.water.dailyMl} ml session day · ${draft.water.restDayMl} ml rest day</strong></div>`);
  rows.push(`<div class="plan-stat"><span>Route</span><strong>${draft.route.mode === "course" ? "Saved course" : "Auto loop"} · ${formatDistance(pathLengthMeters(draft.route.pins), u)}</strong></div>`);
  $("plan-preview").innerHTML = rows.join("");
  const mix = s.mix;
  if (mix) {
    $("plan-preview").insertAdjacentHTML("beforeend", `<p class="tiny" style="margin-top:10px">${esc(mix.label)}</p>`);
  }
}

function renderOwnership() {
  $("plan-own-copy").textContent = OWNERSHIP_COPY;
}

function renderCreditNote() {
  const credits = creditsRemaining();
  $("plan-create-note").textContent = credits > 0
    ? `${credits} unused plan credit${credits === 1 ? "" : "s"} on this phone. Creating a plan uses one.`
    : "No credit yet. Creating a plan buys one $2 credit first (stub in this build). Importing a shared plan stays free.";
  $("btn-plan-create").textContent = credits > 0 ? "Create plan · use 1 credit" : "Create plan · $2 one time";
}

function renderWater(draft) {
  const plan = newestPlan();
  const source = plan || draft;
  const ml = source.water.dailyMl;
  $("plan-water").textContent = plan
    ? `${plan.title}: ${ml} ml on a session day, ${plan.water.restDayMl || plan.water.baselineMl} ml on a rest day.`
    : `${ml} ml on a session day, ${draft.water.restDayMl} ml on a rest day.`;
  $("plan-water-disclaimer").textContent = WATER_DISCLAIMER;
  $("plan-water-ml").value = String(ml);
  $("plan-water-oz").value = String(mlToOz(ml));
  const times = reminderTimesFor(source);
  $("plan-reminder-times").value = times.join(", ");
  $("plan-reminder-note").textContent = times.length
    ? `Drink reminders: ${times.join(", ")}. ${times.some((t) => isNightTime(t)) ? "Includes a night time you added." : "No night alerts unless you add them."} On-device only.`
    : "No reminder times set.";
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
  const draft = draftForGoal(readGoal());
  ui.preview = draft;
  fillPreview(draft);
  renderWater(draft);
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
        <button class="btn btn-secondary" data-remove-plan="${esc(plan.id)}">Remove</button>
      </div>`;
    root.appendChild(el);
  }
}

/* ——— Actions ——— */

async function createPlan() {
  const goal = readGoal();
  $("plan-create-note").textContent = "Creating…";
  const res = await createPlanForGoal(goal);
  if (!res.ok) {
    $("plan-create-note").textContent = res.error === "purchase_failed"
      ? "The store could not be reached. Nothing was charged."
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
  $("plan-reminder-note").textContent = remind.ok
    ? `Drink reminders scheduled on this phone: ${reminderTimesFor(res.plan).join(", ")}.`
    : `${reminderPayloadFor(res.plan).length} reminder times saved. They run on the phone once the app is installed.`;
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
  renderWater(ui.preview || buildPlanDraft(readGoal()));
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
  addPlanToState(state(), res.plan);
  ctx.persist();
  ui.selectedPlanId = res.plan.id;
  await syncReminders(res.plan);
  renderPlansScreen();
  $("plan-import-note").textContent = "Plan imported free. It is on this phone and its sessions are on your Calendar. No credit was used.";
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
  $("plan-title").addEventListener("input", updatePreview);
  $("btn-plan-create").addEventListener("click", () => { createPlan().catch(() => {}); });
  $("btn-plan-water-save").addEventListener("click", () => { saveWater().catch(() => {}); });
  $("plan-water-ml").addEventListener("input", () => {
    const ml = Number($("plan-water-ml").value) || 0;
    $("plan-water-oz").value = String(mlToOz(ml));
  });
  $("plan-water-oz").addEventListener("input", () => {
    const oz = Number($("plan-water-oz").value) || 0;
    $("plan-water-ml").value = String(ozToMl(oz));
  });
  $("btn-plan-export").addEventListener("click", () => { exportPlan(newestPlan()).catch(() => {}); });
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
    const rm = e.target.closest("[data-remove-plan]");
    if (rm) removePlan(rm.dataset.removePlan);
  });
}

export function initPlansUi(context) {
  ctx = context;
  bind();
}

export function renderPlansScreen() {
  if (!ctx) return;
  if (!Array.isArray(state().planLibrary)) state().planLibrary = [];
  renderOwnership();
  renderRouteOptions();
  const u = units();
  $("plan-dist-unit").textContent = u;
  if (document.activeElement !== $("plan-distance")) {
    $("plan-distance").value = fmtNum(ui.distanceMeters / unitFactor(), u === "km" ? 2 : 1);
  }
  renderPlanList();
  updatePreview();
}
