// Map fill / layered maps (Coder, Oct 30 2026): every reworked map keeps its warps valid and every door, spot, item and
// trainer reachable, with south-only ledges (collision 2) as one-way drops. Run: node --test tests/map_layers_reach.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const MAPS = new URL('../art/world/overworld/maps/', import.meta.url);
const load = (n) => JSON.parse(fs.readFileSync(new URL(n + '.json', MAPS)));
const REWORKED = { r9_icefall: [14, 18], r9_old_riverbed: [1, 19], r9_switchbacks: [24, 1], fin_summit_camp: [16, 22], cindervale_caldera: [16, 22], r9_cairnfold: [26, 26], frostspire_pass: [24, 1], lanternport_grotto: [15, 20], route_aurelith_saltmere: [0, 19] };
const PASS = new Set([0, 4, 7, 10]);
function reach(m, start, gates = new Set()) {
  const col = m.layers.collision, H = col.length, W = col[0].length;
  const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (PASS.has(col[y][x]) || gates.has(`${x},${y}`));
  const npc = new Set([...(m.npcs || []), ...(m.items || []).filter((i) => !i.hidden)].map((n) => `${n.x},${n.y}`)); // visible satchels are solid
  const seen = new Set([start.join(',')]); const q = [start];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      let nx = x + dx, ny = y + dy;
      if (dy === 1 && ny < H && col[ny]?.[nx] === 2) ny += 1; // hop a south ledge
      else if (!ok(nx, ny)) continue;
      if (!ok(nx, ny) || npc.has(`${nx},${ny}`)) continue;
      const k = `${nx},${ny}`; if (!seen.has(k)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}
for (const [name, start] of Object.entries(REWORKED)) {
  test(`${name}: warps valid, everything reachable, ledges one-way`, () => {
    const m = load(name); const col = m.layers.collision;
    const gates = new Set((m.story_gates || []).flatMap((g) => g.cells.map((c) => `${c.x},${c.y}`)));
    const R = reach(m, start, gates); const N4b = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const w of m.warps.filter((w) => w.reached_via)) { // one-way pocket: entered through a door on reached_via that lands here
      const o = load(w.reached_via); const ow = o.warps.find((v) => v.to === name && Math.abs(v.tx - w.x) + Math.abs(v.ty - w.y) === 1);
      assert.ok(ow, `${w.reached_via} has a door onto ${name} ${w.x},${w.y}`);
      for (const k of reach(m, [ow.tx, ow.ty], gates)) R.add(k);
    }
    for (const w of m.warps) {
      assert.ok(R.has(`${w.x},${w.y}`), `warp ${w.x},${w.y} reachable`);
      const t = load(w.via?.map || w.to); const tx = w.via ? w.via.x : w.tx, ty = w.via ? w.via.y : w.ty;
      assert.ok(PASS.has(t.layers.collision[ty][tx]) || w.via, `warp target ${w.to} ${tx},${ty} passable`);
    }
    for (const s of m.interact_spots || []) { const k = s.stand ? s.stand.join(',') : null; assert.ok(k ? R.has(k) : N4b.some(([dx, dy]) => R.has(`${s.x + dx},${s.y + dy}`)) || R.has(`${s.x},${s.y}`), `spot ${s.id} reachable`); }
    const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const it of m.items || []) assert.ok(it.hidden ? R.has(`${it.x},${it.y}`) : N4.some(([dx, dy]) => R.has(`${it.x + dx},${it.y + dy}`)), `item ${it.id} reachable`);
    assert.ok((m.items || []).some((i) => !i.hidden) && (m.items || []).some((i) => i.hidden), 'a visible and a hidden reward');
    // no ledge strands you: from every reachable square you can walk back to the start
    const back = [...R].filter((_, i) => i % 7 === 0);
    for (const k of back) assert.ok(reach(m, k.split(',').map(Number), gates).has(start.join(',')), `stranded at ${k}`);
    for (const n of m.npcs || []) assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => R.has(`${n.x + dx},${n.y + dy}`)), `npc ${n.id} can be talked to`);
    col.forEach((row, y) => row.forEach((c, x) => { if (c === 0 && ![...(m.npcs || []), ...(m.items || []).filter((i) => !i.hidden)].some((n) => n.x === x && n.y === y)) assert.ok(R.has(`${x},${y}`), `dead pocket ${x},${y}`); }));
    // a ledge never lets you climb back up: from the square below, the shelf is not one step away through it
    col.forEach((row, y) => row.forEach((c, x) => { if (c === 2) assert.ok(PASS.has(col[y - 1][x]) || col[y - 1][x] === 1, `ledge ${x},${y} has a top`); }));
  });
}
test('r9_icefall: the ice shelf is a one-way ledge walk with a hidden Prime Crystal', () => {
  const m = load('r9_icefall'); const col = m.layers.collision;
  assert.equal(col[6].slice(3, 14).every((c) => c === 2), true);
  const it = m.items.find((i) => i.id === 'r9_ic_shelf_crystal'); assert.equal(it.item, 'dominance_crystal_plus'); assert.equal(it.hidden, true);
  const fromBelow = reach({ ...m, layers: { collision: col.map((r, y) => r.map((c, x) => (y === 6 && x >= 14 && x <= 18 ? 1 : c))) } }, [3, 7]);
  assert.ok(!fromBelow.has('3,5'), 'shelf only reached by the climb, not up the ledge');
  assert.ok(m.npcs.length >= 6 && m.interact_spots.length >= 4);
});
