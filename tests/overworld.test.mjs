// Headless logic tests for the overworld (no browser): node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Col, TILE, BASE_TICKS_PER_TILE, TURN_TICKS, MoveMode, ANIM } from '../src/overworld/constants.js';
import { GameMap, exitSpawn, warpSpawn, isToCome } from '../src/overworld/map.js';
import { GridMover } from '../src/overworld/movement.js';
import { cameraFor, pickZoom } from '../src/overworld/camera.js';
import { indexTileset, tilesetFileForZoom } from '../src/overworld/tileset.js';
import { tileFrame } from '../src/overworld/renderer.js';
import { padOf } from './_pad.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIT = path.join(ROOT, 'art/world/overworld');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const layout = readJson(path.join(KIT, 'world_layout.json'));
const TS = indexTileset(readJson(path.join(KIT, 'tileset.json')));
const loadMap = (n) => new GameMap(readJson(path.join(KIT, 'maps', n + '.json'))).attachTileset(TS.byId);
const MAPS = Object.fromEntries(layout.maps_built.map((n) => [n, loadMap(n)]));

test('collision codes in tileset.json match the engine constants', () => {
  assert.deepEqual(TS.codes, { walk: Col.WALK, block: Col.BLOCK, ledge_s: Col.LEDGE_S, water: Col.WATER, door: Col.DOOR, boulder: Col.BOULDER, gate: Col.GATE, plate: Col.PLATE, bike_only: Col.BIKE_ONLY, ramp: Col.RAMP, ice: Col.ICE, deep_water: Col.DEEP_WATER });
});

test('1x/2x/3x tilesets share ids and indices; tile sizes 64/128/192; sheets are whole tiles', () => {
  for (const [z, f] of [[1, 'tileset.json'], [2, 'tileset_2x.json'], [3, 'tileset_3x.json']]) {
    assert.equal(tilesetFileForZoom('../tileset.json', z), '../' + f);
    const t = readJson(path.join(KIT, f));
    assert.equal(t.tile_size, 64 * z, f);
    assert.equal(t.tiles.length, TS.meta.tiles.length);
    t.tiles.forEach((x, i) => { assert.equal(x.id, TS.meta.tiles[i].id); assert.equal(x.index, TS.meta.tiles[i].index); });
    for (const p of new Set(t.tiles.map((x) => x.sheet))) {
      const buf = fs.readFileSync(path.join(KIT, p));
      const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
      assert.equal(w % t.tile_size, 0, p); assert.equal(h % t.tile_size, 0, p);
      assert.equal(w / t.tile_size, 16, p + ' has 16 columns');
    }
  }
  assert.equal(tilesetFileForZoom('../tileset.json', 4), '../tileset.json');
});

test('every map loads, layers are WxH, every tile id exists in the tileset', () => {
  for (const m of Object.values(MAPS)) {
    for (const layer of ['ground', 'decoration', 'overlay'])
      for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) {
        const id = m.tile(layer, x, y);
        if (id) assert.ok(TS.byId.has(id), `${m.name} ${layer} ${x},${y} id ${id}`);
      }
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++)
      assert.ok(Object.values(Col).includes(m.code(x, y)), `${m.name} ${x},${y} unknown code ${m.code(x, y)}`);
  }
});

test('every door warp lands on a walkable tile of a built map; $return spots are walkable', () => {
  let n = 0;
  for (const m of Object.values(MAPS)) for (const w of m.warps) {
    assert.equal(m.code(w.x, w.y), Col.DOOR, `${m.name} warp ${w.x},${w.y} sits on code 4`);
    if (w.to === '$return') continue;
    const t = MAPS[w.to];
    assert.ok(t, `${m.name} -> ${w.to} exists`);
    assert.ok(t.isWalkable(w.tx, w.ty), `${m.name} -> ${w.to} ${w.tx},${w.ty} walkable`);
    assert.equal(t.warpAt(w.tx, w.ty), null, `${m.name} -> ${w.to} does not land on another warp (no loop)`);
    if (MAPS[w.to].warps.some((r) => r.to === '$return')) {
      const s = warpSpawn({ to: '$return' }, { map: m.name, x: w.x, y: w.y });
      assert.ok(m.isWalkable(s.x, s.y), `$return below ${m.name} ${w.x},${w.y}`);
      assert.equal(s.facing, 'down');
    }
    n++;
  }
  assert.ok(n >= 20, 'checked ' + n + ' warps');
  assert.equal(warpSpawn({ to: '$return' }, null), null);
});

