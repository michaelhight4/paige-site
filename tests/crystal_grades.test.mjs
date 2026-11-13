// Crystal grades from the Benefits Board (Oct 23, 2026; Gary 12:17 PM CT: "you can get more powerful crystal from the
// board nodes"). Data: src/systems/data/crystal_grades.js. Shop gate: src/systems/shop.js boardCrystals/stockFor.
// Capture: the chosen crystal's kCrystalGrade multiplies the chance (src/battle/capture.js / engine runCrystal, unchanged).
import test from 'node:test';
import assert from 'node:assert/strict';
import { CRYSTAL_GRADES, gradeRow, crystalRank, unlockedCrystals } from '../src/systems/data/crystal_grades.js';
import { BATTLE_ITEMS, ITEMS } from '../src/systems/items.js';
import { loadShopsData, getShops, Shop, Wallet, stockFor } from '../src/systems/shop.js';
import { Bag } from '../src/systems/bag.js';
import { systemsConfig } from '../src/systems/config.js';
import { KilumenBattle } from '../src/battle/battle.js';
import { captureChance } from '../src/battle/capture.js';

await loadShopsData();
const cfg = systemsConfig();
const NODE = CRYSTAL_GRADES.node;
const board = (rank) => ({ idLevel: 1, board: rank == null ? {} : { [NODE]: rank } });
const GATED = CRYSTAL_GRADES.grades.filter((g) => g.rank > 0);
const BOARD_ZONE = 'thornwood'; // a region 2 zone (world_layout.json), not hidden: uses shops.json _default prices/stock

test('one data file: grade numbers feed the item table the battle reads; every grade is priced in shops.json', () => {
  assert.equal(NODE, 'crystal_grade');
  const by = Object.fromEntries(CRYSTAL_GRADES.grades.map((g) => [g.item, g.grade]));
  assert.deepEqual(by, { dominance_crystal: 1, fine_crystal: 1.25, dominance_crystal_plus: 1.5, apex_crystal: 2 });
  for (const g of CRYSTAL_GRADES.grades) {
    assert.equal(BATTLE_ITEMS[g.item].kCrystalGrade, g.grade, g.item);
    assert.equal(ITEMS[g.item].pocket, 'crystals'); assert.equal(ITEMS[g.item].battle, true);
    assert.equal(typeof getShops().basePrices[g.item], 'number', `${g.item} priced`);
  }
  // existing names/nums kept
  assert.equal(BATTLE_ITEMS.dominance_crystal.name, 'Dominance Crystal'); assert.equal(BATTLE_ITEMS.dominance_crystal_plus.name, 'Prime Crystal');
  assert.equal(BATTLE_ITEMS.dominance_crystal_plus.num, 6);
  const nums = Object.values(BATTLE_ITEMS).map((i) => i.num); assert.equal(new Set(nums).size, nums.length, 'engine nums unique');
  // ranks climb with grade; no blocked wording in fallback names
  for (let i = 1; i < CRYSTAL_GRADES.grades.length; i++) assert.ok(CRYSTAL_GRADES.grades[i].rank > CRYSTAL_GRADES.grades[i - 1].rank);
  for (const g of CRYSTAL_GRADES.grades) assert.doesNotMatch(g.name, /\b(great|ultra|master|pok[eé]|ball|throw)\b/i);
});

test('node rank gates shop stock (board zone): each grade appears only once its rank is owned', () => {
  for (let rank = 0; rank <= 3; rank++) {
    const s = stockFor(BOARD_ZONE, 8, cfg, getShops(), board(rank));
    for (const g of GATED) assert.equal(s.includes(g.item), rank >= g.rank, `rank ${rank} ${g.item}`);
    assert.ok(s.includes('dominance_crystal'), 'base crystal never gated');
    assert.deepEqual(unlockedCrystals(board(rank)).filter((i) => i !== 'dominance_crystal'), GATED.filter((g) => g.rank <= rank).map((g) => g.item));
  }
  // Shop class: stock() lists it with a regional price; buy works only with the rank
  const bag = new Bag({}, { cfg });
  const shop = new Shop({ wallet: new Wallet(10000), bag, zone: BOARD_ZONE, company: board(3), badgeCoins: 0, cfg });
  const apex = shop.stock().find((it) => it.id === 'apex_crystal');
  assert.ok(apex && apex.price === getShops().basePrices.apex_crystal, 'priced by the existing regional system');
  assert.equal(shop.buy('apex_crystal', 1).ok, true); assert.equal(bag.count('apex_crystal'), 1);
});

