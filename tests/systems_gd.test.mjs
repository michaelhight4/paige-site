// systems-gd (Oct 22, 2026): creature / party / bag / heal / shop / puzzle unit tests. node --test tests/systems_gd.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fc from 'fast-check';
import { Col, WALKABLE } from '../src/overworld/constants.js';
import { GameMap } from '../src/overworld/map.js';
import { indexTileset } from '../src/overworld/tileset.js';
import { normalise, freshSave } from '../src/overworld/save.js';
import { KilumenBattle } from '../src/battle/battle.js';
import { buildCreatures } from '../src/battle/data/creatures.js';
import { KILUMEN_RULES } from '../src/battle/data/rules.js';
import { systemsConfig } from '../src/systems/config.js';
import { createCreature, serialise, deserialise, maxHp, maxEnergy, xpForLevel, levelForXp, applyBattleTeam, isFainted } from '../src/systems/creature.js';
import { Party, Archive, partyMax } from '../src/systems/party.js';
import { Bag, pickupAt, visiblePickups, collectPickup, pickupFlag } from '../src/systems/bag.js';
import { loadShopsData, getShops, Shop, Wallet, discountFor, priceOf, sellPriceOf, stockFor, awardPrize, awardBattleMoney } from '../src/systems/shop.js';
import { copayFor, healPoint, branchByCarer, onPartyFainted } from '../src/systems/heal.js';
import { PuzzleRuntime, applyPuzzleToMap, parseSolution } from '../src/systems/puzzles.js';
import { attachSystems } from '../src/systems/index.js';
import { fillText } from '../src/overworld/lines.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.join(ROOT, 'art/world/overworld');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const TS = indexTileset(readJson(path.join(KIT, 'tileset.json')));
const loadMap = (n) => new GameMap(readJson(path.join(KIT, 'maps', n + '.json'))).attachTileset(TS.byId);
const LINES = readJson(path.join(ROOT, 'text/overworld_lines.json'));
const PUZZLE = readJson(path.join(KIT, 'puzzles/fernwick_hall_int.runtime.json'));
await loadShopsData();
const cfg = systemsConfig();

/** Minimal Overworld stand-in: say/ask record pages; startWarp places at once. */
function stubScene(over = {}) {
  const sc = {
    flags: new Set(), party: [], counters: {}, seen: {}, hooks: { onPlate: null }, log: [], ms: 0, tick: 0, busy: false, lines: LINES,
    said: [], asked: [], answers: [], map: null, lastDoor: null, fade: null,
    textVars: () => ({ player: 'Sam' }), zone: () => over.zoneName || 'brookhollow',
    say: async (pages) => { sc.said.push(...(pages || [])); },
    ask: async (pages, choices) => { sc.asked.push({ pages, choices }); return sc.answers.length ? sc.answers.shift() : choices.length - 1; },
    script: async (fn) => { if (sc.busy) return; sc.busy = true; try { await fn(); } finally { sc.busy = false; } },
    setFlag: (f, on = true) => (on ? sc.flags.add(f) : sc.flags.delete(f)),
    bump: (k) => { sc.counters[k] = (sc.counters[k] || 0) + 1; },
    startWarp: (spawn, kind) => { sc.warped = { ...spawn, kind }; },
    ...over,
  };
  return sc;
}

// ---- creature ----------------------------------------------------------------------------------
test('creature maxHp / energy match the battle engine for every species, level and variant', () => {
  const C = buildCreatures();
  for (const sp of Object.keys(C)) for (const level of [1, 5, 37, 100]) for (const variant of ['', 'large', 'small']) {
    const c = createCreature({ species: sp, level, variant });
    const t = new KilumenBattle({ party: [serialise(c)], foes: [{ species: 'tumbloam', level: 3 }], wild: true, seed: [1, 2, 3, 4] }).result().team[0];
    assert.equal(maxHp(c), t.maxhp, `${sp} L${level} ${variant}`);
    assert.equal(c.hp, t.hp);
    assert.deepEqual(maxEnergy(c), t.energy, `${sp} energy`);
  }
});

