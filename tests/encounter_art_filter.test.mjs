// #62 load-time art filter (Coder, Oct 23 2026): drop no-art species, re-weight, empty zones/phases give no encounter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterEncounters, EncounterRoller, pickSlot } from '../src/battle/encounters.js';

const art = new Set(['peeplark', 'mosskit']);
const has = (id) => art.has(id);
const table = () => ({ zones: {
  mixed: { rate: 0.2, slots: [{ species: 'peeplark', weight: 30, level: [2, 4] }, { species: 'noart_a', weight: 50, level: [2, 4] }, { species: 'mosskit', weight: 20, level: [3, 5], time: ['night'] }] },
  allgone: { rate: 0.2, slots: [{ species: 'noart_a', weight: 60, level: [5, 8] }, { species: 'noart_b', weight: 40, level: [5, 8] }] },
} });

test('art filter: drops no-art slots, keeps the source data, re-weights to the zone total', () => {
  const src = table(), before = JSON.stringify(src);
  const f = filterEncounters(src, has);
  assert.equal(JSON.stringify(src), before, 'source table untouched');
  assert.deepEqual(f.dropped, { mixed: 1, allgone: 2 });
  const z = f.data.zones.mixed;
  assert.deepEqual(z.slots.map((s) => s.species), ['peeplark', 'mosskit']);
  assert.equal(z.slots.reduce((t, s) => t + s.weight, 0), 100);
  assert.equal(z.slots[0].weight / z.slots[1].weight, 30 / 20, 'ratios kept');
  assert.deepEqual(z.slots_no_art.map((s) => s.species), ['noart_a'], 'dropped slots kept for reference');
  for (let i = 0; i < 50; i++) assert.notEqual(pickSlot(z, { phase: 'night' }, Math.random)?.species, 'noart_a');
});

test('art filter: a zone with no species left gives no encounter and no crash', () => {
  const f = filterEncounters(table(), has);
  assert.deepEqual(f.empty, ['allgone']);
  assert.equal(pickSlot(f.data.zones.allgone, { phase: 'day' }, () => 0.5), null);
  const ro = new EncounterRoller(f.data, { rate: 0.2, rng: () => 0, graceSteps: 0 }); // rng 0 = every step hits the rate roll
  const rects = [{ table: 'allgone', x0: 0, y0: 0, x1: 10, y1: 10 }];
  for (let i = 0; i < 20; i++) assert.equal(ro.step('m', rects, 1 + (i % 3), 1, 1, { phase: 'day' }), null);
  const ok = new EncounterRoller(f.data, { rate: 0.2, rng: () => 0, graceSteps: 0 }); // same roller still hits on a zone with art
  assert.equal(ok.step('m', [{ table: 'mixed', x0: 0, y0: 0, x1: 10, y1: 10 }], 1, 1, 1, { phase: 'day' })?.species, 'peeplark');
});

test('art filter: a time of day with no species left gives no encounter there', () => {
  const t = { zones: { z: { rate: 0.2, slots: [{ species: 'peeplark', weight: 10, level: [2, 3], time: ['day'] }, { species: 'noart_a', weight: 10, level: [2, 3], time: ['night'] }] } } };
  const f = filterEncounters(t, has);
  assert.deepEqual(f.emptyPhases, { z: ['night'] });
  assert.equal(pickSlot(f.data.zones.z, { phase: 'night' }, () => 0.1), null);
  assert.equal(pickSlot(f.data.zones.z, { phase: 'day' }, () => 0.1)?.species, 'peeplark');
});

test('art filter: nothing to drop leaves the table as is', () => {
  const t = { zones: { z: { slots: [{ species: 'peeplark', weight: 7, level: [2, 3] }] } } };
  const f = filterEncounters(t, has);
  assert.deepEqual(f.dropped, {}); assert.deepEqual(f.empty, []);
  assert.equal(f.data.zones.z.slots[0].weight, 7);
});
