// rtb capture tab (rtb-capture branch): odds = the roll's numbers, bands, factors, text keys clean, wiring, trainer hidden.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const ROOT = process.env.KIL_SRC || '/workspace/wt_rtb_capture/kilumen';
const C = await import(ROOT + '/src/rtb/capture.js');
const { RtBattle } = await import(ROOT + '/src/rtb/sim.js');
const { createCreature } = await import(ROOT + '/src/systems/creature.js');
const { captureChance } = await import(ROOT + '/src/battle/capture.js');
const mk = (o = {}) => { const b = new RtBattle({ party: [createCreature({ species: 'cindrip', level: 14 })], foes: [{ species: 'tumbloam', level: 5 }], start: { x: 300, y: 250 }, arena: { x0: 0, y0: 0, x1: 800, y1: 500 }, rng: () => 0.5, ...o }); for (let i = 0; i < 60; i++) b.step(1 / 60, {}); return b; };
test('odds: low HP, status and better crystals are easier; same formula as the roll', () => {
  const b = mk(), f = b.foes[0];
  const full = b.oddsFor(f, 1).p; f.c.hp = Math.max(1, Math.floor(f.mhp * 0.2)); const low = b.oddsFor(f, 1).p; f.drowsy = 2; const dz = b.oddsFor(f, 1).p; const prime = b.oddsFor(f, 1.5).p;
  assert.ok(full < low && low < dz && dz <= prime, JSON.stringify({ full, low, dz, prime }));
  assert.equal(low, captureChance({ rarity: b.oddsFor(f).rarity, hp: f.c.hp, maxHp: f.mhp, status: 1, grade: 1 }));
});
test('bands + factors', () => {
  assert.equal(C.oddsBand(0.02), 'slim'); assert.equal(C.oddsBand(0.7), 'great');
  const b = mk(), f = b.foes[0]; assert.deepEqual(C.factorsOf(f).map((x) => x.k), ['f_full']);
  f.c.hp = 1; f.scorch = 3; assert.deepEqual(C.factorsOf(f).map((x) => x.k), ['f_weak', 'f_scorched']);
});
test('launch reuses castCrystal + capture roll; grade passes through', () => {
  const b = mk(); b.forceCatch = true; const f = b.foes[0]; f.ai.state = 'alert'; f.ai.t = 99; b.ally.x = f.x - 80; b.ally.y = f.y;
  b.step(1 / 60, { crystal: { id: 'dominance_crystal_plus', grade: 1.5 } }); assert.equal(b.crystalUsed, 1);
  for (let i = 0; i < 600 && !b.caught; i++) b.step(1 / 60, {}); assert.ok(b.caught);
});
test('no capture in trainer fights', () => { const b = mk({ trainer: true }); assert.equal(b.canCrystal(), false); });
test('text keys: no blocked words, every key used exists', () => {
  const txt = JSON.stringify(C.CT).toLowerCase(); for (const w of ['throw', 'poké ball', 'poke ball', ' pp', 'shiny', 'berry', 'route', 'weed', 'nurse', 'super effective', 'pokédex']) assert.ok(!txt.includes(w), w);
  const v = fs.readFileSync(ROOT + '/src/rtb/view.js', 'utf8') + fs.readFileSync(ROOT + '/src/rtb/index.js', 'utf8');
  for (const m of v.matchAll(/CT\.(\w+)/g)) assert.ok(m[1] in C.CT, m[1]);
  for (const k of ['slim', 'low', 'fair', 'good', 'great']) assert.ok(C.CT['odds_' + k]);
});
test('wiring: G key, tab slowed, hidden in trainer, touch big button, skills locked while open', () => {
  const i = fs.readFileSync(ROOT + '/src/rtb/index.js', 'utf8'), v = fs.readFileSync(ROOT + '/src/rtb/view.js', 'utf8');
  assert.match(i, /cap\.open \? CAP_TAB\.slow : 1/); assert.match(i, /fire: cap\.open \? null : inp\.fire/); assert.match(i, /e\.who === sim\.ally\)\) \{ cap\.open = false/);
  assert.match(v, /cb\.hidden = !!sim\.trainer/); assert.match(v, /body\.rtb-touch \.rtb-cap\{position:fixed/); assert.match(v, /<kbd>\$\{keyNames\.crystal\}<\/kbd>/);
  assert.ok(C.CAP_TAB.slow > 0 && C.CAP_TAB.slow < 1);
});
