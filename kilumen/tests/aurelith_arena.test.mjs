// Aurelith Arena (Coder, Oct 29 2026; themed rooms pt2156u): lobby + 8 themed rooms, 8 Arena fighters (mono-type, final stage, L59-69, ace 67-69), back to back run.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ARENA, ARENA_TEAMS, fighterState, fightRoom, runFlags, arenaHook } from '../src/region78/arena.js';
import { authoredTeam } from '../src/battle/data/trainer_teams.js';
import { evoTable } from '../src/systems/evolution.js';
import { SPECIES } from '../src/ui/data.js';
import { STARTER_ONLY } from '../src/battle/data/starters.js';
import { RON_KEYS } from '../src/battle/data/ron_team.js';

const MAPS = 'art/world/overworld/maps/';
const load = (m) => JSON.parse(fs.readFileSync(MAPS + m + '.json', 'utf8'));
const map = load('aurelith_arena');
const rooms = ARENA.fighters.map((f, i) => load(ARENA.room(i + 1)));
const SP = Object.fromEntries(SPECIES.map((s) => [s.id, s])), evo = evoTable();
const hasArt = (s) => fs.existsSync(`art/characters/pixel/creatures/${s}`);

test('8 fighters: one type each (8 distinct incl. water, fire, wind, dark), 6 real final-stage Kilu with art', () => {
  assert.equal(ARENA.fighters.length, 8);
  const types = ARENA.fighters.map((f) => f.type);
  assert.equal(new Set(types).size, 8);
  for (const t of ['water', 'fire', 'wind', 'dark']) assert.ok(types.includes(t), t);
  const all = new Set();
  for (const f of ARENA.fighters) {
    const team = authoredTeam({ map: ARENA.room(ARENA.fighters.indexOf(f) + 1), id: f.id });
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

test('lobby: stadium doors land on walkable squares, mats return, stairs go up to room 1, no banned words', () => {
  const st = load('aurelith_stadium_int');
  const doors = st.warps.filter((w) => w.to === 'aurelith_arena');
  assert.equal(doors.length, 2);
  for (const d of doors) { assert.equal(map.layers.collision[d.ty][d.tx], 0, 'arrival square walkable'); assert.ok(!/^\s*TO COME/i.test(d.note || ''), 'door is live'); }
  for (const w of map.warps) {
    assert.ok(['aurelith_stadium_int', ARENA.room(1)].includes(w.to), w.to); assert.equal(map.layers.collision[w.y][w.x], 4);
    assert.equal(load(w.to).layers.collision[w.ty][w.tx], 0, `lands walkable on ${w.to}`);
  }
  assert.deepEqual(map.npcs.map((n) => n.id), [ARENA.clerk, 'aurelith_arena_ron_final']); // r78: final Ron by the exit (active_when tower_healed)
  const all = ['aurelith_arena', ...rooms.map((r) => r.name)].map((m) => fs.readFileSync(MAPS + m + '.json', 'utf8')).join('') + fs.readFileSync('src/region78/arena.js', 'utf8');
  assert.ok(!/elite|\bgym\b|\bnurse\b|\broute\b|\bberry\b|shiny|super effective|pokedex|poke ball/i.test(all));
  assert.ok(!fs.existsSync(MAPS + 'aurelith_arena_int.json'), 'final Ron (tower) map not built here');
  assert.ok(RON_KEYS['aurelith_arena_int.aurelith_arena_ron_final'], 'final Ron key untouched');
});

test('8 rooms in a chain: one fighter each, themed to its type (distinct floor/walls/props/tint), gated stairs up, mats down', () => {
  const sig = new Set();
  rooms.forEach((r, i) => {
    const n = i + 1, f = ARENA.fighters[i], C = r.layers.collision;
    assert.deepEqual(r.npcs.map((x) => x.id).filter((id) => !/^arena_(steward|fan)_/.test(id)), [f.id]); assert.equal(C[r.npcs[0].y][r.npcs[0].x], 0); // room 8 also has a steward + fan (Oct 30)
    assert.equal(r.arena_theme.type, f.type, `room ${n} theme matches fighter type`);
    assert.ok(['dawn', 'day', 'dusk', 'night'].includes(r.tint.grade));
    sig.add(`${r.layers.ground[5][1]}|${r.layers.ground[0][0]}|${r.tint.grade}|${r.layers.decoration.flat().filter(Boolean).sort().join(',')}`);
    const back = r.warps.filter((w) => w.y === r.height - 1), up = r.warps.filter((w) => w.y < r.height - 1);
    assert.equal(back.length, 2); for (const w of back) assert.equal(w.to, n === 1 ? ARENA.map : ARENA.room(n - 1));
    for (const w of r.warps) { assert.equal(C[w.y][w.x], 4); assert.equal(load(w.to).layers.collision[w.ty][w.tx], 0, `${r.name} -> ${w.to} lands walkable`); }
    if (n === 8) { assert.equal(up.length, 0); assert.equal((r.story_gates || []).length, 0); return; }
    assert.equal(up.length, 2); for (const w of up) assert.equal(w.to, ARENA.room(n + 1));
    const [g] = r.story_gates; assert.equal(g.flag, ARENA.wonFlag(n));
    for (const c of g.cells) { assert.equal(C[c.y][c.x], 6, 'gate closed in json'); assert.ok(up.some((w) => w.x === c.x && w.y === c.y - 2), 'gate guards the stairs'); }
  });
  assert.equal(sig.size, 8, 'every room looks different');
});

test('every room/lobby square is reachable (gates open) and each fighter can be talked to', () => {
  for (const m of [map, ...rooms]) {
    const C = m.layers.collision.map((r) => r.map((c) => (c === 6 ? 0 : c))), H = C.length, W = C[0].length;
    const start = m.warps.find((w) => w.y === H - 1), seen = new Set([`${start.x},${start.y}`]), q = [[start.x, start.y]];
    while (q.length) { const [x, y] = q.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H || ![0, 4].includes(C[ny][nx]) || seen.has(`${nx},${ny}`)) continue; seen.add(`${nx},${ny}`); q.push([nx, ny]); } }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (C[y][x] === 0) assert.ok(seen.has(`${x},${y}`), `${m.name} ${x},${y} reachable`);
    for (const n of m.npcs) assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0], [0, 2]].some(([dx, dy]) => seen.has(`${n.x + dx},${n.y + dy}`)), `${n.id} can be talked to`);
  }
});

