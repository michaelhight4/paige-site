/**
 * Heldpath plans: ownership, export/import, calendar rows and hydration
 * reminders. Pure JS so the planner can be unit-tested in Node and run
 * offline. Nothing here is AI-generated; see CREDITS.md for formulas.
 *
 * A new plan from a goal spends one $2 credit (iap.js). Importing a shared
 * .paceplan file is always free and never calls purchasePlanCredit.
 */
import {
  buildPlanDraft,
  buildLegTargets,
  legSplitsFromTrack,
  applySessionResult,
  reminderTimesFor,
  normaliseReminderTimes,
  WATER_DISCLAIMER,
} from "./plan_progress.js";
import { uid } from "./util.js";
import * as defaultIap from "./iap.js";

export const PLAN_FORMAT = "heldpath-plan";
export const PLAN_FORMAT_VERSION = 1;

const MAX_PLAN_PINS = 5000;
const MAX_SESSIONS = 1000;

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function cleanTitle(v) {
  return String(v == null ? "" : v).trim().slice(0, 120) || "Heldpath plan";
}

function cleanPins(raw, fallback = []) {
  if (!Array.isArray(raw)) return fallback;
  const out = [];
  for (const p of raw.slice(0, MAX_PLAN_PINS)) {
    if (!p || !Number.isFinite(Number(p.lat)) || !Number.isFinite(Number(p.lon))) continue;
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) continue;
    out.push({ lat, lon, role: p.role === "start" || p.role === "end" ? p.role : "via" });
  }
  if (!out.length) return fallback;
  out[0].role = "start";
  out[out.length - 1].role = "end";
  return out;
}

function cleanDates(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const d of raw.slice(0, MAX_SESSIONS)) {
    const s = String(d || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
    if (!out.includes(s)) out.push(s);
  }
  return out.sort();
}

/** Build a complete Plan object from a buildPlanDraft result. */
export function makePlan(draft, { id = uid("plan"), now = new Date(), ownership = null } = {}) {
  const iso = (now instanceof Date ? now : new Date(now)).toISOString();
  return {
    id,
    version: 1,
    title: cleanTitle(draft.title),
    createdAt: iso,
    updatedAt: iso,
    activityType: draft.activityType === "run" ? "run" : "walk",
    goal: { ...draft.goal },
    water: { ...draft.water, reminderLocalTimes: normaliseReminderTimes(draft.water?.reminderLocalTimes) },
    route: {
      ...draft.route,
      pins: cleanPins(draft.route?.pins),
      loop: {
        type: "LineString",
        coordinates: (draft.route?.pins || []).map((p) => [p.lon, p.lat]),
      },
    },
    schedule: { ...draft.schedule },
    progression: { ...draft.progression },
    ownership: ownership || { state: "owned" },
  };
}

/**
 * Create a new plan from a goal. Spends one credit; the stub buys one first
 * when the ledger is empty. Nothing is saved here; the caller writes state.
 */
export async function createPlanForGoal(goal = {}, { iapApi = defaultIap, now = new Date(), id = null } = {}) {
  const draft = buildPlanDraft({ ...goal, now });
  const plan = makePlan(draft, { id: id || uid("plan"), now });
  let purchased = false;
  if (!iapApi.hasCredit()) {
    const buy = await iapApi.purchasePlanCredit();
    if (!buy || !buy.ok) return { ok: false, error: "purchase_failed", detail: buy };
    purchased = true;
  }
  const redeem = iapApi.redeemCreditForPlan(plan.id);
  if (!redeem || !redeem.ok) return { ok: false, error: redeem?.error || "no_credit" };
  plan.ownership = {
    state: "owned",
    productId: iapApi.PLAN_PRODUCT_ID,
    purchasedAt: plan.createdAt,
  };
  return { ok: true, plan, purchased, credits: redeem.credits };
}

