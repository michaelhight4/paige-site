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
