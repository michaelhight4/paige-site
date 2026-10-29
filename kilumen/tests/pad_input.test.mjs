import test from 'node:test'; import assert from 'node:assert/strict';
import { keyAction, padState, feedPad } from '../src/sports/pad_input.js';
test('arrows and WASD map the same, caps safe, by code', () => {
  for (const [a, w] of [['ArrowLeft', 'KeyA'], ['ArrowRight', 'KeyD'], ['ArrowUp', 'KeyW'], ['ArrowDown', 'KeyS']]) assert.equal(keyAction({ code: a, key: a }), keyAction({ code: w, key: w.slice(3) }));
  assert.equal(keyAction({ key: 'W' }), 'up'); assert.equal(keyAction({ code: 'KeyQ', key: 'a' }), 'left');
  assert.equal(keyAction({ key: ' ' }), 'tap'); assert.equal(keyAction({ key: 'x' }), null);
});
test('gamepad d-pad, stick, A button', () => {
  const btn = (on) => Array.from({ length: 16 }, (_, i) => ({ pressed: on.includes(i) }));
  assert.deepEqual(padState([{ connected: true, buttons: btn([12, 0]), axes: [0, 0] }]), { left: false, right: false, up: true, down: false, tap: true });
  assert.equal(padState([{ connected: true, buttons: btn([]), axes: [-0.9, 0] }]).left, true);
  assert.equal(padState([{ connected: true, buttons: btn([]), axes: [0.3, 0] }]).right, false);
  assert.equal(padState([null]).up, false);
});
test('feedPad sends only edges', () => {
  const got = []; let p = feedPad({}, { left: true }, (k, d) => got.push(k + d)); p = feedPad(p, { left: true }, (k, d) => got.push(k + d)); feedPad(p, {}, (k, d) => got.push(k + d));
  assert.deepEqual(got, ['lefttrue', 'leftfalse']);
});
