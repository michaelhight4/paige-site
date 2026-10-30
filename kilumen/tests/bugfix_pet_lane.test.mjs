// Bug fix Oct 30 2026: the pet follower must never pin the player in a 1-tile lane. The pet is not in the map's
// occupancy (map.query ignores it) and walking into its cell trades places (Overworld._onPlayerStep).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { GameMap } from '../src/overworld/map.js';
import { Overworld } from '../src/overworld/overworld.js';

const json = JSON.parse(fs.readFileSync(new URL('../art/world/overworld/maps/brookhollow.json', import.meta.url), 'utf8'));
const lane = (m) => { const w = (x, y) => m.passable(x, y) && !m.warpAt(x, y);
  for (let y = 2; y < m.height - 3; y++) for (let x = 1; x < m.width - 1; x++)
    if (w(x, y) && w(x, y + 1) && w(x, y + 2) && !w(x - 1, y + 1) && !w(x + 1, y + 1)) return [x, y]; return null; };

test('pet in a 1-tile lane: the player can walk into its cell and they swap', () => {
  const m = new GameMap(json), L = lane(m); assert.ok(L, 'a 1-tile lane exists in brookhollow');
  const [x, y] = L;
  const sc = { map: m, player: { x, y: y + 1, facing: 'up' }, follower: { x, y: y + 2, facing: 'up' }, leavePrint() {} };
  // turn back toward the pet: the map answers 'walk' (the pet never blocks)
  const q = m.query(sc.player.x, sc.player.y, 'down', 'walk');
  assert.equal(q.type, 'walk'); assert.deepEqual([q.x, q.y], [x, y + 2]);
  Overworld.prototype._onPlayerStep.call(sc, q.x, q.y); // mover fires this at step start, before x/y move
  assert.deepEqual([sc.follower.x, sc.follower.y], [x, y + 1]); // pet hops into the cell the player is leaving
  sc.player.y = q.y;
  assert.notDeepEqual([sc.follower.x, sc.follower.y], [sc.player.x, sc.player.y]);
});
test('pet is never part of the occupancy map, and wandering NPC rules only (not the player) avoid it', () => {
  const m = new GameMap(json);
  assert.equal(m.npcAt(-5, -5), null);
  const src = fs.readFileSync(new URL('../src/overworld/overworld.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /occupy\([^)]*follower/);
  assert.match(fs.readFileSync(new URL('../src/overworld/npcs.js', import.meta.url), 'utf8'), /_swapPet\(n, x, y\)/);
});