test('creature shape: serialise round trip, no derived stats saved, xp curve', () => {
  const c = createCreature({ species: 'cindrip', level: 12, nickname: 'Pip', warmth: 140, origin: { map: 'route1' } });
  assert.equal(c.warmth, 100);
  assert.equal(c.xp, xpForLevel(12));
  assert.equal(levelForXp(c.xp), 12);
  const s = serialise(c);
  for (const k of ['maxHp', 'stats', 'maxhp']) assert.ok(!(k in s), k);
  assert.deepEqual(deserialise(JSON.parse(JSON.stringify(s))), c);
  const old = deserialise({ species: 'rillop', id: 'abc', hp: 9999, caughtAt: 'route1' });
  assert.equal(old.uid, 'abc'); assert.equal(old.level, 5); assert.equal(old.hp, maxHp(old)); assert.deepEqual(old.origin, { at: 'route1' });
  fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), fc.integer({ min: -50, max: 10_000 }), (lv, hp) => {
    const d = deserialise({ species: 'tumbloam', level: lv, hp });
    return d.hp >= 0 && d.hp <= maxHp(d) && d.xp >= xpForLevel(lv);
  }));
});

test('applyBattleTeam folds result() back by uid', () => {
  const party = [createCreature({ species: 'tumbloam', level: 5 }), createCreature({ species: 'rillop', level: 5 })];
  applyBattleTeam(party, [{ uid: party[1].uid, level: 6, xp: 200, hp: 0, energy: [1, 2], status: 'brn' }]);
  assert.equal(party[1].level, 6); assert.ok(isFainted(party[1])); assert.equal(party[1].status, 'brn');
  assert.equal(party[0].level, 5);
});

// ---- party -------------------------------------------------------------------------------------
test('party cap comes from KILUMEN_RULES.partyMax; overflow goes to the Archive', () => {
  assert.equal(partyMax(), KILUMEN_RULES.partyMax);
  const host = { party: Array.from({ length: 8 }, (_, i) => ({ species: 'tumbloam', uid: 'u' + i })) };
  const ar = new Archive(null, cfg), p = new Party(host, ar, cfg);
  assert.equal(p.size, KILUMEN_RULES.partyMax);
  assert.equal(ar.size, 2);
  assert.equal(p.add(createCreature({ species: 'rillop' })).where, 'archive');
  assert.equal(ar.size, 3);
});

test('party reorder / lead / deposit / withdraw / heal', () => {
  let changed = 0;
  const host = { party: [], onPartyChange: (lead) => { changed += lead ? 1 : 0; } };
  const p = new Party(host, new Archive(null, cfg), cfg);
  for (const sp of ['tumbloam', 'cindrip', 'rillop']) p.add(createCreature({ species: sp }));
  p.setLead(2);
  assert.deepEqual(host.party.map((c) => c.species), ['rillop', 'tumbloam', 'cindrip']);
  assert.ok(changed >= 1);
  p.reorder(0, 2);
  assert.deepEqual(host.party.map((c) => c.species), ['tumbloam', 'cindrip', 'rillop']);
  host.party[0].hp = 0; host.party[1].status = 'psn';
  p.healAll();
  assert.ok(host.party.every((c) => c.hp === maxHp(c) && !c.status));
  assert.equal(p.depositAt(0).ok, true);
  assert.equal(p.depositAt(0).ok, true);
  assert.equal(p.depositAt(0).reason, 'last_one');
  assert.equal(p.withdraw(0, 0).ok, true);
  assert.equal(p.size, 2);
});

test('starter flow sets got_starter once', () => {
  const flags = new Set(), host = { party: [] };
  const p = new Party(host, new Archive(null, cfg), cfg, { has: (f) => flags.has(f), set: (f) => flags.add(f) });
  assert.equal(p.chooseStarter('cindrip').ok, true);
  assert.ok(flags.has('got_starter'));
  assert.equal(host.party[0].level, cfg.starterLevel);
  assert.equal(p.chooseStarter('rillop').reason, 'already');
});

// ---- bag ---------------------------------------------------------------------------------------
test('bag pockets, add/remove, key items cap at 1, engine export/import', () => {
  const b = new Bag({ tonic_small: 2 }, { cfg, lines: LINES });
  assert.equal(b.add('tonic_small', 3).ok, true);
  assert.equal(b.count('tonic_small'), 5);
  assert.equal(b.pocketOf('tonic_small'), 'care');
  b.add('old_record', 1); assert.equal(b.add('old_record', 1).ok, false); assert.equal(b.count('old_record'), 1);
  assert.equal(b.remove('tonic_small', 10), false);
  b.add('dominance_crystal', 4);
  const eng = b.toEngine();
  assert.equal(eng.tonic_small, 5); assert.equal(eng.dominance_crystal, 4); assert.ok(!('old_record' in eng));
  b.fromEngine({ tonic_small: 1, dominance_crystal: 3 });
  assert.equal(b.count('tonic_small'), 1); assert.equal(b.count('old_record'), 1);
  const care = b.exportPocket('care');
  const b2 = new Bag({}, { cfg }); b2.importPocket('care', care);
  assert.deepEqual(b2.exportPocket('care'), care);
  assert.equal(new Bag({}, { cfg: { ...cfg, stackMax: 3 } }).add('trail_mix', 4).ok, false);
});

