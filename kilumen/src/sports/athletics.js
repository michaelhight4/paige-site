// Kilumen sports: per-creature athletic stats (Speed, Power, Stamina, Agility, Focus) + 1-2 event traits. Dev, Oct 28 2026.
// Stored on the creature as c.ath = { v: 1, q: {speed: 0..1, ...}, traits: [...] }. q is the creature's place INSIDE its
// species range, so the stat value is lo + q*(hi-lo) of the CURRENT species: an evolved creature keeps its individuality
// and moves up to the new range. The roll is seeded from the creature's uid, so a lazy roll for an old save gives the same
// numbers every time (and on every device) and needs no save at all to stay stable.
import { ATHLETICS } from './data/athletics.gen.js?v=v0.2.83-alpha';
import { STATS, TRAITS, SECOND_TRAIT_CHANCE } from './rules.js?v=v0.2.83-alpha';
import { rngFor } from './rng.js?v=v0.2.83-alpha';

export const ATH_VERSION = 1;
const FALLBACK = { shape: 'standard', ranges: Object.fromEntries(STATS.map((s) => [s, [36, 64]])), traitWeights: Object.fromEntries(TRAITS.map((t) => [t, 5])) };
export const speciesAthletics = (sp) => ATHLETICS[sp] || FALLBACK;
const uidOf = (c) => c?.uid || c?.id || null;

function pickWeighted(rng, weights, exclude = []) {
  const ents = Object.entries(weights).filter(([k]) => !exclude.includes(k));
  let r = rng() * ents.reduce((n, [, w]) => n + w, 0);
  for (const [k, w] of ents) { if ((r -= w) < 0) return k; }
  return ents[ents.length - 1][0];
}

/** Pure roll. seed: any string (uid). Quantiles are the mean of two uniforms: centred, extremes rare. */
export function rollAthletics(species, seed) {
  const rng = rngFor('ath1:' + seed);
  const q = {};
  for (const s of STATS) q[s] = Math.round(((rng() + rng()) / 2) * 1000) / 1000;
  const w = speciesAthletics(species).traitWeights;
  const traits = [pickWeighted(rng, w)];
  if (rng() < SECOND_TRAIT_CHANCE) traits.push(pickWeighted(rng, w, traits));
  return { v: ATH_VERSION, q, traits };
}

/** Lazy migration: give c.ath if it is missing or from an older version. Deterministic from uid. Returns c.ath. */
export function ensureAthletics(c) {
  if (!c) return null;
  if (c.ath?.v === ATH_VERSION && c.ath.q) return c.ath;
  const seed = uidOf(c) || `${c.species}:${c.level || 0}`;
  c.ath = rollAthletics(c.species, seed);
  return c.ath;
}

// Fruit feeds (src/feeds, flag off by default): a provider c -> {stat: flat bonus} set only when feeds are on. Null = no change.
let bonusFn = null;
export function setAthleticBonus(fn) { bonusFn = typeof fn === 'function' ? fn : null; }
/** Integer stat values for a creature (rolls lazily). */
export function athleticStats(c) {
  const a = ensureAthletics(c), R = speciesAthletics(c.species).ranges, out = {};
  for (const s of STATS) { const [lo, hi] = R[s]; out[s] = Math.round(lo + a.q[s] * (hi - lo)); }
  if (bonusFn) { let b = null; try { b = bonusFn(c); } catch { b = null; } if (b) for (const s of STATS) out[s] = Math.min(100, out[s] + (b[s] | 0)); }
  return out;
}

/** Rival creatures for an event: quantiles pulled toward `skew` (0.75 = above-average rivals; games are meant to be hard). */
export function rollRivalAthletics(species, seed, skew = 0.75, pull = 0.3) {
  const a = rollAthletics(species, 'rival:' + seed);
  for (const s of STATS) a.q[s] = Math.round(Math.max(0, Math.min(1, a.q[s] * (1 - pull) + skew * pull)) * 1000) / 1000;
  return a;
}
