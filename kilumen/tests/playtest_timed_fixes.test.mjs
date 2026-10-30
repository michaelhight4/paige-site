// Timed playtest fixes (Oct 30 2026, /workspace/playtest_25x/timed_log.md on 5baa2f5e). One regression test (or more) per bug.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const { HallV2 } = await import(path.join(root, 'src/progression/puzzles.js'));
const HV = await import(path.join(root, 'src/progression/hall_v2.js'));
const { GameMap } = await import(path.join(root, 'src/overworld/map.js'));
const byId = new Map();
for (const f of ['tileset.json', 'tileset_ix2.json', 'tileset_hallanim.json', 'tileset_hallart.json']) for (const t of J(`art/world/overworld/${f}`).tiles) byId.set(t.id, t);
const lines = J('text/overworld_lines.json');
const mapJson = (n) => J(`art/world/overworld/maps/${n}.json`);

function hallScene(name, store) {
  const map = new GameMap(mapJson(name)); map.attachTileset(byId);
  const seen = {};
  const sc = {
    map, flags: new Set(), seen, counters: {}, lines, ms: 0, rustles: new Map(), busy: false,
    player: { x: map.json.hall_v2.arrival[0], y: map.json.hall_v2.arrival[1], facing: 'up', locked: false },
    systems: { wallet: { coins: 0, spend() { return false; }, add(n) { return n; } } },
    npcs: { byId: () => null, beginTalk() {}, endTalk() {}, walkTo() {} }, setFlag(f) { this.flags.add(f); },
    script: async (fn) => fn(), say: async () => {}, ask: async () => 0, speakerFor: () => null, _entryFor: () => ({}),
    lockSave: () => () => {}, hooks: {}, worldApi: () => ({ onArrive: () => undefined, onStepStart: () => undefined }),
  };
  const hv = HV.attachHallV2(sc, null, { store });
  return { sc, hv, map };
}

// ---- bug 2: hall puzzle state persists through the door (blackout / reload) -------------------------------------------
test('bug 2: Revival prism door stays open when you come back in through the door (saved prism turns kept)', () => {
  const m = mapJson('revival_hall_int'), h = m.hall_v2, g = new HallV2(h.grid, HV.hallTrainers(m).map((n) => [n.x, n.y]), h.prism);
  let b = 0; for (const [i, want] of [[0, 2], [1, 1], [2, 0], [3, 1]]) { const pr = h.prism.prisms[i]; while (g.facing(i, b) !== want) b = g.turn(...pr.at, b); }
  assert.equal(g.beamOpen(b), true);
  const store = { masters: {}, puzzles: { v2_revival_heights: { bits: b } } };
  const { hv, map } = hallScene('revival_hall_int', store); // player stands on the arrival cell = came in through the door
  assert.equal(hv.cur.bits, b, 'solved prisms survive re-entry');
  const [[lx, ly]] = h.prism.door; assert.equal(map.layers.collision[ly][lx], 0, 'prism door (11,14) open');
  assert.equal(store.puzzles.v2_revival_heights.bits, b, 'still in the save');
});
test('bug 2: Mirefen / Tidewater gate bits survive the door when the dais is still reachable; a stranding state resets', () => {
  for (const [name, z] of [['mirefen_hall_int', 'mirefen'], ['tidewater_hall_int', 'tidewater_coast']]) {
    const m = mapJson(name), g = new HallV2(m.hall_v2.grid, HV.hallTrainers(m).map((n) => [n.x, n.y]), m.hall_v2.prism);
    for (const b of [1, 2, 3]) {
      const store = { masters: {}, puzzles: { [`v2_${z}`]: { bits: b } } };
      const { hv } = hallScene(name, store);
      assert.equal(hv.cur.bits, g.finishableFrom(b) ? b : 0, `${name} bits ${b}`);
    }
  }
});

