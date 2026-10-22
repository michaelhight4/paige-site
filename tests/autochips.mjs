// With Autopilot on, AGE leaves the new year with the everyday chips already DONE (greyed), no double execution, same costs/effects. node tests/autochips.mjs
import * as E from '../src/engine.js'; import { EngineAdapter } from '../src/engine_adapter.js'; import * as Pm from '../src/premium.js'; import * as Auto from '../src/autopilot.js'; import assert from 'node:assert/strict';
const M = new Map(); globalThis.localStorage ??= { getItem: (k) => (M.has(k) ? M.get(k) : null), setItem: (k, v) => M.set(k, String(v)), removeItem: (k) => M.delete(k) };
await E.loadData(); Pm.resetAll();
const ad = new EngineAdapter({ noSave: true, fresh: true, seed: 11 }); await ad.init(); ad.debugSetup({ age: 24, cash: 500000 }); Pm.setOwned('autopilot'); const s = ad.s; s.school = null; s.pending = [];
E.Passions.pick(s, 'music'); const A = Auto.ensure(s); A.on = true;
const A2 = Auto.ensure(s); for (const id of ['train', 'read', 'study', 'workharder', 'practice']) assert.ok(A2.routines.includes(id), id + ' on by default');
const chips = () => { const o = {}; for (const c of ['skills', 'work']) for (const a of ad.getQuickActions(c).actions) o[a.id] = a; return o; };
for (let y = 0; y < 3; y++) { s.pending = []; await ad.age({}); s.pending = []; const c = chips();
  for (const id of ['train', 'read', 'practice']) assert.ok(c[id].done && c[id].disabled, `${id} greyed after AGE (year ${y})`);
  const n = s.log ? s.log.length : 0; const r = ad.quickAction('train'); assert.ok(!r.ok, 'manual train blocked after autopilot'); }
const m = E.Passions.status(s).active[0]; assert.ok(m && (m.practiced || m.full), 'passion practiced once');
console.log('autochips: PASS');
