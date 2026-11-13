// Creature plan library (Oct 23 2026, encounter-inventory worker). PLAN DATA ONLY: nothing here is loaded by the game.
// Shared by tools/build_creature_plan.mjs (writes the plan files), tools/gen_encounters.mjs (zone tables) and
// tests/creature_plan.test.mjs. Read-only on every existing file. Deterministic: same inputs, same output (no clock, no random).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
export const exists = (p) => existsSync(join(ROOT, p));

// ---------- rarity tiers (GUESS for Gary: weights per tier) ----------
// DEX rarity -> Gary's tier names. legendary -> very rare. Weights are roll weights inside one zone table.
export const TIER_OF = { common: 'common', uncommon: 'uncommon', rare: 'rare', legendary: 'very rare' };
export const TIER_WEIGHT = { common: 30, uncommon: 15, rare: 5, 'very rare': 1 };

// ---------- regions (by Master coin). Region 1 = Brookhollow through Master 1 (Gary). ----------
// wild bands: DEX_450 meta.zones_story_order wild_levels + the existing hand-made tables (not changed).
// trainer bands: envelope of the teams already recorded for that region (computed in buildTrainers), see region_pulls.json.
export const REGIONS = [
  { id: 1, key: 'r1_brookhollow_master1', name: 'Brookhollow to Master 1 (Fernwick)', master_map: 'fernwick_hall_int', coin: 1, wild: [2, 9],
    dex_zones: ['brookhollow', 'route1', 'fernwick'], maps: ['brookhollow', 'route1', 'route1_storm', 'fernwick', 'fernwick_hall_int'] },
  { id: 2, key: 'r2_master2', name: 'Thornwood to Master 2 (Saltmere)', master_map: 'saltmere_hall_int', coin: 2, wild: [9, 22],
    dex_zones: ['thornwood', 'route_east', 'aurelith', 'saltmere'], maps: ['thornwood', 'route_east', 'route_aurelith_saltmere', 'saltmere', 'saltmere_hall_int'] },
  { id: 3, key: 'r3_master3', name: 'Route Revival, Greystone to Master 3 (Revival Heights)', master_map: 'revival_hall_int', coin: 3, wild: [18, 27],
    dex_zones: ['route_revival', 'revival_heights', 'greystone'], maps: ['route_revival', 'revival_heights', 'revival_hall_int', 'greystone_entrance', 'greystone_b1'] },
  { id: 4, key: 'r4_master4', name: 'Frostspire Pass to Master 4 (Frostspire)', master_map: 'frostspire_hall_int', coin: 4, wild: [24, 33],
    dex_zones: ['frostspire_pass', 'frostspire'], maps: ['route_revival_saltmere', 'frostspire_pass', 'frostspire', 'frostspire_hall_int'] },
  { id: 5, key: 'r5_master5', name: 'Sunmeadow, Mirefen to Master 5 (Mirefen)', master_map: 'mirefen_hall_int', coin: 5, wild: [28, 41],
    dex_zones: ['route1_east', 'sunmeadow', 'mirefen_bog'], maps: ['route_revival_sunmeadow', 'sunmeadow_fields', 'route_sunmeadow_mirefen', 'route_saltmere_mirefen', 'mirefen_bog', 'mirefen', 'mirefen_hall_int'] },
  { id: 6, key: 'r6_master6', name: 'Coast Road to Master 6 (Tidewater Coast)', master_map: 'tidewater_hall_int', coin: 6, wild: [36, 45],
    dex_zones: ['coast_road', 'tidewater_coast'], maps: ['route_coast', 'tidewater_coast', 'tidewater_hall_int'] },
  { id: 7, key: 'r7_master7', name: 'Lanternport to Master 7', master_map: 'lanternport_hall_int', coin: 7, wild: [40, 47],
    dex_zones: ['lanternport'], maps: ['route_fernwick_lanternport', 'lanternport', 'lanternport_hall_int'] },
  { id: 8, key: 'r8_master8', name: 'Cindervale Road to Master 8 (Cindervale)', master_map: 'cindervale_hall_int', coin: 8, wild: [45, 53],
    dex_zones: ['cindervale_road', 'cindervale'], maps: ['route_cindervale', 'cindervale', 'cindervale_hall_int'] },
  { id: 9, key: 'r9_postgame', name: 'Postgame (Aurelith arena and beyond)', master_map: null, coin: null, wild: [50, 60],
    dex_zones: ['postgame'], maps: ['aurelith'] },
];
// aurelith is passed through in region 2 but its only trainers are the postgame arena (GD 57-64): map -> region 9 for trainers,
// DEX zone 'aurelith' species -> region 2 (wild 14-18). See notes in region_pulls.json.
export const REGION_OF_MAP = Object.fromEntries(REGIONS.flatMap((r) => r.maps.map((m) => [m, r.id])));
export const REGION_OF_DEXZONE = Object.fromEntries(REGIONS.flatMap((r) => r.dex_zones.map((z) => [z, r.id])));
// map -> DEX zone (for level bands + home-zone preference)
export const DEXZONE_OF_MAP = {
  brookhollow: 'brookhollow', route1: 'route1', route1_storm: 'route1', fernwick: 'fernwick', fernwick_hall_int: 'fernwick',
  thornwood: 'thornwood', route_east: 'route_east', aurelith: 'aurelith', route_aurelith_saltmere: 'aurelith', saltmere: 'saltmere', saltmere_hall_int: 'saltmere',
  route_revival: 'route_revival', revival_heights: 'revival_heights', revival_hall_int: 'revival_heights', greystone_entrance: 'greystone', greystone_b1: 'greystone',
  route_revival_saltmere: 'frostspire_pass', frostspire_pass: 'frostspire_pass', frostspire: 'frostspire', frostspire_hall_int: 'frostspire',
  route_revival_sunmeadow: 'sunmeadow', sunmeadow_fields: 'sunmeadow', route_sunmeadow_mirefen: 'mirefen_bog', route_saltmere_mirefen: 'mirefen_bog',
  mirefen_bog: 'mirefen_bog', mirefen: 'mirefen_bog', mirefen_hall_int: 'mirefen_bog',
  route_coast: 'coast_road', tidewater_coast: 'tidewater_coast', tidewater_hall_int: 'tidewater_coast',
  route_fernwick_lanternport: 'lanternport', lanternport: 'lanternport', lanternport_hall_int: 'lanternport',
  route_cindervale: 'cindervale_road', cindervale: 'cindervale', cindervale_hall_int: 'cindervale',
};
// World Design (design/overnight_gd) map names -> game map names
export const GD_MAP = { route_brookhollow_aurelith: 'route_east', route_saltmere_aurelith: 'route_aurelith_saltmere', route_thornwood_revival: 'route_revival',
  route_greystone_frostspire: 'frostspire_pass', route_brookhollow_tidewater: 'route_coast', route_aurelith_cindervale: 'route_cindervale',
  greystone_caverns: 'greystone_b1' };
