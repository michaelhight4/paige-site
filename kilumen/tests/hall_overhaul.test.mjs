// Hall overhaul phase 2 (Oct 29 2026): 8 rebuilt halls (maps with hall_v2). Covers the solver, the any-4 wins gate, the
// puzzle gate on the Master (playtest: Mirefen dais reachable up the bridge), sight battles per hall, quiet after the
// Master (old saves too), the Master rematch (x1.3^wins, 300 gold up front, level cap), forced moves under a save lock,
// hint-only NPCs not counting, NPCs off gate / beam / animated cells, the hall anim flag, and banned words.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const J = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const { HallV2, hallV2FromMap } = await import(path.join(root, 'src/progression/puzzles.js'));
const HV = await import(path.join(root, 'src/progression/hall_v2.js'));
const { hallAnimOn, applyHallAnim } = await import(path.join(root, 'src/progression/hall_anim.js'));
const { GameMap } = await import(path.join(root, 'src/overworld/map.js'));
const { findSpotter } = await import(path.join(root, 'src/overnight/sight.js'));
const { KILUMEN_RULES } = await import(path.join(root, 'src/battle/data/rules.js'));

const HALLS = ['fernwick', 'mirefen', 'saltmere', 'tidewater', 'frostspire', 'revival', 'cindervale']; // lanternport: the lighthouse block below
const ALL_HALLS = [...HALLS, 'lanternport'];
const COUNT = { fernwick: 3, saltmere: 4, revival: 5, mirefen: 7, tidewater: 8, lanternport: 10, cindervale: 12, frostspire: 6 };
const byId = new Map();
for (const f of ['tileset.json', 'tileset_ix2.json', 'tileset_hallanim.json', 'tileset_hallart.json']) for (const t of J(`art/world/overworld/${f}`).tiles) byId.set(t.id, t);
const mapJson = (h) => J(`art/world/overworld/maps/${h}_hall_int.json`);
const lines = J('text/overworld_lines.json');

function fakeScene(h, { flags = [], seen = {}, counters = {}, coins = 1000, answer = 0, won = true } = {}) {
  const map = new GameMap(mapJson(h)); map.attachTileset(byId);
  const out = { said: [], battles: [], locks: 0, released: 0 };
  const sc = {
    map, flags: new Set(flags), seen, counters, lines, out, ms: 0, rustles: new Map(), busy: false,
    player: { x: map.json.hall_v2.arrival[0], y: map.json.hall_v2.arrival[1], facing: 'up', locked: false },
    systems: { wallet: { coins, spend(n) { if (this.coins < n) return false; this.coins -= n; return true; }, add(n) { this.coins += n; return n; } }, onTrainerLoss: async () => true },
    npcs: { byId: () => null, beginTalk() {}, endTalk() {}, walkTo() {} },
    setFlag(f) { this.flags.add(f); },
    script: async (fn) => fn(), say: async (p) => { out.said.push(p.join(' ')); }, ask: async () => answer,
    speakerFor: () => null, _entryFor: (mn, d) => lines.maps?.[mn]?.[d.id] || {},
    lockSave: () => { out.locks++; return () => { out.released++; }; },
    hooks: { onBattle: async (who) => { out.battles.push(who); if (won && !who.masterRematch) seen[`defeated:${who.map}.${who.id}`] = true; return won; } },
    worldApi: () => ({ onArrive: () => undefined, onStepStart: () => undefined }),
  };
  sc.talk = async (n, def) => { // stands in for the core talk(): battle when not beaten yet
    if (seen[`defeated:${map.name}.${def.id}`]) { out.said.push('after'); return; }
    await sc.hooks.onBattle({ map: map.name, id: def.id });
  };
  const hv = HV.attachHallV2(sc, null, { store: { masters: {}, puzzles: {} } });
  return { sc, hv, map, out, m: map.json };
}
const master = (m) => m.npcs.find((n) => n.kind === 'master');
const trainers = (m) => HV.hallTrainers(m);

