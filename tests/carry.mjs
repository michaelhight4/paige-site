// School carry-over: team/club follow the student to the next school, tryouts skipped, note in the year summary. node tests/carry.mjs
import assert from 'node:assert/strict';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
import * as E from '../src/engine.js';
import * as SS from '../src/schoolsports.js';
import * as Scholar from '../src/scholarships.js';
import * as Carry from '../src/schoolcarry.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('School carry-over');
const ageTo = (s, a) => { let g = 0; while (s.alive && s.age < a && g++ < 40) { while (s.pending.length) { const p = s.pending[0]; if (p.kind === 'college') E.resolveCard(s, 0); else E.resolveCard(s, 0); } E.takeTurn(s); } };
const toCollegeCard = (s) => { let g = 0; while (g++ < 40) { while (s.pending.length && s.pending[0].kind !== 'college') E.resolveCard(s, 0); if (s.pending.length) return; E.takeTurn(s); } };
const mk = (seed) => { const s = E.newGame({ seed }); s.stats.health = 90; return s; };
// --- elementary -> high school
let s = mk(21); ageTo(s, 11); assert.equal(s.school, 'primary');
assert.ok(SS.join(s, 'basketball')); const team0 = s.sport.team, skill0 = s.sport.skill; s.sport.tryout = 'new';
Scholar.ensure(s).clubs.push('chess');
ageTo(s, 13); assert.equal(s.school, 'high');
assert.ok(s.sport, 'team carried'); assert.equal(s.sport.level, 'high'); assert.equal(s.sport.tryout, 'skipped'); assert.equal(s.sport.carried, true); assert.notEqual(s.sport.team, team0, 'new school has its own team name');
assert.ok(s.sch.clubs.includes('chess'), 'club carried');
const yearly = s.log.filter((l) => l.kind === 'yearly' && /moved up to the high school basketball team/.test(l.text)); assert.ok(yearly.length === 1 && /skipped the tryouts/.test(yearly[0].text) && /Chess Club/.test(yearly[0].text), 'year summary note: ' + JSON.stringify(yearly.map((l) => l.text)));
ok('elementary team + club carry into high school with a new team name and a year-summary note');
assert.ok(s.sport.skill >= skill0 - 5, 'skill kept');
// --- high school -> college (card)
ageTo(s, 17); assert.equal(s.school, 'high'); s.sport.skill = 70;
toCollegeCard(s);
assert.equal(s.pending[0].kind, 'college'); assert.equal(s.sport, null, 'parked while deciding'); assert.ok(s.carry && s.carry.sport && s.carry.clubs.includes('chess'));
const card = E.pendingCard(s); assert.ok(card.choices.length === 3 && /athletic scholarship/.test(card.choices[1].label), 'scholarship choice is its own option now: ' + card.choices.map((c) => c.label));
E.resolveCard(s, 1); assert.equal(s.school, 'college'); assert.ok(s.sport && s.sport.level === 'college' && s.sport.scholarship && s.sport.tryout === 'skipped'); assert.ok(s.sch.clubs.includes('chess')); assert.equal(s.carry, null);
assert.ok(s.log.some((l) => /moved up to the college basketball team/.test(l.text) && /Chess Club/.test(l.text)));
ok('high school team + club carry to college on enrolling (scholarship option works)');
// --- skip college: team ends, club gone
let t = mk(23); ageTo(t, 12); SS.join(t, 'soccer'); Scholar.ensure(t).clubs.push('band'); ageTo(t, 17); toCollegeCard(t);
assert.equal(t.pending[0].kind, 'college'); E.resolveCard(t, E.pendingCard(t).choices.length - 1); assert.equal(t.sport, null); assert.equal(t.carry, null); assert.equal(t.school, null);
ok('skipping college ends the team (nothing carried)');
// --- never joined: nothing happens; quitters are not auto-joined
let u = mk(23); ageTo(u, 13); assert.equal(u.sport, null); assert.equal(u.log.filter((l) => /skipped the tryouts/.test(l.text)).length, 0);
let q = mk(24); ageTo(q, 11); SS.join(q, 'basketball'); SS.quit(q, 'left'); ageTo(q, 13); assert.equal(q.sport, null);
ok('players who never joined or who quit are not auto-joined');
// --- deterministic team names, no RNG use
const a = mk(25), b = mk(25); assert.equal(Carry.teamName(a, 'soccer', 'high', null), Carry.teamName(b, 'soccer', 'high', null)); const r0 = a.rs; Carry.teamName(a, 'soccer', 'high', 'x'); assert.equal(a.rs, r0);
ok('team names deterministic, RNG untouched');
console.log('CARRY PASS');