test('bag field use: heal, cure, energy behind potionsVsRest (default rest_only)', () => {
  const c = createCreature({ species: 'tumbloam', level: 20 });
  const b = new Bag({ tonic_small: 1, calm_tea: 1, energy_tonic: 2 }, { cfg });
  assert.equal(b.use('tonic_small', c).reason, 'no_effect');
  c.hp = 1; assert.equal(b.use('tonic_small', c).ok, true); assert.equal(c.hp, Math.min(maxHp(c), 21));
  c.status = 'psn'; assert.equal(b.use('calm_tea', c).ok, true); assert.equal(c.status, '');
  c.energy = c.energy.map(() => 0);
  assert.equal(b.use('energy_tonic', c).reason, 'rest_only');
  const b2 = new Bag({ energy_tonic: 1 }, { cfg: systemsConfig({ potionsVsRest: 'potions_restore' }) });
  assert.equal(b2.use('energy_tonic', c).ok, true);
  assert.ok(c.energy.every((e) => e > 0));
  c.hp = 0; assert.equal(new Bag({ tonic_small: 1 }, { cfg }).use('tonic_small', c).reason, 'out_cold');
});

test('pickups: real map items, unique flags, hidden stay walkable, text from overworld_lines', () => {
  const m = loadMap('route1'), flags = new Set();
  const vis = visiblePickups(m, flags, cfg);
  assert.ok(vis.some((it) => it.id === 'r1_crystal'));
  const all = m.items.map((it) => pickupFlag('route1', it));
  assert.equal(new Set(all).size, all.length);
  const it = pickupAt(m, 8, 13), bag = new Bag({}, { cfg, lines: LINES });
  const r = collectPickup('route1', it, { flags, bag, cfg, lines: LINES });
  assert.equal(r.ok, true); assert.ok(flags.has('item_route1_r1_crystal'));
  assert.equal(bag.count('dominance_crystal'), 1);
  assert.equal(r.textKey, 'system_items.picked_up');
  assert.match(r.pages.map((t) => fillText(t, r.vars)).join(' '), new RegExp(bag.nameOf('dominance_crystal')));
  assert.equal(collectPickup('route1', it, { flags, bag, cfg, lines: LINES }).ok, false);
  let money = 0;
  const pouch = pickupAt(loadMap('fernwick'), 29, 9);
  const rp = collectPickup('fernwick', pouch, { flags, bag, addMoney: (n) => { money += n; }, cfg, lines: LINES });
  assert.equal(rp.kind, 'money'); assert.ok(money > 0);
  const tbd = loadMap('home_fernwick_a_2f').items[0];
  assert.equal(collectPickup('home_fernwick_a_2f', tbd, { flags, bag, cfg, lines: LINES }).kind, 'tbd');
});

// ---- shop --------------------------------------------------------------------------------------
test('shop: regional prices, discount stacks to the 65% cap, buy / sell', () => {
  const S = getShops();
  assert.ok(S._TUNING);
  assert.equal(discountFor({ idLevel: 1 }), 0);
  assert.equal(discountFor({ idLevel: 2 }), S.discount.staff);
  assert.equal(discountFor({ idLevel: 2, board: { shopDiscount: 0.9 } }), S.discount.cap);
  assert.notEqual(priceOf('tonic_small', 'fernwick'), priceOf('tonic_small', 'brookhollow'));
  assert.ok(!stockFor('brookhollow', 8, cfg).includes('energy_tonic'));
  assert.ok(stockFor('brookhollow', 8, systemsConfig({ stockEnergyTonic: true })).includes('energy_tonic'));
  assert.ok(stockFor('brookhollow', 0, cfg).length < stockFor('brookhollow', 3, cfg).length);
  const wallet = new Wallet(1000), bag = new Bag({}, { cfg });
  const shop = new Shop({ wallet, bag, zone: 'brookhollow', company: { idLevel: 2 }, badgeCoins: 0, cfg });
  const id = shop.stock()[0].id, unit = shop.stock()[0].price;
  assert.equal(unit, priceOf(id, 'brookhollow', S.discount.staff));
  assert.equal(shop.buy(id, 2).ok, true);
  assert.equal(wallet.coins, 1000 - 2 * unit); assert.equal(bag.count(id), 2);
  assert.equal(shop.buy(id, 9999).reason, 'short');
  const before = wallet.coins;
  assert.equal(shop.sell(id, 1).ok, true);
  assert.equal(wallet.coins, before + sellPriceOf(id, 'brookhollow', bag));
  bag.add('old_record', 1); assert.equal(shop.sell('old_record', 1).reason, 'cant_sell');
});

