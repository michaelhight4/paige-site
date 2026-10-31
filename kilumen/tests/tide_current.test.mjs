// Tide currents (Gary, Oct 31 2026): sweep with the flow, bounce back against it, drift when crossing, escape sideways to calm water.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const { currentAt, sweepDir, against, attachCurrents, drawCurrents } = await import('../src/overworld/current.js');
const { GridMover } = await import('../src/overworld/movement.js');
const json = JSON.parse(fs.readFileSync('art/world/overworld/maps/dev_tide_test.json', 'utf8'));

function mkMap(j) {
  return { json: j, name: j.name, width: j.width, height: j.height,
    inBounds: (x, y) => x >= 0 && y >= 0 && x < j.width && y < j.height, npcAt: () => null,
    code: (x, y) => j.layers.collision[y]?.[x] ?? 1,
    query(x, y, dir) { const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir], tx = x + d[0], ty = y + d[1];
      return this.code(tx, ty) === 3 || this.code(tx, ty) === 0 ? { type: 'walk', x: tx, y: ty } : { type: 'block', code: this.code(tx, ty) }; } };
}
function mkScene(x, y) {
  const m = mkMap(json), p = new GridMover({ x, y, facing: 'down' }), log = [];
  const scene = { map: m, player: p, log, tick: 0, ms: 0, worldApi: () => ({ query: (a, b, d, mo) => m.query(a, b, d, mo) }) };
  attachCurrents(scene); return scene;
}
const run = (s, dir, ticks) => { for (let i = 0; i < ticks; i++) s.player.tick({ dir: typeof dir === 'function' ? dir(i) : dir }, s.worldApi()); };

test('currents sit on water cells; only the dev map and the launch tide spots have them', () => {
  for (const [k, d] of Object.entries(json.currents)) { const [x, y] = k.split(',').map(Number); assert.equal(json.layers.collision[y][x], 3, k); assert.ok(['up', 'down', 'left', 'right'].includes(d)); }
  const dir = 'art/world/overworld/maps';
  const withC = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && JSON.parse(fs.readFileSync(`${dir}/${f}`, 'utf8')).currents).sort();
  assert.deepEqual(withC, ['dev_tide_test.json', 'gullhaven_sea.json', 'lanternport.json', 'route_coast.json', 'tidewater_coast.json']);
});

// Launch tide spots (Gary pt2665u, Oct 31 2026): never trap the rider or block a required path.
test('real tide spots: water only, off warps/NPCs/exit edges, calm escape beside every cell, every lane ends on calm water', () => {
  const D = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  for (const f of ['gullhaven_sea', 'lanternport', 'route_coast', 'tidewater_coast']) {
    const j = JSON.parse(fs.readFileSync(`art/world/overworld/maps/${f}.json`, 'utf8')), C = j.layers.collision, cur = j.currents;
    const calm = (x, y) => [3, 11].includes(C[y]?.[x]) && !cur[x + ',' + y];
    const busy = new Set([...(j.warps || []), ...(j.npcs || [])].map((o) => o.x + ',' + o.y));
    for (const [k, d] of Object.entries(cur)) {
      const [x, y] = k.split(',').map(Number);
      assert.ok([3, 11].includes(C[y][x]), `${f} ${k} water`); assert.ok(!busy.has(k), `${f} ${k} free`);
      assert.ok(x > 0 && y > 0 && x < j.width - 1 && y < j.height - 1, `${f} ${k} off the map edge`);
      const side = d === 'up' || d === 'down' ? [[x - 1, y], [x + 1, y]] : [[x, y - 1], [x, y + 1]];
      assert.ok(side.some(([a, b]) => calm(a, b)), `${f} ${k}: calm water beside (sideways escape)`);
      const [nx, ny] = [x + D[d][0], y + D[d][1]];
      if (!cur[nx + ',' + ny]) assert.ok(calm(nx, ny), `${f} ${k}: lane ends on calm water`);
    }
    // sim: dropped on any current cell with no input, the rider is carried to calm water and stops (no loop, no wall pin)
    for (const k of Object.keys(cur)) {
      const [x, y] = k.split(',').map(Number), m = mkMap(j), p = new GridMover({ x, y, facing: 'down' });
      m.code = (a, b) => (C[b]?.[a] === 11 ? 3 : C[b]?.[a] ?? 1);
      const scene = { map: m, player: p, log: [], tick: 0, ms: 0, worldApi: () => ({ query: (a, b, d2, mo) => m.query(a, b, d2, mo) }) };
      attachCurrents(scene); p._attempt(cur[k], scene.worldApi(), []); for (let i = 0; i < 400; i++) p.tick({ dir: null }, scene.worldApi());
      assert.ok(calm(p.x, p.y), `${f} from ${k}: ends on calm water (at ${p.x},${p.y})`);
    }
  }
});

test('pure rules: flow, sideways escape to calm water, against', () => {
  assert.equal(currentAt(json, 5, 4), 'right'); assert.equal(currentAt(json, 5, 3), null);
  const m = mkMap(json);
  assert.equal(sweepDir(m, 5, 4, null), 'right');
  assert.equal(sweepDir(m, 5, 4, 'up'), 'up');      // calm water above: escape
  assert.equal(sweepDir(m, 5, 4, 'left'), 'right'); // against: no escape
  assert.equal(sweepDir(m, 5, 3, null), null);
  assert.ok(against(m, 5, 4, 'left')); assert.ok(!against(m, 5, 4, 'up'));
});

test('stepping onto the current sweeps the rider to its end (onto calm water)', () => {
  const s = mkScene(3, 3); run(s, (i) => (i < 20 ? 'down' : null), 400);
  assert.deepEqual([s.player.x, s.player.y], [11, 4]); // carried right, stops on calm water past x=10
  assert.ok(s.log.filter((e) => e.type === 'current_sweep').length >= 7);
});

test('moving across drifts downstream', () => {
  const s = mkScene(4, 3); run(s, (i) => (i < 20 ? 'down' : null), 30); // step on, keep no input
  assert.equal(s.player.y, 4); assert.ok(s.player.x > 4 || s.player.tx > 4, 'drifted right');
});

test('against the flow bounces the rider back downstream', () => {
  const s = mkScene(5, 4); run(s, 'left', 60);
  assert.ok(s.log.some((e) => e.type === 'current_push'), 'pushed');
  assert.ok(s.player.x > 5 || s.player.tx > 5, 'moved downstream, never upstream');
});

test('sideways input during the sweep escapes into calm water and the push stops', () => {
  const s = mkScene(3, 3); run(s, (i) => (i < 10 ? 'down' : i < 40 ? null : i < 55 ? 'up' : null), 120); run(s, null, 200);
  assert.equal(s.player.y, 3); const x = s.player.x; run(s, null, 100); assert.equal(s.player.x, x);
});

test('overlay: animated streaks, static under reduced motion', () => {
  const calls = { rect: 0, stroke: 0 }, ctx = { canvas: { width: 2000, height: 2000 }, save() {}, restore() {}, fillRect() { calls.rect++; }, beginPath() {}, moveTo() {}, lineTo() {}, stroke() { calls.stroke++; } };
  const v = { map: { json }, zoom: 1, cam: { x: 0, y: 0 }, ms: 100, life: { reducedMotion: false } };
  drawCurrents(ctx, v); assert.ok(calls.rect > 9 && calls.stroke === 0);
  calls.rect = 0; v.life.reducedMotion = true; drawCurrents(ctx, v); assert.equal(calls.stroke, 9); assert.equal(calls.rect, 9);
});
