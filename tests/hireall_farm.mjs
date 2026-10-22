// Regression: a big farm that needs ~160 hands with only 4 hired must NOT be reported as "fully staffed"; Hire all fills it to what it needs. node tests/hireall_farm.mjs
import assert from 'node:assert';
import { EngineAdapter } from '../src/engine_adapter.js';
import * as Fm from '../src/farm.js';
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 33 }); await a.init(); a.debugSetup({ age: 30, cash: 1e11 }); a.s.school = null;
const r = a.farmAction('found', { loc: 'plains', product: 'dairy', acres: 3200, name: 'Big Farm' });
assert.ok(r.ok, r.message); const f = a.s.farm;
const need = Fm.workersNeeded(f); assert.equal(need, 160, 'dairy on 3200 acres needs 160 (the reported case)'); assert.ok(need > 40, 'needs more than the old flat 40 cap: ' + need);
f.staff = f.staff.filter((x) => x.role !== 'hand'); for (let i = 0; i < 4; i++) assert.ok(Fm.hire(a.s, 'hand', 'hand:x:' + (i % 3)).ok, 'manual hand hires (same candidate twice ok for hands)');
const row = a.hireAllPlan('standard').rows.find((x) => x.key === 'farm'); assert.ok(row && !row.skip, 'farm not "fully staffed" at 4/' + need + ': ' + JSON.stringify(row)); assert.ok(row.hires >= need - 4, `plans ${row.hires} hires`);
a.hireAll('standard'); const hands = f.staff.filter((x) => x.role === 'hand').length; assert.ok(hands >= need, `filled ${hands}/${need}`); assert.equal(new Set(f.staff.map((x) => x.id)).size, f.staff.length, 'unique staff ids');
const r2 = a.hireAllPlan('standard').rows.find((x) => x.key === 'farm'); assert.equal(r2.skip, 'fully staffed');
console.log(`  ok - farm needing ${need} hands: 4 hired -> Hire all fills to ${hands}, then fully staffed`); console.log('HIREALL FARM PASS');
