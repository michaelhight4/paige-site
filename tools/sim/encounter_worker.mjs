// Piscina worker for tools/sim/encounter_sim.mjs: rolls one encounter zone N times with a seeded RNG.
import { pickSlot, slotOk } from '../../src/battle/encounters.js';

const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

export default function run({ id, zone, ctx, n, seed }) {
  const rng = mulberry32(seed), species = {}, levels = [];
  let misses = 0;
  for (let i = 0; i < n; i++) {
    const hit = pickSlot(zone, ctx, rng);
    if (!hit) { misses++; continue; }
    species[hit.species] = (species[hit.species] || 0) + 1;
    levels.push(hit.level);
  }
  const live = (zone.slots || []).filter((s) => (s.weight || 0) > 0 && slotOk(s, ctx));
  const total = live.reduce((a, s) => a + s.weight, 0), expected = {};
  for (const s of live) expected[s.species] = (expected[s.species] || 0) + s.weight / total;
  // steps until the first encounter at this zone's rate (geometric), for the "how grindy is it" read-out
  const rate = Math.min(zone.rate ?? 0.1, 0.2), steps = [];
  for (let i = 0; i < Math.min(n, 5000); i++) { let k = 1; while (rng() >= rate && k < 500) k++; steps.push(k); }
  return { id, ctx, n, misses, species, expected, levels, steps };
}
