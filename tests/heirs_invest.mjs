// 7c6 item 12: investments pass to heirs (floor units per will share, remainder to the main heir), valued in the estate, estate tax from cash first then units.
import assert from 'node:assert/strict'; import * as E from '../src/engine.js'; import * as P from '../src/people.js'; import * as L from '../src/legacy.js'; import * as Slice from '../src/slice_bridge.js';
await E.loadData();
const setup = (cash, units) => { const w = E.newGame({ seed: 12, name: 'Elder' }); w.age = 70; w.cash = cash; w.people = []; const a = P.newPerson(w, 'child', { age: 40 }), b = P.newPerson(w, 'child', { age: 38 }); w.people.push(a, b);
  const st = Slice.slice(w); st.market.stk_atlas = 100; st.invest = { stk_atlas: { units, cost: units * 80, divMode: 'cash' } }; return { w, a, b }; };
{ const { w, a, b } = setup(1e7, 101); const plan = L.computeEstate(w); const ha = plan.heirs.find((h) => h.id === a.id), hb = plan.heirs.find((h) => h.id === b.id);
  const ua = ha.invest.stk_atlas?.units || 0, ub = hb.invest.stk_atlas?.units || 0; assert.equal(ua + ub, 101, 'every unit passes on'); assert.ok([ua, ub].includes(51) && [ua, ub].includes(50), `${ua}/${ub}`);
  assert.ok(plan.estateVal >= 101 * 100, 'valued in the estate');
  L.die(w, 'disease', 'test'); assert.ok(L.continueAs(w, a.id)); const st = Slice.slice(w); assert.equal(st.invest.stk_atlas.units, ua); assert.equal(st.invest.stk_atlas.divMode, 'cash'); assert.ok(Math.abs(st.invest.stk_atlas.cost - ua * 80) < 1e-6, 'cost basis kept');
  assert.equal(st.invLife.realized, 0); assert.equal(st.invLife.income, 0); }
{ const { w } = setup(0, 1e6); const plan = L.computeEstate(w); const left = plan.heirs.reduce((t, h) => t + (h.invest.stk_atlas?.units || 0), 0);
  assert.ok(plan.tax > 0 && left < 1e6 && left > 0, `tax ${plan.tax}, units left ${left}`); assert.ok(Math.abs((1e6 - left) * 100 - plan.tax) < 100 + 1, 'tax paid by selling units at market'); }
console.log('PASS heirs_invest');