// ---- bug 3: Mirefen quest completable, Tideglide + storm granted, tracker points at the main path ------------------------
const { storyOpens } = await import(path.join(root, 'src/progression/halls.js'));
const { QuestBook, QFLAG } = await import(path.join(root, 'src/progression/quests.js'));
const { pickLine } = await import(path.join(root, 'src/overworld/lines.js'));
test('bug 3: mirefen_bog has the angler + camp; their lines set the mq_mirefen step flags', () => {
  const m = mapJson('mirefen_bog'), L = lines.maps.mirefen_bog;
  const a = m.npcs.find((n) => n.id === 'mirefen_angler'); assert.ok(a, 'angler placed');
  assert.equal(m.layers.collision[a.y][a.x], 0);
  const camp = m.interact_spots.find((s) => s.id === 'camp_mirefen'); assert.ok(camp);
  assert.equal(m.layers.collision[camp.stand[1]][camp.stand[0]], 0, 'camp stand walkable');
  const flags = new Set(['beat_master_frostspire', QFLAG.on('mq_mirefen')]);
  const l1 = pickLine(L.mirefen_angler, flags, {}, 'k'); assert.deepEqual(l1.sets, ['has_field_notebook']);
  flags.add('has_field_notebook'); assert.notDeepEqual(pickLine(L.mirefen_angler, flags, {}, 'k').sets, ['has_field_notebook']);
  assert.equal(pickLine(L.camp_mirefen, flags, {}, 'k').id, 'default', 'cold camp -> prompt');
  flags.add('camp_restored_mirefen'); assert.deepEqual(pickLine(L.camp_mirefen, flags, {}, 'k').sets, ['read_log_mirefen']);
  flags.add('read_log_mirefen'); assert.equal(pickLine(L.camp_mirefen, flags, {}, 'k').id, 'camp_restored', 'no re-prompt after');
});
test('bug 3: a Mirefen Master win opens storm_season + has_tideglide, so the tracker moves to The Tidewater main quest (not Bin Day)', () => {
  const data = J('data/quests.json'), qb = new QuestBook(data);
  const flags = new Set(['flg_promoted', 'got_starter', 'has_run_shoes', 'has_bike', ...['fernwick', 'saltmere', 'revival', 'frostspire', 'mirefen'].map((z) => `beat_master_${z}`)]);
  for (const f of storyOpens(flags)) flags.add(f);
  assert.ok(flags.has('storm_season') && flags.has('has_tideglide'));
  assert.deepEqual(storyOpens(flags), [], 'idempotent');
  for (let i = 0; i < 4; i++) for (const a of qb.update({ flags, map: 'mirefen', x: 0, y: 0 })) { if (a.type === 'start') flags.add(QFLAG.on(a.q.id)); if (a.type === 'complete') flags.add(QFLAG.done(a.q.id)); }
  assert.equal(qb.tracked(flags)?.id, 'mq_tidewater');
  assert.deepEqual(storyOpens(new Set(['beat_master_frostspire'])), [], 'nothing before the Mirefen win');
});

// ---- bug 5: Head Office 5/7 never advanced (gate_revival_checkpoint_open is set by nothing) ----------------------------
test('bug 5: Head Office s6 completes on Revival Heights after the coin; every main-quest step flag is settable or flagless', () => {
  const data = J('data/quests.json'), qb = new QuestBook(data), q = qb.byId.get('mq_revival_heights');
  const flags = new Set(['beat_master_saltmere', 'gate_thornwood_east_cleared', 'beat_rival_ron_3', 'ron_layoff_letter', 'beat_master_revival', QFLAG.on(q.id)]);
  qb.state.steps[q.id] = ['mq_revival_heights_s2'];
  assert.equal(qb.current(q, flags).id, 'mq_revival_heights_s6');
  qb.update({ flags, map: 'revival_heights', x: 10, y: 10 });
  assert.equal(qb.current(q, flags).id, 'mq_revival_heights_s7', 'moves on to the rail pass');
  assert.equal(qb.progress(q, flags).done, 6);
  flags.add('beat_master_frostspire'); assert.equal(qb.status(q, flags), 'done', 'coin 4 never leaves it on the HUD');
  assert.ok(!JSON.stringify(data).includes('"flag": "gate_revival_checkpoint_open"') && !JSON.stringify(data).includes('"flag":"gate_revival_checkpoint_open"'));
});

