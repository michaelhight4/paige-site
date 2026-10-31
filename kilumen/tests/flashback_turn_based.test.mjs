// Flashback lab techs (fin_past_wlab_01..10) and Ondravel always fight turn-based, even with the Options mode on Real-time
// (Gary, Oct 30 2026: lab tech battles ran real-time). Other trainers keep following the player's mode.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { forceTurnBased, trainerBattleMode, RTB_KEY } from '../src/rtb/flag.js';
import { WLAB_MAPS, WLAB_TRAINERS, FLASHBACK } from '../src/region9/index.js';

const mem = new Map();
globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) };
const scene = (map) => ({ map: { name: map }, flags: new Set() });

test('lab tech battles start turn-based with the real-time option on', () => {
  mem.set(RTB_KEY, 'rt');
  WLAB_MAPS.forEach((map, i) => {
    for (const id of WLAB_TRAINERS[i]) {
      assert.equal(trainerBattleMode(scene(map), null, { map, id }), 'turn', `${map}.${id}`);
      assert.equal(trainerBattleMode(scene(map), null, { id }), 'turn', `${map}.${id} (no who.map)`);
    }
  });
  assert.equal(trainerBattleMode(scene(FLASHBACK.guardianMap), null, { map: FLASHBACK.guardianMap, id: 'phase_1', forceTurnBased: true }), 'turn');
});

test('ordinary trainers still follow the player mode', () => {
  mem.set(RTB_KEY, 'rt');
  assert.equal(trainerBattleMode(scene('route_1'), null, { map: 'route_1', id: 't1' }), 'rt');
  mem.set(RTB_KEY, 'turn');
  assert.equal(trainerBattleMode(scene('route_1'), null, { map: 'route_1', id: 't1' }), 'turn');
  assert.equal(forceTurnBased({ map: 'fin_past_wlab_03_control' }), true);
  assert.equal(forceTurnBased({ map: 'route_1' }), false);
});

test('the trainer hook and region 9 story fights use the forced mode', () => {
  const ui = readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /hooks\.onBattle = \(who\) => \(trainerBattleMode\(scene, q, who\) === 'rt'/);
  const r9 = readFileSync(new URL('../src/region9/index.js', import.meta.url), 'utf8');
  assert.match(r9, /onBattle\(\{ map, id, forceTurnBased: true \}\)/);
  assert.match(r9, /onBattle\(\{ map: R9\.guardianMap, id: R9\.phases\[i\], forceTurnBased: true \}\)/);
});