export const gameMap = (m) => GD_MAP[m] || m;

export const STARTER_LINES = ['tumbloam', 'burrowmane', 'bastonox', 'cindrip', 'emberlunx', 'forgeharrow', 'rillop', 'brookhorn', 'tidemarrow'];
export const STARTERS = ['tumbloam', 'cindrip', 'rillop'];

// method string -> habitat class
export function methodClass(m) {
  const s = String(m || '');
  if (s.startsWith('fishing')) return 'water';
  if (s.startsWith('water')) return 'water';
  if (s.startsWith('cave')) return 'cave';
  return 'grass';
}
export const isRuntimeRollable = (z) => !z.inert && methodClass(z.method) !== 'water'; // src/battle/encounters.js skips water (no Tideglide runtime)

// ---------- DEX helpers ----------
export function loadDex() {
  const d = rd('design/DEX_450.json');
  const list = d.creatures;
  const byId = Object.fromEntries(list.map((c) => [c.id, c]));
  const zoneBand = Object.fromEntries(d.meta.zones_story_order.map((z) => {
    const m = String(z.wild_levels).match(/(\d+)\s*-\s*(\d+)/); const p = String(z.wild_levels).match(/(\d+)\+/);
    return [z.id, m ? [+m[1], +m[2]] : p ? [+p[1], +p[1] + 10] : null];
  }));
  return { list, byId, zoneBand, meta: d.meta };
}
/** parse a DEX evolution method -> {level:number|null, kind:'level'|'item'|'fossil'|'bond'|null, time?} */
export function evoOf(c) {
  const m = c?.evolution?.method;
  if (!m) return { level: null, kind: null };
  const lv = String(m).match(/^level\s+(\d+)(.*)$/i);
  if (lv) { const t = /night/i.test(lv[2]) ? ['night'] : /day/i.test(lv[2]) ? ['day'] : undefined; return { level: +lv[1], kind: 'level', time: t, method: m }; }
  if (/fossil/i.test(m)) return { level: null, kind: 'fossil', method: m };
  if (/shard/i.test(m)) return { level: null, kind: 'item', method: m };
  return { level: null, kind: 'bond', method: m };
}
/** lowest level this species can legally appear at (wild or trainer). Evolved forms: their evolution level. */
export function minLevelOf(dex, id) {
  const c = dex.byId[id]; if (!c) return 1;
  const e = evoOf(c);
  if (e.level) return e.level;
  if (c.evolution?.evolves_from) { // item/bond evolution: inherit the previous stage's minimum (no number to check against)
    return minLevelOf(dex, c.evolution.evolves_from);
  }
  return 1;
}

