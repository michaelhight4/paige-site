// Oct 30 2026: at dev world speed 200x (speedMultiplier 1/200) a quick key tap walked a tile instead of only turning, because
// the 6-tick turn pause ran out inside one frame's sub-ticks. The pause now scales with a multiplier < 1 (real time).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { GridMover } = await import(path.join(root, 'src/overworld/movement.js'));
const world = { canEnter: () => true, isWalkable: () => true, blocked: () => false, onArrive: () => undefined, onStepStart: () => undefined };
const tap = (mult, ticks) => { const m = new GridMover({ x: 5, y: 5, facing: 'down' }); m.speedMultiplier = mult; for (let i = 0; i < ticks; i++) m.tick({ dir: 'left' }, world); for (let i = 0; i < 2000; i++) m.tick({ dir: null }, world); return [m.x, m.y, m.facing]; };
test('a 2-frame tap turns in place at 1x and at 200x (40 sub-ticks per frame x 2)', () => {
  assert.deepEqual(tap(1, 2), [5, 5, 'left']);
  assert.deepEqual(tap(1 / 200, 400), [5, 5, 'left']);
});
