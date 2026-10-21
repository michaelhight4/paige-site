// Premium passes + All Access subscription. LOCAL FLAGS ONLY (test toggles); real payments are NOT implemented (see payments.js).
// Flags live in localStorage key `lifesim.premium.v1`, separate from saves, so they survive new lives / wiped saves.
// Catalog (ids, prices, effects) is data/premium.json; this module never hard-codes a pass.
import { D } from './data.js';

const KEY = 'lifesim.premium.v1';
const mem = { v: null };
const ls = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; } };
const blank = () => ({ v: 1, owned: {}, sub: null });
export function load() {
  const st = ls(); let r = null;
  try { r = st ? JSON.parse(st.getItem(KEY)) : mem.v; } catch (e) { r = null; }
  return r && r.owned ? r : blank();
}
function save(f) { const st = ls(); try { if (st) st.setItem(KEY, JSON.stringify(f)); else mem.v = f; } catch (e) { mem.v = f; } return f; }
export const catalog = () => D.premium;
export const passes = () => D.premium.passes;
export const passDef = (id) => D.premium.passes.find((p) => p.id === id);
const DAY = 864e5;
export function subscription(now = Date.now()) {
  const f = load(); if (!f.sub) return null;
  return f.sub.until == null || f.sub.until > now ? f.sub : null; // lapsed subscriptions grant nothing
}
export const subscribed = (now) => !!subscription(now);
export const owned = (id) => !!load().owned[id];
// True if the pass is owned OR an All Access subscription is active.
export function isUnlocked(id, now = Date.now()) { return !!id && (owned(id) || subscribed(now)); }
export function setOwned(id, on = true) { if (!passDef(id)) throw new Error('unknown pass ' + id); const f = load(); if (on) f.owned[id] = true; else delete f.owned[id]; return save(f); }
// plan: 'monthly' | 'yearly' | null (cancel -> lapses immediately, owned passes stay)
export function setSubscription(plan, now = Date.now()) {
  const f = load(); if (!plan) f.sub = null; else f.sub = { plan, since: now, until: now + (plan === 'yearly' ? 365 : 30) * DAY }; return save(f);
}
export function expireSubscription() { const f = load(); if (f.sub) f.sub.until = Date.now() - 1; return save(f); }
export const resetAll = () => save(blank());
export function status() {
  const sub = subscription();
  return { subscribed: !!sub, plan: sub ? sub.plan : null, passes: passes().map((p) => ({ ...p, owned: owned(p.id), unlocked: isUnlocked(p.id), viaSub: !owned(p.id) && !!sub })) };
}
export const price = (p) => '$' + p.price.toFixed(2);
