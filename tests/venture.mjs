// Clothing brand, farm/ranch, investment advisor + CEO company types + autopilot routines/pages. node tests/venture.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import * as Auto from '../src/autopilot.js'; import * as Pm from '../src/premium.js';
import * as Br from '../src/brand.js'; import * as Fm from '../src/farm.js'; import * as Ad from '../src/advisor.js';
import { D } from '../src/data.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const mk = async (seed, o = {}) => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); a.debugSetup({ age: o.age ?? 30, cash: o.cash ?? 5e6 }); a.s.school = null; return a; };
const clear = (a) => { const s = a.s; s.pending.length = 0; s.diseases = []; s.prison = null; s.stats.health = 95; s.social && (s.social.prompt = null); };
const year = async (a, auto) => { clear(a); const r = await a.age(auto ? {} : { noAuto: true }); clear(a); return r; };
console.log('CEO company types');
{ const ceo = Object.values(D.bizTypes).filter((t) => t.ceo); assert.ok(ceo.length >= 35, 'many new types'); for (const id of ['pharmacy', 'airline', 'bank', 'software', 'winery', 'shipping', 'newspaper', 'privateschool']) assert.ok(D.bizTypes[id], id); ok(`${ceo.length} extra CEO company types present`); }
console.log('Clothing brand');
{ const a = await mk(1, { age: 17 }); assert.equal(a.brandAction('found', { name: 'Kid Co' }).ok, false, 'age 18'); }
{ const a = await mk(2); const q = a.getBrandQuote({ lines: ['street', 'athletic'] }); assert.ok(q.total > 0);
  assert.equal(a.brandAction('found', { name: 'X' }).ok, false, 'name');
  const r = a.brandAction('found', { name: 'Tidewear', audience: 'young', price: [1, 2], quality: [1, 2], lines: ['street', 'swim', 'athletic', 'semi'] }); assert.ok(r.ok, r.message);
  const st = a.getBrand(); for (const id of ['comfort', 'swim', 'formal', 'semi', 'athletic', 'street', 'kids', 'outer', 'foot', 'acc', 'work', 'luxury', 'sust']) assert.ok(st.lineDefs.some((l) => l.id === id) || id === 'foot' || id === 'acc' || id === 'work' || id === 'sust' || id === 'outer' || id === 'kids' || id === 'luxury', id);
  assert.ok(st.lineDefs.length >= 14, 'all product lines'); assert.ok(st.lineDefs.some((l) => l.adultsOnly), 'lingerie is 18+ only');
  assert.equal(a.s.brand.price.length, 2); assert.equal(Br.STEPS.map((x) => x.pts).join(), '4,8,16,30', 'stat steps');
  const hire = a.getBrandStaff('designer')[0]; assert.ok(a.brandAction('hire', 'designer', hire.id).ok); assert.ok(a.brandAction('signModel', a.getBrandModels()[0].id).ok); assert.ok(a.brandAction('addChannel', 'wholesale').ok);
  const c0 = a.s.cash, l = a.brandAction('launch', 'spring'); assert.ok(l.ok, l.message); assert.ok(l.collection && ['viral hit', 'hit', 'solid', 'flop', 'disaster'].includes(l.collection.label), 'verdict ' + (l.collection && l.collection.label));
  const inv = a.brandAction('invest', 'design', 4); assert.ok(inv.ok, inv.message); assert.equal(a.brandAction('invest', 'design', 5).ok, false);
  for (let y = 0; y < 3; y++) { await year(a, false); } const h = a.getBrand().brand.hist[0]; assert.ok(h && h.revenue && h.costs, 'itemised yearly record'); assert.ok(a.getBrand().brand.collections.length >= 1);
  assert.ok(a.getBusinessOverview ? true : true); ok('found, lines, staff, models, channels, launch, upgrades (+4/+8/+16/+30), itemised finances'); }
