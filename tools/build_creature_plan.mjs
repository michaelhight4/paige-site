#!/usr/bin/env node
// Creature plan builder (Oct 23 2026, encounter-inventory worker). PLAN FILES ONLY, nothing is wired into the game.
// Reads (never writes): design/DEX_450.json, src/ui/data.js SPECIES, data/encounters_wired.json, the live encounters.json,
// design/overnight_gd/*, data/masters.json, src/battle/data/trainer_teams.js, art/world/overworld/maps/*.json.
// Writes: data/creature_inventory.json, data/region_pulls.json, data/trainer_pulls.json, data/needed_first_half.json,
//         data/creature_data_firsthalf.json.
// Rules (Gary): never redo finished work (existing tables/teams are recorded as they are); one inventory id can sit in many
// zones/regions, each entry with its own level range and weight (no per-region copies); the build list counts each species once.
// Deterministic. Run: node tools/build_creature_plan.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, rd, REGIONS, REGION_OF_MAP, REGION_OF_DEXZONE, DEXZONE_OF_MAP, gameMap, TIER_OF, TIER_WEIGHT, STARTER_LINES, STARTERS,
  methodClass, isRuntimeRollable, loadDex, evoOf, minLevelOf, loadRegistry, loadTables, mapOfTable, loadMaps,
  SKILL_POOL, placeholderStats, RARITY_CATCH,
} from './creature_plan/plan_lib.mjs';
import { zonePool, speciesHabitat } from './creature_plan/pool.mjs';

const DATE = '2026-10-23';
const dex = loadDex();
const reg = await loadRegistry();
const { wired, gd } = loadTables();
const maps = loadMaps();
const allMaps = Object.keys(maps);
const masters = rd('data/masters.json');
const { TRAINER_TEAMS } = await import(join(ROOT, 'src/battle/data/trainer_teams.js'));
const { learnsetFor } = await import(join(ROOT, 'src/overnight/learnsets.js'));
const { toID } = await import(join(ROOT, 'src/battle/data/skills.js'));
const out = (p, o) => writeFileSync(join(ROOT, p), JSON.stringify(o, null, 1) + '\n');
const regionOf = (m) => REGION_OF_MAP[m] || null;
const byDexNo = (a, b) => (dex.byId[a]?.dex_no ?? 9999) - (dex.byId[b]?.dex_no ?? 9999) || a.localeCompare(b);

// ================= zones =================
// existing tables: everything in data/encounters_wired.json (the runtime source). Hand-made slots are recorded as-is;
// sync_added slots are runtime placeholders (tools/sync_creatures.mjs) recorded separately.
const zones = [];
const tableIdsByMap = {};
for (const [id, z] of Object.entries(wired)) {
  const map = mapOfTable(id, z, gd, allMaps);
  const cls = methodClass(z.method);
  const hand = z.slots.filter((s) => !s.sync_added);
  const lv = hand.flatMap((s) => s.level);
  zones.push({ id, map, region: regionOf(map), dex_zone: DEXZONE_OF_MAP[map] || null, method: z.method, class: cls, rate: z.rate,
    band: lv.length ? [Math.min(...lv), Math.max(...lv)] : null, status: z.inert ? 'gd_draft' : 'existing',
    rollable_now: isRuntimeRollable(z), source: z.source || 'data/encounters_wired.json', maps: z.maps || null,
    slots_hand: hand, slots_sync_added: z.slots.filter((s) => s.sync_added) });
}
// World Design drafts that duplicate a live table on the same map+class are superseded (kept for reference only)
for (const z of zones.filter((z) => z.status === 'gd_draft')) {
  if (zones.some((o) => o.status === 'existing' && o.map === z.map && o.class === z.class)) z.status = 'gd_draft_superseded';
}
for (const z of zones) if (z.status !== 'gd_draft_superseded') (tableIdsByMap[z.map] ||= []).push(z);
// table-less zones: outdoor maps with water cells / encounter cells and no table of that class
for (const m of allMaps.sort()) {
  const r = regionOf(m); if (!r || /_int$/.test(m)) continue;
  const have = new Set((tableIdsByMap[m] || []).map((z) => z.class));
  const dz = DEXZONE_OF_MAP[m]; const dzBand = dex.zoneBand[dz] || REGIONS[r - 1].wild;
  const add = (cls, cells, method, rate) => {
    if (!cells || have.has(cls)) return;
    zones.push({ id: `${m}_${cls}`, map: m, region: r, dex_zone: dz, method, class: cls, rate, band: dzBand.slice(), status: 'no_table',
      rollable_now: false, cells, source: null, maps: null, slots_hand: [], slots_sync_added: [],
      note: cls === 'water' ? 'water cells (collision 3) with no table; runtime has no Tideglide/water encounters yet, so a table here is inert until it does'
        : `encounter-layer code ${cls === 'cave' ? 2 : 1} cells with no table and no zone rect: never rolls today (zoneAt needs a table listing the map or a rect)` });
  };
  add('water', maps[m].water, 'water (Tideglide)', 0.0667);
  add('cave', maps[m].cave, 'cave', 0.05);
  add('grass', maps[m].grass, 'grass', 0.0833);
}
// zone bands for no-table zones are clipped into the region wild band
for (const z of zones) if (z.status === 'no_table') { const w = REGIONS[z.region - 1].wild; z.band = [Math.max(z.band[0], w[0]), Math.min(z.band[1], w[1])]; }
zones.sort((a, b) => (a.region || 99) - (b.region || 99) || a.id.localeCompare(b.id));
const activeZones = zones.filter((z) => z.status !== 'gd_draft_superseded' && z.region);

