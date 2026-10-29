// Fishing v1 + terrain encounters (Coder, Oct 29 2026). Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const J = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const L = await import('../src/fishing/logic.js');
const T = await import('../src/battle/terrain_encounters.js');
const E = await import('../src/battle/encounters.js');
const { fishingFlags, FISHING_DEFAULTS } = await import('../src/fishing/flags.js');
const { Col } = await import('../src/overworld/constants.js');
const fish = J('data/fishing_tables.json'), terr = J('data/terrain_encounters.json'), enc = J('data/encounters_wired.json');
const seq = (...a) => { let i = 0; return () => a[i++ % a.length]; };
const BLOCKED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] ?Ball|nurse|weed|route|berry|throw)\b/i;

test('flags: both off by default, query turns them on', () => {
  assert.deepEqual(FISHING_DEFAULTS, { fishing: false, terrain: false });
  assert.deepEqual(fishingFlags(new URLSearchParams('')), { fishing: false, terrain: false });
  assert.deepEqual(fishingFlags(new URLSearchParams('fishing=1&terrainenc=1')), { fishing: true, terrain: true });
});

test('rod tiers: best rod in the bag; none -> null', () => {
  assert.equal(L.bestRod({}), null);
  assert.equal(L.bestRod({ fishing_rod: 1 }).id, 'basic');
  assert.equal(L.bestRod({ has: (id) => id === 'fishing_rod' || id === 'fishing_rod_super' }).id, 'super');
});

test('facedWater: generic water-edge rule (any walk/pier cell facing code 3 or 11)', () => {
  const grid = { '1,0': Col.WATER, '2,1': Col.DEEP_WATER };
  const map = { inBounds: (x, y) => x >= 0 && y >= 0 && x < 4 && y < 4, code: (x, y) => grid[x + ',' + y] ?? 0, signs: [], npcAt: () => null };
  assert.deepEqual(L.facedWater(map, 1, 1, 'up'), { x: 1, y: 0 });
  assert.deepEqual(L.facedWater(map, 1, 1, 'right'), { x: 2, y: 1 });
  assert.equal(L.facedWater(map, 1, 1, 'down'), null);
  assert.equal(L.facedWater({ ...map, npcAt: () => ({}) }, 1, 1, 'up'), null);
  assert.equal(L.facedWater(map, 1, 0, 'up'), null); // out of bounds
});

test('tables: every fishing species is a water species and exists in the wired tables; tier fallback', () => {
  const all = new Set(Object.values(enc.zones).flatMap((z) => z.slots.map((s) => s.species)));
  const water = new Set(fish.water_species);
  for (const [m, t] of Object.entries(fish.maps)) for (const s of t.basic.slots) {
    assert.ok(water.has(s.species), `${m}: ${s.species} not a water species`);
    assert.ok(all.has(s.species), `${m}: ${s.species} unknown`);
  }
  assert.ok(Object.keys(fish.maps).length >= 15);
  const good = L.ROD_TIERS[1];
  assert.equal(L.tableFor(fish, 'brookhollow', good).tier, 'basic'); // good rod falls back to the filled basic table
  assert.equal(L.tableFor(fish, 'nowhere', good), null);
});

test('planCast + judgePress: early / hooked / late / nothing', () => {
  const rod = L.ROD_TIERS[0];
  const p = L.planCast(fish, 'brookhollow', rod, seq(0.5, 0.1, 0.3, 0.2));
  assert.equal(p.bite, true); assert.ok(p.fish?.species);
  assert.ok(p.waitMs >= L.TIMING.WAIT_MIN && p.waitMs <= L.TIMING.WAIT_MAX);
  assert.equal(L.judgePress(p, p.waitMs - 10, true), 'early');
  assert.equal(L.judgePress(p, p.waitMs + 100, true), 'hooked');
  assert.equal(L.judgePress(p, p.waitMs + L.TIMING.WINDOW + 1, false), 'late');
  assert.equal(L.judgePress(p, p.waitMs + 10, false), null);
  assert.equal(L.judgePress(p, p.waitMs + L.TIMING.WINDOW + 100, true, true), 'hooked'); // touch window is a bit wider
  const miss = L.planCast(fish, 'brookhollow', rod, seq(0.5, 0.99));
  assert.equal(miss.bite, false); assert.equal(miss.fish, null);
  assert.equal(L.planCast(fish, 'nowhere', rod, seq(0.5)).empty, true);
});

