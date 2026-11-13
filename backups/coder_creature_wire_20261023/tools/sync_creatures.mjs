// Creature sync (overnight, Oct 23, 2026). Run: node tools/sync_creatures.mjs   (re-run whenever more sprite sets land)
// Reads Character models' finished sets (art/characters/pixel/creatures/_overnight/manifest_overnight.jsonl) plus a folder
// scan of art/characters/pixel/creatures/<id>/ and design/DEX_450.json, then REGENERATES (never hand-edit these):
//   src/ui/species_synced.gen.js     SYNCED_SPECIES: appended to SPECIES in src/ui/data.js (battle engine, Kilindex,
//                                     party, follower, encounters all read SPECIES)
//   data/creatures_synced.json       full registry: sprite paths, placeholder flags, TODO text ids, pending/skipped sets
//   data/encounters_wired.json       runtime wild table (src/battle/encounters.js loads it first, falls back to
//                                     encounters.json): encounters.json + World Design staged encounters_overnight.json,
//                                     with Game dev's overnight_gd species swapped in where the species has sprites
//   data/standins_overnight.json     every encounter / Master / trainer entry still fought as a stand-in
// and updates data/masters.json in place (team entries whose species is now registered: battle_species = species).
// A species is wired only when it is in the manifest AND every required sprite file is on disk (front/back 1x+2x,
// 4+4 idle frames, 4-direction stand + 4 walk frames, overworld sheet). The original 16 stay hand-written in data.js.
// PLACEHOLDERS (flagged placeholder:true in the data): base stats, catch rate, base XP (generated from DEX type +
// rarity + evolution stage), skill pool (nearest existing PLACEHOLDER_SKILLS pool by element). No lore text is written:
// Kilindex blurbs are TODO text ids for Text Bot (system_kilindex.entries.<id>.blurb).
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (...a) => path.join(ROOT, ...a);
const rd = (p) => JSON.parse(readFileSync(P(p), 'utf8'));
const CRE = 'art/characters/pixel/creatures';
const MANIFEST = `${CRE}/_overnight/manifest_overnight.jsonl`;
const STAGED_ENC = 'art/world/overworld/qa/overnight_maps/staging/encounters_overnight.json';
const BASE_ENC = 'art/world/overworld/encounters/encounters.json';
const GD = 'design/overnight_gd';
const BASE16 = ['tumbloam', 'burrowmane', 'bastonox', 'cindrip', 'emberlunx', 'forgeharrow', 'rillop', 'brookhorn', 'tidemarrow',
  'sailquill', 'halovy', 'gloamtick', 'runeskein', 'burlbeetle', 'mirewump', 'slagrook'];
const now = new Date();
const stamp = now.toLocaleString('en-US', { timeZone: 'America/Chicago', hourCycle: 'h23' }) + ' CT';

// ---------- required files per set (relative to the creature folder) ----------
export function requiredFiles(id) {
  const f = [`battle/${id}_front_128.png`, `battle/${id}_back_128.png`, `battle/${id}_front_128_2x.png`, `battle/${id}_back_128_2x.png`,
    `overworld/${id}_ow_sheet.png`];
  for (const side of ['front', 'back']) for (let i = 0; i < 4; i++) f.push(`anim/${id}_${side}_idle/${id}_${side}_idle_f${i}.png`);
  for (const d of ['down', 'left', 'right', 'up']) {
    f.push(`overworld/${id}_ow/${id}_ow_${d}_stand.png`);
    for (let i = 0; i < 4; i++) f.push(`overworld/${id}_ow/${id}_ow_${d}_walk${i}.png`);
  }
  return f;
}
export function iconFiles(id) {
  const own = [0, 1].map((f) => `${CRE}/${id}/icons/${id}_icon_f${f}_2x.png`);
  if (own.every((p) => existsSync(P(p)))) return { kind: 'own', f0: own[0], f1: own[1], stem: `creatures/${id}/icons/${id}_icon_f` };
  // no party icon drawn for this set yet: use its own overworld down stand / walk frame (64x64, same size as icon _2x)
  return { kind: 'overworld', f0: `${CRE}/${id}/overworld/${id}_ow/${id}_ow_down_stand.png`, f1: `${CRE}/${id}/overworld/${id}_ow/${id}_ow_down_walk1.png` };
}

