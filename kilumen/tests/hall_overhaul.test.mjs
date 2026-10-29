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

const HALLS = ['fernwick', 'mirefen', 'saltmere', 'tidewater', 'frostspire', 'lanternport', 'revival', 'cindervale'];
const COUNT = { fernwick: 3, saltmere: 4, revival: 5, mirefen: 7, tidewater: 8, lanternport: 10, cindervale: 12, frostspire: 6 };
const byId = new Map();
for (const f of ['tileset.json', 'tileset_ix2.json', 'tileset_hallanim.json']) for (const t of J(`art/world/overworld/${f}`).tiles) byId.set(t.id, t);
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
    const m = mapJson(h), g = new HallV2(m.hall_v2.grid, trainers(m).map((n) => [n.x, n.y]));
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
  for (const h of HALLS) { const t = JSON.stringify(lines.maps[`${h}_hall_int`] || {}); assert.ok(!BANNED.test(t), `${h}: ${t.match(BANNED)?.[0]}`); }
  assert.ok(!BANNED.test(JSON.stringify(lines.system_halls)));
});
