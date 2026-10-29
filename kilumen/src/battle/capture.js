// Capture rules (Oct 23, 2026; Gary 12:03 PM CT: "also the capture chance is based on health and chance, but also no
// capturing trainers creatures"). Pure, no imports: used by the ?battle=shell screen (src/ui/ui.js) and the tests.
// The engine runs the SAME formula in vendor/battle-sim/sim/kilumen.ts runCrystal (kept in sync; tests/capture_rules.test.mjs
// checks the engine's rates against captureChance below).
//
// Retuned 12:16 PM CT (Gary: "full health needs to be like 2%"):
//   chance = clamp(catchRate x (1 - 29/30 x (hp/maxHp)^0.85) x status x crystal grade, 0.5%, 95%)
//     hpWeight 29/30: full HP keeps 1/30 of catchRate (common 0.6 -> 2%, rare 0.24 -> 0.8%)
//     hpCurve 0.85: concave, so weakening pays off steadily (common 75% 15%, 50% 28%, 25% 42%, 1 HP of 23 56%)
//     catchRate: the species rarity term (species_synced.gen.js per species, else creatures.js 0.6 / 0.4 / 0.2 by stage)
//     status:    existing catchStatus bonus (rules.js: Drowsy x2, Scorched x1.5), 1 otherwise
//     grade:     existing crystal grade (Dominance Crystal 1, Prime Crystal 1.5)
//   One random roll r in [0, 1): caught when r < chance.
//   Pulses (the 1-4 capture FX pulses) come from that same roll: caught -> 4; escaped -> 3 for a near miss down to 1
//   for a far miss (how far r landed above chance).
// Numbers are PLACEHOLDERS (MECHANICS_PARITY B13/B17) until Gary signs them off.
export const CAPTURE = { hpWeight: 29 / 30, hpCurve: 0.85, min: 0.005, max: 0.95, pulses: 4 };

/** capture chance 0..1 */
export function captureChance({ rarity = 0.5, hp = 1, maxHp = 1, status = 1, grade = 1, heldMult = 1 } = {}, K = CAPTURE) { // heldMult: Tamer's Thread x1.2 (held items, Oct 29 2026; engine twin: kCatchMult)
  const frac = Math.max(0, Math.min(1, maxHp > 0 ? hp / maxHp : 1));
  const p = rarity * (1 - (K.hpWeight ?? CAPTURE.hpWeight) * Math.pow(frac, K.hpCurve ?? CAPTURE.hpCurve)) * status * grade * heldMult;
  return Math.max(K.min ?? CAPTURE.min, Math.min(K.max ?? CAPTURE.max, p));
}

/** one roll r (0..1) against chance p -> { caught, pulses 1-4 }; forced (tests) overrides caught only */
export function captureRoll(p, r, forced, K = CAPTURE) {
  const n = K.pulses ?? CAPTURE.pulses;
  const caught = typeof forced === 'boolean' ? forced : r < p;
  if (caught) return { caught, pulses: n };
  const miss = p < 1 ? Math.max(0, Math.min(1, (r - p) / (1 - p))) : 0; // 0 = just missed, 1 = nowhere near
  return { caught, pulses: Math.max(1, Math.min(n - 1, 1 + Math.floor((1 - miss) * (n - 1)))) };
}

/**
 * Board key cards (Oct 29 2026): research-area species catch harder. A species is 'research' when it carries research:true
 * (species data) or its id is in RESEARCH_SPECIES (empty until Gary picks the roster; NODES.md lists proposals).
 * Applied to the rarity term in rarityOf AND to creatures.js catchRate, so the engine (runCrystal) sees the same number.
 */
export const RESEARCH_CATCH_MULT = 0.6; // PLACEHOLDER
export const RESEARCH_SPECIES = new Set();
export const isResearch = (sp) => !!sp && (sp.research === true || RESEARCH_SPECIES.has(sp.id));
export const researchRate = (rate, sp) => (isResearch(sp) ? rate * RESEARCH_CATCH_MULT : rate);

/** species rarity term for screens without the engine (ui.js shell): synced catchRate, else the creatures.js stage placeholder */
export function rarityOf(sp, species = [], raw = false) {
  if (!sp) return 0.5;
  if (!raw && isResearch(sp)) return researchRate(rarityOf(sp, species, true), sp);
  if (typeof sp.catchRate === 'number') return sp.catchRate;
  const line = sp.line ? species.filter((s) => s.line === sp.line).map((s) => s.id) : null;
  const stage = line ? line.indexOf(sp.id) : -1;
  return stage <= 0 ? 0.6 : stage === 1 ? 0.4 : 0.2; // same PLACEHOLDER as src/battle/data/creatures.js
}
