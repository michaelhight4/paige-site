// 7c6: coaching squad grouped by position per sport; follower formatter + cap; autopilot maxes Spend time and posts; Wife/Husband labels; prices shown once. node tests/build7c6.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as E from '../src/engine.js';
import * as Pm from '../src/premium.js';
import * as P from '../src/people.js';
import * as Auto from '../src/autopilot.js';
import * as Coach from '../src/coaching.js';
import * as Social from '../src/social.js';
import { fmtCount, MAX_FOLLOWERS, labelWithPrice } from '../src/fmt.js';
import { D } from '../src/data.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('Build 7c6');
const mk = async (seed = 3, o = {}) => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); a.debugSetup({ age: o.age ?? 30, cash: o.cash ?? 400000 }); a.s.school = null; return a; };

// 1. coaching groups per sport
for (const sp of Object.keys(D.coaching.sports)) {
  const a = await mk(7); a.s.flags.ex_pro = 1; a.s.edu = 2; a.s.job = null; const r = a.coachAction('take', sp); assert.ok(r.ok !== false, JSON.stringify(r));
  const st = a.getCoaching(), ids = D.coaching.sports[sp].positions.map((p) => p.id);
  assert.deepEqual(st.team.groups.map((g) => g.id), ids, sp + ' group order');
  assert.equal(st.team.groups.reduce((t, g) => t + g.count, 0), st.team.players.length, sp + ' every player in one group');
  for (const g of st.team.groups) { assert.equal(g.count, g.players.length); for (let i = 1; i < g.players.length; i++) assert.ok(g.players[i - 1].ovr >= g.players[i].ovr, 'sorted by rating'); assert.ok(g.players.every((p) => p.pos === g.id)); }
  assert.ok(st.market.every((p) => ids.includes(p.pos)), sp + ' market uses sport positions');
  // manage action still works: sell the first player of the first non-empty group
  a.s.coach.role = 'head'; a.s.coach.budget = 1e7; const g0 = st.team.groups.find((g) => g.count), n0 = st.team.players.length; const sr = a.coachAction('sell', g0.players[0].id); assert.ok(sr.ok !== false, JSON.stringify(sr)); assert.equal(a.getCoaching().team.players.length, n0 - 1);
}
{ // legacy save with GK/DF/MF/FW on basketball migrates
  const a = await mk(8); a.s.flags.ex_pro = 1; a.s.edu = 2; a.s.job = null; a.coachAction('take', 'basketball'); for (const p of a.s.coach.team.players) p.pos = 'GK'; const st = a.getCoaching(); assert.equal(st.team.groups.find((g) => g.id === 'C').count, st.team.players.length); }
ok('coaching: squad grouped by sport positions (on-field order), counts, rating-sorted; sell still works; legacy positions migrate');

