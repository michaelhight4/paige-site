/**
 * Plan IAP stub. Product: com.pagegames.heldpath.plan_credit_2
 * Consumable $2 credit, redeemed for one new plan, owned forever.
 * Wire Play Billing / StoreKit when store products exist. Importing a shared plan is always free and never calls this.
 */
const LEDGER_KEY = "heldpath.plan_ledger.v1";

export const PLAN_PRODUCT_ID = "com.pagegames.heldpath.plan_credit_2";
export const PLAN_PRICE_USD = 2;
export const SUPPORT_PRODUCT_ID = "support_5";
export const SUPPORT_PRICE_USD = 5;
/** Play Billing is not wired. Purchase buttons stay hidden; stubs do not grant credits. */
export const BILLING_AVAILABLE = false;
export const BILLING_COMING_SOON = "Purchases are coming soon. The $2 plan and $5 donation are not available in this build. Everything else in Heldpath stays free.";
export const OWNERSHIP_COPY =
  "All goals are free. Set a distance, a time, or a weekly total, and a time frame if you want one. Free goals show your current speed, the speed you need, and the gap. A $2 plan adds incremental session targets, mixed run-walk or ride patterns, water and nutrition guidance. $2 per plan, no subscription. Keep it forever, share it free, restart anytime. You can buy as many plans as you want. A plan does not unlock goals — it adds incremental session targets, mixed patterns, water reminders, and carb and protein guidance.";

/** Browser localStorage, with an in-memory fallback so Node tests and private modes still work. */
const memoryLedger = new Map();
function readKey(key) {
  try {
    if (typeof localStorage !== "undefined" && localStorage) return localStorage.getItem(key);
  } catch { /* private mode */ }
  return memoryLedger.has(key) ? memoryLedger.get(key) : null;
}
function writeKey(key, value) {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(key, value);
      return;
    }
  } catch { /* private mode */ }
  memoryLedger.set(key, value);
}

export function loadLedger() {
  try {
    const raw = readKey(LEDGER_KEY);
    if (!raw) return { credits: 0, purchases: [], ownedPlanIds: [] };
    const p = JSON.parse(raw);
    return {
      credits: p.credits || 0,
      purchases: p.purchases || [],
      ownedPlanIds: p.ownedPlanIds || [],
    };
  } catch {
    return { credits: 0, purchases: [], ownedPlanIds: [] };
  }
}

function saveLedger(l) {
  writeKey(LEDGER_KEY, JSON.stringify(l));
}

/** Stub purchase. When stores are live, replace the body with the official IAP call. */
export async function purchasePlanCredit({ allowStub = false } = {}) {
  if (!BILLING_AVAILABLE && !allowStub) {
    return { ok: false, stub: false, available: false, reason: "coming-soon", productId: PLAN_PRODUCT_ID, credits: loadLedger().credits };
  }
  const l = loadLedger();
  const rec = {
    id: "stub_" + Date.now().toString(36),
    productId: PLAN_PRODUCT_ID,
    amountUsd: PLAN_PRICE_USD,
    at: new Date().toISOString(),
    stub: true,
  };
  l.credits += 1;
  l.purchases.push(rec);
  saveLedger(l);
  return { ok: true, stub: true, productId: PLAN_PRODUCT_ID, credit: rec, credits: l.credits };
}

export function redeemCreditForPlan(planId) {
  const l = loadLedger();
  if (l.credits < 1) return { ok: false, error: "no_credit" };
  l.credits -= 1;
  if (!l.ownedPlanIds.includes(planId)) l.ownedPlanIds.push(planId);
  saveLedger(l);
  return { ok: true, credits: l.credits };
}

export function markImported(planId) {
  const l = loadLedger();
  if (!l.ownedPlanIds.includes(planId)) l.ownedPlanIds.push(planId);
  saveLedger(l);
}

/** Restore path: reload local entitlements. Later, also query the store. Consumables may not come back from Apple/Play; export files are the reliable backup. */
export async function restorePurchases() {
  const l = loadLedger();
  return {
    ok: true,
    stub: true,
    credits: l.credits,
    ownedPlanIds: l.ownedPlanIds.slice(),
    purchaseCount: l.purchases.length,
    note: "Restored local plan credits and owned plans. When store products exist, this will also ask Apple or Google. Back up plans with Export; imported plans stay free.",
  };
}

export function hasCredit() {
  return loadLedger().credits > 0;
}

/** Stub $5 donation. When stores are live, call Play Billing / StoreKit with SUPPORT_PRODUCT_ID. Hidden on the web app. */
export async function purchaseSupport({ allowStub = false } = {}) {
  if (!BILLING_AVAILABLE && !allowStub) {
    return { ok: false, stub: false, available: false, reason: "coming-soon", productId: SUPPORT_PRODUCT_ID };
  }
  const rec = {
    id: "stub_support_" + Date.now().toString(36),
    productId: SUPPORT_PRODUCT_ID,
    amountUsd: SUPPORT_PRICE_USD,
    at: new Date().toISOString(),
    stub: true,
  };
  const key = "heldpath.support_ledger.v1";
  let list = [];
  try { list = JSON.parse(localStorage.getItem(key) || "[]"); } catch { list = []; }
  list.push(rec);
  localStorage.setItem(key, JSON.stringify(list));
  return { ok: true, stub: true, productId: SUPPORT_PRODUCT_ID, purchase: rec };
}

export function creditsRemaining() {
  return loadLedger().credits;
}

export function ownedPlanIds() {
  return loadLedger().ownedPlanIds.slice();
}

/** Test-only: clear the in-memory ledger (localStorage is left untouched). */
export function resetMemoryLedgerForTests() {
  memoryLedger.clear();
}
