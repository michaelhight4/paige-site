// Merit points, merit shop stock, garden crops, plot placement and the blocked-word scan (Coder, Oct 30 2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { MERIT_PTS, MERIT_FIXED, DAILY_POOL, DAILY_COUNT, meritFor, awardMerit, meritState, dailyStock, buyMerit, meritPriceOf } from '../src/sports/merit.js';
import { CROPS, PLOTS, gardenState, plant, water, harvest, stageOf, plotState } from '../src/garden/garden.js';
import { GS } from '../src/garden/strings.js';
import { plotPixels } from '../src/garden/index.js';
import { Bag } from '../src/systems/bag.js';
import { ITEMS } from '../src/systems/items.js';
import { settle, sportsState } from '../src/sports/tournament.js';
import { settleCup } from '../src/sports/town_cup.js';
import { GameMap } from '../src/overworld/map.js';

const bag = () => new Bag({});

test('merit points by place for tourney / cup / major; 5th+ gets 0; saved in sports state', () => {
  for (const k of Object.keys(MERIT_PTS)) { assert.ok(meritFor(k, 1) > meritFor(k, 2)); assert.equal(meritFor(k, 5), 0); }
  const sys = {}, ss = sportsState(sys);
  settle({ place: 2, time: 10, wallet: null, state: ss });
  assert.equal(meritState(ss).points, MERIT_PTS.tourney[1]);
  const r = settleCup({ ev: { id: 'tug' }, score: 999, rivals: [{ score: 1 }], wallet: null, sstate: ss });
  assert.equal(r.place, 1); assert.equal(r.merit, MERIT_PTS.cup[0]);
  assert.equal(JSON.parse(JSON.stringify(sys)).sports.merit.points, MERIT_PTS.tourney[1] + MERIT_PTS.cup[0]);
});

test('daily shelf: fixed count, distinct, stable within a day, rotates across days; fixed stock always there', () => {
  const seen = new Set();
  for (let d = 0; d < 30; d++) {
    const a = dailyStock(d); assert.equal(a.length, DAILY_COUNT); assert.equal(new Set(a.map((x) => x.id)).size, DAILY_COUNT);
    assert.deepEqual(a, dailyStock(d)); seen.add(a.map((x) => x.id).join());
  }
  assert.ok(seen.size > 5);
  for (const x of [...MERIT_FIXED, ...DAILY_POOL]) assert.ok(ITEMS[x.id], x.id + ' is an item');
  assert.ok(MERIT_FIXED.some((x) => x.id === 'watering_can') && MERIT_FIXED.some((x) => x.id === 'watering_can_merit'));
});

test('buyMerit: spends points, refuses when short, one of each can', () => {
  const ss = {}, b = bag(); meritState(ss).points = 350;
  assert.equal(buyMerit(ss, b, 'watering_can_merit', 1, 0).ok, true); assert.equal(meritState(ss).points, 50);
  assert.equal(buyMerit(ss, b, 'watering_can_merit', 1, 0).reason, 'owned');
  assert.equal(buyMerit(ss, b, 'watering_can', 2, 0).reason, 'short');
  assert.equal(buyMerit(ss, b, 'carrot_seeds', 3, 0).ok, true); assert.equal(b.count('carrot_seeds'), 3);
  const notToday = DAILY_POOL.find((x) => !dailyStock(0).some((y) => y.id === x.id));
  assert.equal(meritPriceOf(notToday.id, 0), null); assert.equal(buyMerit(ss, b, notToday.id, 1, 0).reason, 'not_stocked');
});

test('garden: grows one stage per watered day, unwatered days stall, harvest gives crop items', () => {
  const g = gardenState({}), b = bag(); b.add('carrot_seeds', 1); b.add('watering_can', 1);
  assert.equal(plant(g, 'home_1', 'carrot_seeds', 10, b).ok, true); assert.equal(b.count('carrot_seeds'), 0);
  assert.equal(stageOf(plotState(g, 'home_1', 10)), 'seed');
  assert.equal(water(g, 'home_1', 10, b).ok, true); assert.equal(water(g, 'home_1', 10, b).reason, 'done');
  assert.equal(plotState(g, 'home_1', 12).growth, 1); // day 11 not watered: still 1
  for (let d = 12; d < 14; d++) water(g, 'home_1', d, b);
  assert.equal(stageOf(plotState(g, 'home_1', 14)), 'ready');
  assert.equal(water(g, 'home_1', 14, b).reason, 'ready');
  const h = harvest(g, 'home_1', 14, b); assert.equal(h.ok, true);
  assert.ok(b.count('carrot') >= CROPS.carrot.yield[0] && b.count('carrot') <= CROPS.carrot.yield[1]);
  assert.equal(stageOf(plotState(g, 'home_1', 14)), 'empty');
});

test('merit can: crop is ready the next day', () => {
  const g = gardenState({}), b = bag(); b.add('pumpkin_seeds', 1); b.add('watering_can_merit', 1);
  plant(g, 'fernwick_1', 'pumpkin_seeds', 3, b);
  assert.equal(water(g, 'fernwick_1', 3, b).can, 'watering_can_merit');
  assert.equal(stageOf(plotState(g, 'fernwick_1', 3)), 'seed');
  assert.equal(stageOf(plotState(g, 'fernwick_1', 4)), 'ready');
  const b2 = bag(); b2.add('radish_seeds', 1); plant(g, 'fernwick_2', 'radish_seeds', 4, b2);
  assert.equal(water(g, 'fernwick_2', 4, b2).reason, 'no_can');
});

test('every plot sits on a walkable, warp-free, NPC-free cell; sprites exist for all stages', () => {
  const DIR = new URL('../art/world/overworld/maps/', import.meta.url);
  const J = Object.fromEntries(readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => { const j = JSON.parse(readFileSync(new URL(f, DIR))); return [j.name, j]; }));
  for (const p of PLOTS) {
    const j = J[p.map]; assert.ok(j, p.map); const m = new GameMap(structuredClone(j));
    assert.ok(m.isWalkable(p.x, p.y), `${p.id} walkable`);
    assert.ok(!(j.warps || []).some((w) => w.x === p.x && w.y === p.y), `${p.id} not a warp`);
    assert.ok(!(j.npcs || []).some((n) => n.x === p.x && n.y === p.y), `${p.id} not an NPC`);
  }
  assert.ok(PLOTS.some((p) => p.home));
  for (const s of ['empty', 'seed', 'sprout', 'growing', 'ready']) assert.ok(plotPixels(s, 'carrot', false).length > 0);
});

test('blocked words: none in merit shop / garden text, item names or the Text Bot request file', () => {
  const BAD = /\bPP\b|shiny|super effective|pok[eé]dex|pok[eé] ?ball|gotcha!|\bnurse|\bweeds?\b|\broutes?\b|\bberr(y|ies)\b|\belites?\b|\bgyms?\b/i;
  const ids = [...MERIT_FIXED, ...DAILY_POOL].map((x) => x.id).concat(Object.keys(CROPS));
  const texts = [...Object.values(GS), ...ids.map((id) => ITEMS[id].name), readFileSync(new URL('../data/textbot_requests_merit_shop.md', import.meta.url), 'utf8')];
  for (const t of texts) assert.ok(!BAD.test(t), 'blocked word in: ' + t.slice(0, 80));
});