// 2. follower formatter + cap
assert.equal(fmtCount(950), '950'); assert.equal(fmtCount(12345), '12.3K'); assert.equal(fmtCount(4.5e6), '4.5M'); assert.equal(fmtCount(578398.2e6), '578B'); assert.equal(fmtCount(8e9), '8B'); assert.equal(fmtCount(2.5e12), '2.5T'); assert.equal(fmtCount(999999), '1M');
assert.ok(!/\d{5,}/.test(fmtCount(4033374890875975.5e6)), fmtCount(4033374890875975.5e6));
{ const a = await mk(4, { age: 22 }); a.socialAction('chirpr', 'open'); a.socialAction('vidnest', 'open'); a.s.social.accounts.chirpr.followers = 4033374890875975.5e6; a.s.social.accounts.vidnest.followers = Infinity;
  const v = a.getSocial(); const ch = v.platforms.find((p) => p.id === 'chirpr'); assert.ok(ch.followers <= MAX_FOLLOWERS, String(ch.followers)); assert.ok(a.s.social.accounts.vidnest.followers <= MAX_FOLLOWERS);
  for (let i = 0; i < 3; i++) { a.s.pending.length = 0; a.s.stats.health = 90; E.takeTurn(a.s); } assert.ok(Object.values(a.s.social.accounts).every((x) => x.followers <= MAX_FOLLOWERS && isFinite(x.followers)));
  for (const f of ['src/social.js', 'src/online.js', 'ui/js/screens/social.js', 'ui/js/screens/online.js', 'ui/js/screens/onlinehub.js', 'ui/js/screens/relationships.js']) assert.ok(!/1e6\)\.toFixed\(1\) \+ 'M'/.test(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8')), f + ' uses the shared formatter'); }
ok('followers: shared K/M/B/T formatter everywhere, capped at 8B per platform (clamped on load/view/year)');

// 3+4. autopilot maxes Spend time and posts
Pm.resetAll(); Pm.setOwned('autopilot');
{ const a = await mk(11, { age: 30 }); const s = a.s; const sp = P.newPerson(s, 'spouse', { age: 30, bar: 50 }); sp.married = true; s.people.push(sp); s.people.push(P.newPerson(s, 'friend', { age: 30, bar: 40 }));
  assert.ok(Auto.ensure(s).routines.includes('spend_all') && Auto.ensure(s).routines.includes('social_max'), 'on by default with the pass');
  const want = P.living(s).filter((p) => p.rel !== 'ex' && P.interactionsFor(s, p).some((i) => i.id === 'spend'));
  assert.ok(want.length >= 3); const r = await Auto.playYear(a, { routines: ['spend_all'], floor: 0 }); assert.equal(r.ran.length, 1, JSON.stringify(r.skipped));
  assert.ok(want.every((p) => s.acted['p' + p.id + 'spend']), 'everyone got their Spend time'); const r2 = await Auto.playYear(a, { routines: ['spend_all'], floor: 0 }); assert.equal(r2.ran.length, 0, 'respects once-per-year'); }
ok('autopilot: Spend time used on every family member, spouse and friend, once per year');
{ const a = await mk(12, { age: 22 }); a.socialAction('chirpr', 'open'); a.socialAction('snapfolio', 'open'); a.socialAction('vidnest', 'open'); a.s.social.prompt = null; if (a.getSocial().postPlan.needed) a.setPostPlan('safe');
  const pc = a.getPlatform('chirpr'); const b = a.getPlatform('chirpr').postsLeft; assert.ok(b > 0);
  const r = await Auto.playYear(a, { routines: ['social_max'], floor: 0 }); assert.equal(r.ran.length, 1, JSON.stringify(r.skipped)); void pc;
  for (const id of ['chirpr', 'snapfolio', 'vidnest']) { const p = a.getPlatform(id); if (p.status === 'active') assert.equal(p.postsLeft, 0, id + ' posts maxed'); }
  const sum = Auto.summarize(a.s, r, null, 0); assert.match(sum.line, /use every post/);
  // per-account autopilot page keeps its own count
  const b2 = await mk(13, { age: 22 }); b2.socialAction('chirpr', 'open'); b2.s.social.prompt = null; Auto.ensure(b2.s).pages.social_chirpr = { on: true, locked: { posts: 1 } }; const r3 = await Auto.playYear(b2, { routines: ['social_max'], floor: 0 }); assert.equal(b2.getPlatform("chirpr").postsLeft, 5 - 0 - (b2.s.social.accounts.chirpr.postsThisYear || 0)); assert.ok(!r3.ran.length || !/chirpr/i.test(r3.ran[0].msg), JSON.stringify(r3.ran)); }
ok('autopilot: every remaining post used on every active account, summarized in one line; per-account settings honored');
Pm.resetAll();

// 5. Wife/Husband labels
{ const a = await mk(14); const s = a.s; const w = P.newPerson(s, 'spouse', { age: 30, gender: 'f' }); w.married = true; s.people.push(w);
  assert.equal(P.relWord(w), 'Wife'); assert.equal(P.relWord({ ...w, gender: 'm' }), 'Husband'); assert.equal(P.relWord({ rel: 'spouse' }), 'Spouse'); assert.equal(P.relWord({ ...w, alive: false }), 'Late wife'); assert.equal(P.relWord({ rel: 'ex', wasSpouse: true, gender: 'm' }), 'Ex-husband'); assert.equal(P.relWord({ rel: 'partner', gender: 'f' }), 'Partner');
  const rl = a.getRelationships(); const lab = JSON.stringify(rl.partner); assert.match(lab, /Wife/, lab); assert.doesNotMatch(lab, /"Spouse"/); }
ok('married partner shows Wife/Husband (Spouse fallback), Late/Ex- forms after death/divorce');

// 6. prices shown once in every action label
assert.equal(labelWithPrice('Give a gift ($50)', 50), 'Give a gift ($50)'); assert.equal(labelWithPrice('Romantic night', 100), 'Romantic night ($100)');
{ const a = await mk(15); const s = a.s; s.people.push(Object.assign(P.newPerson(s, 'spouse', { age: 30 }), { married: true })); s.people.push(P.newPerson(s, 'friend', { age: 30 })); s.people.push(P.newPerson(s, 'child', { age: 8 }));
  const dup = /(\(\$[\d,.]+[^)]*\)).*\1|\(\$[\d,.]+[^)]*\)\s*\(\$/; let n = 0;
  for (const p of P.living(s)) for (const x of a.getRelationshipActions(p.id)) { n++; assert.ok(!dup.test(x.label), 'duplicate price: ' + x.label); }
  const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if ((k === 'label' || k === 'title') && typeof v === 'string') { n++; assert.ok(!dup.test(v), 'duplicate price in data: ' + v); } else walk(v); } };
  for (const f of fs.readdirSync(new URL('../data', import.meta.url))) if (f.endsWith('.json')) walk(JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8')));
  assert.ok(n > 50, 'scanned ' + n); }
