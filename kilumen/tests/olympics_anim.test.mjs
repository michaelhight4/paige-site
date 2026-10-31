import test from 'node:test'; import assert from 'node:assert/strict';
import { OLY_EVENTS, VENUES, runOlympics, olyRivals } from '../src/sports/olympics.js';
import { OLY_ANIM, animPlan, drawOlyFrame, progress, isDone, INTRO, liftHeight, caughtOf, AW, AH } from '../src/sports/olympics_anim.js';
import { OS } from '../src/sports/olympics_strings.js';

// recording 2D context: every method is a no-op that counts; throws on NaN coordinates so broken maths fails the test
function mockCtx() {
  const calls = { n: 0, draw: 0, text: [] }; const grad = { addColorStop() {} };
  const h = { get(o, k) { if (k === 'calls') return calls; if (k === 'measureText') return (s) => ({ width: String(s).length * 4 });
    if (k === 'createLinearGradient') return () => grad; if (k in o) return o[k];
    return (...a) => { calls.n++; for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${String(k)} got ${v}`);
      if (k === 'drawImage') calls.draw++; if (k === 'fillText') calls.text.push(a[0]); }; }, set(o, k, v) { o[k] = v; return true; } };
  return new Proxy({}, h);
}
const img = { complete: true, naturalWidth: 128 }; const imgs = () => [img, img, img, img];
const K = (sp, s) => ({ species: sp, level: 20, stats: { speed: s, power: s, stamina: s, agility: s, focus: s } });
function runFor(venue) {
  const ents = [{ who: 'me', name: 'You', kilu: [K('capling', 70), K('brimtoad', 60), K('frondlet', 65)], assign: [0, 1, 2] }, ...olyRivals(venue, 2, 20).map((r, i) => ({ who: 'r' + i, name: r.trainer, kilu: r.kilu, assign: r.assign }))];
  return runOlympics({ venue, day: 2, entrants: ents });
}
const all = Object.keys(VENUES).flatMap((v) => runFor(v).events);

test('every Olympics event has an animation config with a known kind and venue', () => {
  for (const id of Object.keys(OLY_EVENTS)) { const c = OLY_ANIM[id]; assert.ok(c, id); assert.ok(['race', 'archery', 'lift', 'catch'].includes(c.kind), id); assert.ok(c.venue && c.dur > 2, id); if (c.kind === 'race') assert.ok(c.len > 300, id); }
  assert.deepEqual(Object.keys(OLY_ANIM).sort(), Object.keys(OLY_EVENTS).sort());
  assert.ok(OS.anim_go && OS.anim_finish && OS.anim_skip);
});
test('plan follows the computed result: better place finishes no later; positions only visualise', () => {
  for (const ev of all) { const p = animPlan(ev.id, ev.rows);
    assert.equal(p.lanes.length, 4); assert.equal(p.lanes[0].who, 'me');
    const byPlace = [...p.lanes].sort((a, b) => a.place - b.place); for (let i = 1; i < 4; i++) assert.ok(byPlace[i].f >= byPlace[i - 1].f - 1e-9, ev.id);
    for (const l of p.lanes) { assert.equal(progress(l, l.f), 1); assert.equal(progress(l, 0), 0); }
    if (p.cfg.kind === 'race') { const t = (p.first + INTRO) / 2, w = byPlace[0], last = byPlace[3]; if (w.score > last.score) assert.ok(progress(w, p.first) > progress(last, p.first)); assert.ok(t > 0); }
    if (ev.id === 'lift') { for (const l of p.lanes) assert.equal(liftHeight(l, l.f), 1); }
    if (ev.id === 'catch') { const s = [...p.lanes].sort((a, b) => b.score - a.score); assert.ok(caughtOf(s[0]) >= caughtOf(s[3])); }
  }
  // scoring untouched: rows passed through unchanged
  const ev = all[0], before = JSON.stringify(ev.rows); animPlan(ev.id, ev.rows); assert.equal(JSON.stringify(ev.rows), before);
});
test('each event renders every phase without errors (normal + reduced motion), draws its Kilu sprites, and completes', () => {
  const seen = new Set();
  for (const ev of all) { seen.add(ev.id); const p = animPlan(ev.id, ev.rows, { mates: { me: K('glintmoth', 50) } });
    for (const rm of [false, true]) for (let t = 0; t <= p.end + 0.2; t += 0.13) { const g = mockCtx(); drawOlyFrame(g, p, t, imgs, { rm }); assert.ok(g.calls.draw >= 4, `${ev.id} sprites at ${t}`); }
    const g = mockCtx(); drawOlyFrame(g, p, p.end, imgs, {}); assert.ok(p.lanes.every((l) => g.calls.text.includes(['1st', '2nd', '3rd', '4th'][l.place - 1])), ev.id + ' placing popups at the end');
    assert.ok(isDone(p, p.end) && !isDone(p, p.first)); }
  assert.equal(seen.size, 12);
  // unloaded images draw a placeholder, never throw
  const p = animPlan('swim', all.find((e) => e.id === 'swim').rows); drawOlyFrame(mockCtx(), p, 2, () => [{}, {}, {}, {}]);
  assert.equal(AW * 9, AH * 16);
});
test('ties animate together (shared place -> same finish time)', () => {
  const k = K('capling', 50), rows = [{ who: 'me', name: 'You', kilu: k, score: 50, place: 1 }, { who: 'r0', name: 'A', kilu: k, score: 50, place: 1 }, { who: 'r1', name: 'B', kilu: k, score: 40, place: 3 }, { who: 'r2', name: 'C', kilu: k, score: 30, place: 4 }];
  const p = animPlan('sprint', rows); assert.equal(p.lanes[0].f, p.lanes[1].f);
});
