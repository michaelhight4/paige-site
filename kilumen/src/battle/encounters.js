// Wild encounters (dev build, battles default v1, Oct 23, 2026). Rolls the World Design placeholder tables in
// art/world/overworld/encounters/encounters.json once per step onto an encounter cell (overworld.js onArrive ->
// hooks.onEncounterTile). Running and biking use the same rate (MOVEMENT.md). Species / levels / rates are the
// table's PLACEHOLDERS; nothing here adds creature data.
// Safety cap (Coder values, open question for Gary): the per-step chance is clamped to MAX_RATE, and after every
// wild battle or map change the next GRACE_STEPS encounter steps can't roll, so the player always gets a few free
// steps. No rolls while a script / fade / menu is up, or with an empty team.
// Not wired yet (no data or runtime): cave floor (layer code 2) outside a table rect ("low rate", no number in
// the docs), water tables (Tideglide), encounters.variant_roll (always null = normal).
export const ENCOUNTERS_URL = 'art/world/overworld/encounters/encounters.json';
// Creature sync (Oct 23, 2026): tools/sync_creatures.mjs writes the merged table (live + GD swaps + staged zones, wired species only,
// stand-ins flagged). Tried first; falls back to ENCOUNTERS_URL if missing or invalid.
export const ENCOUNTERS_WIRED_URL = 'data/encounters_wired.json';
// Art filter (#62, Coder, Oct 23 2026): at load, slots whose species has no creature art are dropped from the in-memory
// table (the JSON files keep everything). hasArt = the battle's own lookup (src/ui/data.js SPECIES: hand-written 16 +
// species_synced.gen.js), so creatures the sync wires later are picked up on the next load. On by default; ?encart=0 off.
// Trail level scaling (Coder, Oct 23 2026; Gary 11:48 AM CT: "well we need to have them be level scaling the closer to
// town you get"): on trail maps with an axis in data/trail_axes.json the slot level follows the player's progress along
// the trail (src/battle/level_scale.js) instead of a uniform roll. installWildEncounters opts.levelScale === false turns it off.
import { TRAIL_AXES_URL, axisFor, trailT, scaledLevel } from './level_scale.js?v=v0.2.46-alpha';
export const PHASES = ['dawn', 'day', 'dusk', 'night'];
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
  if (typeof ctx.t === 'number') return { species: slot.species, level: scaledLevel(lo, hi, ctx.t, rng, zone.cap?.level || null), slot };
  return { species: slot.species, level: lo + Math.floor(rng() * (hi - lo + 1)), slot };
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
  }
  rateFor(zone) {
    const r = this.rateOverride ?? zone?.rate ?? 0;
    return Math.max(0, Math.min(this.rateOverride != null ? 1 : this.maxRate, r)); // dev override may go to 1 (clips/tests); data never above MAX_RATE
  }
  resetGrace() { this.grace = this.graceSteps; }
  /** One step on an encounter cell. -> {species, level, table, forced} | null */
  step(mapName, rects, x, y, code, ctx = {}) {
    if (this.grace > 0) { this.grace--; return null; }
    const z = zoneAt(this.data, mapName, rects, x, y, code);
    if (!z) return null;
    if (this.rng() >= this.rateFor(z.zone)) return null;
    const t = trailT(axisFor(this.axes, mapName), x, y);
    const hit = pickSlot(z.zone, t == null ? ctx : { ...ctx, t }, this.rng);
    if (!hit) return null;
    this.resetGrace();
    return { species: hit.species, level: hit.level, table: z.id, forced: z.forced, t };
  }
}

/** Battle background per table method (only 'grass' art exists; ui_sd.js falls back to grass for the rest). */
export const biomeFor = (method) => (/fern|cave/.test(method || '') ? 'cave' : 'grass');

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
  st.ready = (opts.url ? getJson(opts.url) : getJson(ENCOUNTERS_WIRED_URL).then((d) => (d?.zones ? d : getJson(ENCOUNTERS_URL)))).then((data) => {
    if (!data) return;
    if (opts.hasArt && opts.artFilter !== false) { // #62: no art -> not rolled (in memory only)
      const f = filterEncounters(data, opts.hasArt); st.artFilter = f; data = f.data;
      if (opts.dev) console.info('[encounters] art filter dropped', Object.values(f.dropped).reduce((a, n) => a + n, 0), 'slots', f.dropped, 'empty zones', f.empty, 'empty phases', f.emptyPhases);
    }
    st.roller = new EncounterRoller(data, { rate: opts.rate });
    return axesP.then((axes) => { if (axes?.maps) st.roller.axes = axes; });
  }).catch((e) => console.warn('[encounters]', e.message));
  scene.hooks.onEncounterTile = (x, y, code) => {
    const m = scene.map, ro = st.roller;
    if (!ro || !m) return;
    if (st.lastMap !== m.name) { st.lastMap = m.name; ro.resetGrace(); } // a few free steps after every map change
    if (scene.busy || scene.fade || !scene.party?.length || opts.blocked?.()) return;
    const ctx = { phase: scene.phase, weather: scene.flags?.has('storm_season') ? 'storm' : 'clear', flood: /_storm$/.test(m.name) };
    const hit = ro.step(m.name, m.json?.encounter_zones, x, y, code, ctx);
    if (!hit) return;
    scene.log?.push({ tick: scene.tick, type: 'wild', species: hit.species, level: hit.level, table: hit.table, x, y, t: hit.t });
    scene.script(async () => {
      await openBattle({ species: hit.species, level: hit.level, biome: biomeFor(ro.data.zones?.[hit.table]?.method) });
      ro.resetGrace();
    });
  };
  return st;
}
