import test from 'node:test';
import assert from 'node:assert/strict';
import { signPages, R4_SIGNS } from '../src/region4/index.js';
import { ITEMS, BATTLE_ITEMS } from '../src/systems/items.js';

test('region4 signs: {pages, lines} objects and plain lists both read', () => {
  assert.deepEqual(signPages({ pages: ['A'], lines: [{ pages: ['A'] }] }), ['A']);
  assert.deepEqual(signPages({ lines: [{ pages: ['B'] }] }), ['B']);
  assert.deepEqual(signPages(['C']), ['C']);
  assert.equal(signPages(null), null);
  assert.deepEqual(R4_SIGNS, ['frostspire_sign_skylift', 'frostspire_sign_benefits']);
});

test('potion = Trail Remedy, care pocket, basic heal', () => {
  assert.equal(ITEMS.potion.pocket, 'care');
  assert.equal(ITEMS.potion.name, 'Trail Remedy');
  assert.equal(ITEMS.potion.heal, BATTLE_ITEMS.tonic_small.kHeal);
  const nums = Object.values(BATTLE_ITEMS).map((b) => b.num);
  assert.equal(new Set(nums).size, nums.length);
});
