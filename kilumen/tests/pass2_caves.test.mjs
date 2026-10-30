// Pass 2 cave pockets (Gary via Coder, Oct 30 2026): every pocket in data/pass2_caves.json is sealed (the main path can't
// walk or ledge-hop into it without the cave or a field skill), is reachable through its cave, can be left (ledge back to the
// main path), holds an Easter-egg inspectable, a trainer and a hidden strong item; every pocket cave has 2+ exits incl. a
// pocket exit. Run: node --test tests/pass2_caves.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const MAPS = new URL('../art/world/overworld/maps/', import.meta.url);
const load = (n) => JSON.parse(fs.readFileSync(new URL(n + '.json', MAPS)));
const SPEC = JSON.parse(fs.readFileSync(new URL('../data/pass2_caves.json', import.meta.url)));
const PASS = new Set([0, 4, 7, 10]), SKILL = new Set([3, 5, 6, 8, 11]);
const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function reach(m, starts, skills = false) {
  const col = m.layers.collision, H = col.length, W = col[0].length;
  const ok = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (PASS.has(col[y][x]) || (skills && SKILL.has(col[y][x])));
  const seen = new Set(starts.map((s) => s.join(','))); const q = [...starts];
  while (q.length) {
    const [x, y] = q.shift();
    for (const [dx, dy] of N4) {
      let nx = x + dx, ny = y + dy;
      if (dy === 1 && col[ny]?.[nx] === 2) ny += 1; // south ledge hop (one way)
      if (!ok(nx, ny)) continue;
      const k = `${nx},${ny}`; if (!seen.has(k)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}
const cells = (p) => p.floor.flatMap(([x0, y0, x1, y1]) => { const o = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) o.push(`${x},${y}`); return o; });
test('pass 2 pocket list is not empty and names a gate for each pocket', () => {
  assert.ok(SPEC.pockets.length >= 1);
  for (const p of SPEC.pockets) assert.ok(p.gate?.in && p.gate?.out, `${p.id} gate`);
});
for (const p of SPEC.pockets) {
  test(`${p.map} / ${p.id}: sealed, entered by ${p.cave}, left by its ledge, egg + trainer + strong item`, () => {
    const m = load(p.map), cave = load(p.cave); const col = m.layers.collision;
    const pc = cells(p).filter((k) => { const [x, y] = k.split(',').map(Number); return PASS.has(col[y][x]); });
    assert.ok(pc.length >= 6, 'pocket has floor');
    // main path = on foot from the map start, plus older one-way shelves entered from another map's door (e.g. icefall's)
    const caves = new Set(SPEC.pockets.filter((q) => q.map === p.map).map((q) => q.cave));
    const seeds = [p.main_start, ...m.warps.filter((w) => w.reached_via && !caves.has(w.reached_via)).flatMap((w) => N4.map(([dx, dy]) => [w.x + dx, w.y + dy]).filter(([x, y]) => PASS.has(col[y]?.[x])).slice(0, 1))];
    const main = reach(m, seeds); const mainSkills = reach(m, seeds, true);
    assert.ok(main.has(p.main_start.join(',')));
    for (const k of pc) assert.ok(!main.has(k), `pocket ${k} reachable on foot without the cave`);
    // the cave: 2+ exits, one onto the main path, one into the pocket
    const outs = cave.warps.filter((w) => w.to === p.map);
    assert.ok(cave.warps.length >= 2, 'cave has 2+ exits');
    const toMain = outs.filter((w) => main.has(`${w.tx},${w.ty}`)); const toPocket = outs.filter((w) => pc.includes(`${w.tx},${w.ty}`));
    assert.ok(toMain.length >= 1, 'cave exit onto the main path'); assert.ok(toPocket.length >= 1, 'cave side exit into the pocket');
    assert.ok(!mainSkills.has(`${toPocket[0].tx},${toPocket[0].ty}`) || p.gate.skill, 'only a named skill gate may open the pocket');
    // inside the cave the two exits are connected
    // the main path reaches the cave mouth, and the pocket door leads back into the cave
    const mouth = m.warps.find((w) => w.to === p.cave && !w.reached_via); assert.ok(mouth && main.has(`${mouth.x},${mouth.y}`), 'cave mouth on the main path');
    // inside the cave the mouth landing reaches the pocket exit (puzzle gates such as gate_cave_closed 894 count as opened later)
    const cv = { ...cave, layers: { ...cave.layers, collision: cave.layers.collision.map((r, y) => r.map((v, x) => (cave.layers.decoration?.[y]?.[x] === 894 ? 0 : v))) } };
    const cw = reach(cv, [[mouth.tx, mouth.ty]]);
    assert.ok(cw.has(`${toPocket[0].x},${toPocket[0].y}`), 'cave links main mouth to pocket exit');
    const door = m.warps.find((w) => w.to === p.cave && w.reached_via === p.cave); assert.ok(door, 'pocket door back into the cave');
    // with the cave: whole pocket reachable, and you can leave it on foot (ledge) back to the main path
    const inside = reach(m, [[toPocket[0].tx, toPocket[0].ty]]);
    for (const k of pc) assert.ok(inside.has(k), `pocket ${k} reachable from the cave`);
    assert.ok(inside.has(p.main_start.join(',')), 'no softlock: the pocket ledges back to the main path');
    // contents
    const inP = (o) => pc.includes(`${o.x},${o.y}`) || N4.some(([dx, dy]) => pc.includes(`${o.x + dx},${o.y + dy}`));
    const egg = (m.interact_spots || []).find((s) => s.pocket === p.id && s.easter_egg); assert.ok(egg && inP(egg), 'Easter egg inspectable');
    const tr = (m.npcs || []).find((n) => n.pocket === p.id && n.team?.length); assert.ok(tr && pc.includes(`${tr.x},${tr.y}`), 'pocket trainer');
    assert.ok(!main.has(`${tr.x},${tr.y}`), 'trainer is off the main path');
    const it = (m.items || []).find((i) => i.pocket === p.id); assert.ok(it?.hidden && /vigor_seed|dominance_crystal_plus/.test(it.item) && pc.includes(`${it.x},${it.y}`), 'hidden strong item');
    const lines = JSON.parse(fs.readFileSync(new URL('../data/pass2_caves_fallback.json', import.meta.url))).maps[p.map];
    assert.ok(lines[tr.id]?.battle_lost && lines[egg.id]?.pages?.length, 'placeholder lines for trainer and egg');
  });
}

// R6 (layering_rules): every pass 2 map shows one strong item in plain sight that the main path can't reach (a pocket)
for (const mapName of [...new Set(SPEC.pockets.map((p) => p.map))]) {
  test(`${mapName}: a visible strong item sits in a sealed pocket (R6)`, () => {
    const m = load(mapName); const ps = SPEC.pockets.filter((p) => p.map === mapName);
    const pc = new Set(ps.flatMap(cells));
    const vis = (m.items || []).filter((i) => !i.hidden && /vigor_seed|dominance_crystal_plus/.test(i.item) && pc.has(`${i.x},${i.y}`));
    assert.ok(vis.length >= 1, 'visible-but-unreachable strong item');
  });
}
