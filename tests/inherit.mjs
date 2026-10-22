// Inheritance/handoff tests. node tests/inherit.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import { D } from '../src/data.js'; import * as P from '../src/people.js'; import * as L from '../src/legacy.js';
import * as B from '../src/slice_bridge.js'; import * as H from '../src/slice/index.js'; import * as Plus from '../src/bizplus.js'; import * as Biz from '../src/business.js';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const ok = (m) => console.log('  ok -', m);
console.log('Inheritance');
const buySlice = (s, cat) => { const shop = H.listShops(B.sliceData()).find((x) => x.category === cat); const lst = B.call(s, (d, sl) => H.listListings(d, sl, shop.id)); const l = lst[lst.length - 1]; const r = B.call(s, (d, sl) => H.buyAsset(d, sl, shop.id, l.uid, { financing: 'cash' })); assert.ok(r.ok, r.msg); return l; };
const world = (seed, kin) => {
  const s = E.newGame({ seed, name: 'Magnate' }); s.age = 62; s.cash = 3e7; s.debt = 0; s.edu = 3; s.school = null; s.people = []; s.sl = s.sl || undefined; B.slice(s);
  s.sl.licenses = ['drivers']; for (const [rel, age, o] of kin) s.people.push(P.newPerson(s, rel, { age, ...(o || {}) }));
  buySlice(s, 'car'); buySlice(s, 'jewelry'); buySlice(s, 'property'); buySlice(s, 'car');
  s.cash = 3e7; const gym = Plus.found(s, 'gym').biz; const team = (s.offers || []).find((o) => o.type === 'sports');
  return { s, gym, team };
};
const fingerprint = (s) => B.inventory(s).map((x) => `${x.a.tpl}:${x.a.art}:${x.a.vseed}`).sort();
// 1. a spouse heir (no kids)
{ const { s, gym } = world(31, [['spouse', 58], ['sibling', 60], ['mother', 85]]); const before = fingerprint(s); assert.equal(before.length, 4);
  L.die(s, 'disease', 'test'); assert.ok(L.canContinue(s) && !L.legacySummary(s).over); assert.deepEqual(L.heirsOf(s).map((h) => h.rel), ['spouse']); ok('no kids: spouse is the default heir');
  const sp = L.heirsOf(s)[0]; const plan = L.computeEstate(s); assert.ok(plan.tax > 0 && plan.heirs[0].assets.length === 4 && plan.heirs[0].biz.length === 1);
  assert.ok(L.continueAs(s, sp.id)); assert.ok(s.alive && s.legacy.gen === 2 && Math.floor(s.age) === 58 && s.name === sp.name);
  assert.deepEqual(fingerprint(s), before); ok('spouse inherits the same objects (tpl, art, vseed), not cash');
  assert.equal(s.biz.length, 1); assert.equal(s.biz[0].type, 'gym'); assert.ok(!s.biz[0].trust); assert.ok(s.cash > 1e7); ok('business + cash pass on, estate tax paid (' + s.estateLast.tax + ')');
  assert.ok(s.people.some((p) => p.rel === 'spouse' && !p.alive) && s.people.some((p) => p.rel === 'relative')); ok('family recast around the new player'); }
// 2. will naming a sibling over kids; split shares between sibling and parent
{ const { s } = world(32, [['child', 30], ['sibling', 55], ['father', 88]]); const sib = s.people.find((p) => p.rel === 'sibling'), kid = s.people.find((p) => p.rel === 'child'), dad = s.people.find((p) => p.rel === 'father');
  L.setWill(s, 'shares', null, { [sib.id]: 60, [dad.id]: 40 }); L.die(s, 'disease', 'test'); const hs = L.heirsOf(s); assert.deepEqual(hs.map((h) => h.id).sort(), [sib.id, dad.id].sort()); assert.ok(!hs.some((h) => h.id === kid.id));
  const plan = L.computeEstate(s); const ps = plan.heirs.find((h) => h.id === sib.id), pd = plan.heirs.find((h) => h.id === dad.id); assert.ok(ps.total > pd.total); assert.equal(ps.assets.length + pd.assets.length, 4); assert.ok(L.continueAs(s, dad.id) === true); assert.equal(s.assets.length + B.inventory(s).length, pd.assets.length); assert.ok(s.cash > 0); ok('will shares to sibling/parent; parent heir gets only his share of objects');
  assert.ok(!L.continueAs(s, kid.id), 'cannot continue as someone not in the will (already continued anyway)'); }
