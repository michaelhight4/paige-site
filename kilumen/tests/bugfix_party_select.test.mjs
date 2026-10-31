// gd bug 4: Party Select (town events / sports venue pickers) listed only the creatures that could still play, so the team looked
// short, and the tug crew was never marked. pickRows lists the whole party, greys out-cold members, marks the pick + crew.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickRows } from '../src/sports/pick_rows.js?v=v0.2.105-alpha';

test('pickRows lists the whole party with party-slot indices, out cold and selection marked', () => {
  const a = { species: 'rillop', hp: 20 }, b = { species: 'cindrip', hp: 0 }, c = { species: 'jestrix', hp: 5 }, d = { species: 'mossip' };
  const rows = pickRows([a, null, b, c, d], { sel: c, crew: [c, a] });
  assert.deepEqual(rows.map((r) => r.i), [0, 2, 3, 4]);
  assert.deepEqual(rows.map((r) => r.out), [false, true, false, false]);
  assert.deepEqual(rows.map((r) => r.sel), [false, false, true, false]);
  assert.deepEqual(rows.map((r) => r.crew), [true, false, true, false]);
});

test('pickers render pickRows over scene.party, not the filtered team', () => {
  const town = readFileSync(new URL('../src/sports/town_ui.js', import.meta.url), 'utf8');
  const venue = readFileSync(new URL('../src/sports/index.js', import.meta.url), 'utf8');
  assert.equal((town.match(/pickRows\(scene\.party/g) || []).length, 2);
  assert.match(venue, /pickRows\(scene\.party\)/);
  assert.doesNotMatch(town + venue, /mons\.map\(\(c, i\) => `<div class="mon/);
});
