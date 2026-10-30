// Wild encounters (dev build, battles default v1, Oct 23, 2026). Rolls the World Design placeholder tables in
// art/world/overworld/encounters/encounters.json once per step onto an encounter cell (overworld.js onArrive ->
// hooks.onEncounterTile). Running and biking use the same rate (MOVEMENT.md). Species / levels / rates are the
// table's PLACEHOLDERS; nothing here adds creature data.
// Safety cap (Coder values, open question for Gary): the per-step chance is clamped to MAX_RATE, and after every
// wild battle or map change the next GRACE_STEPS encounter steps can't roll, so the player always gets a few free
// steps. No rolls while a script / fade / menu is up, or with an empty team.
// Not wired yet (no data or runtime): cave floor (layer code 2) outside a table rect ("low rate", no number in
// the docs), encounters.variant_roll (always null = normal).
export const ENCOUNTERS_URL = 'art/world/overworld/encounters/encounters.json';
// Creature sync (Oct 23, 2026): tools/sync_creatures.mjs writes the merged table (live + GD swaps + staged zones, wired species only,
// stand-ins flagged). Tried first; falls back to ENCOUNTERS_URL if missing or invalid.
export const ENCOUNTERS_WIRED_URL = 'data/encounters_wired.json';
/** One shared fetch of encounters_wired.json per page (the roller and contacts tips both read it; was fetched twice).
 *  Resolves to the parsed JSON or null; callers must treat it as read-only. A failed fetch is not cached. */
export function encountersWired() {
  const g = globalThis;
  if (!g.__kilEncWired) {
    g.__kilEncWired = fetch(ENCOUNTERS_WIRED_URL).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    g.__kilEncWired.then((d) => { if (!d) g.__kilEncWired = null; });
  }
  return g.__kilEncWired;
}
// Art filter (#62, Coder, Oct 23 2026): at load, slots whose species has no creature art are dropped from the in-memory
// table (the JSON files keep everything). hasArt = the battle's own lookup (src/ui/data.js SPECIES: hand-written 16 +
// species_synced.gen.js), so creatures the sync wires later are picked up on the next load. On by default; ?encart=0 off.
// Trail level scaling (Coder, Oct 23 2026; Gary 11:48 AM CT: "well we need to have them be level scaling the closer to
// town you get"): on trail maps with an axis in data/trail_axes.json the slot level follows the player's progress along
// the trail (src/battle/level_scale.js) instead of a uniform roll. installWildEncounters opts.levelScale === false turns it off.
import { TRAIL_AXES_URL, axisFor, trailT, scaledLevel } from './level_scale.js?v=v0.2.96-alpha';
import { TERRAIN_URL, terrainZone, filterTerrain } from './terrain_encounters.js?v=v0.2.96-alpha'; // water + cave floor at 0.3x grass (flag, off)
import { leadEncounterMult } from '../systems/held.js?v=v0.2.96-alpha'; // Lure Lantern / Hush Cloak (Oct 29 2026)
export const PHASES = ['dawn', 'day', 'dusk', 'night'];
// Day / night bands (Oct 30 2026, Gary): three-band tables (morning / day / night) over the outdoor phases. Slots tagged by
// tools/encounters/tod_spread.mjs carry tod: 'night' (time ['night']) or tod: 'day' (time ['dawn','day','dusk']).
export const TOD_OF = Object.freeze({ dawn: 'morning', day: 'day', dusk: 'day', night: 'night' });
export const todOf = (phase) => TOD_OF[phase] || 'day';
// Night wilds (Gary, Oct 30 2026): +2 or +3 levels (random per encounter) in the night phase, clamped to the global enemy cap.
export const NIGHT_BONUS = Object.freeze([2, 3]);
export const ENEMY_CAP = 68;
export function nightLevel(level, phase, rng = Math.random) {
  if (phase !== 'night') return level;
  return Math.min(ENEMY_CAP, Math.max(level, level + NIGHT_BONUS[rng() < 0.5 ? 0 : 1]));
}
/** species -> 'night' | 'day' | 'morning' | 'any' across the live (non-inert) tables: the bands a species can roll in. */
export function speciesTimes(data) {
  const bands = {};
  for (const z of Object.values(data?.zones || {})) {
    if (z.inert) continue;
    for (const s of z.slots || []) { if (!(s.weight > 0)) continue; const b = (bands[s.species] ||= new Set()); for (const ph of s.time || PHASES) b.add(todOf(ph)); }
  }
  const out = {};
  for (const [id, b] of Object.entries(bands)) out[id] = b.size === 1 ? [...b][0] : (b.has('night') ? 'any' : 'day');
  return out;
}
export const MAX_RATE = 0.2;
export const GRACE_STEPS = 3;