test('no grade without the node: no stock, buy refused, empty / missing board', () => {
  for (const company of [board(null), board(0), {}, null, { board: { store_discount: 3 } }]) {
    assert.equal(crystalRank(company), 0);
    const s = stockFor(BOARD_ZONE, 8, cfg, getShops(), company);
    for (const g of GATED) assert.ok(!s.includes(g.item), `${g.item} not stocked without the node`);
  }
  const shop = new Shop({ wallet: new Wallet(10000), bag: new Bag({}, { cfg }), zone: BOARD_ZONE, company: board(0), badgeCoins: 8, cfg });
  assert.deepEqual(shop.buy('fine_crystal', 1), { ok: false, reason: 'not_stocked' });
  assert.deepEqual(new Shop({ wallet: new Wallet(10000), bag: new Bag({}, { cfg }), zone: BOARD_ZONE, company: board(1), badgeCoins: 8, cfg }).buy('apex_crystal', 1), { ok: false, reason: 'not_stocked' });
});

test('region 1 shops unchanged and board-hidden, even with ranks owned', () => {
  const before = { // shop lists as they were before this change (shops.json coin tiers)
    brookhollow: { 0: ['dominance_crystal', 'tonic_small', 'calm_tea', 'trail_mix', 'feed_bag_small'], 3: ['dominance_crystal_plus', 'vigor_seed'] },
    fernwick: { 1: ['dominance_crystal_plus', 'energy_tonic'] },
  };
  for (const zone of CRYSTAL_GRADES.hiddenInZones.concat([null])) for (const coins of [0, 1, 3, 8]) {
    const plain = stockFor(zone, coins, cfg, getShops());
    for (const rank of [0, 1, 2, 3]) assert.deepEqual(stockFor(zone, coins, cfg, getShops(), board(rank)), plain, `${zone} coins ${coins} rank ${rank}`);
    assert.ok(!plain.includes('fine_crystal') && !plain.includes('apex_crystal'));
  }
  for (const id of before.brookhollow[0]) assert.ok(stockFor('brookhollow', 0, cfg).includes(id));
  assert.equal(stockFor('brookhollow', 2, cfg).includes('dominance_crystal_plus'), false);
  assert.equal(stockFor('brookhollow', 3, cfg).includes('dominance_crystal_plus'), true, 'Prime keeps its coin-3 tier in Brookhollow');
  assert.equal(stockFor('fernwick', 1, cfg).includes('dominance_crystal_plus'), true, 'Prime keeps its coin-1 tier in Fernwick');
});

/** one wild battle per seed at frac HP, one crystal of `item` held up -> caught? */
function tryCapture(item, frac, i) {
  const seed = [i & 0xffff, (i * 7919) & 0xffff, (i * 104729) & 0xffff, 4242];
  const b = new KilumenBattle({ party: [{ species: 'rillop', level: 10 }], foes: [{ species: 'mirewump', level: 6 }], wild: true, bag: { [item]: 1 }, seed });
  const foe = b.p2.active[0]; foe.hp = Math.max(1, Math.round(foe.maxhp * frac));
  assert.equal(b.choose(`crystal ${item}`), true, item);
  const l = b.drain().find((x) => x[0] === '-kcrystal');
  return { caught: l[4] === 'caught', b };
}

test('grade multiplies capture chance: formula and engine (same seeds, the chosen crystal is the one used)', () => {
  const base = captureChance({ rarity: 0.6, hp: 12, maxHp: 23 });
  for (const g of CRYSTAL_GRADES.grades) assert.ok(Math.abs(captureChance({ rarity: 0.6, hp: 12, maxHp: 23, grade: gradeRow(g.item).grade }) - base * g.grade) < 1e-9);
  const N = 1200, rates = {};
  for (const g of CRYSTAL_GRADES.grades) {
    let c = 0; for (let i = 1; i <= N; i++) if (tryCapture(g.item, 0.5, i).caught) c++;
    rates[g.item] = c / N;
    const p = captureChance({ rarity: 0.6, hp: 12, maxHp: 23, grade: g.grade }); // mirewump catchRate 0.6, maxhp 23 at L6
    assert.ok(Math.abs(rates[g.item] - p) < 0.04, `${g.item}: engine ${rates[g.item]} vs formula ${p}`);
  }
  assert.ok(rates.fine_crystal > rates.dominance_crystal && rates.dominance_crystal_plus > rates.fine_crystal && rates.apex_crystal > rates.dominance_crystal_plus, JSON.stringify(rates));
  // the used crystal leaves the bag
  const r = tryCapture('apex_crystal', 0.5, 7); assert.equal(r.b.result().bag.apex_crystal ?? 0, 0);
});
