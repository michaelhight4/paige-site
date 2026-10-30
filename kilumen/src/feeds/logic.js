// Kilumen fruit feeds: pure rules (no DOM). Coder, Oct 29 2026. Design: kilumen/design/SPORTS_FEEDS.md (every number PLACEHOLDER
// until Gary signs off). Gary's locked rules: invented Kilumen fruits only, +15 cap per stat, Fullness drains only from
// practice and battles (never with time), opposite-part trade-offs, fins/wings only on fitting type + body shape, real-time
// grow timers that practice speeds up, likes/dislikes reactions. State lives in systems.state.feeds (saved with systems);
// build is keyed by creature uid because the creature save format (systems/creature.js toSave) keeps only known fields.
import { rngFor } from '../sports/rng.js?v=v0.2.101-alpha';

export const PARTS = ['legs', 'lungs', 'grip', 'mind', 'fins', 'wings'];
export const PART_CAP = 60, TOTAL_CAP = 150, BUILD_TO_STAT = 0.25, STAT_BONUS_CAP = 15, FULL_MAX = 100;
export const TIERS = [[40, 0.3], [20, 0.6], [0, 1.0]];
// Opposite-part trade-off: feeding part X lowers part TRADE[X] by 1 (design section 2).
export const TRADE = { grip: 'legs', wings: 'grip', lungs: 'mind', mind: 'grip', fins: 'wings', legs: 'lungs' };
export const TASTES = ['sweet', 'sour', 'bitter', 'tangy', 'earthy'];
export const LIKE = { mult: 1.25, full: -5 }, DISLIKE = { mult: 0.75, full: 10 };
export const DRAIN = { practice: 10, battleWin: 5 }; // Gary Oct 29: only the creatures that fought drain after a battle; the bench loses none
export const PRACTICE_SPEEDUP_MS = 3600e3; // each practice ticks that town's plots (and home plots) by 1 h
export const HOME_PLOTS = 4;
// Fins / wings fit (design section 1): full growth only for these; others stop at stage 1 (14 build).
export const FINS_TYPES = ['water', 'sea', 'freshwater', 'swamp', 'rain'], FINS_SHAPES = ['serpent'];
export const WINGS_TYPES = ['wind', 'bird', 'angelic', 'light'], WINGS_SHAPES = ['avian'];
// Part -> athletic stat (agility = half legs + half wings). fins/wings also feed event-only swim/glide later (phase 5).
export const STAT_FROM = { speed: { legs: 1 }, stamina: { lungs: 1 }, power: { grip: 1 }, focus: { mind: 1 }, agility: { legs: 0.5, wings: 0.5 } };

// Fruits (invented Kilumen fruits; names are placeholder text keys feeds.fruit.<id>.name). gain = raw build points.
// growH = real-time hours to grow from a seedling; town = home biome (soil match = top yield).
export const FRUITS = {
  rumblemelon:   { taste: 'sweet',  gain: { lungs: 3 }, full: 30, growH: 12, town: 'brookhollow', price: 300 },
  dashfig:       { taste: 'sweet',  gain: { legs: 3 }, full: 15, growH: 10, town: 'brookhollow', price: 300 },
  padgourd:      { taste: 'earthy', gain: { legs: 2, wings: 1 }, full: 20, growH: 14, town: 'fernwick', price: 350 },
  mossplum:      { taste: 'bitter', gain: { mind: 3 }, full: 15, growH: 12, town: 'fernwick', price: 350 },
  saltlime:      { taste: 'sour',   gain: { fins: 3 }, full: 15, growH: 12, town: 'saltmere', price: 400 },
  tidepod:       { taste: 'tangy',  gain: { fins: 2, lungs: 1 }, full: 20, growH: 16, town: 'saltmere', price: 400 },
  sparkcitron:   { taste: 'sour',   gain: { mind: 3 }, full: 15, growH: 14, town: 'revival_heights', price: 450 },
  frostquince:   { taste: 'bitter', gain: { grip: 2, mind: 1 }, full: 20, growH: 18, town: 'frostspire', price: 500 },
  glidepod:      { taste: 'sweet',  gain: { wings: 3 }, full: 10, growH: 16, town: 'lanternport', price: 500 },
  glowmelon:     { taste: 'sweet',  gain: { wings: 2, mind: 1 }, full: 25, growH: 20, town: 'lanternport', price: 550 },
  embergourd:    { taste: 'earthy', gain: { grip: 3 }, full: 25, growH: 18, town: 'cindervale', price: 550 },
  cinderapricot: { taste: 'tangy',  gain: { grip: 2, lungs: 1 }, full: 20, growH: 24, town: 'cindervale', price: 600 },
  sunheart_fig:  { taste: 'all',    gain: { legs: 2, lungs: 2, grip: 2, mind: 2, fins: 2, wings: 2 }, full: 35, growH: 48, town: 'aurelith', rare: true },
  hollowpith:    { taste: 'bitter', reset: 10, full: 10, growH: 48, town: 'aurelith', rare: true },
};
export const FRUIT_IDS = Object.keys(FRUITS);
export const fruitItemId = (id) => `fruit_${id}`; // bag item id (feeds pocket)

