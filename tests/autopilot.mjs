// Autopilot pack: routines on age, same effects as manual actions, partner upkeep, safety stops, skip-ahead. node tests/autopilot.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as Pm from '../src/premium.js';
import * as P from '../src/people.js';
import * as Auto from '../src/autopilot.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('Autopilot pack');
const mk = async (seed = 3, o = {}) => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); a.debugSetup({ age: o.age ?? 30, cash: o.cash ?? 400000 }); return a; };
const clearEv = (a) => { let g = 0; while (a.s.pending.length && g++ < 10) { E.resolveCard(a.s, 0); } };
const addSpouse = (a, bar = 60) => { const s = a.s; const p = P.newPerson(s, 'spouse', { age: 30, bar }); p.married = true; s.people.push(p); return p; };
Pm.resetAll();
// 1. locked without the pass; unlocked with the pass or All Access
{ const a = await mk(); assert.equal(a.getAutopilot().unlocked, false); const r = a.setAutopilot({ on: true }); assert.equal(r.ok, false);
  const k = await a.skipAhead({ years: 3 }); assert.equal(k.ok, false); assert.equal(a.s.age, 30);
  a.s.auto = { on: true, routines: ['train'], floor: 0 }; clearEv(a); const a0 = a.s.age; await a.age(); assert.equal(a.s.acted.w_gym, undefined); assert.equal(a.s.age, a0 + 1); // forced-on flag ignored while locked
  Pm.setSubscription('monthly'); assert.equal(a.getAutopilot().unlocked, true); Pm.setSubscription(null); Pm.setOwned('autopilot'); assert.equal(a.getAutopilot().unlocked, true); Pm.resetAll(); ok('locked without the pass; unlocked by the pass or All Access'); }
Pm.setOwned('autopilot');
// 2. routines run on age with the same costs/effects as manual actions
{ const mkp = async () => { const a = await mk(5); addSpouse(a, 50); return a; };
  const man = await mkp(), aut = await mkp();
  const names = ['train', 'read', 'talk_partner', 'date_night', 'gift_partner'];
  man.quickAction('train'); man.quickAction('read'); const sp = P.partnerOf(man.s); man.interact(sp.id, 'talk'); man.interact(sp.id, 'romance'); man.interact(sp.id, 'gift');
  const cashAfterManual = man.s.cash, smartsM = man.s.stats.smarts, barM = P.partnerOf(man.s).bar, skillM = JSON.stringify(man.s.skills);
  aut.setAutopilot({ on: true, routines: names, floor: 0 }); const c0 = aut.s.cash;
  // capture state right before the year turns: run the routines via playYear alone
  const pre = await Auto.playYear(aut); assert.equal(pre.ran.length, 5, JSON.stringify(pre.skipped));
  assert.equal(Math.round(aut.s.cash), Math.round(cashAfterManual), 'same costs'); assert.equal(aut.s.stats.smarts, smartsM, 'same stat effects'); assert.equal(P.partnerOf(aut.s).bar, barM, 'same relationship effect'); assert.equal(JSON.stringify(aut.s.skills), skillM, 'same skill gains');
  assert.equal(c0 - aut.s.cash, 150, 'date night $100 + gift $50'); assert.deepEqual(pre.ran.map((r) => r.cost), [0, 0, 0, 100, 50]);
  ok('routines cost and do exactly what the manual actions do (cash, stats, relationship, skills)'); }
// 3. results appear in the year summary and the journal; runs every time you age
{ const a = await mk(6); a.setAutopilot({ on: true, routines: ['train', 'read'], floor: 0 }); let runs = 0;
  for (let i = 0; i < 4; i++) { clearEv(a); a.s.diseases = []; const r = await a.age(); if (r.auto && r.auto.ran.length === 2) runs++; if (r.auto) { assert.ok(r.entries.some((e) => /^Autopilot:/.test(e.text)), 'journal line'); assert.ok(r.auto.line && r.auto.stats && 'cashDelta' in r.auto); } }
  assert.ok(runs >= 3, 'runs ' + runs); assert.ok(a.getAutopilot().last.toAge <= a.s.age); ok('routines run on every Age click with a per-year summary + journal line'); }
// 4. relationship upkeep keeps the partner (many seeds)
{ let leftAuto = 0, leftNone = 0, N = 24;
  for (let seed = 1; seed <= N; seed++) {
    for (const withAuto of [true, false]) {
      const a = await mk(100 + seed, { cash: 2e6 }); const sp = addSpouse(a, 19); a.s.job = null; a.setAutopilot({ on: withAuto, routines: ['talk_partner', 'date_night', 'gift_partner'], floor: 0 });
      for (let y = 0; y < 10 && a.s.alive; y++) { clearEv(a); a.s.stats.health = 90; await a.age(); if (!a.s.people.find((p) => p.id === sp.id && p.rel === 'spouse')) break; }
      const still = a.s.people.find((p) => p.id === sp.id && p.rel === 'spouse' && p.alive); if (!still) (withAuto ? leftAuto++ : leftNone++);
    } }
  assert.ok(leftAuto < leftNone, `autopilot keeps partners (left ${leftAuto} vs ${leftNone} of ${N})`); assert.ok(leftNone >= 6, 'control group loses partners: ' + leftNone); ok(`partner upkeep: spouse left ${leftAuto}/${N} with autopilot vs ${leftNone}/${N} without`); }