/** The table id for a cell: the first encounter_zones rect (inclusive) that holds it, else (tall grass only) the
 * first table that lists this map. Water tables are skipped (no Tideglide runtime yet). -> {id, zone, forced} | null */
export function zoneAt(data, mapName, rects, x, y, code = 1) {
  const zones = data?.zones || {};
  const usable = (id) => zones[id] && !/^water/.test(zones[id].method || '');
  for (const r of rects || []) {
    if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1 && usable(r.table)) return { id: r.table, zone: zones[r.table], forced: !!r.forced };
  }
  if (code !== 1) return null;
  const id = Object.keys(zones).find((k) => usable(k) && (zones[k].maps || []).includes(mapName));
  return id ? { id, zone: zones[id], forced: false } : null;
}

/** The live surf table for a map (method "water (Tideglide...)", listed in its maps, not inert). -> {id, zone, forced} | null */
export function surfZoneFor(data, mapName) {
  const zones = data?.zones || {};
  const id = Object.keys(zones).find((k) => !zones[k].inert && isSurf(zones[k].method) && (zones[k].maps || []).includes(mapName) && (zones[k].slots || []).length);
  return id ? { id, zone: zones[id], forced: false } : null;
}

/** Slot conditions (encounters.json "conditions"): time phase list, weather list, flood-only. */
export function slotOk(slot, ctx = {}) {
  if (slot.time && !slot.time.includes(ctx.phase || 'day')) return false;
  if (slot.weather && !slot.weather.includes(ctx.weather || 'clear')) return false;
  if (slot.flood && !ctx.flood) return false;
  return true;
}

/** Weighted pick among eligible slots. Level uniform in [lo, hi], or, when ctx.t (trail progress 0..1) is a number,
 * scaledLevel(lo, hi, t) clamped to the zone cap (zone.cap.level). rng() in [0,1). -> {species, level, slot} | null */
export function pickSlot(zone, ctx = {}, rng = Math.random) {
  const slots = (zone?.slots || []).filter((s) => (s.weight || 0) > 0 && slotOk(s, ctx));
  const total = slots.reduce((a, s) => a + s.weight, 0);
  if (!total) return null;
  let r = rng() * total, slot = slots[slots.length - 1];
  for (const s of slots) { if ((r -= s.weight) < 0) { slot = s; break; } }
  const [lo, hi] = Array.isArray(slot.level) ? slot.level : [slot.level, slot.level];
  const lv = typeof ctx.t === 'number' ? scaledLevel(lo, hi, ctx.t, rng, zone.cap?.level || null) : lo + Math.floor(rng() * (hi - lo + 1));
  return { species: slot.species, level: nightLevel(lv, ctx.phase, rng), slot };
}

/** Habitat rules (Gary, Oct 29 2026). Surf ("water (Tideglide)" tables): water-type species ONLY. Caves (any table whose
 * method mentions cave): only Kilumen you could actually find in a cave - an underground element (earth/rock/ground,
 * dark, ghost, crystal/mystic, poison, bug, magma) or lore that places it in a cave (its "found" line names a
 * cavern / cave / grotto / mine). Unknown species (no element data) fail closed. elOf(id) -> element list. */