for (const h of HALLS) {
  test(`${h}: solver - no softlocks, solution matches, a walk with exactly min(4,n) battles`, () => {
    const m = mapJson(h), r = hallV2FromMap(m);
    const c = r.hall.check();
    assert.equal(c.softlocks, 0); assert.equal(c.moves, m.hall_v2.solution_moves);
    assert.equal(trainers(m).length, COUNT[h]);
    assert.equal(HV.needWins(m), COUNT[h] > 4 ? 4 : COUNT[h]);
    assert.ok(r.hall.battles(r.rays, Math.min(4, COUNT[h]), 200000), 'walk with exactly the needed battles');
  });

  test(`${h}: the dais is NOT reachable by plain walking (no plates, pushes or warps) - the puzzle gates the Master`, () => {
    const m = mapJson(h), g = new HallV2(m.hall_v2.grid, trainers(m).map((n) => [n.x, n.y]), m.hall_v2.prism);
    const [sx, sy] = m.hall_v2.arrival, [dx, dy] = m.hall_v2.dais_front, seenC = new Set([`${sx},${sy}`]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + ax, ny = y + ay, ch = g.at(nx, ny);
        if (seenC.has(`${nx},${ny}`) || /[TU1-6\^v<>i]/.test(ch) || !g.open(nx, ny, 0)) continue;
        seenC.add(`${nx},${ny}`); q.push([nx, ny]);
      }
    }
    assert.ok(!seenC.has(`${dx},${dy}`), 'dais reachable without the puzzle');
  });

  test(`${h}: Master refuses before the puzzle, before the wins; battles once both are met`, async () => {
    const m = mapJson(h), need = HV.needWins(m), tr = trainers(m), mid = master(m);
    const seen = {}; for (const t of tr.slice(0, need)) seen[`defeated:${m.name}.${t.id}`] = true;
    let f = fakeScene(h, { seen: { ...seen } }); // wins met, puzzle not done (walked up the bridge)
    await f.sc.talk(null, mid); assert.equal(f.out.battles.length, 0);
    const few = {}; for (const t of tr.slice(0, need - 1)) few[`defeated:${m.name}.${t.id}`] = true;
    f = fakeScene(h, { seen: few, flags: [HV.puzzleFlag(m)] }); // puzzle done, one win short
    await f.sc.talk(null, mid); assert.equal(f.out.battles.length, 0);
    f = fakeScene(h, { seen: { ...seen }, flags: [HV.puzzleFlag(m)] });
    await f.sc.talk(null, mid); assert.equal(f.out.battles.length, 1);
    assert.equal(f.sc.counters[`hall_${m.hall_v2.zone}_wins`], need);
  });

  test(`${h}: reaching the dais front sets the puzzle flag`, () => {
    const f = fakeScene(h), [dx, dy] = f.m.hall_v2.dais_front;
    f.hv.arrive(dx, dy, { facing: 'up', _attempt() {}, place() {} }, f.sc.worldApi());
    assert.ok(f.sc.flags.has(HV.puzzleFlag(f.m)));
  });

  test(`${h}: a trainer really spots the player (sight battle), and stops after the Master`, () => {
    const m = mapJson(h), map = new GameMap(m); map.attachTileset(byId);
    let hit = 0;
    for (const t of trainers(m)) {
      const cell = (t.sight_cells || []).find(([x, y]) => map.code(x, y) === 0 && !map.npcAt(x, y)); if (!cell) continue;
      const n = { def: t, x: t.x, y: t.y };
      if (findSpotter(map, [n], cell[0], cell[1], () => false) === n) hit++;
    }
    assert.ok(hit >= 1, 'no trainer sees its own sight cells');
    const f = fakeScene(h, { flags: [`beat_master_${m.hall_v2.zone}`] });
    for (const t of trainers(m)) assert.equal(f.sc.hallQuiet({ def: t }), true);
  });

  test(`${h}: after the Master (old save: defeated record only) unfought trainers give the after line, no battle`, async () => {
    const m = mapJson(h), seen = { [`defeated:${m.name}.${master(m).id}`]: true };
    const f = fakeScene(h, { seen });
    for (const t of trainers(m)) await f.sc.talk(null, t);
    assert.equal(f.out.battles.length, 0); assert.equal(f.out.said.length, trainers(m).length);
  });

  test(`${h}: NPCs never stand on gates, plates, pads, push tiles or animated (prism / beam / gate) cells`, () => {
    const m = mapJson(h), g = m.hall_v2.grid, anim = new Set((m.hall_v2.anim?.cells || []).map(([x, y]) => `${x},${y}`));
    for (const n of m.npcs) { assert.ok(!/[abcdTU1-6\^v<>i#]/.test(g[n.y][n.x]), `${n.id} on ${g[n.y][n.x]}`); assert.ok(!anim.has(`${n.x},${n.y}`), `${n.id} on an anim cell`); }
  });
}

test('rematch: 300 gold up front (kept on a loss), win pays flat 1200, x1.3^wins, counter bumps, under 300 declines', async () => {
  const m = mapJson('mirefen'), mid = master(m), z = m.hall_v2.zone, flags = [`beat_master_${z}`];
  let f = fakeScene('mirefen', { flags, coins: 650 });
  await f.sc.talk(null, mid);
  assert.equal(f.sc.systems.wallet.coins, 650 - 300 + 1200); assert.equal(f.out.battles[0].masterRematch, true); assert.equal(f.out.battles[0].masterWins, 1);
  assert.equal(f.sc.counters[`master_${z}_wins`], 2);
  f = fakeScene('mirefen', { flags, coins: 300, won: false, counters: { [`master_${z}_wins`]: 3 } });
  await f.sc.talk(null, mid); assert.equal(f.sc.systems.wallet.coins, 0); assert.equal(f.sc.counters[`master_${z}_wins`], 3);
  f = fakeScene('mirefen', { flags, coins: 299 });
  await f.sc.talk(null, mid); assert.equal(f.out.battles.length, 0); assert.equal(f.sc.systems.wallet.coins, 299);
  f = fakeScene('mirefen', { flags, coins: 999, answer: 1 }); // said no
  await f.sc.talk(null, mid); assert.equal(f.sc.systems.wallet.coins, 999);
});

test('scaleMasterTeam: 1.3^wins, rounded, capped at maxLevel 100, never below 1', () => {
  assert.equal(KILUMEN_RULES.maxLevel, 100);
  assert.deepEqual(HV.scaleMasterTeam([{ species: 'a', level: 20 }], 1).map((f) => f.level), [26]);
  assert.deepEqual(HV.scaleMasterTeam([{ species: 'a', level: 20 }], 2).map((f) => f.level), [34]);
  assert.deepEqual(HV.scaleMasterTeam([{ species: 'a', level: 60 }], 9).map((f) => f.level), [100]);
  assert.deepEqual(HV.scaleMasterTeam([{ species: 'a', level: 20 }], 0).map((f) => f.level), [20]);
});

test('hint-only NPCs never count toward the Master gate', () => {
  const m = mapJson('revival'), mm = { ...m, npcs: m.npcs.map((n) => n.id.endsWith('_h4') ? { ...n, hint_only: true } : n) };
  assert.equal(HV.hallTrainers(mm).length, HV.hallTrainers(m).length - 1);
  assert.ok(HV.hallTrainers(m).every((n) => n.kind === 'trainer_hooded'));
});

test('forced moves: a push tile holds a save lock and freezes input until the chain stops', () => {
  const f = fakeScene('mirefen'), g = f.m.hall_v2.grid; let px, py;
  for (let y = 0; y < g.length && px == null; y++) { const x = g[y].search(/[\^v<>]/); if (x >= 0) { px = x; py = y; } }
  const mv = { facing: 'down', state: 'idle', _attempt() { this.state = 'step'; }, place() {} };
  assert.equal(f.hv.arrive(px, py, mv, f.sc.worldApi()), 'stop');
  assert.equal(f.out.locks, 1); assert.equal(f.sc.player.locked, true); assert.equal(f.sc.hallQuiet({ def: trainers(f.m)[0] }), true);
  f.hv.arrive(...f.m.hall_v2.arrival, mv, f.sc.worldApi()); // plain floor ends the chain
  assert.equal(f.out.released, 1); assert.equal(f.sc.player.locked, false);
});

test('gates: bits reset at the door, plates toggle collision on the gate', () => {
  const f = fakeScene('fernwick'), g = f.m.hall_v2.grid;
  const find = (c) => { for (let y = 0; y < g.length; y++) { const x = g[y].indexOf(c); if (x >= 0) return [x, y]; } };
  const [bx, by] = find('b'), [tx, ty] = find('T');
  assert.equal(f.map.layers.collision[by][bx], 6);
  f.hv.arrive(tx, ty, { facing: 'up', _attempt() {}, place() {} }, f.sc.worldApi());
  assert.equal(f.map.layers.collision[by][bx], 0);
});

test('hall anim flag: dev on, public off, overrides win; applyHallAnim sets cells', () => {
  assert.equal(hallAnimOn({ override: undefined, host: 'localhost' }), true);
  assert.equal(hallAnimOn({ override: undefined, host: 'paigegames.net' }), false);
  assert.equal(hallAnimOn({ override: undefined, host: 'paigegames.net', devRequested: true }), true);
  assert.equal(hallAnimOn({ override: false, host: 'localhost' }), false);
  const map = new GameMap(mapJson('revival')); map.attachTileset(byId);
  assert.ok(applyHallAnim(map) > 0);
});

test('system_halls keys exist and hall text has no banned words', () => {
  for (const k of ['progress', 'progress_open', 'master_locked', 'master_puzzle', 'rematch_prompt', 'rematch_no_gold', 'rematch_won']) assert.ok(lines.system_halls?.[k], k);
  const BANNED = /\b(PP|shiny|super effective|Pok[eé]dex|Pok[eé] Ball|nurse|weed|routes?|berr(y|ies)|gym)\b/i;
  for (const h of ALL_HALLS) { const t = JSON.stringify(lines.maps[`${h}_hall_int`] || {}); assert.ok(!BANNED.test(t), `${h}: ${t.match(BANNED)?.[0]}`); }
  assert.ok(!BANNED.test(JSON.stringify(lines.system_halls)));
});

// ---- Revival Heights prism relay (Gary Oct 29 2026: restored in place of the light gates) ----------------------------
test('revival prism relay: door shut at the start, all 4 prisms needed, beam reaches the receiver only when solved', () => {
  const m = mapJson('revival'), h = m.hall_v2, g = new HallV2(h.grid, trainers(m).map((n) => [n.x, n.y]), h.prism);
  assert.ok(!/[abT]/.test(h.grid.join('')), 'no light gates / plates left in Revival');
  assert.equal(h.prism.prisms.length, 4); assert.equal(g.beamOpen(0), false);
  const [[lx, ly]] = h.prism.door; assert.equal(h.grid[ly][lx], 'L'); assert.equal(g.open(lx, ly, 0), false);
  let b = 0; for (const [i, want] of [[0, 2], [1, 1], [2, 0], [3, 1]]) { const pr = h.prism.prisms[i]; while (g.facing(i, b) !== want) b = g.turn(...pr.at, b); }
  assert.equal(g.beamOpen(b), true); assert.equal(g.open(lx, ly, b), true);
  for (let i = 0; i < 4; i++) { const pr = h.prism.prisms[i]; let bb = g.turn(...pr.at, b); assert.equal(g.beamOpen(bb), false, `prism ${i} matters`); }
  const turned = new Set(), [sx, sy] = h.door; let x = sx, y = sy, s = 0;
  for (const mv of h.solution_moves.match(/A?[UDLR]/g)) { const d = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] }[mv.at(-1)];
    if (mv[0] === 'A') { turned.add(`${x + d[0]},${y + d[1]}`); s = g.turn(x + d[0], y + d[1], s); } else { const r = g.enter(x + d[0], y + d[1], s, mv); x = r.x; y = r.y; s = r.b; } }
  assert.equal(turned.size, 4, 'the shortest walk turns every prism'); assert.deepEqual([x, y], h.dais_front);
});
test('revival prism relay: grid fit - prisms / emitter / receiver / crate solid, one-square gaps walkable, NPCs off beam cells', () => {
  const m = mapJson('revival'), h = m.hall_v2, col = m.layers.collision, g = new HallV2(h.grid, [], h.prism);
  for (let y = 0; y < h.grid.length; y++) for (let x = 0; x < h.grid[y].length; x++) {
    const c = h.grid[y][x];
    if ('PEr'.includes(c)) assert.ok(col[y][x] > 0, `${c} at ${x},${y} must be solid`);
    if (c === '.') assert.equal(col[y][x], 0, `floor ${x},${y} blocked (furniture on a walk cell)`);
  }
  for (const pr of h.prism.prisms) assert.ok([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => g.open(pr.at[0] + dx, pr.at[1] + dy, 0)), 'a prism you can stand next to');
  let b = 0; for (const [i, want] of [[0, 2], [1, 1], [2, 0], [3, 1]]) while (g.facing(i, b) !== want) b = g.turn(...h.prism.prisms[i].at, b);
  const cells = new Set(); for (const [x0, y0, x1, y1] of g.beam(b).segs) for (let t = 0; t <= Math.abs(x1 - x0) + Math.abs(y1 - y0); t++) cells.add(`${x0 + Math.sign(x1 - x0) * t},${y0 + Math.sign(y1 - y0) * t}`);
  for (const n of m.npcs) assert.ok(!cells.has(`${n.x},${n.y}`), `${n.id} stands in the beam`);
});
test('revival prism relay runtime: A on a prism turns it, the door opens on the 12th right turn, beam draws', async () => {
  const m = mapJson('revival'), h = m.hall_v2, f = fakeScene('revival'), hv = f.sc.pg?.hallV2 || f.hv;
  assert.ok(hv?.turnPrism, 'hall v2 runtime exposes turnPrism');
  const [[lx, ly]] = h.prism.door; assert.ok(f.sc.map.layers.collision[ly][lx] > 0);
  let r; for (const [i, n] of [[0, 3], [1, 3], [2, 3], [3, 2]]) for (let k = 0; k < n; k++) r = hv.turnPrism(...h.prism.prisms[i].at);
  assert.equal(r.open, true); assert.equal(f.sc.map.layers.collision[ly][lx], 0);
  const calls = []; const ctx = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? (...a) => calls.push(k) : undefined), set: () => true });
  hv.drawBeam(ctx, { zoom: 1, cam: { x: 0, y: 0 }, ms: 0 }); assert.ok(calls.filter((k) => k === 'lineTo').length >= 5, 'beam segments drawn');
});

