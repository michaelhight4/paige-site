// Builds + validates the STAGED region-2 data from tools/region2/region2_spec.mjs. Oct 23 2026, coder (region-2 groundwork).
//   node tools/region2/build_region2.mjs          -> writes data/region2/encounters_region2.json, trainer_teams_region2.json, evo_conflicts_region2.json
//   node tools/region2/build_region2.mjs --check  -> validate only, writes nothing (exit 1 on any problem)
// Reads only; never touches live files (src/, art/world/overworld/, data/encounters_wired.json, src/battle/data/trainer_teams.js).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, rd, TIER_OF, TIER_WEIGHT, loadDex, evoOf, minLevelOf } from '../creature_plan/plan_lib.mjs';
import { BLOCKED_PHRASES } from '../text_lint/spellcheck.mjs';
import { buildCreatures } from '../../src/battle/data/creatures.js';
import { ZONES, TRAINERS } from './region2_spec.mjs';

const CHECK = process.argv.includes('--check');
const TODAY = '2026-10-23';
const C = buildCreatures();
const dex = loadDex();
const inv = rd('data/creature_inventory.json').species;
const ART = new Set(rd('art/world/overworld/encounters/encounters.json').species_with_art);
const R2_BAND = rd('data/trainer_pulls.json').trainer_bands?.R2 || [10, 21];
const BAD_WORDS = [...BLOCKED_PHRASES.map((p) => p.re), /\bshiny\b/i, /pok[eé]dex/i, /\bnurse\b/i, /\bweed\b/i, /\bthrow/i];
const problems = [], warnings = [];

const idOfName = Object.fromEntries(Object.entries(C).map(([id, c]) => [c.name, id]));
/** legal minimum level for a species: max(game evoLevel when it has a pre-form, DEX evolution minimum) */
export function legalMin(id) {
  const c = C[id];
  const game = c?.prevo ? (c.evoLevel || 1) : 1;
  const d = minLevelOf(dex, id);
  return { min: Math.max(game, d), game, dex: d, conflict: c?.prevo && d > 1 && game !== d };
}
function speciesOk(id, where) {
  if (!C[id]) { problems.push(`${where}: ${id} is not a game species (src/battle/data/creatures.js)`); return false; }
  if (!ART.has(id)) { problems.push(`${where}: ${id} has no art (species_with_art)`); return false; }
  return true;
}
const tierOf = (id) => TIER_OF[inv[id]?.rarity_dex] || 'common';

// ---------- encounters ----------
const zones = {};
for (const [zid, z] of Object.entries(ZONES)) {
  const slots = [];
  for (const s of z.slots) {
    if (!speciesOk(s.species, `zone ${zid}`)) continue;
    const L = legalMin(s.species);
    let [lo, hi] = s.level || z.band;
    if (lo < L.min) { warnings.push(`zone ${zid}: ${s.species} lo ${lo} raised to legal min ${L.min}`); lo = L.min; }
    if (lo > hi) { problems.push(`zone ${zid}: ${s.species} legal min ${L.min} > hi ${hi}`); continue; }
    if (lo < z.band[0] || hi > z.band[1]) problems.push(`zone ${zid}: ${s.species} [${lo},${hi}] outside band ${z.band}`);
    const tier = tierOf(s.species);
    slots.push({ species: s.species, level: [lo, hi], weight: TIER_WEIGHT[tier], tier, ...(s.time ? { time: s.time } : {}) });
  }
  if (new Set(slots.map((s) => s.species)).size !== slots.length) problems.push(`zone ${zid}: duplicate species`);
  if (!z.revisit) for (const ph of ['dawn', 'day', 'dusk', 'night']) {
    const n = slots.filter((s) => !s.time || s.time.includes(ph)).length;
    if (n < 4) problems.push(`zone ${zid}: only ${n} slots roll at ${ph}`);
  }
  for (const p of z.pending_art || []) if (ART.has(p)) warnings.push(`zone ${zid}: pending_art ${p} now has art, consider adding a slot`);
  zones[zid] = {
    method: z.method, rate: z.rate, slots, band: `wild ${z.band[0]}-${z.band[1]}`, maps: [z.map],
    source: `STAGED region 2 (coder ${TODAY}); start point design/overnight_gd/${z.gd}`,
    staged: true, rollable_when_wired: !z.revisit, ...(z.revisit ? { revisit: 'Tideglide (water runtime not built; encounters.js skips /^water/)' } : {}),
    ...(z.border ? { border_map: 'thornwood is reachable before Master 2 from Fernwick; region-1 map, not edited' } : {}),
    pending_art: z.pending_art || [], note: z.note,
  };
}

