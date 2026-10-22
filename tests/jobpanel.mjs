// Job panel: coworkers with traits, yearly caps, boss, promotion readiness + asking, raise, Autopilot routines.
import * as E from '../src/engine.js'; import { EngineAdapter } from '../src/engine_adapter.js'; import assert from 'node:assert/strict';
const M = new Map(); globalThis.localStorage ??= { getItem: (k) => (M.has(k) ? M.get(k) : null), setItem: (k, v) => M.set(k, String(v)), removeItem: (k) => M.delete(k) };
await E.loadData();
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 12, noInterview: true }); await a.init(); a.debugSetup({ age: 30, cash: 1e6 }); a.s.school = null; a.s.edu = 3;
E.takeJob ? E.takeJob(a.s, E.D.careers[0].id) : (a.s.job = { id: E.D.careers[0].id, level: 0, perf: 50, yrs: 0, lvlYrs: 0 });
let v = a.getJobPanel(); assert.ok(v && v.coworkers.length >= 3 && v.coworkers.every((c) => c.role && c.prof && c.ethic && c.persona && c.rel >= 0)); assert.ok(v.boss.name);
const c0 = v.coworkers[0]; assert.ok(a.jobCoworker(c0.id, 'chat').ok); assert.ok(a.getJobPanel().coworkers[0].rel > c0.rel); assert.ok(!a.jobCoworker(c0.id, 'chat').ok, 'once per coworker a year');
for (const c of v.coworkers.slice(1, 4)) a.jobCoworker(c.id, 'compliment'); if (v.coworkers.length > 4) assert.ok(!a.jobCoworker(v.coworkers[4].id, 'chat').ok, 'cap 4');
a.s.job.perf = 95; a.s.job.lvlYrs = 2; a.s.job.boss.rel = 90; assert.ok(a.getJobPanel().readiness >= 85);
let promoted = 0; for (let i = 0; i < 30; i++) { a.s.job.level = 0; a.s.job.jp.promo = 0; a.jobBoss('promotion'); if (a.s.job.level === 1) promoted++; } assert.ok(promoted > 18, 'high readiness usually promotes: ' + promoted);
a.s.job.perf = 20; a.s.job.lvlYrs = 0; a.s.job.boss.rel = 20; assert.ok(a.getJobPanel().readiness < 25); assert.ok(a.jobBoss('raise').ok); assert.ok(!a.jobBoss('raise').ok, 'raise once a year');
const Au = await import('../src/autopilot.js'); assert.ok(Au.ROUTINES.some((r) => r.id === 'job_nurture') && Au.ROUTINES.some((r) => r.id === 'job_promo'));
console.log('jobpanel: PASS');
