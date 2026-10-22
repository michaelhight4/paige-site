// Competitive job offers: priced off current pay (90-155%), 'vs your current' tag, lowballs flagged, accepting sets the new pay. node tests/offers.mjs
import assert from 'node:assert';
import { EngineAdapter } from '../src/engine_adapter.js';
import * as Ev from '../src/events.js';
let lows = 0, highs = 0;
for (let i = 0; i < 40; i++) {
  const a = new EngineAdapter({ noSave: true, fresh: true, seed: 100 + i * 7 }); await a.init(); const s = a.s; s.age = 30;
  const c = (await import('../src/data.js')).D.careers.find((x) => x.levels && x.levels.length); s.job = { id: c.id, level: 0, perf: 50, raise: 0 }; s.pending = [];
  Ev.queue(s, 'job_offer'); const card = Ev.pendingCard(s), o = card.offer; assert.ok(o, 'offer attached');
  assert.ok(o.pay >= o.cur * 0.88 && o.pay <= o.cur * 1.57, 'range ' + JSON.stringify(o));
  assert.match(card.text, /vs your current [+-]\d+%/); if (o.low) { lows++; assert.match(card.text, /lowball/); assert.ok(o.pct < 0); } else { highs++; assert.ok(o.pct >= 4); }
  const idx = card.choices.findIndex((x) => x.switchjob); assert.match(card.choices[idx].label, /Accept \$/);
  Ev.resolveCard(s, idx); assert.ok(Math.abs(Ev.curPay(s) - o.pay) <= o.pay * 0.01 + 1, `pay ${Ev.curPay(s)} vs ${o.pay}`);
}
assert.ok(lows > 0 && highs > lows, `mix lows=${lows} highs=${highs}`);
console.log('offers: PASS', lows, highs);