test('every built edge exit lands walkable on the target and has a matching way back', () => {
  let n = 0;
  for (const m of Object.values(MAPS)) for (const e of m.exits) {
    if (isToCome(e)) { assert.ok(!MAPS[e.to], `${m.name} TO COME exit to ${e.to} is really unbuilt`); continue; }
    const t = MAPS[e.to];
    assert.ok(t, `${m.name} exit -> ${e.to}`);
    for (let i = e.start; i <= e.end; i++) {
      const [fx, fy] = e.edge === 'north' ? [i, 0] : e.edge === 'south' ? [i, m.height - 1] : e.edge === 'west' ? [0, i] : [m.width - 1, i];
      assert.ok(m.isWalkable(fx, fy), `${m.name} edge tile ${fx},${fy}`);
      const dir = { north: 'up', south: 'down', west: 'left', east: 'right' }[e.edge];
      assert.equal(m.query(fx, fy, dir).type, 'edge');
      assert.equal(m.exitFor(fx, fy, dir), e);
      const s = exitSpawn(e, fx, fy, t);
      assert.ok(t.isWalkable(s.x, s.y), `${m.name} -> ${e.to} lands ${s.x},${s.y}`);
      const back = { up: 'down', down: 'up', left: 'right', right: 'left' }[s.facing];
      const be = t.exitFor(s.x, s.y, back);
      assert.ok(be && be.to === m.name, `${e.to} ${s.x},${s.y} has an exit back to ${m.name}`);
      const r = exitSpawn(be, s.x, s.y, m);
      assert.deepEqual([r.x, r.y], [fx, fy], 'round trip returns to the same edge tile');
      n++;
    }
  }
  assert.ok(n >= 8, 'checked ' + n + ' exit tiles');
});

test('ledges: south hop lands on the tile below; any other direction is blocked', () => {
  let n = 0;
  for (const m of Object.values(MAPS)) for (let y = 1; y < m.height; y++) for (let x = 0; x < m.width; x++) {
    if (m.code(x, y) !== Col.LEDGE_S || !m.isWalkable(x, y - 1)) continue;
    const q = m.query(x, y - 1, 'down');
    if (m.isWalkable(x, y + 1)) { assert.deepEqual([q.type, q.x, q.y], ['ledge', x, y + 1], `${m.name} ${x},${y}`); n++; }
    else assert.equal(q.type, 'block');
    if (m.isWalkable(x, y + 1)) assert.equal(m.query(x, y + 1, 'up').type, 'block', 'cannot climb a ledge');
  }
  assert.ok(n > 0, 'found hoppable ledges: ' + n);
});

// --- mover on a tiny synthetic map --------------------------------------------------------------
// . = walk, # = block, L = ledge, D = door
function mini(rows) {
  const col = rows.map((r) => [...r].map((c) => ({ '.': 0, '#': 1, L: 2, D: 4, '~': 3, B: 8 })[c]));
  const H = rows.length, W = rows[0].length, z = () => Array.from({ length: H }, () => Array(W).fill(0));
  return new GameMap({ name: 'mini', width: W, height: H, layers: { ground: z(), decoration: z(), overlay: z(), collision: col, encounter: z() } });
}
const run = (mv, m, dir, ticks, extra = {}) => { const all = []; for (let i = 0; i < ticks; i++) all.push(...mv.tick({ dir }, { query: (x, y, d, mode) => m.query(x, y, d, mode), ...extra })); return all; };

