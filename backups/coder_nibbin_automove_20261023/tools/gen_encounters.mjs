#!/usr/bin/env node
// Encounter table generator (plan stage). Deterministic: same data in -> byte-identical files out.
// Gary's rule "never redo finished work": a zone that already has a table (hand-made, wired, or GD draft)
// is NEVER generated. Only zones marked status "no_table" in data/region_pulls.json are filled, and only
// with fully built species (art + registered in SPECIES). Output is a separate file that nothing loads yet.
//
//   node tools/gen_encounters.mjs                 -> region 1 only (default)
//   node tools/gen_encounters.mjs --regions 1,2   -> those regions
//   node tools/gen_encounters.mjs --check         -> exit 1 if the files on disk differ from a fresh run
//
// Inputs : data/region_pulls.json, data/creature_inventory.json (tools/build_creature_plan.mjs writes both),
//          data/encounter_overrides.json (optional, per-zone overrides), data/encounters_wired.json + the live
//          encounters.json + GD drafts (read only, for the id-collision guard and the diff report).
// Outputs: data/encounters_generated.json (zone-table shape {method, rate, slots:[{species, level, weight, time?}], source, band})
//          design/encounter_plan/GEN_REPORT.md (what the generator WOULD produce for zones that already have a
//          table, diffed against the current table. NOT applied.)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, rd, loadTables } from './creature_plan/plan_lib.mjs';

const args = process.argv.slice(2);
const argVal = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const REGIONS_WANTED = (argVal('--regions') || '1').split(',').map(Number);
const CHECK = args.includes('--check');
const OUT = 'data/encounters_generated.json';
const REPORT = 'design/encounter_plan/GEN_REPORT.md';
const OVERRIDES = 'data/encounter_overrides.json';

export function generate({ regions = [1], pulls = rd('data/region_pulls.json'), inv = rd('data/creature_inventory.json').species,
  overrides = existsSync(join(ROOT, OVERRIDES)) ? rd(OVERRIDES) : { zones: {} }, existingIds = existingZoneIds() } = {}) {
  const built = (sp) => !!(inv[sp] && inv[sp].art && inv[sp].registered);
  const zones = {}; const skipped = [];
  for (const r of pulls.regions) {
    if (!regions.includes(r.id)) continue;
    for (const z of r.zones) {
      if (z.status !== 'no_table') continue; // finished work stays as it is
      if (existingIds.has(z.id)) { skipped.push({ zone: z.id, why: 'id already used by an existing table' }); continue; }
      const ov = overrides.zones?.[z.id] || {};
      if (ov.skip) { skipped.push({ zone: z.id, why: 'override: skip' }); continue; }
      const band = ov.band || z.band;
      let slots = z.plan_pool.filter((s) => built(s.species) && !(ov.drop || []).includes(s.species)).map((s) => {
        const lo = Math.max(band[0], inv[s.species].min_level || 1); const hi = Math.max(lo, band[1]);
        const slot = { species: s.species, level: [lo, hi], weight: ov.weights?.[s.species] ?? s.weight };
        if (s.time) slot.time = s.time;
        return slot;
      });
      for (const a of ov.add || []) if (built(a.species)) slots.push({ species: a.species, level: a.level, weight: a.weight, ...(a.time ? { time: a.time } : {}) });
      if (!slots.length) { skipped.push({ zone: z.id, why: 'no fully built species fit' }); continue; }
      zones[z.id] = {
        method: z.method, rate: ov.rate ?? z.rate, slots,
        source: 'tools/gen_encounters.mjs from data/region_pulls.json plan_pool (fully built species only)',
        band, map: z.map, region: r.id, class: z.class, generated: true,
        inert: !z.rollable_now, inert_why: z.rollable_now ? undefined : z.note,
        weight_total: slots.reduce((a, s) => a + s.weight, 0),
      };
    }
  }
  return {
    _meta: { by: 'tools/gen_encounters.mjs', built: pulls._meta.built, regions, status: 'GENERATED PLAN TABLES, NOT LOADED. Only zones with no table; existing tables untouched.',
      shape: '{method, rate, slots:[{species, level:[min,max], weight, time?}], source, band}', tier_weights_guess: pulls._meta.tiers.weights,
      overrides: OVERRIDES, skipped },
    zones,
  };
}

export function existingZoneIds() {
  const t = loadTables(); const ids = new Set();
  for (const src of [t.wired, t.live]) for (const id of Object.keys(src || {})) ids.add(id);
  for (const id of Object.keys(t.gd || {})) ids.add(id);
  return ids;
}

