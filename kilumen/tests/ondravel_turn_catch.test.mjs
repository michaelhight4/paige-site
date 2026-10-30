// Gary (Oct 30 2026): both Ondravel fights use the REGULAR turn battle only (never real-time, even with RT on); the release
// fight's last phase still takes a crystal with the guardian catch rule (engine kCatchFn hook).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { KilumenBattle } from '../src/battle/battle.js';
import { guardianCatchChance } from '../src/battle/capture.js';
const party = [{ species: 'cindrip', level: 60 }], foes = [{ species: 'ondravel', level: 66 }];

test('turn engine: trainer-style fight refuses crystals without a catch rule', () => {
  const kb = new KilumenBattle({ party, foes, wild: false, bag: { dominance_crystal: 3 }, forceChance: true });
  const r = kb.choose('crystal dominance_crystal'); assert.ok(!kb.result().caught, JSON.stringify(r)?.slice(0, 80));
});
test('turn engine: the guardian catch rule lets the crystal work and uses guardianCatchChance', () => {
  const seen = []; const fn = (c) => { seen.push(c); return guardianCatchChance(c); };
  const kb = new KilumenBattle({ party, foes, wild: false, catchFn: fn, bag: { dominance_crystal: 3 }, forceChance: true });
  kb.choose('crystal dominance_crystal');
  assert.equal(seen.length, 1); assert.equal(seen[0].grade, 1); assert.ok(seen[0].hp > 0);
  assert.equal(kb.result().caught?.species, 'ondravel');
});
test('both Ondravel fights ask for the turn battle; the hook skips real-time for turnOnly', () => {
  const r9 = fs.readFileSync(new URL('../src/region9/index.js', import.meta.url), 'utf8');
  assert.match(r9, /id: R9\.summitFight, scripted: 'lose', turnOnly: true/); assert.match(r9, /catchable: last, turnOnly: true/);
  assert.match(fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8'), /onBattle = \(who\) => \(!who\?\.turnOnly && rtbMode\(scene, q\) === 'rt'/);
});

test('fight 1 is unwinnable in the turn engine: the foe never drops below 1 HP, the battle ends in a loss', () => {
  const kb = new KilumenBattle({ party: [{ species: 'cindrip', level: 100 }], foes, wild: false, unwinnable: true, seed: [1, 2, 3, 4] });
  for (let i = 0; i < 200 && !kb.ended; i++) { const r = kb.request(); kb.choose(r.state === 'switch' ? 'switch 2' : 'move 1'); }
  assert.ok(kb.ended); assert.notEqual(kb.result().outcome, 'win');
  assert.ok(kb.battle.p2.creature[0].hp >= 1);
});
test('forced turn-based: with real-time on, turnOnly fights never open the real-time battle', async () => {
  const src = fs.readFileSync(new URL('../src/ui/ui.js', import.meta.url), 'utf8');
  const m = src.match(/scene\.hooks\.onBattle = \(who\) => \((.*?) \? rtTrainer\(who\)/); assert.ok(m);
  const pick = new Function('who', 'rtbMode', 'rtbKilled', 'scene', 'q', `return (${m[1]}) ? 'rt' : 'turn';`);
  const scene = { party: [{ hp: 10 }] }, rt = () => 'rt', no = () => false;
  assert.equal(pick({ turnOnly: true, scripted: 'lose' }, rt, no, scene, null), 'turn');
  assert.equal(pick({ turnOnly: true, catchable: true }, rt, no, scene, null), 'turn');
  assert.equal(pick({ id: 'other_trainer' }, rt, no, scene, null), 'rt'); // everyone else still follows the RT setting
});