// ---------- placeholder generators (type + rarity + stage) ----------
const STAGE_TOTAL = { 1: 285, 2: 375, 3: 480 }; // close to the hand-written 16 (flat 45/60/80 x 6 = 270/360/480)
const LONE_TOTAL = 400;
const RARITY_MULT = { common: 1, uncommon: 1.04, rare: 1.08, legendary: 1.3 };
const RARITY_CATCH = { common: 1, uncommon: 0.8, rare: 0.6, legendary: 0.08 };
// stat lean per element: [hp, atk, def, spa, spd, spe] weights (PLACEHOLDER, not design)
const LEAN = {
  earth: [1.1, 1.05, 1.25, 0.8, 0.95, 0.85], fire: [0.95, 1.05, 0.9, 1.2, 0.9, 1.0], water: [1.05, 0.95, 1.0, 1.05, 1.1, 0.85],
  freshwater: [1.05, 0.95, 1.0, 1.05, 1.1, 0.85], sea: [1.15, 1.0, 1.05, 1.0, 1.0, 0.8], swamp: [1.15, 1.0, 1.05, 0.95, 1.0, 0.85],
  rain: [1.0, 0.9, 0.95, 1.1, 1.1, 0.95], wind: [0.9, 0.95, 0.85, 1.05, 0.95, 1.3], bird: [0.9, 1.1, 0.85, 0.95, 0.9, 1.3],
  grass: [1.05, 0.95, 1.05, 1.05, 1.1, 0.8], bug: [0.95, 1.1, 1.1, 0.85, 0.95, 1.05], light: [0.95, 0.85, 0.9, 1.25, 1.1, 0.95],
  angelic: [1.0, 0.85, 0.95, 1.15, 1.2, 0.85], dark: [0.9, 1.15, 0.9, 1.0, 0.9, 1.15], ghost: [0.85, 0.95, 0.9, 1.2, 1.05, 1.05],
  mystic: [0.95, 0.85, 0.9, 1.25, 1.1, 0.95], spirit: [1.0, 0.85, 0.95, 1.15, 1.15, 0.9], magma: [1.05, 1.15, 1.1, 1.0, 0.85, 0.85],
  demon: [0.95, 1.2, 0.9, 1.1, 0.85, 1.0], devil: [0.95, 1.1, 0.9, 1.2, 0.85, 1.0], dragos: [1.05, 1.15, 1.0, 1.05, 0.95, 0.95],
  god: [1.1, 1.0, 1.0, 1.1, 1.1, 0.95], legendary: [1.1, 1.05, 1.05, 1.05, 1.05, 0.95],
};
const KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export function placeholderStats(types, rarity, stage, lineLength) {
  const total = (lineLength > 1 ? STAGE_TOTAL[stage] || STAGE_TOTAL[3] : LONE_TOTAL) * (RARITY_MULT[rarity] || 1);
  const w = KEYS.map((_, i) => (LEAN[types[0]] || LEAN.earth)[i] * 0.7 + (LEAN[types[1] || types[0]] || LEAN.earth)[i] * 0.3);
  const sum = w.reduce((a, b) => a + b, 0);
  return Object.fromEntries(KEYS.map((k, i) => [k, Math.max(20, Math.round((total * w[i]) / sum))]));
}
// nearest existing placeholder skill pool (src/ui/data.js PLACEHOLDER_SKILLS keys) per element; no new skill names
export const SKILL_POOL = { earth: 'earth', grass: 'earth', bug: 'earth', fire: 'fire', magma: 'fire', water: 'water', freshwater: 'water',
  sea: 'water', swamp: 'water', rain: 'water', wind: 'wind', bird: 'wind', light: 'light', angelic: 'light', god: 'light',
  dark: 'dark', ghost: 'dark', demon: 'dark', devil: 'dark', mystic: 'mystic', spirit: 'mystic', dragos: 'mystic', legendary: 'mystic' };

