// Obituary from a rich life: retired pro career, titles, owned companies + teams, wealth, family; ordinary life reads naturally.
import * as E from '../src/engine.js'; import { EngineAdapter } from '../src/engine_adapter.js'; import * as MT from '../src/myteam.js'; import * as L from '../src/legacy.js'; import assert from 'node:assert/strict';
const M = new Map(); globalThis.localStorage ??= { getItem: (k) => (M.has(k) ? M.get(k) : null), setItem: (k, v) => M.set(k, String(v)), removeItem: (k) => M.delete(k) };
await E.loadData();
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 77 }); await a.init(); a.debugSetup({ age: 30, cash: 5e9 }); const s = a.s; s.school = null; s.edu = 2;
const B = await import('../src/slice_bridge.js'); const sl = B.slice(s); sl.job = { kind: 'special', special: 'athlete', id: 'sp_athlete_4', title: 'Franchise Player', wage: 9e6, years: 0, yearsInLevel: 0, step: 4, sector: 'special' }; B.push(s);
for (let y = 0; y < 6; y++) { s.pending = []; s.diseases = []; s.cash = Math.max(s.cash, 5e9); E.takeTurn(s); let g = 0; while (s.pending.length && g++ < 8) E.resolveCard(s, s.pending[0].kind === 'released' ? 1 : 0); }
MT.ensure(s).awards.push({ id: 'champion', label: 'League champion', age: 33 }, { id: 'mvp', label: 'League MVP', age: 34 }); MT.retirePlayer(s);
a.foundBusiness({ type: (await a.getBusinesses()).types[0].id }); await a.prodAction('game', 'found'); a.frAction('buy', { sport: 'soccer', teamId: 'soccer_0', type: 'pro', size: 'small', tier: 'basic', preset: 'balanced' });
s.people.push({ id: 9001, name: 'Dana Q', rel: 'spouse', alive: true, age: 70, gender: 'f' }, { id: 9002, name: 'Kid Q', rel: 'child', alive: true, age: 40, gender: 'm' });
s.cash = 1.8e18; s.stats.fame = 90; s.age = 78; L.die(s, 'old', 'old age', 'old');
const d = a.getDeathSummary(); const o = d.obituary;
console.log(o);
assert.match(o, /pro \w+ career/); assert.match(d.headline, /Retired pro \w+ player/); assert.notEqual(d.headline, 'None');
assert.match(o, /championship/); assert.match(o, /owned/); assert.ok((await a.getBusinesses()).owned.length >= 1);
assert.match(o, /surrounded by family/); assert.match(o, /spouse Dana Q/); assert.ok(!/never held a job|nurses/.test(o)); assert.ok(d.topAward, 'top award for the ribbon'); assert.match(o, /quint/);
// ordinary life
const b = new EngineAdapter({ noSave: true, fresh: true, seed: 5 }); await b.init(); b.debugSetup({ age: 60, cash: 2000 }); b.s.people = b.s.people.filter((p) => p.rel !== 'child' && p.rel !== 'spouse'); L.die(b.s, 'disease', 'Cancer', 'cancer'); const o2 = b.getDeathSummary().obituary;
assert.match(o2, /died at 60, after a long battle with cancer/); assert.match(o2, /no children/);
console.log('obituary: PASS');
