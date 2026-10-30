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
