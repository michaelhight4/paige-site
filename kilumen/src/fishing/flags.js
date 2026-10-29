// Fishing v1 + terrain encounters (Coder, Oct 29 2026). Both OFF by default (Gary signs off first).
// URL override (not saved): ?fishing=1 turns fishing on, ?terrainenc=1 turns water / cave-floor encounters on, 0 = off.
export const FISHING_DEFAULTS = Object.freeze({
  fishing: false, // rod key item, face water / pier + A, bite prompt, wild battle from data/fishing_tables.json; Brookhollow fisher gives the rod
  terrain: false, // riding on water + cave floor count as encounter grass at 0.3x the grass rate (data/terrain_encounters.json)
});
export function fishingFlags(query) {
  const f = { ...FISHING_DEFAULTS };
  const g = globalThis.KILUMEN_FISHING; // test / staging hook (set before main.js loads; not reachable from a URL in the alpha build, which strips the query)
  if (g && typeof g === 'object') { if (typeof g.fishing === 'boolean') f.fishing = g.fishing; if (typeof g.terrain === 'boolean') f.terrain = g.terrain; }
  const v = (k) => query?.get?.(k);
  if (v('fishing') === '1') f.fishing = true; else if (v('fishing') === '0') f.fishing = false;
  if (v('terrainenc') === '1') f.terrain = true; else if (v('terrainenc') === '0') f.terrain = false;
  return f;
}