// ---------- trainers ----------
const teams = {}, info = {};
const mk = (arr, where, band) => arr.map(([species, level]) => {
  speciesOk(species, where);
  const L = legalMin(species);
  if (level < L.min) problems.push(`${where}: ${species} L${level} below legal min ${L.min} (game ${L.game}, DEX ${L.dex})`);
  if (level < band[0] || level > band[1]) problems.push(`${where}: ${species} L${level} outside trainer band ${band}`);
  return { species, level };
});
for (const t of TRAINERS) {
  const band = t.border ? [9, 13] : R2_BAND;
  if (t.byStarter) teams[t.key] = { byStarter: Object.fromEntries(Object.entries(t.byStarter).map(([st, arr]) => [st, mk(arr, `${t.key}[${st}]`, band)])) };
  else teams[t.key] = mk(t.team, t.key, band);
  info[t.key] = { gd_id: t.gd, class: t.cls, name_suggestion: t.name, ...(t.optional ? { optional: true } : {}), ...(t.master ? { master: true } : {}),
    ...(t.border ? { border_map: true } : {}), ...(t.unplaced ? { npc_not_on_map: true } : {}), ...(t.why ? { why: t.why } : {}) };
}

// ---------- evo conflicts (game vs DEX) for every species used ----------
const used = new Set([...Object.values(zones).flatMap((z) => z.slots.map((s) => s.species)),
  ...Object.values(teams).flatMap((t) => (Array.isArray(t) ? t : Object.values(t.byStarter).flat()).map((m) => m.species))]);
const conflicts = [];
for (const id of [...used].sort()) {
  const L = legalMin(id), c = C[id];
  if (L.conflict) conflicts.push({ species: id, prevo: idOfName[c.prevo] || c.prevo, game_evoLevel: L.game, dex_evo_level: L.dex, dex_method: dex.byId[id]?.evolution?.method, staged_min_used: L.min });
}

// ---------- blocked words in anything player-facing we wrote (names, classes) ----------
for (const [k, v] of Object.entries(info)) for (const s of [v.name_suggestion, v.class]) for (const re of BAD_WORDS) if (re.test(s || '')) problems.push(`${k}: blocked word in "${s}"`);

const meta = (what) => ({ _status: `STAGED ${TODAY} by coder (region-2 groundwork). NOT LIVE: nothing in the game reads this file. Wire in after region 1 ships.`,
  _generated_by: 'tools/region2/build_region2.mjs from tools/region2/region2_spec.mjs (edit the spec, not this file)', _what: what });
const encOut = { ...meta('Region-2 wild tables, encounters.json zone shape (src/battle/encounters.js). Weights: common 30 / uncommon 15 / rare 5 / very rare 1. No slot below the species\' legal min level (max of game evoLevel and DEX evo level).'), zones };
const trOut = { ...meta('Region-2 trainer teams, TRAINER_TEAMS shape (src/battle/data/trainer_teams.js): "<map>.<npc id>" -> [{species, level}] | {byStarter}. Copy `teams` entries into trainer_teams.js when wiring.'),
  trainer_band: R2_BAND, teams, info };
const evoOut = { ...meta('Species used in region-2 staged data whose game evoLevel (creatures.js) differs from the DEX evolution level. Gary undecided: game levels kept; staged mins use the higher of the two.'), conflicts };

console.log(`zones ${Object.keys(zones).length} (${Object.values(zones).reduce((a, z) => a + z.slots.length, 0)} slots), trainers ${Object.keys(teams).length}, evo conflicts ${conflicts.length}`);
for (const w of warnings) console.log('warn:', w);
for (const p of problems) console.log('PROBLEM:', p);
if (problems.length) process.exit(1);
if (!CHECK) {
  mkdirSync(join(ROOT, 'data/region2'), { recursive: true });
  const w = (f, o) => writeFileSync(join(ROOT, 'data/region2', f), JSON.stringify(o, null, 1) + '\n');
  w('encounters_region2.json', encOut); w('trainer_teams_region2.json', trOut); w('evo_conflicts_region2.json', evoOut);
  console.log('wrote data/region2/encounters_region2.json, trainer_teams_region2.json, evo_conflicts_region2.json');
} else console.log('check OK (nothing written)');
