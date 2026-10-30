// Habitat spread (Coder, Oct 29 2026; Gary: "some of the kilumen and their level 2 evos can be found almost anywhere
// their habitat exists at the level that's correct for that zone"). Plan: design/HABITAT_SPREAD.md.
// Adds a small set of common, adaptable lines (base form + stage-2 form; where a table's lowest level is past the evo level, only the evolved form, Oct 29 2026) to every live table whose habitat matches.
// Spread slots carry "spread": "habitat" so this script is idempotent: it strips old spread slots and re-adds them.
// Writes art/world/overworld/encounters/encounters.json (source), data/encounters_wired.json (generated) and the basic
// rod tables in data/fishing_tables.json. Re-run after tools/sync_creatures.mjs regenerates the wired table.
// Usage: node tools/encounters/habitat_spread.mjs [--check]   (--check: exit 1 if any file is out of date)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// [base, stage2, habitats]. Every stage2 here evolves at 16 (game data; read from species at runtime, not assumed).
export const LINES = [
  ['peeplark', 'larkspar', ['grass', 'mountain', 'snow']],
  ['dewmite', 'huskling', ['grass', 'forest']],
  ['pebblant', 'cairnant', ['grass', 'mountain']],
  ['briarlet', 'bramblehog', ['grass', 'forest']],
  ['capling', 'toadcap', ['forest', 'swamp']],
  ['ditchsnap', 'snapmoor', ['swamp', 'swamp_water']],
  ['pondkin', 'reedmoot', ['freshwater', 'swamp_water', 'swamp']],
  ['dartling', 'streambarb', ['freshwater']],
  ['pebbit', 'rubblon', ['cave', 'mountain']],
  ['stonepede', 'columnpede', ['cave']],
  ['delvelet', 'delvemaw', ['cave']],
  ['pinchkin', 'bulwarkrab', ['sea', 'coast']],
  ['wavelin', 'breakerfin', ['sea']],
  ['brinepipit', 'spraytern', ['coast']],
  ['ledgedove', 'belfrydove', ['urban', 'coast']],
  ['pebbadillo', 'scutadillo', ['mountain', 'snow']],
];
// Live encounter tables -> habitat(s). Not listed = no spread (keeps its own pool): crystal-lit route_revival_tr_crystal_grass,
// volcanic route_cindervale_grass, and every inert World Design draft (z.inert).
export const ZONE_HABITAT = {
  sunmeadow_grass: ['grass'], route_east_grass: ['grass'], sunmeadow_fields_grass: ['grass'], route_revival_sunmeadow_grass: ['grass'],
  thornwood_grass: ['forest'],
  route_revival_grass: ['mountain'], frostspire_pass_grass: ['snow', 'mountain'], frostspire_grass: ['snow'],
  greystone_glowfern: ['cave'], frostspire_cave: ['cave'], tidewater_coast_cave: ['cave'], route_cindervale_cave: ['cave'],
  mirefen_grass_w: ['swamp'], mirefen_grass_ne: ['swamp'], mirefen_grass_s: ['swamp'], route_east_reeds: ['swamp'],
  route_sunmeadow_mirefen_grass: ['swamp'], route_saltmere_mirefen_grass: ['swamp'],
  mirefen_bog_surf: ['swamp_water'],
  route_east_water: ['freshwater'], thornwood_pond: ['freshwater'], sunmeadow_fields_water: ['freshwater'], route_fernwick_lanternport_water: ['freshwater'],
  route_aurelith_saltmere_water: ['sea'], saltmere_water: ['sea'], route_saltmere_mirefen_water: ['sea'], route_coast_water: ['sea'],
  tidewater_coast_water: ['sea'], lanternport_water: ['sea'],
  route_aurelith_saltmere_grass: ['coast'], route_revival_saltmere_grass: ['coast'], route_coast_grass: ['coast'], tidewater_coast_grass: ['coast'],
  route_fernwick_lanternport_grass: ['urban'],
};
// Fishing maps (data/fishing_tables.json, basic rod) -> habitat. Lanternport is left out: its basic/good/super are hand-set
// (design/FISHING_GEAR.md §6, HAND in tools/fishing/gen_gear_tables.mjs) and would be overwritten on re-run anyway.
export const FISH_HABITAT = {
  brookhollow: 'freshwater', route1: 'freshwater', thornwood: 'freshwater', frostspire_pass: 'freshwater', greystone_entrance: 'freshwater',
  greystone_b1: 'freshwater', sunmeadow_fields: 'freshwater', route_sunmeadow_mirefen: 'freshwater', route_east: 'freshwater',
  fernwick: 'freshwater', route_fernwick_lanternport: 'freshwater', mirefen_bog: 'swamp_water',
  route_coast: 'sea', route_aurelith_saltmere: 'sea', route_saltmere_mirefen: 'sea', saltmere: 'sea', tidewater_coast: 'sea',
};
export const SHARE = { target: 0.15, min: 0.10, max: 0.20 };
export const TAG = 'habitat';

export function evoLevelOf(byId, stage2) { const e = byId(stage2); return Number.isFinite(e?.evoLevel) ? e.evoLevel : 16; }

