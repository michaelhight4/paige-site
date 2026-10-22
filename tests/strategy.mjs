// Yearly strategies for live streaming and media creation. node tests/strategy.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import * as O from '../src/online.js'; import * as Prod from '../src/prodco.js'; import * as Auto from '../src/autopilot.js'; import * as Pm from '../src/premium.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const mk = async (seed, o = {}) => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); a.debugSetup({ age: o.age ?? 28, cash: o.cash ?? 8e6 }); a.s.school = null; return a; };
const clear = (s) => { let g = 0; while (s.pending.length && g++ < 8) { const c = E.pendingCard(s), n = c ? c.choices.length : 1; let d = false; for (let i = 0; i < n && !d; i++) { const r = E.resolveCard(s, i); d = r && r.ok; } if (!d) s.pending.shift(); } s.stats.health = Math.max(s.stats.health, 80); s.diseases = []; s.prison = null; };
console.log('Streaming strategy');
{ assert.deepEqual(O.STREAM_PLANS.map((p) => p.id), ['steady', 'niche', 'variety', 'collab', 'trend']); assert.equal(O.STREAM_PLANS[0].ban, 0); assert.equal(O.STREAM_PLANS[1].ban, 0);
  const run = async (plan, n) => { let strikes = 0, growth = 0, income = 0, burn = 0; for (let i = 0; i < n; i++) { const a = await mk(100 + i); a.streamerAction('start', 'rpg'); const st = a.s.stream; st.subs = 4000; st.burnout = 30;
      assert.equal(a.getStreamer().plan.needed, true); assert.ok(a.setStreamPlan(plan).ok); assert.equal(a.getStreamer().plan.needed, false); clear(a.s); const sb = st.subs; O.yearTick(a.s); strikes += st.strikes; growth += st.subs - sb; income += st.last ? st.last.income : 0; burn += st.burnout;
      assert.equal(st.plan, null, 'consumed at year end'); assert.equal(a.getStreamer().plan.needed, true, 'due again next year'); } return { strikes, growth: growth / n, income: income / n, burn: burn / n }; };
  const R = {}; for (const p of O.STREAM_PLANS) R[p.id] = await run(p.id, 150);
  assert.equal(R.steady.strikes, 0); assert.equal(R.niche.strikes, 0); assert.ok(R.trend.strikes > R.variety.strikes, JSON.stringify(R));
  assert.ok(R.trend.growth > R.variety.growth && R.variety.growth > R.steady.growth, 'growth ' + JSON.stringify(R)); assert.ok(R.trend.burn > R.steady.burn, 'burnout');
  ok('strikes/150 yrs: ' + Object.entries(R).map(([k, v]) => `${k} ${v.strikes}`).join(', ') + '; growth ' + Object.entries(R).map(([k, v]) => `${k} ${Math.round(v.growth)}`).join(', ')); }
console.log('Media strategy');
{ assert.deepEqual(Prod.MEDIA_PLANS.map((p) => p.id), ['steady', 'quality', 'quantity', 'trend', 'prestige', 'franchise']); assert.equal(Prod.MEDIA_PLANS[0].scandal, 0);
  const run = async (plan, n) => { let scand = 0, rev = 0, rep = 0; for (let i = 0; i < n; i++) { const a = await mk(200 + i); assert.ok(a.prodAction('film', 'found', 'Test Pictures').ok); const co = a.s.prod.cos.film; assert.equal(a.getProdCos().media.find((m) => m.id === 'film').company.plan.needed, true); a.prodAction('film', 'fund', 2e6); const r0 = co.rep;
      for (let y = 0; y < 4; y++) { assert.ok(a.setMediaPlan('film', plan).ok); assert.equal(co.strategy, plan); co.scandal = null; clear(a.s); E.takeTurn(a.s); if (!a.s.alive) break; assert.equal(co.strategy, null, 'consumed at year end'); if (co.scandal) scand++; rev += (co.last && co.last.revenue) || 0; } rep += co.rep - r0; } return { scand, rev: rev / n, rep: rep / n }; };
  const R = {}; for (const p of Prod.MEDIA_PLANS) R[p.id] = await run(p.id, 40);
  assert.equal(R.steady.scand, 0, 'steady: zero scandals'); assert.ok(R.quantity.scand >= R.quality.scand, JSON.stringify(R)); assert.ok(R.prestige.rep >= R.steady.rep, 'prestige builds reputation ' + JSON.stringify(R));
  ok('per-plan: ' + Object.entries(R).map(([k, v]) => `${k} scandals ${v.scand}, rep ${v.rep.toFixed(1)}, rev ${Math.round(v.rev / 1000)}k`).join(' | ')); }
console.log('Autopilot');
{ Pm.resetAll(); Pm.setOwned('autopilot'); const a = await mk(5); a.streamerAction('start', 'rpg'); a.prodAction('music', 'found'); a.prodAction('film', 'found'); Auto.configure(a.s, { on: true, routines: [], floor: 0 });
  assert.equal(a.getAutopilot().streamPlan, 'steady'); assert.equal(a.getAutopilot().mediaPlan, 'steady'); const s = a.s; clear(s); Auto.playYear(a); assert.ok(!a.getStreamer().plan.needed || s.stream.plan === null); 
  assert.equal(s.stream.plan === null || s.stream.plan === 'steady', true);
  const b = await mk(6); b.streamerAction('start', 'rpg'); b.prodAction('film', 'found'); Auto.configure(b.s, { on: true, routines: [], floor: 0, streamPlan: 'trend', mediaPlan: 'quality' }); clear(b.s); Auto.playYear(b);
  const c = await mk(7); c.streamerAction('start', 'rpg'); c.prodAction('film', 'found'); Auto.configure(c.s, { on: true, routines: [], floor: 0, streamPlan: 'trend', mediaPlan: 'quality' }); clear(c.s); const sets = []; const o1 = c.setStreamPlan.bind(c), o2 = c.setMediaPlan.bind(c); c.setStreamPlan = (id) => { sets.push(id); return o1(id); }; c.setMediaPlan = (m, id) => { sets.push(id); return o2(m, id); }; Auto.playYear(c);
  assert.ok(sets.includes('trend') && sets.includes('quality'), 'autopilot uses preferred strategies: ' + sets.join()); ok('autopilot preferences default safe, honored when set');
  const d = await mk(8); d.streamerAction('start', 'rpg'); const sp = Auto.pageStatus(d).find((x) => x.id === 'streaming'); assert.ok(sp, 'streaming page listed'); const r = Auto.setPage(d, 'streaming', true); assert.ok(r.ok !== false, 'lock'); assert.ok(d.s.auto.pages.streaming.on); ok('streaming page-lock'); }
console.log('strategy: PASS');
