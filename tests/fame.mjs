import * as E from '../src/engine.js'; import { EngineAdapter } from '../src/engine_adapter.js'; import * as Fame from '../src/fame.js'; import * as Pm from '../src/premium.js'; import * as Auto from '../src/autopilot.js'; import assert from 'node:assert/strict';
const M = new Map(); globalThis.localStorage ??= { getItem: (k) => (M.has(k) ? M.get(k) : null), setItem: (k, v) => M.set(k, String(v)), removeItem: (k) => M.delete(k) };
await E.loadData();
assert.equal(Fame.tierOf(0).name, 'Unknown'); assert.equal(Fame.tierOf(10).name, 'Local Name'); assert.equal(Fame.tierOf(30).name, 'Well Known'); assert.equal(Fame.tierOf(60).name, 'A-List'); assert.equal(Fame.tierOf(90).name, 'Global Icon');
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 8 }); await a.init(); a.debugSetup({ age: 30, cash: 1000 }); const s = a.s;
s.stats.fame = 2; let f = a.getFame(); assert.ok(f.spots.every((q) => !q.ok), 'unknown: everything locked'); assert.ok(/Needs Local Name/.test(f.spots[0].reason));
s.stats.fame = 30; f = a.getFame(); assert.equal(f.tier, 'Well Known'); assert.ok(f.spots.find((q) => q.id === 'movie').ok); assert.ok(!f.spots.find((q) => q.id === 'host').ok, 'hosting needs A-List');
const pLow = Fame.quote(s, 'endorse').pay; s.stats.fame = 85; const pHigh = Fame.quote(s, 'endorse').pay; assert.ok(pHigh > pLow * 5, 'pay scales with tier ' + pLow + ' ' + pHigh);
s.stats.stress = 0; const c0 = s.cash; let n = 0; for (const id of ['endorse', 'talk', 'podcast', 'tv_role']) { const r = a.fameTake(id); if (r.ok) n++; }
assert.equal(n, 3, 'yearly cap of 3'); assert.equal(a.getFame().used, 3); assert.ok(s.stats.stress > 0, 'stress toll'); assert.ok(s.cash >= c0);
assert.ok(!a.fameTake('endorse').ok, 'once per kind per year');
const p1 = Fame.quote(s, 'movie'); assert.ok(!p1.ok && /cap/.test(p1.reason));
// overexposure: second spot in a year pays less than the first
const b = new EngineAdapter({ noSave: true, fresh: true, seed: 9 }); await b.init(); b.debugSetup({ age: 30, cash: 0 }); b.s.stats.fame = 60; const q0 = Fame.quote(b.s, 'movie').pay; b.fameTake('talk'); assert.ok(Fame.quote(b.s, 'movie').pay < q0, 'overexposure lowers pay');
// next year resets
s.age += 1; assert.equal(a.getFame().used, 0);
// state exposes the banner tier
assert.equal(a.getState().fameTier.name, 'Global Icon');
// autopilot routine, same rules
Pm.resetAll(); Pm.setOwned('autopilot'); const c = new EngineAdapter({ noSave: true, fresh: true, seed: 10 }); await c.init(); c.debugSetup({ age: 30, cash: 0 }); Pm.setOwned('autopilot'); c.s.stats.fame = 40; c.s.stats.stress = 0;
assert.ok(Auto.routineDef('fame_spots')); Auto.configure(c.s, { on: true, routines: ['fame_spots'] }); c.s.pending = []; c.s.diseases = []; c.s.stats.health = 90; c.s.cash = 1e5; const py = await Auto.playYear(c, { routines: ['fame_spots'], floor: 0 }); if (!c.getFame().used) console.log(JSON.stringify(py).slice(0, 400)); assert.ok(c.getFame().used >= 1, 'autopilot took spots');
assert.ok(Auto.yearlyOptions(c, 'Use your fame').some((o) => o.id === 'fame_spots'));
console.log('fame: PASS');
