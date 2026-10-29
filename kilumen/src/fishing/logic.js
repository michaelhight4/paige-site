// Fishing v1: pure rules (no DOM; Node-testable). Coder, Oct 29 2026. Flag: src/fishing/flags.js `fishing` (off).
// Structure follows the classic monster-RPG rod loop: a rod key item (upgradable tiers), face any water edge or pier
// and press A, wait for a bite, react inside a short window, then a normal wild battle against a creature from the
// map's fishing table (data/fishing_tables.json, built only from the existing water tables).
// Easing: Quadratic.Out / Back.Out / Sinusoidal.InOut adapted from tween.js (MIT, Robert Penner's equations, BSD) -
// see THIRD_PARTY_LICENSES "Fishing v1".
import { Col, DELTA } from '../overworld/constants.js?v=v0.2.58-alpha';

export const FISHING_URL = 'data/fishing_tables.json';
/** Rod tiers. Only `basic` exists as an item (fishing_rod); good / super are structure for later upgrades (ids PLACEHOLDER). */
export const ROD_TIERS = Object.freeze([
  { id: 'basic', item: 'fishing_rod', tier: 1 },
  { id: 'good', item: 'fishing_rod_good', tier: 2 },
  { id: 'super', item: 'fishing_rod_super', tier: 3 },
]);
/** Timings in ms. Bite wait is random in [WAIT_MIN, WAIT_MAX]; the A window opens when the bobber dips. */
export const TIMING = Object.freeze({ CAST: 650, WAIT_MIN: 1400, WAIT_MAX: 3800, WINDOW: 900, WINDOW_TOUCH: 1100, REEL: 500 });
export const WATER_CODES = new Set([Col.WATER, Col.DEEP_WATER]);

/** The best rod in the bag -> ROD_TIERS row | null. bag: {has(id)} or {id: n}. */
export function bestRod(bag) {
  const has = (id) => (typeof bag?.has === 'function' ? bag.has(id) : (bag?.[id] || 0) > 0);
  let best = null;
  for (const r of ROD_TIERS) if (has(r.item)) best = r;
  return best;
}

/** The faced cell, if it is water the player can cast into. Generic rule: any walkable cell (grass edge, sand, a pier's
 * boards) facing a water / deep-water cell. No per-map pier data is needed. -> {x, y} | null */
export function facedWater(map, px, py, facing) {
  const d = DELTA[facing];
  if (!d || !map) return null;
  const x = px + d.x, y = py + d.y;
  if (!map.inBounds?.(x, y)) return null;
  if (!WATER_CODES.has(map.code(x, y))) return null;
  if (map.npcAt?.(x, y)) return null;
  if ((map.signs || []).some((s) => s.x === x && s.y === y)) return null;
  return { x, y };
}

/** The fishing table for (map, rod): the rod's own tier, else the best lower tier that is filled. -> {slots, from, tier} | null */
export function tableFor(tables, mapName, rod) {
  const m = tables?.maps?.[mapName];
  if (!m || !rod) return null;
  for (let t = rod.tier; t >= 1; t--) {
    const id = ROD_TIERS[t - 1].id, tab = m[id];
    if (tab?.slots?.length) return { ...tab, tier: id };
  }
  return null;
}

/** Bite chance for the rod (tables.rods[id].bite). */
export const biteChance = (tables, rod) => tables?.rods?.[rod?.id]?.bite ?? 0.7;

/** Weighted species pick + uniform level. Optional hasArt drops creatures without art (same rule as grass, #62). */
export function pickFish(table, rng = Math.random, hasArt = null) {
  const slots = (table?.slots || []).filter((s) => (s.weight ?? 1) > 0 && (!hasArt || hasArt(s.species)));
  const total = slots.reduce((a, s) => a + (s.weight ?? 1), 0);
  if (!total) return null;
  let r = rng() * total, slot = slots[slots.length - 1];
  for (const s of slots) { if ((r -= (s.weight ?? 1)) < 0) { slot = s; break; } }
  const [lo, hi] = Array.isArray(slot.level) ? slot.level : [slot.level, slot.level];
  return { species: slot.species, level: lo + Math.floor(rng() * (hi - lo + 1)) };
}