export function feedsState(sysState) {
  const s = (sysState.feeds ||= {});
  s.v ??= 1; s.build ??= {}; s.full ??= {}; s.plots ??= []; s.fed ??= 0;
  return s;
}
export const buildOf = (fs, uid) => (fs.build[uid] ||= Object.fromEntries(PARTS.map((p) => [p, 0])));
export const fullOf = (fs, uid) => fs.full[uid] ?? 0;
export const totalBuild = (b) => PARTS.reduce((n, p) => n + (b[p] || 0), 0);
export const stageOf = (v) => (v >= 45 ? 3 : v >= 30 ? 2 : v >= 15 ? 1 : 0);
export const tierMult = (v) => TIERS.find(([lo]) => v >= lo)[1];

/** Liked + disliked taste, stable from the uid (no save needed). */
export function tastesOf(uid) {
  const r = rngFor('feedtaste1:' + uid), like = TASTES[Math.floor(r() * TASTES.length)];
  const rest = TASTES.filter((t) => t !== like);
  return { like, dislike: rest[Math.floor(r() * rest.length)] };
}
/** -> 'like' | 'dislike' | 'neutral'. A fruit of every taste (Sunheart Fig) is always liked. */
export function reactionOf(uid, fruitId) {
  const f = FRUITS[fruitId]; if (!f) return 'neutral';
  const t = tastesOf(uid);
  if (f.taste === 'all' || f.taste === t.like) return 'like';
  return f.taste === t.dislike ? 'dislike' : 'neutral';
}
/** Per-part cap for this creature: fins/wings are 0 (unusable) unless type or body shape fits (Gary Oct 29: no partial growth). */
export function partCap(part, { types = [], shape = 'standard' } = {}) {
  if (part === 'fins') return types.some((t) => FINS_TYPES.includes(t)) || FINS_SHAPES.includes(shape) ? PART_CAP : 0;
  if (part === 'wings') return types.some((t) => WINGS_TYPES.includes(t)) || WINGS_SHAPES.includes(shape) ? PART_CAP : 0;
  return PART_CAP;
}
/** Fins / wings fruits are refused outright when the creature can't use the part at all (Gary: "only work on creatures whose type and body shape fit"). */
export function canUsePart(part, body) { return partCap(part, body) > 0; }

/**
 * Preview (pure, no mutation). body = {types, shape}. -> {ok, reason?, delta{part:+n/-n}, full, reaction}
 * reasons: 'unknown' | 'full' | 'misfit' | 'capped'
 */
export function previewFeed({ build, full = 0, uid, fruitId, body = {}, resetPart = null }) {
  const f = FRUITS[fruitId]; if (!f) return { ok: false, reason: 'unknown' };
  const reaction = reactionOf(uid, fruitId), mod = reaction === 'like' ? LIKE : reaction === 'dislike' ? DISLIKE : { mult: 1, full: 0 };
  const addFull = Math.max(0, f.full + mod.full);
  if (full >= FULL_MAX || full + addFull > FULL_MAX + 0.001) return { ok: false, reason: 'full', reaction };
  const delta = {};
  if (f.reset) {
    const p = resetPart && PARTS.includes(resetPart) ? resetPart : PARTS.reduce((a, b) => ((build[b] || 0) > (build[a] || 0) ? b : a));
    delta[p] = -Math.min(f.reset, build[p] || 0);
    return { ok: true, delta, full: addFull, reaction, reset: p };
  }
  const parts = Object.keys(f.gain);
  if (parts.some((p) => !canUsePart(p, body))) return { ok: false, reason: 'misfit', reaction }; // any misfit fins/wings part: refused outright
  let room = TOTAL_CAP - totalBuild(build);
  for (const p of parts) {
    if (!canUsePart(p, body)) continue;
    const cur = build[p] || 0, cap = partCap(p, body);
    let g = Math.round(f.gain[p] * tierMult(cur) * mod.mult * 10) / 10;
    g = Math.max(0, Math.min(g, cap - cur, room)); room -= g;
    if (g > 0) delta[p] = g;
  }
  if (!Object.keys(delta).length) return { ok: false, reason: 'capped', reaction };
  if (f.taste !== 'all') for (const p of Object.keys(delta)) { // trade-off: the opposite part loses 1 (not below 0), not a fed part
    const o = TRADE[p]; if (o && !(o in delta) && (build[o] || 0) > 0) delta[o] = (delta[o] || 0) - Math.min(1, build[o] + (delta[o] || 0));
  }
  return { ok: true, delta, full: addFull, reaction };
}

