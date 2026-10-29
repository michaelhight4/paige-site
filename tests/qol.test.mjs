import test from 'node:test';
import assert from 'node:assert/strict';
import { qolFlags, loadSettings, saveSettings, paceMs, RunLatch, installQol, TEXT_SPEEDS } from '../src/qol/qol.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('qol flags: on by default, ?qol=0 and -name kill switches', () => {
  assert.deepEqual(qolFlags(new URLSearchParams('')), { pace: true, text: true, run: true });
  assert.deepEqual(qolFlags(new URLSearchParams('qol=0')), { pace: false, text: false, run: false });
  assert.deepEqual(qolFlags(new URLSearchParams('qol=-run')), { pace: true, text: true, run: false });
});

test('settings: defaults, round trip, junk rejected', () => {
  const s = mem();
  assert.deepEqual(loadSettings(s), { pace: 1, text: 'normal', run: 'hold' });
  saveSettings({ pace: 3, text: 'instant', run: 'toggle' }, s);
  assert.deepEqual(loadSettings(s), { pace: 3, text: 'instant', run: 'toggle' });
  s.setItem('kilumen.qol.v1', '{"pace":9,"text":"warp","run":1}');
  assert.deepEqual(loadSettings(s), { pace: 1, text: 'normal', run: 'hold' });
  s.setItem('kilumen.qol.v1', 'not json');
  assert.equal(loadSettings(s).pace, 1);
});

test('battle pace divides waits, x1 unchanged, never 0', () => {
  assert.equal(paceMs(650, 1), 650);
  assert.equal(paceMs(650, 2), 325);
  assert.equal(paceMs(300, 3), 100);
  assert.equal(paceMs(1, 3), 1);
});

test('run latch: hold mode follows B; toggle mode flips on each press only', () => {
  const l = new RunLatch();
  assert.equal(l.step(true, 'hold'), true);
  assert.equal(l.step(false, 'hold'), false);
  const t = new RunLatch();
  assert.equal(t.step(true, 'toggle'), true);   // press -> run
  assert.equal(t.step(true, 'toggle'), true);   // still held: no flip
  assert.equal(t.step(false, 'toggle'), true);  // released: keeps running
  assert.equal(t.step(true, 'toggle'), false);  // press again -> walk
  assert.equal(t.step(false, 'toggle'), false);
});

test('run latch: not allowed (no shoes / indoors) never runs; carried-over B is not a press', () => {
  const t = new RunLatch();
  assert.equal(t.step(true, 'toggle', false), false);
  t.step(false, 'toggle'); t.prev = true; // overworld marks a B held through a talk as already pressed
  assert.equal(t.step(true, 'toggle'), false);
});

test('installQol: rows per flag, text speed sets --reveal-ms, no save calls', () => {
  globalThis.localStorage = mem();
  const props = {}; const doc = { documentElement: { style: { setProperty: (k, v) => { props[k] = v; }, removeProperty: (k) => { delete props[k]; } } } };
  const ui = { body: { ownerDocument: doc } }, scene = { saveNow() { throw new Error('qol must not save'); } };
  const q = installQol(ui, scene, new URLSearchParams(''));
  assert.equal(scene.qol, q); assert.equal(q.rows().length, 3);
  const textRow = q.rows()[1]; textRow[2](); // normal -> fast
  assert.equal(props['--reveal-ms'], `${TEXT_SPEEDS.fast}ms`);
  q.rows()[0][2](); assert.equal(q.pace(600), 300);
  assert.equal(installQol(ui, {}, new URLSearchParams('qol=0')).rows().length, 0);
  assert.equal(installQol(ui, {}, new URLSearchParams('qol=0')).pace(600), 600);
  delete globalThis.localStorage;
});
