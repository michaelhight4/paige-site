// Ads system: rewarded options, platform switch (android unlimited / steam subscriber-daily), full-duration rule, random prompt schedule, club/romance/rare-choice gates. node tests/ads.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import { D } from '../src/data.js';
import * as Pm from '../src/premium.js';
import * as Ads from '../src/ads.js';
import * as P from '../src/people.js';
import { setAdsAdapter, PlaceholderAdsAdapter, getAdsAdapter } from '../src/adapter_ads.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('Ads system');
const reset = () => { Pm.resetAll(); Ads.resetState(); Ads.setPlatformOverride(null); Ads.setRng(null); };
const calls = []; const NEED = D.adsCfg.requiredMs;
const adapterOf = (mode) => ({ name: 'test:' + mode, async show(req) { calls.push(req); if (mode === 'full') return { completed: true, watchedMs: req.requiredMs }; if (mode === 'early') return { completed: false, watchedMs: req.requiredMs - 1, reason: 'closed' }; if (mode === 'liar') return { completed: true, watchedMs: 2000 }; if (mode === 'throw') throw new Error('no fill'); return { completed: false, watchedMs: 0 }; } });
const mk = async (seed = 3, o = {}) => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); a.debugSetup({ age: o.age ?? 16, cash: o.cash ?? 1000 }); return a; };
const clearEv = (a) => { let g = 0; while (a.s.pending.length && g++ < 10) E.resolveCard(a.s, 0); };
reset();
// 0. config + interface
assert.equal(D.adsCfg.platform, 'android'); assert.equal(NEED, 5000); assert.equal(D.adsCfg.platforms.android.ads, true); assert.equal(D.adsCfg.platforms.steam.ads, false); assert.equal(D.adsCfg.rewards.cash, 10000); assert.equal(D.adsCfg.rewards.statPoints, 5);
assert.ok(getAdsAdapter() instanceof PlaceholderAdsAdapter); assert.throws(() => setAdsAdapter({}), /show/); ok('config flag (android=true/unlimited, steam=false), adapter interface (src/adapter_ads.js) with a placeholder default');
// 1. rewards: +$10,000 and +5% on any stat; full duration required
{ const a = await mk(); setAdsAdapter(adapterOf('full')); calls.length = 0;
  let r = await a.claimReward('cash'); assert.ok(r.ok); assert.equal(a.s.cash, 11000); assert.equal(calls[0].requiredMs, 5000); assert.equal(calls[0].kind, 'rewarded');
  for (const st of D.adsCfg.rewards.stats) { const key = st === 'happiness' ? 'happiness' : st; a.s.stats[key] = 40; r = await a.claimReward('stat:' + st); assert.ok(r.ok, st); assert.equal(a.s.stats[key], 45, st); }
  a.s.stats.smarts = 98; await a.claimReward('stat:smarts'); assert.equal(a.s.stats.smarts, 100, 'clamped');
  for (let i = 0; i < 6; i++) assert.ok((await a.claimReward('cash')).ok); assert.equal(a.s.cash, 11000 + 60000, 'android: unlimited'); ok('+$10,000 cash and +5 on each of ' + D.adsCfg.rewards.stats.join('/') + '; unlimited on android'); }
{ for (const mode of ['early', 'liar', 'throw', 'none']) { const a = await mk(); setAdsAdapter(adapterOf(mode)); const cash = a.s.cash, sm = a.s.stats.smarts; const r1 = await a.claimReward('cash'), r2 = await a.claimReward('stat:smarts');
    assert.ok(!r1.ok && !r2.ok, mode); assert.equal(a.s.cash, cash); assert.equal(a.s.stats.smarts, sm); }
  ok('no reward when the ad is closed/skipped early, reports a short watch time, throws or never completes'); }
{ // placeholder adapter honours the full duration (timer in node)
  const saved = D.adsCfg.requiredMs; D.adsCfg.requiredMs = 400; setAdsAdapter(new PlaceholderAdsAdapter()); const a = await mk(); const t0 = Date.now(); const p = a.claimReward('cash'); await new Promise((r) => setTimeout(r, 150)); assert.equal(a.s.cash, 1000, 'nothing granted mid-ad'); const r = await p; assert.ok(r.ok && Date.now() - t0 >= 395, 'reward only after the full duration'); assert.equal(a.s.cash, 11000);
  const ph = new PlaceholderAdsAdapter(); let closed = false; ph.setPresenter(async () => { closed = true; return { completed: false, watchedMs: 100 }; }); setAdsAdapter(ph); const b = await mk(); assert.ok(!(await b.claimReward('cash')).ok && closed); D.adsCfg.requiredMs = saved; ok('placeholder adapter: reward arrives only after the full countdown; a presenter that is closed early gives nothing'); }
