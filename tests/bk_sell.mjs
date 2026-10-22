// Bankruptcy 'sell only what's needed' + item picker. node tests/bk_sell.mjs
import assert from 'node:assert';
import { EngineAdapter } from '../src/engine_adapter.js';
import { spend } from '../src/core.js';
import * as Bk from '../src/bankruptcy.js';
const b = new EngineAdapter({ noSave: true, fresh: true, seed: 5 }); await b.init(); b.debugSetup({ age: 40, cash: 0 }); const t = b.s; t.pending = []; spend(t, 29000); Bk.check(t);
assert.ok(t.pending.some((p) => p.kind === 'bankruptcy'));
t.assets.push({ id: 'h1', uid: 'h1', kind: 'house', name: 'Mansion', value: 1e8 }, { id: 'c1', uid: 'c1', kind: 'car', name: 'Hatchback', value: 40000 }, { id: 'c2', uid: 'c2', kind: 'car', name: 'Scooter', value: 2000 });
assert.equal(Bk.resolve(t, 1).keepOpen, true, 'Sell my things opens the picker'); const card = Bk.card(t); assert.ok(card.choices.some((c) => /Sell Hatchback/.test(c.label)), 'item picker offers the small car');
Bk.resolve(t, card.choices.findIndex((c) => /just enough/.test(c.label))); assert.ok(t.assets.some((x) => x.name === 'Mansion') && t.assets.some((x) => x.name === 'Scooter') && !t.assets.some((x) => x.name === 'Hatchback'), 'sold only the Hatchback');
assert.ok(!t.pending.some((p) => p.kind === 'bankruptcy'));
spend(t, 1000000); Bk.check(t); Bk.resolve(t, 1); const c2 = Bk.card(t), idx = c2.choices.findIndex((c) => /Sell Mansion/.test(c.label)); Bk.resolve(t, idx); assert.ok(!t.assets.some((x) => x.name === 'Mansion') && t.assets.some((x) => x.name === 'Scooter'), 'picked item sold, the rest kept');
console.log('bk_sell: PASS');
