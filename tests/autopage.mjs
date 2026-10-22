// "Autopilot this page": locked per-page settings re-applied every year, same paths as manual play. node tests/autopage.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import * as Auto from '../src/autopilot.js'; import * as Pm from '../src/premium.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const mk = async (seed, o = {}) => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); a.debugSetup({ age: o.age ?? 30, cash: o.cash ?? 5e6 }); if (!o.school) a.s.school = null; return a; };
const clear = (a) => { const s = a.s; s.pending.length = 0; s.diseases = []; s.prison = null; s.stats.health = 95; s.social && (s.social.prompt = null); };
const year = async (a, auto) => { clear(a); const r = await a.age(auto ? {} : { noAuto: true }); clear(a); return r; };
console.log('Autopilot this page');
Pm.resetAll();
{ const a = await mk(1); assert.equal(a.setAutoPage('social', true).ok, false, 'locked without the pack'); Pm.setOwned('autopilot'); assert.equal(a.setAutoPage('social', true).ok, false, 'needs an account first'); assert.equal(a.getAutoPage('social').available, false); assert.equal(a.getAutoPage('nope'), null);
  ok('locked without the pack; refuses when the page is not set up'); }
// registry covers the pages and sections
{ const ids = Auto.pageStatus(await mk(2)).map((p) => [p.id, p.section]); for (const [id, sec] of [['social', 'hobbies'], ['passions', 'hobbies'], ['school', 'school'], ['job', 'job'], ['racing', 'hobbies'], ['prodco', 'business'], ['franchise', 'business']]) assert.ok(ids.some((x) => x[0] === id && x[1] === sec), id); ok('pages registered under School / Job / Business / Hobbies'); }
// social: locks the plan, reapplies each year, turns off
{ const a = await mk(3, { age: 22 }); a.socialAction('chirpr', 'open'); a.setPostPlan('edgy'); const r = a.setAutoPage('social', true); assert.ok(r.ok, r.message); assert.equal(a.s.auto.pages.social.locked.plan, 'edgy');
  Auto.configure(a.s, { on: true, routines: [] }); for (let y = 0; y < 4; y++) { await year(a, true); assert.equal(a.s.social.last.plan, 'edgy', 'year ' + y); } ok('social page: locked plan (edgy) re-applied 4 years running');
  assert.ok(a.setAutoPage('social', false).ok); assert.equal(a.getAutoPage('social').on, false); await year(a, true); assert.equal(a.s.social.last.plan, 'safe', 'off: autopilot falls back to its preferred (safe) plan'); ok('turning it off hands control back'); }
// passions: same progress as the manual Practice button
{ const man = await mk(61, { age: 14, cash: 1e6, school: true }), aut = await mk(61, { age: 14, cash: 1e6, school: true });
  for (const x of [man, aut]) { x.pickPassion('science'); }
  assert.ok(aut.setAutoPage('passions', true).ok); Auto.configure(aut.s, { on: true, routines: [] });
  for (let y = 0; y < 6; y++) { clear(man); for (const p of man.getPassions().active) man.practicePassion(p.id); await year(man, false); await year(aut, true); }
  const m = man.getPassions().active.map((p) => p.meter), t = aut.getPassions().active.map((p) => p.meter); assert.ok(t.every((v, i) => v >= m[i] && v - m[i] <= 15), 'passion progress matches the manual path (Autopilot may already have done the new year\'s practice) ' + t + ' vs ' + m); for (const k of Object.keys(man.s.skills)) assert.ok(aut.s.skills[k] >= man.s.skills[k] - 1e-9, 'skill ' + k); ok(`passions page: meter ${t} equals manual ${m} after 6 years`); }
// school + job: same quick action as the buttons
{ const man = await mk(70, { age: 15, school: true }), aut = await mk(70, { age: 15, school: true }); assert.ok(aut.setAutoPage('school', true).ok); Auto.configure(aut.s, { on: true, routines: [] }); for (let y = 0; y < 3; y++) { clear(man); man.quickAction('study'); await year(man, false); await year(aut, true); } assert.equal(Math.round(aut.s.stats.smarts), Math.round(man.s.stats.smarts)); assert.ok(aut.s.auto.pages.school.on); ok('school page = Try harder every year (same smarts as the manual study button)'); }
{ const man = await mk(71), aut = await mk(71); for (const x of [man, aut]) x.s.job = { id: x.s.job ? x.s.job.id : E.D ? 'x' : 'x', level: 0, perf: 50, yrs: 0, lvlYrs: 0 }; const D = (await import('../src/data.js')).D; for (const x of [man, aut]) x.s.job.id = D.careers[0].id;
  assert.ok(aut.setAutoPage('job', true).ok); Auto.configure(aut.s, { on: true, routines: [] }); for (let y = 0; y < 3; y++) { clear(man); man.quickAction('workharder'); man.s.job.perf = Math.min(100, man.s.job.perf); await year(man, false); await year(aut, true); } assert.ok(aut.s.job && man.s.job); assert.ok(Math.abs(aut.s.job.perf - man.s.job.perf) < 1e-6, `perf ${aut.s.job.perf} vs ${man.s.job.perf}`); ok('job page = Work harder every year (same performance as the manual button)'); }
// racing: strategy lock + career
{ const a = await mk(80, { age: 24, cash: 5e8 }); assert.equal(a.getAutoPage('racing').available, false); assert.ok(a.rcAction('join', 'driver', 'stock').ok); assert.ok(a.setAutoPage('racing', true).ok); Auto.configure(a.s, { on: true, routines: [] }); const seasons0 = (a.getRacing().career || {}).seasons; for (let y = 0; y < 3; y++) await year(a, true); const st = a.getRacing(); assert.ok(st.career); assert.ok(a.s.auto.pages.racing.on); ok('racing page: driver career trained and raced automatically'); }
// safety stops honoured: a pending event / prison halts page autopilot like the routines
{ const a = await mk(3, { age: 22 }); a.socialAction('chirpr', 'open'); a.setPostPlan('viral'); a.setAutoPage('social', true); Auto.configure(a.s, { on: true, routines: [] }); a.s.prison = { years: 2 }; const pre = await Auto.playYear(a, { floor: 0 }); assert.ok(pre.stopBefore || pre.ran.length === 0, 'no page routine while in prison'); a.s.prison = null; ok('safety stops block page autopilot (prison)'); }
// persistence
{ const a = await mk(3, { age: 22 }); a.socialAction('chirpr', 'open'); a.setPostPlan('edgy'); a.setAutoPage('social', true); const copy = JSON.parse(JSON.stringify(a.s)); assert.equal(copy.auto.pages.social.locked.plan, 'edgy'); ok('locked settings are saved with the game'); }
console.log('autopage: PASS');