// ---- Bag item ids (Gary Oct 29: fruit lives in the bag, 'feeds' pocket; table rows in src/systems/items.js) --------
export const fruitItem = (id) => `fruit_${id}`;
export const seedItem = (id) => `seedling_${id}`;
/** bag: anything with count(id) / add(id, n) / remove(id, n) (src/systems/bag.js Bag). */
export const fruitCount = (bag, id) => bag?.count(fruitItem(id)) || 0;
export const seedCount = (bag, id) => bag?.count(seedItem(id)) || 0;

/** Apply a feed (uses one fruit from the bag). -> preview result. */
export function feed(fs, bag, { uid, fruitId, body, resetPart }) {
  if (!(fruitCount(bag, fruitId) > 0)) return { ok: false, reason: 'none_left' };
  const b = buildOf(fs, uid), pv = previewFeed({ build: b, full: fullOf(fs, uid), uid, fruitId, body, resetPart });
  if (!pv.ok) return pv;
  for (const [p, d] of Object.entries(pv.delta)) b[p] = Math.round(Math.max(0, (b[p] || 0) + d) * 10) / 10;
  fs.full[uid] = Math.min(FULL_MAX, fullOf(fs, uid) + pv.full);
  bag.remove(fruitItem(fruitId), 1);
  fs.fed++;
  return pv;
}
/** Fullness drain: ONLY called from practice events and battle wins (never from time). */
export function drain(fs, uid, amount) { if (!uid) return 0; const before = fullOf(fs, uid); fs.full[uid] = Math.max(0, before - amount); return before - fs.full[uid]; }

/** Flat bonus per athletic stat from build (max +15 each). */
export function statBonus(build) {
  const out = {};
  for (const [s, from] of Object.entries(STAT_FROM)) {
    const pts = Object.entries(from).reduce((n, [p, w]) => n + (build?.[p] || 0) * w, 0);
    out[s] = Math.min(STAT_BONUS_CAP, Math.round(pts * BUILD_TO_STAT));
  }
  return out;
}

// ---- Grow plots (real time, practice speeds up) ----------------------------------------------------------------
export const PLOT_STAGES = ['sprout', 'leaf', 'flower', 'fruit'];
export function ensurePlots(fs, n = HOME_PLOTS) { while (fs.plots.length < n) fs.plots.push({ fruit: null, planted: 0, boost: 0 }); return fs.plots; }
export function plant(fs, bag, i, fruitId, now) {
  const p = ensurePlots(fs)[i]; if (!p || p.fruit || !FRUITS[fruitId]) return false;
  if (!(seedCount(bag, fruitId) > 0)) return false;
  bag.remove(seedItem(fruitId), 1);
  Object.assign(p, { fruit: fruitId, planted: now, boost: 0 }); return true;
}
export const growMs = (fruitId) => FRUITS[fruitId].growH * 3600e3;
/** 0..1 progress. Uses wall-clock `now` (real time) plus practice boost. A clock set backwards never un-grows (min 0). */
export function progress(p, now) { if (!p?.fruit) return 0; return Math.max(0, Math.min(1, (now - p.planted + p.boost) / growMs(p.fruit))); }
export const plotStage = (p, now) => (p?.fruit ? PLOT_STAGES[Math.min(3, Math.floor(progress(p, now) * 4))] : null);
export const msLeft = (p, now) => (p?.fruit ? Math.max(0, growMs(p.fruit) - (now - p.planted + p.boost)) : 0);
/** A practice event ticks every growing plot by 1 h (design: local plots; v1 has home plots only). */
export function practiceBoost(fs, ms = PRACTICE_SPEEDUP_MS) { for (const p of fs.plots) if (p.fruit) p.boost += ms; }
/** Harvest a ripe plot. Yield 2-3 (placeholder), 30% a seedling back. Deterministic from the plant time. */
export function harvest(fs, bag, i, now) {
  const p = fs.plots[i]; if (!p?.fruit || progress(p, now) < 1) return null;
  const r = rngFor(`harvest:${p.fruit}:${p.planted}:${i}`), n = 2 + Math.floor(r() * 2), seed = r() < 0.3, id = p.fruit;
  bag.add(fruitItem(id), n); if (seed) bag.add(seedItem(id), 1);
  Object.assign(p, { fruit: null, planted: 0, boost: 0 });
  return { fruit: id, n, seedling: seed };
}

/** uids of the creatures that actually fought: the lead, plus anyone whose HP, energy or status changed in the battle.
 *  before: [{uid,hp,energy,status}] snapshot taken just before the result is applied; after: battle result team. */
export function fightersOf(before = [], after = []) {
  const out = new Set(), key = (c) => c?.uid || c?.id;
  const lead = before.find((c) => (c.hp || 0) > 0); if (key(lead)) out.add(key(lead));
  for (const a of after) {
    const b = before.find((c) => key(c) && key(c) === key(a)); if (!b) continue;
    if ((Number.isFinite(a.hp) && a.hp !== b.hp) || (a.status || '') !== (b.status || '') || JSON.stringify(a.energy || null) !== JSON.stringify(b.energy || null)) out.add(key(b));
  }
  return out;
}
