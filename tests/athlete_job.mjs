// Franchise Player save: athlete detection, team name instead of 'special', teammates, skills training, coaching experience + retire & coach.
import * as E from '../src/engine.js'; import { EngineAdapter } from '../src/engine_adapter.js'; import * as MT from '../src/myteam.js'; import * as Coach from '../src/coaching.js'; import assert from 'node:assert/strict';
const M = new Map(); globalThis.localStorage ??= { getItem: (k) => (M.has(k) ? M.get(k) : null), setItem: (k, v) => M.set(k, String(v)), removeItem: (k) => M.delete(k) };
await E.loadData();
const mk = async (title = 'Franchise Player', step = 4, years = 10, special = 'athlete') => { const a = new EngineAdapter({ noSave: true, fresh: true, seed: 21 }); await a.init(); a.debugSetup({ age: 50, cash: 5e6 }); const s = a.s; s.school = null; s.edu = 2; const B = await import('../src/slice_bridge.js'); const sl = B.slice(s); sl.job = { kind: 'special', special, id: 'sp_athlete_' + step, title, wage: 9e6, years, yearsInLevel: 3, step, sector: 'special' }; B.push(s); return a; };
for (const [t, st] of [['Amateur', 0], ['Minor League', 1], ['Pro Rookie', 2], ['Starter', 3], ['Franchise Player', 4]]) { const a = await mk(t, st, 2); assert.ok(MT.jobIsAthlete(a.s), t + ' detected'); assert.ok(a.getMyTeam().onTeam, t + ' on a team'); }
// a save whose slice job lost the special field is still detected from its id
{ const a = await mk(); delete a.s.sl.job.special; assert.ok(MT.jobIsAthlete(a.s), 'detected from id'); }
const a = await mk(); const st = a.getState(); const v = a.getMyTeam();
assert.notEqual(st.job.employer, 'special'); assert.equal(st.job.employer, v.team, 'employer shows the team');
const tm = a.getTeammates(); assert.ok(tm.list.length >= 8 && tm.list.every((p) => p.rel >= 0 && p.prof >= 0 && p.rating > 0 && p.pos));
const p = tm.list[0]; assert.ok(a.mtMate(p.id, 'hang').ok); assert.ok(a.getTeammates().list[0].rel > p.rel); assert.ok(!a.mtMate(p.id, 'hang').ok, 'once per teammate per year');
for (const q of tm.list.slice(1, 4)) a.mtMate(q.id, 'compliment'); assert.ok(!a.mtMate(tm.list[5].id, 'hang').ok, 'cap of 4 a year');
const sk0 = a.getMyTeam().skills[0]; const r = a.mtTrain(sk0.name); assert.ok(r.ok, r.message); assert.ok(a.getMyTeam().skills.find((x) => x.name === sk0.name).value > sk0.value, 'skill trained');
// coaching: 10 years pro counts, retire & coach path
const cs = a.getCoaching(); assert.equal(cs.exPlayer, true); assert.ok(/Yes \(10 yrs pro/.test(cs.expLabel), cs.expLabel); assert.ok(cs.canRetireCoach); assert.ok(!/play a sport first/.test(cs.why));
const sid = cs.sports[0].id; const rr = a.coachAction('take', sid, { retire: true }); assert.ok(rr.ok, rr.message); assert.ok(!MT.jobIsAthlete(a.s), 'retired'); assert.ok(a.getCoaching().active);
// release system: age vs performance
{ const y = await mk('Starter', 3, 2); y.s.age = 24; const yv = MT.rosterSecurity(y.s); const o = await mk('Starter', 3, 12); o.s.age = 38; const ov = MT.rosterSecurity(o.s);
  assert.ok(yv && ov && yv.security > ov.security + 20 && ov.risk > yv.risk, `young ${yv.security} vs vet ${ov.security}`); assert.ok(ov.factors.some((f) => /prime/.test(f.label) && f.value < 0), 'age factor explained');
  assert.ok(y.getMyTeam().security, 'security on My Team'); let cut = 0; for (let i = 0; i < 60; i++) { o.s.pending = []; if (MT.releaseRoll(o.s)) cut++; } assert.ok(cut > 10, 'old vets get cut: ' + cut);
  for (const [i, chk] of [[1, (s) => (s.sl.job || {}).step === 1], [2, (s) => !MT.jobIsAthlete(s) && s.flags.ex_pro]]) { const z = await mk('Starter', 3, 12); z.s.age = 38; z.s.pending = []; MT.ensure(z.s).released = { age: 38, team: 'X', level: 'pro', sec: 20 }; z.s.pending.push({ kind: 'released' }); const c = E.pendingCard(z.s); assert.equal(c.choices.length, 3); const r = E.resolveCard ? E.resolveCard(z.s, i) : null; assert.ok(chk(z.s), 'release choice ' + i); assert.ok(!z.s.pending.length); } }
// skill aging curve + train vs no-train
assert.deepEqual([27, 28, 32, 35, 38, 40, 42, 45, 50].map((x) => Math.round(MT.declineRisk(x) * 100)), [0, 10, 20, 30, 40, 50, 60, 70, 85]);
{ const z = await mk('Starter', 3, 3); z.s.age = 25; const sid = z.getMyTeam().sportId, names = z.getMyTeam().skills.map((x) => x.name); for (const n of names) MT.setSkill ? 0 : 0;
  const pre = Object.fromEntries(z.getMyTeam().skills.map((x) => [x.name, x.value])); const tr = names.slice(0, 3); for (const n of tr) z.mtTrain(n); const mid = Object.fromEntries(z.getMyTeam().skills.map((x) => [x.name, x.value]));
  z.s.age = 26; const out = MT.skillAging(z.s, sid); const post = Object.fromEntries(z.getMyTeam().skills.map((x) => [x.name, x.value]));
  for (const n of tr) assert.ok(post[n] > pre[n], 'trained skill up: ' + n); for (const n of names.slice(3)) assert.ok(post[n] < mid[n], 'untrained skill down: ' + n); assert.equal(out.declined.length, 0, 'no age decline at 26'); }
// Autopilot trains the lowest 3 right after AGE, and the buttons are then done
{ const Pm = await import('../src/premium.js'); Pm.setOwned('autopilot'); const z = await mk('Starter', 3, 3); z.s.age = 25; z.s.auto = null; z.setAutopilot ? z.setAutopilot({ on: true }) : null; const Au = await import('../src/autopilot.js'); Au.ensure(z.s); z.s.auto.on = true; assert.ok(z.s.auto.routines.includes('mt_train'), 'mt_train default on');
  let before = null; const orig = z.mtTrainLowest.bind(z); z.mtTrainLowest = (...x) => { before = Object.fromEntries(z.getMyTeam().skills.map((q) => [q.name, q.value])); return orig(...x); }; z.s.pending = []; z.s.diseases = []; const r = await z.age(); let g = 0; while (z.s.pending.length && g++ < 8) E.resolveCard(z.s, 0);
  const v = z.getMyTeam(); assert.equal(v.train.used, v.train.cap, 'used = cap after AGE'); const done = v.skills.filter((x) => x.trained); assert.equal(done.length, 3); assert.ok(before && done.every((x) => x.value > before[x.name]), 'the 3 trained skills went up');
  assert.ok(!z.mtTrain(done[0].name).ok, 'cannot train twice by hand'); }
console.log('athlete_job: PASS');
