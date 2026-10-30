// Garden: soil plots, seeds, growth over in-game days, watering, harvest (Coder, Oct 30 2026; minimal crop system for
// the merit shop). Written from scratch for Kilumen (no outside code). Pure: no DOM. State: systems state .garden =
// {plots: {plotId: {crop, planted, growth, watered, boost, last}}}.
// Rules: a planted seed grows one stage per in-game day on which it was watered (watering = once per day, any can).
// The merit can (watering_can_merit) makes a crop watered with it ready to harvest the next day.
export const CROPS = Object.freeze({
  carrot:   { seed: 'carrot_seeds',   days: 3, yield: [2, 3] },
  turnip:   { seed: 'turnip_seeds',   days: 2, yield: [1, 2] },
  radish:   { seed: 'radish_seeds',   days: 2, yield: [2, 3] },
  tomato:   { seed: 'tomato_seeds',   days: 4, yield: [3, 4] },
  pumpkin:  { seed: 'pumpkin_seeds',  days: 5, yield: [1, 2] },
  sunroot:  { seed: 'sunroot_seeds',  days: 4, yield: [2, 3] }, // invented crop
  glowbean: { seed: 'glowbean_seeds', days: 3, yield: [3, 5] }, // invented crop
  drumleek: { seed: 'drumleek_seeds', days: 5, yield: [2, 3] }, // invented crop
});
export const SEED_TO_CROP = Object.freeze(Object.fromEntries(Object.entries(CROPS).map(([c, d]) => [d.seed, c])));
export const CANS = Object.freeze({ watering_can: { tier: 1 }, watering_can_merit: { tier: 2, instant: true } });
// Plots: walkable soil cells (no collision change, so no path can be blocked). home = beside the player's house.
export const PLOTS = Object.freeze([
  { id: 'home_1', map: 'brookhollow', x: 20, y: 15, home: true },
  { id: 'home_2', map: 'brookhollow', x: 21, y: 15, home: true },
  { id: 'home_3', map: 'brookhollow', x: 22, y: 15, home: true },
  { id: 'fernwick_1', map: 'fernwick', x: 17, y: 15 },
  { id: 'fernwick_2', map: 'fernwick', x: 18, y: 15 },
  { id: 'saltmere_1', map: 'saltmere', x: 18, y: 20 },
  { id: 'saltmere_2', map: 'saltmere', x: 19, y: 20 },
]);
export const plotAt = (map, x, y) => PLOTS.find((p) => p.map === map && p.x === x && p.y === y) || null;
export const plotsOn = (map) => PLOTS.filter((p) => p.map === map);

export function gardenState(sysState) { const g = (sysState.garden ||= {}); g.plots ||= {}; return g; }
/** Bring a plot up to `day`: each past day it was watered on adds a stage (merit can: straight to ready). */
export function update(plot, day) {
  if (!plot?.crop) return plot;
  const days = CROPS[plot.crop]?.days || 1;
  if (plot.watered != null && plot.watered >= plot.last && plot.watered < day) {
    plot.growth = plot.boost ? days : Math.min(days, plot.growth + 1);
    plot.boost = false;
  }
  plot.last = Math.max(plot.last, day);
  return plot;
}
export function stageOf(plot) {
  if (!plot?.crop) return 'empty';
  const days = CROPS[plot.crop].days;
  if (plot.growth >= days) return 'ready';
  return plot.growth === 0 ? 'seed' : plot.growth * 2 < days ? 'sprout' : 'growing';
}
export function plotState(g, id, day) { const p = g.plots[id]; return p ? update(p, day) : null; }
export function plant(g, id, seed, day, bag) {
  const crop = SEED_TO_CROP[seed]; if (!crop) return { ok: false, reason: 'not_seed' };
  if (g.plots[id]?.crop) return { ok: false, reason: 'busy' };
  if (!bag.remove(seed, 1)) return { ok: false, reason: 'no_seed' };
  g.plots[id] = { crop, planted: day, growth: 0, watered: null, boost: false, last: day };
  return { ok: true, crop };
}
/** Water with the best can in the bag. -> {ok, can?, reason?:'empty'|'no_can'|'done'|'ready'} */
export function water(g, id, day, bag) {
  const p = plotState(g, id, day); if (!p) return { ok: false, reason: 'empty' };
  if (stageOf(p) === 'ready') return { ok: false, reason: 'ready' };
  const can = bestCan(bag); if (!can) return { ok: false, reason: 'no_can' };
  if (p.watered === day && (!CANS[can].instant || p.boost)) return { ok: false, reason: 'done' };
  p.watered = day; if (CANS[can].instant) p.boost = true;
  return { ok: true, can };
}
export const bestCan = (bag) => (bag.count('watering_can_merit') ? 'watering_can_merit' : bag.count('watering_can') ? 'watering_can' : null);
const hash = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
export function harvest(g, id, day, bag) {
  const p = plotState(g, id, day); if (!p || stageOf(p) !== 'ready') return { ok: false, reason: 'not_ready' };
  const [lo, hi] = CROPS[p.crop].yield, n = lo + (hash(id + ':' + p.planted + ':' + day) % (hi - lo + 1));
  const r = bag.add(p.crop, n); if (!r.added) return { ok: false, reason: 'bag_full' };
  delete g.plots[id];
  return { ok: true, crop: p.crop, n: r.added };
}
