// Capture rules (Oct 23, 2026; Gary 12:03 PM CT: "also the capture chance is based on health and chance, but also no
// capturing trainers creatures"). Formula: src/battle/capture.js (mirrored in vendor/battle-sim/sim/kilumen.ts runCrystal).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KilumenBattle } from '../src/battle/battle.js';
import { KILUMEN_RULES } from '../src/battle/data/rules.js';
import { CAPTURE, captureChance, captureRoll, rarityOf } from '../src/battle/capture.js';

const mk = (species, level) => ({ species, level });
const seedOf = (i) => [i & 0xffff, (i * 7919) & 0xffff, (i * 104729) & 0xffff, 4242];

/** one wild battle per seed, foe HP set to frac of max, one crystal held up -> -kcrystal line */
function tryCapture(species, frac, seed) {
  const b = new KilumenBattle({ party: [mk('rillop', 10)], foes: [mk(species, 6)], wild: true, bag: { dominance_crystal: 1 }, seed });
  const foe = b.p2.active[0]; foe.hp = Math.max(1, Math.round(foe.maxhp * frac));
  assert.equal(b.choose('crystal dominance_crystal'), true);
  const l = b.drain().find((x) => x[0] === '-kcrystal');
  return { caught: l[4] === 'caught', pulses: +l[3], b, rate: b.battle.dex.species.get(species).catchRate };
}
const rateOver = (species, frac, n = 600) => {
  let c = 0; const pulses = new Set();
  for (let i = 1; i <= n; i++) { const r = tryCapture(species, frac, seedOf(i)); if (r.caught) c++; pulses.add(r.pulses); }
  return { rate: c / n, pulses };
};

test('formula: chance = catchRate x (1 - 29/30 x HP%^0.85), clamped; full HP common ~2% (Gary 12:16 PM CT)', () => {
  const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);
  const within = (a, lo, hi, what) => assert.ok(a >= lo && a <= hi, `${what}: ${a}`);
  within(captureChance({ rarity: 0.6, hp: 1, maxHp: 1 }), 0.01, 0.03, 'common full HP ~2%');
  near(captureChance({ rarity: 0.6, hp: 1, maxHp: 1 }), 0.02);
  within(captureChance({ rarity: 0.6, hp: 1, maxHp: 4 }), 0.40, 0.50, 'common 25% HP');
  within(captureChance({ rarity: 0.6, hp: 1, maxHp: 23 }), 0.55, 0.60, 'common 1 HP of 23');
  within(captureChance({ rarity: 0.24, hp: 1, maxHp: 1 }), 0.005, 0.012, 'rare full HP ~1%, above the floor');
  assert.ok(captureChance({ rarity: 0.24, hp: 1, maxHp: 1 }) > CAPTURE.min, 'rare full HP not pinned to the floor');
  near(captureChance({ rarity: 0.24, hp: 1, maxHp: 4 }) / captureChance({ rarity: 0.6, hp: 1, maxHp: 4 }), 0.4); // proportional
  for (let h = 23; h > 1; h--) assert.ok(captureChance({ rarity: 0.6, hp: h - 1, maxHp: 23 }) > captureChance({ rarity: 0.6, hp: h, maxHp: 23 })); // lower HP always higher
  // existing bonuses only: status (rules.js catchStatus) and crystal grade; clamp 1%..95%
  near(captureChance({ rarity: 0.6, hp: 1, maxHp: 4, status: KILUMEN_RULES.catchStatus.drowsy, grade: 1.5 }), CAPTURE.max);
  near(captureChance({ rarity: 0.001, hp: 1, maxHp: 1 }), CAPTURE.min);
  // engine constants match the shared module
  assert.equal(KILUMEN_RULES.catchHpWeight, CAPTURE.hpWeight); assert.equal(KILUMEN_RULES.catchHpCurve, CAPTURE.hpCurve); assert.equal(KILUMEN_RULES.catchMin, CAPTURE.min);
  assert.equal(KILUMEN_RULES.catchMax, CAPTURE.max); assert.equal(KILUMEN_RULES.catchPulses, CAPTURE.pulses);
});