// ---------- read inputs ----------
const dexList = rd('design/DEX_450.json').creatures;
const dex = Object.fromEntries(dexList.map((c) => [c.id, c]));
const zoneName = Object.fromEntries(rd('design/DEX_450.json').meta.zones_story_order.map((z) => [z.id, z.name.replace(/\s*\(.*\)\s*$/, '')]));
const manifest = new Map();
const manifestErrors = [];
if (existsSync(P(MANIFEST))) {
  readFileSync(P(MANIFEST), 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try { const m = JSON.parse(line); manifest.set(m.name, m); } catch (e) { manifestErrors.push(`line ${i + 1}: ${e.message}`); } // half-written last line: skip, next run picks it up
  });
}
const folders = readdirSync(P(CRE)).filter((d) => !d.startsWith('_') && !d.startsWith('.') && statSync(P(CRE, d)).isDirectory());

const wired = [], pending = [], skipped = [];
for (const id of folders.filter((d) => !BASE16.includes(d)).sort()) {
  const missing = requiredFiles(id).filter((f) => !existsSync(P(CRE, id, f)));
  const m = manifest.get(id);
  if (!dex[id]) { skipped.push({ id, reason: 'not in DEX_450.json' }); continue; }
  if (!m) { pending.push({ id, reason: 'folder present, not in manifest yet', missing: missing.length }); continue; }
  if (missing.length) { pending.push({ id, reason: 'in manifest, sprite files missing', missing }); continue; }
  wired.push(id);
}
for (const id of manifest.keys()) if (!folders.includes(id)) skipped.push({ id, reason: 'in manifest, no folder' });

const wiredSet = new Set([...BASE16, ...wired]);
const byDex = (a, b) => dex[a].dex_no - dex[b].dex_no;
wired.sort(byDex);

// ---------- build registry entries ----------
const synced = wired.map((id) => {
  const d = dex[id], ev = d.evolution || {}, m = manifest.get(id);
  const stage = ev.stage || 1, lineLength = ev.line_length || 1;
  const lineIds = ev.line || [id];
  const prevo = ev.evolves_from && wiredSet.has(ev.evolves_from) ? ev.evolves_from : null;
  const evo = ev.evolves_to && wiredSet.has(ev.evolves_to) ? ev.evolves_to : null;
  const icon = iconFiles(id);
  return {
    id, name: d.name, el: d.types.slice(0, 2), line: lineLength > 1 ? `dex:${lineIds[0]}` : undefined,
    found: zoneName[d.first_zone] || '', blurb: '', blurbKey: `system_kilindex.entries.${id}.blurb`, // TODO Text Bot
    dex: d.dex_no, rarity: d.rarity, stage: lineLength > 1 ? stage - 1 : -1, prevo, evo, evoLevel: prevo ? 16 * (stage - 1) : undefined,
    baseStats: placeholderStats(d.types, d.rarity, stage, lineLength),
    catchRate: +((stage <= 1 ? 0.6 : stage === 2 ? 0.4 : 0.2) * (RARITY_CATCH[d.rarity] || 1)).toFixed(3),
    baseXp: 50 + 40 * Math.max(0, stage - 1) + (d.rarity === 'rare' ? 10 : d.rarity === 'legendary' ? 60 : 0),
    skillPool: SKILL_POOL[d.types[0]] || 'normal',
    icon: icon.kind === 'own' ? { stem: icon.stem } : { f0: icon.f0.replace('art/characters/pixel/', ''), f1: icon.f1.replace('art/characters/pixel/', '') },
    placeholder: { stats: true, catchRate: true, baseXp: true, skills: true, blurb: 'TODO text id', generator: 'tools/sync_creatures.mjs v1 (type+rarity+stage)' },
    art: { status: m.status || 'draft', worker: m.worker || null },
    synced: true,
  };
});

