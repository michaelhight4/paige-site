// Aurelith Arena playtest pass (Oct 30 2026): gates follow run progress, lobby coin check, Dev Travel lands at the
// entrance with the room playable, HUD counts rooms, rest point, room 3/5/7 twists, no WIP notice once Aurelith is built.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameMap } from '../src/overworld/map.js';
import { ARENA, ARENA_TEAMS, runFlags, runFlagsAt, secondBeaten, arenaHook, fighterState } from '../src/region78/arena.js';
import { arenaProgress, isArenaMap } from '../src/region78/arena_progress.js';
import { wipDue, aurelithBuilt } from '../src/systems/wip_notice.js';

const MAPS = 'art/world/overworld/maps/';
const load = (m) => JSON.parse(fs.readFileSync(MAPS + m + '.json', 'utf8'));
const TS = [...JSON.parse(fs.readFileSync('art/world/overworld/tileset.json', 'utf8')).tiles, ...JSON.parse(fs.readFileSync('art/world/overworld/tileset_arena.json', 'utf8')).tiles];
const byId = new Map(TS.map((t) => [t.id, t]));
const gm = (name) => { const m = new GameMap(load(name)); m.attachTileset(byId); return m; };

test('room gates are resettable: open on a win, close again when a lost run clears the flag (cached map)', () => {
  const m = gm(ARENA.room(1)), flags = new Set();
  m.applyGates(flags); assert.ok(!m.isWalkable(1, 4) && !m.isWalkable(15, 4), 'closed at the start');
  flags.add(ARENA.wonFlag(1)); m.applyGates(flags); assert.ok(m.isWalkable(1, 4) && m.isWalkable(15, 4), 'open after the win');
  flags.delete(ARENA.wonFlag(1)); m.applyGates(flags);
  assert.ok(!m.isWalkable(1, 4) && !m.isWalkable(15, 4), 'closed again after the loss');
  assert.equal(m.layers.decoration[4][1], m.tileByName('gate_hall_closed').id, 'closed art back');
  for (let n = 1; n < 8; n++) assert.ok(load(ARENA.room(n)).story_gates.every((g) => g.resettable), `room ${n}`);
});

test('non-resettable gates still never re-block', () => {
  const m = gm('aurelith_stadium_int'), flags = new Set(['all_badges']);
  m.applyGates(flags); assert.ok(m.isWalkable(8, 3)); flags.clear(); m.applyGates(flags); assert.ok(m.isWalkable(8, 3));
});

test('lobby: coin check at the stairs (all_badges), same lines as the stadium doors', () => {
  const j = load(ARENA.map), g = j.story_gates.find((x) => x.id === 'gate_aurelith_lobby');
  assert.equal(g.flag, 'all_badges'); assert.equal(g.lines.before, 'blockers.gate_aurelith_arena.before');
  const m = gm(ARENA.map); m.applyGates(new Set());
  assert.ok(!m.isWalkable(8, 3) && !m.isWalkable(9, 3), 'stairs blocked without the coins');
  m.applyGates(new Set(['all_badges'])); assert.ok(m.isWalkable(8, 3) && m.isWalkable(9, 3));
});

test('Dev Travel: rooms land at the entrance mat cell; run flags make room N the one to fight', () => {
  for (let n = 1; n <= 8; n++) {
    const j = load(ARENA.room(n)); assert.deepEqual([j.fly_point.x, j.fly_point.y], [7, 13], `room ${n}`);
    assert.ok(j.warps.some((w) => w.x === 7 && w.y === 14), 'mat below the landing');
    const fl = new Set(runFlagsAt(n));
    assert.equal(fighterState(fl, n), n === 1 ? 'start' : 'fight', `room ${n} playable`);
    if (n > 1) assert.equal(fighterState(fl, n - 1), 'beaten');
  }
});

