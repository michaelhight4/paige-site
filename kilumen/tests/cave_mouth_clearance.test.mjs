// Cave mouth clearance (Gary, Oct 30 2026: a Revival Heights cave mouth was drawn over the orange house's wall).
// Every pass 2 cave mouth (3x2 entrance, door at bottom middle) must sit in the rock/tree border: no building, door,
// plaza or road tile in its footprint or the ring around it, and the approach tile below the door must be walkable
// natural ground (not a building, door, plaza or road tile).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const R = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url)));
const TS = R('art/world/overworld/tileset.json');
const BY = new Map(TS.tiles.map((t) => [t.id, t]));
const built = (id) => { const t = BY.get(id); if (!t || t.name.startsWith('cave_entrance')) return false;
  return t.category === 'building' || t.category === 'door' || /plaza|road|rthq|fountain|obelisk/.test(t.name); };
const LAYERS = ['ground', 'decoration', 'overlay'];
const POCKETS = R('data/pass2_caves.json').pockets.filter((p) => !p.existing_cave);

export function mouthClash(map, mx, my) {
  const L = map.layers, bad = [];
  const at = (x, y) => (y >= 0 && y < map.height && x >= 0 && x < map.width ? LAYERS.map((k) => L[k][y][x]) : []);
  for (let y = my - 2; y <= my + 1; y++) for (let x = mx - 2; x <= mx + 2; x++) {
    if (y === my + 1 && x !== mx) continue;                      // beside the approach: the lane may run there
    for (const id of at(x, y)) if (built(id)) bad.push(`${x},${y}:${BY.get(id).name}`);
  }
  const door = map.warps.find((w) => w.x === mx && w.y === my);
  if (!door) bad.push('no warp at the mouth');
  if (L.collision[my + 1]?.[mx] !== 0) bad.push(`approach ${mx},${my + 1} not walkable`);
  return bad;
}

// Known bad mouths still to move (GD Oct 30 2026, fixed in the Sunmeadow / Cairnfold passes). A listed mouth that is
// already clear fails too, so the list can only shrink.
const PENDING = new Set(['r9_cairnfold@17,25', 'r9_cairnfold@32,25']);
for (const p of POCKETS) {
  test(`${p.map}: cave mouth ${p.mouth} (${p.cave}) is clear of buildings, plaza and roads`, () => {
    const map = R(`art/world/overworld/maps/${p.map}.json`);
    const bad = mouthClash(map, p.mouth[0], p.mouth[1]);
    if (PENDING.has(`${p.map}@${p.mouth}`)) { assert.notDeepEqual(bad, [], 'now clear: drop it from PENDING'); return; }
    assert.deepEqual(bad, [], bad.join(' | '));
  });
}
