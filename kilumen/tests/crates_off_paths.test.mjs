// Crates (garden planters + crate/barrel/box tiles) must be solid and never sit on a path/road, door or warp (Gary, Nov 1 2026).
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { PLOTS, PLOT_SOLID, solidifyPlots } from '../src/garden/garden.js';
const root = new URL('../art/world/overworld/', import.meta.url);
const ts = new Map(JSON.parse(readFileSync(new URL('tileset.json', root))).tiles.map((t) => [t.id, t]));
const PATH = /path|road|street|cobble|pave|bridge|plank|stair/i;
const CRATE = /crate|barrel|(^|_)box(es)?(_|$)/i;
const maps = new Map(); const map = (n) => { if (!maps.has(n)) maps.set(n, JSON.parse(readFileSync(new URL(`maps/${n}.json`, root)))); return maps.get(n); };
const warpAt = (m, x, y) => [...(m.warps || []), ...(m.exits || [])].some((w) => w.x === x && w.y === y);
const groundName = (m, x, y) => ts.get(m.layers.ground[y][x])?.name || '';
let n = 0;
for (const p of PLOTS) {
  const m = map(p.map), g = groundName(m, p.x, p.y), c = m.layers.collision[p.y][p.x];
  assert.ok(!PATH.test(g), `plot ${p.id} ${p.map} ${p.x},${p.y} on path tile ${g}`);
  assert.equal(c, 0, `plot ${p.id} must sit on open ground (collision ${c}: building/door/water)`);
  assert.ok(!warpAt(m, p.x, p.y), `plot ${p.id} on a warp`);
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) assert.ok(!warpAt(m, p.x + dx, p.y + dy), `plot ${p.id} blocks the warp next to it`);
  const fake = { name: p.map, layers: { collision: m.layers.collision.map((r) => [...r]) } };
  solidifyPlots(fake); assert.equal(fake.layers.collision[p.y][p.x], PLOT_SOLID, `plot ${p.id} not solid`); n++;
}
assert.equal(PLOT_SOLID, 1);
for (const t of ts.values()) if (CRATE.test(t.name)) assert.ok(t.walkable === false && t.collision_code === 1, `crate tile ${t.id} ${t.name} lacks collision`);
for (const f of readdirSync(new URL('maps/', root)).filter((f) => f.endsWith('.json'))) {
  const m = JSON.parse(readFileSync(new URL(`maps/${f}`, root))); if (!m.layers?.ground) continue;
  for (const k of ['decoration', 'overlay']) (m.layers[k] || []).forEach((row, y) => row.forEach((id, x) => {
    const t = ts.get(id); if (!t || !CRATE.test(t.name)) return;
    assert.ok(!PATH.test(groundName(m, x, y)) || m.layers.collision[y][x] !== 0, `${f} ${x},${y}: crate ${t.name} on path ${groundName(m, x, y)}`);
    assert.notEqual(m.layers.collision[y][x], 0, `${f} ${x},${y}: crate ${t.name} walkable`);
  }));
}
console.log(`crates_off_paths ok (${n} plots)`);