test('quest HUD: Arena maps count rooms won this run, all 8 after a clear', () => {
  assert.equal(arenaProgress(new Set(), 'aurelith'), null);
  assert.ok(isArenaMap('aurelith_arena') && isArenaMap('aurelith_arena_room_4') && !isArenaMap('aurelith_stadium_int'));
  assert.deepEqual(arenaProgress(new Set(['arena_run', 'arena_room_1_won', 'arena_room_2_won']), 'aurelith_arena_room_3'), { done: 2, total: 8, room: 3 });
  assert.equal(arenaProgress(new Set(['arena_cleared']), 'aurelith_arena').done, 8);
  assert.equal(arenaProgress(new Set(['arena_cleared', 'arena_run']), 'aurelith_arena_room_1').done, 0, 'a new run counts from 0');
});

const sceneFor = (flags, seen = {}) => {
  const said = [], healed = [];
  const scene = { lines: {}, flags, seen, setFlag(fl, on = true) { on ? this.flags.add(fl) : this.flags.delete(fl); },
    say: async (p) => said.push(...p), hooks: { onBattle: async () => true }, party: [1], systems: { party: { list: [1], healAll: () => healed.push(1) } } };
  return { scene, said, healed };
};

test('rest point (room 5): one free full heal per run, reset with the run', async () => {
  const j = load(ARENA.room(5)), r = j.npcs.find((x) => x.id === ARENA.rest.id);
  assert.ok(r && r.y === 13, 'by the entrance');
  const { scene, healed } = sceneFor(new Set(runFlagsAt(5))), h = arenaHook(scene);
  assert.ok(h.match(ARENA.room(5), { id: ARENA.rest.id }));
  await h.run({ def: { id: ARENA.rest.id } }); await h.run({ def: { id: ARENA.rest.id } });
  assert.equal(healed.length, 1); assert.ok(runFlags().includes(ARENA.rest.usedFlag));
});

test('room 3 plates: puzzle closes Zephra in until both plates are down', () => {
  const p = load(ARENA.room(3)).puzzle;
  assert.equal(p.switches.filter((s) => s.type === 'plate').length, 2);
  const cells = new Set(p.gates.map((g) => `${g.x},${g.y}`));
  for (const c of ['7,6', '9,6', '8,7']) assert.ok(cells.has(c), c);
  const m = gm(ARENA.room(3)); for (const s of p.switches) assert.ok(m.isWalkable(s.x, s.y), 'plates walkable');
});

test('room 5 floor hazard: grass zone on the middle lane, side lanes stay clear', () => {
  const j = load(ARENA.room(5)), z = j.encounter_zones[0];
  assert.ok(z.x0 === 6 && z.x1 === 10 && z.table);
  for (let y = 6; y <= 13; y++) assert.equal(j.layers.collision[y][1], 0, 'side lane walkable');
});

test('room 7 mini-trainer: has a team, sight down the lane, Oriel waits for them', async () => {
  const j = load(ARENA.room(7)), s = j.npcs.find((x) => x.id === ARENA.second.id);
  assert.equal(s.kind, 'trainer'); assert.ok(ARENA_TEAMS[`${ARENA.room(7)}.${ARENA.second.id}`].length === 3);
  assert.ok(!secondBeaten(7, {}) && secondBeaten(6, {}) && secondBeaten(7, { [`defeated:${ARENA.room(7)}.${ARENA.second.id}`]: true }));
  const { scene, said } = sceneFor(new Set(runFlagsAt(7))), h = arenaHook(scene); let fought = false;
  scene.hooks.onBattle = async () => { fought = true; return true; };
  await h.run({ def: { id: ARENA.fighters[6].id } });
  assert.ok(!fought && said.length, 'no fight before the second');
});

test('WIP notice is off once Aurelith is built', () => {
  assert.ok(aurelithBuilt({ map: { name: 'aurelith_arena' } }));
  assert.equal(wipDue({ flags: new Set(['beat_master_cindervale']), map: { name: 'aurelith_arena' }, layout: { maps_built: ['aurelith'] } }), false);
});