/** Deep-copy a plan without any purchase/secret tokens. */
export function planWithoutSecrets(plan) {
  const copy = JSON.parse(JSON.stringify(plan));
  delete copy.purchaseToken;
  if (copy.ownership) {
    delete copy.ownership.purchaseToken;
    delete copy.ownership.purchase_token;
    delete copy.ownership.transactionId;
    delete copy.ownership.receipt;
    copy.ownership = {
      state: copy.ownership.state === "imported" ? "imported" : "owned",
      ...(copy.ownership.productId ? { productId: copy.ownership.productId } : {}),
      ...(copy.ownership.purchasedAt ? { purchasedAt: copy.ownership.purchasedAt } : {}),
    };
  }
  // Defensive: no key that looks like a credential survives an export.
  const strip = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj)) {
      if (/token|receipt|secret|credential/i.test(k)) delete obj[k];
      else strip(obj[k]);
    }
  };
  strip(copy);
  return copy;
}

/** The PlanFile object written to a .paceplan file. */
export function planFileFor(plan, now = new Date()) {
  return {
    format: PLAN_FORMAT,
    formatVersion: PLAN_FORMAT_VERSION,
    exportedAt: (now instanceof Date ? now : new Date(now)).toISOString(),
    plan: planWithoutSecrets(plan),
  };
}

export function serialisePlanFile(plan, now = new Date()) {
  return JSON.stringify(planFileFor(plan, now), null, 2);
}

