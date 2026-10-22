// Founder Pack (founder_pack, Play pre-registration reward): title/badge, +$150,000 every life (stacks with Midas), Coffee Shop at 18 once per life. node tests/founder.mjs
import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import { D } from '../src/data.js';
import * as Pm from '../src/premium.js';
import * as PFx from '../src/premium_fx.js';
import { TESTER_PACK_PASSES } from '../src/native_bridge.js';
import { EngineAdapter } from '../src/engine_adapter.js';
await E.loadData();
const ok = (m) => console.log('  ok -', m);
console.log('Founder Pack');
const only = (...ids) => { Pm.resetAll(); ids.forEach((i) => Pm.setOwned(i, true)); };
const fresh = (seed = 3) => E.newGame({ seed, name: 'Founder' });
const def = Pm.passDef('founder_pack'); assert.ok(def && def.hidden && def.notInSubscription); assert.ok(!TESTER_PACK_PASSES.includes('founder_pack'));
only(); Pm.setSubscription('monthly'); assert.equal(Pm.isUnlocked('founder_pack'), false); Pm.setSubscription(null); ok('catalog: hidden (not sold), not in All Access, not in the Tester Pack');
// cash
only(); const base = fresh(7).cash;
only('founder_pack'); assert.equal(fresh(7).cash, base + 150000);
only('founder_pack'); const f8 = fresh(8).cash; only(); const b8 = fresh(8).cash; assert.equal(f8 - b8, 150000, 'every new life');
only('midas'); const m = fresh(7).cash; only('midas', 'founder_pack'); const mf = fresh(7).cash; assert.equal(mf - base, 1150000, 'stacks with Midas: $1,150,000 total'); assert.equal(mf - m, 150000);
const s0 = fresh(9); const c0 = s0.cash; PFx.applyStart(s0); assert.equal(s0.cash, c0, 'once per life'); ok(`+$150,000 every life; with Midas the bonus is $1,150,000`);
// coffee shop at 18, once
only('founder_pack'); assert.ok(D.bizTypes.coffee, 'existing coffee business type');
{ const s = fresh(11); s.age = 17; PFx.applyStart(s); assert.equal((s.biz || []).length, 0, 'not before 18'); const cash = s.cash;
  s.age = 18; const done = PFx.applyStart(s); assert.ok(done.includes('founder_cafe')); assert.equal(s.biz.length, 1); assert.equal(s.biz[0].type, 'coffee'); assert.equal(s.cash, cash, 'free'); assert.ok(s.log.some((l) => /Founder perk: I opened my own coffee shop/.test(l.text)));
  s.age = 19; PFx.applyStart(s); s.biz = []; s.age = 30; PFx.applyStart(s); assert.equal(s.biz.length, 0, 'given once per life (even if sold)'); }
{ const s = fresh(12); let g = 0; while (s.alive && s.age < 18.5 && g++ < 40) { s.pending.length = 0; E.takeTurn(s); } if (s.alive) assert.equal(s.biz.filter((b) => b.type === 'coffee').length, 1, 'arrives automatically on the 18th birthday'); }
only(); { const s = fresh(13); s.age = 18; PFx.applyStart(s); assert.equal((s.biz || []).length, 0, 'no pack: no shop'); }
ok('Coffee Shop (existing coffee type) at 18, once per life, announced');
// badge + toast via adapter
only('founder_pack'); { const a = new EngineAdapter({ noSave: true, fresh: true, seed: 5 }); await a.init(); a.debugSetup({ age: 17, cash: 1000 }); const st = a.getState(); assert.equal(st.founder, true); assert.equal(st.founderTitle, 'Founder');
  assert.equal((await a.getProfile()).founder, true); a.s.pending = []; let r = await a.age(); let g = 0; while (!r.founderToast && g++ < 3) { a.s.pending = []; r = await a.age(); } assert.match(r.founderToast || '', /coffee shop/); }
only(); { const a = new EngineAdapter({ noSave: true, fresh: true, seed: 5 }); await a.init(); assert.equal(a.getState().founder, false); }
ok('Founder title + badge flag on the character in every life; toast at 18');
Pm.resetAll(); console.log('FOUNDER PASS');
