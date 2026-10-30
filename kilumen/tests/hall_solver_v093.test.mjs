// live v0.2.93 hall blockers: every v2 hall must be solvable from the door with no trap states (BFS over HallV2).
import test from 'node:test'; import assert from 'node:assert'; import fs from 'node:fs';
import { HallV2 } from '../src/progression/puzzles.js';
import { HALL_HINTS } from '../src/progression/hall_v2.js';
const D = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
const BANNED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|Gotcha!|nurse|weed|routes?|berr(y|ies)|elite|gym)\b/i;
function solve(map) {
  const j = JSON.parse(fs.readFileSync(new URL(`../art/world/overworld/maps/${map}.json`, import.meta.url))), h = j.hall_v2;
  const tr = j.npcs.filter((n) => n.kind === 'trainer_hooded' && !n.hint_only).map((n) => [n.x, n.y]);
  const M = new HallV2(h.grid, tr, h.prism), k = (x, y, b) => `${x},${y},${b}`, seen = new Set([k(...h.arrival, 0)]), q = [[...h.arrival, 0]], edges = new Map();
  while (q.length) { const [x, y, b] = q.shift(), out = [];
    for (const [d, [dx, dy]] of Object.entries(D)) { if (!M.open(x + dx, y + dy, b)) continue; const r = M.enter(x + dx, y + dy, b, d), nk = k(r.x, r.y, r.b); out.push(nk); if (!seen.has(nk)) { seen.add(nk); q.push([r.x, r.y, r.b]); } }
    edges.set(k(x, y, b), out); }
  const goal = [...seen].filter((s) => s.startsWith(`${h.dais_front[0]},${h.dais_front[1]},`)), ok = new Set(goal), rev = new Map();
  for (const [a, o] of edges) for (const b of o) (rev.get(b) || rev.set(b, []).get(b)).push(a);
  const st = [...goal]; while (st.length) for (const a of rev.get(st.pop()) || []) if (!ok.has(a)) { ok.add(a); st.push(a); }
  return { solvable: goal.length > 0, traps: [...seen].filter((s) => !ok.has(s)) };
}
for (const map of ['cindervale_hall_int', 'tidewater_hall_int', 'lanternport_hall_int']) {
  test(`${map}: dais reachable from the door, no trap states`, () => { const r = solve(map); assert.ok(r.solvable); assert.deepStrictEqual(r.traps, []); });
}
test('hall hints are clean DRAFT text', () => { for (const pages of Object.values(HALL_HINTS)) for (const p of pages) assert.ok(!BANNED.test(p), p); });
test('every hall Master has a sprite (lanternport/cindervale invisible-Master fix)', () => {
  const sm = JSON.parse(fs.readFileSync(new URL('../art/characters/pixel/npcs/npc_sprite_map.json', import.meta.url))), map = sm.map || sm;
  for (const z of ['mirefen', 'tidewater', 'lanternport', 'cindervale']) assert.ok(map[`${z}_hall_int.${z}_hall_int_master`], z);
});
