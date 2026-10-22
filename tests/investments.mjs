// Investments: price history, market news tied to moves, cost basis + P/L, yearly history, Buy Max (no loans), sell units.
import * as E from '../src/engine.js'; import { EngineAdapter } from '../src/engine_adapter.js'; import assert from 'node:assert/strict';
const M = new Map(); globalThis.localStorage ??= { getItem: (k) => (M.has(k) ? M.get(k) : null), setItem: (k, v) => M.set(k, String(v)), removeItem: (k) => M.delete(k) };
await E.loadData(); const B = await import('../src/slice_bridge.js'), H = B.H;
const a = new EngineAdapter({ noSave: true, fresh: true, seed: 31 }); await a.init(); a.debugSetup({ age: 30, cash: 100000 });
let v = a.getInvestments(); assert.ok(v.products.every((p) => p.history.length >= 10), 'multi-year history backfilled');
const id = 'stk_nimbus'; const q = a.investQuoteMax(id); assert.ok(q.ok && q.cost <= 100000 && q.cost > 99000 - q.price, 'Buy Max quote');
assert.ok(a.investBuyMax(id).ok); v = a.getInvestments(); assert.ok(a.s.cash >= 0 && a.s.cash < q.price + 1, 'cash covers it, never negative'); assert.equal(Math.round(a.s.debt), 0, 'no loan');
let hd = v.holdings.find((x) => x.id === id); assert.ok(Math.abs(hd.costBasis - q.cost) <= 1, 'cost basis = what was paid'); assert.equal(v.total.cost, hd.costBasis);
const halfU = Math.floor(hd.units / 2); assert.ok(a.investSellUnits(id, halfU).ok); hd = a.getInvestments().holdings.find((x) => x.id === id); assert.ok(Math.abs(hd.costBasis - q.cost * (1 - halfU / (halfU * 2 + (hd.units - halfU)))) < q.cost * 0.02, 'partial sell scales basis');
for (let y = 0; y < 3; y++) { a.s.pending = []; a.s.diseases = []; E.takeTurn(a.s); a.s.pending = []; }
v = a.getInvestments(); hd = v.holdings.find((x) => x.id === id);
assert.ok(hd.history.length >= 3 && hd.history.every((r) => r.start > 0 && 'pct' in r), 'yearly holding history'); assert.ok(v.portfolioHistory.length >= 3, 'portfolio history');
assert.ok(typeof hd.pnl === 'number' && typeof hd.pnlPct === 'number'); assert.ok(v.news && v.news.items.length >= 2 && v.news.items.every((n) => n.text && (n.dir === 'up' || n.dir === 'down')), 'market news');
// news is tied to price moves: over many simulated years, prices go the hinted way clearly more often than not (hints are sometimes wrong)
const d = B.sliceData(); const st = { rng: 7, age: 20, cash: 0, invest: {}, market: {}, news: null }; for (const it of d.assets.investments.items) st.market[it.id] = it.price;
let right = 0, tot = 0, wrongReal = 0; H.investHistory(d, st);
for (let y = 0; y < 300; y++) { const before = { ...st.market }; const n = st.news; H.assetsYear ? null : null; const out = []; // run only the market part
  const fn = (await import('../src/slice/assets.js')); fn.__marketYear ? fn.__marketYear(d, st, out) : null; st.age++;
  if (n) for (const x of n.items) { if (x.scope !== 'name') continue; const mv = st.market[x.id] / before[x.id] - 1; tot++; if ((mv > 0) === (x.dir === 'up')) right++; if (x.real && (mv > 0) !== (x.dir === 'up')) wrongReal++; } }
if (tot) assert.ok(right / tot > 0.58, `news usually right (${right}/${tot})`);
console.log('investments: PASS', tot ? `(news right ${right}/${tot})` : '');