// 5. safety stops
{ // cash floor: pause + routine skipped when it would cross the floor
  const a = await mk(7, { cash: 5000 }); addSpouse(a, 60); a.setAutopilot({ on: true, routines: ['date_night'], floor: 4950 });
  const pre = await Auto.playYear(a); assert.equal(pre.ran.length, 0); assert.match(pre.skipped[0].reason, /floor/); assert.equal(a.s.cash, 5000);
  a.s.cash = 100; assert.equal(Auto.safetyBefore(a.s, 4950).kind, 'floor'); ok('cash floor: costly routines skipped, run paused below the floor'); }
{ const a = await mk(8); a.s.pending.push({ kind: 'event', id: 'x' }); assert.equal(Auto.safetyBefore(a.s, 0).kind, 'event'); a.s.pending = [];
  a.s.diseases.push({ id: 'flu', since: 29, dx: true }); assert.equal(Auto.safetyBefore(a.s, 0).kind, 'illness'); a.s.diseases = [];
  a.s.stats.health = 10; assert.equal(Auto.safetyBefore(a.s, 0).kind, 'crisis'); a.s.stats.health = 80;
  a.s.prison = { left: 2 }; assert.equal(Auto.safetyBefore(a.s, 0).kind, 'prison'); a.s.prison = null; a.s.alive = false; assert.equal(Auto.safetyBefore(a.s, 0).kind, 'dead'); a.s.alive = true;
  assert.equal(Auto.safetyBefore(a.s, 0), null); ok('safety stops before a year: event/choice, illness, health crisis, prison, death'); }
{ const a = await mk(9); a.setAutopilot({ on: true, routines: ['train'], floor: 0 }); a.s.diseases.push({ id: 'flu', since: 29, dx: true }); const k = await a.skipAhead({ years: 5 }); assert.equal(k.done, 0); assert.equal(k.stop.kind, 'illness');
  a.s.diseases = []; const a0 = a.s.age; a.s.job = { id: a.s.job ? a.s.job.id : 'x', level: 0, perf: 50, yrs: 0, lvlYrs: 0 }; ok('skip-ahead refuses to start while ill'); void a0; }
