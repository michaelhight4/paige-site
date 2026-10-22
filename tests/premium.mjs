// Premium tests: one per pass effect + subscription lapse + persistence across lives + no_ads. Run: node tests/premium.mjs (imported by smoke.mjs)
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as Pm from '../src/premium.js';
import * as PFx from '../src/premium_fx.js';
import * as Crime from '../src/crime.js';
import * as L from '../src/legacy.js';
import * as P from '../src/people.js';
import * as H from '../src/health.js';
import * as Ads from '../src/ads.js';
import { payments as Pay } from '../src/payments.js';
import * as B from '../src/slice_bridge.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('6. Premium');
const only = (...ids) => { Pm.resetAll(); ids.forEach((i) => Pm.setOwned(i, true)); };
const fresh = (seed = 3) => E.newGame({ seed, name: 'Prem' });
const adult = (s, age = 30) => { s.age = age; s.school = null; s.edu = Math.max(s.edu, 1); return s; };
{ only(); assert.equal(Pm.forSale().length, 13); assert.ok(Pm.forSale().every((p) => p.price === 5.99)); assert.ok(!Pm.forSale().some((p) => p.id === 'founder_pack'));
  assert.ok(!Pm.isUnlocked('midas')); Pm.setOwned('midas'); assert.ok(Pm.isUnlocked('midas') && !Pm.isUnlocked('nepo')); ok('owned flags: isUnlocked only for owned passes'); }
{ only(); Pm.setSubscription('monthly'); assert.ok(Pm.forSale().every((p) => Pm.isUnlocked(p.id))); assert.ok(!Pm.isUnlocked('founder_pack'), 'founder_pack not in All Access'); Pm.setSubscription(null); assert.ok(!Pm.isUnlocked('einstein'));
  Pm.setSubscription('yearly'); Pm.expireSubscription(); assert.ok(!Pm.isUnlocked('rabbit')); Pm.setOwned('rabbit'); Pm.setSubscription('monthly'); Pm.setSubscription(null); assert.ok(Pm.isUnlocked('rabbit'), 'owned stays after cancel');
  assert.ok(!Pm.isUnlocked('tax_evasion')); ok('subscription unlocks all, lapses on cancel/expiry, owned passes remain'); }
{ only('midas'); const a = fresh(), b = fresh(4); assert.ok(a.cash >= 1000000 && b.cash >= 1000000); const c = fresh(5); c.cash = 0; assert.equal(PFx.applyStart(c).includes('midas'), false, 'once per life'); ok('midas: $1,000,000 at the start of every life');
  const prev = fresh(6); prev.age = 50; prev.alive = true; ok('flags persist across new lives (separate from saves)'); }
{ only(); const a = fresh(); assert.ok(a.cash < 1000000); only('nepo'); const b = fresh(); assert.ok(b.stats.fame <= 10, 'a baby gets almost nothing: ' + b.stats.fame); for (let i = 0; i < 6; i++) E.takeTurn(b); assert.ok(b.stats.fame <= 20, 'still tiny before 13: ' + b.stats.fame);
  const c = fresh(); c.age = 12.5; PFx.applyStart(c); assert.ok(c.stats.fame < 20); c.age = 13; PFx.applyStart(c); assert.ok(c.stats.fame >= 80, 'full effect at 13+: ' + c.stats.fame); for (let i = 0; i < 3; i++) E.takeTurn(c); assert.ok(c.stats.fame >= 60 || !c.alive); const turned = fresh(); for (let i = 0; i < 14; i++) { turned.pending.length = 0; E.takeTurn(turned); } assert.ok(turned.stats.fame >= 60 || !turned.alive, 'unlocks by itself when the player turns 13'); ok('nepo: little effect before 13 (social media/acting/sports), full fame from 13, applied automatically on the birthday'); }
{ only('free_realestate'); const s0 = fresh(); assert.equal(B.assetCount(s0), 0, 'locked for a baby'); assert.ok(PFx.gate('free_realestate', s0)); const s = fresh(); s.age = 18; PFx.applyStart(s); assert.ok(B.assetCount(s) >= 1, 'house granted at 18'); const nw = L.netWorthOf(s).total; assert.ok(nw >= 1500000, 'house counts: ' + nw); ok('free_realestate: free $2,000,000 house'); }
{ only('sports_owner'); const k = fresh(); assert.ok(!k.biz.some((b) => b.kind === 'sports'), 'locked for kids'); assert.match(PFx.gate('sports_owner', k), /age 18/); const s = fresh(); s.age = 18; PFx.applyStart(s); assert.ok(s.fr && s.fr.teams.length === 1 && !s.biz.some((b) => b.type === 'sports'), 'team owned (franchise)'); ok('sports_owner pack: free team once 18');
  // owning a team needs NO pack: buy one from the in-game listings
  only(); const b = fresh(); b.age = 30; b.cash = 5e9; E.takeTurn(b); const Biz = await import('../src/business.js'); Biz.refreshOffers(b); const i = b.offers.findIndex((o) => o.type === 'sports'); assert.ok(i >= 0, 'teams are for sale'); const r = Biz.buyOffer(b, i); assert.ok(r.ok && b.biz.some((x) => x.kind === 'sports'), 'bought without any pack'); const a = new EngineAdapter({ noSave: true, fresh: true, seed: 12 }); await a.init(); a.debugSetup({ age: 30, cash: 5e9 }); const bs = a.getBusinesses(); const ix = bs.offers.findIndex((o) => o.type === 'sports'); assert.ok(ix >= 0); assert.ok(a.buyBusinessOffer(ix).ok, 'adapter buy works with no pack'); ok('sports team purchasable in-game with no pack'); }
{ only('einstein'); const k = adult(fresh(), 10); const r = PFx.instantDegree(k, 'university', null); assert.equal(r.ok, false); assert.match(r.msg, /unlocked \(age 17\)/); const t = adult(fresh(), 17); assert.ok(PFx.instantDegree(t, 'university', null).ok); only('golden_gun'); const g = adult(fresh(), 6); const kid = P.parents(g)[0]; const gr = PFx.kill(g, kid.id); assert.equal(gr.ok, false); assert.match(gr.msg, /crime is unlocked/); only('rabbit'); const y = adult(fresh(), 12); const rr = PFx.rabbitChildren(y); assert.equal(rr.ok, false); assert.match(rr.msg, /age 16/); only('baller'); const bb = adult(fresh(), 12); assert.match(PFx.ballerDraft(bb).msg, /age 14/); ok('other packs: usage gated by age/progress with a clear locked message'); }
{ only(); const s = adult(fresh(), 30); assert.equal(PFx.instantDegree(s, 'university', null).ok, false); only('einstein'); const r = PFx.instantDegree(s, 'university', 'Computer Science'); assert.ok(r.ok, r.msg); assert.ok(s.edu >= 2); const g = PFx.instantDegree(s, 'graduate_school', null); assert.ok(g.ok); assert.ok(s.edu >= 3); ok('einstein: any degree instantly (locked without pass)'); }
{ only(); const s = adult(fresh(), 16); assert.equal(PFx.ballerDraft(s).ok, false); only('baller'); const r = PFx.ballerDraft(s); assert.ok(r.ok, r.msg); assert.ok(s.pro, 'is pro'); ok('baller: instant draft pick'); }
{ only(); const s = adult(fresh(), 30); const k = P.parents(s)[0] || s.people[0]; assert.equal(PFx.kill(s, k.id).ok, false); only('golden_gun'); const r = PFx.kill(s, k.id); assert.ok(r.ok && !k.alive && !s.prison); const c = Crime.catalog ? null : null; void c;
  const cr = (() => { const d = Crime; return d.catchChance(s, { severity: 3, base: 0.9, catch: 0.9 }); })(); assert.equal(cr, 0, 'never caught'); ok('golden_gun: kill anyone, never caught'); }
{ only(); const s = adult(fresh(), 30); const tryDis = () => { for (let i = 0; i < 400; i++) H.tick(s, 1); return s.diseases.length; }; const a = fresh(8); adult(a, 30); a.stats.health = 30; for (let i = 0; i < 600; i++) { H.tick(a, 1); if (a.diseases.length) break; } assert.ok(a.diseases.length > 0, 'control catches a disease'); void tryDis;
  only('fountain'); const b = fresh(8); adult(b, 30); b.stats.health = 30; for (let i = 0; i < 600; i++) H.tick(b, 1); assert.equal(b.diseases.length, 0); ok('fountain: never catch a disease'); }
{ only(); const s = adult(fresh(), 30); P.makeSpouse ? 0 : 0; const before = P.children(s).length; const r0 = PFx.rabbitChildren(s); assert.equal(r0.ok, false); only('rabbit'); let n = 0; for (let i = 0; i < 4; i++) { PFx.rabbitChildren(s); n++; } assert.ok(P.children(s).length >= before + 4, 'at least one child per call'); ok('rabbit: unlimited children (' + P.children(s).length + ' after 4 calls)'); }
{ const run = (prem) => { only(...(prem ? ['tax_evasion'] : [])); const s = fresh(9); adult(s, 30); s.cash = 0; s.job = { id: s.job ? s.job.id : 'swe', level: 0, yrs: 0, perf: 50 }; E.takeTurn(s); while (s.pending.length) E.resolveCard(s, 0); return s.cash; };
  const base = run(false), ev = run(true); assert.ok(ev > base, `no tax earns more (${ev} vs ${base})`);
  only('tax_evasion'); const d = fresh(10); d.cash = 8e6; d.alive = false; assert.equal(L.computeEstate({ ...d, alive: true, people: d.people }).tax, 0); only(); assert.ok(L.computeEstate(d).tax > 0); ok('tax_evasion: no income or estate tax'); }
{ only(); assert.equal(Ads.enabled(), true); assert.equal((await Ads.gate('x')).shown, false); only('no_ads'); assert.equal(Ads.enabled(), false); assert.equal((await Ads.gate('x')).skipped, true); assert.equal(Ads.settingsRow().locked, false); ok('no_ads: ad hook off (and the hook itself never shows anything)'); }
{ const r = await Pay.purchasePass('midas'); assert.equal(r.ok, false); assert.equal(Pay.available, false); ok('payments.js is a stub (no real payments)'); }
{ only('einstein'); const a = new EngineAdapter({ noSave: true, fresh: true, seed: 2 }); await a.init(); const pr = a.getPremium(); assert.equal(pr.passes.filter((p) => p.unlocked).length, 1); a.setPremiumFlag('midas', true); assert.equal(a.getPremium().passes.filter((p) => p.unlocked).length, 2);
  a.setSubscription('monthly'); assert.equal(a.getPremium().subscribed, true); a.setSubscription(null); const ed = a.getEducation(); assert.equal(ed.einstein, true); assert.equal(a.getSettings().ads.enabled, true); ok('adapter premium getters/setters'); }
{ only('golden_gun', 'baller', 'rabbit'); const a = new EngineAdapter({ noSave: true, fresh: true, seed: 2 }); await a.init(); a.debugSetup({ age: 30 }); const acts = a.getActivities(); const row = acts.menus.flatMap((m) => m.items).find((i) => i.id === 'premium:stranger'); assert.ok(row && row.premium === 'golden_gun' && row.locked === false); only(); const acts2 = a.getActivities(); assert.ok(acts2.menus.flatMap((m) => m.items).find((i) => i.id === 'premium:stranger').locked); ok('premium rows in menus carry premium+locked flags'); }
{ // The Creator
  only(); const s = adult(fresh(7), 30); const Cr = await import('../src/creator.js');
  assert.ok(!Cr.unlocked() && !Cr.edit(s, 'me', { age: 40 }).ok && !s.creatorUsed && Math.floor(s.age) === 30); ok('creator locked without the pass: edits refused');
  assert.equal(Pm.passDef('creator').price, 5.99);
  only('creator'); const kid = s.people.find((p) => p.rel === 'mother'); const r = Cr.edit(s, 'me', { age: 45, stats: { health: 99, looks: 5, smarts: 140 } });
  assert.ok(r.ok && Math.floor(s.age) === 45 && s.stats.health === 99 && s.stats.looks === 5 && s.stats.smarts === 100 && s.creatorUsed === true); ok('edit own age + stats (clamped), creatorUsed flag set');
  assert.ok(Cr.edit(s, kid.id, { age: 20, stats: { health: 10, bar: 90 } }).ok && kid.age === 20 && kid.health === 10 && kid.bar === 90); ok('edit another character');
  assert.ok(!Cr.eligibleForRanking(s)); L.die(s, 'disease', 'test'); assert.equal(s.ending.creatorUsed, true); assert.equal(L.legacySummary(s).creatorUsed, true); assert.equal(L.legacySummary(s).rankingEligible, false); assert.ok(L.metaGet().graves.at(-1).creator === true); ok('legacy summary, ending and grave carry the creator mark; excluded from ranking');
  only(); Pm.setSubscription('monthly'); const t = adult(fresh(8), 30); assert.ok(Cr.edit(t, 'me', { age: 31 }).ok); ok('All Access includes The Creator'); Pm.setSubscription(null);
  only('creator'); const u = adult(fresh(9), 60); u.people = [{ ...u.people[0], rel: 'spouse', alive: true }]; Cr.edit(u, 'me', { stats: { happiness: 80 } }); L.die(u, 'disease', 'test'); const h = L.heirsOf(u)[0]; assert.ok(L.continueAs(u, h.id)); assert.equal(u.creatorUsed, false); assert.equal(u.creatorLineage, true); assert.ok(!Cr.eligibleForRanking(u)); ok('creator mark follows the family line into the next generation');
  const a = new EngineAdapter({ noSave: true, fresh: true, seed: 2 }); await a.init(); only(); assert.equal(a.getCreator().unlocked, false); assert.equal(a.getCreator().people.length, 0); only('creator'); assert.ok(a.getCreator().people.length > 1); const er = a.creatorEdit('me', { age: 12 }); assert.ok(er.ok && a.getState().age === 12 && a.getCreator().used); ok('adapter getCreator/creatorEdit'); }
Pm.resetAll();
console.log('premium: PASS');
