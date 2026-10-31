// Oct 30 2026 (Gary): dev fast walk. In a dev session with world speed 200x the walk runs at 200x too, but every tile is
// still a separate arrive (warps, trainer sight, encounters), and a tap is still a turn. Players (no dev) are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { GridMover } = await import(path.join(root, 'src/overworld/movement.js'));
const { devWalkPace } = await import(path.join(root, 'src/dev/runtime.js'));
const { BASE_TICKS_PER_TILE } = await import(path.join(root, 'src/overworld/constants.js'));

// a 1-row corridor x 0..60; wall at x=61; optional warp tile and trainer sight tile
const mkWorld = ({ warpAt = null, sightAt = null } = {}) => {
  const arrivals = [], w = {
    arrivals, warped: null, spotted: null,
    query: (x, y, dir) => { const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir]; const nx = x + d[0], ny = y + d[1];
      return ny === 0 && nx >= 0 && nx <= 60 ? { type: 'walk', x: nx, y: ny } : { type: 'block' }; },
    onArrive: (x, y, m) => { arrivals.push(x);
      if (x === warpAt) { w.warped = x; m.locked = true; return 'stop'; }
      if (x === sightAt) { w.spotted = x; m.locked = true; return 'stop'; } },
  };
  return w;
};
// one real frame = `ws` fixed ticks (overworld.js frame(): acc += dt * worldSpeed, one tick per TICK_MS)
const frames = (m, w, n, dir, ws) => { for (let f = 0; f < n; f++) for (let i = 0; i < ws; i++) m.tick({ dir }, w); };
const mover = (dev) => { const m = new GridMover({ x: 0, y: 0, facing: 'right' }); if (dev) devWalkPace(m, dev); return m; };

test('normal players: mover defaults unchanged (1x walk, no world scaling)', () => {
  const m = mover(null);
  assert.equal(m.speedMultiplier, 1); assert.equal(m.worldSpeed, 1);
  assert.equal(m.ticksPerTile(), BASE_TICKS_PER_TILE.walk);
  const w = mkWorld(); frames(m, w, BASE_TICKS_PER_TILE.walk * 5 + 1, 'right', 1);
  assert.ok(m.x >= 4 && m.x <= 6, `~5 tiles in 5 tiles' worth of ticks at 1x, got ${m.x}`);
});

test('dev fastWalk off keeps the old behaviour (walk / world speed)', () => {
  const m = mover({ speed: 2, world: 200, fastWalk: false });
  assert.equal(m.speedMultiplier, 2 / 200); assert.equal(m.worldSpeed, 1);
});

test('dev 200x fast walk: many tiles per frame, each tile arrived exactly once, in order', () => {
  const m = mover({ speed: 1, world: 200 }); const w = mkWorld();
  frames(m, w, 30, 'right', 200); // 1st step, ~250 ms real hold-repeat gate, then the run
  assert.equal(m.x, 60, 'reached the wall within ~0.5 s real time');
  assert.deepEqual(w.arrivals, Array.from({ length: 60 }, (_, i) => i + 1));
});

test('dev 200x: warp tile mid-walk stops there (no skipping past it)', () => {
  const m = mover({ speed: 1, world: 200 }); const w = mkWorld({ warpAt: 23 });
  frames(m, w, 30, 'right', 200);
  assert.equal(w.warped, 23); assert.equal(m.x, 23); assert.deepEqual(w.arrivals.at(-1), 23);
});

test('dev 200x: trainer sight tile triggers on the right tile', () => {
  const m = mover({ speed: 2, world: 200 }); const w = mkWorld({ sightAt: 41 });
  frames(m, w, 30, 'right', 200);
  assert.equal(w.spotted, 41); assert.equal(m.x, 41);
  assert.deepEqual(w.arrivals, Array.from({ length: 41 }, (_, i) => i + 1));
});

test('dev 200x fast walk: a quick tap still only turns', () => {
  const m = new GridMover({ x: 5, y: 0, facing: 'down' }); devWalkPace(m, { speed: 1, world: 200 }); const w = mkWorld();
  frames(m, w, 2, 'left', 200); frames(m, w, 10, null, 200);
  assert.deepEqual([m.x, m.facing], [5, 'left']);
});

test('dev 200x fast walk: a short press facing forward steps once (hold repeat gate stays real-time)', () => {
  const m = mover({ speed: 1, world: 200 }); const w = mkWorld();
  frames(m, w, 3, 'right', 200); // ~50 ms real hold < 250 ms repeat gate
  frames(m, w, 5, null, 200);
  assert.equal(m.x, 1);
});