/**
 * One cast, decided up front (so tests and replays are deterministic). -> {bite: bool, waitMs, fish|null}
 * The player's timing is judged later by judgePress.
 */
export function planCast(tables, mapName, rod, rng = Math.random, hasArt = null) {
  const tab = tableFor(tables, mapName, rod);
  const waitMs = Math.round(TIMING.WAIT_MIN + rng() * (TIMING.WAIT_MAX - TIMING.WAIT_MIN));
  if (!tab) return { bite: false, waitMs, fish: null, empty: true };
  const bite = rng() < biteChance(tables, rod);
  return { bite, waitMs, fish: bite ? pickFish(tab, rng, hasArt) : null, table: tab.from, empty: false };
}

/** Judge an A press at time t (ms since the cast landed). -> 'early' | 'hooked' | 'late' | null (no press yet). */
export function judgePress(plan, t, pressed, touch = false) {
  const win = touch ? TIMING.WINDOW_TOUCH : TIMING.WINDOW;
  if (!plan.bite) return pressed ? 'early' : null; // reeling in on nothing: "early" (nothing was there)
  if (pressed && t < plan.waitMs) return 'early';
  if (pressed && t <= plan.waitMs + win) return 'hooked';
  if (t > plan.waitMs + win) return 'late';
  return null;
}

// ---- easing (adapted from tween.js Easing, MIT; Penner equations BSD) ----
export const ease = {
  quadOut: (k) => k * (2 - k),
  backOut: (k) => { const s = 1.70158; return --k * k * ((s + 1) * k + s) + 1; },
  sineInOut: (k) => 0.5 * (1 - Math.cos(Math.PI * k)),
};

/** Key name for the bite prompt from a profile control label ("the F key" -> "F", "Space" -> "Space"); default Space. */
export function biteKeyName(label) {
  const m = String(label || '').trim().match(/^(?:the\s+)?(.+?)(?:\s+key)?$/i);
  return (m && m[1]) || 'Space';
}

/** Bite prompt {key, text key} for a device: touch -> Tap A, controller -> Press A, keyboard -> Press <bound key>. */
export function bitePrompt({ touch = false, device = null, confirmLabel = null } = {}) {
  if (touch || device === 'touch') return { textKey: 'fishing.prompt_touch', key: 'A', icon: 'A' };
  if (device === 'controller') return { textKey: 'fishing.prompt_pad', key: 'A', icon: 'A' };
  const key = biteKeyName(confirmLabel);
  return { textKey: 'fishing.prompt_pc', key, icon: key };
}

/** Cast arc from the rod tip (a) to the water cell (b), k in 0..1 -> {x, y}. Parabola peaking `lift` px above the line. */
export function castArc(a, b, k, lift = 40) {
  const e = ease.quadOut(Math.max(0, Math.min(1, k)));
  return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e - Math.sin(Math.PI * e) * lift };
}

/** Placeholder text keys (Text Bot owns text/overworld_lines.json). Fallbacks are shown until the keys exist. */
export const TEXT = Object.freeze({
  'fishing.rod_received': ['{player} received the Fishing Rod!'],
  'fishing.rod_tip': ['Face the water and press A to cast. When the bobber dips, press A again.'],
  'fishing.giver_pages': ['That river has more in it than it lets on.', "Here, take my spare rod. Face the water, cast, and wait for the dip."],
  'fishing.cast': ['{player} cast the line.'],
  'fishing.wait': ['. . .'],
  'fishing.bite': ['!'],
  'fishing.hooked': ['Got a bite! Reel it in!'],
  'fishing.nothing': ['Not even a nibble.', 'The water stays quiet.', 'A leaf drifts past the bobber. That is all.'],
  'fishing.early': ['Too soon! The ripples fade.'],
  'fishing.late': ['It stole the bait and slipped away...'],
  'fishing.no_table': ['Nothing seems to live here.'],
  'fishing.no_rod': ['The water looks deep and calm.'],
  'fishing.no_team': ['Better bring a creature along first.'],
  'fishing.prompt_pc': ['Press {key}!'],
  'fishing.prompt_pad': ['Press A!'],
  'fishing.prompt_touch': ['Tap A!'],
  'fishing.battle_intro': ['{creature} leaps out of the water!'],
});
export const TEXT_KEYS = Object.keys(TEXT);
