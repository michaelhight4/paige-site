// Boundwake premium passes. LOCAL FLAGS in `bw.premium.v1` (survive new lives).
// Catalog: data_fantasy/premium.json via setCatalog() after pack load. Purchases: src/payments.js stubs.
const KEY = 'bw.premium.v1';
const mem = { v: null };
let _cat = { passes: [], subscription: null, alpha: { webFreePasses: ['autopilot'] } };

export function setCatalog(c) { if (c && Array.isArray(c.passes)) _cat = c; return _cat; }
export const catalog = () => _cat;

const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (_) { return null; } };
const blank = () => ({ v: 1, owned: {}, sub: null });

export function load() {
  const st = ls(); let r = null;
  try { r = st ? JSON.parse(st.getItem(KEY)) : mem.v; } catch (_) { r = null; }
  return r && r.owned ? r : blank();
}
function save(f) {
  const st = ls();
  try { if (st) st.setItem(KEY, JSON.stringify(f)); else mem.v = f; } catch (_) { mem.v = f; }
  try { document.dispatchEvent(new CustomEvent('bwpremium')); } catch (_) { /* */ }
  return f;
}

export const passes = () => catalog().passes || [];
export const passDef = (id) => passes().find((p) => p.id === id);
const DAY = 864e5;

export function subscription(now = Date.now()) {
  const f = load(); if (!f.sub) return null;
  return f.sub.until == null || f.sub.until > now ? f.sub : null;
}
export const subscribed = (now) => !!subscription(now);
export const owned = (id) => !!load().owned[id];
const inSub = (id) => { const p = passDef(id); return !(p && p.notInSubscription); };

/** Web alpha free list from catalog.alpha.webFreePasses (Autopilot until stores ship). */
export function webAlphaFree(id) {
  const list = catalog().alpha?.webFreePasses || [];
  return list.includes(id);
}

export function isUnlocked(id, now = Date.now()) {
  if (!id) return false;
  if (owned(id) || (inSub(id) && subscribed(now))) return true;
  if (webAlphaFree(id)) return true;
  return false;
}

export const forSale = () => passes().filter((p) => !p.hidden);
export function setOwned(id, on = true) {
  if (!passDef(id)) throw new Error('unknown pass ' + id);
  const f = load();
  if (on) f.owned[id] = true; else delete f.owned[id];
  if (on && id === 'tester_pack') {
    const u = passDef(id).unlocks || [];
    for (const x of u) if (passDef(x)) f.owned[x] = true;
  }
  return save(f);
}
export function setSubscription(plan, now = Date.now()) {
  const f = load();
  if (!plan) f.sub = null;
  else f.sub = { plan, since: now, until: now + (plan === 'yearly' ? 365 : 30) * DAY };
  return save(f);
}
export function expireSubscription() { const f = load(); if (f.sub) f.sub.until = Date.now() - 1; return save(f); }
export const resetAll = () => save(blank());
export function status() {
  const sub = subscription();
  return {
    subscribed: !!sub,
    plan: sub ? sub.plan : null,
    passes: passes().map((p) => ({
      ...p,
      owned: owned(p.id),
      unlocked: isUnlocked(p.id),
      viaSub: !owned(p.id) && !!sub && inSub(p.id),
      viaAlpha: !owned(p.id) && webAlphaFree(p.id),
    })),
  };
}
export const price = (p) => '$' + Number(p.price || 0).toFixed(2);

/** Localhost / ?devpass=1 only — never grant on live production without a real purchase. */
export function canDevGrant(loc = globalThis.location) {
  try {
    const h = String(loc?.hostname || '').toLowerCase();
    if (h === 'localhost' || h === '127.0.0.1') return true;
    if (new URLSearchParams(loc.search || '').get('devpass') === '1') return true;
  } catch (_) { /* */ }
  return false;
}