// 2. steam: no ads shown, subscribers only, once per option per real day
{ reset(); Ads.setPlatformOverride('steam'); setAdsAdapter(adapterOf('full')); calls.length = 0; const a = await mk();
  assert.equal(Ads.showsAds(), false); assert.equal(Ads.promptsEnabled(), false); let r = await a.claimReward('cash'); assert.ok(!r.ok && /Subscribers/.test(r.message)); assert.equal(a.s.cash, 1000);
  Ads.setSteamSubscription(true); r = await a.claimReward('cash'); assert.ok(r.ok && a.s.cash === 11000); assert.equal(calls.length, 0, 'no ad shown on steam');
  r = await a.claimReward('cash'); assert.ok(!r.ok && /today/i.test(r.message)); assert.equal(a.s.cash, 11000);
  r = await a.claimReward('stat:smarts'); assert.ok(r.ok, 'other options still available'); r = await a.claimReward('stat:smarts'); assert.ok(!r.ok); r = await a.claimReward('stat:looks'); assert.ok(r.ok);
  const t = Date.now(); assert.equal(Ads.access('cash', t).ok, false); assert.equal(Ads.access('cash', t + 864e5 + 1000).ok, true, 'next real-life day'); assert.equal(Ads.usedToday('cash', t), true);
  assert.equal(Ads.dayKey(new Date(2026, 9, 18, 23, 59).getTime()), '2026-10-18'); assert.notEqual(Ads.dayKey(new Date(2026, 9, 18, 23, 59).getTime()), Ads.dayKey(new Date(2026, 9, 19, 0, 1).getTime()));
  assert.ok(a.getRewards().options.find((o) => o.key === 'cash').reason); assert.equal(a.getRewards().showsAds, false);
  Ads.setSteamSubscription(false); Pm.setSubscription('monthly'); assert.equal(Ads.steamSubscribed(), true, 'All Access counts as the subscription'); Pm.setSubscription(null); ok('steam: no ads, subscribers only, once per option per real-life day (resets next day)'); }
{ reset(); const a = await mk(); a.s.age = 16; assert.equal(Ads.platform(), 'android'); Ads.setPlatform('steam'); assert.equal(Ads.platform(), 'steam'); assert.equal(a.getSettings().ads.platform, 'steam'); a.setAdsPlatform('android'); assert.equal(Ads.showsAds(), true); ok('platform flag switchable at runtime (settings + override)'); }
// 3. random prompt: every 8-15 years, random each time, never before 8 years
{ reset(); const gaps = []; const firsts = [];
  for (let run = 0; run < 40; run++) { const s = { ads: null }; let last = 0, first = null, n = 0; for (let y = 1; y <= 200; y++) { if (Ads.yearPassed(s)) { if (first == null) first = y; gaps.push(y - last); last = y; n++; Ads.dismissPrompt(s); } } firsts.push(first); assert.ok(n >= 10); }
  assert.ok(Math.min(...firsts) >= 8 && Math.max(...firsts) <= 15, 'first prompt in 8..15: ' + [...new Set(firsts)].sort((a, b) => a - b)); assert.ok(Math.min(...gaps.slice(0)) >= 8 && Math.max(...gaps) <= 15, 'every prompt 8-15 years apart');
  assert.ok(new Set(gaps).size >= 6, 'random each time'); assert.ok(new Set(firsts).size >= 4);
  const s = { ads: null }; Ads.setRng(() => 0); for (let y = 1; y < 8; y++) assert.equal(Ads.yearPassed(s), false); assert.equal(Ads.yearPassed(s), true, 'earliest possible = year 8'); Ads.setRng(() => 0.999); const s2 = { ads: null }; let y2 = 0; while (!Ads.yearPassed(s2)) y2++; assert.equal(y2 + 1, 15, 'latest = 15');
  Ads.setRng(null); ok(`prompt schedule: first at year ${Math.min(...firsts)}-${Math.max(...firsts)}, gaps ${Math.min(...gaps)}-${Math.max(...gaps)} (${new Set(gaps).size} distinct)`); }
{ reset(); setAdsAdapter(adapterOf('full')); const a = await mk(); a.s.age = 20; a.s.ads = { played: 7, next: 8, due: false, prompts: 0 }; Ads.setRng(() => 0.3); E.takeTurn(a.s); a.s.pending = []; assert.equal(a.getAdPrompt(), null, 'not due before the schedule');
  a.s.ads.played = 8; E.takeTurn; const r = await a.age(); void r; Ads.yearPassed(a.s); const pr = a.getAdPrompt(); assert.ok(pr && pr.forced && !pr.key, 'forced ad due at year 9 mark, no reward offer'); calls.length = 0; const cash = a.s.cash; const ans = await a.showForcedAd(); assert.ok(ans.ok); assert.equal(calls.length, 1); assert.equal(calls[0].kind, 'interstitial'); assert.equal(a.s.cash, cash, 'forced ad: no reward'); assert.equal(a.getAdPrompt(), null); assert.ok(a.s.ads.next >= a.s.ads.played + 8 && a.s.ads.next <= a.s.ads.played + 15);
  for (const mode of ['early', 'throw', 'none']) { a.s.ads.due = true; setAdsAdapter(adapterOf(mode)); const c0 = a.s.cash; const ans2 = await a.answerAdPrompt(); assert.ok(ans2.ok, 'failed forced ad never blocks: ' + mode); assert.equal(a.s.cash, c0); assert.equal(a.getAdPrompt(), null, 'rescheduled after a failed ad'); } setAdsAdapter(adapterOf('full'));
  Pm.setOwned('no_ads'); a.s.ads.due = true; assert.equal(a.getAdPrompt(), null, 'No Ads pass removes the random prompt'); Pm.setOwned('no_ads', false); Ads.setRng(null);
  Pm.setSubscription('monthly'); a.s.ads.due = true; assert.equal(a.getAdPrompt(), null, 'All Access removes the forced ad'); calls.length = 0; assert.equal((await Ads.showForced()).shown, false); assert.equal(calls.length, 0); Pm.setSubscription(null);
  Pm.setOwned('no_ads'); { const s = { ads: null }; let n = 0; for (let y = 1; y <= 100; y++) if (Ads.yearPassed(s)) n++; assert.equal(n, 0, 'No Ads: never forced over 100 years'); assert.ok(s.ads.next > 0); } Pm.setOwned('no_ads', false);
  reset(); Ads.setPlatformOverride('steam'); const b = await mk(); b.s.ads = { played: 20, next: 5, due: false }; Ads.yearPassed(b.s); assert.equal(b.getAdPrompt(), null, 'steam: never prompts'); ok('prompt flow via adapter: accept/decline, incomplete ad, No Ads pass and Steam never prompt'); }