// ---------- the not-applied diff report ----------
export function report({ pulls = rd('data/region_pulls.json'), inv = rd('data/creature_inventory.json').species } = {}) {
  const L = [];
  L.push('# Encounter generator report (NOT applied)', '',
    `Built ${pulls._meta.built} by tools/gen_encounters.mjs. Zones that already have a table keep it ("never redo finished work").`,
    'This lists what the generator WOULD produce for those zones (plan_pool, fully built species only), next to the current table, so Gary can pick anything by hand. Nothing here was written into any table.', '');
  const lvl = (l) => `${l[0]}-${l[1]}`;
  // evolution-level problems in tables that exist now
  const viol = [];
  const t = loadTables();
  const scan = (label, zones) => { for (const [zid, z] of Object.entries(zones || {})) for (const s of z.slots || []) {
    const m = inv[s.species]?.min_level; if (m && s.level[0] < m) viol.push(`| ${label} | ${zid} | ${s.species} | ${lvl(s.level)} | ${m} | ${s.sync_added ? 'sync_added placeholder slot' : 'hand-made'}${z.inert ? ' (inert draft, does not roll)' : ''} |`); } };
  scan('data/encounters_wired.json', t.wired);
  scan('live encounters.json', t.live);
  scan('design/overnight_gd drafts', Object.fromEntries(Object.entries(t.gd).map(([k, v]) => [k, v.zone])));
  L.push('## Existing slots below their evolution level (not changed)', '', '| file | zone | species | level | DEX min level | slot kind |', '|---|---|---|---|---|---|', ...viol, '');
  for (const r of pulls.regions) {
    const ex = r.zones.filter((z) => z.status !== 'no_table'); if (!ex.length) continue;
    L.push(`## Region ${r.id}: ${r.name} (wild ${lvl(r.band.wild)})`, '');
    for (const z of ex) {
      const cur = [...z.table_now, ...(z.table_now_sync_added || []).map((s) => ({ ...s, sync: true }))];
      const now = new Set(cur.map((s) => s.species));
      const gen = z.plan_pool.filter((s) => inv[s.species]?.art && inv[s.species]?.registered);
      const genIds = new Set(gen.map((s) => s.species));
      const add = gen.filter((s) => !now.has(s.species)).map((s) => `${s.species} ${lvl(s.level)} w${s.weight}`);
      const notGen = [...now].filter((s) => !genIds.has(s));
      const lv = gen.filter((s) => now.has(s.species)).map((s) => { const c = cur.find((x) => x.species === s.species);
        return lvl(c.level) !== lvl(s.level) || c.weight !== s.weight ? `${s.species} now ${lvl(c.level)} w${c.weight} / plan ${lvl(s.level)} w${s.weight}` : null; }).filter(Boolean);
      L.push(`### ${z.id} (${z.map}, ${z.method}, ${z.status}${z.rollable_now ? '' : ', not rollable now'}) band ${lvl(z.band)}`,
        `- current hand-made: ${z.table_now.map((s) => `${s.species} ${lvl(s.level)} w${s.weight}`).join(', ') || '(none)'}`,
        `- current sync_added placeholder slots: ${(z.table_now_sync_added || []).map((s) => `${s.species} ${lvl(s.level)} w${s.weight}`).join(', ') || '(none)'}`,
        `- plan would add: ${add.join(', ') || 'nothing'}`,
        `- in current table but not in plan pool: ${notGen.join(', ') || 'none'}`,
        `- level/weight differences: ${lv.join('; ') || 'none'}`, '');
    }
  }
  return L.join('\n') + '\n';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const gen = JSON.stringify(generate({ regions: REGIONS_WANTED }), null, 1) + '\n';
  const rep = report();
  if (CHECK) {
    const same = (p, s) => existsSync(join(ROOT, p)) && readFileSync(join(ROOT, p), 'utf8') === s;
    const ok = same(OUT, gen) && same(REPORT, rep); console.log(ok ? 'up to date' : 'differs'); process.exit(ok ? 0 : 1);
  }
  writeFileSync(join(ROOT, OUT), gen); writeFileSync(join(ROOT, REPORT), rep);
  const g = JSON.parse(gen); console.log(`wrote ${OUT} (${Object.keys(g.zones).join(', ') || 'no zones'}) and ${REPORT}`);
}