// ================= inventory =================
const recorded = {}; // species -> [{zone, region, level, weight, time?, status}]
for (const z of activeZones) for (const s of z.slots_hand) (recorded[s.species] ||= []).push({ zone: z.id, map: z.map, region: z.region, level: s.level, weight: s.weight,
  ...(s.time ? { time: s.time } : {}), ...(s.weather ? { weather: s.weather } : {}), ...(s.flood ? { flood: true } : {}), status: z.status === 'gd_draft' ? 'gd_draft_table' : 'existing_table', source: z.source });
const syncAdded = {};
for (const z of activeZones) for (const s of z.slots_sync_added) (syncAdded[s.species] ||= []).push({ zone: z.id, region: z.region, level: s.level, weight: s.weight });

const inventory = {};
for (const c of [...dex.list].sort((a, b) => a.dex_no - b.dex_no)) {
  const e = evoOf(c); const r = reg.byId[c.id];
  const tier = TIER_OF[c.rarity] || 'common';
  const home = REGION_OF_DEXZONE[c.first_zone] || null;
  const hab = speciesHabitat(c, recorded[c.id] || [], activeZones);
  const notWild = c.rarity === 'legendary' ? 'legendary (very rare): not placed wild; postgame/story only (guess)'
    : e.kind === 'fossil' ? `evolves by ${e.method}: never wild (World Design INDEX)` : e.kind === 'item' ? `evolves by ${e.method}: evolved form not placed wild (World Design INDEX: shard evolutions never wild)`
      : e.kind === 'bond' ? `evolves by ${e.method}: not placed wild (guess)` : null;
  inventory[c.id] = {
    id: c.id, name: c.name, dex: c.dex_no, element: c.types.slice(), habitat: hab.tags, habitat_classes: hab.classes, ...(hab.guess ? { habitat_guess: true } : {}),
    rarity_dex: c.rarity, tier, weight: TIER_WEIGHT[tier], tier_weight_guess: true,
    home_zone: c.first_zone, home_region: home,
    evolution: { stage: c.evolution?.stage || 1, line: c.evolution?.line || [c.id], evolves_from: c.evolution?.evolves_from || null, evolves_to: c.evolution?.evolves_to || null,
      method: c.evolution?.method || null, evo_level: e.level, ...(e.time ? { evo_time: e.time } : {}) },
    min_level: minLevelOf(dex, c.id),
    art: !!r, art_status: r ? (r.synced || r.ph ? (r.art || 'draft') : 'hand-made (BASE16)') : (c.id === 'sunderhoof' ? 'excluded (IP note, tools/sync_creatures.mjs EXCLUDE)' : 'none'),
    registered: !!r,
    wild_ok: !notWild && c.id !== 'sunderhoof', ...(notWild ? { not_wild_reason: notWild } : {}),
    starter_line: STARTER_LINES.includes(c.id),
    regions: [], zones: [], ...(syncAdded[c.id] ? { runtime_sync_added: syncAdded[c.id] } : {}),
    recorded_regions: [...new Set((recorded[c.id] || []).map((x) => x.region))].sort((a, b) => a - b),
    recorded_maps: [...new Set((recorded[c.id] || []).map((x) => x.map))].sort(),
    ...(hab.timePref ? { time_pref: hab.timePref } : {}),
  };
}
// zone entries: recorded (as they are) + planned from the zone pool rule (one id, many zones, own level/weight per entry)
const plannedByZone = {};
for (const z of activeZones) {
  const pool = zonePool(z, inventory, dex, { builtOnly: false });
  plannedByZone[z.id] = pool;
  for (const p of pool) {
    const inv = inventory[p.species];
    if ((recorded[p.species] || []).some((x) => x.zone === z.id)) continue;
    inv.zones.push({ zone: z.id, map: z.map, region: z.region, level: p.level, weight: p.weight, ...(p.time ? { time: p.time } : {}),
      status: z.status === 'no_table' ? 'planned (zone has no table; gen_encounters may fill it)' : 'proposed addition to an existing table (NOT applied)', guess: true });
  }
}
for (const [sp, list] of Object.entries(recorded)) if (inventory[sp]) inventory[sp].zones.unshift(...list.map((x) => ({ ...x })));
// home placement: every wild species still without a zone in its home region gets one (home DEX zone first, then the region),
// so the plan covers the whole inventory. Zone pools above are capped at 12 for table generation; these are extra plan entries.
for (const inv of Object.values(inventory).sort((a, b) => a.dex - b.dex)) {
  if (!inv.wild_ok || !inv.home_region || inv.zones.some((z) => z.region === inv.home_region)) continue;
  const ok = (z) => z.region === inv.home_region && inv.habitat_classes.includes(z.class) && z.band && Math.max(z.band[0], inv.min_level) <= z.band[1]
    && (!inv.starter_line || z.map === 'brookhollow');
  const rank = (z) => (z.dex_zone === inv.home_zone ? 0 : 1) * 10 + (z.status === 'no_table' ? 0 : z.status === 'gd_draft' ? 1 : 2);
  let z = activeZones.filter(ok).sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id))[0];
  let note = 'home placement';
  if (!z && inv.home_region < 9) { // home band is below its evolution level: first later region whose zones reach it
    const ok2 = (q) => q.region > inv.home_region && q.region < 9 && inv.habitat_classes.includes(q.class) && q.band && Math.max(q.band[0], inv.min_level) <= q.band[1] && !inv.starter_line;
    z = activeZones.filter(ok2).sort((a, b) => a.region - b.region || (a.status === 'no_table' ? 0 : 1) - (b.status === 'no_table' ? 0 : 1) || a.id.localeCompare(b.id))[0];
    note = `home region ${inv.home_region} band is below its evolution level ${inv.min_level}: placed in the first later region whose zone band reaches it`;
  }
  if (!z) continue;
  const time = inv.time_pref || inv.evolution.evo_time || null;
  inv.zones.push({ zone: z.id, map: z.map, region: z.region, level: [Math.max(z.band[0], inv.min_level), z.band[1]], weight: inv.weight, ...(time ? { time } : {}),
    status: (z.status === 'no_table' ? 'planned (zone has no table)' : 'proposed addition to an existing table (NOT applied)') + '; ' + note, guess: true });
}
for (const inv of Object.values(inventory)) {
  inv.zones.sort((a, b) => a.region - b.region || a.zone.localeCompare(b.zone));
  inv.regions = [...new Set([...(inv.home_region ? [inv.home_region] : []), ...inv.zones.map((z) => z.region)])].sort((a, b) => a - b);
  if (!inv.zones.length) inv.unplaced_reason = inv.not_wild_reason || (inv.home_region === 9 ? 'postgame species: no postgame encounter zones exist yet (region 9 has no maps with encounter cells)' : inv.home_region ? `no zone in region ${inv.home_region} matches its habitat (${inv.habitat_classes.join('/')}) and level (min ${inv.min_level})` : 'no home zone');
}