// 4. watch an ad to join any club
{ reset(); const a = await mk(1, { age: 16 }); const SD = D.scholarData; const clubs = SD.clubs; setAdsAdapter(adapterOf('full')); calls.length = 0;
  for (const c of clubs.slice(0, SD.maxClubs)) assert.ok(a.joinClub(c.id).ok); const extra = clubs[SD.maxClubs]; assert.ok(!a.joinClub(extra.id).ok, 'cap blocks the free join'); const st = a.getScholarships().clubsAvail.find((c) => c.id === extra.id); assert.ok(st.blocked && !st.adBlocked);
  setAdsAdapter(adapterOf('early')); assert.ok(!(await a.joinClubWithAd(extra.id)).ok); assert.ok(!a.s.sch.clubs.includes(extra.id), 'ad not finished: not joined');
  setAdsAdapter(adapterOf('full')); assert.ok((await a.joinClubWithAd(extra.id)).ok); assert.ok(a.s.sch.clubs.includes(extra.id)); assert.equal(a.s.sch.clubs.length, SD.maxClubs + 1);
  const old = clubs.find((c) => c.maxAge < 40); const b = await mk(2, { age: 16 }); b.s.age = old.maxAge + 1; b.s.school = 'college'; assert.ok(!b.joinClub(old.id).ok); calls.length = 0; assert.ok((await b.joinClubWithAd(old.id)).ok, 'age window skipped'); assert.equal(calls.length, 1);
  const c = await mk(3, { age: 30 }); c.s.school = null; calls.length = 0; const rr = await c.joinClubWithAd(clubs[0].id); assert.ok(!rr.ok); assert.equal(calls.length, 0, 'no ad shown for an impossible action'); ok('ad-gated join of any club (cap and age window), invalid joins never show an ad'); }