export const CAVE_ELEMENTS = Object.freeze(['earth', 'rock', 'ground', 'dark', 'ghost', 'crystal', 'mystic', 'poison', 'bug', 'magma']);
export const CAVE_LORE = /cavern|\bcave|grotto|\bmine\b|underground/i;
export const isSurf = (method) => /^water/i.test(method || '');
export const isCave = (method) => /cave/i.test(method || '');
export function habitatOk(method, species, elOf, foundOf = () => '') {
  const el = elOf(species) || [];
  if (isSurf(method)) return el.includes('water');
  if (isCave(method)) return el.some((e) => CAVE_ELEMENTS.includes(e)) || CAVE_LORE.test(foundOf(species) || '');
  return true;
}
/** Runtime habitat filter (in memory; same re-weighting as filterEncounters). -> {data, removed: {zid: [species]}} */
export function filterHabitat(data, elOf, foundOf) {
  const out = { ...data, zones: {} }, removed = {};
  for (const [zid, z] of Object.entries(data?.zones || {})) {
    const slots = z.slots || [], keep = slots.filter((s) => habitatOk(z.method, s.species, elOf, foundOf));
    if (keep.length === slots.length) { out.zones[zid] = z; continue; }
    removed[zid] = slots.filter((s) => !keep.includes(s)).map((s) => s.species);
    out.zones[zid] = { ...z, slots: keep };
  }
  return { data: out, removed };
}

/** Drop slots whose species has no art, re-weight the rest so each zone keeps its original total weight.
 * -> {data (copy; dropped slots kept in zone.slots_no_art), dropped: {zid: n}, empty: [zid], emptyPhases: {zid: [phase]}}.
 * A zone (or phase) with nothing left simply never yields an encounter (pickSlot -> null). */
export function filterEncounters(data, hasArt) {
  const out = { ...data, zones: {} }, dropped = {}, empty = [], emptyPhases = {};
  for (const [zid, z] of Object.entries(data?.zones || {})) {
    const slots = z.slots || [], keep = slots.filter((s) => hasArt(s.species)), gone = slots.filter((s) => !hasArt(s.species));
    const total = (a) => a.reduce((t, s) => t + (s.weight || 0), 0);
    const k = total(keep) > 0 ? total(slots) / total(keep) : 1;
    const nz = { ...z, slots: gone.length ? keep.map((s) => ({ ...s, weight: (s.weight || 0) * k, weight_src: s.weight })) : slots };
    if (gone.length) { nz.slots_no_art = gone; dropped[zid] = gone.length; }
    if (!nz.slots.some((s) => (s.weight || 0) > 0)) { if (slots.length) empty.push(zid); }
    else {
      const was = PHASES.filter((ph) => slots.some((s) => (s.weight || 0) > 0 && slotOk(s, { phase: ph, weather: s.weather?.[0], flood: s.flood })));
      const off = was.filter((ph) => !nz.slots.some((s) => (s.weight || 0) > 0 && slotOk(s, { phase: ph, weather: s.weather?.[0], flood: s.flood })));
      if (off.length) emptyPhases[zid] = off;
    }
    out.zones[zid] = nz;
  }
  return { data: out, dropped, empty, emptyPhases };
}

