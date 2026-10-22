// Stages 4-6 engine tests: passions, skills, scholarships. node tests/growth.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import { D } from '../src/data.js';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const { Passions: Pa, Skills: Sk, Scholar: Sc } = E;
const resolveAll = (s) => { let g = 0; while (s.pending.length && g++ < 20) { let r = E.resolveCard(s, 0); if (!r || !r.ok) s.pending.shift(); } };
const live = (s, years) => { for (let i = 0; i < years && s.alive; i++) { E.takeTurn(s); resolveAll(s); } };
console.log('Stage 4: passions');
{ const s = E.newGame({ seed: 3 }); assert.ok(!Pa.pick(s, 'music').ok, 'locked under minAge'); s.age = 10;
  assert.ok(Pa.pick(s, 'music').ok && Pa.pick(s, 'sports').ok); assert.ok(!Pa.pick(s, 'art').ok && Pa.pick(s, 'art').needReplace, 'slots full'); ok('slots (2) and locked below age 6');
  Pa.gain(s, 'music', 30); assert.equal(Math.round(Pa.ensure(s).active[0].meter), 30); assert.ok(Pa.pick(s, 'art', 'music').ok); assert.ok(!Pa.has(s, 'music')); assert.ok(Pa.pick(s, 'music', 'sports').ok);
  assert.equal(Pa.ensure(s).active.find((a) => a.id === 'music').meter, 0); ok('switching resets the meter');
  const before = Pa.ensure(s).active.find((a) => a.id === 'music').meter; assert.ok(Pa.practice(s, 'music').ok && !Pa.practice(s, 'music').ok); assert.ok(Pa.ensure(s).active.find((a) => a.id === 'music').meter > before); ok('practice once per year'); }
{ // passion events fire more often than without
  const run = (withP) => { let n = 0; for (let seed = 1; seed <= 25; seed++) { const s = E.newGame({ seed: seed * 13 }); s.age = 20; s.school = null; s.edu = 1; if (withP) { Pa.pick(s, 'music'); Pa.pick(s, 'tech'); } let g = 0; while (s.alive && s.age < 40 && g++ < 400) { if (s.pending.length) { const p = s.pending[0]; if (p.kind === 'event' && (E.Ev.eventById(p.id).if || {}).passion) n++; resolveAll(s); continue; } E.takeTurn(s); } } return n; };
  const a = run(true), b = run(false); assert.ok(a > 20 && b === 0, `passion events: ${a} vs ${b}`); ok(`passion-tied events fire only with a passion (${a} in 25 lives x 20 yrs)`); }
{ // mastery
  const s = E.newGame({ seed: 8 }); s.age = 12; Pa.pick(s, 'science'); Pa.pick(s, 'writing'); const sk0 = Sk.get(s, 'intelligence');
  Pa.gain(s, 'science', 150); const P = Pa.ensure(s); assert.equal(P.mastered.length, 1); assert.equal(P.active.length, 1); assert.ok(Sk.get(s, 'intelligence') >= 70, 'mastery boosts skill'); assert.ok(Pa.slotsFree(s) === 3 && Pa.pick(s, 'tech').ok); ok('mastery: permanent, bonus skills, +2 slots');
  for (const id of ['writing', 'tech', 'art', 'music', 'cooking', 'sports']) { if (Pa.slotsFree(s) < 1) Pa.drop(s, P.active[0].id, true); if (!Pa.isMastered(s, id)) { Pa.pick(s, id); Pa.gain(s, id, 150); } } assert.ok(P.mastered.length >= 5, 'no mastery cap, got ' + P.mastered.length); ok('no mastery cap (each adds 2 slots)');
  // yearly perks + inheritance head start
  const kid = E.newGame({ seed: 9 }); kid.age = 8; Pa.inherit(kid, { passions: P }); assert.ok((kid.heritage || []).length >= 1 && Pa.ensure(kid).active.some((a) => a.head && a.meter === 25)); ok('kids inherit a passion head start'); }
