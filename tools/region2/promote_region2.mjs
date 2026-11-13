#!/usr/bin/env node
// Region 2 promotion (coder, Oct 23 2026; Gary 2:11 PM CT "start on region 2"). Makes the authored region 2 wild tables
// (data/region2/encounters_region2.json, built by tools/region2/build_region2.mjs from region2_spec.mjs) the LIVE rows of
// data/encounters_wired.json, without a full tools/sync_creatures.mjs run (a full sync also rewrites masters.json /
// species_synced.gen.js / creatures_synced.json, which other owners touch).
//  - each region 2 zone replaces the wired zone of the same id AS AUTHORED (no GD swaps, no sync_added rows); staged-only
//    keys (staged, rollable_when_wired) are dropped, `region: 2` + `authored` are stamped.
//  - a base-form species that was wild somewhere before but would be wild nowhere after the swap is kept: appended to its
//    old zone at weight 4 (`kept_from_sync`), so no catchable species disappears. Evolved forms (evoLevel set) are not kept:
//    they come by evolution (and wild rows below their evolution level are exactly what region 2 removes).
//  - tools/sync_creatures.mjs calls applyRegion2Zones() as its last zone step, so a later full sync keeps these rows.
// Usage: node tools/region2/promote_region2.mjs [--check]   (--check: exit 1 when encounters_wired.json is not promoted)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REGION2_ZONES = join(ROOT, 'data/region2/encounters_region2.json');
const WIRED = join(ROOT, 'data/encounters_wired.json');
const STAGED_KEYS = ['staged', 'rollable_when_wired'];

/** Replace zones in place with the region 2 tables. evolved(id) -> true for evolved forms. -> {replaced, kept} */
export function applyRegion2Zones(zones, { evolved = () => false, r2 = null } = {}) {
  const src = r2 || (existsSync(REGION2_ZONES) ? JSON.parse(readFileSync(REGION2_ZONES, 'utf8')).zones : {});
  const names = (zs) => new Set(Object.values(zs).flatMap((z) => (z.slots || []).map((s) => s.species)));
  const before = names(zones), oldZones = { ...zones }, replaced = [];
  for (const [zid, z] of Object.entries(src)) {
    const out = { ...z, slots: z.slots.map((s) => ({ ...s })) };
    for (const k of STAGED_KEYS) delete out[k];
    out.region = 2; out.authored = 'data/region2/encounters_region2.json (tools/region2/promote_region2.mjs)';
    zones[zid] = out; replaced.push(zid);
  }
  const after = names(zones), kept = [];
  for (const sp of before) {
    if (after.has(sp) || evolved(sp)) continue;
    const zid = Object.keys(oldZones).find((k) => replaced.includes(k) && oldZones[k].slots.some((s) => s.species === sp));
    if (!zid) continue;
    const old = oldZones[zid].slots.find((s) => s.species === sp), z = zones[zid];
    const lo = Math.min(...z.slots.map((s) => (Array.isArray(s.level) ? s.level[0] : s.level)));
    const hi = Math.max(...z.slots.map((s) => (Array.isArray(s.level) ? s.level[1] : s.level)));
    z.slots.push({ species: sp, level: [lo, hi], weight: 4, kept_from_sync: true, placeholder: !!old.placeholder });
    kept.push(`${sp}@${zid}`);
  }
  return { replaced, kept };
}

export async function evolvedFn() {
  const { buildCreatures } = await import('../../src/battle/data/creatures.js');
  const C = buildCreatures();
  return (id) => !!C[id]?.evoLevel;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const w = JSON.parse(readFileSync(WIRED, 'utf8'));
  const zones = JSON.parse(JSON.stringify(w.zones));
  const res = applyRegion2Zones(zones, { evolved: await evolvedFn() });
  const txt = JSON.stringify({ ...w, zones }, null, 1) + '\n';
  const cur = readFileSync(WIRED, 'utf8');
  if (process.argv.includes('--check')) { console.log(cur === txt ? 'region 2 zones: promoted' : 'region 2 zones: NOT promoted'); process.exit(cur === txt ? 0 : 1); }
  writeFileSync(WIRED, txt);
  console.log(`promoted ${res.replaced.length} zones: ${res.replaced.join(', ')}`);
  console.log(`kept (would be wild nowhere): ${res.kept.join(', ') || 'none'}`);
}