test('awardPrize / awardBattleMoney return the amount and add coins', () => {
  const wallet = new Wallet(0);
  assert.equal(awardPrize({ trainerId: 't1', baseAmount: 40, level: 10 }, { wallet, party: [], cfg }), 400);
  assert.equal(wallet.coins, 400);
  const party = [createCreature({ species: 'tumbloam' })]; party[0].held = cfg.goldCoinItem;
  assert.equal(awardPrize({ baseAmount: 40, level: 10 }, { wallet, party, cfg }), 600);
  const r = awardBattleMoney({ id: 'hiker_1', class: 'hiker', team: [{ level: 7 }, { level: 9 }] }, { wallet, party: [], cfg, lines: LINES });
  assert.equal(r.amount, getShops().trainerMoney.classes.hiker * 9);
  assert.equal(wallet.coins, 1000 + r.amount);
  assert.ok(r.pages.length);
});

// ---- heal / blackout ---------------------------------------------------------------------------
test('heal counter: full HP/status/energy and sets the last heal point', async () => {
  const sc = stubScene({ zoneName: 'fernwick' });
  sc.party = [{ species: 'tumbloam', level: 9 }, { species: 'rillop', level: 9 }];
  const sys = attachSystems(sc, { saveData: {} });
  await sys.ready;
  sc.party[0].hp = 0; sc.party[1].status = 'psn'; sc.party[1].energy = [0, 0];
  sc.answers = [0];
  const ok = await sys.onTalk({ mapName: 'heal_fernwick', def: { id: 'heal_fernwick_carer' }, entry: { pages: ['Rest?'], after_heal: ['All better.'], declined: ['OK.'] }, line: null });
  assert.equal(ok, true);
  assert.ok(sc.party.every((c) => c.hp === maxHp(c) && !c.status && c.energy.every((e, i) => e === maxEnergy(c)[i])));
  assert.equal(sys.state.lastHeal.map, 'heal_fernwick');
  assert.ok(sc.said.includes('All better.'));
  assert.ok(branchByCarer('heal_brookhollow_carer'));
});

test('blackout: copay, warp to the last heal point, everyone rested (onPartyFainted)', async () => {
  const sc = stubScene();
  sc.party = [{ species: 'tumbloam', level: 9, hp: 0 }];
  const sys = attachSystems(sc, { saveData: { coins: 1000 } });
  await sys.ready;
  sc.party[0].hp = 0;
  const r = await onPartyFainted();
  const pt = healPoint({ id: 'heal_brookhollow', ...getShops().branches.heal_brookhollow });
  assert.equal(r.fee, copayFor(pt, 1000).fee);
  assert.equal(sys.wallet.coins, 1000 - r.fee);
  assert.deepEqual([sc.warped.map, sc.warped.x, sc.warped.y], ['heal_brookhollow', pt.x, pt.y]);
  assert.equal(sc.party[0].hp, maxHp(sc.party[0]));
  assert.deepEqual(sc.lastDoor, pt.returnDoor);
  assert.ok(!sc.said.join(' ').includes('{fee}'));
  sys.wallet.take(sys.wallet.coins - 5);
  const r2 = await sys.onPartyFainted();
  assert.equal(r2.short, true); assert.equal(sys.wallet.coins, 0);
});