test('mover: a tap turns in place, a hold walks one tile in 15 ticks (250 ms) at whole pixels', () => {
  const m = mini(['.....', '.....', '.....']);
  const mv = new GridMover({ x: 2, y: 1, facing: 'down' });
  run(mv, m, 'left', 2); run(mv, m, null, 5);
  assert.deepEqual([mv.x, mv.y, mv.facing, mv.state], [2, 1, 'left', 'idle'], 'tap = turn only');
  const ev = run(mv, m, 'left', 1);
  assert.equal(ev[0].type, 'stepStart', 'already facing: walks at once');
  const xs = [];
  for (let i = 0; i < BASE_TICKS_PER_TILE.walk; i++) { xs.push(mv.pixel().px); run(mv, m, null, 1); }
  assert.deepEqual([mv.x, mv.state], [1, 'idle']);
  xs.forEach((px, i) => { assert.ok(Number.isInteger(px)); if (i) assert.ok([4, 5].includes(xs[i - 1] - px), 'whole 4-5 native px per tick'); });
  assert.equal(Math.round(BASE_TICKS_PER_TILE.walk * (1000 / 60)), 250, 'walk = 4 tiles/s');
});

test('mover: holding a new direction turns, then walks after the turn delay', () => {
  const m = mini(['.....', '.....', '.....']);
  const mv = new GridMover({ x: 2, y: 1, facing: 'down' });
  const ev = run(mv, m, 'right', TURN_TICKS + 1);
  assert.equal(ev[0].type, 'turn');
  assert.ok(ev.some((e) => e.type === 'stepStart'), 'walks once the hold passes the turn delay');
});

test('mover: continuous walking and turning while moving have no pause', () => {
  const m = mini(['......', '......', '......']);
  const mv = new GridMover({ x: 0, y: 0, facing: 'right' });
  run(mv, m, 'right', 1 + 15 * 2);
  assert.equal(mv.x, 2); assert.equal(mv.state, 'step');
  const ev = run(mv, m, 'down', 15);
  assert.ok(ev.some((e) => e.type === 'stepStart' && e.dir === 'down'), 'turned into the next step with no turn state');
  assert.ok(!ev.some((e) => e.type === 'turn'));
});

test('mover: walking into a wall bumps without moving, repeating while held', () => {
  const m = mini(['.#.', '...']);
  const mv = new GridMover({ x: 0, y: 0, facing: 'right' });
  const bumps = [];
  const ev = run(mv, m, 'right', 60, { onBump: () => bumps.push(1) });
  assert.deepEqual([mv.x, mv.y], [0, 0]);
  assert.ok(ev.filter((e) => e.type === 'bump').length >= 2 && bumps.length >= 2);
  assert.ok(new GridMover({ x: 0, y: 0, facing: 'up' }).tick({ dir: 'up' }, { query: (x, y, d) => m.query(x, y, d) }).some((e) => e.type === 'bump'), 'map edge without exit = bump');
});

test('mover: ledge hop is one-way south and lands 2 tiles down with an arc', () => {
  const m = mini(['...', 'LLL', '...']);
  const mv = new GridMover({ x: 1, y: 0, facing: 'down' });
  const ev = run(mv, m, 'down', 1);
  assert.equal(ev[0].type, 'hop');
  let maxLift = 0;
  for (let i = 0; i < 40 && mv.state === 'hop'; i++) { maxLift = Math.max(maxLift, mv.pixel().lift); run(mv, m, null, 1); }
  assert.deepEqual([mv.x, mv.y], [1, 2]);
  assert.ok(maxLift >= 12);
  const back = run(mv, m, 'up', TURN_TICKS + 3); // turn first (tap rule), then bump
  assert.ok(back.some((e) => e.type === 'bump') && mv.y === 2, 'cannot go back up');
});