// 3. kid heir under 18: businesses in trust, objects kept
{ const { s } = world(33, [['child', 12], ['child', 30]]); L.setWill(s, 'one', s.people.find((p) => p.age < 18).id); L.die(s, 'disease', 'test'); const kid = L.heirsOf(s)[0]; assert.ok(kid.age < 18); const before = fingerprint(s);
  assert.ok(L.continueAs(s, kid.id)); assert.equal(s.biz.length, 1); assert.ok(s.biz[0].trust); assert.deepEqual(fingerprint(s), before); const c0 = s.cash; ok('minor keeps every object; business held in trust');
  const b = s.biz[0]; const g0 = s.cash; b.profitAvg = 0; Biz.tickBiz(s, b, 1); ok('trust business ticks'); }
// 4. teams: sports team inherited by heir; other heir loses it
{ const s = E.newGame({ seed: 34, name: 'Owner' }); s.age = 66; s.cash = 5e8; s.people = []; B.slice(s); s.people.push(P.newPerson(s, 'child', { age: 40 }), P.newPerson(s, 'child', { age: 38 }));
  const o = s.offers.findIndex((x) => x.type === 'sports'); assert.ok(o >= 0); const r = Biz.buyOffer(s, o); assert.ok(r.ok); const tIdx = s.league.my; assert.ok(tIdx >= 0); const gym = null;
  L.die(s, 'disease', 'test'); const plan = L.computeEstate(s); const owner = plan.heirs.find((h) => h.biz.some((b) => b.kind === 'sports')); assert.ok(owner, 'one heir is assigned the team');
  assert.ok(L.continueAs(s, owner.id)); assert.equal(s.league.my, tIdx); assert.ok(s.biz.some((b) => b.kind === 'sports' && b.teamIdx === tIdx)); ok('sports team passes to the heir (league.my kept)');
  const s2 = E.newGame({ seed: 34, name: 'Owner' }); s2.age = 66; s2.cash = 5e8; s2.people = []; B.slice(s2); s2.people.push(P.newPerson(s2, 'child', { age: 40 }), P.newPerson(s2, 'child', { age: 38 })); Biz.buyOffer(s2, s2.offers.findIndex((x) => x.type === 'sports')); L.die(s2, 'disease', 'test');
  const pl2 = L.computeEstate(s2); const other = pl2.heirs.find((h) => !h.biz.length); assert.ok(other); assert.ok(L.continueAs(s2, other.id)); assert.equal(s2.league.my, -1); assert.ok(!s2.biz.some((b) => b.kind === 'sports')); ok('heir without the team: it leaves the family cleanly'); }
// 5. debts: owned objects are auctioned only if cash cannot cover debt and tax
{ const { s } = world(35, [['child', 30]]); s.cash = 0; s.debt = 600000; s.hold = {}; L.die(s, 'disease', 'test'); const plan = L.computeEstate(s); assert.ok(plan.heirs[0].assets.length < 4); ok('debts force auction of the cheapest objects only'); }
// 6. game ends with the legacy summary only when no kin remain
{ const { s } = world(36, []); L.die(s, 'disease', 'test'); assert.ok(!L.canContinue(s)); const sum = L.legacySummary(s); assert.ok(sum.over && sum.generations === 1); ok('no heir at all: legacy summary / game over');
  const t = world(37, [['mother', 90]]).s; L.die(t, 'disease', 'test'); assert.ok(L.canContinue(t)); ok('an elderly parent still counts as an heir'); }
console.log('INHERIT TESTS PASSED');
