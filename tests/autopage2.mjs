// "Autopilot this page" for coaching and politics. node tests/autopage2.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js'; import * as Auto from '../src/autopilot.js'; import * as Pm from '../src/premium.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData(); const ok = (m) => console.log('  ok -', m);
const mk = async (seed) => { const a = new EngineAdapter({ noSave: true, fresh: true, seed }); await a.init(); const s = a.s; s.country = 'us'; s.age = 32; s.school = null; s.edu = 2; s.cash = 1e6; s.stats.health = 90; s.flags.ex_pro = 1; return a; };
Pm.resetAll(); Pm.setOwned('autopilot');
console.log('Autopilot this page: coaching and politics');
assert.ok(Auto.pageStatus(await mk(1)).some((p) => p.id === 'coaching') && Auto.pageStatus(await mk(1)).some((p) => p.id === 'politics')); ok('registered');
{ const a = await mk(2); assert.equal(a.setAutoPage('coaching', true).ok, false, 'needs a coaching job'); assert.ok(a.coachAction('take', 'soccer').ok); a.s.coach.role = 'head'; const st = a.getCoaching(); const style = st.styles.find((x) => x.id !== a.s.coach.style).id;
  assert.ok(a.coachAction('plan', style, a.s.coach.training).ok); assert.ok(a.setAutoPage('coaching', true).ok); assert.equal(a.s.auto.pages.coaching.locked.style, style);
  a.coachAction('plan', st.styles.find((x) => x.id !== style).id); assert.notEqual(a.s.coach.style, style);
  Auto.configure(a.s, { on: true, routines: [] }); const r = await Auto.playYear(a, { routines: [], floor: 0 }); assert.equal(a.s.coach.style, style, 'locked style re-applied'); assert.ok(r.ran.some((x) => x.id === 'page_coaching'), JSON.stringify(r.skipped));
  const q = a.getCoaching().season; assert.ok(!q || q.q > 0 || q.done, 'season quarters played');
  a.s.prison = { years: 2 }; const r2 = await Auto.playYear(a, { routines: [], floor: 0 }); assert.ok(r2.stopBefore || !r2.ran.length, 'safety stop honored'); a.s.prison = null; assert.ok(a.setAutoPage('coaching', false).ok); ok('coaching: locked plan re-applied through coachAction, season played, safety stop'); }
{ const a = await mk(3); a.s.age = 30; assert.equal(a.setAutoPage('politics', true).ok, false, 'needs a campaign or office'); assert.ok(a.politicsAction('start', 'council').ok); assert.ok(a.politicsAction('platform', 'economy').ok);
  const camp = () => a.getPolitics().campaign; const other = camp().platforms.find((p) => p.id !== 'economy').id; assert.ok(a.setAutoPage('politics', true).ok); assert.equal(a.s.auto.pages.politics.locked.platform, 'economy');
  a.politicsAction('platform', other); assert.equal(camp().platform, other); await Auto.playYear(a, { routines: [], floor: 0 }); assert.equal(camp().platform, 'economy', 'platform re-applied');
  // office: governing decision uses the same politicsAction('govern')
  const b = await mk(4); b.s.pol = b.s.pol || {}; E.loadData; const P = await import('../src/politics.js'); const p = P.ensure(b.s); p.office = { slot: 'council', approval: 50, years: 1 }; p.govStyle = 'townhall'; p.acted = {}; assert.ok(b.setAutoPage('politics', true).ok); const ap0 = p.office.approval; await Auto.playYear(b, { routines: [], floor: 0 }); assert.equal(p.office.approval, ap0 + 3, 'town hall applied once'); assert.ok(p.acted.govern); ok('politics: campaign platform and governing choice re-applied'); }
console.log('autopage2: PASS');