test('mover hooks: speed multiplier and movement-mode enum change the step length; lock ignores input', () => {
  const m = mini(['........']);
  const mv = new GridMover({ x: 0, y: 0, facing: 'right' });
  mv.speedMultiplier = 2;
  run(mv, m, 'right', 1); assert.equal(mv.dur, 8);
  assert.deepEqual(Object.values(MoveMode), ['walk', 'run', 'bike']);
  const mv2 = new GridMover({ x: 0, y: 0, facing: 'right' }); mv2.locked = true;
  run(mv2, m, 'right', 30); assert.equal(mv2.x, 0);
});

test('mover: arriving on a door hands control to the scene (warp) and stops', () => {
  const m = mini(['.D.']);
  const mv = new GridMover({ x: 0, y: 0, facing: 'right' });
  let arrived = null;
  const ev = run(mv, m, 'right', 40, { onArrive: (x, y, who) => { arrived = [x, y]; who.locked = true; return 'stop'; } }); // the scene locks during the fade
  assert.deepEqual(arrived, [1, 0]);
  assert.ok(ev.some((e) => e.type === 'stopped'));
  assert.equal(mv.x, 1);
});

test('camera: integer, centred on the player, clamped to the map, small maps centred on black', () => {
  for (const [vw, vh] of [[960, 540], [2560 / 3, 480]]) {
    for (let fx = 0; fx < 34 * 64; fx += 7) {
      const c = cameraFor(fx, 300, 34, 26, vw, vh);
      assert.ok(Number.isInteger(c.x) && Number.isInteger(c.y));
      assert.ok(c.x >= 0 && c.x <= 34 * 64 - vw);
    }
  }
  const small = cameraFor(300, 300, 11, 9, 960, 540);
  assert.equal(small.x, Math.round((11 * 64 - 960) / 2));
  assert.ok(small.x < 0);
  assert.equal(cameraFor(17 * 64, 13 * 64, 34, 26, 960, 540).x, 17 * 64 - 480);
});

test('zoom table: 1080p x2, 1440p x3, 720p x2, 2160p x4', () => {
  assert.deepEqual([1080, 1440, 720, 2160, 480].map(pickZoom), [2, 3, 2, 4, 1]);
});

test('tile animation: water loops; tall grass idles and rustles once on enter', () => {
  const water = [...TS.byId.values()].find((t) => t.name === 'water');
  assert.equal(tileFrame(water, 0), water.animation.frames[0]);
  assert.equal(tileFrame(water, 220 * 5), water.animation.frames[1]);
  const grass = [...TS.byId.values()].find((t) => t.animation?.type === 'rustle');
  assert.equal(tileFrame(grass, 5000), grass.animation.idle_frame);
  assert.equal(tileFrame(grass, 1000, 1000), grass.animation.frames[0]);
  assert.equal(tileFrame(grass, 1000 + 90 * 3, 1000), grass.animation.idle_frame);
});

// --- MOVEMENT.md: run + bike ---------------------------------------------------------------------
const stepTicks = (mv, m, dir, steps) => { const d = []; let t = 0, last = mv.x + mv.y * 1000;
  for (let i = 0; i < 400 && d.length < steps; i++) { run(mv, m, dir, 1); t++; const now = mv.x + mv.y * 1000; if (now !== last) { d.push(t); t = 0; last = now; } }
  return d; };

