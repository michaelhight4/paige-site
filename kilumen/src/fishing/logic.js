// Fishing v1: pure rules (no DOM; Node-testable). Coder, Oct 29 2026. Flag: src/fishing/flags.js `fishing` (off).
// Structure follows the classic monster-RPG rod loop: a rod key item (upgradable tiers), face any water edge or pier
// and press A, wait for a bite, react inside a short window, then a normal wild battle against a creature from the
// map's fishing table (data/fishing_tables.json, built only from the existing water tables).
// Easing: Quadratic.Out / Back.Out / Sinusoidal.InOut adapted from tween.js (MIT, Robert Penner's equations, BSD) -
// see THIRD_PARTY_LICENSES "Fishing v1".
import { Col, DELTA } from '../overworld/constants.js?v=v0.2.81-alpha';

export const FISHING_URL = 'data/fishing_tables.json';
/** Rod tiers: Fishing Rod (Brookhollow fisher), Driftline Rod (Saltmere fisher), Lanternreach Rod (Lanternport keeper). Ids PLACEHOLDER. */
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

// ---- gear v1 (design/FISHING_GEAR.md, Gary approved Oct 29 2026) ----
// bite  p  = clamp(rods[r].bite + bait.bite, 0.05, 0.95)
// weight w' = w x R(rarity) x E(element); R = bait.rare | bait.uncommon | 1, E = bait.elementMult if bait.element in species el
/** Bait ids in picker order (tables.baits keys). */
export const BAIT_IDS = Object.freeze(['ripple_grub', 'reed_nymph', 'brine_fleck', 'glimmer_worm', 'deepgut_paste', 'lantern_moth', 'hollowstar_roe']);
/** Bait row for an id (or a row passed straight through) -> object | null. */
export const baitOf = (tables, bait) => (bait && typeof bait === 'object' ? bait : (bait && tables?.baits?.[bait]) || null);

/** Bite chance for the rod (tables.rods[id].bite) plus the bait, clamped to tables.bite_clamp (default 0.05..0.95). */
export function biteChance(tables, rod, bait = null) {
  const base = tables?.rods?.[rod?.id]?.bite ?? 0.7, b = baitOf(tables, bait);
  if (!b) return base;
  const [lo, hi] = tables?.bite_clamp || [0.05, 0.95];
  return Math.round(Math.min(hi, Math.max(lo, base + (b.bite || 0))) * 1e6) / 1e6;
}

/** Effective weight of one slot under a bait. elOf(species) -> element list (tables.species_el). */
export function effectiveWeight(slot, bait = null, elOf = null) {
  const w = slot.weight ?? 1;
  if (!bait || w <= 0) return Math.max(0, w);
  const r = slot.rarity || 'common';
  const R = r === 'rare' ? (bait.rare ?? 1) : r === 'uncommon' ? (bait.uncommon ?? 1) : 1;
  const E = bait.element && isWaterEl(elOf?.(slot.species)) && (elOf?.(slot.species) || []).includes(bait.element) ? (bait.elementMult ?? 1) : 1;
  return w * R * E;
}
/** Gary (Oct 29 2026, hard rule): fishing catches ONLY water-type Kilumen (element list includes 'water'). */
export const isWaterEl = (el) => Array.isArray(el) && el.includes('water');
export const elFrom = (tables) => (sp) => tables?.species_el?.[sp] || [];

/** Weighted species pick + uniform level. Optional hasArt drops creatures without art (same rule as grass, #62).
 * Optional bait row + elOf apply the gear multipliers; with elOf, any non-water species is dropped (water-only rule).
 * planCast always passes elOf, so fishing can never roll a non-water creature. Returns rarity too. */
export function pickFish(table, rng = Math.random, hasArt = null, bait = null, elOf = null) {
  const slots = (table?.slots || []).map((s) => ({ s, w: effectiveWeight(s, bait, elOf) }))
    .filter((x) => x.w > 0 && (!hasArt || hasArt(x.s.species)) && (!elOf || isWaterEl(elOf(x.s.species))));
  const total = slots.reduce((a, x) => a + x.w, 0);
  if (!total) return null;
  let r = rng() * total, slot = slots[slots.length - 1].s;
  for (const x of slots) { if ((r -= x.w) < 0) { slot = x.s; break; } }
  const [lo, hi] = Array.isArray(slot.level) ? slot.level : [slot.level, slot.level];
  return { species: slot.species, level: lo + Math.floor(rng() * (hi - lo + 1)), rarity: slot.rarity || 'common' };
}

/** Expected catches per 100 clean casts -> {bite, bites, common, uncommon, rare} (design §5 point 5). */
export function expectedPer100(tables, mapName, rod, bait = null) {
  const tab = tableFor(tables, mapName, rod), b = baitOf(tables, bait), elOf = elFrom(tables);
  const p = biteChance(tables, rod, b), out = { bite: p, bites: 100 * p, common: 0, uncommon: 0, rare: 0 };
  if (!tab) return { ...out, bites: 0 };
  const ws = tab.slots.filter((s) => isWaterEl(elOf(s.species))).map((s) => [s.rarity || 'common', effectiveWeight(s, b, elOf)]), tot = ws.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of ws) out[k] += (100 * p * w) / tot;
  return out;
}

