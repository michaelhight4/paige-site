// Door warp landings (exit warp fix, Oct 23 2026; Gary 2:14 PM CT: "exit home from spawn and end up on top of RT supply
// instead of in front of home"). The map data was right; a cached v0.1.3 unpadded brookhollow.json next to a fresh padded
// house_1f.json put the player on the RT Supply roof. These tests pin the data (every landing walkable, just outside the
// matching door, inside the padded frame) and the runtime guard (fixLanding) that heals a stale mix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { GameMap, warpSpawn } from '../src/overworld/map.js';
import { Col } from '../src/overworld/constants.js';
import { fixLanding } from '../src/overworld/pad_migrate.js';

const MAPDIR = new URL('../art/world/overworld/maps/', import.meta.url);
const JS = Object.fromEntries(readdirSync(MAPDIR).filter((f) => f.endsWith('.json')).map((f) => { const j = JSON.parse(readFileSync(new URL(f, MAPDIR))); return [j.name, j]; }));
const MAPS = Object.fromEntries(Object.entries(JS).map(([n, j]) => [n, new GameMap(structuredClone(j))]));
const STAND = new Set([Col.WALK, Col.PLATE, Col.ICE]); // a landing must be walkable and not itself a trigger
const outdoor = (j) => !!j.padding || (j.exits || []).length > 0;
// Explicit 2-tile landings: tunnel mouths where the landing sits one tile further in (straight walkable corridor).
const TWO_TILE = new Set(['greystone_entrance>lantern_rest', 'aurelith_arena>aurelith_stadium_int']); // arena: the cell between is gate_aurelith_arena (open once you are inside)

function* doorWarps() {
  for (const [name, j] of Object.entries(JS)) for (const w of j.warps || []) {
    if (w.to === '$return' || !MAPS[w.to] || !Number.isFinite(w.tx)) continue;
    yield { name, w, T: MAPS[w.to], TJ: JS[w.to] };
  }
}

test('door warps: every landing tile is walkable, not a warp, not an NPC, inside the padded frame', () => {
  let n = 0;
  for (const { name, w, T, TJ } of doorWarps()) {
    const id = `${name}@${w.x},${w.y} -> ${w.to} ${w.tx},${w.ty}`;
    assert.ok(T.inBounds(w.tx, w.ty), id + ' out of bounds');
    assert.ok(STAND.has(T.code(w.tx, w.ty)), `${id} lands on collision ${T.code(w.tx, w.ty)}`);
    assert.equal(T.warpAt(w.tx, w.ty), null, id + ' lands on a warp');
    assert.ok(!(TJ.npcs || []).some((d) => d.x === w.tx && d.y === w.ty), id + ' lands on an NPC');
    if (TJ.padding) { // pre-padding coordinates would land in the decorative border
      const { dx, dy, old_size: [ow, oh] } = TJ.padding;
      assert.ok(w.tx >= dx && w.ty >= dy && w.tx < dx + ow && w.ty < dy + oh, id + ' lands in the padding border (unpadded coords?)');
    }
    n++;
  }
  assert.ok(n >= 100, 'checked ' + n);
});

