import test from 'node:test';
import assert from 'node:assert/strict';
import { ron5State, ron5Missed, idCapFlag, R56, WARMTH_GATES } from '../src/region56/index.js';
import { trainerOutcome } from '../src/battle/story.js';
import { ITEMS } from '../src/systems/items.js';
import { Bag } from '../src/systems/bag.js';
const F = (...a) => new Set(a);

test('Ron 5 is optional: a loss closes the fight, no blackout gate', () => {
  const o = trainerOutcome('tidewater_coast', 'tidewater_coast_ron_5', false);
  assert.equal(o.done, true); assert.equal(o.optional, true); assert.ok(!o.blackoutOnLoss);
  assert.ok(o.flags.includes('met_ron_tidewater') && o.flags.includes('has_rons_umbrella'));
  assert.ok(trainerOutcome('tidewater_coast', 'tidewater_coast_ron_5', true).flags.includes('beat_rival_ron_5'));
});
test('Ron 5 talk states: rematch / town until beat_master_tidewater, then parting', () => {
  assert.equal(ron5State(F()), 'first');
  assert.equal(ron5State(F('ron5_declined')), 'rematch');
  assert.equal(ron5State(F('ron5_fought')), 'town');
  assert.equal(ron5State(F('ron5_declined', 'beat_master_tidewater')), 'parting');
  assert.equal(ron5State(F('ron5_fought', 'beat_master_tidewater')), 'gone');
  assert.equal(ron5Missed(F('beat_master_tidewater')), true);
  assert.equal(ron5Missed(F('beat_master_tidewater', 'ron5_missed')), false);
  assert.equal(ron5Missed(F('beat_master_tidewater', 'ron5_fought')), false);
});
test('r56 ids, caps, flags', () => {
  for (const id of ['keycard_r5', 'keycard_r6', 'rons_umbrella', 'old_river_drawing', 'reed_lamp']) assert.equal(ITEMS[id]?.pocket, 'key');
  assert.equal(idCapFlag(14), 'id_cap_r5'); assert.equal(idCapFlag(16), 'id_cap_r6'); assert.equal(idCapFlag(12), null);
  assert.ok(R56.flags.includes('ron5_missed')); assert.ok(WARMTH_GATES.length >= 7);
});
test('old saves: berry item ids load as plum ids', () => {
  const b = new Bag({ mossberry_shake: 2, pond_berry_juice: 1 });
  assert.equal(b.count('mossplum_shake'), 2); assert.equal(b.count('pond_plum_juice'), 1);
});