test('hall art (Character models): 13 trainers off the stand-ins, push/warp cells on hall_art tiles, Text Bot names', () => {
  const smap = J('art/characters/pixel/npcs/npc_sprite_map.json').map;
  const art = J('art/world/overworld/tileset_hallart.json').tiles;
  assert.equal(art.length, 32); assert.ok(art.every((t) => t.collision_code === 0 && t.id >= 9981));
  const T = J('text/overworld_lines.json').maps; let n = 0; const ids = [];
  for (const [k, e] of Object.entries(smap)) {
    if (!/_hall_int_h\d+$/.test(k) || !e.sprite_id?.startsWith('tr_') || !e.sprite_id.includes('_hall_int_h')) continue;
    n++; ids.push(e.sprite_id); assert.ok(fs.existsSync(`art/characters/pixel/${e.overworld_sheet}`), k); assert.ok(fs.existsSync(`art/characters/pixel/${e.trainer_64x128}`), k);
    const [hm, id] = k.split('.'), te = T[hm]?.[id] || Object.values(T).find((mp) => mp?.[id]?.name)?.[id]; // Lanternport helpers h1-h10 now live under lanternport_lighthouse_int/f2/f3
    assert.ok(te?.name && !te.placeholder, k);
  }
  assert.equal(new Set(ids).size, 13);
  const PUSH = { '^': 'up', v: 'down', '<': 'left', '>': 'right' };
  for (const hm of ['cindervale_hall_int', 'mirefen_hall_int', 'lanternport_lighthouse_f2']) {
    const m = J(`art/world/overworld/maps/${hm}.json`), g = m.hall_v2.grid;
    g.forEach((row, y) => [...row].forEach((c, x) => {
      const t = byId.get(m.layers.ground[y][x]);
      if (PUSH[c]) assert.match(t?.name ?? '', new RegExp(`^ha_push_${PUSH[c]}__`), `${hm} ${x},${y}`);
      if (m.hall_v2.warps?.[c]) assert.match(t?.name ?? '', /^ha_warp_pad_[1-4]__/, `${hm} ${x},${y}`);
      if (PUSH[c] || m.hall_v2.warps?.[c]) assert.equal(m.layers.collision[y][x], 0);
    }));
  }
});

