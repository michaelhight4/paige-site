// Scholarships while in college: yearly new applications, renewals (grades/performance), odds from grades/skills/sports/family. node tests/scholarships2.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as Sc from '../src/scholarships.js';
import * as P from '../src/people.js';
import { D } from '../src/data.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('Scholarships in college');
const SD = () => D.scholarData;
const college = (seed = 5, o = {}) => { const s = E.newGame({ seed }); s.age = 19; s.school = 'college'; s.college = { yrs: o.yrs ?? 0 }; s.edu = 1; s.cash = 1e6; s.stats.health = 100; Sc.ensure(s); s.sch.gpa = [o.gpa ?? 3.8, o.gpa ?? 3.8, o.gpa ?? 3.8]; return s; };
const hold = (s, id, pct = 0.3, years = 4) => { const t = SD().types.find((x) => x.id === id); Sc.ensure(s).active.push({ id, name: t.name, pct, basePct: pct, yearsLeft: years, level: 'college', awardedAt: 18, kind: t.kind, renewals: 0, probation: 0 }); return s.sch.active.at(-1); };
const clear = (s) => { let g = 0; while (s.pending.length && g++ < 10) E.resolveCard(s, 0); };
// 1. window while enrolled; new applications each year
{ const s = college(); assert.equal(Sc.window(s), null); assert.equal(Sc.enrolled(s), 'college'); const L = Sc.list(s); assert.ok(L.length > 5 && L.every((x) => 'odds' in x && x.odds >= 20 && x.odds <= 93 && x.enrolled)); assert.ok(L.every((x) => x.id.startsWith('grad_') === false)); assert.ok(L.find((x) => x.id === 'merit').eligible);
  let won = null; for (let i = 0; i < 40 && !won; i++) { const t = college(100 + i); const r = Sc.apply(t, 'merit'); if (r.won) won = t; assert.ok(r.ok); }
  assert.ok(won && won.sch.active[0].yearsLeft === 4 && won.sch.active[0].level === 'college'); const again = Sc.apply(won, 'merit'); assert.ok(!again.ok);
  const t = college(7); t.college.yrs = 2; for (let i = 0; i < 40; i++) { const u = college(300 + i, { yrs: 2 }); const r = Sc.apply(u, 'merit'); if (r.won) { assert.equal(u.sch.active[0].yearsLeft, 2, 'only the years you have left'); break; } }
  // a fresh year opens a fresh application
  const y = college(9); Sc.apply(y, 'merit'); assert.equal(y.sch.applied.merit, 19); y.age = 20; assert.ok(!Sc.list(y).find((x) => x.id === 'merit').tried, 'can apply again next year'); ok('while enrolled: awards open every year, odds listed, years capped at your remaining study'); }
// 2. odds: grades, skills, sports, family finances
{ const a = college(11, { gpa: 3.9 }), b = college(11, { gpa: 2.2 }); const t = SD().types.find((x) => x.id === 'merit'); assert.ok(Sc.odds(a, t).p > Sc.odds(b, t).p, 'grades');
  const c = college(12), d = college(12); E.Skills.ensure(c); E.Skills.ensure(d); Object.keys(c.skills).forEach((k) => (c.skills[k] = 5)); Object.keys(d.skills).forEach((k) => (d.skills[k] = 90)); assert.ok(Sc.odds(d, t).p > Sc.odds(c, t).p, 'skills');
  const ath = SD().types.find((x) => x.id === 'varsity'); const e = college(13), f = college(13); e.sport = { skill: 90 }; f.sport = { skill: 30 }; assert.ok(Sc.odds(e, ath).p > Sc.odds(f, ath).p, 'sports'); assert.ok(Sc.odds(e, ath).parts.sports > 0);
  const need = SD().types.find((x) => x.id === 'need'); const poor = college(14), rich = college(14); for (const p of P.living(poor, 'mother').concat(P.living(poor, 'father'))) p.cash = 0; for (const p of P.living(rich, 'mother').concat(P.living(rich, 'father'))) p.cash = 5e6; assert.ok(Sc.familyScore(rich) > Sc.familyScore(poor)); assert.ok(Sc.odds(poor, need).p > Sc.odds(rich, need).p, 'family finances help need-based odds'); assert.ok(Sc.odds(poor, need).parts.family > 0 && Sc.odds(rich, need).parts.family < 0);
  assert.equal(Sc.odds(poor, t).parts.family, 0, 'family only matters for need-based'); ok('odds respond to grades, skills, sport skill (athletic) and family finances (need-based), with a breakdown'); }