// ---------- write the generated module + registry ----------
const strip = (o) => JSON.parse(JSON.stringify(o));
// Battle sprite size per folder: the big final forms ship 160px sprites (no _128 files). Lets ui.js / fx_art pick the right file.
const SPRITE_PX = Object.fromEntries(readdirSync(P(CRE)).filter((d) => !d.startsWith('_'))
  .filter((d) => !existsSync(P(`${CRE}/${d}/battle/${d}_front_128_2x.png`)) && existsSync(P(`${CRE}/${d}/battle/${d}_front_160_2x.png`)))
  .map((d) => [d, 160]));
const genJs = `// GENERATED by tools/sync_creatures.mjs (${stamp}). Do not edit: re-run the script. ${synced.length} species.
// Creatures with finished sprite sets (Character models overnight manifest + folder scan) on top of the hand-written 16.
// Every number here is a PLACEHOLDER (placeholder flags per entry); blurbs are TODO text ids for Text Bot.
export const SYNCED_SPECIES = ${JSON.stringify(strip(synced.map(({ placeholder, art, ...s }) => ({ ...s, ph: 1, art: art.status }))))};
// Battle sprite px for folders without _128 files (default 128).
export const SPRITE_PX = ${JSON.stringify(SPRITE_PX)};
`;
writeFileSync(P('src/ui/species_synced.gen.js'), genJs.replace(/\},\{/g, '},\n{'));
mkdirSync(P('data'), { recursive: true });

