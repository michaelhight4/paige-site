// Kilumen starters (Oct 23 2026, coder; Gary: Tumbloam "looks a lot like Cindrip" -> the earth starter is now Nibbin).
// One place for: the three lab starters, their lines, Ron's counter-pick, and the starter-only species (never wild,
// never on an ordinary trainer). Pure data + helpers, no imports (safe for node tools and the browser).
// Element triangle (elements.js DRAFT_CHART): earth > water > fire > earth. Ron always takes the one that beats yours.

/** The three lab starters, cradle order (config.starterCradles cradle_1..3). */
export const STARTERS = ['nibbin', 'cindrip', 'rillop'];
/** Starters from older builds (v0.2.70-alpha saves picked Tumbloam). They keep working: same counter as the earth slot. */
export const LEGACY_STARTERS = ['tumbloam'];
export const ALL_STARTERS = [...STARTERS, ...LEGACY_STARTERS];

/** Every member of each starter line (base first). Tumbloam's line stays an ordinary wild line now. */
export const STARTER_LINES = {
  nibbin: ['nibbin', 'gnawford'],
  cindrip: ['cindrip', 'emberlunx', 'forgeharrow'],
  rillop: ['rillop', 'brookhorn', 'tidemarrow'],
  tumbloam: ['tumbloam', 'burrowmane', 'bastonox'], // legacy only
};

/** Starter-only species: removed from every wild table and every non-rival trainer team. */
export const STARTER_ONLY = ['nibbin', 'gnawford'];

/** Player's starter -> Ron's pick (the element that beats it). */
export const RON_COUNTER = { nibbin: 'cindrip', cindrip: 'rillop', rillop: 'nibbin', tumbloam: 'cindrip' };

/** Old earth-starter species in Ron's authored teams (map JSON / plan data written before the swap) -> Nibbin's line. */
export const EARTH_SWAP = { tumbloam: 'nibbin', burrowmane: 'gnawford', bastonox: 'gnawford' };

/** Base starter for any species of a starter line (gnawford -> nibbin, burrowmane -> tumbloam), else null. */
export function starterOf(species) {
  for (const [base, line] of Object.entries(STARTER_LINES)) if (line.includes(species)) return base;
  return null;
}

/** The player's starter from party (+ archive): origin.how 'starter' first (any stage), then any creature of a line. */
export function partyStarter(creatures = []) {
  const list = (creatures || []).filter(Boolean);
  for (const c of list) if (c.origin?.how === 'starter' && starterOf(c.species)) return starterOf(c.species);
  for (const c of list) if (STARTERS.includes(c.species)) return c.species; // dev / no origin: a base form in the party
  for (const c of list) if (LEGACY_STARTERS.includes(c.species)) return c.species;
  return null;
}

/** byStarter / if_player_took_* lookup key: nibbin falls back to an old 'tumbloam' branch (same counter), and back. */
export function starterKeys(starter) {
  if (starter === 'nibbin') return ['nibbin', 'tumbloam'];
  if (starter === 'tumbloam') return ['tumbloam', 'nibbin'];
  return starter ? [starter] : [];
}