// ================= trainers =================
const npcIndex = {}; // "map.id" -> npc
for (const [m, mm] of Object.entries(maps)) for (const n of mm.json.npcs || []) {
  if (n.team || /trainer|master|rival|^ron$/.test(String(n.kind || '')) || n.gd_id) npcIndex[`${m}.${n.id}`] = { map: m, npc: n };
}
const gdTrainers = [];
for (const f of (await import('node:fs')).readdirSync(join(ROOT, 'design/overnight_gd')).filter((f) => /^trainers_.*\.json$/.test(f)).sort()) {
  const j = rd(`design/overnight_gd/${f}`);
  for (const t of j.trainers || []) gdTrainers.push({ ...t, _map: gameMap(j.map), _file: `design/overnight_gd/${f}`, _band: j.level_band });
}
const normTeam = (t) => (Array.isArray(t) ? { team: t.map((x) => ({ species: x.species, level: x.level })) }
  : t?.byStarter ? { teams_by_starter: Object.fromEntries(Object.entries(t.byStarter).map(([k, v]) => [k, v.map((x) => ({ species: x.species, level: x.level }))])) }
    : t && typeof t === 'object' ? { teams_by_starter: Object.fromEntries(Object.entries(t).map(([k, v]) => [k.replace(/^if_player_took_/, ''), v.map((x) => ({ species: x.species, level: x.level }))])) } : null);