// ---------- encounters ----------
const standins = { _meta: { built: stamp, rule: 'species without a finished sprite set keep the existing stand-in (encounters.json / staged species, GD "replaced", or masters.json battle_species)' }, encounters: [], masters: [], trainers: [] };
const base = rd(BASE_ENC);
const staged = existsSync(P(STAGED_ENC)) ? rd(STAGED_ENC) : {};
const gdFiles = readdirSync(P(GD)).filter((f) => /^encounters_.*\.json$/.test(f));
const gdZones = {}; // gd zone id -> {file, zone}
for (const f of gdFiles) for (const z of rd(`${GD}/${f}`).zones || []) if (Array.isArray(z.slots)) gdZones[z.id] = { file: f.replace(/\.json$/, ''), zone: z };
const engine16 = BASE16.map((id) => ({ id, el: dex[id]?.types || [], stage: (dex[id]?.evolution?.stage || 1) - 1 }));
function standIn16(species, level) { // same rule as build_progression_data.mjs standIn, restricted to the original 16 (the existing stand-ins)
  const types = dex[species]?.types || [];
  const want = level >= 32 ? 2 : level >= 16 ? 1 : 0;
  let best = 'tumbloam', bs = -1;
  for (const e of engine16) { const s = e.el.filter((t) => types.includes(t)).length * 10 - Math.abs(e.stage - want); if (s > bs) { bs = s; best = e.id; } }
  return best;
}
const lvl = (l) => (Array.isArray(l) ? l[0] : l);
const zones = {};
const wiredIn = new Set();
function resolveSlot(table, s, fallback) {
  if (wiredSet.has(s.species)) { wiredIn.add(s.species); return { ...s }; }
  const stand = fallback && wiredSet.has(fallback) ? fallback : standIn16(s.species, lvl(s.level));
  standins.encounters.push({ table, species: s.species, stand_in: stand, why: dex[s.species] ? 'no sprite set yet' : 'not in DEX_450 (TODO_ROSTER)' });
  const { replaced, ...rest } = s;
  return { ...rest, species: stand, wants: s.species, stand_in: true };
}
// 1) encounters.json (World Design, live): GD re-specs a live table with "replaced" -> swap only those slots, keep live levels
for (const [id, z] of Object.entries(base.zones)) {
  const gd = gdZones[id]?.zone;
  zones[id] = { ...z, slots: z.slots.map((s) => {
    const g = gd?.slots.find((x) => x.replaced === s.species);
    if (g && wiredSet.has(g.species)) { wiredIn.add(g.species); return { ...s, species: g.species, gd_swap: s.species }; }
    if (g) standins.encounters.push({ table: id, species: g.species, stand_in: s.species, why: 'no sprite set yet' });
    if (wiredSet.has(s.species)) { wiredIn.add(s.species); return { ...s }; }
    return resolveSlot(id, s, null); // live table names a species with no sprite set yet -> existing stand-in rule, logged
  }), source: BASE_ENC };
}
// 2) World Design staged tables: when every one of their GD source zones is known, use Game dev's slots (resolved)
for (const [id, z] of Object.entries(staged)) {
  if (zones[id]) continue;
  const refs = [...new Set((z.todo || '').match(/encounters_\w+(?=\.json)/g) || [])];
  const gd = refs.map((f) => Object.values(gdZones).find((g) => g.file === f && /^grass/.test(g.zone.method || '') && !g.used)).filter(Boolean)[0];
  if (gd) {
    gd.used = id;
    zones[id] = { ...z, slots: gd.zone.slots.map((s) => resolveSlot(id, s, s.replaced)), source: `${STAGED_ENC} + ${GD}/${gd.file}.json#${gd.zone.id}` };
  } else zones[id] = { ...z, slots: z.slots.map((s) => resolveSlot(id, s, null)), source: STAGED_ENC };
}
// 3) GD tables with no live/staged table yet: added inert (no "maps"; only a map rect naming the id can roll them)
for (const [id, g] of Object.entries(gdZones)) {
  if (zones[id] || g.used) continue;
  zones[id] = { method: g.zone.method, rate: g.zone.rate ?? 0.05, slots: g.zone.slots.map((s) => resolveSlot(id, s, s.replaced)), source: `${GD}/${g.file}.json`, inert: true };
}
// 1b) wired species that no table names yet: added to the live table of their DEX first_zone (DEX meta encounter_zone),
//     PLACEHOLDER weight by rarity, levels = that table's band. Flagged sync_added so World Design / Game dev can replace them.
const RARITY_WEIGHT = { common: 4, uncommon: 2, rare: 1 };
const namedAnywhere = () => new Set(Object.values(zones).flatMap((z) => z.slots.map((s) => s.species)));
const zoneOf = Object.fromEntries(rd('design/DEX_450.json').meta.zones_story_order.filter((z) => z.encounter_zone)
  .map((z) => [z.id, z.encounter_zone.split(',')[0].trim().replace(/\/.*$/, '').replace(/^mirefen_grass_w.*/, 'mirefen_grass_w')]));
const notInTables = [];
const WATERY = /surf|fish|water|rod/;
function zoneFor(d) { // first_zone id -> best table naming it: own prefix, then route_<x>_..., land creatures skip water tables
  const fz = d.first_zone, aqua = (d.types || []).some((t) => /water|sea|freshwater|swamp/.test(t));
  const ok = Object.entries(zones).filter(([zid, z]) => !z.inert && (aqua || !WATERY.test(z.method || '')) && (zid.startsWith(fz + '_') || zid.includes('_' + fz + '_')));
  ok.sort(([a, za], [b, zb]) => (+!a.startsWith(fz + '_') - +!b.startsWith(fz + '_')) || (+!/grass/.test(za.method || '') - +!/grass/.test(zb.method || '')) || a.localeCompare(b));
  return ok[0]?.[0];
}
{
  const named = namedAnywhere();
  for (const id of wired) {
    if (named.has(id)) continue;
    const d = dex[id], zid = zoneOf[d.first_zone] || zoneFor(d), z = zones[zid], w = RARITY_WEIGHT[d.rarity];
    if (!z || !w) { notInTables.push({ id, first_zone: d.first_zone, why: !z ? 'no table for first_zone' : 'rarity has no wild weight' }); continue; }
    const lo = Math.min(...z.slots.map((s) => lvl(s.level))), hi = Math.max(...z.slots.map((s) => (Array.isArray(s.level) ? s.level[1] : s.level)));
    z.slots.push({ species: id, level: [lo, hi], weight: w, sync_added: true, placeholder: true });
    wiredIn.add(id);
  }
}
const { zones: _z, species_with_art, ...baseMeta } = base;
writeFileSync(P('data/encounters_wired.json'), JSON.stringify({ ...baseMeta, generated: `tools/sync_creatures.mjs ${stamp}`,
  note: `${base.note} | GENERATED wired table: encounters.json + staged encounters_overnight.json + Game dev overnight_gd species that have sprites. Levels/weights stay PLACEHOLDER.`,
  species_with_art: [...wiredSet].sort(), zones }, null, 1) + '\n');