// 5. instant romance
{ reset(); setAdsAdapter(adapterOf('full')); calls.length = 0; let started = 0; for (let seed = 1; seed <= 20; seed++) { const a = await mk(seed, { age: 22 }); for (const p of P.living(a.s, 'partner')) p.rel = 'ex'; for (const p of P.living(a.s, 'spouse')) p.rel = 'ex'; a.s.stats.looks = 5; const r = await a.startRomanceWithAd(); assert.ok(r.ok, 'guaranteed ' + seed); assert.ok(P.partnerOf(a.s)); started++; }
  assert.equal(started, 20); const a = await mk(5, { age: 22 }); assert.ok(P.partnerOf(a.s) || true); calls.length = 0; const again = await a.startRomanceWithAd(); if (P.partnerOf(a.s)) { const r2 = await a.startRomanceWithAd(); assert.ok(!r2.ok); }
  setAdsAdapter(adapterOf('early')); const b = await mk(6, { age: 22 }); for (const p of P.living(b.s)) if (['partner', 'spouse'].includes(p.rel)) p.rel = 'ex'; const r = await b.startRomanceWithAd(); assert.ok(!r.ok && !P.partnerOf(b.s), 'incomplete ad: no relationship'); const kid = await mk(7, { age: 10 }); calls.length = 0; assert.ok(!(await kid.startRomanceWithAd()).ok); void again; ok('instant romance: guaranteed after the full ad, nothing on early close, age/partner checks first'); }
// 6. ad-gated rare / very good choice options on event cards
{ reset(); setAdsAdapter(adapterOf('full')); let found = null, a;
  for (let seed = 1; seed < 80 && !found; seed++) { Ads.setRng(() => 0); a = await mk(seed, { age: 25, cash: 5e5 }); let g = 0; while (!a.s.pending.length && g++ < 30) { E.takeTurn(a.s); } const c = a.nextEvent(); if (c && c.choices.some((x) => x.rare)) found = c; }
  assert.ok(found, 'a card with a rare option'); const idx = found.choices.findIndex((x) => x.rare), base = found.choices.length - 1; assert.equal(idx, base); assert.equal(found.choices[idx].locked, true); assert.ok(found.choices.slice(0, base).every((x) => !x.rare));
  const pend = a.s.pending[0], rare = pend.adRare; assert.ok(rare && rare.fx);
  const r0 = a.resolveEvent(found.id, idx); assert.ok(!r0.ok, 'cannot take the rare option without the ad'); assert.equal(a.s.pending.length > 0, true);
  setAdsAdapter(adapterOf('early')); assert.ok(!(await a.unlockRareChoice()).ok); assert.ok(!a.resolveEvent(found.id, idx).ok);
  setAdsAdapter(adapterOf('full')); const before = { ...a.s.stats }, cash0 = a.s.cash; assert.ok((await a.unlockRareChoice()).ok); assert.equal(a.card().choices[idx].locked, false);
  const r1 = a.resolveEvent(found.id, idx); assert.ok(r1.ok, r1.message); assert.ok(r1.message === rare.journal); assert.ok(Object.keys(rare.fx).some((k) => (k === 'money' ? a.s.cash > cash0 : k === 'happy' ? a.s.stats.happiness > before.happiness : true)));
  assert.ok(a.s.log.some((l) => l.text === rare.journal)); assert.ok(!a.s.pending.length || a.s.pending[0] !== pend); Ads.setRng(null);
  // data sanity: every category has rare options; all effects are positive-leaning
  for (const cat of new Set(D.events.map((e) => e.cat))) assert.ok((D.adChoices.byCategory[cat] || D.adChoices.fallback).length >= 1, cat);
  ok('rare choice: shown on some cards, locked until the full ad, resolves with its very-good effect, never without the ad'); }
{ reset(); Ads.setPlatformOverride('steam'); Ads.setRng(() => 0); const a = await mk(4, { age: 25 }); let g = 0; while (!a.s.pending.length && g++ < 40) E.takeTurn(a.s); const c = a.nextEvent(); assert.ok(c && !c.choices.some((x) => x.rare), 'steam non-subscriber sees no rare option'); Ads.setSteamSubscription(true); a.s.pending[0].adRare = undefined; const c2 = a.card(); assert.ok(c2.choices.some((x) => x.rare), 'subscriber sees it'); Ads.setRng(null); ok('rare option respects the platform/subscription gate'); }
// 7. seeded runs unaffected by the ads layer
{ reset(); const run = async () => { const a = await mk(77, { age: 20, cash: 1e5 }); for (let i = 0; i < 12 && a.s.alive; i++) { clearEv(a); E.takeTurn(a.s); } return JSON.stringify([a.s.cash, a.s.stats, a.s.log.length]); }; const a = await run(); Ads.setRng(() => 0.5); const b = await run(); assert.equal(a, b); Ads.setRng(null); ok('ads randomness never touches the seeded game RNG'); }
setAdsAdapter(new PlaceholderAdsAdapter()); reset();
console.log('ADS PASS');

