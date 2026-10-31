// Ron's teams, all game (Coder, Oct 29 2026; Gary 5:09 PM rule). Replaces the hand-written per-fight Ron teams at fight time.
// - Base 3 (same Kilu all game, evolved to fit each fight's level):
//     1. Peeplark line (peeplark > larkspar 16 > galespar 32), his first Kilu (Ron 1 opener).
//     2. The counter-starter line (RON_COUNTER: the starter that beats the player's), always his ace, last slot, top level.
//     3. Sailquill (single stage), in every authored Ron team from Ron 2 on.
// - Rolled 3 (Gary 5:24 PM CT): RE-ROLLED for each Ron fight from that fight's own region pool (ron_pools.gen.js), seeded
//   by the save's seed (save.ron_roll.seed, from the save ID) + the fight number, so a rematch / reload gives the same
//   team. No repeats, never a base-3 or starter line (pools exclude them); each evolved to that fight's level.
// - Team sizes keep the authored region 1-3 sizes (2 / 3 / 4); from Ron 4 on he carries a full 6. Smaller teams fill base
//   first (peeplark, counter, sailquill), then rolled slots in order.
// Pure data + helpers (node tools and the browser).
import { evoTable } from '../../systems/evolution.js?v=v0.2.108-alpha';
import { RON_COUNTER, STARTERS } from './starters.js?v=v0.2.108-alpha';
import { ENDING } from '../../progression/ending.js?v=v0.2.108-alpha';
import { RON_POOLS, RON_FORMS_OK } from './ron_pools.gen.js?v=v0.2.108-alpha';

export const RON_BASE = ['peeplark', 'counter', 'sailquill'];
/** Fights where Ron fields ONLY final-evolution Kilu (Gary 5:42 PM CT): base 3 forced to final stage, rolled pools filtered
 *  to lines whose final stage he can field (single-stage species count as final). */
export const RON_FINAL_ONLY = ['ron_6', 'ron_final'];
/** Fight -> level per slot (ascending, ace last) + where the rolled slots debut. Levels: LEVEL_CURVE_V2 (approved). */
export const RON_FIGHTS = {
  ron_1: { levels: [7, 8] },
  ron_2: { levels: [15, 15, 16] },
  ron_3: { levels: [21, 22, 22, 23] },
  ron_4: { levels: [30, 30, 30, 31, 31, 32] },
  ron_5: { levels: [46, 47, 47, 48, 49, 50] },
  ron_6: { levels: [62, 62, 63, 63, 64, 64] },
  ron_final: { levels: [66, 67, 67, 68, 68, 68] },
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

// ---- seeded roll -------------------------------------------------------------------------------------------------------
export function seedOf(str) { let h = 2166136261; for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The save's Ron seed: {v:2, seed}. Deterministic for a save ID (or a number). */
export function rollRon(seedOrId) {
  return { v: 2, seed: typeof seedOrId === 'number' ? seedOrId >>> 0 : seedOf(seedOrId || 'ron') };
}
/** A stored roll if it has a finite seed (v1 rolls keep their seed; their old picks are dropped), else null. */
export function normRonRoll(o) {
  if (!o || typeof o !== 'object' || !Number.isFinite(o.seed)) return null;
  return { v: 2, seed: o.seed >>> 0 };
}
/** The save's roll; old saves without one get it from their save ID. */
export function ensureRonRoll(save) { return normRonRoll(save?.ron_roll) || rollRon(save?.saveId || 'ron'); }

/** Rolled lineages (line roots) for one fight: n distinct picks from that fight's pool, seeded by save seed + fight number. */
export function rolledFor(fight, n, roll, pools = RON_POOLS) {
  const num = RON_ORDER.indexOf(fight) + 1, r = rng(seedOf(`${roll.seed}:${num}`)), opts = [...poolFor(fight, pools)], out = [];
  while (out.length < n && opts.length) out.push(opts.splice(Math.floor(r() * opts.length), 1)[0]);
  return out;
}

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

/** Last form of root's level line, or null when that form has no art / is not fieldable (FORMS_OK). */
export function finalStage(root, table = evoTable()) {
  let s = root;
  for (let i = 0; i < 4 && table[s]; i++) s = table[s].to;
  return FORMS_OK.has(s) ? s : null;
}
/** Rolled-slot pool for a fight (final-only fights keep only lines with a fieldable final stage). */
export function poolFor(fight, pools = RON_POOLS) {
  const p = pools[fight] || [];
  return RON_FINAL_ONLY.includes(fight) ? p.filter((r) => finalStage(r)) : p;
}

/** Ron's team for a fight: [{species, level}] ace last. starter = the player's (nibbin | cindrip | rillop | tumbloam). */
export function ronTeam(fight, starter, roll = getRonRoll()) {
  const f = RON_FIGHTS[fight]; if (!f) return null;
  const counter = RON_COUNTER[starter] || RON_COUNTER[STARTERS[0]];
  const n = f.levels.length;
  const roots = ['peeplark', 'sailquill', ...rolledFor(fight, Math.max(0, n - 3), roll)]; // non-ace slots: base first, then this fight's roll
  const others = roots.slice(0, n - 1);
  const form = RON_FINAL_ONLY.includes(fight) ? (r) => finalStage(r) || stageFor(r, 100) : (r, lv) => stageFor(r, lv);
  const team = others.map((r, i) => ({ species: form(r, f.levels[i]), level: f.levels[i] }));
  team.push({ species: form(counter, f.levels[n - 1]), level: f.levels[n - 1] });
  return team;
}