/** Per-step roller with the safety cap. state: {grace}. opts.rate overrides the table rate (dev ?encrate=). */
export class EncounterRoller {
  constructor(data, opts = {}) {
    this.data = data; this.rng = opts.rng || Math.random;
    this.rateOverride = opts.rate ?? null; this.maxRate = opts.maxRate ?? MAX_RATE;
    this.graceSteps = opts.graceSteps ?? GRACE_STEPS; this.grace = this.graceSteps;
    this.axes = opts.axes || null; // data/trail_axes.json (trail level scaling); null = uniform levels everywhere
    this.terrain = opts.terrain || null; // data/terrain_encounters.json (flag `terrain`); null = no water / cave-floor rolls
    this.rateMult = opts.rateMult || null; // held items (Oct 29 2026): () => lead's Lure Lantern x1.5 / Hush Cloak x0.5 (src/systems/held.js)
  }
  rateFor(zone) {
    const r = this.rateOverride ?? zone?.rate ?? 0;
    if (this.rateOverride != null) return Math.max(0, Math.min(1, r)); // dev override may go to 1 (clips/tests)
    const k = Math.max(0, Number(this.rateMult?.()) || 1); // the cap scales too, so a Lure Lantern still helps at the cap
    return Math.max(0, Math.min(this.maxRate * Math.max(1, k), Math.min(this.maxRate, r) * k)); // data never above MAX_RATE
  }
  resetGrace() { this.grace = this.graceSteps; }
  /** One step on an encounter cell. -> {species, level, table, forced} | null */
  step(mapName, rects, x, y, code, ctx = {}) {
    if (this.grace > 0) { this.grace--; return null; }
    const z = zoneAt(this.data, mapName, rects, x, y, code) || (code === 2 && this.terrain ? terrainZone(this.terrain, this.data, mapName, 'cave') : null);
    return this._roll(z, mapName, x, y, ctx);
  }
  /** One step onto water while riding on it (terrain flag): the map's water table at 0.3x the grass rate. */
  // Oct 30 2026: Tideglide is live (field skills on), so the map's own "water (Tideglide)" table rolls first (its own rate);
  // the terrain flag's 0.3x table stays the fallback for maps with no surf table.
  stepWater(mapName, x, y, ctx = {}) {
    if (this.grace > 0) { this.grace--; return null; }
    return this._roll(surfZoneFor(this.data, mapName) || (this.terrain ? terrainZone(this.terrain, this.data, mapName, 'water') : null), mapName, x, y, ctx);
  }
  _roll(z, mapName, x, y, ctx) {
    if (!z) return null;
    if (this.rng() >= this.rateFor(z.zone)) return null;
    const t = trailT(axisFor(this.axes, mapName), x, y);
    const hit = pickSlot(z.zone, t == null ? ctx : { ...ctx, t }, this.rng);
    if (!hit) return null;
    this.resetGrace();
    return { species: hit.species, level: hit.level, table: z.id, forced: z.forced, t };
  }
}

/** Battle backdrop per area (painted biomes, Oct 29 2026; src/battle/data/platforms.js). The map decides first (caves, the
 * mountain routes, Frostspire's snow), then the table method (water / surf / fishing, caves, snow tables); else grass.
 * Indoor maps (_int) stay on grass. */
export const MAP_BIOMES = { greystone_entrance: 'cave', greystone_b1: 'cave', frostspire: 'snow', frostspire_pass: 'snow', revival_heights: 'mountain', route_cindervale: 'mountain', cindervale: 'mountain' };
// Area (encounter table) id -> backdrop; checked first (Frostspire: Oct 29 2026).
export const AREA_BIOMES = { frostspire_grass: 'snow', frostspire_pass_grass: 'snow', frostspire_cave: 'cave' };
// Regions 5-6 maps (Animator art package #5): the map decides, water / surf / fishing there use reef_surf (sea) or bog_deep (Mirefen).
export const R56_MAP_BIOMES = {
  mirefen: 'bog', mirefen_bog: 'bog_deep', route_saltmere_mirefen: 'causeway', route_sunmeadow_mirefen: 'causeway',
  sunmeadow_fields: 'meadow', route_revival_sunmeadow: 'meadow', mirefen_hall_int: 'hall_mirefen', tidewater_hall_int: 'hall_tidewater',
  lab_mirefen_sunken: 'lab_mirefen', station_int: 'lab_mirefen', lab_tidewater_cave: 'lab_seacave', tidewater_cave_int: 'sea_cave',
  tidewater_coast: 'coast', route_coast: 'coast',
};
const R56_WATER = { coast: 'reef_surf', bog: 'bog_deep', causeway: 'bog_deep' };
export const biomeFor = (method, map, area) => {
  if (area && AREA_BIOMES[area]) return AREA_BIOMES[area];
  const r56 = map && R56_MAP_BIOMES[map.replace(/_storm$/, '')];
  if (r56) return /water|surf|fishing/.test(method || '') ? (R56_WATER[r56] || r56) : r56;
  if (area && /_cave\b|^terrain_cave/.test(area)) return 'cave';
  const m = method || '';
  if (/water|surf|fishing/.test(m)) return 'water';
  if (/cave/.test(m)) return 'cave'; // incl. cave_fern; 'snow-fern' grass is snow
  if (map && MAP_BIOMES[map]) return MAP_BIOMES[map];
  if (/snow/.test(m)) return 'snow';
  if (/ash/.test(m)) return 'mountain';
  return 'grass';
};