// ---------- registry (src/ui/data.js SPECIES = 16 hand-written + synced) ----------
export async function loadRegistry() {
  const { SPECIES, PLACEHOLDER_SKILLS } = await import(join(ROOT, 'src/ui/data.js'));
  const byId = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
  return { byId, PLACEHOLDER_SKILLS };
}

// ---------- encounter tables ----------
// existing = data/encounters_wired.json (what the game loads; hand-made slots + sync_added placeholder slots + inert World Design drafts).
export function loadTables() {
  const wired = rd('data/encounters_wired.json').zones;
  const live = rd('art/world/overworld/encounters/encounters.json').zones;
  const gd = {};
  for (const f of readdirSync(join(ROOT, 'design/overnight_gd')).filter((f) => /^encounters_.*\.json$/.test(f))) {
    const j = rd(`design/overnight_gd/${f}`);
    for (const z of j.zones || []) gd[z.id] = { file: f, map: gameMap(j.map || f.replace(/^encounters_|\.json$/g, '')), zone: z };
  }
  return { wired, live, gd };
}
export function mapOfTable(id, z, gd, allMaps) {
  if (z.maps?.length) return z.maps[0];
  if (gd[id]) return gd[id].map;
  const src = String(z.source || '').match(/encounters_(\w+)\.json/);
  if (src) return gameMap(src[1]);
  return allMaps.filter((m) => id.startsWith(m + '_')).sort((a, b) => b.length - a.length)[0] || null;
}

// ---------- maps ----------
export function loadMaps() {
  const dir = 'art/world/overworld/maps';
  const out = {};
  for (const f of readdirSync(join(ROOT, dir)).filter((f) => f.endsWith('.json'))) {
    const j = rd(`${dir}/${f}`);
    const cnt = (layer, code) => (layer || []).reduce((a, row) => a + (Array.isArray(row) ? row.filter((v) => v === code).length : 0), 0);
    const col = j.layers?.collision, enc = j.layers?.encounter;
    out[j.name || f.replace('.json', '')] = { json: j, water: cnt(col, 3), grass: cnt(enc, 1), cave: cnt(enc, 2), rects: j.encounter_zones || [] };
  }
  return out;
}

