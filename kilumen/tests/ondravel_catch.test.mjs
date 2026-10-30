// Ondravel release fight catch rule (Gary, Oct 30 2026): ~0 above 30 % HP (1.5 %), 10 % at/below 30 % HP, crystals and catch
// items raise it, cap 30 %.
import test from 'node:test';
import assert from 'node:assert/strict';
import { guardianCatchChance, GUARDIAN_CATCH } from '../src/battle/capture.js';
import { CRYSTAL_GRADES } from '../src/systems/data/crystal_grades.js';
import { HELD_BATTLE_ITEMS } from '../src/battle/data/held_items.js';
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('above 30 % HP: near zero (1.5 %)', () => {
  near(guardianCatchChance({ hp: 100, maxHp: 100 }), 0.015);
  near(guardianCatchChance({ hp: 31, maxHp: 100 }), 0.015);
});
test('at / below 30 % HP: 10 % base', () => {
  near(guardianCatchChance({ hp: 30, maxHp: 100 }), 0.10);
  near(guardianCatchChance({ hp: 1, maxHp: 100 }), 0.10);
});
test('better crystals and catch upgrades raise it; capped', () => {
  const g = CRYSTAL_GRADES.grades.map((x) => x.grade);
  const apex = Math.max(2, ...g), thread = HELD_BATTLE_ITEMS.tamers_thread.kCatchMult;
  assert.ok(guardianCatchChance({ hp: 10, maxHp: 100, grade: 1.25 }) > 0.10);
  near(guardianCatchChance({ hp: 10, maxHp: 100, grade: 2, heldMult: thread }), 0.24);
  assert.ok(guardianCatchChance({ hp: 90, maxHp: 100, grade: 2 }) > 0.015);
  assert.ok(guardianCatchChance({ hp: 90, maxHp: 100, grade: apex, heldMult: thread }) < 0.05);
  near(guardianCatchChance({ hp: 1, maxHp: 100, grade: 5, heldMult: 5 }), GUARDIAN_CATCH.max);
});

test('catch upgrade bonus (board catch bonus) raises the low-HP rate; max reachable today 24 %, hard cap 30 %', () => {
  near(guardianCatchChance({ hp: 10, maxHp: 100, bonus: 0.5 }), 0.15);
  near(guardianCatchChance({ hp: 80, maxHp: 100, grade: 1.25 }), 0.01875);
  near(GUARDIAN_CATCH.max, 0.30);
});
