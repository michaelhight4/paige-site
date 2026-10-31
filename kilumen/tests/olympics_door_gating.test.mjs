// Hotfix v0.2.102 (Gary pt2571u): each town's competition opens after that town's tournament (hall) is won once;
// the 8-coin gate (all_badges) covers only the Aurelith Arena (elite fighters), never the Games.
import test from 'node:test'; import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EVENTS } from '../src/sports/town_events.js';
import { canEnterCup, cupHallFlag, isCupDay } from '../src/sports/town_cup.js';
import { HALL_ORDER } from '../src/systems/hall_order.js';
import { TS } from '../src/sports/town_strings.js';
const map = (n) => JSON.parse(readFileSync(new URL(`../art/world/overworld/maps/${n}.json`, import.meta.url)));

test('town cup is locked until that town hall is won, then opens', () => {
  for (const ev of EVENTS) {
    let d = 0; while (!isCupDay(ev, d)) d++;
    const f = cupHallFlag(ev); assert.ok(HALL_ORDER.includes(f.replace('beat_master_', '')), f);
    assert.equal(canEnterCup({ ev, day: d, coins: 999, sstate: {}, flags: new Set() }).reason, 'hall');
    assert.equal(canEnterCup({ ev, day: d, coins: 999, sstate: {}, flags: new Set(['all_badges']) }).reason, 'hall', 'coins are not the key');
    assert.ok(canEnterCup({ ev, day: d, coins: 999, sstate: {}, flags: new Set([f]) }).ok);
  }
  assert.match(TS.cup_hall_locked, /\{town\}/);
});
test('the all_badges gate covers only the Arena doors, not the Games announcer', () => {
  const m = map('aurelith_stadium_int'), g = m.story_gates.filter((x) => x.flag === 'all_badges');
  assert.equal(g.length, 1); const cells = g[0].cells.map((c) => `${c.x},${c.y}`);
  const ann = m.npcs.find((n) => n.id === 'aurelith_games_announcer'); assert.ok(ann && !cells.includes(`${ann.x},${ann.y}`));
  for (const w of m.warps.filter((w) => w.to === 'aurelith_arena')) assert.ok(cells.includes(`${w.x},${w.y + 1}`));
  const src = readFileSync(new URL('../src/sports/major.js', import.meta.url), 'utf8'); assert.doesNotMatch(src, /all_badges|coinCount/);
});
