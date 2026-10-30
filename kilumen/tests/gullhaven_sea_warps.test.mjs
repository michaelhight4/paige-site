// Gullhaven <-> gullhaven_sea Tideglide water warps (finish-a, Oct 30 2026): every water warp lands on open ride-only water
// (WATER 3 / DEEP 11, so the rider keeps gliding), never on land or on another warp square, next to the matching channel mouth.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const load = (n) => JSON.parse(fs.readFileSync(path.join(root, 'art/world/overworld/maps', n + '.json'), 'utf8'));
const RIDE = new Set([3, 11]);

for (const [from, to] of [['gullhaven', 'gullhaven_sea'], ['gullhaven_sea', 'gullhaven']]) {
  test(`${from} -> ${to} water warps land on ride water`, () => {
    const a = load(from), b = load(to), ws = a.warps.filter((w) => w.to === to);
    assert.ok(ws.length >= 2);
    for (const w of ws) {
      assert.equal(w.water, true);
      assert.ok(RIDE.has(a.layers.collision[w.y][w.x]), 'warp square is water');
      assert.ok(RIDE.has(b.layers.collision[w.ty][w.tx]), `(${w.tx},${w.ty}) is ride water`);
      assert.ok(!b.warps.some((v) => v.x === w.tx && v.y === w.ty), 'not a warp square');
      const back = b.warps.filter((v) => v.to === from);
      assert.ok(back.some((v) => Math.abs(v.x - w.tx) + Math.abs(v.y - w.ty) <= 2), 'lands beside the return warp');
    }
  });
}