test('run: room 1 starts it, rooms go in order, a win opens the stairs, a loss resets, 8 wins = cleared', async () => {
  const flags = new Set();
  assert.equal(fighterState(flags, 1), 'start'); assert.equal(fighterState(flags, 2), 'waiting');
  flags.add(ARENA.runFlag);
  const ctx = (won, log) => ({ text: (k) => [k], fighter: () => ['x'], say: async () => {}, battle: async () => won,
    set: (fl) => flags.add(fl), reset: () => runFlags().forEach((fl) => flags.delete(fl)), done: async () => log.push('done') });
  const log = [];
  for (let n = 1; n <= 8; n++) {
    assert.equal(fighterState(flags, n), 'fight', `room ${n}`);
    if (n < 8) assert.equal(fighterState(flags, n + 1), 'waiting');
    assert.equal(await fightRoom(ctx(true, log), ARENA.fighters[n - 1]), n < 8 ? 'next' : 'won');
    if (n < 8) { assert.ok(flags.has(ARENA.wonFlag(n))); assert.equal(fighterState(flags, n), 'beaten'); }
  }
  assert.deepEqual(log, ['done']); assert.equal(flags.size, 0, 'run flags cleared after the clear');
  flags.add(ARENA.runFlag); await fightRoom(ctx(true, log), ARENA.fighters[0]); await fightRoom(ctx(true, log), ARENA.fighters[1]);
  assert.equal(await fightRoom(ctx(false, log), ARENA.fighters[2]), 'lost');
  assert.equal(flags.size, 0, 'loss resets'); assert.equal(fighterState(flags, 3), 'waiting'); assert.equal(fighterState(flags, 1), 'start');
});

test('fighter names come from text (name), code fallback only when text has none', async () => {
  const said = [];
  const lines = { maps: { aurelith_arena: Object.fromEntries(ARENA.fighters.map((f) => [f.id, { name: `TXT_${f.id}` }])) } };
  const scene = { lines, flags: new Set([ARENA.runFlag]), seen: {}, setFlag(fl, on = true) { on ? this.flags.add(fl) : this.flags.delete(fl); },
    say: async (p) => said.push(...p), hooks: { onBattle: async () => true }, party: [1] };
  const h = arenaHook(scene);
  assert.ok(h.match(ARENA.room(3), { id: ARENA.fighters[2].id }) && !h.match(ARENA.map, { id: ARENA.fighters[2].id }));
  await h.run({ def: { id: ARENA.fighters[0].id } });
  assert.ok(said.some((p) => p.includes(`TXT_${ARENA.fighters[0].id}`)), 'text name used');
  assert.ok(!said.some((p) => p.includes(ARENA.fighters[0].name)), 'fallback name not used when text has one');
});

test('world graph: aurelith_arena resolves, nothing dangling', () => {
  const out = execFileSync('node', ['tools/world_graph/world_graph.mjs'], { encoding: 'utf8' });
  assert.ok(!/'aurelith_arena', which is not a map/.test(out));
  assert.match(out, /"dangling": \[\]/);
});