// 6. skip-ahead: per-year summary, stops on events, floor and illness
{ const a = await mk(10, { cash: 3e6 }); a.setAutopilot({ routines: ['train', 'read', 'meditate'], floor: 0 }); const k = await a.skipAhead({ years: 6, routines: ['train', 'read'] });
  assert.ok(k.done >= 1 && k.done <= 6 && k.years.length === k.done, 'one summary per year played'); assert.equal(k.years[0].ran.map((r) => r.id).join(), 'train,read'); for (let i = 1; i < k.years.length; i++) assert.equal(k.years[i].fromAge, k.years[i - 1].toAge);
  if (k.done < 6) assert.ok(k.stop, 'stopped early with a reason: ' + k.message); assert.ok(k.entries.some((e) => /skipped ahead/.test(e.text))); assert.equal(a.s.age, 30 + k.done);
  ok(`skip-ahead played ${k.done}/6 years with per-year summaries` + (k.stop ? ` (stopped: ${k.stop.kind})` : '')); }
{ // an event always stops the skip and hands it back; resuming continues
  let sawEvent = false, a;
  for (let seed = 20; seed < 60 && !sawEvent; seed++) { a = await mk(seed, { cash: 3e6 }); const k = await a.skipAhead({ years: 10, routines: ['train'] }); if (k.event) { sawEvent = true; assert.equal(k.stop.kind, 'event'); assert.ok(k.done < 10 && k.remaining === 10 - k.done); assert.equal(a.getAutopilot().skipRemaining, k.remaining); const k2 = await a.skipAhead({ years: 2 }); assert.equal(k2.done, 0); assert.equal(k2.stop.kind, 'event', 'cannot skip past an unresolved choice'); } }
  assert.ok(sawEvent); ok('events/choices stop the skip, are handed to the UI, and cannot be skipped past'); }
{ const a = await mk(11, { cash: 30000 }); a.s.job = null; a.setAutopilot({ routines: ['train'], floor: 28000 }); let k, g = 0; do { clearEv(a); k = await a.skipAhead({ years: 8 }); } while (!k.stop && g++ < 3); assert.ok(k.stop && ['floor', 'event', 'illness', 'crisis'].includes(k.stop.kind)); ok('cash floor stops a skip once living costs push cash under it (' + k.stop.kind + ')'); }
{ const a = await mk(12, { cash: 3e6 }); const k = await a.skipAhead({ years: 500, routines: [] }); assert.equal(k.requested, Auto.MAX_SKIP); const z = await a.skipAhead({ years: 0, routines: [] }); assert.ok(z.requested === 1); ok('years clamped to 1..' + Auto.MAX_SKIP); }
// 7. death ends the skip
{ const a = await mk(13, { age: 99, cash: 3e6 }); const k = await a.skipAhead({ years: 20, routines: [] }); assert.ok(k.died ? k.stop.kind === 'dead' && k.death : k.done > 0); ok('death ends a skip with the death summary'); }
// 8. save round trip keeps settings
{ const a = await mk(14); a.setAutopilot({ on: true, routines: ['study'], floor: 777 }); const copy = JSON.parse(JSON.stringify(a.s)); assert.deepEqual(copy.auto.routines, ['study']); assert.equal(copy.auto.floor, 777); assert.equal(a.getState().auto, true); ok('settings persist in the save; state.auto flag drives the AGE button badge'); }
// ---- passions: autopilot picks and practices the same way as the manual buttons
{ const yearOf = (a) => { clearEv(a); a.s.stats.health = Math.max(a.s.stats.health, 70); a.s.diseases = []; E.takeTurn(a.s); clearEv(a); };
  const man = await mk(61, { age: 14, cash: 1e6 }), aut = await mk(61, { age: 14, cash: 1e6 }); Pm.resetAll(); Pm.unlock && Pm.unlock('autopilot');
  const ids = Auto.ROUTINES.map((r) => r.id); assert.ok(ids.includes('passion_pick') && ids.includes('practice')); assert.equal(Auto.routineDef('practice').k, 'passion_practice');
  const none = await mk(60, { age: 4 }); const r0 = await Auto.playYear(none, { routines: ['passion_pick', 'practice'], floor: 0 }); assert.equal(r0.ran.length, 0); assert.ok(r0.skipped.every((x) => /start|slot|No active/.test(x.reason)), JSON.stringify(r0.skipped));
  let trace = []; for (let y = 0; y < 8; y++) {
    // manual path: pick the same passion the routine would, then practice every active passion
    for (const x of [man, aut]) { clearEv(x); x.s.diseases = []; x.s.prison = null; x.s.stats.health = Math.max(x.s.stats.health, 70); x.s.cash = Math.max(x.s.cash, 1e6); }
    const st = man.getPassions(); if (!st.locked && st.used < st.slots && st.available.length) { const fit = (p) => p.skills.reduce((q, k) => q + ((man.s.skills && man.s.skills[k]) || 0), 0) / p.skills.length; man.pickPassion(st.available.slice().sort((x, z) => fit(z) - fit(x) || (x.id < z.id ? -1 : 1))[0].id); }
    for (const p of man.getPassions().active) if (!p.practiced) man.practicePassion(p.id);
    const ra = await Auto.playYear(aut, { routines: ['passion_pick', 'practice'], floor: 0 }); trace.push(ra.ran.map((x) => x.id).join('+'));
    assert.deepEqual(aut.getPassions().active.map((p) => [p.id, p.meter, p.practiced]), man.getPassions().active.map((p) => [p.id, p.meter, p.practiced]), 'year ' + y);
    assert.equal(JSON.stringify(aut.s.skills), JSON.stringify(man.s.skills), 'skills match, year ' + y);
    assert.equal((await Auto.playYear(aut, { routines: ['practice'], floor: 0 })).ran.length, 0, 'once a year per passion'); yearOf(man); yearOf(aut); }
  const pa = aut.getPassions(), pm = man.getPassions(); assert.ok(pa.active.length + pa.mastered.length >= 1 && pa.active.every((p) => p.meter > 0) || pa.mastered.length > 0, 'passions progressed'); assert.deepEqual(pa.mastered.map((m) => m.id), pm.mastered.map((m) => m.id));
  assert.ok(trace[0].includes('passion_pick') && trace[0].includes('practice'), trace.join('|'));
  const pref = await mk(62, { age: 14 }); Auto.configure(pref.s, { passion: 'science' }); const pr = await Auto.playYear(pref, { routines: ['passion_pick'], floor: 0 }); assert.equal(pr.ran.length, 1); assert.equal(pref.getPassions().active[0].id, 'science', 'preferred passion is picked');
  ok('autopilot picks a passion and practices every active passion once a year, identical meters/skills to the manual path over 8 years, preferred passion honoured'); }
Pm.resetAll();
console.log('AUTOPILOT PASS');
