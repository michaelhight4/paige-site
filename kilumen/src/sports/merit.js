// Merit points + merit shop stock (Coder, Oct 30 2026; Gary: "players earn merit points by winning sports events").
// Structure modelled on a classic athlete-points counter: points per event result (by place), a stock that rotates
// every in-game day plus a fixed stock. Names / text are our own (PLACEHOLDER, src/garden/strings.js). Pure: no DOM.
// State: sports state (saved with systems state) -> sstate.merit = {points, earned, spent, log:[]}.
export const MERIT_PTS = Object.freeze({
  tourney: [30, 15, 8, 3], // Brookhollow 3-day tournament (src/sports/tournament.js settle)
  cup: [20, 10, 5, 2],     // town cups (src/sports/town_cup.js settleCup)
  major: [60, 30, 15, 6],  // Aurelith Games (src/sports/major.js settleMajor)
});
export const MERIT_MAX = 9999;
// Prices in merit points. Fixed stock is always on the shelf; the daily shelf shows DAILY_COUNT of DAILY_POOL.
export const MERIT_FIXED = Object.freeze([
  { id: 'watering_can', price: 40 },
  { id: 'watering_can_merit', price: 300 },
  { id: 'carrot_seeds', price: 6 },
  { id: 'turnip_seeds', price: 6 },
]);
export const DAILY_POOL = Object.freeze([
  { id: 'pumpkin_seeds', price: 14 }, { id: 'sunroot_seeds', price: 12 }, { id: 'glowbean_seeds', price: 12 },
  { id: 'radish_seeds', price: 8 }, { id: 'tomato_seeds', price: 10 }, { id: 'drumleek_seeds', price: 16 },
]);
export const DAILY_COUNT = 3;

export function meritState(sstate) {
  const m = (sstate.merit ||= {});
  m.points = Math.max(0, Math.floor(Number(m.points) || 0)); m.earned ??= 0; m.spent ??= 0; m.log ||= [];
  return m;
}
/** Dev grant (integ9: window.kilumenDev.grantMerit(n), ?dev only): add n points (capped at MERIT_MAX); returns the new total. */
export function grantMerit(sstate, n) {
  const m = meritState(sstate), add = Math.max(0, Math.min(Math.floor(Number(n) || 0), MERIT_MAX - m.points));
  m.points += add; m.earned += add; m.log = [...m.log, { kind: 'dev', place: 0, pts: add }].slice(-20);
  return m.points;
}
/** Points for a result: kind 'tourney' | 'cup' | 'major', place 1..n (past 4th = 0). */
export const meritFor = (kind, place) => (MERIT_PTS[kind] || [])[(place | 0) - 1] || 0;
/** Award points for a result; returns the points added. */
export function awardMerit(sstate, kind, place) {
  if (!sstate) return 0;
  const m = meritState(sstate), add = Math.min(meritFor(kind, place), MERIT_MAX - m.points);
  if (add <= 0) return 0;
  m.points += add; m.earned += add; m.log = [...m.log, { kind, place, pts: add }].slice(-20);
  return add;
}
const hash = (n) => { let h = (n * 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return h >>> 0; };
/** Daily shelf for in-game day `day`: DAILY_COUNT distinct items, same all day, changes the next day. */
export function dailyStock(day) {
  const pool = [...DAILY_POOL], out = [];
  let h = hash((day | 0) + 7);
  while (out.length < DAILY_COUNT && pool.length) { out.push(pool.splice(h % pool.length, 1)[0]); h = hash(h + 1); }
  return out;
}
export const meritPriceOf = (id, day) => [...MERIT_FIXED, ...dailyStock(day)].find((x) => x.id === id)?.price ?? null;
/** Buy n of id. bag: Bag. -> {ok, reason?:'short'|'bag_full'|'not_stocked'|'owned', short?} */
export function buyMerit(sstate, bag, id, n, day) {
  const m = meritState(sstate), price = meritPriceOf(id, day); n = Math.max(1, n | 0);
  if (price == null) return { ok: false, reason: 'not_stocked' };
  if (bag.isKey?.(id) && bag.count(id) >= 1) return { ok: false, reason: 'owned' };
  const total = price * n;
  if (m.points < total) return { ok: false, reason: 'short', short: total - m.points };
  const r = bag.add(id, n);
  if (!r.added) return { ok: false, reason: 'bag_full' };
  const cost = price * r.added; m.points -= cost; m.spent += cost;
  return { ok: true, added: r.added, cost };
}
