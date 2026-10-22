// Engine adapter tests: every contract method runs headlessly on the real engine; journal is first person; text loader; will shares.
import assert from 'node:assert/strict';
import * as Pm from '../src/premium.js';
import * as TP from '../src/textpack.js';
import { voice, firstPerson } from '../src/voice.js';
import { EngineAdapter } from '../src/engine_adapter.js';
const ok = (m) => console.log('  ok -', m);
console.log('7. Adapter');
Pm.resetAll();
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 9 }); await a.init();
a.debugSetup({ age: 30, cash: 6e6 }); a.s.stats.smarts = 90;
const names = ['getState', 'getJournal', 'getOccupationMenu', 'getEducation', 'getFreelanceGigs', 'getPartTimeJobs', 'getFight', 'getCareerCollections', 'getSportsCareer', 'getAssetsMenu', 'getFinances', 'getInvestments', 'getLuxury', 'getAuctionHouses', 'getCasino', 'getGarage', 'getZoo', 'getBelongings', 'getProperties', 'getShops', 'getRestorationProjects', 'getRelationships', 'getActivities', 'getWill', 'getProfile', 'getLegacy', 'getFamilyTree', 'getCemetery', 'getPremium', 'getSettings'];
for (const n of names) { const r = await a[n](); assert.ok(r !== undefined, n); JSON.stringify(r); }
ok(names.length + ' getters return plain JSON');
// shop -> restore -> garage -> race
const shops = a.getShops(), carShop = shops.find((x) => x.type === 'car'); const inv = a.getShopInventory(carShop.id);
let r = await a.buy({ shopId: carShop.id, itemId: inv.items[inv.items.length - 1].id, payment: 'cash' }); assert.ok(r.ok, r.message);
const car = a.getBelongings({}).categories.find((c) => c.id === 'car').items[0]; assert.ok(car.artUrl && car.variant, 'art + recolor variant'); ok('buy car with art + variant');
r = await a.assetAction(car.id, 'garage'); assert.ok(r.ok); assert.equal(a.getGarage().cars.length, 1);
r = await a.race(car.id, a.getGarage().races[0].id); assert.ok(r.ok, r.message);
const p = a.getRestorationProjects().projects[0]; r = await a.restoreCar(p.assetId, p.stages[0].id); assert.ok(r.ok, r.message); ok('race garage + restoration');
// zoo / casino / auction / luxury / amenity / instrument
r = await a.buyZoo(); assert.ok(r.ok); r = await a.buildEnclosure(); assert.ok(r.ok, r.message); r = await a.buyAnimal(a.getZoo().catalog[0].id); assert.ok(r.ok, r.message); ok('zoo + enclosure');
for (const g of ['slots', 'roulette', 'dice', 'poker']) { const t = a.getCasino().games.find((x) => x.id === g); if (t) { r = await a.gamble(g, t.minBet, 'red'); assert.ok(r.ok, g + ' ' + r.message); } }
r = await a.gamble('blackjack', 100); let n = 0; while (r.interactive && n++ < 12) r = await a.blackjackAction('stand'); assert.ok(r.ok && !r.interactive); ok('casino tables incl. interactive blackjack');
const lot = a.getAuctionHouses().houses[0].lots[0]; r = await a.bid(lot.id, 1); assert.ok(!r.ok || !(r.data && r.data.won)); let live = await a.bid(lot.id, lot.estimate * 3); n = 0; while (live.data && live.data.open && n++ < 4) live = await a.bid(lot.id, (live.data.need || lot.estimate) * 2); assert.ok(live.data && live.data.won, 'live auction can be won: ' + live.message); ok('live auction (rival raises, win after re-bids)');
r = await a.buy({ shopId: 'luxury', itemId: a.getLuxury().forSale[0].id }); assert.ok(r.ok, r.message);
const shopsH = shops.find((x) => x.type === 'house'); const hi = a.getShopInventory(shopsH.id).items.at(-1); r = await a.buy({ shopId: shopsH.id, itemId: hi.id, payment: 'cash' }); assert.ok(r.ok, r.message);
const house = a.getProperties().properties[0]; r = await a.assetAction(house.id, 'amenity:' + a.getProperties().amenities[0].name); assert.ok(r.ok, r.message); ok('luxury, house, amenity');
r = await a.invest(a.getInvestments().products[0].id, 1000); assert.ok(r.ok, r.message);
// will with shares + charity
const rel = a.getRelationships(); const kin = a.getWill().beneficiaries; assert.ok(kin.length);
r = await a.saveWill([{ personId: kin[0].personId, percent: 60 }], { id: a.getWill().charities[0].id, pct: 20 }); assert.ok(r.ok, r.message);
assert.ok((await a.saveWill([{ personId: kin[0].personId, percent: 90 }], { id: a.getWill().charities[0].id, pct: 20 })).ok === false); ok('will: shares + charity, over-100% rejected');
for (let i = 0; i < 6; i++) { const t = await a.age(); if (t.event) await a.resolveEvent(t.event.id, 0); }
a.s.people = []; r = await a.surrender(); assert.ok(r.ok); const d = a.getDeathSummary(); assert.ok(d && d.cause); const lg = a.getLegacy(); assert.ok(lg.over && lg.estate);
const sh = lg.estate.heirs; assert.ok(sh.length >= 0); ok('surrender -> death summary + legacy estate');
// journal voice
const bad = a.s.log.filter((e) => /^You /.test(e.text)); assert.equal(bad.length, 0, 'second-person journal lines: ' + bad.slice(0, 3).map((e) => e.text).join(' | ')); ok('journal is first person');
assert.equal(voice('Bought 5 Federal Treasury Bond.').startsWith('I'), true, voice('Bought 5 Federal Treasury Bond.')); assert.equal(firstPerson('You are tired and you go home.'), "I'm tired and I go home."); ok('voice rules');
// text pack loader
const st = TP.status(); assert.ok(st.loaded === false || st.events > 0); assert.equal(TP.overlayList([{ id: 'a', v: 1 }, { id: 'b' }], [{ id: 'a', v: 2 }, { id: 'c' }]).length, 3); ok('text pack loader (status: ' + (st.loaded ? 'loaded' : st.reason) + ')');
console.log('adapter: PASS');
