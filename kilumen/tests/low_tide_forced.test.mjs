import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LOW_TIDE, lowTideDue, syncLowTide, boatLeaveDue } from '../src/progression/low_tide.js';
import { GameMap } from '../src/overworld/map.js';

const S = (...a) => new Set(a);
const M = 'art/world/overworld/maps/';

test('low tide is due exactly when the Tidewater Master is beaten (and not yet set)', () => {
  assert.equal(lowTideDue(S()), false);
  assert.equal(lowTideDue(S('beat_master_tidewater')), true);
  assert.equal(lowTideDue(S('beat_master_tidewater', LOW_TIDE.flag)), false);
});

test('old save backfill: syncLowTide sets the flag via setFlag once', () => {
  const calls = []; const flags = S('beat_master_tidewater');
  const scene = { flags, setFlag: (f) => { calls.push(f); flags.add(f); } };
  assert.equal(syncLowTide(scene), true); assert.equal(syncLowTide(scene), false);
  assert.deepEqual(calls, [LOW_TIDE.flag]);
  assert.equal(syncLowTide({ flags: S() }), false);
});

test('overworld wires the flag at the Master win and on load', () => {
  const src = fs.readFileSync('src/overworld/overworld.js', 'utf8');
  assert.match(src, /flag === 'beat_master_tidewater'\) syncLowTide\(this\)/);
  assert.match(src, /syncLowTide\(this\); \/\/ G6: old saves/);
  assert.match(fs.readFileSync('src/region56/index.js', 'utf8'), /boatLeaveDue\(/);
});

test('lab gate needs the key card AND the forced low tide', () => {
  const j = JSON.parse(fs.readFileSync(M + 'tidewater_cave_int.json', 'utf8'));
  const g = j.story_gates.find((x) => x.id === 'gate_tidewater_cave_lab');
  assert.deepEqual(g.also, [LOW_TIDE.flag]);
  const fake = { story_gates: [{ id: 'g', flag: 'a', also: ['b'], cells: [{ x: 0, y: 0 }] }] };
  const m = Object.assign(Object.create(GameMap.prototype), { storyGates: fake.story_gates, _appliedGates: new Set(), layers: { collision: [[1]] }, width: 1, height: 1 });
  assert.deepEqual(m.applyGates(S('a')), []);
  assert.deepEqual(m.applyGates(S('a', 'b')), ['g']);
  assert.equal(m.layers.collision[0][0], 0);
});

test('boat leave plays once, at the cove only, after the forced low tide', () => {
  const at = { x: 43, y: 32 };
  assert.equal(boatLeaveDue(S(), 'tidewater_coast', at), false);
  assert.equal(boatLeaveDue(S(LOW_TIDE.flag), 'tidewater_coast', at), true); // left the lab (lands at the mouth)
  assert.equal(boatLeaveDue(S(LOW_TIDE.flag), 'tidewater_coast', { x: 40, y: 30 }), true); // back at the cove, lab skipped
  assert.equal(boatLeaveDue(S(LOW_TIDE.flag), 'tidewater_coast', { x: 22, y: 31 }), false); // hall door: not the cove
  assert.equal(boatLeaveDue(S(LOW_TIDE.flag), 'lab_tidewater_cave', at), false);
  assert.equal(boatLeaveDue(S(LOW_TIDE.flag, LOW_TIDE.done), 'tidewater_coast', at), false);
});

test('boat leave text exists', () => {
  const t = JSON.parse(fs.readFileSync('text/overworld_lines.json', 'utf8'));
  assert.ok(t.system_story_r56[LOW_TIDE.key].pages.length >= 1);
});
