// Aurelith Arena (Coder, Oct 29 2026): map, 8 Arena fighters (mono-type, final stage, L59-69, ace 67-69), back to back run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ARENA, ARENA_TEAMS, runArena } from '../src/region78/arena.js';
import { authoredTeam } from '../src/battle/data/trainer_teams.js';
import { evoTable } from '../src/systems/evolution.js';
import { SPECIES } from '../src/ui/data.js';
import { STARTER_ONLY } from '../src/battle/data/starters.js';
import { RON_KEYS } from '../src/battle/data/ron_team.js';

const MAPS = 'art/world/overworld/maps/';
const map = JSON.parse(fs.readFileSync(MAPS + 'aurelith_arena.json', 'utf8'));
const SP = Object.fromEntries(SPECIES.map((s) => [s.id, s])), evo = evoTable();
const hasArt = (s) => fs.existsSync(`art/characters/pixel/creatures/${s}`);

test('8 fighters: one type each (8 distinct incl. water, fire, wind, dark), 6 real final-stage Kilu with art', () => {
  assert.equal(ARENA.fighters.length, 8);
  const types = ARENA.fighters.map((f) => f.type);
  assert.equal(new Set(types).size, 8);
  for (const t of ['water', 'fire', 'wind', 'dark']) assert.ok(types.includes(t), t);
  const all = new Set();
  for (const f of ARENA.fighters) {
    const team = authoredTeam({ map: 'aurelith_arena', id: f.id });
    assert.equal(team.length, 6, f.id);
    for (const c of team) {
      assert.ok(SP[c.species], `${c.species} is a real species`);
      assert.ok(hasArt(c.species), `${c.species} has art`);
      assert.ok(SP[c.species].el.includes(f.type), `${c.species} is ${f.type} (${f.id})`);
      assert.ok(!evo[c.species], `${c.species} is final stage`);
      assert.ok(!STARTER_ONLY.includes(c.species));
      assert.ok(c.level >= 59 && c.level <= 69, `${c.species} L${c.level}`);
      assert.ok(!all.has(c.species), `${c.species} used once`); all.add(c.species);
    }
    const ace = team.at(-1).level;
    assert.ok(ace >= 67 && ace <= 69 && team.every((c) => c.level <= ace), `${f.id} ace ${ace}`);
  }
});

test('map: doors from the stadium resolve, exit mats return, NPCs on walkable squares, no banned words', () => {
  const st = JSON.parse(fs.readFileSync(MAPS + 'aurelith_stadium_int.json', 'utf8'));
  const doors = st.warps.filter((w) => w.to === 'aurelith_arena');
  assert.equal(doors.length, 2);
  for (const d of doors) assert.equal(map.layers.collision[d.ty][d.tx], 0, 'arrival square walkable');
  for (const w of map.warps) {
    assert.equal(w.to, 'aurelith_stadium_int'); assert.equal(map.layers.collision[w.y][w.x], 4);
    assert.equal(st.layers.collision[w.ty][w.tx], 0, 'lands on a walkable stadium square');
  }
  const ids = map.npcs.map((n) => n.id);
  assert.ok(ids.includes(ARENA.clerk));
  for (const f of ARENA.fighters) assert.ok(ids.includes(f.id));
  for (const n of map.npcs) assert.equal(map.layers.collision[n.y][n.x], 0, n.id);
  assert.ok(!/elite|\bgym\b/i.test(fs.readFileSync(MAPS + 'aurelith_arena.json', 'utf8') + fs.readFileSync('src/region78/arena.js', 'utf8')));
  assert.ok(!fs.existsSync(MAPS + 'aurelith_arena_int.json'), 'final Ron (tower) map not built here');
  assert.ok(RON_KEYS['aurelith_arena_int.aurelith_arena_ron_final'], 'final Ron key untouched');
});

test('every lobby square reaches the event room through the doorway (flood fill)', () => {
  const C = map.layers.collision, H = C.length, W = C[0].length, seen = new Set(['8,12']), q = [[8, 12]];
  while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || C[ny][nx] === 1 || seen.has(`${nx},${ny}`)) continue; seen.add(`${nx},${ny}`); if (C[ny][nx] === 0) q.push([nx, ny]); } }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (C[y][x] === 0) assert.ok(seen.has(`${x},${y}`), `${x},${y} reachable`);
  for (const n of map.npcs) assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2]].some(([dx, dy]) => seen.has(`${n.x + dx},${n.y + dy}`)), `${n.id} can be talked to`);
});

test('runArena: back to back in order; a loss stops the run; 8 wins = cleared', async () => {
  const fought = [];
  const ctx = (loseAt) => ({ text: () => [], fighter: () => [], say: async () => {}, battle: async (id) => { fought.push(id); return id !== loseAt; } });
  assert.deepEqual(await runArena(ctx(null)), { won: true, beaten: 8 });
  assert.deepEqual(fought, ARENA.fighters.map((f) => f.id));
  fought.length = 0;
  assert.deepEqual(await runArena(ctx('arena_fighter_3')), { won: false, beaten: 2 });
  assert.equal(fought.length, 3);
});

test('world graph: aurelith_arena resolves, nothing dangling', () => {
  const out = execFileSync('node', ['tools/world_graph/world_graph.mjs'], { encoding: 'utf8' });
  assert.ok(!/'aurelith_arena', which is not a map/.test(out));
  assert.match(out, /"dangling": \[\]/);
});
