// Hotfix v0.2.104 (Oct 31 2026): podium settles on 3/2/1/0 sorted totals, and every Kilu ends standing on its step.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { podiumPlan, kiluPos, tierTop, shownPts, rowSlot, hopStart, T, FLOOR } from '../src/sports/olympics_podium.js';
const rows = [['b', 'Bram', 3, 1], ['k', 'Kit', 2, 2], ['me', 'You', 1, 3], ['r', 'Rook', 0, 4]].map(([who, name, pts, place]) => ({ who, name, pts, place, score: 10 - place, kilu: { species: 'capling' } }));
const table = rows.map((r) => ({ who: r.who, name: r.name, pts: r.pts, firsts: r.place === 1 ? 1 : 0 }));
test('event-1 podium settles on 3/2/1/0 totals sorted by total', () => {
  const p = podiumPlan({ kind: 'event', id: 'hop', rows, prev: [], table, n: 1, of: 3 });
  const end = p.end; const got = p.stand.map((s) => [Math.round(rowSlot(p, s, end)), s.name, shownPts(p, s, end)]).sort((a, b) => a[0] - b[0]);
  assert.deepEqual(got, [[0, 'Bram', 3], [1, 'Kit', 2], [2, 'You', 1], [3, 'Rook', 0]]);
});
test('every podium Kilu lands and rests on its step (no lift after landing)', () => {
  const p = podiumPlan({ kind: 'event', id: 'hop', rows, prev: [], table, n: 1, of: 3 });
  for (const e of p.entries) { const land = hopStart(e.slot) + T.hopDur; for (let t = land; t <= p.end + 2; t += 0.05) assert.equal(kiluPos(p, e, t).y, tierTop(e.slot, 99)); }
  assert.equal(tierTop(3, 99), FLOOR);
  const src = fs.readFileSync(new URL('../src/sports/olympics_podium.js', import.meta.url), 'utf8');
  assert.match(src, /sprite\(g, fr\[ground \? 0 : 1\] \|\| fr\[0\], p\.x, p\.y, s,/);
});
// v2 (Gary): medals on the step faces, winner moment with a dance whose feet land on the pedestal, static card under reduced motion.
import { medalAt, winnerPose, winZoom, W, TIERS } from '../src/sports/olympics_podium.js';
test('v2 medals rest on the front face of their step', () => {
  const p = podiumPlan({ kind: 'event', id: 'hop', rows, prev: [], table, n: 1, of: 3 });
  for (const e of p.entries.filter((x) => x.slot <= 2)) { const m = medalAt(p, e, p.end); const top = tierTop(e.slot, 99);
    assert.equal(m.x, TIERS[e.slot].x); assert.ok(m.y - m.r > top + 25 && m.y + m.r < FLOOR, `slot ${e.slot}`); assert.equal(m.place, e.place); }
});
test('v2 winner moment: zoom after settle, feet land on pedestal each dance cycle; rm = static card', () => {
  const p = podiumPlan({ kind: 'event', id: 'hop', rows, prev: [], table, n: 1, of: 3 });
  assert.ok(p.win0 > p.end && p.total > p.win0); assert.equal(winZoom(p, p.end, false), 0); assert.equal(winZoom(p, p.win0 + W.zoom, false), 1);
  for (let k = 0; k < 3; k++) { const q = winnerPose(p, p.win0 + W.zoom + k * W.cycle + 0.001, false); assert.equal(q.lift, 0); assert.ok(q.onStep); }
  let lifted = false; for (let t = p.win0 + W.zoom; t < p.total + 3; t += 0.02) { const q = winnerPose(p, t, false); assert.ok(q.lift >= 0); if (q.lift > 5) lifted = true; if (q.onStep) assert.ok(q.lift < 0.5); }
  assert.ok(lifted, 'winner hops');
  const r = winnerPose(p, p.total, true); assert.equal(r.z, 1); assert.deepEqual([r.lift, r.rot, r.sx, r.sy], [0, 0, 1, 1]);
});