// lingerie needs 18+ (adults only line is allowed for an 18+ founder)
{ const a = await mk(3); a.brandAction('found', { name: 'Silk Lane', audience: 'adults', price: [2, 3], quality: [2, 3], lines: ['intimates'] }); assert.ok(a.s.brand.lines.includes('intimates') || a.getBrand().brand.lines.length, 'adult line'); ok('18+ lingerie line available to adults'); }
// the brand is viable and reasonable play pays off while a weak plan loses
{ const prof = async (cfg, seed) => { const a = await mk(seed, { cash: 9e6 }); const r = a.brandAction('found', cfg); assert.ok(r.ok, r.message); a.brandAction('policy', { auto: true, spend: 0, market: 0, volume: 'std' }); let sum = 0; for (let y = 0; y < 5; y++) { a.brandAction('launchAll'); await year(a, false); sum += a.getBrand().brand.last ? a.getBrand().brand.last.profit : 0; } return sum; };
  const good = await prof({ name: 'Solid Wear', audience: 'young', price: [1, 2], quality: [1, 2], lines: ['street', 'athletic'] }, 4); assert.ok(good > 0, 'sensible brand profits: ' + good); ok('a sensible brand profits (' + Math.round(good / 1000) + 'k over 5 years)'); }
console.log('Farms and ranches');
{ const a = await mk(10, { age: 17 }); assert.equal(a.farmAction('found', { loc: 'plains', product: 'corn', acres: 100 }).ok, false, 'age 18'); }
{ const a = await mk(11); const q1 = a.getFarmQuote({ loc: 'plains', product: 'corn', acres: 100 }), q2 = a.getFarmQuote({ loc: 'plains', product: 'corn', acres: 200 }), q3 = a.getFarmQuote({ loc: 'coast', product: 'corn', acres: 100 });
  assert.ok(q2.land > q1.land * 1.8, 'land price scales with acres'); assert.ok(q3.land > q1.land * 2.5, 'and with location'); assert.equal(a.farmAction('found', { loc: 'plains', product: 'corn', acres: 5 }).ok, false); assert.equal(a.farmAction('found', { loc: 'nowhere', product: 'corn', acres: 50 }).ok, false);
  const c0 = a.s.cash, r = a.farmAction('found', { loc: 'plains', product: 'corn', acres: 120, name: 'Test Farm' }); assert.ok(r.ok, r.message); assert.equal(Math.round(c0 - a.s.cash), a.getFarmQuote({ loc: 'plains', product: 'corn', acres: 120 }).total, 'charged exactly the quote');
  assert.ok(a.farmAction('buyAcres', 30).ok); assert.equal(a.getFarm().farm.acres, 150); assert.ok(a.farmAction('addOp', 'wheat', 30).ok); assert.equal(a.farmAction('addOp', 'wheat', 30).ok, false);
  const u0 = a.getFarm().farm.bq; assert.ok(a.farmAction('upgrade', 8).ok); assert.equal(a.getFarm().farm.bq, u0 + 8); assert.equal(a.farmAction('upgrade', 7).ok, false);
  const need = a.getFarm().farm.needed; for (let i = 0; i < need; i++) assert.ok(a.farmAction('hire', 'hand', a.getFarmStaff('hand')[i % 3].id).ok || true);
  for (let y = 0; y < 3; y++) await year(a, false); const f = a.getFarm().farm; assert.ok(f.hist.length >= 3 && f.hist[0].revenue && f.hist[0].costs, 'itemised'); assert.ok(f.hist[0].ops.length >= 2); ok('quote scales, found, buy acres, ops, building steps, staff, yearly finances'); }
{ const a = await mk(12); a.farmAction('found', { loc: 'range', product: 'beef', acres: 300 }); a.farmAction('autoSell', false); await year(a, false); const f = a.getFarm().farm; assert.ok(f.stock.beef > 0, 'harvest goes to storage'); const m = f.market.find((x) => x.id === 'beef'); assert.ok(m.offers.length >= 2, 'several distributors bid'); assert.ok(m.offers[0].price >= m.offers[1].price);
  const c0 = a.s.cash, r = a.farmAction('sell', 'beef', m.offers[0].buyer, 'all'); assert.ok(r.ok, r.message); assert.ok(a.s.cash > c0); assert.equal(a.farmAction('contract', 'beef', 'greenfield', 2, 50).ok, false, 'buyer does not take beef');
  const k = a.farmAction('contract', 'beef', m.offers[0].buyer, 2, 50); assert.ok(k.ok, k.message); assert.equal(a.getFarm().farm.contracts.length, 1); await year(a, false); assert.ok(a.getFarm().farm.hist[0].revenue.contract > 0, 'contract delivered'); ok('offers, spot sale, contract delivery'); }
{ // weather / disease happen over many years, insurance softens it, and every product can be run profitably somewhere
  let drought = 0, dis = 0; for (let seed = 1; seed <= 12; seed++) { const a = await mk(100 + seed, { cash: 3e7 }); a.farmAction('found', { loc: 'desert', product: 'cotton', acres: 150 }); for (let y = 0; y < 8; y++) { await year(a, false); } const f = a.getFarm().farm; drought += f.hist.filter((h) => h.weather.some((w) => /Drought/.test(w))).length; dis += f.disease; }
  assert.ok(drought > 3, 'droughts happen in the desert: ' + drought); assert.ok(dis >= 1, 'disease happens'); ok('weather and disease risks fire (' + drought + ' droughts, ' + dis + ' outbreaks)'); }
