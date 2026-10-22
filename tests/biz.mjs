// Stage 7 business tests. node tests/biz.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import { D } from '../src/data.js'; import * as Plus from '../src/bizplus.js'; import * as Biz from '../src/business.js';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const mk = (seed = 5) => { const s = E.newGame({ seed }); s.age = 40; s.school = null; s.edu = 3; s.cash = 5e7; s.sl = s.sl || {}; return s; };
const ext = Object.entries(D.bizTypes).filter(([, t]) => t.x);
console.log('Stage 7: businesses');
assert.ok(ext.length >= 36, 'types ' + ext.length); ok(ext.length + ' extended types (incl. 4 fleets, 3 patched originals)');
const need = 'accounting law realestate insurance dental gym salon cleaning security tutoring fastfood restaurant coffee bakery bar liquor grocery foodtruck clothing gun tech jewelry pawn cardealer furniture trucking boxtruck taxi moving construction autorepair gas hotel apartments farm brewery'.split(' ');
for (const id of need) assert.ok(D.bizTypes[id], 'missing ' + id); ok('all requested types exist');
// every type: found, 1 year of finance, 20 years of ticks without NaN/crash
let loss = [];
for (const [id, t] of ext) {
  const s = mk(11); s.sl.licenses = ['drivers']; s.social = { accounts: { chirpr: { followers: 50000 } } }; Plus.ensure(s, { type: id, equip: {}, staff: [] });
  assert.equal(Plus.canFound(s, id), '', id + ': ' + Plus.canFound(s, id));
  const r = Plus.found(s, id); assert.ok(r.ok, id); const b = r.biz; const f = Biz.annualFinance(s, b);
  assert.ok(Number.isFinite(f.profit) && f.revenue > 0, id + ' revenue');
  if (f.profit <= 0) loss.push(id);
  for (let y = 0; y < 15; y++) { s.report = []; s.age += 1; Biz.tickBiz(s, b, 1); Plus.yearTick(s); assert.ok(Number.isFinite(s.cash), id + ' cash NaN'); }
  const d = Plus.detail(s, b); assert.ok(d.upgrades.length >= 3 && d.risks.length >= 2, id + ' detail'); assert.equal(!!d.fleet, !!t.fleet);
}
assert.equal(loss.length, 0, 'unprofitable at start: ' + loss); ok('every type founds, is profitable at start, survives 15 yrs of ticks + risks');
// requirements
{ const s = mk(); s.age = 19; for (const id of ['bar', 'liquor', 'brewery', 'gas', 'gun', 'pawn', 'cardealer']) assert.match(Plus.canFound(s, id), /21/, id); s.age = 22; s.edu = 1;
  assert.match(Plus.canFound(s, 'law'), /25|graduate/); assert.match(Plus.canFound(s, 'dental'), /28|graduate/); s.age = 30; assert.match(Plus.canFound(s, 'dental'), /graduate/); assert.match(Plus.canFound(s, 'accounting'), /college/);
  s.edu = 3; s.sl.licenses = []; assert.match(Plus.canFound(s, 'trucking'), /driver/); s.sl.licenses = ['drivers']; assert.equal(Plus.canFound(s, 'trucking'), '');
  s.cash = 1000; assert.match(Plus.canFound(s, 'hotel'), /startup cash/); ok('age 21+, degree, driver license and cash requirements'); }
{ const s = mk(); assert.equal(Plus.canFound(s, 'gun'), ''); s.record.sentences = 1; assert.match(Plus.canFound(s, 'gun'), /clean record/); assert.match(Plus.canFound(s, 'pawn'), /clean record/); assert.equal(Plus.canFound(s, 'gym'), ''); ok('gun store / pawn / bar need a clean record');
  s.record.sentences = 0; const b = Plus.found(s, 'gun').biz; const f0 = Biz.annualFinance(s, b); s.record.sentences = 1; Plus.yearTick(s); assert.ok(b.susp >= 1 && Biz.annualFinance(s, b).revenue === 0 && f0.revenue > 0); ok('conviction suspends the gun license (revenue 0 while closed)'); }