test('run: 8 tiles/s (125 ms avg: 8/7 alternating ticks), run sheet frames by distance; bike: 12 tiles/s (5 ticks)', () => {
  const m = mini(['....................']);
  const mv = new GridMover({ x: 0, y: 0, facing: 'right' }); mv.mode = MoveMode.RUN;
  const d = stepTicks(mv, m, 'right', 4);
  assert.equal(d[1] + d[2], 15, 'two run steps = 250 ms (= one walk step): ' + d);
  assert.equal(d[2] + d[3], 15, 'alternating 8/7: ' + d);
  const cols = new Set(); for (let i = 0; i < 30; i++) { run(mv, m, 'right', 1); if (mv.moving) cols.add(mv.frame().col); }
  assert.equal(mv.frame().anim, 'run'); assert.ok(cols.size >= 5, 'run frames cycle: ' + [...cols]);
  run(mv, m, null, 20); assert.deepEqual(mv.frame(), { anim: 'walk', col: 0 }, 'stopping returns to walk stand'); assert.equal(mv.dist, 0);
  const b = new GridMover({ x: 0, y: 0, facing: 'right' }); b.mode = MoveMode.BIKE;
  assert.deepEqual(stepTicks(b, m, 'right', 3).slice(1), [5, 5], '83 ms per tile');
  run(b, m, null, 10); assert.deepEqual(b.frame(), { anim: 'bike', col: 0 }, 'bike_stand when idle on the bike');
});

test('walk frames follow distance (32 px/frame) and reset only on stop', () => {
  const m = mini(['..........']);
  const mv = new GridMover({ x: 0, y: 0, facing: 'right' });
  run(mv, m, 'right', 1); // step starts, dist 0 -> walk0
  const seen = []; for (let i = 0; i < 45; i++) { run(mv, m, 'right', 1); seen.push(mv.frameCol()); }
  assert.deepEqual([...new Set(seen)], [1, 2, 3, 4], 'walk0..walk3 in order over two tiles');
  assert.equal(Math.floor(mv.dist / ANIM.walk.pxPerFrame) % 4 + 1, mv.frameCol());
});

test('bike_only (8): wall on foot and running, floor on the bike; ramp (9): one-way 2-tile hop on the bike only', () => {
  const m = mini(['.BB.']);
  assert.equal(m.query(0, 0, 'right', 'walk').type, 'block');
  assert.equal(m.query(0, 0, 'right', 'run').type, 'block');
  assert.deepEqual(m.query(0, 0, 'right', 'bike'), { type: 'walk', x: 1, y: 0 });
  const tw = MAPS.thornwood; // MOVEMENT.md: ramp_e at (15,14), pocket x16-19 y13-16 (unpadded; + thornwood padding)
  const { dx: X, dy: Y } = padOf('thornwood');
  assert.equal(tw.code(15 + X, 14 + Y), Col.RAMP); assert.equal(tw.rampDir(15 + X, 14 + Y), 'right');
  const q = tw.query(14 + X, 14 + Y, 'right', 'bike');
  assert.deepEqual([q.type, q.x, q.y], ['ramp', 16 + X, 14 + Y]);
  assert.equal(tw.query(14 + X, 14 + Y, 'right', 'walk').type, 'block');
  assert.equal(tw.query(16 + X, 14 + Y, 'left', 'bike').type, 'block', 'one-way: no jumping back up the ramp');
  const mv = new GridMover({ x: 14 + X, y: 14 + Y, facing: 'right' }); mv.mode = MoveMode.BIKE;
  let ticks = 0, maxLift = 0; run(mv, tw, 'right', 1);
  assert.equal(mv.state, 'hop'); assert.equal(mv.frame().col, 2, 'holds bike1');
  while (mv.state === 'hop' && ticks < 40) { maxLift = Math.max(maxLift, mv.pixel().lift); run(mv, tw, null, 1); ticks++; }
  assert.deepEqual([mv.x, mv.y], [16 + X, 14 + Y]); assert.equal(ticks, 10, '2 x 83 ms'); assert.equal(maxLift, 6);
});