test('door warps: every landing is just outside a door back to where you came from (in front of the building)', () => {
  for (const { name, w, T, TJ } of doorWarps()) {
    const id = `${name}@${w.x},${w.y} -> ${w.to} ${w.tx},${w.ty}`;
    const back = (TJ.warps || []).filter((b) => b.to === name || b.to === '$return');
    assert.ok(back.length, id + ': no door back on ' + w.to);
    const b = back.reduce((a, c) => (Math.abs(c.x - w.tx) + Math.abs(c.y - w.ty) < Math.abs(a.x - w.tx) + Math.abs(a.y - w.ty) ? c : a));
    const d = Math.abs(b.x - w.tx) + Math.abs(b.y - w.ty);
    if (TWO_TILE.has(`${name}>${w.to}`)) {
      assert.ok(d === 2 && (b.x === w.tx || b.y === w.ty), id + ' tunnel landing not 2 tiles straight from its door');
      assert.ok(T.isWalkable((b.x + w.tx) / 2, (b.y + w.ty) / 2) || T.gateAt((b.x + w.tx) / 2, (b.y + w.ty) / 2), id + ' tunnel corridor blocked');
    } else assert.equal(d, 1, `${id}: ${d} tiles from its door back (${b.x},${b.y})`);
    assert.equal(T.code(b.x, b.y), Col.DOOR, `${id}: door back (${b.x},${b.y}) is not a door tile`);
    // outdoors, a building door (wall above, street below): you step out in front of it, i.e. directly below
    // (side tunnels like greystone_entrance 12,18 open sideways and are covered by the 1-tile rule above)
    if (outdoor(TJ) && !T.isWalkable(b.x, b.y - 1) && T.isWalkable(b.x, b.y + 1) && !TWO_TILE.has(`${name}>${w.to}`)) assert.deepEqual([w.tx, w.ty], [b.x, b.y + 1], id + ' not in front of the building door');
  }
});

test('door warps: shared interiors ($return) put you on a walkable tile in front of the town door you used', () => {
  let n = 0;
  for (const [name, j] of Object.entries(JS)) for (const w of j.warps || []) {
    const T = JS[w.to]; if (!T || w.keep_return || !(T.warps || []).some((b) => b.to === '$return')) continue; // keep_return doors never become lastDoor
    const s = warpSpawn({ to: '$return' }, { map: name, x: w.x, y: w.y }), M = MAPS[name];
    assert.ok(STAND.has(M.code(s.x, s.y)) && !M.warpAt(s.x, s.y), `${name}@${w.x},${w.y} ($return from ${w.to}) -> ${s.x},${s.y} code ${M.code(s.x, s.y)}`);
    n++;
  }
  assert.ok(n >= 10, 'checked ' + n);
});

test('every warp cell is a door tile (art/collision and warp list agree)', () => {
  for (const [name, j] of Object.entries(JS)) for (const w of j.warps || [])
    assert.equal(MAPS[name].code(w.x, w.y), Col.DOOR, `${name} warp ${w.x},${w.y} -> ${w.to}`);
});

test("home exit (Gary's bug): house_1f front door lands directly below Cal's house door in brookhollow, far from RT Supply", () => {
  const out = JS.house_1f.warps.find((w) => w.to === 'brookhollow'), bh = JS.brookhollow;
  const home = bh.warps.find((w) => w.to === 'house_1f'), shop = bh.warps.find((w) => w.to === 'shop_int');
  assert.deepEqual([out.tx, out.ty], [home.x, home.y + 1]);
  assert.ok(Math.abs(out.tx - shop.x) + Math.abs(out.ty - shop.y) > 5, 'landing is next to the RT Supply door');
  assert.ok(MAPS.brookhollow.isWalkable(out.tx, out.ty));
});

test('fixLanding: a stale unpadded town is detected (blocked landing); a stale pre-padding source is shifted by the padding', () => {
  const town = MAPS.brookhollow, home = JS.brookhollow.warps.find((w) => w.to === 'house_1f');
  assert.deepEqual(fixLanding(town, home.x, home.y + 1), { x: home.x, y: home.y + 1, how: 'ok' });
  const { dx, dy } = JS.brookhollow.padding; // v0.1.3 house_1f said tx 5, ty 8 (unpadded frame)
  assert.deepEqual(fixLanding(town, home.x - dx, home.y + 1 - dy), { x: home.x, y: home.y + 1, how: 'pad_shift' });
  // the v0.1.3 town (34x32, no padding) puts 17,15 inside the RT Supply building: blocked, so _staleLanding re-fetches it
  const old = new GameMap({ name: 'brookhollow', width: 34, height: 32, layers: { collision: Array.from({ length: 32 }, (_, y) => Array.from({ length: 34 }, (_, x) => (x >= 14 && x <= 18 && y >= 15 && y <= 19 ? 1 : 0))) } });
  assert.equal(old.isWalkable(17, 15), false);
  assert.notEqual(fixLanding(old, 17, 15).how, 'ok');
});
