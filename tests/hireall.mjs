// Global Hire all: plan summary + breakdown + skips, run fills every spot across teams/esports/brand/farm/racing/biz, Autopilot keep. node tests/hireall.mjs
import assert from 'node:assert';
import { EngineAdapter } from '../src/engine_adapter.js';
import { CUSTOM } from '../src/autopilot.js';
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 21 }); await a.init(); a.debugSetup({ age: 30, cash: 1e11 }); a.s.school = null;
a.frAction('buy', { sport: 'soccer', teamId: 'soccer_0', type: 'pro', size: 'small', tier: 'basic' });
a.frAction('create', { sport: 'shooter', size: 'small', tier: 'basic', type: 'pro', name: 'freakshow' });
for (const t of a.s.fr.teams) t.staff = [];
const p = a.hireAllPlan('elite'); assert.ok(p.hires >= 10 && p.companies >= 2, JSON.stringify(p).slice(0, 300)); assert.ok(p.cost > 0 && p.payroll > 0); assert.ok(p.rows.every((r) => r.skip || r.hires > 0));
const r = a.hireAll('elite'); assert.ok(r.success !== false, r.message); assert.ok(a.s.fr.teams.every((t) => t.staff.length >= 5), 'every team staffed');
assert.equal(a.hireAllPlan('elite').hires, 0, 'nothing left after Hire all');
// poor: skipped with reason
a.s.fr.teams.forEach((t) => { t.staff = []; t.cash = 0; t.policy.backstop = false; }); a.s.cash = 0; const p2 = a.hireAllPlan('budget'); assert.ok(p2.rows.some((x) => /cash/.test(x.skip || '')), 'skip says why');
// Autopilot keep filled
a.s.cash = 1e11; a.s.fr.teams.forEach((t) => { t.policy.backstop = true; }); a.setHireAllKeep('standard'); assert.ok(a.s.auto.routines.includes('hire_all')); const c = CUSTOM.hire_all(a); assert.ok(c.ok); c.run(); assert.ok(a.s.fr.teams.every((t) => t.staff.length >= 5));
console.log('hireall: PASS');
