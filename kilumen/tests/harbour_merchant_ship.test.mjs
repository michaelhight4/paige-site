// Gary (Oct 31 2026): Tidewater's big merchant ship sails in at 07:00 game time, stays berthed all day, sails out at 17:00;
// the berth is empty overnight. Its berth + lane must be plain open water to the map edge (never walkable or surfable).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { merchantShipPos, merchantShipCells } from '../src/overworld/harbour_ship.js';
const map = JSON.parse(readFileSync(new URL('../art/world/overworld/maps/tidewater_coast.json', import.meta.url)));
const cfg = map.ambient.merchant_ship, H = map.height, C = map.layers.collision, D = map.layers.decoration;
const at = (h, m = 0) => merchantShipPos(h * 60 + m, cfg);

test('schedule: empty overnight, arrives 07:00, berthed all day, departs 17:00', () => {
  for (const h of [0, 3, 6]) assert.equal(at(h), null, `berth empty at ${h}:00`);
  assert.equal(at(6, 59), null);
  assert.equal(at(7).phase, 'arriving'); assert.ok(at(7).y >= H, 'starts off the map edge');
  assert.ok(at(7, 10).y > cfg.berth.y && at(7, 10).y < H, 'mid-arrival in the lane');
  for (const [h, m] of [[7, 20], [9, 0], [12, 0], [16, 59]]) assert.deepEqual(at(h, m), { x: cfg.berth.x, y: cfg.berth.y, moving: false, phase: 'berthed' });
  assert.equal(at(17).phase, 'departing'); assert.ok(at(17, 10).y > cfg.berth.y);
  for (const h of [18, 21, 23]) assert.equal(at(h), null, `berth empty at ${h}:00`);
  assert.equal(merchantShipPos(1440 + 12 * 60, cfg).phase, 'berthed', 'next day too');
});

test('motion is a straight line down the lane, monotonic', () => {
  let prev = Infinity;
  for (let m = 0; m <= cfg.sail_min; m++) { const p = at(7, m); assert.equal(p.x, cfg.berth.x); assert.ok(p.y <= prev); prev = p.y; }
});

test('berth and lane are open water to the map edge: never walkable/surfable, nothing in the way', () => {
  const cells = merchantShipCells(cfg, H);
  assert.ok(cells.some((c) => c.y === H - 1), 'lane reaches the south edge');
  for (const { x, y } of cells) {
    assert.equal(C[y][x], 1, `cell ${x},${y} is plain water (collision 1)`);
    assert.equal(D[y][x], 0, `cell ${x},${y} has no prop`);
  }
  for (const n of map.npcs) assert.ok(!cells.some((c) => c.x === n.x && c.y === n.y), `npc ${n.id} off the lane`);
});