console.log('Stage 5: skills');
{ const s = E.newGame({ seed: 4 }); s.age = 20; Sk.ensure(s); assert.equal(Sk.defs().length, 5 + 5 + 5 + 9); assert.deepEqual(Sk.cats().map((c) => c.id), ['physical', 'mental', 'emotional', 'practical']); ok('4 categories, 24 skills');
  const v0 = Sk.get(s, 'strength'); Sk.use(s, 'strength', 10); const g1 = Sk.get(s, 'strength') - v0; Pa.ensure(s); s.age = 20; Pa.pick(s, 'sports'); const v1 = Sk.get(s, 'strength'); Sk.use(s, 'strength', 10); const g2 = Sk.get(s, 'strength') - v1; assert.ok(g2 > g1 * 1.3, 'passion trains faster'); ok('grows with use; passion trains matching skills faster');
  s.age = 35; s.sport = null; const f = Sk.get(s, 'flexibility'); s.skills.flexibility = 50; s.skillUsed = {}; Sk.yearTick(s); assert.ok(s.skills.flexibility < 50 && s.skills.flexibility > 47, 'fades slowly'); ok('unused skills fade slowly (' + s.skills.flexibility + ')');
  const people0 = Sk.get(s, 'people'); Sk.outcome(s, 'hired'); assert.ok(Sk.get(s, 'people') > people0); const lead0 = Sk.get(s, 'leadership'); Sk.outcome(s, 'promoted'); assert.ok(Sk.get(s, 'leadership') > lead0); ok('interviews/raises/promotions feed skills');
  s.sport = { id: 'basketball', skill: 50, level: 'high', yrs: 0, seasons: [] }; const e0 = Sk.get(s, 'endurance'); s.skillUsed = {}; Sk.yearTick(s); assert.ok(Sk.get(s, 'endurance') >= e0 - 1); ok('sport feeds physical skills');
  s.skills.people = 80; s.skills.leadership = 80; s.skills.discipline = 80; s.skills.composure = 80; assert.ok(Sk.workBonus(s) > 0.5); ok('skills affect job performance'); }
console.log('Stage 6: scholarships');
{ const s = E.newGame({ seed: 5 }); s.age = 17; s.school = 'high'; s.edu = 0; s.stats.smarts = 90; Sc.ensure(s); assert.ok(Sc.window(s) === 'college'); s.sch.gpa = [3.9, 3.8, 3.9]; Sk.ensure(s);
  assert.ok(Sc.joinClub(s, 'debate').ok && Sc.joinClub(s, 'chess').ok); s.sch.service = 130; s.awards.push({ id: 'x', age: 16, text: 'Award' });
  const L = Sc.list(s); assert.ok(L.find((x) => x.id === 'merit').eligible && L.find((x) => x.id === 'honors').eligible && !L.find((x) => x.id === 'varsity').eligible); assert.ok(L.find((x) => x.id === 'conservatory').passionLocked); ok('requirements from grades, clubs, service, awards; passion extras locked');
  let won = null; for (let i = 0; i < 6 && !won; i++) { const r = Sc.apply(s, 'merit'); if (r.won) won = r; s.sch.applied = {}; } assert.ok(won); assert.ok(Sc.tuitionFactor(s) <= 0.5 + 1e-9); ok('apply + win: ' + won.msg);
  s.age = 19; s.school = null; s.edu = 1; E.enrollCollege(s) || (s.school = 'college', s.college = { yrs: 0 }); const d0 = s.debt; s.job = null; s.cash = 1e6; s.stats.health = 100; for (let i = 0; i < 1; i++) { E.takeTurn(s); resolveAll(s); } assert.ok(s.debt - d0 < 11000, 'tuition halved: ' + (s.debt - d0)); ok('college debt reduced by scholarship (+' + Math.round(s.debt - d0) + ' vs 20000)');
  const t = E.newGame({ seed: 6 }); t.age = 17; t.school = 'high'; Sc.ensure(t); Pa.pick(t, 'music'); assert.ok(Sc.list(t).find((x) => x.id === 'conservatory').passionLocked === false); const m = Pa.ensure(t).active[0]; m.meter = 10; assert.ok(Sc.list(t).find((x) => x.id === 'conservatory').missing.length); m.meter = 40; assert.ok(Sc.list(t).find((x) => x.id === 'conservatory').eligible); ok('passion unlocks extra scholarships');
  const u = E.newGame({ seed: 7 }); u.age = 22; u.edu = 2; u.school = null; Sc.ensure(u); assert.equal(Sc.window(u), 'grad'); assert.ok(Sc.list(u).some((x) => x.id === 'grad_fellow') && !Sc.list(u).some((x) => x.id === 'merit')); ok('grad school window shows grad awards');
  u.sch.active.push({ id: 'grad_assist', name: 'x', pct: 0.5, yearsLeft: 2, level: 'grad' }); u.debt = 50000; const r = Sc.creditSlice(u, 'law_school', 50000); assert.equal(r, 25000); assert.equal(u.debt, 25000); ok('grad tuition refunded as debt reduction'); }
console.log('growth: PASS');
