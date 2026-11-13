// Zone pool rule (Oct 23 2026, encounter-inventory worker). Used by the plan builder and gen_encounters.mjs, so the plan and
// the generated tables always agree. GUESS rules for Gary, all deterministic:
//  - candidates: wild_ok species whose habitat classes include the zone class, homed in the zone's region or already
//    recorded in a hand-made table of that region (reuse: one id, many zones).
//  - prefer species homed in the zone's DEX zone or already on the same map; widen to the region when fewer than 3.
//  - starter lines only where a hand-made table already has them on that map, or in Brookhollow (World Design rule).
//  - level = zone band, raised to the species' DEX evolution level; dropped if that leaves nothing.
//  - weight = tier weight; time = the species' recorded time (if every recorded slot agrees) or its DEX night evolution.
//  - at most 12 slots (highest weight, then DEX order).
const WATER_T = new Set(['water', 'sea', 'freshwater', 'swamp', 'rain']);
const CAVE_T = new Set(['earth', 'magma', 'dark', 'ghost', 'dragos']);
const BIOME = { brookhollow: 'river', route1: 'meadow', fernwick: 'fern/pond', thornwood: 'forest', route_east: 'road/river', aurelith: 'city/dunes', saltmere: 'harbour/coast',
  route_revival: 'crystal grass', revival_heights: 'heights', greystone: 'cave', frostspire_pass: 'snow', frostspire: 'snow', route1_east: 'meadow', sunmeadow: 'meadow',
  mirefen_bog: 'bog', coast_road: 'coast', tidewater_coast: 'coast', lanternport: 'harbour', cindervale_road: 'ash/volcanic', cindervale: 'volcanic', postgame: 'postgame' };
export const MAX_SLOTS = 12;

export function speciesHabitat(c, rec, zones) {
  const byId = Object.fromEntries(zones.map((z) => [z.zone || z.id, z]));
  const classes = new Set(rec.map((r) => byId[r.zone]?.class).filter(Boolean));
  const recClasses = classes.size;
  const t = c.types;
  if (t.some((x) => WATER_T.has(x))) classes.add('water');
  if (t.some((x) => !WATER_T.has(x) || x === 'swamp' || x === 'rain')) classes.add('grass');
  if (t.some((x) => CAVE_T.has(x))) classes.add('cave');
  const tags = [...classes].sort();
  if (BIOME[c.first_zone]) tags.push(BIOME[c.first_zone]);
  const times = rec.map((r) => JSON.stringify(r.time || null));
  const timePref = rec.length && times.every((x) => x === times[0]) && rec[0].time ? rec[0].time : null;
  if (timePref) tags.push(...timePref.map((x) => `time:${x}`));
  if (rec.some((r) => r.weather)) tags.push('storm');
  if (rec.some((r) => r.flood)) tags.push('flood');
  return { classes: [...classes].sort(), tags, guess: recClasses === 0, timePref };
}

export function zonePool(z, inventory, dex, { builtOnly = false } = {}) {
  if (!z.band || !z.region) return [];
  const [lo, hi] = z.band;
  const all = Object.values(inventory).filter((i) => i.wild_ok && i.habitat_classes.includes(z.class)
    && (i.home_region === z.region || (i.recorded_regions || []).includes(z.region))
    && (!i.starter_line || z.map === 'brookhollow' || (i.recorded_maps || []).includes(z.map))
    && (!builtOnly || (i.art && i.registered)));
  const pref = all.filter((i) => i.home_zone === z.dex_zone || (i.recorded_maps || []).includes(z.map));
  const cands = pref.length >= 3 ? pref : all;
  const out = [];
  for (const i of cands) {
    const l0 = Math.max(lo, i.min_level);
    if (l0 > hi) continue;
    const time = i.time_pref || i.evolution.evo_time || null;
    out.push({ species: i.id, level: [l0, hi], weight: i.weight, tier: i.tier, ...(time ? { time } : {}) });
  }
  out.sort((a, b) => b.weight - a.weight || inventory[a.species].dex - inventory[b.species].dex);
  return out.slice(0, MAX_SLOTS);
}
