// Stuck movement input (Gary 1:04 PM CT Oct 23, 2026: "my character walk[s] south on his own even when i press up he will
// just return to walking south after"; 1:05 PM: "clicking s worked" = a missed KeyS keyup). src/overworld/input.js guards:
// capture-phase keyup, stuck-key timeout once OS repeat is known, pad recentre + radial dead zone + disconnect release,
// touch lostpointercapture / stale pointer release.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window ??= new EventTarget();
const { Input } = await import('../src/overworld/input.js');

const ev = (type, props = {}) => Object.assign(new Event(type, { bubbles: true }), props);
const key = (t, code, type = 'keydown', props = {}) => t.dispatchEvent(ev(type, { code, repeat: false, ...props }));
function rig() {
  const t = new EventTarget(), inp = new Input(t); let clock = 0;
  inp.now = () => clock; inp._pollPads = () => {};
  return { t, inp, tick: (ms) => { clock += ms; }, dir: () => inp.poll().dir };
}
// a child node so stopPropagation in a child listener really stops the bubble to the target (like online.js's chat input)
function domish() {
  const win = new EventTarget(), child = new EventTarget(), inp = new Input(win); let clock = 0;
  inp.now = () => clock; inp._pollPads = () => {};
  // EventTarget has no tree: replay capture / bubble the way the DOM would for child -> window
  const fire = (type, code, props = {}) => {
    const e = ev(type, { code, repeat: false, ...props }); let stopped = false;
    e.stopPropagation = () => { stopped = true; };
    // capture at window first
    const capOnly = new Event(type); Object.assign(capOnly, { code, repeat: e.repeat, ctrlKey: false, metaKey: false, altKey: false });
    inp[type === 'keydown' ? '_kdCap' : '_kuCap'](capOnly);
    child.dispatchEvent(e);
    if (!stopped) inp[type === 'keydown' ? '_kd' : '_ku'](e);
  };
  return { inp, child, fire, tick: (ms) => { clock += ms; }, dir: () => inp.poll().dir };
}

test('baseline: hold S walks down, W overrides, releasing W returns to S, releasing S stops', () => {
  const { t, dir } = rig();
  key(t, 'KeyS'); assert.equal(dir(), 'down');
  key(t, 'KeyW'); assert.equal(dir(), 'up');
  key(t, 'KeyW', 'keyup'); assert.equal(dir(), 'down');
  key(t, 'KeyS', 'keyup'); assert.equal(dir(), null);
});

test('swallowed keyup: an overlay that stops keyup (chat input / dev panel) no longer leaves S held', () => {
  const { child, fire, dir } = domish();
  child.addEventListener('keyup', (e) => e.stopPropagation()); // online.js line ~219
  fire('keydown', 'KeyS'); assert.equal(dir(), 'down');
  fire('keyup', 'KeyS'); assert.equal(dir(), null, 'capture-phase keyup released it');
  // and pressing / releasing W afterwards does not bring a phantom S back
  fire('keydown', 'KeyW'); fire('keyup', 'KeyW'); assert.equal(dir(), null);
});

test('swallowed keydown still blocks presses (hall puzzle overlay / chat typing keep the player still)', () => {
  const { child, fire, dir } = domish();
  child.addEventListener('keydown', (e) => e.stopPropagation());
  fire('keydown', 'KeyS'); assert.equal(dir(), null);
  fire('keyup', 'KeyS'); assert.equal(dir(), null);
});

test('quiet key (v0.2.15, Gary "holding W stops"): no hold timeout; a held key stays held until its keyup', () => {
  const { t, inp, tick, dir } = rig();
  key(t, 'KeyS'); tick(500); key(t, 'KeyS', 'keydown', { repeat: true }); // learns delay 500
  for (let i = 0; i < 10; i++) { tick(33); key(t, 'KeyS', 'keydown', { repeat: true }); assert.equal(dir(), 'down'); }
  // repeats stop (macOS press-and-hold letter keys do this while still held): never dropped by time
  tick(900); assert.equal(dir(), 'down'); tick(5000); assert.equal(dir(), 'down', 'no hold timeout');
  key(t, 'KeyS', 'keyup'); assert.equal(dir(), null);
  // W then works normally and nothing comes back
  key(t, 'KeyW'); assert.equal(dir(), 'up'); key(t, 'KeyW', 'keyup'); assert.equal(dir(), null);
  assert.equal(inp.sources.size, 0);
});

test('legit holds: steady repeats, slow repeat settings and repeat-off never drop a held key', () => {
  { // repeat off / not learned yet: no timeout at all
    const { t, tick, dir } = rig();
    key(t, 'KeyS'); tick(10000); assert.equal(dir(), 'down');
  }
  { // slow mac-style repeat: 1.8 s initial delay, 0.9 s interval
    const { t, tick, dir } = rig();
    key(t, 'KeyD'); tick(1800); key(t, 'KeyD', 'keydown', { repeat: true });
    for (let i = 0; i < 6; i++) { tick(900); key(t, 'KeyD', 'keydown', { repeat: true }); assert.equal(dir(), 'right'); }
    key(t, 'KeyD', 'keyup');
    key(t, 'KeyD'); tick(1700); assert.equal(dir(), 'right', 'a fresh press waits out the slow initial delay');
  }
  { // newest key repeats for both: holding S under a held D keeps S alive
    const { t, tick, dir } = rig();
    key(t, 'KeyS'); tick(400); key(t, 'KeyS', 'keydown', { repeat: true });
    key(t, 'KeyD'); for (let i = 0; i < 60; i++) { tick(33); key(t, 'KeyD', 'keydown', { repeat: true }); }
    assert.equal(dir(), 'right'); key(t, 'KeyD', 'keyup'); assert.equal(dir(), 'down');
  }
});

