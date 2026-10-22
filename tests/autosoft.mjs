// 7c1: Autopilot basics run every year even during soft pauses (cash floor, illness) and after cards are dropped; chips then show done.
import assert from 'node:assert/strict';
import { EngineAdapter } from '../src/engine_adapter.js';
import * as Premium from '../src/premium.js';
import * as Au from '../src/autopilot.js';
{ const a0 = new EngineAdapter({ noSave: true }); await a0.init(); } Premium.setOwned('autopilot', true);
let years = 0;
for (const seed of [11, 12, 13]) {
  const ad = new EngineAdapter({ noSave: true, seed }); await ad.init(); ad.s.auto = null; const A = Au.ensure(ad.s); A.on = true;
  for (let y = 0; y < 60 && ad.s.alive; y++) {
    await ad.age({}); for (let k = 0; k < 20 && ad.s.pending.length; k++) { ad.nextEvent(); if (!ad.s.pending.length) break; await ad.resolveEvent(null, 0); } ad.s.pending.length = 0; ad.nextEvent(); await 0;
    if (!ad.s.alive || ad.s.prison) continue; years++;
    const q = [...ad.getQuickActions('skills').actions, ...ad.getQuickActions('work').actions];
    for (const id of ['train', 'read', 'study', 'workharder']) { const x = q.find((a) => a.id === id); if (x) assert.ok(x.done || x.disabled, `seed ${seed} age ${Math.floor(ad.s.age)}: ${id} left undone (${JSON.stringify(A.last && A.last.paused)})`); }
    const t = q.find((a) => a.id === 'train'); if (t && t.done) assert.equal(ad.quickAction('train').ok, false, 'train cannot be repeated');
  }
}
{ const ad = new EngineAdapter({ noSave: true, seed: 5 }); await ad.init(); ad.s.auto = null; const A = Au.ensure(ad.s); A.on = true; ad.s.age = 20; ad.s.cash = 10; ad.s.acted = {};
  const p = await Au.playYear(ad, {}); assert.equal(p.stopBefore.kind, 'floor'); assert.ok(p.ran.some((r) => r.id === 'train') && p.ran.some((r) => r.id === 'read'), 'basics ran during a floor pause'); }
console.log('checked', years, 'years'); console.log('PASS autosoft');