/**
 * One cast, decided up front (so tests and replays are deterministic). -> {bite: bool, waitMs, fish|null}
 * The player's timing is judged later by judgePress.
 */
export function planCast(tables, mapName, rod, rng = Math.random, hasArt = null, bait = null) {
  const tab = tableFor(tables, mapName, rod), b = baitOf(tables, bait);
  const waitMs = Math.round(TIMING.WAIT_MIN + rng() * (TIMING.WAIT_MAX - TIMING.WAIT_MIN));
  if (!tab) return { bite: false, waitMs, fish: null, empty: true };
  const bite = rng() < biteChance(tables, rod, b);
  return { bite, waitMs, fish: bite ? pickFish(tab, rng, hasArt, b, elFrom(tables)) : null, table: tab.from, tier: tab.tier, empty: false };
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

// ---- rod gifts + earned baits (gear v1). Pure: flags = Set, bag = {has(id), count(id)} ----
export const ROD_GIFTS = Object.freeze({
  good: { map: 'saltmere', npc: 'saltmere_fisher', flag: 'got_rod_good', item: 'fishing_rod_good' },
  super: { map: 'lanternport', npc: 'lanternport_lighthouse_keeper', flag: 'got_rod_super', item: 'fishing_rod_super', moths: 3 },
});
export const MOORCOIL_SIGHTINGS = 3;
/** Flags a hook / bite leaves behind: fish_hooked, fished_<species>, hooked_moorcoil (Driftline+), moorcoil_seen_N. */
export function catchFlags(fish, rod, flags, hooked) {
  const out = [];
  if (!fish) return out;
  const tier = rod?.tier || 1;
  if (hooked) { out.push('fish_hooked', 'fished_' + fish.species); if (fish.species === 'moorcoil' && tier >= 2) out.push('hooked_moorcoil'); }
  if (fish.species === 'moorcoil' && tier >= 2) { let n = 1; while (flags?.has?.('moorcoil_seen_' + n)) n++; if (n <= MOORCOIL_SIGHTINGS) out.push('moorcoil_seen_' + n); }
  return out;
}
/** What a talk to this NPC hands out -> {kind, species?} | null. kinds: good, good_hint, super, super_hint, moth, roe. */
export function gearGiftFor(mapName, npcId, flags, bag) {
  const F = (f) => !!flags?.has?.(f), has = (id) => (typeof bag?.has === 'function' ? bag.has(id) : (bag?.[id] || 0) > 0);
  const G = ROD_GIFTS.good, S = ROD_GIFTS.super;
  if (mapName === G.map && npcId === G.npc) {
    if (!has('fishing_rod')) return null;
    if (!F(G.flag)) return { kind: F('fish_hooked') ? 'good' : 'good_hint' };
    for (const f of flags) { const m = /^fished_(.+)$/.exec(f); if (m && !F('roe_' + m[1])) return { kind: 'roe', species: m[1] }; }
    return null;
  }
  if (mapName === S.map && npcId === S.npc) {
    if (!F(G.flag)) return null;
    if (!F(S.flag)) return { kind: F('hooked_moorcoil') || F('moorcoil_seen_' + MOORCOIL_SIGHTINGS) ? 'super' : 'super_hint' };
    return has('lantern_moth') ? null : { kind: 'moth' };
  }
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
  'fishing.rare_bite': ['The line pulls hard. Something big is down there!'],
  // gear v1: bait picker + rod gifts (placeholder keys; Text Bot owns the words)
  'fishing.bait_title': ['Bait'],
  'fishing.bait_none': ['No bait'],
  'fishing.bait_out': ['That was the last of the {bait}.'],
  'fishing.bait_used': ['{player} hooked on a {bait}.'],
  'fishing.good_giver_pages': ['You caught one with that old stick? Not bad.', 'Take my Driftline Rod. It reaches the deeper water off the quay.'],
  'fishing.good_received': ['{player} received the Driftline Rod!'],
  'fishing.good_tip': ['The bobber sits deeper now. Bigger creatures bite at it.'],
  'fishing.good_hint': ['Land something from the harbour with that rod of yours, then come and show me.'],
  'fishing.super_hint': ['A long coil moves past the light at night. Hook one for me with a Driftline Rod.'],
  'fishing.super_giver_pages': ['So it was real. I have watched that coil for years.', 'The lamp needs me more than this rod does. Take it.'],
  'fishing.super_received': ['{player} received the Lanternreach Rod!'],
  'fishing.moth_received': ['{player} received {n} Lantern Moth!'],
  'fishing.moth_gift': ['The moths gather at the lamp every night. Take some.'],
  'fishing.roe_gift': ['Never seen one of those up close! Here, for your trouble.'],
  'fishing.roe_received': ['{player} received a Hollowstar Roe!'],
});
export const TEXT_KEYS = Object.keys(TEXT);