test('pickFish honours the art filter and level ranges', () => {
  const tab = { slots: [{ species: 'a', weight: 5, level: [3, 5] }, { species: 'b', weight: 5, level: 7 }] };
  for (let i = 0; i < 50; i++) { const f = L.pickFish(tab); assert.ok(f.species === 'b' ? f.level === 7 : f.level >= 3 && f.level <= 5); }
  assert.equal(L.pickFish(tab, Math.random, (id) => id === 'b').species, 'b');
  assert.equal(L.pickFish(tab, Math.random, () => false), null);
});

test('placeholder text: no blocked words; easing endpoints', () => {
  for (const [k, pages] of Object.entries(L.TEXT)) for (const p of pages) assert.ok(!BLOCKED.test(p), `${k}: ${p}`);
  for (const f of Object.values(L.ease)) { assert.ok(Math.abs(f(0)) < 1e-9); assert.ok(Math.abs(f(1) - 1) < 1e-9); }
});

test('terrain: water and cave rates are 0.3x the map grass rate', () => {
  assert.equal(terr.rate_mult, 0.3);
  const g = T.grassRateFor(enc, 'route1');
  const z = T.terrainZone(terr, enc, 'route1', 'water');
  assert.ok(Math.abs(z.zone.rate - g * 0.3) < 1e-9);
  const c = T.terrainZone(terr, enc, 'greystone_b1', 'cave');
  assert.ok(c && Math.abs(c.zone.rate - T.grassRateFor(enc, 'greystone_b1', terr.grass_rate) * 0.3) < 1e-9);
  const water = new Set(fish.water_species);
  for (const t of Object.values(terr.water)) for (const s of t.slots) assert.ok(water.has(s.species), s.species);
});

test('terrain roller: cave floor outside rects rolls only with the flag; surf steps only with the flag', () => {
  const always = () => 0; // rng 0: every roll hits
  const off = new E.EncounterRoller(enc, { rng: always, graceSteps: 0 });
  assert.equal(off.step('greystone_b1', [], 999, 999, 2), null);
  assert.equal(off.stepWater('route1', 1, 1), null);
  const on = new E.EncounterRoller(enc, { rng: always, graceSteps: 0, terrain: terr });
  const h = on.step('greystone_b1', [], 999, 999, 2);
  assert.ok(h && /^terrain_cave:/.test(h.table));
  const w = on.stepWater('route1', 1, 1);
  assert.ok(w && /^terrain_water:/.test(w.table) && fish.water_species.includes(w.species));
  // a near-miss roll (just above 0.3x) never hits terrain
  const r = T.terrainZone(terr, enc, 'route1', 'water').zone.rate;
  const near = new E.EncounterRoller(enc, { rng: () => r + 1e-6, graceSteps: 0, terrain: terr });
  assert.equal(near.stepWater('route1', 1, 1), null);
  assert.equal(on.step('greystone_b1', [], 999, 999, 0), null); // plain floor: nothing
});

test('bite prompt: bound key on PC, A on pad, Tap A on touch', () => {
  assert.equal(L.biteKeyName('the F key'), 'F');
  assert.equal(L.biteKeyName(null), 'Space');
  assert.deepEqual(L.bitePrompt({ device: 'keyboard', confirmLabel: 'the F key' }), { textKey: 'fishing.prompt_pc', key: 'F', icon: 'F' });
  assert.equal(L.bitePrompt({}).key, 'Space');
  assert.equal(L.bitePrompt({ device: 'controller' }).textKey, 'fishing.prompt_pad');
  assert.equal(L.bitePrompt({ touch: true, device: 'keyboard' }).textKey, 'fishing.prompt_touch');
  assert.match(L.TEXT['fishing.prompt_pc'][0], /\{key\}/);
});
