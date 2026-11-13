// rtb keybinds (v0.2.60): Q/E/R/F skills, 1-6 party, no clashes, pad edges, sweep, party switch rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ROOT = process.env.KIL_SRC || '/workspace/wt_rtbkeys/kilumen';
const K = await import(ROOT + '/src/rtb/keys.js');
const { RtBattle } = await import(ROOT + '/src/rtb/sim.js');
const { createCreature } = await import(ROOT + '/src/systems/creature.js');
test('Q E R F = skill slots 0-3', () => { ['KeyQ', 'KeyE', 'KeyR', 'KeyF'].forEach((c, i) => assert.deepEqual(K.actionFor(c), { type: 'skill', slot: i })); });
test('1-6 and numpad = party slots 0-5', () => { for (let i = 0; i < 6; i++) { assert.deepEqual(K.actionFor('Digit' + (i + 1)), { type: 'party', slot: i }); assert.deepEqual(K.actionFor('Numpad' + (i + 1)), { type: 'party', slot: i }); } assert.equal(K.actionFor('Digit7'), null); });
test('no code bound twice; movement keys untouched; Esc still leave', () => {
  assert.equal(new Set(K.ALL_CODES).size, K.ALL_CODES.length);
  for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F3', 'Backquote']) assert.equal(K.actionFor(c), null, c);
  assert.equal(K.actionFor('Escape').type, 'leave'); assert.equal(K.actionFor('KeyX').type, 'b');
});
test('overworld input still has its keys (Esc is B)', () => { const s = fs.readFileSync(ROOT + '/src/overworld/input.js', 'utf8'); assert.match(s, /KEY_B = new Set\(\[[^\]]*'Escape'/); });
test('pad: LB RB LT RT edges -> skills', () => { const now = []; now[4] = true; now[7] = true; assert.deepEqual(K.padSkillEdges(now, []), [0, 3]); assert.deepEqual(K.padSkillEdges(now, now), []); });
test('sweep', () => { assert.equal(K.sweepDeg(0, 2), 0); assert.equal(K.sweepDeg(1, 2), 180); assert.equal(K.sweepDeg(5, 2), 360); });
test('party switch respects fainted + cooldown', () => {
  const p = [createCreature({ species: 'cindrip', level: 12 }), createCreature({ species: 'nibbin', level: 8 }), createCreature({ species: 'nibbin', level: 6 })]; p[1].hp = 0;
  const b = new RtBattle({ party: p, foes: [{ species: 'tumbloam', level: 4 }], start: { x: 300, y: 250 }, arena: { x0: 0, y0: 0, x1: 800, y1: 500 } });
  for (let i = 0; i < 120 && b.state !== 'fight'; i++) b.step(1 / 60, {});
  assert.equal(b.swap(1), false); assert.equal(b.swap(2), true); assert.equal(b.active, 2); assert.equal(b.swap(0), false); // cooldown
});
test('index.js wires keys.js and the HUD shows labels only off touch', () => {
  const s = fs.readFileSync(ROOT + '/src/rtb/index.js', 'utf8'); assert.match(s, /actionFor\(e\.code\)/); assert.match(s, /skills: \['', '', '', ''\]/); assert.match(s, /key: 'T'/);
  const v = fs.readFileSync(ROOT + '/src/rtb/view.js', 'utf8'); assert.match(v, /conic-gradient/); assert.match(v, /rtbReady/); assert.match(v, /rtb-touch .rtb-pi .pk\{display:none\}/);
});
