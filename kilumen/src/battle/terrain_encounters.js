// Terrain encounters (Coder, Oct 29 2026; Gary: "riding on water (surfing) and walking on cave floors both count as
// encounter grass, at 30% of the normal grass encounter chance"). Pure (no DOM). Flag: src/fishing/flags.js `terrain`
// (OFF by default; ?terrainenc=1). Tables: data/terrain_encounters.json, built from the existing water / cave tables.
//  - cave: a step on encounter-layer code 2 (cave floor) that no encounter_zones rect covers rolls tables.cave[map].
//    (Rect-covered cells, e.g. Greystone glowfern, keep their own table and rate: unchanged.)
//  - water: a step onto collision code 3 / 11 while riding on water rolls tables.water[map] (hook onSurfStep; no
//    surf runtime exists yet, so this is inert until the Tideglide field skill lets the player onto water).
// Rate = (the map's grass table rate, else tables.grass_rate) x tables.rate_mult (0.3).
export const TERRAIN_URL = 'data/terrain_encounters.json';
export const TERRAIN_MULT = 0.3;

/** The grass rate a map's terrain rolls are scaled from: its first non-water table that lists the map, else the default. */
export function grassRateFor(data, mapName, fallback = 0.0833) {
  for (const z of Object.values(data?.zones || {})) {
    if ((z.maps || []).includes(mapName) && /grass/.test(z.method || '') && z.rate > 0) return z.rate;
  }
  return fallback;
}

/** kind 'water' | 'cave' -> {id, zone, forced:false} | null. zone = {method, rate, slots} ready for pickSlot. */
export function terrainZone(tables, data, mapName, kind) {
  const t = tables?.[kind]?.[mapName];
  if (!t?.slots?.length) return null;
  const rate = grassRateFor(data, mapName, tables.grass_rate ?? 0.0833) * (tables.rate_mult ?? TERRAIN_MULT);
  return { id: `terrain_${kind}:${mapName}`, zone: { method: kind === 'cave' ? 'cave' : 'water', rate, slots: t.slots }, forced: false };
}

/** Keep only slots with art (same rule as the grass tables, #62); returns a filtered copy. */
export function filterTerrain(tables, hasArt) {
  if (!tables || !hasArt) return tables;
  const out = { ...tables };
  for (const kind of ['water', 'cave']) {
    out[kind] = {};
    for (const [m, t] of Object.entries(tables[kind] || {})) out[kind][m] = { ...t, slots: (t.slots || []).filter((s) => hasArt(s.species)) };
  }
  return out;
}
