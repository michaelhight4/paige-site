// r56 learnsets (Oct 29 2026, Coder) from design/regions56_gd/moves_swamp_sea.json (GD proposal; levels PLACEHOLDER for Gary).
// Real data for the swamp / sea lines: src/overnight/learnsets.js learnsetFor() uses these before its generated fallback.
// Tutor: Old Gus (the Lamp Keeper, tidewater_coast) teaches Brine Lash; wiring in src/region56/tutor.js.
const SWAMP_LINE = [{ level: 1, skill: 'mirelob' }, { level: 1, skill: 'rippleshot' }, { level: 18, skill: 'stomp' }, { level: 28, skill: 'bogsnap' }];
const SEA_LINE = [{ level: 1, skill: 'undertow' }, { level: 1, skill: 'rippleshot' }, { level: 18, skill: 'pebbletoss' }, { level: 28, skill: 'brinelash' }];
export const SWAMP_SPECIES = ['mirejaw', 'silteel', 'fenmaw', 'peatbellow', 'bulrusher', 'eftwarden'];
export const SEA_SPECIES = ['nudiblume', 'atollback', 'reefshell', 'abyssray', 'hullwhale'];
export const KELP_LASH = { atollback: 38, nudiblume: 34 };
const withKelp = (sp, set) => (KELP_LASH[sp] ? [...set, { level: KELP_LASH[sp], skill: 'kelplash' }] : set).sort((a, b) => a.level - b.level);
export const R56_LEARNSETS = Object.fromEntries([
  ...SWAMP_SPECIES.map((sp) => [sp, withKelp(sp, SWAMP_LINE)]),
  ...SEA_SPECIES.map((sp) => [sp, withKelp(sp, SEA_LINE)]),
]);
/** Tutor moves: skill -> species that may learn it from the tutor. */
export const R56_TUTOR = { brinelash: ['lurelamp', 'pearlisk', 'driftknot'] };
