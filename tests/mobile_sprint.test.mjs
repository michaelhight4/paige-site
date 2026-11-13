// Mobile sprint (Gary 9:12 AM CT Oct 29 2026: "the sprint doesn't work on mobile"). Hold on-screen B + d-pad = run on the
// open map (needs has_run_shoes, the Trail Runners). src/overworld/input.js: B and d-pad are held per pointer id AND per
// touch identifier, so a pointercancel iOS Safari / PWA sends when the second thumb lands can't drop sprint or the
// direction. src/overworld/overworld.js _runLockedHint: first B + d-pad without the Trail Runners says why.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window ??= new EventTarget();
const { Input } = await import('../src/overworld/input.js');
const { Overworld } = await import('../src/overworld/overworld.js');
const { MoveMode } = await import('../src/overworld/constants.js');

// touch root: x < 100 = d-pad (x < 50 down, else up), x >= 100 = B button
function rig() {
  const btnB = { dataset: { btn: 'b' } };
  const at = (x) => (x >= 100 ? { closest: (s) => (s.includes('data-btn') ? btnB : null) } : { closest: (s) => (s.includes('data-dir') ? { dataset: { dir: x < 50 ? 'down' : 'up' } } : null) });
  const root = new EventTarget(); root.isConnected = true; root.setPointerCapture = () => {};
  const prevDoc = globalThis.document;
  globalThis.document = { elementFromPoint: (x) => at(x) };
  const inp = new Input(new EventTarget()); inp._pollPads = () => {};
  inp.attachTouch(root);
  const ptr = (type, id, x) => { const e = Object.assign(new Event(type), { pointerId: id, clientX: x, clientY: 10, buttons: 1 }); Object.defineProperty(e, 'target', { value: at(x) }); root.dispatchEvent(e); };
  const touch = (type, id, x) => root.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { changedTouches: [{ identifier: id, clientX: x, clientY: 10 }] }));
  return { inp, ptr, touch, done: () => { globalThis.document = prevDoc; } };
}

test('B held while the d-pad is held (either order) gives b + dir together', () => {
  for (const bFirst of [false, true]) {
    const { inp, ptr, done } = rig();
    try {
      if (bFirst) ptr('pointerdown', 2, 120);
      ptr('pointerdown', 1, 80);
      if (!bFirst) ptr('pointerdown', 2, 120);
      let s = inp.poll(); assert.equal(s.dir, 'up'); assert.equal(s.b, true); assert.equal(s.bTap, true);
      s = inp.poll(); assert.equal(s.b, true, 'still held next frame'); assert.equal(s.bTap, false);
      ptr('pointerup', 2, 120); s = inp.poll(); assert.equal(s.b, false); assert.equal(s.dir, 'up');
      ptr('pointerup', 1, 80); assert.equal(inp.poll().dir, null);
    } finally { done(); }
  }
});

test('pointercancel on B and the d-pad while both touches are still down keeps sprinting (iOS / PWA)', () => {
  const { inp, ptr, touch, done } = rig();
  try {
    touch('touchstart', 11, 80); ptr('pointerdown', 1, 80);
    touch('touchstart', 12, 120); ptr('pointerdown', 2, 120);
    ptr('pointercancel', 1, 80); ptr('pointercancel', 2, 120);
    let s = inp.poll(); assert.equal(s.b, true); assert.equal(s.dir, 'up');
    touch('touchmove', 11, 20); assert.equal(inp.poll().dir, 'down', 'slide still steers from touch events');
    touch('touchmove', 12, 90); assert.equal(inp.poll().b, true, 'a B thumb that wobbles off B stays B');
    touch('touchend', 12, 90); s = inp.poll(); assert.equal(s.b, false); assert.equal(s.dir, 'down');
    touch('touchcancel', 11, 20); assert.equal(inp.poll().dir, null);
  } finally { done(); }
});

test('two thumbs on B: lifting one keeps B held; blur clears everything', () => {
  const { inp, ptr, done } = rig();
  try {
    ptr('pointerdown', 2, 120); ptr('pointerdown', 3, 130);
    ptr('pointerup', 2, 120); assert.equal(inp.poll().b, true);
    inp._blur(); assert.equal(inp.poll().b, false);
  } finally { done(); }
});

test('B tap is still a single back / cancel edge (menus, dialogue)', () => {
  const { inp, ptr, touch, done } = rig();
  try {
    touch('touchstart', 5, 120); ptr('pointerdown', 9, 120); ptr('pointerup', 9, 120); touch('touchend', 5, 120);
    const s = inp.poll(); assert.equal(s.bTap, true); assert.equal(s.b, false);
    assert.equal(inp.poll().bTap, false);
  } finally { done(); }
});

function fakeScene(shoes, run = true) {
  const toasts = [];
  return { toasts, s: Object.assign(Object.create(Overworld.prototype), {
    player: { mode: MoveMode.WALK }, map: { movement: { run } }, flags: new Set(shoes ? ['has_run_shoes'] : []),
    lines: { comfort: { run_mode: { locked: ["You'll need the Trail Runners first."] } } }, toast: (t) => toasts.push(t),
  }) };
}

test('touch B + d-pad runs with the Trail Runners, walks without; no hint with them', () => {
  const { s, toasts } = fakeScene(true);
  s._updateMode({ b: true, dir: 'up' }); assert.equal(s.player.mode, MoveMode.RUN);
  s._updateMode({ b: false, dir: 'up' }); assert.equal(s.player.mode, MoveMode.WALK);
  assert.equal(toasts.length, 0);
});

test('without the Trail Runners: first B + d-pad shows the hint once, B alone does not', () => {
  const prev = globalThis.localStorage; const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  try {
    const { s, toasts } = fakeScene(false);
    s._updateMode({ b: true, dir: null }); assert.equal(toasts.length, 0);
    s._updateMode({ b: true, dir: 'up' }); assert.equal(s.player.mode, MoveMode.WALK);
    assert.equal(toasts.length, 1); assert.match(toasts[0], /Trail Runners/); assert.match(toasts[0], /Ron in Fernwick/);
    s._updateMode({ b: true, dir: 'up' }); assert.equal(toasts.length, 1);
    const again = fakeScene(false); again.s._updateMode({ b: true, dir: 'left' }); assert.equal(again.toasts.length, 0, 'remembered across reloads');
    const indoorsNoRun = fakeScene(false, false); mem.clear(); indoorsNoRun.s._updateMode({ b: true, dir: 'up' }); assert.equal(indoorsNoRun.toasts.length, 0, 'no hint where running is off anyway');
  } finally { globalThis.localStorage = prev; }
});
