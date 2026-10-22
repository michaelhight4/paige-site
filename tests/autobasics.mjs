// Autopilot reliably trains, works out, works harder and reads every year, and those actions show as done (greyed) afterwards. node tests/autobasics.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import * as Pm from '../src/premium.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData(); Pm.resetAll(); Pm.setOwned('autopilot');
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 11 }); await a.init(); a.debugSetup({ age: 25, cash: 1e6 }); a.s.school = null;
const D = (await import('../src/data.js')).D; a.s.job = { id: D.careers[0].id, level: 0, perf: 50, yrs: 0, lvlYrs: 0 };
a.setAutopilot({ on: true });
const want = ['train', 'read', 'workharder'];
for (let y = 0; y < 4; y++) {
  a.age(); let g = 0; while (a.s.pending.length && g++ < 10) { try { a.resolveEvent(0); } catch (e) { a.s.pending.shift(); } }
  const q = [...a.getQuickActions('activities').actions, ...a.getQuickActions('work').actions]; const by = Object.fromEntries(q.map((x) => [x.id, x]));
  for (const id of want) { const x = by[id]; if (!x) continue; assert.ok(x.done || x.disabled, `year ${y}: ${id} should be done/greyed after Autopilot (${JSON.stringify(x)})`); }
  assert.ok(want.filter((id) => by[id]).length >= 2, 'quick actions present: ' + Object.keys(by).join(','));
  const r = a.quickAction('train'); assert.ok(!r.success || r.success === false || r.ok === false || /already/i.test(r.message || ''), 'no doing it twice: ' + JSON.stringify(r).slice(0, 120));
}
console.log('autobasics: PASS'); Pm.resetAll();
