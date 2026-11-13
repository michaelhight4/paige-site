// Ron's whereabouts between Masters (v0.2.49, Gary 8:54 AM CT Oct 29 2026): home after each Master win, in the next town
// on the punch list from the moment the player arrives until that Master is beaten, never in any other town.
// Run: node --test tests/ron_whereabouts.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { scene, enter, pump, idle } from './story_harness.mjs';
import { HOME, OPEN } from '../src/overworld/intro.js';
import { isRonNpc } from '../src/overworld/story_ron.js';
import { RON_PUNCH_LIST, ronTarget, ronAway, ronAllowedOn, ronInFlag, ronHeardFlag, RON_TOWN_ID, RON_HOME_PLACEHOLDER } from '../src/overworld/ron_whereabouts.js';
import { RON_RIVALS, TRAINER_RESULTS } from '../src/battle/story.js';

const DONE = (n) => RON_PUNCH_LIST.slice(0, n).map((p) => p.flag);
const BASE = [HOME.started, HOME.briefed, OPEN.promoted, OPEN.starter, OPEN.briefed, 'got_starter'];
const rons = (s) => s.npcs.list.filter((n) => isRonNpc(n) && n.id !== 'ron_story');
const TOWNS_WITH_MAP_RON = { fernwick: 'ron_rival_1', saltmere: 'saltmere_ron_2', revival_heights: 'revival_heights_ron_3', lanternport: 'lanternport_ron_5', aurelith: 'aurelith_ron_6' };

test('punch list: next target follows the Master flags; Aurelith last; route Ron only while his town is next', () => {
  assert.equal(ronTarget(new Set()).zone, 'fernwick');
  assert.equal(ronTarget(new Set(DONE(1))).zone, 'saltmere');
  assert.equal(ronTarget(new Set(DONE(3))).zone, 'frostspire');
  assert.equal(ronTarget(new Set(DONE(8))).zone, 'aurelith');
  assert.equal(ronTarget(new Set(DONE(9))), null);
  assert.equal(ronAllowedOn(new Set(DONE(1)), 'saltmere'), true);
  assert.equal(ronAllowedOn(new Set(DONE(1)), 'fernwick'), false, 'beaten town: never');
  assert.equal(ronAllowedOn(new Set(DONE(1)), 'lanternport'), false, 'future town: never');
  assert.equal(ronAllowedOn(new Set(DONE(3)), 'frostspire_pass'), true);
  assert.equal(ronAllowedOn(new Set([...DONE(3), 'beat_rival_ron_4']), 'frostspire_pass'), false);
  assert.equal(ronAllowedOn(new Set(DONE(4)), 'frostspire_pass'), false);
  assert.equal(ronAllowedOn(new Set(), 'office_int'), null, 'other maps: untouched');
  assert.equal(ronAway(new Set(DONE(1))), false);
  assert.equal(ronAway(new Set([...DONE(1), ronInFlag('saltmere')])), true);
  assert.equal(ronAway(new Set([...DONE(2), ronInFlag('saltmere')])), false, 'Master beaten: home again');
});

test('every town at every progress point: Ron only in the next town; map rival battles stay wired', async () => {
  for (const k of Object.keys(RON_RIVALS)) assert.ok(TRAINER_RESULTS[k]?.win?.length, `rival battle ${k} still wired`);
  for (let done = 0; done <= 9; done++) {
    const target = RON_PUNCH_LIST[done];
    for (const p of RON_PUNCH_LIST) {
      const { s } = await scene({ map: p.town, flags: [...BASE, ...DONE(done)], at: { x: 22, y: 31, facing: 'up' }, party: ['nibbin'] });
      await pump(s, 3);
      const here = rons(s);
      if (target && target.town === p.town) {
        assert.equal(here.length, 1, `${p.town} @${done}: Ron here`);
        if (TOWNS_WITH_MAP_RON[p.town]) assert.equal(here[0].id, TOWNS_WITH_MAP_RON[p.town], 'his rival-battle NPC, not a copy');
        else assert.equal(here[0].id, RON_TOWN_ID);
        assert.ok(s.flags.has(ronInFlag(p.zone)), 'arrival marks him out of the house');
      } else assert.equal(here.length, 0, `${p.town} @${done}: no Ron`);
    }
  }
});

test('home: Ron home before the next town, gone while he is there, home again with a reaction after the win', async () => {
  const { s, said } = await scene({ map: 'house_1f', flags: [...BASE, ...DONE(1)], at: { x: 9, y: 7, facing: 'up' }, party: ['nibbin'] });
  s.systems.onTalk = async () => false; // harness systems stub: no heal counter / shop
  await pump(s, 3);
  const h = s.npcs.byId('ron');
  assert.ok(h, 'home after Master 1');
  s.talk(h, h.def); await idle(s);
  assert.deepEqual(said.at(-1).pages, RON_HOME_PLACEHOLDER.fernwick.map((t) => s.fill([t])[0]), 'reacts to the Fernwick win');
  assert.ok(s.flags.has(ronHeardFlag('fernwick')));
  s.talk(h, h.def); await idle(s);
  assert.notDeepEqual(said.at(-1).pages, said.at(-2).pages, 'second talk: his normal lines');
  await enter(s, 'saltmere', { x: 22, y: 31 }); await pump(s, 3);
  assert.equal(rons(s).map((n) => n.id).join(), 'saltmere_ron_2');
  await enter(s, 'house_1f', { x: 9, y: 7 }); await pump(s, 3);
  assert.equal(s.npcs.byId('ron'), null, 'out in Saltmere, not home');
  s.setFlag('beat_master_saltmere');
  await enter(s, 'saltmere', { x: 22, y: 31 }); await pump(s, 3);
  assert.equal(rons(s).length, 0, 'Saltmere beaten: gone from Saltmere');
  await enter(s, 'house_1f', { x: 9, y: 7 }); await pump(s, 3);
  const h2 = s.npcs.byId('ron');
  assert.ok(h2, 'home again');
  s.talk(h2, h2.def); await idle(s);
  assert.equal(said.at(-1).sp?.name, 'Ron');
  assert.ok(s.flags.has(ronHeardFlag('saltmere')));
});

test('spawned town Ron stands by the hall door and talks', async () => {
  const { s, said } = await scene({ map: 'mirefen', flags: [...BASE, ...DONE(4)], at: { x: 22, y: 31, facing: 'up' }, party: ['nibbin'] });
  await pump(s, 3);
  const n = s.npcs.byId(RON_TOWN_ID);
  assert.ok(n);
  const door = s.map.warps.find((w) => /_hall_int$/.test(w.to));
  assert.ok(Math.abs(n.x - door.x) + Math.abs(n.y - door.y) <= 6, 'near the hall');
  assert.equal(s.map.code(n.x, n.y), 0, 'on walkable floor');
  s.talk(n, n.def); await idle(s);
  assert.equal(said.at(-1).sp?.name, 'Ron');
});

test('old save without got_starter but past Master 2: same rule', async () => {
  const { s } = await scene({ map: 'saltmere', flags: DONE(2), at: { x: 22, y: 31 }, party: ['nibbin'] });
  await pump(s, 3);
  assert.equal(rons(s).length, 0);
  await enter(s, 'revival_heights', { x: 22, y: 31 }); await pump(s, 3);
  assert.equal(rons(s).map((n) => n.id).join(), 'revival_heights_ron_3');
});
