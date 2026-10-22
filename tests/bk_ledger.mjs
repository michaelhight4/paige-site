// Bankruptcy net ledger (hotfix 7b1): bills charged before the turn's income no longer fake a shortfall; stale popups clear; loan cap scales with net worth.
import * as E from '../src/engine.js'; import * as Bk from '../src/bankruptcy.js'; import * as Biz from '../src/business.js'; import { spend, earn } from '../src/core.js'; import assert from 'node:assert/strict';
import { EngineAdapter } from '../src/engine_adapter.js';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData();
const ok = (m) => console.log('  ok -', m);
const mk = (cash = 0) => { const s = E.newGame({ seed: 9 }); s.age = 30.5; s.step = 1; s.cash = cash; s.debt = 0; s.pending = []; s.shortfall = 0; return s; };
const bill = (s, upkeep) => s.assets.push({ uid: 'yacht', id: 'x', kind: 'boat', name: 'Test yacht', value: 1, upkeep, dep: 0, joy: 0 });
// 1. ledger unit: a bill before income inside a tick nets out
let s = mk(0); s.bkLedger = true; spend(s, 1.62e6); assert.ok(s.cash < 0 && !s.shortfall); earn(s, 5e6); Bk.check(s);
assert.equal(s.pending.length, 0); assert.equal(Math.round(s.cash), 5e6 - 1.62e6); assert.ok(!s.bkLedger); ok('ledger: bill before income, no popup');
// 2. real turn: $1.62M yacht upkeep charged in lifeTick, business payout credited later in the same turn
s = mk(1e8); bill(s, 1.62e6); const r = Biz.found(s, Object.keys(E.D.bizTypes)[0]); s.cash = 0; if (r && r.biz) r.biz.tail = 5e7; else earn(s, 0);
assert.ok(r && r.biz, 'business founded'); E.takeTurn(s);
assert.ok(!s.pending.some((p) => p.kind === 'bankruptcy'), 'rich player got bankruptcy popup'); assert.ok(s.cash > 0); assert.ok(!(s.shortfall > 1)); ok('takeTurn: rich player whose bills come before income gets no popup');
// 3. truly broke adult still gets it (net negative)
s = mk(100); bill(s, 50000); E.takeTurn(s); const p = s.pending.find((x) => x.kind === 'bankruptcy');
assert.ok(p, 'broke adult popup'); assert.ok(s.shortfall > 40000); assert.equal(s.cash, 0); assert.equal(Bk.card(s).choices.length, 3); ok('broke adult still gets the popup');
// 4. minors keep silent debt even through the ledger
s = mk(0); s.age = 12.5; s.bkLedger = true; spend(s, 500); Bk.settle(s); assert.ok(s.debt >= 500 && !s.shortfall); ok('minor: debt, no popup');
// 5. stale popup from an old save: cash now covers it -> cleared at next turn / load
s = mk(5e6); s.shortfall = 1.62e6; s.pending = [{ kind: 'bankruptcy', owed: 1.62e6, year: 30 }];
assert.ok(Bk.reconcile(s)); assert.equal(s.pending.length, 0); assert.equal(s.shortfall, 0); assert.equal(Math.round(s.cash), 5e6 - 1.62e6);
s = mk(5e6); s.shortfall = 1.62e6; s.pending = [{ kind: 'bankruptcy', owed: 1.62e6, year: 30 }]; assert.ok(E.takeTurn(s), 'turn runs after stale popup clears'); assert.ok(!s.pending.some((x) => x.kind === 'bankruptcy'));
s = mk(1000); s.shortfall = 1.62e6; s.pending = [{ kind: 'bankruptcy', owed: 1.62e6, year: 30 }]; assert.ok(!Bk.reconcile(s)); assert.equal(s.pending.length, 1); ok('stale popup re-evaluated (cleared when cash covers it, kept otherwise)');
// 6. loan cap scales: max($250K, 40% of net worth before debt); none when credit is ruined
s = mk(0); assert.equal(Bk.loanCap(s), 250000);
s = mk(0); s.assets.push({ uid: 'h', id: 'h', kind: 'house', name: 'Mansion', value: 1e7, upkeep: 0, dep: 0, joy: 0 }); s.debt = 1e6;
assert.equal(Bk.loanCap(s), 4e6); assert.equal(Bk.loanRoom(s), 3e6); s.bk = { times: 1, until: 99, history: [] }; assert.equal(Bk.loanRoom(s), 0);
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 9 }); await a.init(); a.debugSetup({ age: 30, cash: 0 }); a.s.debt = 0; a.s.cash = 0;
a.s.assets.push({ uid: 'h2', id: 'h', kind: 'house', name: 'Mansion', value: 5e6, upkeep: 0, dep: 0, joy: 0 });
const cap = Bk.loanCap(a.s); assert.ok(cap >= 2e6, 'cap ' + cap); assert.ok(a.takeLoan(1e6).ok, 'big loan allowed'); assert.ok(!a.takeLoan(cap).ok, 'over cap refused');
a.s.bk = { times: 1, until: 99, history: [] }; assert.ok(!a.takeLoan(1000).ok, 'ruined credit refused'); ok('loan cap scales with net worth, refused when credit ruined');
console.log('bk_ledger: PASS');