/** stage2 (or its next form, when the band's low level is past that form's evo level). */
export function evolvedAt(byId, sp, lo) {
  for (let n = byId(sp)?.evo; n && Number.isFinite(byId(n)?.evoLevel) && lo >= byId(n).evoLevel; n = byId(n).evo) sp = n;
  return sp;
}

/** Spread slots for one table. slots = the table's own (non-spread) slots; habitats = zone habitats.
 * Lines whose base or stage2 already lives in the table are skipped (the local slot stays as authored). */
export function spreadSlots(slots, habitats, byId, opts = {}) {
  const own = slots.filter((s) => s.spread !== TAG);
  if (!own.length) return [];
  const W = own.reduce((a, s) => a + s.weight, 0);
  const lo = Math.min(...own.map((s) => s.level[0])), hi = Math.max(...own.map((s) => s.level[1]));
  const have = new Set(own.map((s) => s.species));
  let lines = LINES.filter(([b, e, h]) => h.some((x) => habitats.includes(x)) && !have.has(b) && !have.has(e) && (!opts.ok || (opts.ok(b) && opts.ok(e))));
  const build = (ls, scale) => {
    const parts = ls.reduce((a, [, e]) => a + (hi >= evoLevelOf(byId, e) ? 3 : 2), 0);
    const u = (SHARE.target * W / (1 - SHARE.target)) / parts * scale;
    const out = [];
    for (const [b, e] of ls) {
      const ev = evoLevelOf(byId, e), withEvo = hi >= ev;
      let bw = Math.max(withEvo ? 2 : 1, Math.round(2 * u)), ew = Math.max(1, Math.round(u));
      if (ew >= bw) ew = bw - 1;
      if (lo >= ev) { out.push({ species: evolvedAt(byId, e, lo), level: [lo, hi], weight: bw, spread: TAG }); continue; } // whole band past evo: evolved form only
      out.push({ species: b, level: [lo, hi], weight: bw, spread: TAG });
      if (withEvo && ew >= 1) out.push({ species: e, level: [Math.max(lo, ev), hi], weight: ew, spread: TAG });
    }
    return out;
  };
  const share = (out) => { const a = out.reduce((x, s) => x + s.weight, 0); return a / (a + W); };
  while (lines.length) {
    for (const scale of [1, 0.9, 1.1, 0.8, 1.2, 0.7, 1.3]) { const out = build(lines, scale); const s = share(out); if (s >= SHARE.min && s <= SHARE.max) return out; }
    lines = lines.slice(0, -1); // budget too small for every line: keep the first ones (LINES order = priority)
  }
  return [];
}

export const FILES = { source: 'art/world/overworld/encounters/encounters.json', wired: 'data/encounters_wired.json', fishing: 'data/fishing_tables.json' };

export async function apply() {
  const { speciesById } = await import(path.join(root, 'src/ui/data.js'));
  const { habitatOk } = await import(path.join(root, 'src/battle/encounters.js'));
  const out = {};
  for (const key of ['source', 'wired']) {
    const rel = FILES[key], txt = fs.readFileSync(path.join(root, rel), 'utf8'), d = JSON.parse(txt);
    const ind = (txt.match(/\n( +)"/) || [, ' '])[1].length;
    for (const [zid, z] of Object.entries(d.zones || {})) {
      const own = (z.slots || []).filter((s) => s.spread !== TAG && s.spread !== 'tod'), tod = (z.slots || []).filter((s) => s.spread === 'tod'); // tod: day/night slots (tod_spread.mjs), kept last
      const hab = !z.inert && ZONE_HABITAT[zid];
      const ok = (sp) => habitatOk(z.method, sp, (id) => speciesById(id).el, (id) => speciesById(id).found);
      z.slots = [...(hab ? [...own, ...spreadSlots(own, hab, speciesById, { ok })] : own), ...tod];
    }
    out[rel] = JSON.stringify(d, null, ind) + (txt.endsWith('\n') ? '\n' : '');
  }
  { const rel = FILES.fishing, d = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
    for (const [m, t] of Object.entries(d.maps || {})) {
      if (!t.basic?.slots) continue;
      const own = t.basic.slots.filter((s) => s.spread !== TAG), hab = FISH_HABITAT[m];
      const add = hab ? spreadSlots(own, [hab], speciesById, { ok: (sp) => speciesById(sp).el.includes('water') }) : [];
      for (const s of add) s.rarity = 'uncommon';
      t.basic.slots = [...own, ...add];
      for (const sl of add) { if (!d.water_species.includes(sl.species)) d.water_species.push(sl.species); d.species_el[sl.species] = speciesById(sl.species).el; }
    }
    out[rel] = JSON.stringify(d, null, 1) + '\n'; }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const check = process.argv.includes('--check'), out = await apply();
  let stale = 0;
  for (const [rel, txt] of Object.entries(out)) {
    const f = path.join(root, rel);
    if (fs.readFileSync(f, 'utf8') === txt) continue;
    stale++; if (check) console.log(`stale: ${rel}`); else fs.writeFileSync(f, txt);
  }
  if (check && stale) process.exit(1);
  console.log(check ? 'habitat spread: ok' : `habitat spread: ${stale} file(s) written`);
}
