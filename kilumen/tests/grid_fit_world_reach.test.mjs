// Grid-fit world (Gary, Oct 29 2026): walk every map's warps after the collision refit.
// Every warp lands on a standable square, and from the squares players arrive on, every warp and edge exit is reachable
// (walk / ledge / door / plate / bike / ramp / ice, plus water for surf and story-gate cells as if cleared).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'art/world/overworld/maps');
const files = fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.json'));
const maps = {};
for (const f of files) { const m = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); if (m.layers?.collision) maps[m.name] = m; }
const PASS = new Set([0, 2, 4, 7, 8, 9, 10, 3, 11]);
const edgeCells = (m) => { const H = m.layers.collision.length, W = m.layers.collision[0].length, out = [];
  for (const e of m.exits || []) for (let i = e.start; i <= e.end; i++)
    out.push({ north: [i, 0], south: [i, H - 1], west: [0, i], east: [W - 1, i] }[e.edge]);
  return out.filter(Boolean); };
const arrivals = {};
for (const m of Object.values(maps)) for (const w of m.warps || []) if (w.to && 'tx' in w) (arrivals[w.to] ||= []).push([w.tx, w.ty, m.name]);

test('every warp lands on a standable square', () => {
  for (const m of Object.values(maps)) for (const w of m.warps || []) {
    const t = maps[w.to]; if (!t || !('tx' in w)) continue;
    const c = t.layers.collision[w.ty]?.[w.tx];
    assert.ok(c !== undefined && PASS.has(c), `${m.name} -> ${w.to} (${w.tx},${w.ty}) lands on code ${c}`);
  }
});

test('from every arrival square, every warp and exit of the map is reachable', () => {
  for (const m of Object.values(maps)) {
    const col = m.layers.collision, H = col.length, W = col[0].length;
    const open = new Set((m.story_gates || []).flatMap((g) => g.cells.map((c) => `${c.x},${c.y}`)));
    const seeds = [...(arrivals[m.name] || []).map(([x, y]) => [x, y]), ...edgeCells(m)];
    if (m.player_start) seeds.push([m.player_start.x, m.player_start.y]);
    if (!seeds.length) continue;
    const seen = new Set(), st = seeds.slice();
    while (st.length) { const [x, y] = st.pop(), k = `${x},${y}`;
      if (seen.has(k) || x < 0 || y < 0 || x >= W || y >= H) continue; seen.add(k);
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]])
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && (PASS.has(col[ny][nx]) || open.has(`${nx},${ny}`))) st.push([nx, ny]); }
    const near = ([x, y]) => [[x, y], [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([a, b]) => seen.has(`${a},${b}`));
    for (const w of m.warps || []) assert.ok(near([w.x, w.y]), `${m.name}: warp (${w.x},${w.y}) -> ${w.to} unreachable`);
    for (const e of edgeCells(m)) assert.ok(near(e), `${m.name}: exit square ${e} unreachable`);
  }
});