/**
 * Hook the roller into the overworld: scene.hooks.onEncounterTile -> scene.script(openBattle(foe)).
 * openBattle({species, level, biome}) resolves when the battle screen has closed (ui.js mountUI supplies it).
 * opts: {url, rate (dev override), off}. Returns {ready, roller}.
 */
export function installWildEncounters(scene, openBattle, opts = {}) {
  const st = { roller: null, ready: null, lastMap: null };
  if (opts.off) return st;
  const getJson = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const axesP = opts.levelScale === false ? Promise.resolve(null) : getJson(opts.axesUrl || TRAIL_AXES_URL);
  st.ready = (opts.url ? getJson(opts.url) : encountersWired().then((d) => (d?.zones ? structuredClone(d) : getJson(ENCOUNTERS_URL)))).then((data) => {
    if (!data) return;
    globalThis.__kilSpeciesTimes = speciesTimes(data); // Kilindex time-of-day line (ui.js)
    if (opts.elOf) { // habitat rule: surf = water types only, caves = cave dwellers only (in memory, always on)
      const h = filterHabitat(data, opts.elOf, opts.foundOf); st.habitat = h; data = h.data;
      if (opts.dev && Object.keys(h.removed).length) console.info('[encounters] habitat filter removed', h.removed);
    }
    if (opts.hasArt && opts.artFilter !== false) { // #62: no art -> not rolled (in memory only)
      const f = filterEncounters(data, opts.hasArt); st.artFilter = f; data = f.data;
      if (opts.dev) console.info('[encounters] art filter dropped', Object.values(f.dropped).reduce((a, n) => a + n, 0), 'slots', f.dropped, 'empty zones', f.empty, 'empty phases', f.emptyPhases);
    }
    if (opts.terrain) getJson(opts.terrainUrl || TERRAIN_URL).then((t) => { if (t && st.roller) st.roller.terrain = opts.hasArt && opts.artFilter !== false ? filterTerrain(t, opts.hasArt) : t; });
    st.roller = new EncounterRoller(data, { rate: opts.rate, rateMult: () => leadEncounterMult(scene.party || []) });
    return axesP.then((axes) => { if (axes?.maps) st.roller.axes = axes; });
  }).catch((e) => console.warn('[encounters]', e.message));
  st.hasArt = opts.hasArt; st.openBattle = openBattle; // fishing (src/fishing/index.js) opens its hooked creature through the same battle path
  const onStep = (x, y, code, water) => {
    const m = scene.map, ro = st.roller;
    if (!ro || !m) return;
    if (st.lastMap !== m.name) { st.lastMap = m.name; ro.resetGrace(); } // a few free steps after every map change
    if (scene.busy || scene.fade || !scene.party?.length || opts.blocked?.()) return;
    const ctx = { phase: scene.phase, weather: scene.flags?.has('storm_season') ? 'storm' : 'clear', flood: m.json?.variantId === 'storm' || /_storm$/.test(m.name) }; // r56: route_coast storm variant (overworld.js activeVariant)
    const hit = water ? ro.stepWater(m.name, x, y, ctx) : ro.step(m.name, m.json?.encounter_zones, x, y, code, ctx);
    if (!hit) return;
    scene.log?.push({ tick: scene.tick, type: 'wild', species: hit.species, level: hit.level, table: hit.table, x, y, t: hit.t });
    scene.script(async () => {
      const terr = /^terrain_(water|cave)/.exec(hit.table || '')?.[1]; // terrain encounters: the existing system_wild.water / .cave lines
      await openBattle({ species: hit.species, level: hit.level, biome: biomeFor(ro.data.zones?.[hit.table]?.method || (water ? 'water' : terr || ''), m.name, hit.table), ...(terr && { intro: { key: 'system_wild.' + terr, fallback: [terr === 'cave' ? '{creature} drops out of the dark!' : '{creature} surfaces right beside you!'] } }) });
      ro.resetGrace();
    });
  };
  scene.hooks.onEncounterTile = (x, y, code) => onStep(x, y, code, false);
  scene.hooks.onSurfStep = (x, y, code) => onStep(x, y, code, true); // called by overworld onArrive on water (riding on it)
  return st;
}
