// Kilumen elements and the element chart for the battle engine.
// Element list: the 23 effect folders in art/characters/pixel/effects/ (DD: 8 main + 15 sub = 23)
// plus 'normal', the neutral element the PLACEHOLDER skills in src/ui/data.js already use.
//
// PLACEHOLDER CHART. No Kilumen chart exists yet (design/MECHANICS_PARITY.md B6: "no chart anywhere",
// owner Story Bot -> Gary). The few rows below exist only so the engine and tests have something to
// resolve; every row is marked and must be replaced by the signed-off chart. Multipliers come from B6
// (x1.5 strong / x0.6 weak / x0 immune) and live in rules.js, not here.
export const ELEMENTS = ['angelic', 'bird', 'bug', 'dark', 'demon', 'devil', 'dragos', 'earth', 'fire', 'freshwater', 'ghost', 'god',
  'grass', 'legendary', 'light', 'magma', 'mystic', 'rain', 'sea', 'spirit', 'swamp', 'water', 'wind', 'normal'];

// attacker element -> { strong: [defender elements], weak: [...], none: [...] }   (PLACEHOLDER)
export const PLACEHOLDER_CHART = {
  water: { strong: ['fire', 'magma'], weak: ['grass', 'water'] },
  fire: { strong: ['grass', 'bug'], weak: ['water', 'fire'] },
  grass: { strong: ['water', 'earth'], weak: ['fire', 'grass'] },
  earth: { strong: ['fire'], weak: ['grass'] },
  light: { strong: ['dark'], weak: ['light'] },
  dark: { strong: ['light'], weak: ['dark'] },
};

export const cap = (e) => e[0].toUpperCase() + e.slice(1);

// Engine TypeChart: damageTaken[attackerTypeName] 0 neutral / 1 weak to (takes more) / 2 resists / 3 immune.
export function buildTypeChart(chart = PLACEHOLDER_CHART) {
  const out = {};
  for (const def of ELEMENTS) {
    const damageTaken = {};
    for (const att of ELEMENTS) {
      const row = chart[att] || {};
      damageTaken[cap(att)] = (row.none || []).includes(def) ? 3 : (row.strong || []).includes(def) ? 1 : (row.weak || []).includes(def) ? 2 : 0;
    }
    // status ids the engine checks against types; Kilumen statuses have no element immunities yet
    out[def] = { damageTaken };
  }
  return out;
}