// ---------- learnset build (placeholder, existing skill names only) ----------
export const SKILL_POOL = { earth: 'earth', grass: 'earth', bug: 'earth', fire: 'fire', magma: 'fire', water: 'water', freshwater: 'water',
  sea: 'water', swamp: 'water', rain: 'water', wind: 'wind', bird: 'wind', light: 'light', angelic: 'light', god: 'light',
  dark: 'dark', ghost: 'dark', demon: 'dark', devil: 'dark', mystic: 'mystic', spirit: 'mystic', dragos: 'mystic', legendary: 'mystic' };

// copy of tools/sync_creatures.mjs placeholderStats (importing that script would run it and rewrite generated files)
const STAGE_TOTAL = { 1: 285, 2: 375, 3: 480 };
const LONE_TOTAL = 400;
const RARITY_MULT = { common: 1, uncommon: 1.04, rare: 1.08, legendary: 1.3 };
export const RARITY_CATCH = { common: 1, uncommon: 0.8, rare: 0.6, legendary: 0.08 };
const LEAN = {
  earth: [1.1, 1.05, 1.25, 0.8, 0.95, 0.85], fire: [0.95, 1.05, 0.9, 1.2, 0.9, 1.0], water: [1.05, 0.95, 1.0, 1.05, 1.1, 0.85],
  freshwater: [1.05, 0.95, 1.0, 1.05, 1.1, 0.85], sea: [1.15, 1.0, 1.05, 1.0, 1.0, 0.8], swamp: [1.15, 1.0, 1.05, 0.95, 1.0, 0.85],
  rain: [1.0, 0.9, 0.95, 1.1, 1.1, 0.95], wind: [0.9, 0.95, 0.85, 1.05, 0.95, 1.3], bird: [0.9, 1.1, 0.85, 0.95, 0.9, 1.3],
  grass: [1.05, 0.95, 1.05, 1.05, 1.1, 0.8], bug: [0.95, 1.1, 1.1, 0.85, 0.95, 1.05], light: [0.95, 0.85, 0.9, 1.25, 1.1, 0.95],
  angelic: [1.0, 0.85, 0.95, 1.15, 1.2, 0.85], dark: [0.9, 1.15, 0.9, 1.0, 0.9, 1.15], ghost: [0.85, 0.95, 0.9, 1.2, 1.05, 1.05],
  mystic: [0.95, 0.85, 0.9, 1.25, 1.1, 0.95], spirit: [1.0, 0.85, 0.95, 1.15, 1.15, 0.9], magma: [1.05, 1.15, 1.1, 1.0, 0.85, 0.85],
  demon: [0.95, 1.2, 0.9, 1.1, 0.85, 1.0], devil: [0.95, 1.1, 0.9, 1.2, 0.85, 1.0], dragos: [1.05, 1.15, 1.0, 1.05, 0.95, 0.95],
  god: [1.1, 1.0, 1.0, 1.1, 1.1, 0.95], legendary: [1.1, 1.05, 1.05, 1.05, 1.05, 0.95],
};
const KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export function placeholderStats(types, rarity, stage, lineLength) {
  const total = (lineLength > 1 ? STAGE_TOTAL[stage] || STAGE_TOTAL[3] : LONE_TOTAL) * (RARITY_MULT[rarity] || 1);
  const w = KEYS.map((_, i) => (LEAN[types[0]] || LEAN.earth)[i] * 0.7 + (LEAN[types[1] || types[0]] || LEAN.earth)[i] * 0.3);
  const sum = w.reduce((a, b) => a + b, 0);
  return Object.fromEntries(KEYS.map((k, i) => [k, Math.max(20, Math.round((total * w[i]) / sum))]));
}