const trainers = {};
const addRec = (key, base, src, team) => {
  const t = (trainers[key] ||= { key, ...base, records: [] });
  const n = normTeam(team); if (n) t.records.push({ source: src, ...n });
};
// 1) every trainer-like npc on a map
for (const [key, { map, npc }] of Object.entries(npcIndex)) {
  addRec(key, { map, npc_id: npc.id, kind: npc.kind, gd_id: npc.gd_id || null, region: regionOf(map), placed_on_map: true }, `art/world/overworld/maps/${map}.json (npc.team)`, npc.team);
}
// 2) authored teams (src/battle/data/trainer_teams.js): used first at runtime (ui_sd.js)
for (const [key, team] of Object.entries(TRAINER_TEAMS)) {
  const [map, id] = key.split('.');
  addRec(key, { map, npc_id: id, region: regionOf(map), placed_on_map: !!npcIndex[key] }, 'src/battle/data/trainer_teams.js (authored, used first at runtime)', team);
}
// 3) masters.json halls
for (const h of masters.halls) {
  const hm = h.hall_map;
  const mKey = npcIndex[`${hm}.${h.master.id}`] ? `${hm}.${h.master.id}` : `${hm}.${hm}_master`;
  addRec(mKey, { map: hm, npc_id: mKey.split('.')[1], kind: 'master', region: regionOf(hm), placed_on_map: !!npcIndex[mKey], masters_id: h.master.id }, 'data/masters.json (hall master)', h.master.team);
  for (const t of h.trainers || []) {
    const hn = String(t.id).match(/_(h\d+)$/);
    const k = npcIndex[`${hm}.${t.id}`] ? `${hm}.${t.id}` : hn ? `${hm}.${hm}_${hn[1]}` : `${hm}.${t.id}`;
    addRec(k, { map: hm, npc_id: k.split('.')[1], kind: 'trainer', region: regionOf(hm), placed_on_map: !!npcIndex[k], masters_id: t.id }, 'data/masters.json (hall trainer)', t.team);
  }
}
// 4) World Design trainer drafts
for (const t of gdTrainers) {
  const m = t._map;
  let key = Object.keys(npcIndex).find((k) => npcIndex[k].npc.gd_id === t.id);
  const ex = String(t.note || '').match(/existing npc (\w+)/);
  if (!key && ex && npcIndex[`${m}.${ex[1]}`]) key = `${m}.${ex[1]}`;
  if (!key && t.id === 'ron_1') key = 'fernwick.ron_rival_1';
  if (!key && npcIndex[`${m}.${t.id}`]) key = `${m}.${t.id}`;
  const placed = !!key; key ||= `gd:${m}.${t.id}`;
  addRec(key, { map: m, npc_id: placed ? key.split('.')[1] : null, kind: t.class, gd_id: t.id, region: regionOf(m), placed_on_map: placed },
    `${t._file} (World Design draft)`, t.team || t.teams_by_player_starter);
  trainers[key].gd_id ||= t.id;
}
// active team = first record in runtime order: authored > masters.json > map npc team > World Design draft
const PRI = (s) => (s.includes('trainer_teams.js') ? 0 : s.includes('masters.json') ? 1 : s.includes('/maps/') ? 2 : 3);
for (const t of Object.values(trainers)) {
  t.records.sort((a, b) => PRI(a.source) - PRI(b.source));
  t.status = t.records.length ? 'recorded (existing team, not changed)' : 'no team anywhere';
  if (t.records.length) {
    t.active = { ...t.records[0] };
    const same = (a, b) => JSON.stringify(a.team || a.teams_by_starter) === JSON.stringify(b.team || b.teams_by_starter);
    t.also_recorded_differently = t.records.slice(1).filter((r) => !same(r, t.records[0])).map((r) => r.source);
  }
}
// region trainer bands = envelope of recorded active teams per region
const teamLevels = (a) => (a.team ? a.team : Object.values(a.teams_by_starter || {}).flat()).map((x) => x.level);
const trainerBand = {};
for (const t of Object.values(trainers)) if (t.active && t.region) {
  const lv = teamLevels(t.active); const b = (trainerBand[t.region] ||= [99, 0]);
  b[0] = Math.min(b[0], ...lv); b[1] = Math.max(b[1], ...lv);
}
// fill trainers with no team: 2 fully built species from their region's pool, levels in the lower half of the trainer band
const builtRegionPool = (r) => Object.values(inventory).filter((i) => i.art && i.registered && i.regions.includes(r) && i.wild_ok && i.id !== 'sunderhoof').sort((a, b) => a.dex - b.dex);
let fillN = 0;
for (const t of Object.values(trainers).sort((a, b) => a.key.localeCompare(b.key))) {
  if (t.active || !t.region) continue;
  const band = trainerBand[t.region] || [REGIONS[t.region - 1].wild[0] + 1, REGIONS[t.region - 1].wild[1] + 2];
  const pool = builtRegionPool(t.region);
  const lvA = band[0] + Math.floor((band[1] - band[0]) / 3), lvB = Math.min(band[1], lvA + 1);
  const team = [];
  for (let i = 0; i < pool.length && team.length < 2; i++) {
    const sp = pool[(fillN * 7 + i * 5) % pool.length];
    const lv = team.length ? lvB : lvA;
    if (sp.min_level <= lv && !team.some((x) => x.species === sp.id)) team.push({ species: sp.id, level: lv });
  }
  fillN++;
  t.status = 'filled (plan only, guess: no team existed)'; t.guess = true;
  t.active = { source: 'tools/build_creature_plan.mjs fill rule (region pool, fully built species, lower third of the trainer band)', team };
}

