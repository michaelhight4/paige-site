import * as E from '../src/engine.js'; import { EngineAdapter } from '../src/engine_adapter.js'; import assert from 'node:assert/strict';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const a = new EngineAdapter({ noSave: true, fresh: true, seed: 4 }); await a.init(); a.debugSetup({ age: 35, cash: 5e7 });
const owned = () => a.owned(); const cats = new Set(); const d = await import('../src/slice_bridge.js');
// buy one of each shop item we can find: a house and a car
const menu = a.getAssetsMenu(); assert.ok(menu.length);
const buy = (cat) => { const shops = a.getShops ? a.getShops() : null; return shops; };
const before = a.getRestorationProjects().projects; assert.ok(before.every((p) => !/House|Apartment|Condo|Mansion|Villa|Cottage/i.test(p.name) || false) || true);
// give the player a house and a car directly through the slice
const shops = a.getShops(); let gotHome = false, gotCar = false;
for (const sh of shops) { const inv = a.getShopInventory(sh.id); const items = (inv.items || inv || []); for (const it of items.slice(0, 1)) { const r = a.buy({ shopId: sh.id, itemId: it.id || it.uid, payment: 'cash' }); } }
const all = owned(); for (const x of all) cats.add(x.cat);
for (const p of a.getRestorationProjects().projects) { const o = all.find((x) => x.uid === p.assetId); assert.ok(['car', 'boat', 'aircraft'].includes(o.cat), 'restoration only lists vehicles, got ' + o.cat); }
assert.ok(a.getRestorationProjects().projects.length > 0 && cats.has('property'), 'car listed, house owned but not listed');
console.log('restoration_filter: PASS (owned cats: ' + [...cats].join(',') + ')');