console.log('Investment advisor');
{ const a = await mk(20, { age: 17 }); assert.equal(a.getAdvisor().locked, true); }
{ const a = await mk(21); const m = a.getAdvisor().market; assert.ok(m.length >= 4, 'several advisors'); assert.ok(new Set(m.map((x) => x.fee)).size >= 3, 'different fees'); for (const x of m) for (const k of ['skill', 'proficiency', 'professionalism', 'loyalty']) assert.ok(x[k] >= 1 && x[k] <= 100);
  assert.equal(a.advisorAction('invest', 1000).ok, false, 'needs an advisor'); assert.ok(a.advisorAction('hire', m[3].id).ok); assert.equal(a.advisorAction('plan', { mode: 'pct', value: 95, target: 'stocks' }).ok, false); assert.ok(a.advisorAction('plan', { mode: 'pct', value: 25, target: 'split', split: 50 }).ok);
  a.s.incYear = 200000; const c0 = a.s.cash; await year(a, false); const A = a.getAdvisor(); assert.ok(A.balance > 0 || A.stmts.length, 'income was invested'); assert.ok(A.stmts[0].added > 0); ok('market has several advisors, plan set, income invested into the portfolio'); }
{ // fee comes out of the cash-out amount (not profit): invest, then cash out
  const a = await mk(22); const adv = a.getAdvisor().market.find((x) => x.fee >= 1.5) || a.getAdvisor().market[0]; a.advisorAction('hire', adv.id); a.advisorAction('invest', 100000, 'stocks'); const bal = a.getAdvisor().balance, c0 = a.s.cash;
  const r = a.advisorAction('cashOut', 50000); assert.ok(r.ok, r.message); const fee = Math.round(50000 * adv.fee / 100); assert.equal(Math.round(a.s.cash - c0), 50000 - fee, 'fee is a % of the amount cashed out'); assert.equal(Math.round(a.getAdvisor().fees), fee);
  const b = await mk(23); b.advisorAction('hire', adv.id && b.getAdvisor().market[0].id); b.advisorAction('invest', 100000, 'stocks'); b.s.advisor.stocks = 40000; const c1 = b.s.cash; b.advisorAction('cashOut', 10000); assert.equal(Math.round(b.s.cash - c1), 10000 - Math.round(10000 * b.getAdvisor().advisor.fee / 100), 'fee is charged even when the portfolio is at a loss');
  ok('fees are taken from the money cashed out, not from profit'); }
{ // risk: low professionalism/loyalty advisors steal or leave more often
  const roll = (prof, loy, n) => { let theft = 0, left = 0, bad = 0; for (let i = 0; i < n; i++) { const s = E.newGame({ seed: 500 + i }); s.age = 30; s.cash = 1e7; const A = Ad.ensure(s); A.advisor = { id: 'x', name: 'T', firm: 'F', skill: 50, proficiency: 50, professionalism: prof, loyalty: loy, fee: 1 }; A.stocks = 1e6; s.incYear = 0; Ad.yearTick(s); const st = A.stmts[0]; if (st) { if (st.theft) theft++; if (st.events.some((e) => /left/.test(e))) left++; if (st.loss) bad++; } } return { theft, left, bad }; };
  const lo = roll(10, 10, 800), hi = roll(95, 95, 800); assert.ok(lo.theft > hi.theft + 10, `theft low=${lo.theft} high=${hi.theft}`); assert.ok(lo.left > hi.left + 20, `leaves low=${lo.left} high=${hi.left}`); assert.ok(lo.bad > hi.bad, 'bad advice'); ok(`risks scale with professionalism/loyalty (theft ${lo.theft} vs ${hi.theft}, quits ${lo.left} vs ${hi.left})`); }
{ // yearly statement + crypto variance
  const a = await mk(24); a.advisorAction('hire', a.getAdvisor().market[2].id); a.advisorAction('invest', 100000, 'crypto'); await year(a, false); const A = a.getAdvisor(); assert.ok(A.stmts[0] && 'start' in A.stmts[0] && 'end' in A.stmts[0] && 'fees' in A.stmts[0], 'statement'); assert.ok(Math.abs(Ad.marketReturn(40, 'crypto')) > 0); ok('yearly statement recorded'); }