test('a held key dropped by a clear comes back on its next repeat; Ctrl/Cmd+S never starts walking', () => {
  const { t, inp, dir } = rig();
  key(t, 'KeyS'); inp._clearKeys(); assert.equal(dir(), null);
  key(t, 'KeyS', 'keydown', { repeat: true }); assert.equal(dir(), 'down');
  key(t, 'KeyS', 'keyup');
  key(t, 'KeyS', 'keydown', { ctrlKey: true }); assert.equal(dir(), null);
  key(t, 'KeyS', 'keydown', { metaKey: true }); assert.equal(dir(), null);
  key(t, 'KeyW'); key(t, 'MetaLeft', 'keyup'); assert.equal(dir(), null, 'Cmd up clears (macOS eats keyups under Cmd)');
});

function padRig(pads) {
  const t = new EventTarget(), inp = new Input(t); inp.now = () => 0;
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
  const dir = () => inp.poll().dir;
  return { inp, dir, done: () => { if (nav) Object.defineProperty(globalThis, 'navigator', nav); } };
}
const pad = (ay, ax = 0, index = 0) => ({ index, mapping: 'standard', connected: true, axes: [ax, ay, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });

test('pad drift ignored until recentred; radial dead zone 0.6', () => {
  const pads = [pad(0.7)]; const { dir, done } = padRig(pads);
  try {
    assert.equal(dir(), null, 'drifting stick at connect is ignored');
    pads[0] = pad(0.1); assert.equal(dir(), null);           // stick seen at rest
    pads[0] = pad(0.55); assert.equal(dir(), null, 'inside the 0.6 dead zone');
    pads[0] = pad(0.4, 0.4); assert.equal(dir(), null, 'radial: a 0.57 diagonal is inside');
    pads[0] = pad(0.45, -0.3); assert.equal(dir(), null, 'radial: each axis small, 0.54 total');
    pads[0] = pad(0.65); assert.equal(dir(), 'down', 'past 0.6 after recentre walks');
  } finally { done(); }
});

test('pad stick: clear push after recentre walks; d-pad works without recentre', () => {
  const pads = [pad(0.9)]; const { dir, done } = padRig(pads);
  try {
    pads[0].buttons[12].pressed = true; assert.equal(dir(), 'up', 'd-pad is not subject to the drift guard');
    pads[0] = pad(0.9); assert.equal(dir(), null);
    pads[0] = pad(0); dir(); pads[0] = pad(0.9); assert.equal(dir(), 'down');
    pads[0] = pad(0); assert.equal(dir(), null);
  } finally { done(); }
});

test('pad disconnect releases its direction (event and missing from getGamepads)', () => {
  const pads = [pad(0)]; const { inp, dir, done } = padRig(pads);
  try {
    dir(); pads[0] = pad(1); assert.equal(dir(), 'down');
    window.dispatchEvent(Object.assign(new Event('gamepaddisconnected'), { gamepad: { index: 0 } }));
    assert.equal(inp.sources.has('g0'), false);
    // reconnect still drifting: ignored until recentred
    assert.equal(dir(), null);
    pads[0] = pad(0); dir(); pads[0] = pad(1); assert.equal(dir(), 'down');
    pads.length = 0; assert.equal(dir(), null, 'missing from getGamepads() releases');
    pads.push(null); assert.equal(dir(), null);
  } finally { done(); }
});

// minimal touch root: attachTouch only needs addEventListener / setPointerCapture / isConnected
function touchRig() {
  const root = new EventTarget(); root.isConnected = true; root.setPointerCapture = () => {}; root.closest = () => null; // e.target = root: not a [data-btn]
  const prevDoc = globalThis.document;
  globalThis.document = { elementFromPoint: (x) => ({ closest: () => ({ dataset: { dir: x < 50 ? 'down' : 'up' } }) }) };
  const t = new EventTarget(), inp = new Input(t); let clock = 0; inp.now = () => clock; inp._pollPads = () => {};
  inp.attachTouch(root);
  const ptr = (type, props) => root.dispatchEvent(Object.assign(new Event(type), { pointerId: 7, clientX: 10, clientY: 10, buttons: 1, ...props }));
  return { root, inp, ptr, tick: (ms) => { clock += ms; }, dir: () => inp.poll().dir, done: () => { globalThis.document = prevDoc; } };
}

test('touch: lostpointercapture releases; slide still works; a resting finger stays held', () => {
  const { root, inp, ptr, tick, dir, done } = touchRig();
  try {
    root.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 7, clientX: 10, clientY: 10, buttons: 1 }));
    assert.equal(dir(), 'down');
    ptr('pointermove', { clientX: 80 }); assert.equal(dir(), 'up', 'slide between arrows');
    tick(5000); assert.equal(dir(), 'up', 'finger resting still (buttons 1) is never timed out');
    ptr('lostpointercapture', {}); assert.equal(dir(), null);
    assert.equal(inp.sources.size, 0);
  } finally { done(); }
});

test('touch: stale not-pressed pointer dropped after ~1.5 s; pad element removed drops at once', () => {
  const { root, ptr, tick, dir, done } = touchRig();
  try {
    root.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 7, clientX: 10, clientY: 10, buttons: 1 }));
    ptr('pointermove', { buttons: 0, pressure: 0 }); // no up/cancel ever comes
    tick(1400); assert.equal(dir(), 'down');
    tick(200); assert.equal(dir(), null);
    root.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerId: 8, clientX: 10, clientY: 10, buttons: 1 }));
    assert.equal(dir(), 'down'); root.isConnected = false; assert.equal(dir(), null);
  } finally { done(); }
});