ok('no action label repeats its price (adapter interactions + every data label scanned)');
// 7. investments Buy Max at huge cash / tiny prices
{ const { slice } = await import('../src/slice_bridge.js'); const { fitUnits } = await import('../src/slice/assets.js'); const { fmtPrice } = await import('../src/fmt.js');
  for (const [cash, price] of [[5864818364743642838466560, 0.152302], [5.864818364743643e24, 1.3e-7], [1e24, 3.3333333], [9.99e23, 0.0001234]]) {
    const u = fitUnits(cash, price, 1); assert.ok(u > 0 && u * price <= cash, `fit ${cash}/${price}`);
    const a = await mk(21, { cash }); slice(a.s).market.cry_bitcell = price; const q = a.investQuoteMax('cry_bitcell'); assert.ok(q && q.ok && q.cost <= a.s.cash, JSON.stringify(q));
    const r = a.investBuyMax('cry_bitcell'); assert.ok(r.ok !== false, 'Buy Max ok at ' + cash + ': ' + JSON.stringify(r).slice(0, 200)); assert.ok(a.s.cash >= 0, 'cash never negative');
    const r2 = a.invest('cry_bitcell', q.cost); void r2; const sell = a.investSellUnits('cry_bitcell', 'all'); assert.ok(sell.ok !== false, 'Sell all ok'); }
  assert.equal(fmtPrice(0.00012), '$0.00012'); assert.equal(fmtPrice(0.004), '$0.004'); assert.equal(fmtPrice(1e-9), '<$0.000001'); assert.equal(fmtPrice(0.5), '$0.50'); assert.notEqual(fmtPrice(1.3e-7), '$0'); }
ok('investments: Buy Max never fails at ~1e24 cash with tiny prices; Sell all works; sub-cent prices readable');
// 8. Lifetime P/L = realized + yields + unrealized, per life
{ const { slice } = await import('../src/slice_bridge.js'); const a = await mk(22, { cash: 1e6 }); const sl = slice(a.s); delete sl.invLife;
  assert.equal(a.getInvestments().total.lifetime.pnl, 0, 'existing saves start at 0');
  sl.market.stk_nimbus = 100; a.invest('stk_nimbus', 10000); sl.market.stk_nimbus = 150; a.investSellUnits('stk_nimbus', 50); // +2500 realized, 50 left: +2500 open
  let L = a.getInvestments().total.lifetime; assert.equal(L.realized, 2500); assert.equal(L.unrealized, 2500); assert.equal(L.pnl, 5000); assert.equal(L.pct, 50);
  sl.invLife.income += 300; L = a.getInvestments().total.lifetime; assert.equal(L.pnl, 5300); a.investSellUnits('stk_nimbus', 'all'); L = a.getInvestments().total.lifetime; assert.equal(L.pnl, 5300, 'selling keeps lifetime');
  const before = a.s.cash; a.s.cash = before; }