// ---- bug 8: the Brookhollow gate guard never ran talk(), so the Survey Parcel was never handed over ---------------------
const { Overworld } = await import(path.join(root, 'src/overworld/overworld.js'));
const { giftFor } = await import(path.join(root, 'src/systems/npc_gifts.js'));
test('bug 8: after the Fernwick coin, interacting with rt_guard_east talks (parcel gift) instead of the gate toast', () => {
  const json = structuredClone(mapJson('brookhollow')), map = new GameMap(json); map.attachTileset(byId);
  const def = json.npcs.find((n) => n.id === 'rt_guard_east');
  const run = (flags) => {
    const calls = [];
    const self = { busy: false, map, spots: [], player: { x: def.x, y: def.y + 1, facing: 'up' }, flags,
      toast: (t) => calls.push(['toast', t]), talk: (o, d) => calls.push(['talk', d.id]), gateText: () => 'gate', _entryFor: () => ({ pages: ['x'] }) };
    map.npcAt = (x, y) => (x === def.x && y === def.y ? { def } : null);
    map.gateCleared = (g) => flags.has(g.flag);
    Overworld.prototype.interact.call(self);
    return calls[0];
  };
  assert.deepEqual(run(new Set()), ['toast', 'gate'], 'before the coin: the gate line');
  assert.deepEqual(run(new Set(['beat_master_fernwick'])), ['talk', 'rt_guard_east'], 'after: a real talk');
  assert.equal(giftFor('brookhollow', 'rt_guard_east', new Set(['beat_master_fernwick'])), 'parcel');
});

// ---- bug 9: dev Travel to mirefen_bog landed in the sealed hatch pocket (32,18) ----------------------------------------------
const { devLandingSpot } = await import(path.join(root, 'src/dev/landing.js'));
test('bug 9: dev Travel landing never picks a sealed pocket (mirefen_bog 32,18)', () => {
  const map = new GameMap(structuredClone(mapJson('mirefen_bog'))); map.attachTileset(byId);
  const at = devLandingSpot(map, null, 'mirefen_bog');
  assert.ok(at, 'a landing');
  assert.notDeepEqual([at.x, at.y], [32, 18]);
  assert.ok(map.isWalkable(at.x, at.y));
});

// ---- bug 7: town Ron spawned at tidewater_coast 24,31, on the hall door's step row ------------------------------------------
const { townRonCell } = await import(path.join(root, 'src/overworld/ron_whereabouts.js'));
test('bug 7: the spawned town Ron never stands on the hall door row (tidewater_coast)', () => {
  const map = new GameMap(structuredClone(mapJson('tidewater_coast'))); map.attachTileset(byId);
  map.npcAt = () => null;
  const door = map.json.warps.find((w) => w.to === 'tidewater_hall_int');
  const c = townRonCell({ map, player: { x: 5, y: 5 } });
  assert.ok(c);
  assert.notDeepEqual([c.x, c.y], [24, 31]);
  assert.notEqual(c.y, door.y + 1, 'not on the door step row');
  assert.notEqual(c.x, door.x, 'not in front of the door');
});

// ---- bug 6: beaten trainers never hard-block a route; the Saltmere practice coach is off the road --------------------------
test('bug 6: bumping a beaten overworld trainer trades places (route1 trainer_r1_c at 46,16)', () => {
  const map = new GameMap(structuredClone(mapJson('route1'))); map.attachTileset(byId);
  const def = map.json.npcs.find((n) => n.id === 'trainer_r1_c');
  const placed = [];
  const n = { def, mover: { place: (x, y, f) => placed.push(['npc', x, y, f]) } };
  map.occupy(def.x, def.y, n);
  const player = { x: def.x - 1, y: def.y, place(x, y, f) { this.x = x; this.y = y; placed.push(['p', x, y, f]); } };
  const self = { player, map, busy: false, seen: {}, log: [], tick: 0 };
  assert.equal(Overworld.prototype._beatenSwap.call(self, 'right'), false, 'unbeaten: still blocks');
  self.seen[`defeated:route1.${def.id}`] = true;
  assert.equal(Overworld.prototype._beatenSwap.call(self, 'right'), true);
  assert.deepEqual([player.x, player.y], [def.x, def.y]);
  assert.equal(map.npcAt(def.x - 1, def.y), n);
});
test('bug 6: saltmere practice coach no longer stands on the north-south road (29,21)', () => {
  const m = mapJson('saltmere'), c = m.npcs.find((n) => n.id === 'saltmere_practice_coach');
  assert.notDeepEqual([c.x, c.y], [29, 21]);
  assert.equal(m.layers.collision[c.y][c.x], 0);
});