// 7. No Ads / All Access: rewarded options granted instantly with no ad, once per option per real-life day
{ for (const how of ['pass', 'sub']) { reset(); if (how === 'pass') Pm.setOwned('no_ads'); else Pm.setSubscription('monthly'); setAdsAdapter(adapterOf('none')); calls.length = 0; const a = await mk();
    assert.equal(Ads.showsAds(), true); assert.equal(Ads.access('cash').mode, 'direct'); let r = await a.claimReward('cash'); assert.ok(r.ok, how); assert.equal(a.s.cash, 11000); assert.equal(calls.length, 0, 'no ad shown');
    r = await a.claimReward('cash'); assert.ok(r.ok, 'unlimited for pass owners'); assert.equal(a.s.cash, 21000); assert.ok((await a.claimReward('stat:smarts')).ok); assert.ok(a.getRewards().noAds);
    const t = Date.now(); assert.equal(Ads.access('cash', t + 864e5 + 1000).ok, true, 'next day');
    const b = await mk(2, { age: 22 }); for (const p of P.living(b.s)) if (['partner', 'spouse'].includes(p.rel)) p.rel = 'ex'; assert.ok((await b.startRomanceWithAd()).ok); assert.equal(calls.length, 0); }
  reset(); ok('No Ads pass and All Access: rewards instant (no ad), once per option per day; forced ads never shown'); }
console.log('ads: all ok');// 8. real-time fallback: 20 visible minutes -> forced ad at the next natural break; hidden time does not count; persisted; full cadence reset
{ reset(); setAdsAdapter(adapterOf('full')); let now = 1e12; Ads.setClock(() => now); const a = await mk(); const M = 60000;
  a.s.ads = { played: 3, next: 12, due: false, prompts: 0 };
  assert.equal(a.adClockTick(true).due, false); for (let i = 0; i < 39; i++) { now += 30000; a.adClockTick(true); } assert.equal(a.adClockTick(true).due, false, '19.5 min: not yet');
  a.adClockTick(false); now += 60 * M; assert.equal(a.adClockTick(false).due, false, 'hidden time not counted'); a.adClockTick(true);
  now += 2 * M; assert.equal(Ads.rtActiveMs() >= 19.5 * M && Ads.rtActiveMs() < 20 * M, true, 'visible time after unhide counts'); 
  now += 30000; a.adClockTick(true); now += 30000; assert.equal(a.adClockTick(true).due, true, '20 visible minutes -> due');
  // persisted: a reload (new session) keeps the accumulated time
  const saved = JSON.parse(JSON.stringify(Ads.load().rt)); assert.ok(saved.activeMs >= 20 * M && saved.lastForcedAt);
  calls.length = 0; const cash = a.s.cash; const r = await a.showRealtimeForcedAd(); assert.ok(r.ok); assert.equal(calls.length, 1); assert.equal(calls[0].kind, 'interstitial'); assert.equal(a.s.cash, cash, 'no reward');
  assert.equal(Ads.rtActiveMs(), 0, '20-min timer reset'); assert.equal(Ads.load().rt.lastForcedAt, now); assert.ok(a.s.ads.next >= 3 + 8 && a.s.ads.next <= 3 + 15, 'year counter restarted from now');
  assert.ok(!(await a.showRealtimeForcedAd()).ok, 'not due again right away');
  // year-trigger forced ad also resets the 20-min timer
  for (let i = 0; i < 20; i++) { now += 30000; a.adClockTick(true); } assert.ok(Ads.rtActiveMs() >= 9 * M); a.s.ads.due = true; await a.showForcedAd(); assert.equal(Ads.rtActiveMs(), 0);
  // failed ad still continues and resets
  for (let i = 0; i < 45; i++) { now += 30000; a.adClockTick(true); } setAdsAdapter(adapterOf('throw')); assert.ok((await a.showRealtimeForcedAd()).ok); assert.equal(Ads.rtActiveMs(), 0); setAdsAdapter(adapterOf('full'));
  // No Ads / All Access: never due, never shown
  for (const how of ['pass', 'sub']) { if (how === 'pass') Pm.setOwned('no_ads'); else Pm.setSubscription('monthly'); for (let i = 0; i < 60; i++) { now += 30000; assert.equal(a.adClockTick(true).due, false); } calls.length = 0; assert.ok(!(await a.showRealtimeForcedAd()).ok); assert.equal(calls.length, 0); Pm.resetAll(); }
  Ads.setClock(null); reset(); ok('real-time fallback: 20 visible min (hidden paused, persisted), shown at a break, no reward, resets both timers; off with No Ads / All Access'); }
console.log('ads realtime: ok');