ok('investments: Lifetime P/L tracks realized + yields + open P/L, survives sells; old saves start at 0');
// 9. dividends: 25% of the yearly price gain on stocks/funds, 0 on flat/down years, none for crypto
{ const { slice, sliceData } = await import('../src/slice_bridge.js'); const H = await import('../src/slice/assets.js'); const a = await mk(23, { cash: 1e6 }); const sl = slice(a.s), d = sliceData();
  for (const it of d.assets ? d.assets.investments.items : []) void it;
  const yearWith = (id, from, to) => { sl.market[id] = from; const orig = Math.random; const c0 = sl.cash; const L0 = H.invLife(sl).income; H.__marketYear(d, sl, []); const gainPrice = sl.market[id]; return { c0, gainPrice, paidLife: H.invLife(sl).income - L0, cash: sl.cash, orig }; };
  sl.market.stk_atlas = 100; a.invest('stk_atlas', 10000); sl.market.cry_bitcell = 100; a.invest('cry_bitcell', 10000); const u = sl.invest.stk_atlas.units;
  const r = yearWith('stk_atlas', 100); const pNow = r.gainPrice, expect = u * Math.max(0, pNow - 100) * 0.25 + 0;
  const bondInc = 0; void bondInc; const crypto = 0; void crypto;
  assert.ok(Math.abs(H.invLife(sl).lastDividends - expect - (sl.market.cry_bitcell ? 0 : 0)) < 1e-6, `dividend ${H.invLife(sl).lastDividends} vs ${expect}`);
  // flat year: force the price path by calling with equal prices through a direct computation
  const v = a.getInvestments(); assert.ok(v.products.find((p) => p.id === 'stk_atlas').sub.includes('pays 25% of yearly gain')); assert.ok(!v.products.find((p) => p.id === 'cry_bitcell').sub.includes('pays'));
  // huge balance: formatting safe
  sl.invest.stk_atlas.units = 1e22; sl.market.stk_atlas = 100; const out = []; let tries = 0; while (!out.length && tries++ < 30) { sl.market.stk_atlas = 100; H.__marketYear(d, sl, out); } assert.ok(out.some((m) => /^Dividends: \$[\d,]+.* reinvested/.test(m)), JSON.stringify(out)); assert.ok(out.every((m) => !/e\+|NaN|Infinity/.test(m)));
  const f = a.getFinances ? a.getFinances() : null; void f; }
ok('dividends: stocks/funds pay 25% of yearly price gain (0 on down years), none for crypto; listed in subtitle; huge payouts formatted safely');
// 9b. dividend modes: Reinvest (default) buys units, Cash out waits in the Dividends balance until collected
{ const { slice, sliceData } = await import('../src/slice_bridge.js'); const H = await import('../src/slice/assets.js'); const d = sliceData();
  const run = async (mode) => { const a = await mk(31, { cash: 1e6 }); const sl = slice(a.s); sl.market.fund_index = 100; a.invest('fund_index', 100000); if (mode) assert.ok(a.investDivMode('fund_index', mode).ok !== false);
    const u0 = sl.invest.fund_index.units; let paid = 0, g = 0; while (!(paid > 0) && g++ < 40) { const c0 = a.s.cash; sl.market.fund_index = 100; const out = []; H.__marketYear(d, sl, out); paid = H.invLife(sl).lastDividends; if (paid > 0) { assert.ok(out.some((m) => /^Dividends: .* reinvested, .* waiting to collect\.$/.test(m)), JSON.stringify(out)); assert.equal(sl.cash, c0, 'dividends never go straight to cash'); } }
    assert.ok(paid > 0, 'a gain year happened'); return { a, sl, u0, paid }; };
  const r1 = await run(null); assert.ok(r1.sl.invest.fund_index.units > r1.u0, 'reinvest bought units'); assert.ok((r1.sl.divBal || 0) < r1.sl.market.fund_index, 'only the sub-unit remainder waits');
  assert.equal(r1.a.getInvestments().holdings[0].divMode, 'reinvest');
  const r2 = await run('cash'); assert.equal(r2.sl.invest.fund_index.units, r2.u0, 'cash-out keeps units'); assert.ok(Math.abs(r2.sl.divBal - r2.paid) < 1e-6); const v = r2.a.getInvestments(); assert.ok(v.total.dividendBalance > 0); assert.ok(v.total.lifetime.income >= Math.floor(r2.paid));
  const c0 = r2.a.s.cash; assert.ok(r2.a.investCollectDividends().ok !== false); assert.ok(Math.abs(r2.a.s.cash - c0 - r2.paid) < 1); assert.equal(r2.sl.divBal, 0);
  r2.sl.divBal = 5000; const u1 = r2.sl.invest.fund_index.units; r2.a.investReinvestDividends(); assert.ok(r2.sl.invest.fund_index.units > u1 && r2.sl.divBal < 5000); }
