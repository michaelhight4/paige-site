// Train employees: same cost/effect by hand or Autopilot, once a year per company, button state reports done. node tests/trainstaff.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import { CUSTOM } from '../src/autopilot.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData();
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 13 }); await a.init(); a.debugSetup({ age: 30, cash: 5e6 }); const s = a.s;
const Biz = await import('../src/business.js'); const type = Object.keys(E.D.bizTypes).find((k) => E.D.bizTypes[k].kind !== 'studio' && E.D.bizTypes[k].kind !== 'sports' && Biz.rolesOf({ type: k }).length);
s.biz.push({ id: 501, type, name: 'Corner Co', staff: [], equip: {}, rep: 50, valuation: 1e5, cash: 0 }); const b = s.biz[s.biz.length - 1]; const role = Biz.rolesOf(b)[0];
for (let i = 0; i < 3; i++) Biz.hire(s, b, role.id, 'mid'); const sk0 = b.staff.map((p) => p.skill), c0 = s.cash, cost = Biz.trainCost(b);
let r = a.trainBizStaff(501); assert.ok(r.success !== false, r.message); assert.equal(c0 - s.cash, cost); assert.ok(b.staff.every((p, i) => p.skill === Math.min(95, sk0[i] + 4)));
assert.ok(a.getBusiness(501).train.done, 'button greyed'); { const x = a.trainBizStaff(501); assert.ok(x.success === false || x.ok === false, 'once per year ' + JSON.stringify(x).slice(0, 150)); }
a.age(); s.pending = []; assert.ok(!a.getBusiness(501).train.done || b.trainedAge === Math.floor(s.age), 'new year resets (unless Autopilot already ran)');
b.trainedAge = -1; const c1 = s.cash, k1 = b.staff.map((p) => p.skill), co = Biz.trainCost(b); const c = CUSTOM.train_employees(a); assert.ok(c.ok); c.run();
assert.equal(c1 - s.cash, co, 'Autopilot pays the same'); assert.ok(b.staff.every((p, i) => p.skill === Math.min(95, k1[i] + 4))); assert.ok(a.getBusiness(501).train.done); assert.equal(CUSTOM.train_employees(a).ok, false, 'Autopilot once a year');
console.log('trainstaff: PASS');
