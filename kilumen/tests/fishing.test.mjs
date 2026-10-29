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
const D = await import("../src/ui/data.js");
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
  assert.equal(L.tableFor(fish, 'brookhollow', good).tier, 'good'); // gear v1: every map has a filled good table
  assert.equal(L.tableFor({ maps: { x: { basic: { slots: [{ species: 'rillop', weight: 1 }] } } } }, 'x', good).tier, 'basic'); // empty tier falls back
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
  // surf (terrain water) tables are not fishing-rod tables; the water-only rule is tested on fishing_tables.json below
  for (const t of Object.values(terr.water)) for (const s of t.slots) assert.ok(D.SPECIES.some((x) => x.id === s.species), s.species);
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

// ---------------- Gear v1 (design/FISHING_GEAR.md) + water-only rule (Gary, Oct 29 2026) ----------------
const TIERS = ['basic', 'good', 'super'];
const elGame = (sp) => D.speciesById(sp).el; // game data (hand-written + synced species)
const shops = J('src/systems/data/shops.json');
const { ITEMS } = await import('../src/systems/items.js');

test('water-only: every species in every table (basic/good/super, all maps) is water type in the game data', () => {
  const bad = [];
  for (const [m, t] of Object.entries(fish.maps)) for (const k of TIERS) for (const s of t[k]?.slots || []) {
    if (!elGame(s.species).includes('water')) bad.push(`${m}.${k}:${s.species}`);
    if (!(fish.species_el?.[s.species] || []).includes('water')) bad.push(`${m}.${k}:${s.species} (species_el)`);
  }
  assert.deepEqual(bad, []);
  assert.equal(fish.water_only, true);
});

test('every fishing map has non-empty basic, good and super tables with rarity tags', () => {
  for (const [m, t] of Object.entries(fish.maps)) for (const k of TIERS) {
    assert.ok(t[k]?.slots?.length, `${m}.${k} empty`);
    for (const s of t[k].slots) assert.match(s.rarity, /^(common|uncommon|rare)$/, `${m}.${k}.${s.species}`);
  }
});

test('water-only runtime filter: pickFish never returns a non-water species', () => {
  const el = (sp) => (sp === 'emberpup' ? ['fire'] : ['water']);
  const table = { slots: [{ species: 'emberpup', weight: 1000, min: 5, max: 5 }, { species: 'rillop', weight: 1, min: 5, max: 5 }] };
  for (const r of [0, 0.1, 0.5, 0.99]) assert.equal(L.pickFish(table, () => r, null, null, el).species, 'rillop');
  assert.equal(L.pickFish({ slots: [table.slots[0]] }, () => 0.5, null, null, el), null);
  // unknown element data fails closed
  assert.equal(L.pickFish({ slots: [{ species: 'mystery', weight: 1, min: 1, max: 1 }] }, () => 0.5, null, null, () => undefined), null);
  // planCast always filters by the table's species_el
  const tabs = { ...fish, species_el: { ...fish.species_el, reefshell: ['earth'] } };
  for (let i = 0; i < 40; i++) { const p = L.planCast(tabs, 'lanternport', L.ROD_TIERS[2], seq(0.01, i / 40, 0.5, 0.5), null, null); if (p.fish) assert.notEqual(p.fish.species, 'reefshell'); }
});

test('maths: bite clamp and multipliers; element baits only boost water species', () => {
  assert.equal(L.biteChance(fish, L.ROD_TIERS[2], 'ripple_grub'), 0.95);
  assert.equal(L.biteChance(fish, L.ROD_TIERS[0], 'deepgut_paste'), 0.65);
  assert.equal(L.biteChance(fish, L.ROD_TIERS[0], null), 0.7);
  const nymph = L.baitOf(fish, 'reed_nymph'), glim = L.baitOf(fish, 'glimmer_worm');
  assert.equal(L.effectiveWeight({ species: 'a', weight: 10, rarity: 'common' }, nymph, () => ['water', 'freshwater']), 20);
  assert.equal(L.effectiveWeight({ species: 'a', weight: 10, rarity: 'common' }, nymph, () => ['freshwater']), 10); // not water: no element boost
  assert.equal(L.effectiveWeight({ species: 'a', weight: 10, rarity: 'rare' }, glim, () => ['water']), 20);
  for (const [id, b] of Object.entries(fish.baits)) if (b.element) assert.ok(['freshwater', 'sea', 'water'].includes(b.element), id);
  assert.equal(fish.baits.lantern_moth.element, undefined); // reworked: no light boost
});

