// Hotfix v0.2.102 (Gary, Oct 30 2026): Aurelith's three pass 2 pockets were floored with x_city_zebra_h (a crosswalk
// marking) tiled over 8x6 areas, drawn as a white/dark striped grid. Pass 2 sampled the floor from one cell; on other maps that
// cell was an autotile edge (trail>grass_*), giving the same repeated-edge look. This scans every map's ground for such misuse.
// Run: node --test tests/ground_tile_misuse.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const DIR = new URL('../art/world/overworld/', import.meta.url);
const ts = JSON.parse(fs.readFileSync(new URL('tileset.json', DIR)));
const NAME = new Map(ts.tiles.map((t) => [t.id, t.name]));
const MAPS = fs.readdirSync(new URL('maps/', DIR)).filter((f) => f.endsWith('.json'));
const SPEC = JSON.parse(fs.readFileSync(new URL('../data/pass2_caves.json', import.meta.url)));
const MARKING = /zebra|crosswalk/;             // road markings: only as short crossings on a road
const ROADLIKE = /^x_city_(asphalt|road)_/;      // what a crossing must touch
const EDGE = /[>]|_edge/;                         // autotile transition / edge pieces
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
// 4-connected components of the same tile id
function comps(g, pred) {
  const H = g.length, W = g[0].length, seen = new Set(), out = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const id = g[y][x]; if (seen.has(`${x},${y}`) || !pred(id)) continue;
    const q = [[x, y]], cells = []; seen.add(`${x},${y}`);
    while (q.length) {
      const [cx, cy] = q.pop(); cells.push([cx, cy]);
      for (const [dx, dy] of N4) { const nx = cx + dx, ny = cy + dy, k = `${nx},${ny}`;
        if (g[ny]?.[nx] === id && !seen.has(k)) { seen.add(k); q.push([nx, ny]); } }
    }
    out.push({ id, cells });
  }
  return out;
}
const hasBlock = (g, id, n) => { // any n x n square entirely of id
  for (let y = 0; y + n <= g.length; y++) for (let x = 0; x + n <= g[0].length; x++) {
    let ok = true; for (let j = 0; j < n && ok; j++) for (let i = 0; i < n && ok; i++) ok = g[y + j][x + i] === id;
    if (ok) return [x, y];
  }
  return null;
};
for (const f of MAPS) {
  test(`${f}: no crosswalk / autotile-edge tile used as area ground`, () => {
    const g = JSON.parse(fs.readFileSync(new URL('maps/' + f, DIR))).layers?.ground;
    if (!g?.length) return;
    for (const c of comps(g, (id) => MARKING.test(NAME.get(id) || ''))) {
      const [x, y] = c.cells[0], nm = NAME.get(c.id);
      assert.ok(c.cells.length <= 16, `${nm} (${c.id}) covers ${c.cells.length} cells from ${x},${y}: a crossing, not ground`);
      assert.ok(c.cells.some(([cx, cy]) => N4.some(([dx, dy]) => ROADLIKE.test(NAME.get(g[cy + dy]?.[cx + dx]) || ''))),
        `${nm} (${c.id}) at ${x},${y} does not touch a road`);
    }
    const ids = new Set(g.flat().filter((id) => EDGE.test(NAME.get(id) || '')));
    for (const id of ids) { const b = hasBlock(g, id, 3); assert.equal(b, null, `edge tile ${NAME.get(id)} (${id}) fills a 3x3 block at ${b}`); }
  });
}
test('pass 2 pocket floors are plain ground (no markings or edges)', () => {
  for (const p of SPEC.pockets) {
    const g = JSON.parse(fs.readFileSync(new URL(`maps/${p.map}.json`, DIR))).layers.ground;
    for (const [x0, y0, x1, y1] of p.floor) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const nm = NAME.get(g[y][x]) || '';
      assert.ok(!MARKING.test(nm) && !EDGE.test(nm), `${p.map}/${p.id} ${x},${y} floor is ${nm}`);
    }
  }
});