// ================= needed for the first half =================
const ronAll = (a) => (a.team ? a.team : Object.values(a.teams_by_starter || {}).flat());
function neededFor(rid, capLevel, carry = {}) {
  const why = {};
  const add = (sp, reason) => { (why[sp] ||= new Set()).add(reason); };
  for (const z of activeZones.filter((z) => z.region === rid && z.rollable_now)) {
    for (const s of z.slots_hand) add(s.species, `wild ${z.id} (hand-made)`);
    for (const s of z.slots_sync_added) add(s.species, `wild ${z.id} (sync_added placeholder slot, rolls at runtime)`);
  }
  for (const t of Object.values(trainers).filter((t) => t.region === rid && t.active)) for (const m of ronAll(t.active)) add(m.species, `trainer ${t.key}`);
  if (rid === 1) for (const s of STARTERS) add(s, 'starter (Brookhollow lab)');
  // evolutions the player can reach inside the region (evo level <= region trainer max)
  let grew = true;
  while (grew) { grew = false; for (const sp of [...Object.keys(carry), ...Object.keys(why)]) { const c = dex.byId[sp]; const nx = c?.evolution?.evolves_to; const e = evoOf(dex.byId[nx]);
    if (nx && e.level && e.level <= capLevel && !why[nx] && !carry[nx]) { add(nx, `evolves from ${sp} at L${e.level} (inside the region's level cap ${capLevel})`); grew = true; } } }
  return why;
}
const n1 = neededFor(1, trainerBand[1][1]);
const n2all = neededFor(2, trainerBand[2][1], n1); // region 1 catches/starters can evolve during region 2
const n2 = Object.fromEntries(Object.entries(n2all).filter(([k]) => !n1[k]));
const laterWater = {};
for (const z of activeZones.filter((z) => z.region <= 2 && !z.rollable_now)) for (const s of z.slots_hand) if (!n1[s.species] && !n2[s.species]) (laterWater[s.species] ||= []).push(z.id);

