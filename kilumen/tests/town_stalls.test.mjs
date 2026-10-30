// GD Oct 30 2026 (Gary: bring the towns to life): market stall keepers stand beside a stall and open the shop (stall_shop).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../' + f, import.meta.url)));
const TS = R('art/world/overworld/tileset.json'), BY = new Map(TS.tiles.map((t) => [t.id, t]));
const SYS = fs.readFileSync(new URL('../src/systems/index.js', import.meta.url), 'utf8');
test('stall_shop keepers reuse the shop in onTalk', () => assert.match(SYS, /\|\| def\.stall_shop\)/));
for (const name of ['revival_heights']) {
  test(`${name}: every stall keeper stands next to a stall and on a free square`, () => {
    const m = R(`art/world/overworld/maps/${name}.json`), D = m.layers.decoration;
    const ks = m.npcs.filter((n) => n.stall_shop);
    assert.ok(ks.length >= 2, 'at least two stalls');
    for (const n of ks) {
      assert.equal(m.layers.collision[n.y][n.x], 0, n.id);
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => /x_city_stall_/.test(BY.get(D[n.y + b]?.[n.x + a])?.name || ''));
      assert.ok(near, n.id + ' has no stall beside it');
    }
  });
}
