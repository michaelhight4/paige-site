// Owned teams never duplicate across AGE + save/load; cloned 7b saves are deduped (doubled loss refunded); bare 'sports' businesses become full teams with staff. node tests/dupteams.mjs
import assert from 'node:assert';
import { EngineAdapter } from '../src/engine_adapter.js';
import * as Fr from '../src/franchise.js';
import * as PFx from '../src/premium_fx.js';
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 9 }); await a.init(); a.debugSetup({ age: 30, cash: 1e12 }); a.s.school = null;
assert.ok(a.frAction('create', { sport: 'shooter', size: 'small', tier: 'basic', type: 'pro', name: 'freakshow' }).success !== false);
assert.ok(a.frAction('buy', { sport: 'soccer', teamId: 'soccer_0', type: 'pro', size: 'small', tier: 'basic' }).success !== false);
const uniq = (arr) => new Set(arr).size === arr.length;
for (let i = 0; i < 3; i++) { a.age(); let g = 0; while (a.s.pending.length && g++ < 10) { try { a.resolveEvent(0); } catch (e) { a.s.pending.shift(); } } a.s = JSON.parse(JSON.stringify(a.s));
  const owned = a.getBusinesses().owned.map((x) => x.id), ids = a.s.fr.teams.map((t) => t.id);
  assert.equal(ids.length, 2, 'two teams in state, got ' + ids); assert.ok(uniq(ids), 'state ids unique ' + ids); assert.ok(uniq(owned), 'Owned ids unique ' + owned); }
// cloned save -> dedupe + refund
const s = a.s, t = s.fr.teams[0], clone = JSON.parse(JSON.stringify(t)); clone.last = { ...(clone.last || {}), profit: -1000000 }; s.fr.teams.push(clone); const c0 = s.cash;
Fr.ensure(s); assert.equal(s.fr.teams.length, 2, 'clone removed'); assert.equal(s.cash - c0, 1000000, 'doubled loss refunded');
// bare sports business -> real franchise team with staff
s.biz.push({ id: 77, type: 'sports', kind: 'sports', name: 'Harbor Hawks', rep: 89, cash: 0, staff: [] }); const n = s.fr.teams.length; PFx.convertSportsBiz(s);
assert.ok(!s.biz.some((b) => b.type === 'sports')); assert.equal(s.fr.teams.length, n + 1); const hk = s.fr.teams.find((x) => x.name === 'Harbor Hawks'); assert.ok(hk && hk.staff.length >= 4, 'Harbor Hawks has staff ' + (hk && hk.staff.length));
console.log('dupteams: PASS');