test('pulses 1-4 come from the same roll: caught 4, near miss 3, far miss 1', () => {
  assert.deepEqual(captureRoll(0.5, 0.1), { caught: true, pulses: 4 });
  assert.deepEqual(captureRoll(0.5, 0.52), { caught: false, pulses: 3 });
  assert.deepEqual(captureRoll(0.5, 0.99), { caught: false, pulses: 1 });
  for (let r = 0; r < 1; r += 0.01) { const o = captureRoll(0.3, r); assert.ok(o.pulses >= 1 && o.pulses <= 4); assert.equal(o.caught, r < 0.3); assert.equal(o.pulses === 4, o.caught); }
  assert.equal(rarityOf({ catchRate: 0.24 }), 0.24);
});

test('engine: low HP captures clearly more often than full HP over seeded rolls, rates match the formula', () => {
  for (const sp of ['mirewump', 'vesperowl']) { // catchRate 0.6 and 0.24 (species_synced.gen.js)
    const rate = tryCapture(sp, 1, seedOf(1)).rate;
    const full = rateOver(sp, 1, 2000), low = rateOver(sp, 0.25, 2000);
    const pf = captureChance({ rarity: rate, hp: 23, maxHp: 23 }), pl = captureChance({ rarity: rate, hp: 6, maxHp: 23 }); // foe maxhp 23 at L6
    assert.ok(low.rate > full.rate * 8, `${sp}: 25% HP ${low.rate} vs full ${full.rate}`);
    assert.ok(Math.abs(full.rate - pf) < 0.01, `${sp} full: ${full.rate} vs ${pf}`);
    assert.ok(Math.abs(low.rate - pl) < 0.035, `${sp} 25%: ${low.rate} vs ${pl}`);
    if (rate === 0.6) assert.ok(full.rate >= 0.01 && full.rate <= 0.03, `common full HP ~2% on the engine: ${full.rate}`);
    assert.ok([...low.pulses].every((n) => n >= 1 && n <= 4), [...low.pulses].join(','));
  }
});

test('wild capture still works: the crystal is used, the creature joins, pulses 4', () => {
  let r = null;
  for (let i = 1; i <= 50 && !r?.caught; i++) r = tryCapture('mirewump', 0.05, seedOf(i));
  assert.ok(r.caught, 'caught within 50 seeded tries at 5% HP');
  assert.equal(r.pulses, 4);
  const res = r.b.result();
  assert.equal(res.outcome, 'caught'); assert.equal(res.caught.species, 'mirewump'); assert.equal(res.bag.dominance_crystal ?? 0, 0);
});

test("trainer battle: capture refused, crystal kept, no turn used (no capturing a trainer's creatures)", () => {
  const b = new KilumenBattle({ party: [mk('rillop', 10)], foes: [mk('mirewump', 6)], wild: false, bag: { dominance_crystal: 2 }, seed: seedOf(3) });
  b.p2.active[0].hp = 1; // even at 1 HP
  const turn = b.battle.turn;
  const r = b.choose('crystal dominance_crystal');
  assert.notEqual(r, true); assert.match(String(r.error), /wild|crystal/i);
  assert.equal(b.battle.turn, turn, 'no turn used');
  assert.ok(!b.drain().some((l) => l[0] === '-kcrystal'), 'no capture roll');
  assert.equal(b.request().state, 'move', 'still the player\'s choice');
  assert.equal(b.request().bag.dominance_crystal, 2, 'crystal not consumed');
  assert.equal(b.result().caught, null);
  assert.equal(b.choose('move 1'), true); // the battle goes on normally
  assert.equal(b.result().bag.dominance_crystal, 2);
});

test('screens: any battle with an owner is not wild; refusal line uses the requested Text Bot key with a neutral fallback', () => {
  const sd = fs.readFileSync(new URL('../src/battle/ui_sd.js', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
  assert.match(sd, /const owned = trainer \|\| !!opts\.who \|\| !!opts\.owner \|\| !!opts\.foes\?\.length;/);
  assert.match(sd, /wild: !owned/);
  assert.match(sd, /if \(crystal && owned\) \{ await say\(noCapture\(\), 0\); showCmds\(\); return; \}/);
  for (const src of [sd, ui]) assert.match(src, /system_trainers\.no_capture/);
  assert.match(ui, /captureChance\(\{ rarity: rarityOf\(foe\.sp, SPECIES\)/);
  const fb = "That creature already has a trainer. A crystal won't take it.";
  assert.ok(!/throw|pok[eé] ?ball|gotcha|route|\bPP\b|shiny|super effective/i.test(fb));
});