export function exportFileName(plan) {
  const slug = String(plan?.title || "plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "plan";
  return `heldpath-${slug}.paceplan`;
}

function sanitiseImportedPlan(raw) {
  if (!raw || typeof raw !== "object") return { ok: false, error: "missing_plan" };
  const activityType = raw.activityType === "run" ? "run" : raw.activityType === "walk" ? "walk" : null;
  if (!activityType) return { ok: false, error: "bad_activity" };
  const schedule = raw.schedule || {};
  const sessionDates = cleanDates(schedule.sessionDates);
  if (!sessionDates.length) return { ok: false, error: "bad_schedule" };
  const sessionMeters = num(schedule.sessionDistanceMeters);
  const sessionSec = num(schedule.sessionDurationSec);
  if (!(sessionMeters > 0) || !(sessionSec > 0)) return { ok: false, error: "bad_schedule" };

  const goal = raw.goal || {};
  const water = raw.water || {};
  const route = raw.route || {};
  const pins = cleanPins(route.pins);
  if (pins.length < 2) return { ok: false, error: "bad_route" };

  const dailyMl = num(water.dailyMl, 2000);
  const plan = {
    id: uid("plan"),
    version: 1,
    title: cleanTitle(raw.title),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activityType,
    goal: {
      kind: goal.kind === "time" || goal.kind === "both" ? goal.kind : "distance",
      distanceMeters: goal.distanceMeters == null ? null : num(goal.distanceMeters, null),
      durationSec: goal.durationSec == null ? null : num(goal.durationSec, null),
      windowDays: Math.max(1, Math.round(num(goal.windowDays, sessionDates.length))),
    },
    water: {
      dailyMl: Math.max(500, Math.min(10000, Math.round(dailyMl / 50) * 50)),
      baselineMl: Math.max(0, Math.round(num(water.baselineMl, dailyMl))),
      exerciseMl: Math.max(0, Math.round(num(water.exerciseMl, 0))),
      restDayMl: water.restDayMl == null ? undefined : Math.max(0, Math.round(num(water.restDayMl, 0))),
      userAdjusted: !!water.userAdjusted,
      reminderLocalTimes: normaliseReminderTimes(water.reminderLocalTimes).length
        ? normaliseReminderTimes(water.reminderLocalTimes)
        : ["08:00", "12:00", "16:00", "20:00"],
      source: String(water.source || "efsa-acsm-general").slice(0, 60),
      ...(water.allowNight === true ? { allowNight: true } : {}),
    },
    route: {
      mode: route.mode === "course" ? "course" : "autoloop",
      courseId: route.courseId ? String(route.courseId).slice(0, 100) : null,
      targetLengthMeters: num(route.targetLengthMeters, sessionMeters),
      scaleFactor: num(route.scaleFactor, 1),
      repeatTimes: Math.max(1, Math.round(num(route.repeatTimes, 1))),
      loop: { type: "LineString", coordinates: pins.map((p) => [p.lon, p.lat]) },
      pins,
    },
    schedule: {
      sessionsPerWeek: num(schedule.sessionsPerWeek, 3),
      sessionDistanceMeters: sessionMeters,
      sessionDurationSec: sessionSec,
      sessionDates,
      initialTargetSec: num(schedule.initialTargetSec, sessionSec),
      goalTargetSec: schedule.goalTargetSec == null ? null : num(schedule.goalTargetSec, null),
      legTargetsSec: buildLegTargets(pins, num(schedule.initialTargetSec, sessionSec)),
    },
    progression: {},
    // Imported plans are owned locally, but never re-charged.
    ownership: { state: "imported" },
  };
  const target = num(raw.progression?.currentTargetSec, plan.schedule.initialTargetSec);
  const startedAt = raw.progression?.targetStartedAt || plan.createdAt;
  plan.progression = {
    currentTargetSec: target,
    targetStartedAt: startedAt,
    step: raw.progression?.step || 0.02,
    legTargetsSec: plan.schedule.legTargetsSec,
    legStartedAt: plan.schedule.legTargetsSec.map(() => startedAt),
  };
  return { ok: true, plan };
}

/**
 * Import a shared .paceplan file. Always free: this never calls
 * purchasePlanCredit and never spends a credit.
 */
export function importPlanFile(text, { iapApi = defaultIap, existingIds = [] } = {}) {
  let data;
  try {
    data = JSON.parse(String(text || ""));
  } catch {
    return { ok: false, error: "invalid_json" };
  }
  if (!data || typeof data !== "object") return { ok: false, error: "invalid_json" };
  if (data.format !== PLAN_FORMAT) return { ok: false, error: "wrong_format" };
  if (Number(data.formatVersion) !== PLAN_FORMAT_VERSION) return { ok: false, error: "wrong_version" };
  if (!data.plan || typeof data.plan !== "object") return { ok: false, error: "missing_plan" };

  const checked = sanitiseImportedPlan(data.plan);
  if (!checked.ok) return checked;
  const plan = checked.plan;
  const ids = new Set(existingIds || []);
  while (ids.has(plan.id)) plan.id = uid("plan");
  try {
    iapApi.markImported(plan.id);
  } catch {
    // A local ledger failure must not block a free import.
  }
  return { ok: true, plan, free: true };
}

export function scheduleRowId(planOrId, date) {
  const id = typeof planOrId === "string" ? planOrId : planOrId.id;
  return `sched_${id}_${date}`;
}

/** Calendar rows use the existing storage.plans collection, not a second calendar. */
export function planToCalendarRows(plan, { courseName = null } = {}) {
  const dates = plan.schedule?.sessionDates || [];
  const pins = plan.route?.pins || [];
  return dates.map((date) => ({
    id: scheduleRowId(plan, date),
    date,
    courseId: plan.route?.mode === "course" ? plan.route.courseId || null : null,
    courseName: plan.route?.mode === "course" ? courseName || plan.title : "Plan loop",
    activityType: plan.activityType,
    sourcePlanId: plan.id,
    sourceSessionDate: date,
    targetLengthMeters: plan.schedule?.sessionDistanceMeters || 0,
    targetSec: plan.schedule?.initialTargetSec || 0,
    routePins: pins,
  }));
}

/** Put a plan in the library and its sessions on the calendar, idempotently. */
export function addPlanToState(state, plan, { courseName = null } = {}) {
  if (!Array.isArray(state.planLibrary)) state.planLibrary = [];
  state.planLibrary = state.planLibrary.filter((p) => p.id !== plan.id);
  state.planLibrary.push(plan);
  if (!Array.isArray(state.plans)) state.plans = [];
  state.plans = state.plans.filter((p) => p.sourcePlanId !== plan.id);
  const rows = planToCalendarRows(plan, { courseName });
  for (const row of rows) {
    if (!state.plans.some((p) => p.id === row.id)) state.plans.push(row);
  }
  return { plan, rows };
}

export function removePlanFromState(state, planId) {
  state.planLibrary = (state.planLibrary || []).filter((p) => p.id !== planId);
  state.plans = (state.plans || []).filter((p) => p.sourcePlanId !== planId);
  return state;
}

export function findPlan(state, planId) {
  return (state.planLibrary || []).find((p) => p.id === planId) || null;
}

/**
 * Record a completed session against its plan. Whole-session and per-leg
 * targets both follow the same rule: tighten only after a met target and a
 * full week at that speed.
 */
export function applyCompletedSession(plan, activity, now = new Date()) {
  if (!plan || !activity) return plan;
  const performed = num(activity.elapsedSec);
  if (!(performed > 0)) return plan;
  const legPerformed = legSplitsFromTrack(plan.route?.pins, activity.track);
  plan.progression = applySessionResult(
    plan.progression,
    performed,
    now,
    plan.schedule?.goalTargetSec ?? null,
    legPerformed
  );
  plan.updatedAt = (now instanceof Date ? now : new Date(now)).toISOString();
  return plan;
}

/** Adjust the water target from ml or oz; always user-adjustable. */
export function updateWaterTarget(plan, { dailyMl, bodyKg, reminderLocalTimes, allowNight } = {}) {
  if (!plan || !plan.water) return plan;
  if (dailyMl != null && Number.isFinite(Number(dailyMl))) {
    plan.water.dailyMl = Math.max(500, Math.min(10000, Math.round(Number(dailyMl) / 50) * 50));
    plan.water.userAdjusted = true;
  }
  if (bodyKg != null && Number(bodyKg) > 0) {
    const base = Math.round((32.5 * Number(bodyKg)) / 50) * 50;
    plan.water.baselineMl = base;
    if (!plan.water.userAdjusted || dailyMl == null) {
      plan.water.dailyMl = base + (plan.water.exerciseMl || 0);
    }
  }
  if (Array.isArray(reminderLocalTimes)) {
    plan.water.reminderLocalTimes = normaliseReminderTimes(reminderLocalTimes);
    if (!plan.water.reminderLocalTimes.length) plan.water.reminderLocalTimes = ["08:00", "12:00", "16:00", "20:00"];
  }
  if (allowNight != null) plan.water.allowNight = !!allowNight;
  plan.updatedAt = new Date().toISOString();
  return plan;
}

export function stableNotificationId(planId, index = 0) {
  let h = 2166136261;
  const s = String(planId || "plan");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (Math.abs(h) % 2000000000) + index * 10 + 1;
}

/**
 * Payload for on-device drink reminders. No night alerts unless the plan
 * explicitly allows them; general guidance, never medical advice.
 */
export function reminderPayloadFor(plan, opts = {}) {
  const times = reminderTimesFor(plan, opts);
  const ml = plan?.water?.dailyMl || 2000;
  return times.map((t, i) => ({
    id: stableNotificationId(plan?.id, i),
    title: "Time for a drink",
    body: `About ${ml} ml today is your plan target. General guidance, not medical advice.`,
    schedule: {
      on: { hour: Number(t.slice(0, 2)), minute: Number(t.slice(3, 5)) },
      repeats: true,
      allowWhileIdle: true,
    },
  }));
}

/** Schedule local notifications through @capacitor/local-notifications when present. */
export async function scheduleDrinkReminders(plan, { notifications = null, opts = {} } = {}) {
  const payload = reminderPayloadFor(plan, opts);
  if (!notifications) {
    return { ok: false, skipped: true, reason: "not_available", times: payload.map((n) => n.schedule.on) };
  }
  try {
    const ids = payload.map((n) => ({ id: n.id }));
    if (ids.length) {
      try {
        await notifications.cancel({ notifications: ids });
      } catch {
        // nothing scheduled yet
      }
    }
    await notifications.schedule({ notifications: payload });
    return { ok: true, scheduled: payload.length, ids: payload.map((n) => n.id) };
  } catch (err) {
    return { ok: false, error: String(err), times: payload.map((n) => n.schedule.on) };
  }
}

export async function clearDrinkReminders(plan, { notifications = null, opts = {} } = {}) {
  if (!notifications) return { ok: false, skipped: true };
  const payload = reminderPayloadFor(plan, opts);
  try {
    await notifications.cancel({ notifications: payload.map((n) => ({ id: n.id })) });
    return { ok: true, cleared: payload.length };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export { WATER_DISCLAIMER };