// 3. renewal pays more, needs grades/performance
{ const s = college(15, { yrs: 1 }); const a = hold(s, 'merit', 0.5, 3); s.college.yrs = 1; const st = Sc.renewStatus(s, a); assert.ok(st.eligible && st.raiseTo > 0.5 && st.odds >= 40); let wins = 0, before = a.pct;
  for (let i = 0; i < 30; i++) { const u = college(500 + i, { yrs: 1 }); const x = hold(u, 'merit', 0.5, 3); const r = Sc.renew(u, 'merit'); assert.ok(r.ok); if (r.won) { wins++; assert.ok(x.pct > 0.5 && x.pct <= 0.75 + 1e-9); assert.equal(x.renewals, 1); } else assert.equal(x.pct, 0.5); assert.ok(!Sc.renew(u, 'merit').ok, 'once per year'); }
  assert.ok(wins >= 15 && wins < 30, 'renewals mostly succeed: ' + wins); assert.equal(before, 0.5);
  const lo = college(16, { gpa: 2.0, yrs: 1 }); const b = hold(lo, 'merit', 0.5, 3); const r = Sc.renew(lo, 'merit'); assert.ok(!r.ok && /requirements/.test(r.msg) && Sc.renewStatus(lo, b).missing.length, 'bad grades block renewal');
  const cap = college(17, { yrs: 1 }); const c = hold(cap, 'merit', 0.5, 3); c.pct = 0.75; c.basePct = 0.5; assert.ok(!Sc.renew(cap, 'merit').ok, 'cap'); const full = college(18, { yrs: 1 }); const f1 = hold(full, 'merit', 0.9, 3); f1.basePct = 0.9; assert.ok(Sc.renewStatus(full, f1).raiseTo <= 1);
  const ath = college(19, { yrs: 1, gpa: 3.0 }); const g = hold(ath, 'varsity', 0.6, 3); ath.sport = null; assert.ok(Sc.renewStatus(ath, g).missing.length, 'athletic renewal needs sport performance'); ath.sport = { skill: 40 }; assert.ok(Sc.renewStatus(ath, g).missing.some((m) => /sport skill/.test(m))); ath.sport = { skill: 62 }; assert.equal(Sc.renewStatus(ath, g).missing.length, 0);
  ok(`renewal: raises the award (up to +25 pts), once a year, blocked by low grades / weak sport performance (${wins}/30 renewed)`); }
// 4. yearly review: probation then loss; extra money via tuition factor
{ const s = college(20, { yrs: 1, gpa: 1.8 }); const a = hold(s, 'merit', 0.5, 3); Sc.yearTick(s); assert.equal(a.probation, 1); assert.equal(s.sch.active.length, 1, 'first slip: probation'); s.college.yrs = 2; Sc.yearTick(s); assert.equal(s.sch.active.length, 0, 'second slip: lost'); assert.ok(s.log.some((l) => /lost my Merit/.test(l.text)) && s.log.some((l) => /probation/.test(l.text)));
  const g = college(21, { yrs: 1, gpa: 3.9 }); const b = hold(g, 'merit', 0.5, 3); b.probation = 1; Sc.yearTick(g); assert.equal(b.probation, 0, 'recovery clears probation');
  const x = college(22, { yrs: 1 }), y = college(22, { yrs: 1 }); hold(x, 'merit', 0.5, 3); hold(y, 'merit', 0.75, 3); assert.ok(Sc.tuitionFactor(y) < Sc.tuitionFactor(x), 'a bigger award means less tuition debt'); const dx0 = x.debt, dy0 = y.debt; E.takeTurn(x); E.takeTurn(y); clear(x); clear(y); assert.ok(x.debt - dx0 > y.debt - dy0, 'bigger award, smaller loan');
  ok('yearly review: slipping grades put an award on probation, then take it; recovery clears it; bigger awards cut tuition debt'); }
// 5. full four-year run through the adapter: apply each year, renew, status for the UI
{ const a = new EngineAdapter({ noSave: true, fresh: true, seed: 31 }); await a.init(); const s = a.s; s.age = 18; s.school = null; s.edu = 1; s.cash = 5e6; s.stats.smarts = 95; s.stats.health = 100; E.enrollCollege(s); assert.equal(s.school, 'college'); Sc.ensure(s).gpa = [3.9, 3.9, 3.9]; s.sch.service = 300; s.sch.clubs = ['debate', 'chess']; E.Skills.ensure(s); s.skills.leadership = 60;
  const log = []; let applied = 0, renewed = 0;
  for (let y = 0; y < 4 && s.school === 'college' && s.alive; y++) { clear(s); s.prison = null; s.stats.health = 100; s.stats.smarts = 95; const st = a.getScholarships(); assert.equal(st.enrolled, 'college', JSON.stringify({ school: s.school, prison: s.prison, age: s.age })); assert.ok(st.list.length > 0 && st.tuition === 20000);
    for (const x of st.list.filter((z) => z.eligible)) { const r = a.applyScholarship(x.id); applied++; if (r.won) log.push('won ' + x.id); }
    for (const x of a.getScholarships().active) if (x.renew && x.renew.eligible) { const r = a.renewScholarship(x.id); if (r.won) renewed++; }
    const fin = a.getScholarships(); assert.ok(fin.yearlyWorth >= 0); s.sch.gpa.push(3.9); E.takeTurn(s); }
  assert.ok(applied >= 2, 'applied each year: ' + applied); assert.ok(log.length >= 1, 'won something over 4 years'); ok(`4-year college run: ${applied} applications, ${log.length} won, ${renewed} renewals`); }
// 6. slice (university / grad) enrolment also counts
{ const s = college(40); s.school = null; s.sl = { edu: { inSchool: { id: 'university', yearsLeft: 3, tuition: 20000 }, degrees: {} } }; assert.equal(Sc.enrolled(s), 'college'); assert.equal(Sc.studyYearsLeft(s), 3); const sch = D.sOcc.education.schools.find((x) => x.requires === 'university'); s.sl.edu.inSchool = { id: sch.id, yearsLeft: 2, tuition: 30000 }; assert.equal(Sc.enrolled(s), 'grad'); const L = Sc.list(s); assert.ok(L.some((x) => x.id === 'grad_fellow') && !L.some((x) => x.id === 'merit')); ok('university/grad-school enrolment through the education system also opens yearly awards'); }
console.log('SCHOLARSHIPS2 PASS');