test('awardBattleMoney via the attached systems + saveBlocks survive save.js normalise', async () => {
  const sc = stubScene();
  sc.party = [{ species: 'cindrip', level: 14, nickname: 'Ash' }];
  const sys = attachSystems(sc, { saveData: { coins: 50, bag: { tonic_small: 2 } } });
  await sys.ready;
  sys.awardBattleMoney({ baseAmount: 10, level: 5 });
  sc.party[0].hp = 3; sc.party[0].status = 'brn';
  const raw = { ...freshSave(), flags: [], party: sc.party, ...sys.saveBlocks() };
  const s = normalise(JSON.parse(JSON.stringify(raw)));
  assert.equal(s.coins, 100); assert.equal(s.bag.tonic_small, 2);
  assert.equal(s.party[0].hp, 3); assert.equal(s.party[0].status, 'brn'); assert.equal(s.party[0].uid, sc.party[0].uid);
  assert.ok(Array.isArray(s.party[0].skills));
  assert.ok(s.systems && 'puzzles' in s.systems);
});

// ---- puzzle ------------------------------------------------------------------------------------
test('Fernwick Hall: the verified solution replays on the real map and reaches the goal', () => {
  const m = loadMap('fernwick_hall_int'), rt = new PuzzleRuntime(PUZZLE);
  applyPuzzleToMap(rt, m);
  for (const g of PUZZLE.gates) assert.equal(m.code(g.x, g.y), Col.GATE);
  const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  let x = 7, y = 17, face = 'U';
  for (const s of parseSolution(PUZZLE.verified.shortest_solution['goal:battle ring in front of the master'])) {
    if (s.touch) {
      const [dx, dy] = D[face], r = rt.touch(x + dx, y + dy);
      assert.ok(r?.changed, `crystal ${s.touch} at ${x + dx},${y + dy}`);
      assert.equal(rt.switchAt(x + dx, y + dy).id, s.touch);
      applyPuzzleToMap(rt, m);
      continue;
    }
    face = s.dir;
    const nx = x + D[s.dir][0], ny = y + D[s.dir][1];
    assert.ok(WALKABLE.has(m.code(nx, ny)), `blocked at ${nx},${ny} (code ${m.code(nx, ny)})`);
    x = nx; y = ny;
    if (m.code(x, y) === Col.PLATE) { rt.step(x, y); applyPuzzleToMap(rt, m); }
  }
  assert.deepEqual([x, y], [PUZZLE.goal.x, PUZZLE.goal.y]);
  assert.ok(rt.solved);
  for (const g of PUZZLE.gates) assert.equal(m.code(g.x, g.y), Col.WALK);
  const again = new PuzzleRuntime(PUZZLE, JSON.parse(JSON.stringify(rt.toJSON())));
  assert.ok(again.solved && PUZZLE.gates.every((g) => again.gateOpen(g)));
});

test('puzzle wiring through attachSystems: plate hook + crystal interact set the solved flag', async () => {
  const sc = stubScene();
  const sys = attachSystems(sc, { saveData: {}, puzzleDefs: { fernwick_hall_int: PUZZLE } });
  sc.map = loadMap('fernwick_hall_int');
  await sys.onMapEnter(sc.map);
  const S = Object.fromEntries(PUZZLE.switches.map((s) => [s.id, s]));
  sc.hooks.onPlate(S.pA1.x, S.pA1.y); sc.hooks.onPlate(S.pA2.x, S.pA2.y);
  assert.ok(sys.onInteract(S.cL.x, S.cL.y)); assert.ok(sys.onInteract(S.cR.x, S.cR.y));
  assert.ok(sc.flags.has(PUZZLE.solved_flag));
  assert.equal(sys.saveBlocks().systems.puzzles.fernwick_hall_int.solved, true);
});

test('satchels: visible pickups are solid on map entry; interact collects once', async () => {
  const sc = stubScene();
  const sys = attachSystems(sc, { saveData: {} });
  sc.map = loadMap('lab_brookhollow');
  await sys.onMapEnter(sc.map);
  assert.equal(sc.map.code(13, 8), Col.BLOCK);
  assert.ok(sys.onInteract(13, 8));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(sys.bag.count('trail_mix'), 1);
  assert.ok(sc.flags.has('item_lab_brookhollow_lab_corner'));
});

test('starter cradle in lab_brookhollow gives the starter and sets got_starter', async () => {
  const sc = stubScene();
  const sys = attachSystems(sc, { saveData: {} });
  sc.map = loadMap('lab_brookhollow');
  sc.answers = [0];
  assert.ok(sys.onInteract(7, 6));
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(sc.party.length, 1);
  assert.equal(sc.party[0].species, cfg.starterCradles.cradle_2);
  assert.ok(sc.flags.has('got_starter'));
  assert.equal(sys.onInteract(7, 6), false);
});