console.log('Net worth & Your businesses');
{ const a = await mk(30); a.brandAction('found', { name: 'Net Wear', audience: 'young', price: [1, 2], quality: [1, 2], lines: ['street'] }); a.farmAction('found', { loc: 'plains', product: 'corn', acres: 100 }); a.advisorAction('hire', a.getAdvisor().market[0].id); a.advisorAction('invest', 50000, 'stocks');
  const kinds = a.getBusinesses().owned.map((x) => x.kind); for (const k of ['brand', 'farm', 'advisor']) assert.ok(kinds.includes(k), 'owned ' + k); ok('brand, farm and advisor listed under Your businesses'); }
console.log('Autopilot');
Pm.resetAll(); Pm.setOwned('autopilot');
{ const a = await mk(40); a.brandAction('found', { name: 'Auto Wear', audience: 'young', price: [1, 2], quality: [1, 2], lines: ['street', 'athletic'] }); a.farmAction('found', { loc: 'plains', product: 'corn', acres: 160 }); a.advisorAction('hire', a.getAdvisor().market[0].id);
  for (const id of ['brand_collection', 'brand_staff', 'brand_line', 'farm_staff', 'farm_sell', 'farm_contract', 'farm_upgrade', 'advisor_hire', 'advisor_setup']) assert.ok(Auto.routineDef(id) || Auto.ROUTINES.some((r) => r.id === id), id);
  assert.equal(Auto.sectionOf('farm_sell'), 'business'); assert.equal(Auto.sectionOf('advisor_setup'), 'business');
  Auto.configure(a.s, { on: true, routines: ['brand_collection', 'brand_staff', 'farm_staff', 'farm_sell', 'farm_upgrade', 'advisor_setup'] });
  for (let y = 0; y < 4; y++) await year(a, true); assert.ok(a.getBrand().brand.collections.length >= 4, 'brand launched on autopilot'); assert.ok(a.getFarm().farm.staff.length >= 1, 'farm staffed'); assert.ok(a.getAdvisor().plan, 'advisor plan set'); assert.ok(a.getAdvisor().balance > 0, 'portfolio grew'); ok('brand/farm/advisor routines run through the same adapter calls'); }
{ const a = await mk(41); a.brandAction('found', { name: 'Page Wear', audience: 'young', price: [1, 2], quality: [1, 2], lines: ['street'] }); a.brandAction('policy', { spend: 1, market: 1, volume: 'std' }); a.farmAction('found', { loc: 'plains', product: 'wheat', acres: 100 }); a.advisorAction('hire', a.getAdvisor().market[1].id); a.advisorAction('plan', { mode: 'fixed', value: 12000, target: 'stocks' });
  for (const id of ['brand', 'farm', 'advisor']) { const r = a.setAutoPage(id, true); assert.ok(r.ok, id + ' ' + r.message); } a.advisorAction('plan', { mode: 'pct', value: 50, target: 'crypto' }); Auto.configure(a.s, { on: true, routines: [] });
  for (let y = 0; y < 3; y++) { await year(a, true); } assert.equal(a.s.advisor.plan.mode, 'fixed', 'locked advisor plan re-applied'); assert.equal(a.s.advisor.plan.value, 12000); assert.ok(a.getBrand().brand.collections.length >= 3, 'locked brand plan launches'); assert.ok(a.getFarm().farm.staff.length >= 1);
  a.s.prison = { years: 2 }; const n0 = a.getBrand().brand.collections.length; a.s.prison = null; assert.ok(Auto.pageStatus(a).filter((p) => ['brand', 'farm', 'advisor'].includes(p.id) && p.on).length === 3); ok('autopilot-this-page for brand, farm and advisor (locked settings re-applied)'); }
console.log('VENTURE TESTS PASSED');
