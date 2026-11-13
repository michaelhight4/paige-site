// v0.2.61 (Gary): Caps Lock runs from a WILD real-time fight at once; nothing in trainer fights; hold Esc still leaves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { actionFor, ALL_CODES, capsFlipped } from '../src/rtb/keys.js';
import { RtBattle } from '../src/rtb/sim.js';
import { createCreature } from '../src/systems/creature.js';
const seeded = (s = 7) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const arena = { x0: 0, y0: 0, x1: 800, y1: 500 };
const mk = (o = {}) => new RtBattle({ party: [createCreature({ species: 'cindrip', level: 12 })], foes: [{ species: 'tumbloam', level: 4 }], start: { x: 300, y: 250 }, arena, rng: seeded(), ...o });
const ev = (on) => ({ getModifierState: (k) => k === 'CapsLock' && on });
test('CapsLock maps to flee; Escape still leave; no code bound twice', () => {
  assert.deepEqual(actionFor('CapsLock'), { type: 'flee' });
  assert.deepEqual(actionFor('Escape'), { type: 'leave' });
  assert.equal(new Set(ALL_CODES).size, ALL_CODES.length);
});
test('Caps Lock state change (getModifierState) counts as a press; first read and no-change do not', () => {
  assert.equal(capsFlipped(ev(true), null).flip, false);
  assert.equal(capsFlipped(ev(true), true).flip, false);
  assert.equal(capsFlipped(ev(false), true).flip, true);
  assert.equal(capsFlipped({}, true).flip, false);
});
test('flee ends a wild fight in one step', () => {
  const s = mk(); s.step(1 / 60, { mx: 0, my: 0, flee: true });
  assert.equal(s.outcome, 'retreat');
});
test('flee does nothing in a trainer fight', () => {
  const s = mk({ trainer: true }); for (let i = 0; i < 120; i++) s.step(1 / 60, { mx: 0, my: 0, flee: true });
  assert.notEqual(s.outcome, 'retreat');
});
