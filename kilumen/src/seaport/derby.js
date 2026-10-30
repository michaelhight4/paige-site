// Gullhaven Fishing Derby: pure rules (Coder, dev/seaport, Oct 30 2026). No DOM, no scene. Tests: tests/seaport_derby.test.mjs.
// Design + tables: design/seaport/PLAN.md. Scoring board shape adapted from RiverKing (Apache-2.0, anry88/RiverKing @c0a540b,
// TournamentService.leaderboard metrics largest / total_weight / count): see THIRD_PARTY_LICENSES. Written fresh in JS.
export const DERBY_MAP = 'gullhaven_lagoon';
export const CRYSTAL = Object.freeze({ id: 'tidelumen', name: 'Tidelumen', perRun: 10 }); // lore: tide-cut lumen shards, only good for the derby
export const RARITY_POINTS = Object.freeze({ common: 10, uncommon: 25, rare: 60 });
export const WEIGHT_POINTS_MAX = 20;      // a top-of-range weight adds up to +20 on top of the rarity points
export const HEAVY_EXP = 2.2;             // w = min + (max-min) * r^2.2 : heavy rolls are rare (P(frac >= .9) ~ 4.7%)
export const RECORD_FRAC = 0.95;          // a "record size" roll (frac >= 0.95): +15
export const RECORD_BONUS = 15;
export const PERSONAL_BEST_BONUS = 5;     // heavier than this save's species record: +5
export const FEATURED_MULT = 2;           // the featured Kilu's catch points are doubled
export const COUNT_POINTS = 2;            // +2 per fish in the haul (RiverKing "count")
export const HEAVIEST_BONUS = 10;         // +10 for the heaviest single fish (RiverKing "largest")
export const TIERS = Object.freeze([      // prize board (highest first); prizes are existing items
  { id: 'crest', min: 380, prize: { item: 'hollowstar_roe', n: 1 } },
  { id: 'gold', min: 260, prize: { item: 'lantern_moth', n: 3 } },
  { id: 'silver', min: 150, prize: { item: 'glimmer_worm', n: 3 } },
  { id: 'bronze', min: 60, prize: { item: 'potion', n: 2 } },
]);
// kg ranges for water-type Kilu (per species). Others in the water fall back to DEFAULT_RANGE.
export const WEIGHT_RANGES = Object.freeze({
  wavelin: [2.0, 9.0], reefshell: [4.0, 14.0], ribboneel: [3.0, 18.0], breakerfin: [12.0, 45.0], hullwhale: [60.0, 240.0],
  spratwyrm: [8.0, 32.0], tidemarrow: [20.0, 85.0], plashcrown: [15.0, 60.0], paleminnow: [0.2, 1.2], finnip: [0.5, 3.0],
  whelkin: [1.0, 6.0], bulwarkrab: [10.0, 40.0], drenchcrab: [3.0, 12.0], musselin: [0.5, 2.5], pinchkin: [0.4, 2.0], polypip: [0.3, 1.8],
});
export const DEFAULT_RANGE = Object.freeze([1.0, 10.0]);
export const TEXT = Object.freeze({ // placeholder keys; Text Bot fills them (design/seaport/TEXT_NEEDED.md)
  'derby.desk_intro': ['[PLACEHOLDER derby.desk_intro] Gullhaven Fishing Derby. {n} Tidelumens, one per cast. Featured Kilu today: {featured} (x{mult}). Enter?'],
  'derby.desk_busy': ['[PLACEHOLDER derby.desk_busy] Tidelumens left: {n}. Score so far: {score}.'],
  'derby.start': ['[PLACEHOLDER derby.start] The derby is on. The clock stops until you turn in.'],
  'derby.no_crystal': ['[PLACEHOLDER derby.no_crystal] No Tidelumens left. Bring your haul to the scale.'],
  'derby.catch': ['[PLACEHOLDER derby.catch] {species}: {kg} kg. {points} points.'],
  'derby.catch_featured': ['[PLACEHOLDER derby.catch_featured] The featured Kilu! {species}: {kg} kg. {points} points.'],
  'derby.record': ['[PLACEHOLDER derby.record] A record size!'],
  'derby.out': ['[PLACEHOLDER derby.out] That was your last Tidelumen. Time for the weigh-in.'],
  'derby.leave_ask': ['[PLACEHOLDER derby.leave_ask] Leave now and the run is forfeit. Quit the derby?'],
  'derby.forfeit': ['[PLACEHOLDER derby.forfeit] Run forfeit. The haul goes back in the water.'],
  'derby.scale_idle': ['[PLACEHOLDER derby.scale_idle] The weigh-in scale. Best score: {best}.'],
  'derby.turn_in': ['[PLACEHOLDER derby.turn_in] Final score: {score}. Prize tier: {tier}.'],
  'derby.no_tier': ['[PLACEHOLDER derby.no_tier] Final score: {score}. No prize this time.'],
  'derby.new_best': ['[PLACEHOLDER derby.new_best] A new best score!'],
  'derby.keeper': ['[PLACEHOLDER derby.keeper] Your heaviest catch, {species} ({kg} kg), comes home with you.'],
  'derby.turn_in_early': ['[PLACEHOLDER derby.turn_in_early] Turn in now with {n} Tidelumens unused?'],
});

