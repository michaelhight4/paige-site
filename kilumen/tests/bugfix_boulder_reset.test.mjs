// Boulder reset bug (renumbered: shipped in v0.2.105-alpha): maps are cached, so pushed boulders never went back home on re-entry, and the
// floor memory was dropped on entry, so pushing a boulder off a plate after re-entering erased the plate.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { FieldSystem, resetBoulders } = await import(path.join(root, 'src/overnight/field.js'));
const { Col } = await import(path.join(root, 'src/overworld/constants.js'));
const BOULDER = 900, PLATE_DECO = 901;

function makeMap(name = 'pz') {
  const W = 7, H = 5, grid = (v) => Array.from({ length: H }, () => Array(W).fill(v));
  const m = { name, width: W, height: H, warps: [], layers: { decoration: grid(0), collision: grid(Col.WALK) } };
  m.inBounds = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  m.npcAt = () => null; m.code = (x, y) => m.layers.collision[y][x]; m.tile = (L, x, y) => m.layers[L][y][x];
  m.layers.decoration[2][2] = BOULDER; m.layers.collision[2][2] = Col.BOULDER;
  m.layers.decoration[2][4] = PLATE_DECO; m.layers.collision[2][4] = Col.PLATE;
  return m;
}
function makeScene(m) {
  return { map: m, player: { x: 1, y: 2, facing: 'right' }, log: [], tick: 0, hooks: {}, audio: null,
    tilesetIndex: { byId: new Map([[BOULDER, { name: 'push_boulder' }]]) } };
}
const push = (f, s, dir) => { const d = { right: [1, 0], left: [-1, 0] }[dir]; const r = f.bump(s.player.x, s.player.y, dir, { type: 'block', code: Col.BOULDER }); if (r) { s.player.x += d[0]; s.player.y += d[1]; } return r; };

test('pushed boulders go home when the cached map is re-entered', () => {
  const m = makeMap(), s = makeScene(m), f = new FieldSystem(s);
  f.onEnter(m);
  assert.ok(push(f, s, 'right')); assert.ok(push(f, s, 'right')); assert.ok(push(f, s, 'right')); // 2->3->4(plate)->5
  assert.equal(m.code(5, 2), Col.BOULDER);
  s.player = { x: 0, y: 0, facing: 'down' }; f.onEnter({ name: 'other', layers: {} }); // leave
  f.onEnter(m); // same cached GameMap object again
  assert.equal(m.code(2, 2), Col.BOULDER); assert.equal(m.tile('decoration', 2, 2), BOULDER);
  assert.equal(m.code(5, 2), Col.WALK); assert.equal(m.tile('decoration', 5, 2), 0);
  assert.equal(m.code(4, 2), Col.PLATE); assert.equal(m.tile('decoration', 4, 2), PLATE_DECO, 'plate art kept');
});

test('a boulder left on a plate across re-entry is reset and the plate survives', () => {
  const m = makeMap(), s = makeScene(m), f = new FieldSystem(s);
  f.onEnter(m); push(f, s, 'right'); push(f, s, 'right'); // boulder on the plate (4,2)
  assert.equal(m.code(4, 2), Col.BOULDER);
  s.player = { x: 1, y: 2 }; f.onEnter(m);
  assert.equal(m.code(4, 2), Col.PLATE, 'plate not erased'); assert.equal(m.tile('decoration', 4, 2), PLATE_DECO);
  assert.equal(m.code(2, 2), Col.BOULDER);
  // push it again over the plate and off: plate must still be there afterwards
  s.player = { x: 1, y: 2 }; push(f, s, 'right'); push(f, s, 'right'); push(f, s, 'right');
  assert.equal(m.code(4, 2), Col.PLATE); assert.equal(m.tile('decoration', 4, 2), PLATE_DECO);
});

test('resetBoulders leaves a boulder whose home holds the player, and no-ops with no pushes', () => {
  const m = makeMap(), st = { under: new Map([['3,2', { code: Col.WALK, deco: 0 }]]), home: new Map([['3,2', '2,2']]) };
  m.layers.decoration[2][2] = 0; m.layers.collision[2][2] = Col.WALK; m.layers.decoration[2][3] = BOULDER; m.layers.collision[2][3] = Col.BOULDER;
  assert.equal(resetBoulders(m, st, { x: 2, y: 2 }), 0); assert.equal(m.code(3, 2), Col.BOULDER);
  assert.equal(resetBoulders(m, st, null), 1); assert.equal(m.code(2, 2), Col.BOULDER); assert.equal(m.code(3, 2), Col.WALK);
  assert.equal(resetBoulders(m, { under: new Map(), home: new Map() }), 0);
});