// what the battle data actually has (src/battle/data/creatures.js): synced -> prevo/evo/evoLevel fields;
// hand-written 16 -> `line` order, evoLevel 16*stage, flat stats STAGE_BASE [45,60,80] (lone 60)
const regList = Object.values(reg.byId);
function runtimeEvo(sp) {
  const r = reg.byId[sp]; if (!r) return null;
  if (r.synced || r.ph) return { prevo: r.prevo || null, evo: r.evo || null, evoLevel: r.prevo ? r.evoLevel : null };
  if (!r.line) return { prevo: null, evo: null, evoLevel: null };
  const line = regList.filter((x) => !x.synced && !x.ph && x.line === r.line).map((x) => x.id); const st = line.indexOf(sp);
  return { prevo: st > 0 ? line[st - 1] : null, evo: st < line.length - 1 ? line[st + 1] : null, evoLevel: st > 0 ? 16 * st : null };
}
function runtimeStats(sp) {
  const r = reg.byId[sp]; if (!r) return null;
  if (r.baseStats) return { ...r.baseStats };
  const ev = runtimeEvo(sp); const line = r.line ? regList.filter((x) => !x.synced && !x.ph && x.line === r.line).map((x) => x.id) : null;
  const b = line ? [45, 60, 80][line.indexOf(sp)] : 60; void ev;
  return { hp: b, atk: b, def: b, spa: b, spd: b, spe: b };
}
function gaps(sp) {
  const inv = inventory[sp]; const r = reg.byId[sp]; const c = dex.byId[sp]; const g = [];
  if (!c) return ['NOT IN DEX_450'];
  if (sp === 'sunderhoof') g.push('excluded from the game (IP note, awaiting Gary)');
  if (!r) g.push('art: none (no finished sprite set)', 'data: not registered in SPECIES (no stats/skills in game)');
  else {
    g.push(r.ph || r.synced ? 'stats: placeholder (sync formula)' : 'stats: placeholder (flat 45/60/80 by stage, creatures.js)');
    if (!r.blurb) g.push('blurb: TODO Text Bot (not ours)');
  }
  g.push('learnset: none in repo (placeholder learnset built in data/creature_data_firsthalf.json)');
  const e = evoOf(c); const rt = runtimeEvo(sp);
  if (c.evolution?.evolves_from && rt) {
    if (e.level && rt.evoLevel !== e.level) g.push(`evolution: runtime evoLevel ${rt.evoLevel ?? 'none'} vs DEX ${c.evolution.method}`);
    if (!rt.prevo) g.push(`evolution: link from ${c.evolution.evolves_from} missing at runtime (${c.evolution.evolves_from} ${reg.byId[c.evolution.evolves_from] ? 'registered but not linked' : 'has no art'})`);
  }
  if (c.evolution?.evolves_to && rt && !rt.evo) g.push(`evolution: link to ${c.evolution.evolves_to} missing at runtime (${c.evolution.evolves_to} ${reg.byId[c.evolution.evolves_to] ? 'registered but not linked' : 'has no art'})`);
  return g;
}
const listOf = (why) => Object.keys(why).sort(byDexNo).map((sp) => ({ species: sp, name: dex.byId[sp]?.name || sp, art: !!reg.byId[sp], registered: !!reg.byId[sp],
  used_by: [...why[sp]].sort(), gaps: gaps(sp) }));
const needed = {
  _meta: { built: DATE, by: 'tools/build_creature_plan.mjs', rule: 'needed = every species used by the region wild pools that roll today + its trainers\' active teams (all Ron starter branches) + starters (region 1) + evolutions reachable under the region trainer cap. Each species counted once (region 2 lists only extras). Water tables are inert at runtime (no Tideglide) and listed separately.',
    region1_level_cap: trainerBand[1][1], region2_level_cap: trainerBand[2][1] },
  region1_through_master1: listOf(n1),
  region2_extra_through_master2: listOf(n2),
  later_water_revisit_species_r1_r2: Object.keys(laterWater).sort(byDexNo).map((sp) => ({ species: sp, art: !!reg.byId[sp], tables: laterWater[sp] })),
};
needed.no_art_for_art_bot = [...needed.region1_through_master1, ...needed.region2_extra_through_master2].filter((x) => !x.art).map((x) => ({ species: x.species, name: x.name,
  region: needed.region1_through_master1.includes(x) ? 1 : 2, dex: dex.byId[x.species]?.dex_no, types: dex.byId[x.species]?.types, used_by: x.used_by }));

