import * as E from '../src/engine.js'; import * as Bk from '../src/bankruptcy.js'; import { spend } from '../src/core.js'; import assert from 'node:assert/strict';
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
await E.loadData();
const mk = () => { const s = E.newGame({ seed: 9 }); s.age = 30; s.cash = 100; s.debt = 0; s.pending = []; return s; };
let s = mk(); spend(s, 5000); assert.equal(s.debt, 0); assert.equal(Math.round(s.shortfall), 4900); // not a silent loan
Bk.check(s); assert.equal(s.pending[0].kind, 'bankruptcy'); const c = Bk.card(s); assert.equal(c.choices.length, 3);
assert.ok(c.choices[1].disabled, 'nothing to sell'); assert.ok(!c.choices[0].disabled);
assert.ok(Bk.resolve(s, 0).ok); assert.equal(s.debt, 4900); assert.equal(s.pending.length, 0);
s = mk(); s.assets = [{ uid: 'h1', name: 'Test house', value: 80000, type: 'house' }]; spend(s, 5000); Bk.check(s);
assert.ok(Bk.saleTotal(s) > 70000); assert.ok(Bk.resolve(s, 1).ok); assert.equal(s.pending[0].stage, 'sell'); assert.equal(Bk.card(s).choices.length, Bk.sellables(s).length + 2);
assert.ok(Bk.resolve(s, Bk.sellables(s).length + 1).ok); assert.ok(!s.pending[0].stage, 'back'); Bk.resolve(s, 1);
assert.ok(Bk.resolve(s, 0).ok); assert.equal(s.shortfall, 0); assert.equal(s.assets.length, 0); assert.equal(s.pending.length, 0); assert.ok(s.cash > 70000, 'leftover kept');
// just enough: owes 5K, owns 80K house + 6K car -> only the car goes
s = mk(); s.assets = [{ uid: 'h1', name: 'House', value: 80000, type: 'house' }, { uid: 'c1', name: 'Car', value: 6000, type: 'car' }]; spend(s, 5000); Bk.check(s);
Bk.resolve(s, 1); assert.ok(Bk.resolve(s, Bk.sellables(s).length).ok); assert.deepEqual(s.assets.map((a) => a.uid), ['h1']); assert.equal(s.pending.length, 0);
s = mk(); s.assets = [{ uid: 'h1', name: 'House', value: 80000, type: 'house' }, { uid: 'c1', name: 'Car', value: 6000, type: 'car' }]; spend(s, 5000); Bk.check(s);
assert.ok(Bk.autoAnswer(s, 'sell').ok); assert.deepEqual(s.assets.map((a) => a.uid), ['h1'], 'autopilot sells just enough');
s = mk(); s.debt = 50000; spend(s, 9000); Bk.check(s); const r = Bk.resolve(s, 2); assert.ok(r.bankrupt); assert.ok(Bk.creditBad(s)); assert.equal(Bk.loanRoom(s), 0); assert.ok(s.debt < 50000); assert.equal(s.shortfall, 0);
s = mk(); s.age = 12; spend(s, 500); assert.ok(s.debt > 0 && !s.shortfall, 'minors keep silent debt');
s = mk(); spend(s, 5000); Bk.check(s); assert.equal(Bk.autoAnswer(s, 'pause'), null); assert.ok(Bk.autoAnswer(s, 'loan').ok);
console.log('bankruptcy: PASS');
