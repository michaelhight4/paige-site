// dev/seaport (Oct 30 2026): Gullhaven region maps + the Gullhaven Fishing Derby (src/seaport/).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as D from '../src/seaport/derby.js';
import { attachSeaport } from '../src/seaport/index.js';
import { createCreature, serialise, deserialise } from '../src/systems/creature.js';
import { checkSave } from '../src/overworld/save_schema.js';
const J = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url)));
const MAP = (n) => J(`art/world/overworld/maps/${n}.json`);
const fish = J('data/fishing_tables.json'), enc = J('data/encounters_wired.json'), art = new Set(enc.species_with_art);
const NEW = ['gullhaven', 'gullhaven_lagoon', 'gullhaven_cliffs', 'gullhaven_sea', 'gullhaven_cave_west', 'gullhaven_cave_east'];
const seq = (...a) => { let i = 0; return () => a[i++ % a.length]; };

test('crystals: 10 per run, one per cast, refuse at 0', () => {
  const r = D.newRun('wavelin');
  assert.equal(r.crystals, 10);
  for (let i = 0; i < 10; i++) assert.equal(D.useCrystal(r), true);
  assert.equal(D.useCrystal(r), false); assert.equal(r.crystals, 0);
});
test('weights: inside the species range, heavy rolls rare, 1 dp', () => {
  for (const [sp, [lo, hi]] of Object.entries(D.WEIGHT_RANGES)) for (const r of [0, 0.3, 0.7, 0.999]) {
    const w = D.rollWeight(sp, r); assert.ok(w.kg >= lo && w.kg <= hi, `${sp} ${w.kg}`); assert.equal(Math.round(w.kg * 10) / 10, w.kg);
  }
  assert.equal(D.rollWeight('wavelin', 0).kg, 2); assert.equal(D.rollWeight('wavelin', 1).kg, 9);
  let heavy = 0; for (let i = 0; i < 10000; i++) if (D.rollWeight('hullwhale', i / 10000).frac >= 0.9) heavy++;
  assert.ok(heavy < 600 && heavy > 300, `heavy share ${heavy}`); // ~4.7%
  assert.deepEqual(D.rangeOf('nope'), D.DEFAULT_RANGE);
});
test('score maths: rarity base + size + record + personal best, featured x2', () => {
  assert.deepEqual(D.catchPoints({ species: 'wavelin', rarity: 'common', kg: 2, frac: 0 }), { base: 10, weight: 0, record: 0, pb: 0, featured: false, total: 10 });
  assert.equal(D.catchPoints({ species: 'ribboneel', rarity: 'uncommon', kg: 10, frac: 0.5 }).total, 35);
  assert.equal(D.catchPoints({ species: 'tidemarrow', rarity: 'rare', kg: 85, frac: 1 }).total, 95);
  assert.equal(D.catchPoints({ species: 'tidemarrow', rarity: 'rare', kg: 85, frac: 1 }, { records: { tidemarrow: 80 } }).total, 100);
  assert.equal(D.catchPoints({ species: 'tidemarrow', rarity: 'rare', kg: 85, frac: 1 }, { featured: 'tidemarrow' }).total, 190);
  const run = D.newRun('wavelin');
  D.addCatch(run, { species: 'wavelin', level: 52, rarity: 'common' }, 0);       // 10 x2 = 20
  D.addCatch(run, { species: 'reefshell', level: 52, rarity: 'common' }, 1);     // 10+20+15 = 45
  const s = D.scoreRun(run);
  assert.equal(s.catches, 65); assert.equal(s.count, 4); assert.equal(s.heaviest, 10); assert.equal(s.total, 79); assert.equal(run.score, 79);
  assert.equal(s.largest.species, 'reefshell');
  assert.equal(D.tierFor(79).id, 'bronze'); assert.equal(D.tierFor(59), null); assert.equal(D.tierFor(400).id, 'crest');
});
test('featured species: one per run from the derby water pool', () => {
  const pool = D.derbyPool(fish);
  assert.ok(pool.length >= 5);
  for (const r of [0, 0.25, 0.5, 0.99]) assert.ok(pool.includes(D.pickFeatured(pool, r)));
  assert.equal(D.pickFeatured([], 0.5), null);
  for (const sp of pool) assert.ok(D.WEIGHT_RANGES[sp], `${sp} has a weight range`);
});
test('finishRun: best score, records, last result with featured; forfeit scores 0', () => {
  const run = D.newRun('hullwhale'); D.addCatch(run, { species: 'hullwhale', level: 55, rarity: 'common' }, 0.5);
  const a = D.finishRun(null, run);
  assert.equal(a.record.best, a.result.score); assert.equal(a.record.runs, 1); assert.equal(a.record.last.featured, 'hullwhale');
  assert.ok(a.record.records.hullwhale > 0); assert.equal(a.result.newBest, true);
  const b = D.finishRun(a.record, D.newRun('wavelin'), { forfeit: true });
  assert.equal(b.result.score, 0); assert.equal(b.record.best, a.record.best); assert.equal(b.record.runs, 2); assert.equal(b.result.forfeit, true);
});
test('save round-trip: weight_kg on the creature and derby record pass the schema', () => {
  const c = createCreature({ species: 'wavelin', level: 54 }); c.weight_kg = 7.34;
  const o = serialise(c); assert.equal(o.weight_kg, 7.3);
  assert.equal(deserialise(JSON.parse(JSON.stringify(o))).weight_kg, 7.3);
  assert.equal(deserialise(serialise(createCreature({ species: 'wavelin', level: 5 }))).weight_kg, undefined);
  const run = D.newRun('wavelin'); D.addCatch(run, { species: 'wavelin', level: 52 }, 0.2);
  const rec = D.finishRun(null, run).record;
  const save = { v: 1, flags: [], party: [o], systems: { derby: JSON.parse(JSON.stringify(rec)) } };
  const res = checkSave(JSON.stringify(save)); assert.equal(res.ok, true); assert.deepEqual(res.warnings, []);
  assert.ok(checkSave({ ...save, systems: { derby: { best: 'x' } } }).warnings.length > 0, 'bad derby record is flagged');
  assert.deepEqual(JSON.parse(JSON.stringify(save)).systems.derby, rec);
});
test('placeholder text: keys only, no blocked words', () => {
  const bad = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|Gotcha|nurse|weed|routes?|berry|elites?|gym|throw)\b/i;
  for (const [k, v] of Object.entries(D.TEXT)) for (const l of v) { assert.ok(l.includes('[PLACEHOLDER'), k); assert.ok(!bad.test(l), `${k}: ${l}`); }
});