// ================= build data for the needed species (each once) =================
const ALIAS = (el) => SKILL_POOL[el] || null;
function buildEntry(sp, region) {
  const c = dex.byId[sp]; const r = reg.byId[sp]; const e = evoOf(c);
  const stage = c.evolution?.stage || 1, lineLength = c.evolution?.line_length || 1;
  const el = c.types.slice(0, 2);
  const skillPool = r?.skillPool || ALIAS(el[0]) || 'normal';
  const defaults = reg.PLACEHOLDER_SKILLS[skillPool].map(([n]) => toID(n));
  const ls = learnsetFor(sp, el.map((x) => ALIAS(x) || x), defaults, null).map(({ level, skill }) => ({ level, skill }));
  return {
    id: sp, name: c.name, el, dex: c.dex_no, rarity: c.rarity, region_first_needed: region,
    stage: lineLength > 1 ? stage - 1 : -1, prevo: c.evolution?.evolves_from || null, evo: c.evolution?.evolves_to || null,
    evoLevel: e.level ?? null, evoMethod: c.evolution?.method || null,
    baseStats: r ? runtimeStats(sp) : placeholderStats(c.types, c.rarity, stage, lineLength),
    catchRate: r?.catchRate ?? +((stage <= 1 ? 0.6 : stage === 2 ? 0.4 : 0.2) * (RARITY_CATCH[c.rarity] || 1)).toFixed(3),
    baseXp: r?.baseXp ?? 50 + 40 * Math.max(0, stage - 1) + (c.rarity === 'rare' ? 10 : c.rarity === 'legendary' ? 60 : 0),
    skillPool, learnset: ls,
    art: !!r,
    sources: { stats: r?.baseStats ? 'copied from SPECIES (synced, sync placeholder formula)' : (r ? 'copied from src/battle/data/creatures.js (hand-written 16: flat STAGE_BASE by line stage)' : 'computed with the sync placeholder formula (tools/sync_creatures.mjs placeholderStats, copied)'),
      evolution: 'design/DEX_450.json evolution.method', learnset: 'src/overnight/learnsets.js learnsetFor() over existing PLACEHOLDER_SKILLS names (no new skill names)' },
    placeholder: { stats: true, catchRate: true, baseXp: true, learnset: true },
  };
}
const build = { _meta: { built: DATE, by: 'tools/build_creature_plan.mjs', status: 'PLAN DATA, NOT WIRED. Placeholder numbers for Gary; original Kilumen ids/names only (DEX_450), existing skill names only.',
  shape: 'SPECIES entry fields (id,name,el,dex,rarity,stage,prevo,evo,evoLevel,baseStats,catchRate,baseXp,skillPool) + learnset [{level, skill}] in the src/overnight/learnsets.js data shape',
  wiring: 'Not loaded. Optional hook (not applied): src/overnight/index.js line 59 `ov.learn = flags.learnsets ? { data: null } : null` could pass {species: learnset} from this file; runtime evoLevel for synced species comes from tools/sync_creatures.mjs (16*(stage-1)) and would need the DEX level there.' },
  order: [], species: {} };
for (const x of needed.region1_through_master1) { build.order.push(x.species); build.species[x.species] = buildEntry(x.species, 1); }
for (const x of needed.region2_extra_through_master2) { build.order.push(x.species); build.species[x.species] = buildEntry(x.species, 2); }

