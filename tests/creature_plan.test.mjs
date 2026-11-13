// Creature plan + encounter generator (tools/build_creature_plan.mjs, tools/gen_encounters.mjs). Plan data only, nothing loads it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const inv = rd('data/creature_inventory.json').species;
const pulls = rd('data/region_pulls.json');
const gen = rd('data/encounters_generated.json');
const trainers = rd('data/trainer_pulls.json');
const build = rd('data/creature_data_firsthalf.json');
const needed = rd('data/needed_first_half.json');
const dex = Object.fromEntries(rd('design/DEX_450.json').creatures.map((c) => [c.id, c]));
const { SPECIES, PLACEHOLDER_SKILLS } = await import(join(ROOT, 'src/ui/data.js'));
const REG = new Set(SPECIES.map((s) => s.id));
const { TIER_WEIGHT } = await import(join(ROOT, 'tools/creature_plan/plan_lib.mjs'));
const artExists = (sp) => REG.has(sp); // SPECIES only lists species with finished art (sync rule)
const minL = (sp) => inv[sp].min_level || 1;

test('inventory covers every DEX species once, with a tier and weight', () => {
  assert.equal(Object.keys(inv).length, Object.keys(dex).length);
  for (const [id, c] of Object.entries(inv)) {
    assert.ok(dex[id], id);
    assert.ok(['common', 'uncommon', 'rare', 'very rare'].includes(c.tier), id);
    assert.equal(c.weight, TIER_WEIGHT[c.tier], id);
    assert.equal(c.art, REG.has(id), `${id} art flag`);
  }
  assert.ok(TIER_WEIGHT.common > TIER_WEIGHT.uncommon && TIER_WEIGHT.uncommon > TIER_WEIGHT.rare && TIER_WEIGHT.rare > TIER_WEIGHT['very rare']);
});

test('species reuse: one entry per id, zone entries carry their own level and weight', () => {
  for (const [id, c] of Object.entries(inv)) for (const z of c.zones) {
    assert.ok(Array.isArray(z.level) && z.level[0] <= z.level[1], `${id} ${z.zone}`);
    assert.ok(z.weight > 0, `${id} ${z.zone}`);
  }
  assert.equal(new Set(build.order).size, build.order.length, 'build list counts each species once');
  const ids = [...needed.region1_through_master1, ...needed.region2_extra_through_master2].map((x) => x.species);
  assert.equal(new Set(ids).size, ids.length, 'needed list counts each species once');
});

test('generated tables: only zones with no table, built species, weights sum, levels in band', () => {
  const wired = rd('data/encounters_wired.json').zones; const live = rd('art/world/overworld/encounters/encounters.json').zones;
  const noTable = new Set(pulls.regions.flatMap((r) => r.zones.filter((z) => z.status === 'no_table').map((z) => z.id)));
  assert.ok(Object.keys(gen.zones).length > 0);
  for (const [id, z] of Object.entries(gen.zones)) {
    assert.ok(noTable.has(id), `${id} must be a zone with no table`);
    assert.ok(!wired[id] && !live[id], `${id} collides with an existing table`);
    for (const k of ['method', 'rate', 'slots', 'source', 'band']) assert.ok(k in z, `${id}.${k}`);
    assert.equal(z.slots.reduce((a, s) => a + s.weight, 0), z.weight_total, `${id} weights`);
    const region = pulls.regions.find((r) => r.id === z.region);
    for (const s of z.slots) {
      assert.ok(dex[s.species] && REG.has(s.species) && artExists(s.species), `${id} ${s.species} built`);
      assert.ok(s.level[0] >= z.band[0] && s.level[1] <= z.band[1], `${id} ${s.species} in zone band`);
      assert.ok(s.level[0] >= region.band.wild[0] && s.level[1] <= region.band.wild[1], `${id} ${s.species} in region band`);
      assert.ok(s.level[0] >= minL(s.species), `${id} ${s.species} below evolution level`);
      assert.ok(s.weight > 0);
    }
  }
});

test('existing tables are not changed by the generator (no generated id is an existing zone)', () => {
  for (const r of pulls.regions) for (const z of r.zones) if (z.status !== 'no_table') assert.ok(!gen.zones[z.id], z.id);
});

test('plan pools: species exist, inside the zone band, no evolved form below its evolution level', () => {
  for (const r of pulls.regions) for (const z of r.zones) for (const s of z.plan_pool) {
    assert.ok(dex[s.species], s.species);
    assert.ok(s.level[0] >= z.band[0] && s.level[1] <= z.band[1], `${z.id} ${s.species}`);
    assert.ok(s.level[0] >= minL(s.species), `${z.id} ${s.species} below evolution level ${minL(s.species)}`);
  }
});

test('trainer pulls: existing teams recorded as-is, filled teams are built, in band, not under-levelled', () => {
  for (const t of trainers.trainers) {
    if (!t.status.startsWith('filled')) continue;
    assert.equal(t.guess, true, t.key);
    const band = trainers._meta.trainer_bands[t.region];
    for (const m of t.active.team) {
      assert.ok(REG.has(m.species) && artExists(m.species), `${t.key} ${m.species}`);
      assert.ok(m.level >= band[0] && m.level <= band[1], `${t.key} ${m.species} L${m.level}`);
      assert.ok(m.level >= minL(m.species), `${t.key} ${m.species} below evolution level`);
    }
  }
});

test('built creature data: DEX evolution levels, valid skill ids, original ids only', async () => {
  const { toID } = await import(join(ROOT, 'src/battle/data/skills.js'));
  const known = new Set(Object.values(PLACEHOLDER_SKILLS).flat().map(([n]) => toID(n)));
  for (const sp of build.order) {
    const b = build.species[sp]; const c = dex[sp];
    assert.ok(c, sp);
    assert.equal(b.prevo, c.evolution?.evolves_from || null, `${sp} prevo`);
    const m = String(c.evolution?.method || '').match(/level (\d+)/);
    if (m) assert.equal(b.evoLevel, +m[1], `${sp} evoLevel`);
    for (const k of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) assert.ok(b.baseStats[k] > 0, `${sp} ${k}`);
    for (const l of b.learnset) assert.ok(known.has(l.skill), `${sp} skill ${l.skill}`);
  }
  for (const x of needed.no_art_for_art_bot) assert.ok(!REG.has(x.species), x.species);
});

test('deterministic: a fresh run of the generator matches the files on disk', () => {
  const out = execFileSync(process.execPath, [join(ROOT, 'tools/gen_encounters.mjs'), '--check'], { encoding: 'utf8' });
  assert.match(out, /up to date/);
});