test('every no_dismount cell is bike-passable and the bike pockets have a bike exit (no stranding)', () => {
  let n = 0;
  for (const m of Object.values(MAPS)) {
    if (!m.bike) continue;
    assert.equal(m.movement.bike, true, m.name);
    const cells = [...m._noDismount].map((k) => k.split(',').map(Number));
    for (const [x, y] of cells) { assert.ok(m.passable(x, y, 'bike'), `${m.name} ${x},${y}`); n++; }
    // flood fill on the bike from each pocket cell must reach a cell where you may dismount
    for (const [sx, sy] of cells) {
      const seen = new Set([sx + ',' + sy]), q = [[sx, sy]]; let ok = false;
      while (q.length && !ok) { const [x, y] = q.shift();
        for (const d of ['up', 'down', 'left', 'right']) { const r = m.query(x, y, d, 'bike'); if (r.type === 'walk' || r.type === 'ramp' || r.type === 'ledge') {
          const k = r.x + ',' + r.y; if (seen.has(k)) continue; seen.add(k);
          if (!m.noDismount(r.x, r.y) && m.code(r.x, r.y) !== Col.BIKE_ONLY) { ok = true; break; } q.push([r.x, r.y]); } } }
      assert.ok(ok, `${m.name} ${sx},${sy} can ride out`);
    }
  }
  assert.ok(n >= 20, 'checked ' + n);
  for (const m of Object.values(MAPS)) if (/^house_|_int/.test(m.name) || /^greystone/.test(m.name)) assert.equal(m.movement.bike, false, m.name + ' no bike');
});

// --- CRITICAL_PATH.md: story gates + NPCs ------------------------------------------------------------
test('story gates ship blocked, clear when their flag is set (decoration + collision swap), idempotent, per instance', () => {
  const bh = loadMap('brookhollow'), r1 = loadMap('route1');
  const B = padOf('brookhollow'), R1 = padOf('route1'); // unpadded coords + padding
  assert.equal(bh.code(32 + B.dx, 12 + B.dy), Col.BLOCK);
  const q = bh.query(31 + B.dx, 12 + B.dy, 'right');
  assert.equal(q.type, 'block'); assert.equal(q.gate?.id, 'gate_brookhollow_east');
  assert.deepEqual(bh.applyGates(new Set(['has_bike'])), [], 'unrelated flag clears nothing');
  assert.deepEqual(bh.applyGates(new Set(['beat_master_fernwick'])), ['gate_brookhollow_east']);
  assert.deepEqual([bh.code(32 + B.dx, 12 + B.dy), bh.code(32 + B.dx, 13 + B.dy), bh.tile('decoration', 32 + B.dx, 12 + B.dy)], [0, 0, 0]);
  assert.equal(bh.query(31 + B.dx, 12 + B.dy, 'right').type, 'walk');
  assert.deepEqual(bh.applyGates(new Set(['beat_master_fernwick'])), [], 'idempotent');
  r1.applyGates(new Set(['beat_master_frostspire']));
  const dim = [...TS.byId.values()].find((t) => t.name === 'crystal_barrier_dim');
  assert.deepEqual([r1.tile('decoration', 41 + R1.dx, 4 + R1.dy), r1.code(41 + R1.dx, 4 + R1.dy)], [dim.id, dim.collision_code]);
  assert.equal(MAPS.brookhollow.code(32 + B.dx, 12 + B.dy), Col.BLOCK, 'other instances untouched');
  for (const m of Object.values(MAPS)) for (const g of m.storyGates) {
    for (const c of g.cells) assert.notEqual(m.code(c.x, c.y), Col.WALK, `${g.id} ${c.x},${c.y} ships blocked`);
    assert.ok(layout.progression_flags ? JSON.stringify(layout.progression_flags).includes(g.flag) : true, g.flag + ' is a known flag');
  }
});

test('NPCs are solid; the gate guard is an NPC on the gate map', () => {
  const bh = MAPS.brookhollow;
  const g = bh.storyGates.find((x) => x.id === 'gate_brookhollow_east');
  assert.ok(bh.npcAt(g.npc.x, g.npc.y));
  assert.equal(bh.passable(g.npc.x, g.npc.y), false);
  for (const m of Object.values(MAPS)) for (const w of m.warps) if (w.to !== '$return' && MAPS[w.to])
    assert.equal(MAPS[w.to].npcAt(w.tx, w.ty), null, `${m.name} warp lands on an NPC`);
});