// ================= region pulls =================
const RATE = { grass: 0.0833, cave: 0.05, cave_fern: 0.0833, water: 0.0667, fishing: 0 };
const regionPulls = { _meta: { built: DATE, by: 'tools/build_creature_plan.mjs', status: 'PLAN DATA, NOT WIRED',
  tiers: { mapping: TIER_OF, weights: TIER_WEIGHT, guess: true, note: 'tier weights are a guess for Gary; existing tables keep their own weights' },
  rates_per_method: { ...RATE, note: 'from the existing tables (grass 0.0833, cave 0.05, cave_fern 0.0833, Tideglide water 0.0667, fishing 0 = rod not built)' },
  band_rules: 'wild band = DEX_450 zones_story_order wild_levels + existing tables; trainer band = envelope of the recorded teams in the region (not changed). Evolved forms never below their DEX evolution level.' },
  regions: REGIONS.map((r) => ({ id: r.id, key: r.key, name: r.name, coin: r.coin, master_map: r.master_map, maps: r.maps, dex_zones: r.dex_zones,
    band: { wild: r.wild, trainer: trainerBand[r.id] || null, ...(r.id === 3 ? { note: 'greystone kept at 20-27 (DEX + existing table). World Design proposes 12-18 (INDEX.md, unsigned): if Gary signs it, greystone moves to region 2.' } : {}) },
    rates: RATE,
    zones: activeZones.filter((z) => z.region === r.id).map((z) => ({ id: z.id, map: z.map, method: z.method, class: z.class, rate: z.rate, band: z.band, status: z.status,
      rollable_now: z.rollable_now, ...(z.note ? { note: z.note } : {}), source: z.source,
      table_now: z.slots_hand.map((s) => ({ species: s.species, level: s.level, weight: s.weight, ...(s.time ? { time: s.time } : {}), ...(s.weather ? { weather: s.weather } : {}) })),
      table_now_sync_added: z.slots_sync_added.map((s) => ({ species: s.species, level: s.level, weight: s.weight })),
      plan_pool: plannedByZone[z.id].map((p) => ({ ...p, art: inventory[p.species].art })) })),
    pool: Object.values(inventory).filter((i) => i.regions.includes(r.id)).sort((a, b) => a.dex - b.dex).map((i) => {
      const ents = i.zones.filter((z) => z.region === r.id);
      const lv = ents.flatMap((z) => z.level);
      return { species: i.id, tier: i.tier, weight: i.weight, art: i.art, level: lv.length ? [Math.min(...lv), Math.max(...lv)] : null, zones: ents.map((z) => z.zone),
        ...(ents.length ? {} : { unplaced: true }) };
    }),
  })),
};
// ================= write =================
const invOut = { _meta: { built: DATE, by: 'tools/build_creature_plan.mjs', status: 'PLAN DATA, NOT WIRED. Covers all 450 DEX_450 species (art true/false).',
  rules: ['one id, many zones: each zone entry carries its own level range and weight; no per-region copies', 'recorded entries = existing tables as they are; planned entries are guesses (guess:true)',
    'art = registered in SPECIES (src/ui/data.js: hand-written 16 + synced sprite sets)', 'min_level = DEX evolution level (evolved forms never roll below it)', 'no lore text here: names/types/zones come from DEX_450'],
  counts: { species: Object.keys(inventory).length, art: Object.values(inventory).filter((i) => i.art).length, placed: Object.values(inventory).filter((i) => i.zones.length).length } },
  species: inventory };
out('data/creature_inventory.json', invOut);
out('data/region_pulls.json', regionPulls);
const trOut = { _meta: { built: DATE, by: 'tools/build_creature_plan.mjs', status: 'PLAN DATA, NOT WIRED. Existing teams recorded as they are (runtime order: trainer_teams.js > masters.json > map npc.team > World Design draft). Only trainers with no team anywhere are filled (guess).',
  trainer_bands: trainerBand }, trainers: Object.values(trainers).sort((a, b) => (a.region || 99) - (b.region || 99) || a.key.localeCompare(b.key)) };
out('data/trainer_pulls.json', trOut);
out('data/needed_first_half.json', needed);
out('data/creature_data_firsthalf.json', build);
console.log(JSON.stringify({ zones: activeZones.length, no_table: activeZones.filter((z) => z.status === 'no_table').map((z) => z.id), trainers: trOut.trainers.length,
  filled: trOut.trainers.filter((t) => t.guess).length, trainerBand, n1: needed.region1_through_master1.length, n2: needed.region2_extra_through_master2.length,
  noArt: needed.no_art_for_art_bot.map((x) => x.species), unplaced: Object.values(inventory).filter((i) => !i.zones.length).length }, null, 1));