// ---- Lanternport lighthouse (Gary Oct 29 2026): hall 7 = 4 floor maps joined by stairs; 1F-3F 1-2 trainers each (6), 4F lamp room
const LH = ['lanternport_lighthouse_int', 'lanternport_lighthouse_f2', 'lanternport_lighthouse_f3', 'lanternport_hall_int'];
const lhMap = (n) => J(`art/world/overworld/maps/${n}.json`);
function fakeSceneFor(json, { flags = [], seen = {}, counters = {} } = {}) {
  const map = new GameMap(json); map.attachTileset(byId);
  const out = { said: [], battles: [] };
  const sc = {
    map, flags: new Set(flags), seen, counters, lines, out, ms: 0, rustles: new Map(), busy: false,
    player: { x: json.hall_v2.arrival[0], y: json.hall_v2.arrival[1], facing: 'up', locked: false },
    systems: { wallet: { coins: 1000, spend() { return true; }, add(n) { return n; } }, onTrainerLoss: async () => true },
    npcs: { byId: () => null, beginTalk() {}, endTalk() {}, walkTo() {} }, setFlag(f) { this.flags.add(f); },
    script: async (fn) => fn(), say: async (p) => { out.said.push(p.join(' ')); }, ask: async () => 0, speakerFor: () => null,
    _entryFor: (mn, d) => lines.maps?.[mn]?.[d.id] || {}, lockSave: () => () => {},
    hooks: { onBattle: async (who) => { out.battles.push(who); seen[`defeated:${who.map}.${who.id}`] = true; return true; } },
    worldApi: () => ({ onArrive: () => undefined, onStepStart: () => undefined }),
  };
  sc.talk = async (nn, def) => { if (seen[`defeated:${map.name}.${def.id}`]) { out.said.push('after'); return; } await sc.hooks.onBattle({ map: map.name, id: def.id }); };
  const store = { masters: {}, puzzles: {} }, hv = HV.attachHallV2(sc, null, { store });
  return { sc, hv, out, m: json, store };
}
test('lighthouse: 4 floors, stairs warps pair up, 1-2 trainers on 1F-3F (6 total), Master only on 4F, members list = the placed trainers', () => {
  const ms = LH.map(lhMap), all = [];
  ms.forEach((m, i) => {
    assert.equal(m.hall_v2.floor, i + 1); assert.deepEqual(m.hall_v2.floors, LH); assert.equal(m.hall_v2.need_wins, 4);
    const tr = trainers(m); if (i < 3) assert.ok(tr.length >= 1 && tr.length <= 2, m.name); else assert.equal(tr.length, 0);
    assert.equal(m.npcs.filter((n) => n.kind === 'master').length, i === 3 ? 1 : 0);
    all.push(...tr.map((t) => `${m.name}.${t.id}`));
    for (const w of m.warps) {
      const to = LH.includes(w.to) ? lhMap(w.to) : null; if (!to) { assert.equal(w.to, 'lanternport'); continue; }
      assert.equal(to.layers.collision[w.ty][w.tx], 0, `${m.name} -> ${w.to} lands on a walkable cell`);
      assert.ok(to.warps.some((b) => b.to === m.name && Math.abs(b.x - w.tx) + Math.abs(b.y - w.ty) <= 2), `${w.to} has stairs back by the landing`);
      assert.equal(m.layers.collision[w.y][w.x], 4, 'stairs are door cells');
    }
  });
  assert.equal(all.length, 6);
  for (const m of ms) assert.deepEqual(m.hall_v2.members, all);
  const town = lhMap('lanternport').warps.find((w) => w.to === 'lanternport_lighthouse_int');
  assert.ok(town); assert.deepEqual([town.tx, town.ty], ms[0].hall_v2.arrival);
  assert.ok(!lhMap('lanternport').warps.some((w) => w.to === 'lanternport_hall_int'), 'town no longer opens the lamp room directly');
  const M = J('data/masters.json').halls.find((h) => h.zone === 'lanternport');
  assert.deepEqual(M.floor_maps, LH.slice(0, 3)); assert.equal(M.hall_map, 'lanternport_hall_int');
  assert.deepEqual(M.trainers.map((t, i) => (t.dropped ? i + 1 : 0)).filter(Boolean), [3, 4, 5, 6]);
});
for (const n of LH) {
  test(`lighthouse ${n}: solver - no softlocks, stored solution, walk that battles every trainer on the floor; grid-fit`, () => {
    const m = lhMap(n), r = hallV2FromMap(m), c = r.hall.check();
    assert.equal(c.softlocks, 0); assert.equal(c.moves, m.hall_v2.solution_moves);
    if (r.trainers.length) assert.ok(r.hall.battles(r.rays, r.trainers.length, r.trainers.length, 200000));
    const g = m.hall_v2.grid; assert.equal(g.length, m.height); assert.ok(g.every((row) => row.length === m.width));
    for (const k of Object.keys(m.layers)) { assert.equal(m.layers[k].length, m.height, k); assert.ok(m.layers[k].every((row) => row.length === m.width), k); }
    g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') assert.notEqual(m.layers.collision[y][x], 0, `${n} wall ${x},${y} walkable`); }));
    for (const nn of m.npcs) assert.ok(!/[abcdTU1-6\^v<>i#SG]/.test(g[nn.y][nn.x]), `${nn.id} on ${g[nn.y][nn.x]}`);
    if (m.hall_v2.floor === 2 || m.hall_v2.floor === 3) { // a stair gate: not reachable without the plate
      const gt = new HallV2(g, trainers(m).map((t) => [t.x, t.y])), [sx, sy] = m.hall_v2.arrival, [ux, uy] = m.hall_v2.stairs_up, seen = new Set([`${sx},${sy}`]), q = [[sx, sy]];
      while (q.length) { const [x, y] = q.shift(); for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + ax, ny = y + ay; if (seen.has(`${nx},${ny}`) || /[TU1-6\^v<>i]/.test(gt.at(nx, ny)) || !gt.open(nx, ny, 0)) continue; seen.add(`${nx},${ny}`); q.push([nx, ny]); } }
      assert.ok(!seen.has(`${ux},${uy}`), 'stairs up reachable without the floor puzzle');
    }
  });
}
test('lighthouse: wins count across floors; Master opens after any 4 (puzzle flag from the lamp-room dais), not 3', async () => {
  const ms = LH.map(lhMap), all = ms[0].hall_v2.members, top = ms[3], mid = top.npcs.find((n) => n.kind === 'master');
  const seen3 = Object.fromEntries(all.slice(0, 3).map((k) => [`defeated:${k}`, true]));
  let f = fakeSceneFor(top, { seen: { ...seen3 }, flags: [HV.puzzleFlag(top)] }); await f.sc.talk(null, mid); assert.equal(f.out.battles.length, 0);
  const seen4 = Object.fromEntries([all[0], all[2], all[4], all[5]].map((k) => [`defeated:${k}`, true])); // any 4: 1F, 2F, 3F x2
  f = fakeSceneFor(top, { seen: { ...seen4 } }); await f.sc.talk(null, mid); assert.equal(f.out.battles.length, 0, 'no puzzle flag yet');
  const [dx, dy] = top.hall_v2.dais_front; f.hv.arrive(dx, dy, { facing: 'up', _attempt() {}, place() {} }, f.sc.worldApi()); assert.ok(f.sc.flags.has(HV.puzzleFlag(top)));
  await f.sc.talk(null, mid); assert.equal(f.out.battles.length, 1); assert.equal(f.sc.counters.hall_lanternport_wins, 4);
  const g = fakeSceneFor(ms[1], { seen: { ...seen4 } }); assert.equal(HV.hallWins(g.sc.seen, ms[1]), 4); // counted on another floor too
  assert.equal(HV.bitsKey(ms[1]), 'v2_lanternport_lighthouse_f2'); assert.notEqual(HV.bitsKey(ms[1]), HV.bitsKey(ms[2]));
});
test('lighthouse: after the Master (4F record) trainers on every floor go quiet: no sight battles, after line only', async () => {
  for (const n of LH.slice(0, 3)) {
    const m = lhMap(n), f = fakeSceneFor(m, { seen: { [`defeated:${m.hall_v2.master_ref}`]: true } });
    for (const t of trainers(m)) { assert.equal(f.sc.hallQuiet({ def: t }), true); await f.sc.talk(null, t); }
    assert.equal(f.out.battles.length, 0);
    const g = fakeSceneFor(m); assert.equal(g.sc.hallQuiet({ def: trainers(m)[0] }), false);
    let hit = 0; const map = new GameMap(m); map.attachTileset(byId);
    for (const t of trainers(m)) { const cell = (t.sight_cells || []).find(([x, y]) => !map.npcAt(x, y)); /* h9 cell = 3F plate */ if (cell && findSpotter(map, [{ def: t, x: t.x, y: t.y }], cell[0], cell[1], () => false)) hit++; }
    assert.equal(hit, trainers(m).length, `${n}: every trainer spots its sight cells`);
  }
});
test('lighthouse: every placed trainer has its Text Bot lines, sprite and GD team on its floor map', async () => {
  const { teamFor } = await import(path.join(root, 'src/progression/masters.js'));
  const M = J('data/masters.json'), smap = J('art/characters/pixel/npcs/npc_sprite_map.json').map;
  for (const n of LH.slice(0, 3)) for (const t of trainers(lhMap(n))) {
    assert.ok(lines.maps[n]?.[t.id]?.name, `${n}.${t.id} text`); assert.ok(smap[`${n}.${t.id}`]?.sprite_id, `${n}.${t.id} sprite`);
    assert.ok(teamFor(M, n, t.id)?.foes?.length, `${n}.${t.id} team`);
  }
  assert.ok(teamFor(M, 'lanternport_hall_int', 'lanternport_hall_int_master')?.foes?.length);
});
