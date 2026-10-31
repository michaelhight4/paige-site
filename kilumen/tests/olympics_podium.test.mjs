import test from 'node:test'; import assert from 'node:assert/strict';
import { VENUES, runOlympics, olyRivals, OLY } from '../src/sports/olympics.js';
import { podiumPlan, drawPodiumPixels, drawPodiumText, kiluPos, hopStart, medalStart, shownPts, rowSlot, isTap, rewardItems, TIERS, T, PW, PH } from '../src/sports/olympics_podium.js';
import { OS } from '../src/sports/olympics_strings.js';

function mockCtx() {
  const calls = { n: 0, draw: 0, text: [], smooth: [] }; const grad = { addColorStop() {} };
  return new Proxy({}, { get(o, k) { if (k === 'calls') return calls; if (k === 'measureText') return (s) => ({ width: String(s).length * 4 });
    if (k === 'createLinearGradient') return () => grad; if (k in o) return o[k];
    return (...a) => { calls.n++; for (const v of a) if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${String(k)} got ${v}`);
      if (k === 'drawImage') calls.draw++; if (k === 'fillText') calls.text.push(a[0]); }; },
  set(o, k, v) { if (k === 'imageSmoothingEnabled') calls.smooth.push(v); o[k] = v; return true; } });
}
const img = { complete: true, naturalWidth: 128 }; const imgs = () => [img, img, img, img];
const K = (sp, s, nick) => ({ species: sp, nickname: nick, level: 20, stats: { speed: s, power: s, stamina: s, agility: s, focus: s } });
const runFor = (venue, s = 70) => runOlympics({ venue, day: 2, entrants: [{ who: 'me', name: 'You', kilu: [K('capling', s, 'Pip'), K('brimtoad', s, 'Moss'), K('frondlet', s, 'Fern')], assign: [0, 1, 2] },
  ...olyRivals(venue, 2, 20).map((r, i) => ({ who: 'r' + i, name: r.trainer, kilu: r.kilu, assign: r.assign }))] });
const evPlan = (run, i) => podiumPlan({ kind: 'event', id: run.events[i].id, rows: run.events[i].rows, prev: i ? run.events[i - 1].table : [], table: run.events[i].table, n: i + 1, of: 3 });

test('event podium: 1st centre+tallest, 2nd left, 3rd right, 4th off to the side on the floor', () => {
  assert.ok(TIERS[0].h > TIERS[1].h && TIERS[1].h > TIERS[2].h && TIERS[3].h === 0);
  assert.ok(TIERS[1].x < TIERS[0].x && TIERS[0].x < TIERS[2].x && TIERS[2].x < TIERS[3].x);
  const run = runFor('fernwick'), p = evPlan(run, 0);
  assert.deepEqual(p.entries.map((e) => e.who), run.events[0].rows.map((r) => r.who));
  assert.deepEqual(p.entries.map((e) => e.pts), run.events[0].rows.map((r) => r.pts));
});
test('Kilu hop on in turn (4th, 3rd, 2nd, winner) and land on their tier; medals drop bronze, silver, gold', () => {
  assert.ok(hopStart(3) < hopStart(2) && hopStart(2) < hopStart(1) && hopStart(1) < hopStart(0));
  assert.ok(medalStart(2) < medalStart(1) && medalStart(1) < medalStart(0) && medalStart(2) > hopStart(0) + T.hopDur);
  const p = evPlan(runFor('saltmere'), 1);
  for (const e of p.entries) { assert.equal(kiluPos(p, e, hopStart(e.slot) - 0.01).shown, false); const end = kiluPos(p, e, 99); assert.equal(end.x, TIERS[e.slot].x); assert.equal(end.u, 1); }
});
test('standings: +points count up from the old total to the new one, rows re-sort, scoring untouched', () => {
  const run = runFor('frostspire'), before = JSON.stringify(run);
  for (let i = 0; i < 3; i++) { const p = evPlan(run, i);
    for (const s of p.stand) { assert.equal(shownPts(p, s, 0), s.before); assert.equal(shownPts(p, s, p.end), s.after); assert.equal(s.after, s.before + s.add);
      assert.equal(rowSlot(p, s, 0), s.prevRank); assert.equal(rowSlot(p, s, p.end), s.rank); assert.ok(OLY.points.includes(s.add)); }
    assert.equal(p.arrows, i > 0); }
  assert.equal(JSON.stringify(run), before);
});
test('every venue/event renders all phases (normal + reduced motion) with nearest-neighbour, sprites and text keys', () => {
  for (const v of Object.keys(VENUES)) { const run = runFor(v);
    for (let i = 0; i < 3; i++) { const p = evPlan(run, i);
      for (const rm of [false, true]) for (let t = 0; t <= p.end + 0.3; t += 0.21) { const g = mockCtx(); drawPodiumPixels(g, p, t, imgs, { rm }); drawPodiumText(mockCtx(), p, t, { rm }); assert.ok(!g.calls.smooth.includes(true)); }
      const g = mockCtx(); drawPodiumPixels(g, p, p.end, imgs, {}); assert.ok(g.calls.draw >= 4, 'four Kilu on the podium');
      const tg = mockCtx(); drawPodiumText(tg, p, p.end, {}); const s = tg.calls.text.join('|');
      for (const e of p.entries) assert.ok(s.includes(e.name.slice(0, 5)), 'trainer on plate ' + e.name);
      assert.ok(s.includes('Pip') || s.includes('Moss') || s.includes('Fern'), 'player Kilu name'); assert.ok(s.includes(OS.you)); } }
  drawPodiumPixels(mockCtx(), evPlan(runFor('fernwick'), 0), 2, () => [{}, {}, {}, {}]); // unloaded images never throw
});
test('champion podium: trophy, final standings, rewards (gold, merit, first-win flag)', () => {
  const run = runFor('aurelith', 99), res = { place: 1, prize: 1500, merit: 12, firstWin: true, flag: 'oly_won_aurelith' };
  const p = podiumPlan({ kind: 'final', venue: 'aurelith', venueName: 'Aurelith', table: run.table, events: run.events, result: res });
  assert.equal(p.kind, 'final'); assert.deepEqual(p.entries.map((e) => e.who), run.table.map((x) => x.who));
  assert.deepEqual(rewardItems(p).map((r) => r.k), ['gold', 'merit', 'flag']);
  const tg = mockCtx(); drawPodiumText(tg, p, p.end, {}); const s = tg.calls.text.join('|');
  for (const want of ['+1500 gold', '+12 merit', 'First Aurelith title!', 'Aurelith Olympics Champion', OS.pod_final]) assert.ok(s.includes(want), want);
  for (const x of run.table) assert.ok(s.includes(String(x.pts)));
  const g = mockCtx(); drawPodiumPixels(g, p, p.end, imgs, {}); assert.ok(g.calls.draw >= 4);
  const lose = podiumPlan({ kind: 'final', venue: 'fernwick', venueName: 'Fernwick', table: run.table, events: run.events, result: { place: 3, prize: 0, merit: 4, firstWin: false } });
  assert.deepEqual(rewardItems(lose).map((r) => r.k), ['merit']); assert.equal(PW * 9, PH * 16);
});
test('tap only: a quick tap counts, a hold or a drag does not', () => {
  assert.ok(isTap({ x: 0, y: 0, t: 0 }, { x: 3, y: 2, t: 120 }));
  assert.ok(!isTap({ x: 0, y: 0, t: 0 }, { x: 0, y: 0, t: 900 }), 'hold');
  assert.ok(!isTap({ x: 0, y: 0, t: 0 }, { x: 60, y: 0, t: 100 }), 'drag'); assert.ok(!isTap(null, { x: 0, y: 0, t: 0 }));
});
test('podium placeholder text keys exist', () => { for (const k of ['pod_title', 'pod_standings', 'pod_final', 'pod_you_placed', 'pod_you_missed', 'pod_champ_title', 'pod_champ_name', 'pod_you_champ', 'pod_you_finished', 'pod_gold', 'pod_merit', 'pod_first', 'pod_skip', 'pod_continue']) assert.ok(OS[k], k); });