// --- runtime with a fake scene: area lock, clock lock, catch weigh-in, turn-in ---
function fakeScene(answers = []) {
  const said = [], asked = [], warps = [];
  const party = [];
  const scene = {
    map: { name: D.DERBY_MAP }, player: { x: 15, y: 1, facing: 'up', locked: false }, timescale: 1, fade: null,
    systems: { state: {}, bag: { items: {}, count(i) { return this.items[i] || 0; }, add(i, n) { this.items[i] = (this.items[i] || 0) + n; } }, party: { add: (c) => party.push(c) } },
    say: async (p) => { said.push(...p); }, ask: async (p) => { asked.push(...p); return answers.shift() ?? 1; },
    startWarp: (s, k) => warps.push([s, k]), view: () => ({}), runSpot: async () => 'orig',
  };
  return { scene, said, asked, warps, party };
}
const flush = () => new Promise((r) => setTimeout(r, 5));
test('runtime: desk starts a run, clock held, cast uses crystals, catch scored on the scale, turn-in restores clock', async () => {
  const f = fakeScene([0]);
  const fishingSt = { ready: Promise.resolve(), tables: fish };
  const sp = attachSeaport(f.scene, { rng: seq(0.5), fishing: () => fishingSt, tables: fish });
  const hook = f.scene.talkHooks[0];
  assert.ok(hook.match(D.DERBY_MAP, { derby: 'desk' })); assert.ok(!hook.match('gullhaven', { derby: 'desk' }));
  await hook.run({});
  assert.ok(sp.st.run); assert.equal(f.scene.timescale, 0); assert.equal(fishingSt.derby, sp.api);
  assert.equal(f.scene.systems.state.derby.active.featured, sp.st.run.featured);
  assert.equal(sp.api.active(), true);
  for (let i = 0; i < 3; i++) assert.equal(await sp.api.useCrystal(), true);
  await sp.api.onCatch({ species: 'wavelin', level: 53, rarity: 'common' });
  assert.equal(sp.st.run.haul.length, 1); assert.ok(f.said.some((l) => l.includes('derby.catch')));
  sp.st.run.crystals = 0; f.said.length = 0;
  assert.equal(await sp.api.useCrystal(), false);
  await f.scene.runSpot({ derby: 'scale' });
  assert.equal(sp.st.run, null); assert.equal(f.scene.timescale, 1);
  const R = f.scene.systems.state.derby; assert.equal(R.runs, 1); assert.ok(R.best > 0); assert.ok(R.last.featured);
  assert.equal(f.party.length, 1); assert.ok(f.party[0].weight_kg > 0);
  sp.stop();
});
test('area lock: leaving mid-run asks; No stays, Yes forfeits then warps', async () => {
  const f = fakeScene([0, 1, 0]);
  const sp = attachSeaport(f.scene, { rng: seq(0.1), fishing: () => ({ ready: Promise.resolve(), tables: fish }), tables: fish });
  await f.scene.talkHooks[0].run({});
  f.scene.startWarp({ exit: { to: 'gullhaven' } }, 'edge'); await flush();
  assert.equal(f.warps.length, 0); assert.ok(sp.st.run, 'No keeps the run'); assert.ok(f.asked.some((l) => l.includes('derby.leave_ask')));
  f.scene.startWarp({ map: 'gullhaven', x: 1, y: 1 }, 'door'); await flush();
  assert.equal(f.warps.length, 1); assert.equal(sp.st.run, null); assert.equal(f.scene.systems.state.derby.last.forfeit, true);
  assert.equal(f.scene.timescale, 1);
  f.scene.startWarp({ map: 'gullhaven' }, 'door'); assert.equal(f.warps.length, 2, 'no run: warps pass');
  sp.stop();
});

