// Ron's teams, all game (Coder, Oct 29 2026; Gary 5:09 PM rule). Replaces the hand-written per-fight Ron teams at fight time.
// - Base 3 (same Kilu all game, evolved to fit each fight's level):
//     1. Peeplark line (peeplark > larkspar 16 > galespar 32), his first Kilu (Ron 1 opener).
//     2. The counter-starter line (RON_COUNTER: the starter that beats the player's), always his ace, last slot, top level.
//     3. Sailquill (single stage), in every authored Ron team from Ron 2 on.
// - Rolled 3: picked ONCE per save from a seed (save.ron_roll), each a lineage (line root). Rolled slot k debuts in the
//   first fight big enough to need it and is drawn from THAT fight's region pool (ron_pools.gen.js); from then on it is the
//   same lineage in every later fight, evolved to that fight's level. No repeats, never a base-3 or starter line.
// - Team sizes keep the authored region 1-3 sizes (2 / 3 / 4); from Ron 4 on he carries a full 6. Smaller teams fill base
//   first (peeplark, counter, sailquill), then rolled slots in order.
// Pure data + helpers (node tools and the browser).
import { evoTable } from '../../systems/evolution.js?v=v0.2.87-alpha';
import { RON_COUNTER, STARTERS } from './starters.js?v=v0.2.87-alpha';
import { ENDING } from '../../progression/ending.js?v=v0.2.87-alpha';
import { RON_POOLS, RON_FORMS_OK } from './ron_pools.gen.js?v=v0.2.87-alpha';

export const RON_BASE = ['peeplark', 'counter', 'sailquill'];
/** Fight -> level per slot (ascending, ace last) + where the rolled slots debut. Levels: LEVEL_CURVE_V2 (approved). */
export const RON_FIGHTS = {
  ron_1: { levels: [7, 8] },
  ron_2: { levels: [15, 15, 16] },
  ron_3: { levels: [21, 22, 22, 23] },
  ron_4: { levels: [30, 30, 30, 31, 31, 32] },
  ron_5: { levels: [47, 47, 48, 48, 48, 49] },
  ron_6: { levels: [58, 59, 59, 60, 61, 62] },
  ron_final: { levels: [67, 67, 68, 68, 68, 69] },
};
export const RON_ORDER = Object.keys(RON_FIGHTS);
/** TRAINER_TEAMS keys ({map}.{id}) -> fight. The final fight's map (tower bottom, aurelith_arena_int) is not built yet. */
export const RON_KEYS = {
  'fernwick.ron_rival_1': 'ron_1',
  'saltmere.saltmere_ron_2': 'ron_2',
  'revival_heights.revival_heights_ron_3': 'ron_3',
  'frostspire_pass.frostspire_pass_ron_4': 'ron_4',
  'tidewater_coast.tidewater_coast_ron_5': 'ron_5',
  'tidewater_coast.tidewater_coast_ron_5_slip': 'ron_5',
  'aurelith.aurelith_ron_6': 'ron_6',
  'aurelith_arena_int.aurelith_arena_ron_final': 'ron_final',
};
/** Final Ron: appears at the tower bottom only once these flags are set; winning sets winFlag (ending.js ENDING.tower). */
export const RON_FINAL = { key: 'aurelith_arena_int.aurelith_arena_ron_final', requires: [ENDING.tower[0], 'tower_healed'], winFlag: ENDING.tower[1] }; // tower floor 8 done + healed; win flag

/** Fight where rolled slot k (0..2) first appears: the first fight whose size exceeds 3 + k. */
export function debutFight(k) { return RON_ORDER.find((f) => RON_FIGHTS[f].levels.length > 3 + k) || null; }

// ---- seeded roll -------------------------------------------------------------------------------------------------------
export function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** Roll Ron's 3 lineages for a save. Deterministic for a seed. -> {v:1, seed, picks:[root, root, root]} */
export function rollRon(seedOrId, pools = RON_POOLS) {
  const seed = typeof seedOrId === 'number' ? seedOrId >>> 0 : seedOf(seedOrId || 'ron');
  const r = rng(seed), picks = [];
  for (let k = 0; k < 3; k++) {
    const opts = (pools[debutFight(k)] || []).filter((s) => !picks.includes(s));
    picks.push(opts.length ? opts[Math.floor(r() * opts.length)] : null);
  }
  return { v: 1, seed, picks };
}
/** A stored roll if it is well-formed (3 distinct strings), else null (caller rolls). */
export function normRonRoll(o) {
  if (!o || typeof o !== 'object' || !Array.isArray(o.picks) || o.picks.length !== 3) return null;
  if (!o.picks.every((p) => typeof p === 'string' && p) || new Set(o.picks).size !== 3 || !Number.isFinite(o.seed)) return null;
  return { v: 1, seed: o.seed >>> 0, picks: [...o.picks] };
}
/** The save's roll, rolling (old saves) from its saveId when missing. */
export function ensureRonRoll(save) { return normRonRoll(save?.ron_roll) || rollRon(save?.saveId || 'ron'); }

let _roll = null;
export function setRonRoll(roll) { _roll = normRonRoll(roll); }
export function getRonRoll() { return _roll || (_roll = rollRon('ron')); }

// ---- stage for level ---------------------------------------------------------------------------------------------------
/** Evolve `root` by level along the game's evolution data (evolution.js evoTable); never into a form without art. */
const FORMS_OK = new Set(RON_FORMS_OK);
export function stageFor(root, level, table = evoTable()) {
  let s = root;
  for (let i = 0; i < 4 && table[s] && level >= table[s].level && FORMS_OK.has(table[s].to); i++) s = table[s].to;
  return s;
}

/** Ron's team for a fight: [{species, level}] ace last. starter = the player's (nibbin | cindrip | rillop | tumbloam). */
export function ronTeam(fight, starter, roll = getRonRoll()) {
  const f = RON_FIGHTS[fight]; if (!f) return null;
  const counter = RON_COUNTER[starter] || RON_COUNTER[STARTERS[0]];
  const roots = ['peeplark', 'sailquill', ...roll.picks.filter(Boolean)]; // non-ace slots, base first then rolled in order
  const n = f.levels.length, others = roots.slice(0, n - 1);
  const team = others.map((r, i) => ({ species: stageFor(r, f.levels[i]), level: f.levels[i] }));
  team.push({ species: stageFor(counter, f.levels[n - 1]), level: f.levels[n - 1] });
  return team;
}