// ---------- masters.json: flip entries whose species is now registered (unwired keep their existing stand-in) ----------
let mastersFlipped = 0;
if (existsSync(P('data/masters.json'))) {
  const m = rd('data/masters.json');
  const fix = (team, who) => team.forEach((t) => {
    if (wiredSet.has(t.species)) { if (t.stand_in || t.battle_species !== t.species) { t.battle_species = t.species; t.stand_in = false; mastersFlipped++; } }
    else standins.masters.push({ who, species: t.species, level: t.level, stand_in: t.battle_species });
  });
  for (const h of m.halls) { fix(h.master.team, `${h.zone} Master ${h.master.id}`); for (const t of h.trainers) fix(t.team, `${h.zone} hall ${t.id}`); }
  if (mastersFlipped) { m._meta.synced_creatures = `tools/sync_creatures.mjs ${stamp}: ${mastersFlipped} team entries now use their own species`; writeFileSync(P('data/masters.json'), JSON.stringify(m, null, 1) + '\n'); }
}
// GD route trainers (design only, not in the runtime yet): log which team species still lack sprites
for (const f of readdirSync(P(GD)).filter((x) => /^trainers_.*\.json$/.test(x))) {
  const d = rd(`${GD}/${f}`);
  for (const t of d.trainers || []) for (const c of t.team || []) if (!wiredSet.has(c.species)) standins.trainers.push({ file: f, who: t.id, species: c.species, level: c.level });
}

const registry = { _meta: { built: stamp, generator: 'tools/sync_creatures.mjs', manifest: MANIFEST, wired: synced.length, total_registered: wiredSet.size,
  manifest_lines: manifest.size, not_in_any_table: notInTables, manifest_errors: manifestErrors, in_encounters: [...wiredIn].filter((x) => !BASE16.includes(x)).sort() },
  species: synced.map((s) => ({ ...s, files: { dir: `${CRE}/${s.id}`, required: requiredFiles(s.id).map((f) => `${CRE}/${s.id}/${f}`), icon: iconFiles(s.id) } })),
  pending, skipped };
writeFileSync(P('data/creatures_synced.json'), JSON.stringify(registry, null, 1) + '\n');
standins._meta.counts = { encounters: standins.encounters.length, masters: standins.masters.length, gd_route_trainers: standins.trainers.length };
writeFileSync(P('data/standins_overnight.json'), JSON.stringify(standins, null, 1) + '\n');

console.log(`sync_creatures ${stamp}: wired ${synced.length} new (+16 = ${wiredSet.size} registered); pending ${pending.length}; skipped ${skipped.length}; manifest lines ${manifest.size}${manifestErrors.length ? ' (' + manifestErrors.length + ' unreadable)' : ''}`);
console.log(`  not in any table: ${notInTables.length}`);
console.log(`  new species in encounter tables: ${registry._meta.in_encounters.length} (${registry._meta.in_encounters.join(', ')})`);
console.log(`  masters.json entries flipped to own species: ${mastersFlipped}; stand-ins left: encounters ${standins.encounters.length}, masters/hall ${standins.masters.length}, GD route trainers ${standins.trainers.length}`);
if (pending.length) console.log('  pending:', pending.map((p) => `${p.id} (${p.reason})`).join('; '));