// upgrades
{ const s = mk(); const b = Plus.found(s, 'restaurant').biz; const f0 = Biz.annualFinance(s, b); const r = Plus.buyUpgrade(s, b, 'marketing'); assert.ok(r.ok && !Plus.buyUpgrade(s, b, 'marketing').ok);
  Plus.buyUpgrade(s, b, 'efficiency'); const f1 = Biz.annualFinance(s, b); assert.ok(f1.cogs / (f1.revenue || 1) < f0.cogs / f0.revenue); const d = Plus.detail(s, b); assert.ok(d.upgrades.filter((u) => u.owned).length === 2); ok('upgrades apply and cannot be bought twice'); }
// fleets
{ const s = mk(); s.sl.licenses = ['drivers']; const t = D.bizTypes.trucking, cash0 = s.cash; const b = Plus.found(s, 'trucking').biz; assert.equal(b.fleet.n, 2); assert.equal(Math.round(cash0 - s.cash), Plus.startCost(s, 'trucking')); assert.ok(Plus.startCost(s, 'trucking') >= 300000, 'semis are expensive');
  const f = Biz.annualFinance(s, b); assert.ok(f.fuel > 0 && f.ins > 0 && f.units === 2); const f0 = f.fuel; s.fuel = 1.5; assert.ok(Biz.annualFinance(s, b).fuel > f0 * 1.4); s.fuel = 1; ok('fuel cost scales with the fuel index');
  assert.ok(Plus.fleetAction(s, b, 'buy').ok && b.fleet.n === 3); assert.ok(Biz.annualFinance(s, b).units === 2, 'a truck without a driver earns nothing'); assert.ok(Plus.fleetAction(s, b, 'driver').ok && Biz.annualFinance(s, b).units === 3); ok('buy truck, hire driver');
  while (Plus.fleetAction(s, b, 'buy').ok); assert.equal(b.fleet.n, Plus.vehCap(b, t)); assert.match(Plus.fleetAction(s, b, 'buy').err, /full/); assert.ok(Biz.buyEquip(s, b, 'depot') && Plus.fleetAction(s, b, 'buy').ok); ok('depot cap raised by buying a depot block');
  let acc = 0; for (let seed = 1; seed < 30; seed++) { const q = mk(seed); q.sl.licenses = ['drivers']; const x = Plus.found(q, 'taxi').biz; for (let y = 0; y < 20; y++) { q.report = []; Plus.yearTick(q); } acc += x.fleet.accidents; } assert.ok(acc > 20, 'accidents happen: ' + acc); ok('fleet accidents occur (' + acc + ' in 29 x 20 taxi-years)');
  b.fleet.cond = 30; const c0 = b.fleet.cond; assert.ok(Plus.fleetAction(s, b, 'service').ok && b.fleet.cond > c0); const sell = Plus.fleetAction(s, b, 'sell'); assert.ok(sell.ok); ok('service and sell vehicles');
  assert.ok(Biz.valuation(s, b) > b.fleet.n * t.fleet.vehicle.cost * 0.3, 'valuation includes vehicles'); const sold = Biz.sell(s, b); assert.ok(sold > 0); ok('selling a fleet business pays out'); }
// trust: heir under 18 -> 40% trustee fee
{ const s = mk(); const b = Plus.found(s, 'gym').biz; const c0 = s.cash; Biz.tickBiz(s, b, 1); const g1 = s.cash - c0; b.trust = true; const c1 = s.cash; s.fuel = 1; Biz.tickBiz(s, b, 1); const g2 = s.cash - c1; assert.ok(g2 < g1 * 0.75, `trust ${g2} vs ${g1}`); ok('trust-held businesses pay a trustee fee'); }
// offers include extended types
{ const s = mk(); let n = 0; for (let y = 0; y < 10; y++) { Biz.refreshOffers(s); n += s.offers.filter((o) => D.bizTypes[o.type] && D.bizTypes[o.type].x).length; } assert.ok(n > 15); ok('extended types appear as offers for sale'); }
console.log('BIZ TESTS PASSED');