// --- maps ---
test('maps: exist, sizes match layers, warps/exits target real maps, registered', () => {
  const layout = J('art/world/overworld/world_layout.json');
  for (const n of NEW) {
    const m = MAP(n); assert.equal(m.name, n);
    for (const L of ['ground', 'decoration', 'overlay', 'collision', 'encounter']) { assert.equal(m.layers[L].length, m.height, `${n}.${L}`); for (const r of m.layers[L]) assert.equal(r.length, m.width); }
    for (const w of m.warps) assert.ok(fs.existsSync(new URL(`../art/world/overworld/maps/${w.to}.json`, import.meta.url)) || w.to === '$return', `${n} -> ${w.to}`);
    for (const e of m.exits) assert.ok(fs.existsSync(new URL(`../art/world/overworld/maps/${e.to}.json`, import.meta.url)));
    assert.ok(layout.maps_built.includes(n));
  }
  const tw = MAP('tidewater_coast'); const ex = tw.exits.find((e) => e.to === 'gullhaven_sea');
  assert.ok(ex && ex.edge === 'south');
  for (let x = ex.start; x <= ex.end; x++) assert.equal(tw.layers.collision[tw.height - 1][x], 3, 'channel is water (Tideglide)');
  const sea = MAP('gullhaven_sea'); for (let x = ex.start; x <= ex.end; x++) assert.equal(sea.layers.collision[0][x], 3);
});
test('sea maze: swimmer trainers stand on water with sight lines, levels 54-58 (cap 68)', () => {
  const sea = MAP('gullhaven_sea'); const sw = sea.npcs.filter((n) => n.swimmer);
  assert.ok(sw.length >= 4);
  for (const n of sw) {
    assert.equal(sea.layers.collision[n.y][n.x], 3, n.id); assert.ok(n.sight_range > 0);
    for (const t of n.team) { assert.ok(t.level >= 54 && t.level <= 58 && t.level <= 68); assert.ok(art.has(t.species), t.species); }
  }
  const caves = sea.warps.map((w) => w.to); assert.ok(caves.includes('gullhaven_cave_west') && caves.includes('gullhaven_cave_east'));
});
test('caves: two unique mazes linking the sea to Gullhaven Cliffs; wild levels in band', () => {
  const a = MAP('gullhaven_cave_west'), b = MAP('gullhaven_cave_east');
  assert.notDeepEqual(a.layers.collision, b.layers.collision);
  for (const c of [a, b]) {
    const to = new Set(c.warps.map((w) => w.to)); assert.ok(to.has('gullhaven_sea') && to.has('gullhaven_cliffs'));
    const walk = c.layers.collision.flat().filter((v) => v === 0).length; assert.ok(walk > 150, 'maze has room');
    for (const z of c.encounter_zones) for (const s of enc.zones[z.table].slots) { assert.ok(s.level[0] >= 52 && s.level[1] <= 56); assert.ok(art.has(s.species)); }
  }
  const sea = enc.zones.gullhaven_sea_water; for (const s of sea.slots) assert.ok(s.level[0] >= 52 && s.level[1] <= 56);
});
test('derby lagoon: desk clerk, scale spot, fishing tables, area marked', () => {
  const m = MAP('gullhaven_lagoon');
  assert.ok(m.npcs.find((n) => n.derby === 'desk')); assert.ok(m.interact_spots.find((s) => s.derby === 'scale'));
  assert.ok(m.derby_area); assert.ok(m.layers.collision.flat().includes(3));
  for (const t of ['basic', 'good', 'super']) assert.ok(fish.maps.gullhaven_lagoon[t].slots.length);
  assert.equal(D.leavesArea('gullhaven_lagoon', 'gullhaven'), true); assert.equal(D.leavesArea('gullhaven', 'gullhaven_cliffs'), false);
});
