// Kilumen elements and the element chart for the battle engine.
// Element list: the 23 effect folders in art/characters/pixel/effects/ (DD: 8 main + 15 sub = 23)
// plus 'normal', the neutral element the PLACEHOLDER skills in src/ui/data.js already use.
//
// DRAFT CHART (Cut B pass, Oct 23 2026, coder; NOT signed off by Gary). design/MECHANICS_PARITY.md B6 had "no chart
// anywhere", so this draft is Kilumen's own: the starter triangle is earth > water > fire > earth (matches the Ron
// counter-pick GD already uses: nibbin -> Ron's cindrip, cindrip -> rillop, rillop -> nibbin; Nibbin replaced Tumbloam as
// the earth starter Oct 23 2026, src/battle/data/starters.js RON_COUNTER). Every element the
// Cut B species and skills use has a row; god / legendary rows are minimal (not in Cut B). No x0 immunities yet
// (DD asks for "a counter and an immunity" per element: Gary decision, listed in dev_notes). Multipliers come from B6
// (x1.5 strong / x0.6 weak / x0 immune) and live in rules.js, not here.
export const ELEMENTS = ['angelic', 'bird', 'bug', 'dark', 'demon', 'devil', 'dragos', 'earth', 'fire', 'freshwater', 'ghost', 'god',
  'grass', 'legendary', 'light', 'magma', 'mystic', 'rain', 'sea', 'spirit', 'swamp', 'water', 'wind', 'normal'];

// attacker element -> { strong: [defender elements], weak: [...], none: [...] }   (DRAFT for Gary)
export const DRAFT_CHART = {
  // main elements
  earth: { strong: ['water', 'freshwater', 'rain'], weak: ['grass', 'wind', 'bird'] },
  fire: { strong: ['earth', 'grass', 'bug', 'swamp'], weak: ['water', 'sea', 'rain', 'fire', 'magma'] },
  water: { strong: ['fire', 'magma', 'devil'], weak: ['grass', 'swamp', 'water', 'sea'] },
  wind: { strong: ['grass', 'bug', 'swamp'], weak: ['earth', 'dragos', 'wind'] },
  light: { strong: ['dark', 'ghost', 'demon', 'devil'], weak: ['light', 'angelic', 'god'] },
  dark: { strong: ['light', 'angelic', 'spirit', 'mystic'], weak: ['dark', 'demon', 'devil'] },
  mystic: { strong: ['ghost', 'dragos', 'demon'], weak: ['mystic', 'earth', 'god'] },
  legendary: { strong: ['god', 'dragos'], weak: ['legendary'] },
  // sub elements
  grass: { strong: ['water', 'earth', 'freshwater', 'swamp', 'rain'], weak: ['fire', 'magma', 'bird', 'bug', 'grass'] },
  bug: { strong: ['grass', 'mystic', 'spirit'], weak: ['fire', 'wind', 'bird', 'magma'] },
  bird: { strong: ['bug', 'grass'], weak: ['dragos', 'magma'] },
  sea: { strong: ['fire', 'magma', 'freshwater'], weak: ['grass', 'sea', 'swamp'] },
  freshwater: { strong: ['fire', 'magma', 'swamp'], weak: ['grass', 'freshwater', 'earth'] },
  swamp: { strong: ['fire', 'earth', 'bug'], weak: ['grass', 'swamp'] },
  rain: { strong: ['fire', 'magma'], weak: ['grass', 'wind', 'rain'] },
  magma: { strong: ['earth', 'grass', 'bug'], weak: ['water', 'sea', 'rain', 'freshwater'] },
  dragos: { strong: ['dragos', 'wind', 'bird'], weak: ['mystic', 'legendary'] },
  spirit: { strong: ['ghost', 'demon'], weak: ['dark', 'spirit'] },
  ghost: { strong: ['spirit', 'mystic', 'ghost'], weak: ['light', 'angelic'] },
  demon: { strong: ['angelic', 'spirit', 'mystic'], weak: ['light', 'god', 'demon'] },
  devil: { strong: ['angelic', 'light', 'spirit'], weak: ['devil', 'demon', 'god'] },
  angelic: { strong: ['demon', 'devil', 'ghost'], weak: ['angelic', 'god', 'dark'] },
  god: { strong: ['devil', 'demon', 'dark'], weak: ['god', 'legendary'] },
};
export const PLACEHOLDER_CHART = DRAFT_CHART; // old name kept for importers

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