test('sim numbers: Lanternport expected catches per 100 casts (design §6)', () => {
  const r = (rod, bait) => { const e = L.expectedPer100(fish, 'lanternport', L.ROD_TIERS.find((x) => x.id === rod), bait); return [Math.round(e.bites), +e.common.toFixed(1), +e.uncommon.toFixed(1), +e.rare.toFixed(2)]; };
  assert.deepEqual(r('basic', null), [70, 48.3, 20.1, 1.61]);
  assert.deepEqual(r('good', null), [80, 53.0, 19.3, 7.71]);
  assert.deepEqual(r('super', null), [90, 41.4, 36.2, 12.41]);
  assert.deepEqual(r('super', 'glimmer_worm'), [95, 38.4, 33.6, 23.03]);
  assert.deepEqual(r('super', 'hollowstar_roe'), [95, 34.2, 30.0, 30.81]);
  assert.deepEqual(r('good', 'lantern_moth'), [85, 45.4, 33.0, 6.60]);
  // rare rises with each rod tier, no bait
  const rare = ['basic', 'good', 'super'].map((x) => r(x, null)[3]); assert.ok(rare[0] < rare[1] && rare[1] < rare[2]);
});

test('shops: bait prices as planned; Driftline/Lanternreach rods and earned baits never sold', () => {
  const P = shops.basePrices;
  assert.deepEqual([P.ripple_grub, P.reed_nymph, P.brine_fleck, P.glimmer_worm, P.deepgut_paste], [40, 80, 80, 150, 400]);
  const stocked = JSON.stringify(shops.regions);
  for (const id of ['fishing_rod_good', 'fishing_rod_super', 'lantern_moth', 'hollowstar_roe']) { assert.equal(P[id], undefined, id); assert.ok(!stocked.includes(`"${id}"`), id); }
  for (const id of L.BAIT_IDS) { assert.ok(ITEMS[id]?.bait, id); assert.ok(fish.baits[id], id); }
  assert.equal(ITEMS.fishing_rod_good.rod, 'good'); assert.equal(ITEMS.fishing_rod_super.rod, 'super');
});

test('gifts: Saltmere fisher -> Driftline, keeper -> Lanternreach + moths, then roe / moth refills', () => {
  const bag = (o) => ({ has: (id) => (o[id] || 0) > 0, count: (id) => o[id] || 0 });
  const G = L.ROD_GIFTS.good, S = L.ROD_GIFTS.super;
  assert.equal(L.gearGiftFor(G.map, G.npc, new Set(), bag({})), null); // needs the Brookhollow rod first
  assert.equal(L.gearGiftFor(G.map, G.npc, new Set(), bag({ fishing_rod: 1 }))?.kind, 'good_hint');
  assert.equal(L.gearGiftFor(G.map, G.npc, new Set(['fish_hooked']), bag({ fishing_rod: 1 }))?.kind, 'good');
  assert.equal(L.gearGiftFor(S.map, S.npc, new Set(), bag({})), null);
  assert.equal(L.gearGiftFor(S.map, S.npc, new Set(['got_rod_good']), bag({}))?.kind, 'super_hint');
  assert.equal(L.gearGiftFor(S.map, S.npc, new Set(['got_rod_good', 'moorcoil_seen_3']), bag({}))?.kind, 'super');
  assert.equal(L.gearGiftFor(S.map, S.npc, new Set(['got_rod_good', 'hooked_moorcoil']), bag({}))?.kind, 'super');
  assert.equal(L.gearGiftFor(S.map, S.npc, new Set(['got_rod_good', 'got_rod_super']), bag({}))?.kind, 'moth');
  assert.equal(L.gearGiftFor(S.map, S.npc, new Set(['got_rod_good', 'got_rod_super']), bag({ lantern_moth: 1 })), null);
  const roe = L.gearGiftFor(G.map, G.npc, new Set(['got_rod_good', 'fished_moorcoil']), bag({ fishing_rod: 1 }));
  assert.equal(roe?.kind, 'roe'); assert.equal(roe.species, 'moorcoil');
  assert.equal(L.gearGiftFor(G.map, G.npc, new Set(['got_rod_good', 'fished_moorcoil', 'roe_moorcoil']), bag({ fishing_rod: 1 })), null);
  assert.equal(L.gearGiftFor('brookhollow', G.npc, new Set(), bag({ fishing_rod: 1 })), null);
});

test('gear text keys exist, placeholder only, no blocked words; no "tonic" label', () => {
  for (const k of ['rare_bite', 'bait_title', 'bait_none', 'bait_out', 'good_giver_pages', 'good_received', 'super_giver_pages', 'super_received', 'moth_gift', 'roe_gift'])
    assert.ok(L.TEXT['fishing.' + k]?.length, k);
  const all = JSON.stringify(L.TEXT) + JSON.stringify(Object.fromEntries(Object.entries(ITEMS).filter(([, v]) => v.bait || v.rod)));
  assert.ok(!BLOCKED.test(all)); assert.ok(!/tonic/i.test(all));
});