export const rangeOf = (species) => WEIGHT_RANGES[species] || DEFAULT_RANGE;
/** Weight roll: r in [0,1) -> { kg (1 dp), frac in [0,1] }. Heavy rolls are rare (r^HEAVY_EXP). */
export function rollWeight(species, r) {
  const [lo, hi] = rangeOf(species); const frac = Math.min(1, Math.max(0, r)) ** HEAVY_EXP;
  const kg = Math.round((lo + (hi - lo) * frac) * 10) / 10;
  return { kg, frac: hi > lo ? Math.min(1, Math.max(0, (kg - lo) / (hi - lo))) : 0 };
}
/** Points for one catch. records: {species: kg} from the save. */
export function catchPoints({ species, rarity = 'common', kg, frac }, { featured = null, records = {} } = {}) {
  const base = RARITY_POINTS[rarity] ?? RARITY_POINTS.common;
  const weight = Math.round(WEIGHT_POINTS_MAX * frac);
  const record = frac >= RECORD_FRAC ? RECORD_BONUS : 0;
  const pb = records[species] != null && kg > records[species] ? PERSONAL_BEST_BONUS : 0;
  const isFeatured = !!featured && species === featured;
  const total = (base + weight + record + pb) * (isFeatured ? FEATURED_MULT : 1);
  return { base, weight, record, pb, featured: isFeatured, total };
}
/** Featured Kilu for a run: one species from the derby water's pool (all rod tiers), weighted equally. */
export function derbyPool(tables, map = DERBY_MAP) {
  const t = tables?.maps?.[map]; if (!t) return [];
  const s = new Set(); for (const tier of Object.values(t)) for (const sl of tier?.slots || []) s.add(sl.species);
  return [...s].sort();
}
export function pickFeatured(pool, r) { return pool.length ? pool[Math.min(pool.length - 1, Math.floor(r * pool.length))] : null; }

export function newRun(featured, crystals = CRYSTAL.perRun) { return { crystals, featured, haul: [], score: 0 }; }
export function useCrystal(run) { if (!run || run.crystals <= 0) return false; run.crystals--; return true; }
/** Add a hooked fish to the haul. fish {species, level, rarity}; r = weight roll random. Returns the scored catch. */
export function addCatch(run, fish, r, records = {}) {
  const w = rollWeight(fish.species, r);
  const c = { species: fish.species, level: fish.level, rarity: fish.rarity || 'common', kg: w.kg, frac: w.frac };
  c.points = catchPoints(c, { featured: run.featured, records });
  run.haul.push(c); run.score = scoreRun(run).total; return c;
}
export function scoreRun(run) {
  const catches = run.haul.reduce((a, c) => a + c.points.total, 0);
  const count = run.haul.length * COUNT_POINTS;
  const heaviest = run.haul.length ? HEAVIEST_BONUS : 0;
  return { catches, count, heaviest, total: catches + count + heaviest,
    largest: run.haul.reduce((m, c) => (!m || c.kg > m.kg ? c : m), null), totalKg: Math.round(run.haul.reduce((a, c) => a + c.kg, 0) * 10) / 10 };
}
export const tierFor = (score) => TIERS.find((t) => score >= t.min) || null;
export function blankRecord() { return { best: 0, runs: 0, records: {}, last: null, active: null }; }
/** Close a run into the save record. Returns {result, record}. Forfeit -> score 0, no prize, no records. */
export function finishRun(rec, run, { forfeit = false } = {}) {
  const R = { ...blankRecord(), ...(rec || {}) }; R.records = { ...(R.records || {}) };
  const s = scoreRun(run); const score = forfeit ? 0 : s.total; const tier = forfeit ? null : tierFor(score);
  const result = { score, tier: tier?.id || null, featured: run.featured, catches: run.haul.length, largest: s.largest ? { species: s.largest.species, kg: s.largest.kg } : null, forfeit };
  if (!forfeit) for (const c of run.haul) if (!(R.records[c.species] >= c.kg)) R.records[c.species] = c.kg;
  const newBest = !forfeit && score > (R.best || 0);
  if (newBest) R.best = score;
  R.runs = (R.runs || 0) + 1; R.last = result; R.active = null;
  return { result: { ...result, newBest, prize: tier?.prize || null }, record: R };
}
/** Is a move from the derby map to `toMap` leaving the derby area? */
export const leavesArea = (fromMap, toMap) => fromMap === DERBY_MAP && toMap !== DERBY_MAP;