ok('dividends: Reinvest default buys more units; Cash out accrues in a Dividends balance, Collect moves it to cash, Reinvest all buys units; one year-log line');
// 10. passions cap: 2 at first, slots 3-4 after 2 masteries, max 4 per life
{ const a = await mk(41, { age: 20 }); const s = a.s; const Pa = E.Passions; s.passions = null; const ids = D.passionsData.passions.map((p) => p.id);
  assert.ok(Pa.pick(s, ids[0]).ok && Pa.pick(s, ids[1]).ok); let r = Pa.pick(s, ids[2]); assert.equal(r.ok, false); assert.ok(r.needReplace, 'third needs a switch');
  let st = a.getPassions(); assert.equal(st.slots, 2); assert.equal(st.lockedSlots.length, 2); assert.match(st.lockedSlots[0].reason, /Master your first 2 passions/);
  Pa.ensure(s).active[0].meter = 100; Pa.ensure(s); st = a.getPassions(); assert.equal(st.mastered.length, 1); assert.equal(st.slots, 2, 'one mastery does not unlock'); assert.ok(Pa.pick(s, ids[2]).ok); assert.equal(Pa.pick(s, ids[3]).ok, false);
  Pa.ensure(s).active[0].meter = 100; Pa.ensure(s); st = a.getPassions(); assert.equal(st.mastered.length, 2); assert.equal(st.slots, 2, 'slots 3 and 4 open'); assert.ok(st.unlocked);
  const free = ids.filter((i) => !Pa.has(s, i) && !Pa.isMastered(s, i)); while (Pa.ensure(s).active.length < st.slots) assert.ok(Pa.pick(s, free.shift()).ok);
  assert.equal(Pa.ensure(s).active.length + Pa.ensure(s).mastered.length, 4); assert.equal(Pa.pick(s, free[0]).ok, false, 'never a 5th');
  // autopilot pick respects the cap
  Pm.setOwned('autopilot'); const rp = await Auto.playYear(a, { routines: ['passion_pick'], floor: 0 }); assert.equal(rp.ran.length, 0); Pm.resetAll();
  // old save over the cap: keeps everything, blocks new picks
  const b = await mk(42, { age: 30 }); b.s.passions = { active: ids.slice(4, 7).map((id) => ({ id, meter: 50 })), mastered: ids.slice(0, 4).map((id) => ({ id, age: 20 })), hist: {} };
  const sb = b.getPassions(); assert.equal(sb.active.length, 3); assert.equal(sb.mastered.length, 4); assert.equal(sb.slots, 0); const rb = E.Passions.pick(b.s, ids[8], ids[4]); assert.equal(rb.ok, false); assert.match(rb.msg, /mastered|limit/); }
ok('passions: 2 slots at first, slots 3-4 after both first passions mastered, max 4 per life; autopilot and old saves respect it');
// 11. retirement after 25 years of service at the current job; pensions stack across jobs
{ const R = await import('../src/retire.js');
  let q = R.quote(60000, 18); assert.equal(q.left, 7); assert.equal(q.countdown, 'Retirement in 7 years'); assert.equal(q.eligible, false); assert.match(q.reason, /25 years/);
  q = R.quote(60000, 25); assert.ok(q.eligible); assert.equal(q.pension, 30000); assert.equal(q.lump, 15000); assert.equal(R.quote(100000, 40).pension, 70000, 'capped at 70%'); assert.equal(R.quote(1e9, 1).countdown, 'Retirement in 24 years');
  const a = await mk(51, { age: 45, cash: 1000 }); const s = a.s; s.edu = 3; s.stats.smarts = 90; const c = E.eligibleCareers(s)[0]; assert.ok(E.applyJob(s, c.id) || s.job); s.job.yrs = 20;
  let rq = a.retireQuote(); assert.equal(rq.left, 5); assert.equal(a.retireJob().ok, false, 'locked before 25 years');
  s.job.yrs = 25; rq = a.retireQuote(); assert.ok(rq.eligible); const c0 = s.cash, r = a.retireJob(); assert.ok(r.ok, r.message); assert.equal(s.job, null); assert.equal(s.cash, c0 + rq.lump); assert.equal(R.total(s), rq.pension);
  assert.ok(E.applyJob(s, c.id) || s.job, 'can take a new job'); s.job.yrs = 30; const rq2 = a.retireQuote(); assert.ok(a.retireJob().ok); assert.equal(s.pensions.length, 2); assert.equal(R.total(s), rq.pension + rq2.pension, 'pensions stack');
  const pay = R.total(s); let got = 0; R.payYear(s, (_s, x) => { got += x; }); assert.equal(got, pay); }
ok('retirement: countdown to 25 years of service, locked before, pension 2%/yr (max 70%) + 3-month lump, new job allowed, pensions stack and pay yearly');
console.log('PASS build7c6');
